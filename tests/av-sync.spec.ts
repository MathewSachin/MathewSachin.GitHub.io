/**
 * AV Synchronization Tests — Captura Web Recorder
 *
 * Verifies that the mediabunny WebM muxing pipeline writes accurate timestamps
 * for both the video and audio tracks across four stress scenarios, using the
 * ACTUAL Captura recorder page (/tools/captura/).
 *
 * A synthetic MediaStream is injected via Playwright's addInitScript to replace
 * getDisplayMedia.  The stream emits a deterministic pattern of white-frame /
 * 1 kHz tone pulses every 1 s so ffprobe can extract precise A/V timestamps.
 * Drift must be < 100 ms for every pulse.
 *
 *   A  Baseline     — ideal conditions, tab in focus, no throttling.
 *   B  CPU throttle — 4× CPU throttle via Chrome DevTools Protocol.
 *   C  VFR          — pulse loop paused for 1500 ms after pulse 4 to simulate
 *                     a static-screen VFR drop-out.
 *   D  Background   — recording tab pushed to background by a second tab.
 *
 * Prerequisites
 * ─────────────
 *   npm run build   — the Astro site must be built before running Playwright.
 *   ffprobe         — install via `apt-get install ffmpeg`.
 *                     Required; tests FAIL if ffprobe is not on PATH.
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
/** VFR scenario injects a 1500 ms loop pause; allow extra wall-clock time. */
const VFR_EXTRA_MS        = 2_000;
/** Maximum allowed A/V drift per pulse (seconds). */
const MAX_DRIFT_S         = 0.1;
/** Minimum expected detectable pulses per track. */
const MIN_PULSES          = 8;

// ── Init script ──────────────────────────────────────────────────────────────
//
// This function runs inside the browser page context (serialized by Playwright)
// BEFORE any page scripts execute.  It:
//
//  1. Overrides window.showDirectoryPicker so StorageManager uses OPFS
//     (identical to the opfsMockScript used by captura.spec.ts).
//  2. Sets localStorage prefs: countdown=0, sysAudio=true.
//  3. Replaces navigator.mediaDevices.getDisplayMedia with a function that
//     returns a synthetic MediaStream:
//       • Video: 640×360 canvas, black by default, white flash every 1000 ms.
//       • Audio: 1 kHz sine wave gated in sync with each white flash.
//     A Web Worker timer drives the pulse loop so it is immune to background-
//     tab throttling (Scenario D).
//     In VFR mode (options.vfr=true) the pulse loop pauses for 1500 ms after
//     the 4th pulse (Scenario C).
//
// NOTE: the function body must be plain JavaScript — Playwright serialises
// it with fn.toString() after TypeScript has compiled away all type
// annotations and TypeScript-only syntax.

function capturaAvSyncScript(options: { vfr: boolean }): void {
  // ── 1. OPFS mock ────────────────────────────────────────────────────────────
  (window as any).showDirectoryPicker = async () => {
    const root = await navigator.storage.getDirectory() as any;
    root.queryPermission   = async () => 'granted';
    root.requestPermission = async () => 'granted';
    return root;
  };

  // ── 2. Preferences ─────────────────────────────────────────────────────────
  localStorage.setItem('captura-countdown', '0');    // no countdown delay
  localStorage.setItem('captura-sysAudio',  'true'); // record the synthetic audio

  // ── 3. Synthetic stream constants ──────────────────────────────────────────
  const CANVAS_W       = 640;
  const CANVAS_H       = 360;
  const FRAME_MS       = 33;    // ~30 fps
  const PULSE_INTERVAL = 1000;  // ms between flashes
  const PULSE_DURATION = FRAME_MS;
  const VFR_AFTER_N    = 4;     // pause after Nth pulse in VFR mode
  const VFR_PAUSE_MS   = 1500;

  // ── 4. Worker timer (not throttled in background tabs) ─────────────────────
  const tBlob = new Blob(
    ['let t;self.onmessage=function(e){clearTimeout(t);t=setTimeout(function(){self.postMessage(null);},e.data);}'],
    { type: 'application/javascript' },
  );
  const tUrl    = URL.createObjectURL(tBlob);
  const tWorker = new Worker(tUrl);
  URL.revokeObjectURL(tUrl);

  const workerSleep = (ms: number) => new Promise<void>(r => {
    tWorker.onmessage = () => { tWorker.onmessage = null; r(); };
    tWorker.postMessage(Math.max(0, ms));
  });

  // ── 5. Override getDisplayMedia ────────────────────────────────────────────
  (navigator.mediaDevices as any).getDisplayMedia = async () => {
    // ── Canvas ──────────────────────────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ── Audio oscillator ───────────────────────────────────────────────────
    const audioCtx = new AudioContext();
    const osc      = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1000;
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;
    const dest = audioCtx.createMediaStreamDestination();
    osc.connect(gainNode);
    gainNode.connect(dest);
    osc.start();

    // ── Pulse loop ─────────────────────────────────────────────────────────
    const startTime = performance.now();
    let nextPulse   = PULSE_INTERVAL;
    let pulseEnd    = -1;
    let pulseCount  = 0;
    let vfrDone     = false;
    let active      = true;

    (async () => {
      while (active) {
        const frameStart = performance.now();
        const elapsed    = frameStart - startTime;

        // Start a new pulse?
        if (elapsed >= nextPulse && pulseEnd < 0) {
          pulseEnd    = elapsed + PULSE_DURATION;
          nextPulse  += PULSE_INTERVAL;
          pulseCount += 1;
          // Schedule audio tone in sync with this white frame
          const when = audioCtx.currentTime;
          gainNode.gain.cancelScheduledValues(when);
          gainNode.gain.setValueAtTime(1, when);
          gainNode.gain.setValueAtTime(0, when + PULSE_DURATION / 1000);
        }

        // Draw canvas frame
        const inPulse = pulseEnd > 0 && elapsed < pulseEnd;
        if (pulseEnd > 0 && elapsed >= pulseEnd) pulseEnd = -1;
        ctx.fillStyle = inPulse ? '#fff' : '#000';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Scenario C (VFR): pause loop for 1500 ms after Nth pulse's flash ends
        if (options.vfr && !vfrDone && pulseCount >= VFR_AFTER_N && pulseEnd < 0) {
          vfrDone = true;
          await workerSleep(VFR_PAUSE_MS);
        }

        const cost = performance.now() - frameStart;
        await workerSleep(Math.max(0, FRAME_MS - cost));
      }
    })().catch(e => console.error('[av-sync] pulse loop:', e));

    // Expose cleanup (called if the test needs to stop the loop early)
    (window as any).__avSyncCleanup = () => { active = false; audioCtx.close(); };

    const videoTrack = canvas.captureStream(30).getVideoTracks()[0];
    const audioTrack = dest.stream.getAudioTracks()[0];
    return new MediaStream([videoTrack, audioTrack]);
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
