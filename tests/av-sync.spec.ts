/**
 * AV Synchronization Tests — Captura Web Recorder
 *
 * Verifies that the mediabunny WebM muxing pipeline writes accurate timestamps
 * for both the video and audio tracks across four stress scenarios:
 *
 *   A  Baseline     — ideal conditions, tab in focus, no throttling.
 *   B  CPU throttle — 4× CPU throttle applied via Chrome DevTools Protocol.
 *   C  VFR          — frame loop paused for 1500 ms at the 4-second mark to
 *                     simulate a static-screen VFR drop-out.
 *   D  Background   — recording tab moved to background while a second tab is
 *                     in the foreground.
 *
 * Each scenario records 10 seconds of a synthetic A/V stream that emits a
 * white-frame/tone pulse at t ≈ 1 s, 2 s, …, 10 s.  After recording, ffprobe
 * (if available) is used to extract the timestamps of those pulses from the
 * output WebM file and the absolute A/V drift is asserted to be < 100 ms for
 * every pulse.
 *
 * If ffprobe is not installed the timing analysis is skipped but the file-
 * existence / size assertion still runs.
 *
 * Prerequisites
 * ─────────────
 *   npm run build   — the Astro site must be built before running Playwright.
 *   ffprobe         — install via `apt-get install ffmpeg` or `brew install ffmpeg`.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { spawnSync }                                     from 'node:child_process';
import * as fs                                           from 'node:fs';
import * as os                                           from 'node:os';
import * as path                                         from 'node:path';

// ── Constants ───────────────────────────────────────────────────────────────

const FIXTURE_URL         = '/test/av-sync-fixture/';
/** Record for 10.5 s to ensure the 10th pulse (at ~10 s) is captured. */
const RECORD_DURATION_MS  = 10_500;
/** VFR scenario injects a 1.5 s pause; give it extra wall-clock time. */
const VFR_EXTRA_MS        = 2_000;
/** Maximum allowed A/V drift per pulse (seconds). */
const MAX_DRIFT_S         = 0.1;
/** Minimum expected pulses in the recording window. */
const MIN_PULSES          = 8;

// ── Helpers: fixture control ─────────────────────────────────────────────────

/** Navigate to the fixture page and wait for the JS to initialise. */
async function gotoFixture(page: Page): Promise<void> {
  await page.goto(FIXTURE_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!(window as any).__avSyncFixture, { timeout: 15_000 });
}

/** Start the fixture recorder. */
async function startRecording(page: Page, opts: { vfr?: boolean } = {}): Promise<void> {
  await page.evaluate((o) => (window as any).__avSyncFixture.start(o), opts);
  await page.waitForFunction(
    () => document.getElementById('status')?.textContent === 'recording',
    { timeout: 10_000 },
  );
}

/**
 * Stop the fixture recorder and transfer the WebM bytes to the Node.js process
 * as a Buffer.  The data is base64-encoded inside the page to work around
 * Playwright's JSON serialisation limitation for binary types.
 */
async function stopAndGetBuffer(page: Page): Promise<Buffer> {
  // Wait for status to return to 'ready' after any VFR pause
  await page.evaluate(() => (window as any).__avSyncFixture.stop());
  await page.waitForFunction(
    () => document.getElementById('status')?.textContent === 'done',
    { timeout: 30_000 },
  );

  const base64 = await page.evaluate(async () => {
    const opfsRoot: any = await navigator.storage.getDirectory();
    const fileHandle    = await opfsRoot.getFileHandle('av-sync-test.webm');
    const file       = await fileHandle.getFile();
    const buffer     = await file.arrayBuffer();
    const bytes      = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  });

  return Buffer.from(base64, 'base64');
}

// ── Helpers: file system ─────────────────────────────────────────────────────

let _tmpDir: string | null = null;

function tmpDir(): string {
  if (!_tmpDir) {
    _tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'av-sync-'));
  }
  return _tmpDir;
}

function saveWebm(data: Buffer, label: string): string {
  const filePath = path.join(tmpDir(), `${label}.webm`);
  fs.writeFileSync(filePath, data);
  return filePath;
}

// ── Helpers: ffprobe analysis ────────────────────────────────────────────────

/** Returns true when ffprobe is available on PATH. */
function ffprobeAvailable(): boolean {
  const result = spawnSync('ffprobe', ['-version'], { encoding: 'utf8' });
  return result.status === 0;
}

/**
 * Runs ffprobe with the given arguments and returns stdout.
 * Throws if the process exits non-zero.
 */
function runFfprobe(args: string[]): string {
  const result = spawnSync('ffprobe', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(
      `ffprobe exited ${result.status}:\n${result.stderr ?? ''}`,
    );
  }
  return result.stdout ?? '';
}

/**
 * Extracts timestamps (seconds) of frames where the scene changes by > 50 %
 * (i.e. the black→white and white→black transitions).  Only the first
 * transition per pulse is kept (the black→white one) by deduplicating
 * timestamps that are within 200 ms of each other.
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

  // Deduplicate: keep only the first timestamp in each 200 ms window so that
  // both the rising and falling edge of a flash are not double-counted.
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
 * −40 dBFS, indicating the 1 kHz sine-wave pulses.  Only the first timestamp
 * per 200 ms window is kept to match the deduplication applied to video.
 */
function extractAudioTimestamps(filePath: string): number[] {
  const stdout = runFfprobe([
    '-v', 'quiet',
    '-f', 'lavfi',
    '-i', `amovie=${filePath},astats=metadata=1:reset=1`,
    '-show_entries', 'frame=pkt_pts_time:frame_tags=lavfi.astats.Overall.Peak_level',
    '-of', 'csv=p=0',
  ]);

  // Each line: pkt_pts_time,Peak_level  (e.g. "1.024000,-32.54")
  const raw: number[] = [];
  for (const line of stdout.split('\n')) {
    const parts = line.trim().split(',');
    if (parts.length < 2) continue;
    const ts    = parseFloat(parts[0]);
    const level = parseFloat(parts[1]);
    if (!isNaN(ts) && !isNaN(level) && level > -40) {
      raw.push(ts);
    }
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

/**
 * Asserts A/V sync for the supplied WebM file.
 * Skips timing assertions silently when ffprobe is not installed.
 */
function assertAvSync(filePath: string, label: string): void {
  // Always assert the file is non-trivially sized (> 10 kB)
  const { size } = fs.statSync(filePath);
  expect(size, `${label}: WebM file should be > 10 kB`).toBeGreaterThan(10_000);

  if (!ffprobeAvailable()) {
    console.warn(`[av-sync] ffprobe not found — skipping timestamp analysis for "${label}".`);
    return;
  }

  const videoTs = extractVideoTimestamps(filePath);
  const audioTs = extractAudioTimestamps(filePath);

  console.log(`[av-sync] ${label} — video pulses: [${videoTs.map(t => t.toFixed(3)).join(', ')}]`);
  console.log(`[av-sync] ${label} — audio pulses: [${audioTs.map(t => t.toFixed(3)).join(', ')}]`);

  expect(
    videoTs.length,
    `${label}: expected at least ${MIN_PULSES} video pulses, got ${videoTs.length}`,
  ).toBeGreaterThanOrEqual(MIN_PULSES);

  expect(
    audioTs.length,
    `${label}: expected at least ${MIN_PULSES} audio pulses, got ${audioTs.length}`,
  ).toBeGreaterThanOrEqual(MIN_PULSES);

  const pairCount = Math.min(videoTs.length, audioTs.length);
  for (let i = 0; i < pairCount; i++) {
    const drift = Math.abs(videoTs[i] - audioTs[i]);
    expect(
      drift,
      `${label}: pulse ${i + 1} — video=${videoTs[i].toFixed(3)} s, audio=${audioTs[i].toFixed(3)} s, drift=${(drift * 1000).toFixed(1)} ms`,
    ).toBeLessThan(MAX_DRIFT_S);
  }
}

// ── Scenario runner ──────────────────────────────────────────────────────────

interface ScenarioOptions {
  label: string;
  vfr?: boolean;
  extraMs?: number;
  /** Called once the page has loaded, before recording starts. */
  setup?: (ctx: BrowserContext, page: Page) => Promise<void>;
  /** Called after recording stops, before the buffer is read. */
  teardown?: (ctx: BrowserContext, page: Page) => Promise<void>;
}

async function runScenario(
  context: BrowserContext,
  page: Page,
  opts: ScenarioOptions,
): Promise<void> {
  await gotoFixture(page);

  if (opts.setup) {
    await opts.setup(context, page);
  }

  await startRecording(page, { vfr: opts.vfr });
  await page.waitForTimeout(RECORD_DURATION_MS + (opts.extraMs ?? 0));

  if (opts.teardown) {
    await opts.teardown(context, page);
  }

  const buffer   = await stopAndGetBuffer(page);
  const filePath = saveWebm(buffer, opts.label);

  assertAvSync(filePath, opts.label);
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Captura AV Sync', () => {
  // Each scenario can take up to 30 s (record 10 s + encode + transfer).
  test.setTimeout(60_000);

  // ── Scenario A: Baseline ───────────────────────────────────────────────────
  test('Scenario A – Baseline (ideal conditions)', async ({ context, page }) => {
    await runScenario(context, page, { label: 'scenario-a-baseline' });
  });

  // ── Scenario B: CPU throttling ─────────────────────────────────────────────
  test('Scenario B – CPU throttling (4×)', async ({ context, page }) => {
    await runScenario(context, page, {
      label: 'scenario-b-cpu-throttle',
      setup: async (_ctx, pg) => {
        // Apply 4× CPU throttle via Chrome DevTools Protocol
        const cdp = await pg.context().newCDPSession(pg);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      },
      teardown: async (_ctx, pg) => {
        // Remove throttle so the page can finalise quickly
        const cdp = await pg.context().newCDPSession(pg);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      },
    });
  });

  // ── Scenario C: Variable Frame Rate simulation ─────────────────────────────
  test('Scenario C – VFR (1500 ms rAF pause at 4 s)', async ({ context, page }) => {
    await runScenario(context, page, {
      label:   'scenario-c-vfr',
      vfr:     true,
      // Allow extra time for the 1500 ms pause that is injected mid-recording
      extraMs: VFR_EXTRA_MS,
    });
  });

  // ── Scenario D: Background throttling ─────────────────────────────────────
  test('Scenario D – Background throttling', async ({ context, page }) => {
    let secondPage: Page | null = null;

    await runScenario(context, page, {
      label: 'scenario-d-background',
      setup: async (ctx) => {
        // Open a second tab in the foreground, pushing the recording tab to
        // the background.  Background tabs have their timers throttled by the
        // browser, but the Metronome's Web Worker timer fires regardless.
        secondPage = await ctx.newPage();
        await secondPage.goto('about:blank');
      },
      teardown: async () => {
        if (secondPage) {
          await secondPage.close();
          secondPage = null;
        }
      },
    });
  });
});
