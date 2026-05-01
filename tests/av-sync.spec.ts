/**
 * AV Synchronization Tests — Captura Web Recorder
 *
 * Verifies that the mediabunny WebM muxing pipeline writes accurate timestamps
 * for both the video and audio tracks across four stress scenarios, using the
 * ACTUAL Captura recorder page (/tools/captura/).
 *
 * How the synthetic signal reaches the recording pipeline
 * ───────────────────────────────────────────────────────
 * Rather than relying on canvas.captureStream() → <video> → Compositor.drawImage()
 * (which is unreliable in headless Chrome because the video element may never
 * reach readyState ≥ 2 for an off-screen canvas stream), the init script hooks
 * directly into the Compositor's drawing cycle:
 *
 *   1. getDisplayMedia is replaced with a mock that returns a MediaStream with
 *      a minimal static-black video track and a 1 kHz OscillatorNode audio
 *      track.  This lets the recorder start normally.
 *
 *   2. After #recorder-canvas appears in the DOM, the script shadows
 *      ctx.fillText() on the same CanvasRenderingContext2D instance that the
 *      Compositor stores in this.#ctx.  The timestamp overlay text (drawn with
 *      fillStyle = '#fff') is the LAST drawing operation in drawFrame() while
 *      recording.  If the isInPulse flag is set at that moment, the hook
 *      overwrites the whole canvas with pure white before returning—so when
 *      RecorderCore.addFrame() captures the canvas immediately afterwards, it
 *      sees a bright white frame.
 *
 *   3. A MutationObserver on #status-badge fires when the recording badge first
 *      contains "Recording".  At that moment audio pulses are pre-scheduled via
 *      AudioContext.gainNode.setValueAtTime() and video pulses are driven by a
 *      Web Worker timer (immune to background-tab throttling, Scenario D).
 *
 * Detection (ffprobe)
 * ───────────────────
 *   Video: scene-change filter gt(scene,0.5) — black→white transitions score ~1.0.
 *   Audio: per-frame Peak_level > −40 dBFS — 1 kHz tone at full gain ≈ 0 dBFS.
 *   Drift must be < 100 ms for every pulse pair.
 *
 * Scenarios
 * ─────────
 *   A  Baseline     — ideal conditions.
 *   B  CPU throttle — 4× CPU throttle via Chrome DevTools Protocol.
 *   C  VFR          — pulses 5-10 delayed by 1500 ms.
 *   D  Background   — recording tab pushed behind a second tab mid-recording.
 *
 * Prerequisites
 * ─────────────
 *   npm run build   — the Astro site must be built before running Playwright.
 *   ffprobe         — installed via `apt-get install ffmpeg` in CI.
 *                     Required; tests FAIL (no silent skip) if not on PATH.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { spawnSync }                                     from 'node:child_process';
import * as fs                                           from 'node:fs';
import * as os                                           from 'node:os';
import * as path                                         from 'node:path';

// ── Constants ────────────────────────────────────────────────────────────────

const CAPTURA_URL         = '/tools/captura/';
/** Record for 10.5 s to capture all 10 pulses (at ~1 s, 2 s, …, 10 s). */
const RECORD_DURATION_MS  = 10_500;
/** VFR scenario delays pulses 5-10 by 1500 ms; allow extra wall-clock time. */
const VFR_EXTRA_MS        = 2_000;
/** Maximum allowed A/V drift per pulse (seconds). */
const MAX_DRIFT_S         = 0.1;
/** Minimum expected detectable pulses per track. */
const MIN_PULSES          = 8;

// ── Init script ──────────────────────────────────────────────────────────────
//
// NOTE: Playwright serialises this function via fn.toString() after esbuild has
// compiled the test file.  TypeScript annotations are stripped by esbuild, so
// the browser receives valid JavaScript.

function capturaAvSyncScript(options: { vfr: boolean }): void {
  // ── Constants (inside browser) ──────────────────────────────────────────────
  const CANVAS_W          = 640;
  const CANVAS_H          = 360;
  const FRAME_MS          = 33;    // ~30 fps frame duration
  const PULSE_DURATION_MS = 99;    // 3 × FRAME_MS — three frames for robust detection
  const PULSE_INTERVAL_MS = 1000;
  const NUM_PULSES        = 10;
  const VFR_AFTER_N       = 4;
  const VFR_PAUSE_MS      = 1500;

  // ── 1. OPFS mock ────────────────────────────────────────────────────────────
  (window as any).showDirectoryPicker = async () => {
    const root = await navigator.storage.getDirectory() as any;
    root.queryPermission   = async () => 'granted';
    root.requestPermission = async () => 'granted';
    return root;
  };

  // ── 2. Preferences ─────────────────────────────────────────────────────────
  localStorage.setItem('captura-countdown', '0');    // no countdown delay
  localStorage.setItem('captura-sysAudio',  'true'); // use synthetic audio track

  // ── 3. Shared pulse state (read by the canvas hook, written by the scheduler)
  let isInPulse = false;

  // ── 4. Worker timer helper (not throttled when tab is in background) ────────
  const makeWorkerSleep = () => {
    const blob   = new Blob(
      ['let t;self.onmessage=function(e){clearTimeout(t);t=setTimeout(function(){self.postMessage(null);},e.data);}'],
      { type: 'application/javascript' },
    );
    const url    = URL.createObjectURL(blob);
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    return (ms: number) => new Promise<void>(r => {
      worker.onmessage = () => { worker.onmessage = null; r(); };
      worker.postMessage(Math.max(0, ms));
    });
  };
  const workerSleep = makeWorkerSleep();

  // ── 5. getDisplayMedia mock ─────────────────────────────────────────────────
  //
  // Returns a minimal MediaStream so the Captura recorder can start normally:
  //   • video  — a static black canvas, repainted every frame so captureStream
  //              sends live frames and screenVid reaches readyState ≥ 2.
  //   • audio  — a 1 kHz OscillatorNode; gain is pre-scheduled after recording
  //              starts (see schedulePulses).
  //
  // The actual white-frame flashes are injected via the fillText hook (step 6),
  // bypassing the captureStream → <video> → drawImage pipeline entirely.
  let gainNode: GainNode | null     = null;
  let audioCtx: AudioContext | null = null;

  (navigator.mediaDevices as any).getDisplayMedia = async () => {
    // Audio
    audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1000;
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;
    const dest = audioCtx.createMediaStreamDestination();
    osc.connect(gainNode);
    gainNode.connect(dest);
    osc.start();

    // Video — static black canvas, periodically repainted to keep stream alive
    const vc  = document.createElement('canvas');
    vc.width  = CANVAS_W;
    vc.height = CANVAS_H;
    const vctx = vc.getContext('2d') as CanvasRenderingContext2D;
    vctx.fillStyle = '#000';
    vctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const repaint = setInterval(() => {
      vctx.fillStyle = '#000';
      vctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }, FRAME_MS);
    (window as any).__avSyncStopRepaint = () => clearInterval(repaint);

    return new MediaStream([
      vc.captureStream(30).getVideoTracks()[0],
      dest.stream.getAudioTracks()[0],
    ]);
  };

  // ── 6. Recording-canvas fillText hook ──────────────────────────────────────
  //
  // When the Compositor's drawFrame() runs while recording, the very last
  // drawing call is:
  //
  //   ctx.fillStyle = '#fff';
  //   ctx.fillText(ts, W - pad - 2, H - pad - 2);  ← HOOK FIRES HERE
  //   ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; // state only
  //
  // Immediately after the timestamp text is drawn with fillStyle='#fff'
  // (normalised to '#ffffff' by the canvas API), the hook overwrites the
  // entire canvas with white if isInPulse is set.  Because drawFrame() has no
  // further drawing after fillText(), the canvas is white when
  // RecorderCore.addFrame() captures it on the very next line.
  //
  // The hook is set on the context INSTANCE (same object that Compositor stores
  // as this.#ctx), so it transparently intercepts every drawFrame() call.

  const setupFillTextHook = () => {
    const recCanvas = document.getElementById('recorder-canvas') as HTMLCanvasElement | null;
    if (!recCanvas) { setTimeout(setupFillTextHook, 50); return; }

    const ctx = recCanvas.getContext('2d') as CanvasRenderingContext2D;

    // Capture native methods before shadowing them on the instance
    const nativeFillText = CanvasRenderingContext2D.prototype.fillText;
    const nativeFillRect = CanvasRenderingContext2D.prototype.fillRect;

    // Shadow fillText on this specific context instance
    (ctx as any).fillText = function(
      text: string, x: number, y: number, maxWidth?: number,
    ) {
      // Draw the original text first
      if (maxWidth !== undefined) {
        nativeFillText.call(this, text, x, y, maxWidth);
      } else {
        nativeFillText.call(this, text, x, y);
      }

      // The timestamp overlay uses fillStyle = '#fff' → normalised '#ffffff'.
      // It is the last drawing call in drawFrame() when isRecording = true.
      // Overwrite the canvas with white so CanvasSource.add() captures it.
      const fs = (this as CanvasRenderingContext2D).fillStyle;
      if ((fs === '#ffffff' || fs === '#fff') && isInPulse) {
        nativeFillRect.call(this, 0, 0, recCanvas.width, recCanvas.height);
      }
    };
  };

  // Run as soon as possible; the canvas may not exist until Svelte mounts
  setTimeout(setupFillTextHook, 0);

  // ── 7. Recording-start detector ─────────────────────────────────────────────
  //
  // A MutationObserver watches #status-badge.  When it first contains
  // "Recording" (but not "Session") we note the wall-clock start time and
  // schedule the A/V pulse train.

  const watchForRecordingStart = () => {
    const badge = document.getElementById('status-badge');
    if (!badge) { setTimeout(watchForRecordingStart, 50); return; }

    const observer = new MutationObserver(() => {
      const txt = badge.textContent ?? '';
      if (txt.includes('Recording') && !txt.includes('Session')) {
        const startPerf = performance.now();
        observer.disconnect();
        schedulePulses(startPerf);
      }
    });
    observer.observe(badge, { childList: true, subtree: true, characterData: true });
  };

  setTimeout(watchForRecordingStart, 0);

  // ── 8. Pulse scheduler ──────────────────────────────────────────────────────
  //
  // Called once when recording starts.  Schedules NUM_PULSES synchronized
  // audio+video pulses, each PULSE_DURATION_MS wide, spaced PULSE_INTERVAL_MS
  // apart.  In VFR mode, pulses VFR_AFTER_N+1 … NUM_PULSES are shifted right
  // by VFR_PAUSE_MS.
  //
  // Audio: pre-scheduled via AudioContext.gainNode.setValueAtTime() — not
  //        affected by page throttling or JS event-loop pauses.
  // Video: isInPulse flag set/cleared by Worker timer — immune to background-
  //        tab setTimeout throttling (Scenario D).

  const schedulePulses = (recordingStartPerf: number) => {
    if (!audioCtx || !gainNode) return;

    const audioNow = audioCtx.currentTime;

    // Audio: pre-schedule all pulses via AudioContext (not throttled by JS)
    for (let i = 1; i <= NUM_PULSES; i++) {
      const audioExtra   = ((options.vfr && i > VFR_AFTER_N) ? VFR_PAUSE_MS : 0) / 1000;
      const audioPulseAt = audioNow + i * (PULSE_INTERVAL_MS / 1000) + audioExtra;
      gainNode.gain.setValueAtTime(1, audioPulseAt);
      gainNode.gain.setValueAtTime(0, audioPulseAt + PULSE_DURATION_MS / 1000);
    }

    // Video: run a single sequential Worker-timer loop so only one workerSleep
    // is pending at a time (concurrent calls would overwrite the onmessage
    // handler and cancel earlier timeouts).
    (async () => {
      for (let i = 1; i <= NUM_PULSES; i++) {
        const vfrExtra        = (options.vfr && i > VFR_AFTER_N) ? VFR_PAUSE_MS : 0;
        const pulseTargetPerf = recordingStartPerf + i * PULSE_INTERVAL_MS + vfrExtra;
        const waitMs          = Math.max(0, pulseTargetPerf - performance.now());
        await workerSleep(waitMs);
        isInPulse = true;
        await workerSleep(PULSE_DURATION_MS);
        isInPulse = false;
      }
    })().catch(e => console.error('[av-sync] pulse video:', e));
  };
}

// ── Helpers: OPFS file transfer ───────────────────────────────────────────────

/**
 * Finds the first .webm file in OPFS and returns its bytes as a Node.js Buffer.
 * The data is base64-encoded in the page to work around Playwright's JSON
 * serialisation limit for binary types.
 */
async function getRecordingBuffer(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(async () => {
    const root: any = await navigator.storage.getDirectory();
    for await (const [name, handle] of root.entries()) {
      if (name.endsWith('.webm') && 'getFile' in handle) {
        const file   = await (handle as any).getFile();
        const buffer = await file.arrayBuffer();
        const bytes  = new Uint8Array(buffer);
        let binary   = '';
        const chunk  = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        return btoa(binary);
      }
    }
    return null;
  });
  if (!base64) throw new Error('[av-sync] No .webm file found in OPFS after recording.');
  return Buffer.from(base64, 'base64');
}

// ── Helpers: file system ──────────────────────────────────────────────────────

let _tmpDir: string | null = null;

function tmpDir(): string {
  if (!_tmpDir) _tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'av-sync-'));
  return _tmpDir!;
}

function saveWebm(data: Buffer, label: string): string {
  const filePath = path.join(tmpDir(), `${label}.webm`);
  fs.writeFileSync(filePath, data);
  return filePath;
}

// ── Helpers: ffprobe analysis ────────────────────────────────────────────────

/**
 * Requires ffprobe to be on PATH.  Throws a descriptive error when not found.
 * Install via `apt-get install ffmpeg` or `brew install ffmpeg`.
 */
function requireFfprobe(): void {
  const result = spawnSync('ffprobe', ['-version'], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(
      '[av-sync] ffprobe is required for A/V sync analysis.\n' +
      'Install it with: apt-get install ffmpeg  OR  brew install ffmpeg',
    );
  }
}

function runFfprobe(args: string[]): string {
  const result = spawnSync('ffprobe', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`ffprobe exited ${result.status}:\n${result.stderr ?? ''}`);
  }
  return result.stdout ?? '';
}

/**
 * Extracts timestamps (seconds) of video frames where scene luminance changes
 * by > 50 % (black→white transitions).  Only the first timestamp per 200 ms
 * window is kept so each pulse is counted once.
 */
function extractVideoTimestamps(filePath: string): number[] {
  const stdout = runFfprobe([
    '-v', 'quiet',
    '-f', 'lavfi',
    '-i', `movie=${filePath},select='gt(scene,0.5)'`,
    '-show_entries', 'frame=pkt_pts_time',
    '-of', 'csv=p=0',
  ]);

  const raw = stdout
    .split('\n')
    .map(l => parseFloat(l.trim()))
    .filter(t => !isNaN(t))
    .sort((a, b) => a - b);

  const deduped: number[] = [];
  for (const t of raw) {
    if (deduped.length === 0 || t - deduped[deduped.length - 1] > 0.2) {
      deduped.push(t);
    }
  }
  return deduped;
}

/**
 * Extracts timestamps (seconds) of audio frames where the peak level is above
 * −40 dBFS (the 1 kHz tone pulses).  Only the first timestamp per 200 ms
 * window is kept to match the deduplication applied to video.
 */
function extractAudioTimestamps(filePath: string): number[] {
  const stdout = runFfprobe([
    '-v', 'quiet',
    '-f', 'lavfi',
    '-i', `amovie=${filePath},astats=metadata=1:reset=1`,
    '-show_entries', 'frame=pkt_pts_time:frame_tags=lavfi.astats.Overall.Peak_level',
    '-of', 'csv=p=0',
  ]);

  const raw: number[] = [];
  for (const line of stdout.split('\n')) {
    const parts = line.trim().split(',');
    if (parts.length < 2) continue;
    const ts    = parseFloat(parts[0]);
    const level = parseFloat(parts[1]);
    if (!isNaN(ts) && !isNaN(level) && level > -40) raw.push(ts);
  }

  raw.sort((a, b) => a - b);

  const deduped: number[] = [];
  for (const t of raw) {
    if (deduped.length === 0 || t - deduped[deduped.length - 1] > 0.2) {
      deduped.push(t);
    }
  }
  return deduped;
}

/** Asserts A/V sync for the supplied WebM file. */
function assertAvSync(filePath: string, label: string): void {
  // Basic sanity: file must be > 10 kB
  const { size } = fs.statSync(filePath);
  expect(size, `${label}: WebM file should be > 10 kB`).toBeGreaterThan(10_000);

  requireFfprobe();

  const videoTs = extractVideoTimestamps(filePath);
  const audioTs = extractAudioTimestamps(filePath);

  console.log(`[av-sync] ${label} video pulses: [${videoTs.map(t => t.toFixed(3)).join(', ')}]`);
  console.log(`[av-sync] ${label} audio pulses: [${audioTs.map(t => t.toFixed(3)).join(', ')}]`);

  expect(
    videoTs.length,
    `${label}: expected ≥ ${MIN_PULSES} video pulses, got ${videoTs.length}`,
  ).toBeGreaterThanOrEqual(MIN_PULSES);

  expect(
    audioTs.length,
    `${label}: expected ≥ ${MIN_PULSES} audio pulses, got ${audioTs.length}`,
  ).toBeGreaterThanOrEqual(MIN_PULSES);

  const pairCount = Math.min(videoTs.length, audioTs.length);
  for (let i = 0; i < pairCount; i++) {
    const drift = Math.abs(videoTs[i] - audioTs[i]);
    expect(
      drift,
      `${label}: pulse ${i + 1} — video=${videoTs[i].toFixed(3)} s, ` +
      `audio=${audioTs[i].toFixed(3)} s, drift=${(drift * 1000).toFixed(1)} ms`,
    ).toBeLessThan(MAX_DRIFT_S);
  }
}

// ── Scenario runner ───────────────────────────────────────────────────────────

interface ScenarioOptions {
  label: string;
  vfr?: boolean;
  extraMs?: number;
  /** Called after page load, before clicking Start. */
  setup?: (ctx: BrowserContext, page: Page) => Promise<void>;
  /** Called immediately after recording reaches the 'Recording' state. */
  onRecording?: (ctx: BrowserContext, page: Page) => Promise<void>;
  /** Called after the recording duration, before clicking Stop. */
  teardown?: (ctx: BrowserContext, page: Page) => Promise<void>;
}

async function runScenario(
  context: BrowserContext,
  page: Page,
  opts: ScenarioOptions,
): Promise<void> {
  // Inject the init script (OPFS mock + getDisplayMedia mock + prefs)
  await page.addInitScript(capturaAvSyncScript, { vfr: !!opts.vfr });

  // Navigate to the actual Captura recorder page
  await page.goto(CAPTURA_URL, { waitUntil: 'networkidle' });

  if (opts.setup) await opts.setup(context, page);

  // Start recording (getDisplayMedia mock returns our synthetic stream)
  await page.click('#start-btn');
  await expect(page.locator('#status-badge')).toContainText('Recording', { timeout: 15_000 });

  if (opts.onRecording) await opts.onRecording(context, page);

  // Let the recording capture all 10 pulses (plus optional VFR pause)
  await page.waitForTimeout(RECORD_DURATION_MS + (opts.extraMs ?? 0));

  if (opts.teardown) await opts.teardown(context, page);

  // Stop recording and wait for the file to be fully written to OPFS
  await page.click('#stop-btn');
  await expect(page.locator('#status-badge')).toHaveText('◉ Session Active', { timeout: 30_000 });

  // Transfer the WebM file to Node.js and run ffprobe analysis
  const buffer   = await getRecordingBuffer(page);
  const filePath = saveWebm(buffer, opts.label);
  assertAvSync(filePath, opts.label);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Captura AV Sync', () => {
  // Worst-case: 10.5 s record + 2 s VFR + ~30 s encode/transfer overhead
  test.setTimeout(90_000);

  // ── Scenario A: Baseline ────────────────────────────────────────────────────
  test('Scenario A – Baseline (ideal conditions)', async ({ context, page }) => {
    await runScenario(context, page, { label: 'scenario-a-baseline' });
  });

  // ── Scenario B: CPU throttling ──────────────────────────────────────────────
  test('Scenario B – CPU throttling (4×)', async ({ context, page }) => {
    let cdp: any;
    await runScenario(context, page, {
      label: 'scenario-b-cpu-throttle',
      setup: async (_ctx, pg) => {
        // Apply 4× CPU throttle before recording starts
        cdp = await pg.context().newCDPSession(pg);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      },
      teardown: async () => {
        // Remove throttle before stopping so finalization is fast
        if (cdp) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      },
    });
  });

  // ── Scenario C: Variable Frame Rate simulation ───────────────────────────────
  test('Scenario C – VFR (1500 ms pulse-loop pause after pulse 4)', async ({ context, page }) => {
    await runScenario(context, page, {
      label:   'scenario-c-vfr',
      vfr:     true,
      extraMs: VFR_EXTRA_MS,  // allow extra wall time for the 1500 ms pause
    });
  });

  // ── Scenario D: Background throttling ────────────────────────────────────────
  test('Scenario D – Background throttling', async ({ context, page }) => {
    let secondPage: Page | null = null;
    await runScenario(context, page, {
      label: 'scenario-d-background',
      onRecording: async (ctx) => {
        // Open a second tab in the foreground — browsers throttle timers and
        // rAF in background tabs, but the Metronome's Web Worker timer fires
        // regardless.
        secondPage = await ctx.newPage();
        await secondPage.goto('about:blank');
      },
      teardown: async () => {
        if (secondPage) { await secondPage.close(); secondPage = null; }
      },
    });
  });
});
