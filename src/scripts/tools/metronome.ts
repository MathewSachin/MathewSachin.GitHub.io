export const MIN_BPM = 20;
export const MAX_BPM = 300;
export const DEFAULT_BPM = 120;
export const DEFAULT_TAP_RESET_MS = 2000;
export const ALLOWED_NOTE_VALUES = [2, 4, 8, 16] as const;

export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) {
    return DEFAULT_BPM;
  }

  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

export function normalizeTimeSignature(beats: number, noteValue: number): { beats: number; noteValue: number } {
  const safeBeats = Number.isFinite(beats) ? Math.min(12, Math.max(1, Math.round(beats))) : 4;
  const safeNoteValue = ALLOWED_NOTE_VALUES.includes(noteValue as typeof ALLOWED_NOTE_VALUES[number]) ? noteValue : 4;

  return { beats: safeBeats, noteValue: safeNoteValue };
}

export function getBeatIntervalMs(bpm: number, noteValue = 4): number {
  const safeBpm = clampBpm(bpm);
  const { noteValue: safeNoteValue } = normalizeTimeSignature(4, noteValue);

  return (60000 / safeBpm) * (4 / safeNoteValue);
}

export function shouldResetTapSequence(lastTapTime: number | null, now: number, resetMs = DEFAULT_TAP_RESET_MS): boolean {
  return lastTapTime === null || now - lastTapTime > resetMs;
}

export function calculateTapBpm(tapTimes: number[]): number | null {
  if (tapTimes.length < 2) {
    return null;
  }

  const intervals: number[] = [];
  for (let i = 1; i < tapTimes.length; i++) {
    const delta = tapTimes[i] - tapTimes[i - 1];
    if (delta >= 150 && delta <= 3000) {
      intervals.push(delta);
    }
  }

  if (intervals.length === 0) {
    return null;
  }

  const avgInterval = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  return clampBpm(60000 / avgInterval);
}
