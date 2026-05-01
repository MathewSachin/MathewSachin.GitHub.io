/**
 * AV Synchronization Tests — Captura Web Recorder
 *
 * Verifies that the mediabunny WebM muxing pipeline writes accurate timestamps
 * for both the video and audio tracks across four stress scenarios, using the
 * ACTUAL Captura recorder page (/tools/captura/).
 *
 * How the synthetic signal reaches the recording pipeline
 * ───────────────────────────────────────────────────────
 * getDisplayMedia is replaced with a mock that returns a MediaStream with
 * a minimal static-black video track and a 1 kHz OscillatorNode audio track.
 * This lets the recorder start normally.
 *
 * White video pulses are injected via TWO complementary mechanisms so at least
 * one is guaranteed to work regardless of internal Compositor details:
 *
 *   A. VideoFrame Proxy (primary, most direct)
 *      window.VideoFrame is wrapped with a Proxy whose construct trap fires for
 *      every new VideoFrame(canvas, ...) call.  When isInPulse is set and the
 *      source is #recorder-canvas, the trap substitutes a white OffscreenCanvas.
 *      This intercepts at the mediabunny encoding level before the frame reaches
 *      VideoEncoder, so it is completely independent of how Compositor draws.
 *
 *   B. CanvasRenderingContext2D.prototype.fillText override (belt-and-suspenders)
 *      The Compositor's last drawing call in drawFrame() while recording is
 *      ctx.fillText(ts, …) with fillStyle='#fff'.  A prototype-level override
 *      checks this canvas id and fillStyle, then floods the canvas white.
 *      Unlike an instance-level shadow, this override is in place from the
 *      moment the init script runs and is not affected by canvas resizing.
 *
 * Audio pulses are pre-scheduled via AudioContext.gainNode.setValueAtTime(),
 * which is not affected by page throttling.
 *
 * Video pulse timing uses a Web Worker timer (immune to background-tab
 * throttling, Scenario D).
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
/** Record for 12 s to capture all 10 pulses (at ~1 s, 2 s, …, 10 s). */
const RECORD_DURATION_MS  = 12_000;
/** VFR scenario delays pulses 5-10 by 1500 ms; allow extra wall-clock time. */
const VFR_EXTRA_MS        = 2_000;
/** Maximum allowed A/V drift per pulse (seconds). */
const MAX_DRIFT_S         = 0.15;
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
  const PULSE_DURATION_MS = 300;   // 9 × FRAME_MS — nine frames for robust detection
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
  let isInPulse      = false;
  let pulsesStarted  = false; // guard: schedulePulses may be called from multiple paths

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
  //   • video  — a static black canvas, periodically repainted so captureStream
  //              sends live frames (helps screenVid reach readyState ≥ 2).
  //   • audio  — a 1 kHz OscillatorNode; gain is pre-scheduled after recording
  //              starts (see schedulePulses).
  //
  // White-frame injection is handled by mechanisms A and B below.
  let gainNode: GainNode | null     = null;
  let audioCtx: AudioContext | null = null;

  (navigator.mediaDevices as any).getDisplayMedia = async () => {
    // Audio — create AudioContext and immediately resume it to ensure it runs
    // even when created deep in an async chain where user-activation may have
    // already been consumed.  A 1 s timeout guard avoids hanging if the browser
    // denies auto-resume (the test will still run, just without audio).
    audioCtx = new AudioContext();
    await Promise.race([
      audioCtx.resume(),
      new Promise(r => setTimeout(r, 1000)),
    ]);
    console.log('[av-sync] audioCtx state after resume: ' + audioCtx.state);

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

  // ── 6A. VideoFrame Proxy (primary video-pulse injection) ───────────────────
  //
  // mediabunny's CanvasSource.add() calls new VideoFrame(canvas, { timestamp })
  // to capture each recording frame.  By wrapping the global VideoFrame with a
  // Proxy, we intercept every such call.  When isInPulse is set and the source
  // is #recorder-canvas, we substitute a white OffscreenCanvas so the encoder
  // receives a bright frame — triggering a scene-change in ffprobe.
  //
  // Use `target` (not `newTarget`/proxy) as the third arg to Reflect.construct
  // so that native VideoFrame's internal new.target check passes correctly.

  const _OrigVideoFrame = (window as any).VideoFrame as (typeof VideoFrame) | undefined;
  let _vfProxyFired = 0; // diagnostic counter
  if (typeof _OrigVideoFrame !== 'undefined') {
    (window as any).VideoFrame = new Proxy(_OrigVideoFrame, {
      construct(target, args, _newTarget) {
        const src  = args[0];
        const init = args[1];
        if (typeof HTMLCanvasElement !== 'undefined' && src instanceof HTMLCanvasElement) {
          if (_vfProxyFired++ < 2) {
            console.log('[av-sync] VF proxy: isInPulse=' + isInPulse + ' id=' + src.id);
          }
          if (isInPulse && src.id === 'recorder-canvas') {
            // Replace with a same-sized white OffscreenCanvas
            const oc   = new OffscreenCanvas(src.width || CANVAS_W, src.height || CANVAS_H);
            const oc2d = oc.getContext('2d') as OffscreenCanvasRenderingContext2D;
            oc2d.fillStyle = '#fff';
            oc2d.fillRect(0, 0, oc.width, oc.height);
            return Reflect.construct(target, [oc, init], target);
          }
        }
        return Reflect.construct(target, args, target);
      },
    });
  }

  // ── 6B. CanvasRenderingContext2D.prototype.fillText override ───────────────
  //       (belt-and-suspenders for the VideoFrame proxy above)
  //
  // The Compositor's drawFrame() ends with (when isRecording = true):
  //   ctx.fillStyle = '#fff';
  //   ctx.fillText(ts, W-pad-2, H-pad-2);   ← last drawing op
  //
  // When isInPulse is true and the context belongs to #recorder-canvas,
  // this hook floods the entire canvas white so CanvasSource.add() sees a
  // bright frame.  The fillStyle check has been removed to be robust against
  // any Chrome-version variation in how '#fff' is normalised on read-back.

  const _origFillText = CanvasRenderingContext2D.prototype.fillText;
  const _origFillRect = CanvasRenderingContext2D.prototype.fillRect;
  let _fillFloodCount = 0; // diagnostic

  CanvasRenderingContext2D.prototype.fillText = function(
    text: string, x: number, y: number, maxWidth?: number,
  ): void {
    if (maxWidth !== undefined) {
      _origFillText.call(this, text, x, y, maxWidth);
    } else {
      _origFillText.call(this, text, x, y);
    }
    if (isInPulse && this.canvas.id === 'recorder-canvas') {
      const prev = this.fillStyle;
      this.fillStyle = '#ffffff';
      _origFillRect.call(this, 0, 0, this.canvas.width, this.canvas.height);
      this.fillStyle = prev;
      if (_fillFloodCount++ < 3) {
        console.log('[av-sync] canvas flood #' + _fillFloodCount
          + ' w=' + this.canvas.width + ' h=' + this.canvas.height);
      }
    }
  };

  // ── 7. Pulse scheduler ──────────────────────────────────────────────────────
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
    if (!audioCtx || !gainNode || pulsesStarted) {
      console.log('[av-sync] schedulePulses skipped: audioCtx=' + !!audioCtx + ' gainNode=' + !!gainNode + ' pulsesStarted=' + pulsesStarted);
      return;
    }
    pulsesStarted = true;
    console.log('[av-sync] schedulePulses starting, vfr=' + options.vfr
      + ' audioCtxState=' + audioCtx.state);

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
        console.log('[av-sync] pulse ' + i + ' start');
        isInPulse = true;
        await workerSleep(PULSE_DURATION_MS);
        isInPulse = false;
        console.log('[av-sync] pulse ' + i + ' end');
      }
    })().catch(e => console.error('[av-sync] pulse video error:', e));
  };

  // ── 8. Recording-start detector ─────────────────────────────────────────────
  //
  // `window.__avSyncSchedule` is called from the Playwright test side after
  // the badge confirms "Recording" — this avoids the race condition where
  // networkidle resolves, the test immediately clicks Start, and the badge
  // updates before this init script's setTimeout(fn,0) has installed the
  // MutationObserver.
  //
  // The MutationObserver is kept as a belt-and-suspenders fallback with an
  // immediate check so it also works when the init script runs first.

  (window as any).__avSyncSchedule = schedulePulses;

  const watchForRecordingStart = () => {
    const badge = document.getElementById('status-badge');
    if (!badge) { setTimeout(watchForRecordingStart, 50); return; }

    const tryTrigger = () => {
      const txt = badge.textContent ?? '';
      if (txt.includes('Recording') && !txt.includes('Session')) {
        observer.disconnect();
        schedulePulses(performance.now());
      }
    };

    const observer = new MutationObserver(tryTrigger);
    observer.observe(badge, { childList: true, subtree: true, characterData: true });
    tryTrigger(); // immediate check in case badge already shows "Recording"
  };

  setTimeout(watchForRecordingStart, 0);
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

// ── Helpers: ffprobe/ffmpeg analysis ─────────────────────────────────────────

/**
 * Requires ffprobe and ffmpeg to be on PATH.  Throws a descriptive error when
 * not found.  Install via `apt-get install ffmpeg` or `brew install ffmpeg`.
 */
function requireFfprobe(): void {
  for (const cmd of ['ffprobe', 'ffmpeg']) {
    const result = spawnSync(cmd, ['-version'], { encoding: 'utf8' });
    if (result.status !== 0) {
      throw new Error(
        `[av-sync] ${cmd} is required for A/V sync analysis.\n` +
        'Install it with: apt-get install ffmpeg  OR  brew install ffmpeg',
      );
    }
  }
}

function runFfprobe(args: string[]): string {
  const result = spawnSync('ffprobe', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`ffprobe exited ${result.status}:\n${result.stderr ?? ''}`);
  }
  return result.stdout ?? '';
}

function runFfmpeg(args: string[]): { stdout: string; stderr: string } {
  const result = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`ffmpeg exited ${result.status}:\n${result.stderr ?? ''}`);
  }
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

/**
 * Extracts timestamps (seconds) of video frames where scene luminance changes
 * by > 30 % (black→white transitions).  Uses `ffmpeg -vf select,showinfo` to
 * avoid the lavfi `movie=` quoting issues with spawnSync.  Only the first
 * timestamp per 500 ms window is kept so each pulse is counted once.
 */
function extractVideoTimestamps(filePath: string, label = ''): number[] {
  // ffmpeg writes per-frame info to stderr via the showinfo filter.
  // select=gt(scene,0.3) passes only frames with >30% luminance change.
  const { stderr } = runFfmpeg([
    '-v', 'error',
    '-i', filePath,
    '-an',
    '-vf', 'select=gt(scene,0.3),showinfo',
    '-f', 'null', '-',
  ]);

  if (label) {
    const sample = stderr.split('\n').filter(l => l.includes('showinfo')).slice(0, 3);
    console.log(`[av-sync] ${label} video raw sample: ${JSON.stringify(sample)}`);
  }

  const raw: number[] = [];
  for (const line of stderr.split('\n')) {
    if (!line.includes('showinfo')) continue;
    const m = line.match(/pts_time:([0-9.]+)/);
    if (m) {
      const t = parseFloat(m[1]);
      if (!isNaN(t)) raw.push(t);
    }
  }

  raw.sort((a, b) => a - b);

  // 500 ms dedup window: keeps only the first timestamp of each pulse burst
  const deduped: number[] = [];
  for (const t of raw) {
    if (deduped.length === 0 || t - deduped[deduped.length - 1] > 0.5) {
      deduped.push(t);
    }
  }
  return deduped;
}

/**
 * Extracts timestamps (seconds) of audio frames where the peak level is above
 * −40 dBFS (the 1 kHz tone pulses).  Only the first timestamp per 500 ms
 * window is kept to match the deduplication applied to video.
 */
function extractAudioTimestamps(filePath: string, label = ''): number[] {
  const stdout = runFfprobe([
    '-v', 'quiet',
    '-f', 'lavfi',
    '-i', `amovie=${filePath},astats=metadata=1:reset=1`,
    '-show_entries', 'frame=pkt_pts_time:frame_tags=lavfi.astats.Overall.Peak_level',
    '-of', 'csv=p=0',
  ]);

  if (label) {
    const sample = stdout.split('\n').filter(l => l.trim()).slice(0, 5);
    console.log(`[av-sync] ${label} audio raw sample: ${JSON.stringify(sample)}`);
  }

  const raw: number[] = [];
  for (const line of stdout.split('\n')) {
    const parts = line.trim().split(',');
    if (parts.length < 2) continue;
    const ts    = parseFloat(parts[0]);
    const level = parseFloat(parts[1]);
    if (!isNaN(ts) && !isNaN(level) && level > -40) raw.push(ts);
  }

  raw.sort((a, b) => a - b);

  // 500 ms dedup window: keeps only the first timestamp of each pulse burst
  const deduped: number[] = [];
  for (const t of raw) {
    if (deduped.length === 0 || t - deduped[deduped.length - 1] > 0.5) {
      deduped.push(t);
    }
  }
  return deduped;
}

/** Asserts A/V sync for the supplied WebM file. */
function assertAvSync(filePath: string, label: string): void {
  // Basic sanity: file must be > 10 kB
  const { size } = fs.statSync(filePath);
  console.log(`[av-sync] ${label} file size: ${(size / 1024).toFixed(1)} kB`);
  expect(size, `${label}: WebM file should be > 10 kB`).toBeGreaterThan(10_000);

  requireFfprobe();

  const videoTs = extractVideoTimestamps(filePath, label);
  const audioTs = extractAudioTimestamps(filePath, label);

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
  // Capture browser console messages so they appear in CI test output
  page.on('console', msg => {
    const txt = msg.text();
    if (txt.startsWith('[av-sync]')) {
      console.log(`[browser] ${txt}`);
    }
  });
  page.on('pageerror', err => console.error('[browser error]', err.message));

  // Inject the init script (OPFS mock + getDisplayMedia mock + prefs)
  await page.addInitScript(capturaAvSyncScript, { vfr: !!opts.vfr });

  // Navigate to the actual Captura recorder page
  await page.goto(CAPTURA_URL, { waitUntil: 'networkidle' });

  if (opts.setup) await opts.setup(context, page);

  // Start recording (getDisplayMedia mock returns our synthetic stream)
  await page.click('#start-btn');
  await expect(page.locator('#status-badge')).toContainText('Recording', { timeout: 15_000 });

  // Explicitly trigger pulse scheduling now that we know the badge shows
  // "Recording".  This is the authoritative trigger — it avoids the race
  // condition where the MutationObserver in the init script is set up after
  // the badge has already changed (e.g., when networkidle resolved quickly).
  await page.evaluate(() => {
    const schedule = (window as any).__avSyncSchedule;
    if (typeof schedule === 'function') schedule(performance.now());
    else console.log('[av-sync] __avSyncSchedule not found on window');
  });

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
