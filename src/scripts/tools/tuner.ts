export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export const RMS_THRESHOLD = 0.01;

export const GUITAR_STRINGS = [
  { label: '6 (E2)', frequency: 82.41 },
  { label: '5 (A2)', frequency: 110.00 },
  { label: '4 (D3)', frequency: 146.83 },
  { label: '3 (G3)', frequency: 196.00 },
  { label: '2 (B3)', frequency: 246.94 },
  { label: '1 (E4)', frequency: 329.63 },
] as const;

export interface NoteInfo {
  note: string;
  octave: number;
  cents: number;
  frequency: number;
}

/**
 * Convert a frequency (Hz) to the nearest note, octave, and cents deviation.
 * Returns null for non-positive or non-finite frequencies.
 */
export function frequencyToNoteInfo(frequency: number): NoteInfo | null {
  if (!Number.isFinite(frequency) || frequency <= 0) {
    return null;
  }

  // A4 = 440 Hz = MIDI note 69
  const semitonesFromA4 = 12 * Math.log2(frequency / 440);
  const roundedSemitones = Math.round(semitonesFromA4);
  const midiNote = 69 + roundedSemitones;

  const octave = Math.floor(midiNote / 12) - 1;
  const noteIndex = ((midiNote % 12) + 12) % 12;
  const note = NOTE_NAMES[noteIndex];
  const cents = Math.round((semitonesFromA4 - roundedSemitones) * 100);

  return { note, octave, cents, frequency };
}

/**
 * Find the nearest guitar string to the given frequency.
 */
export function nearestGuitarString(frequency: number): typeof GUITAR_STRINGS[number] {
  return GUITAR_STRINGS.reduce((nearest, string) => {
    const nearestDiff = Math.abs(Math.log2(frequency / nearest.frequency));
    const currentDiff = Math.abs(Math.log2(frequency / string.frequency));
    return currentDiff < nearestDiff ? string : nearest;
  });
}

/**
 * Detect pitch from a PCM buffer using autocorrelation.
 * Returns the detected frequency in Hz, or -1 if the signal is too weak or no pitch found.
 */
export function autocorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;

  // Check signal strength (RMS)
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < RMS_THRESHOLD) {
    return -1;
  }

  // Compute autocorrelation
  const c = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] += buffer[j] * buffer[j + i];
    }
  }

  // Find the first local minimum (end of initial decay)
  let d = 0;
  while (d < SIZE - 1 && c[d] > c[d + 1]) {
    d++;
  }

  // Find the highest peak after the first minimum (fundamental period)
  let maxVal = -1;
  let maxPos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxVal) {
      maxVal = c[i];
      maxPos = i;
    }
  }

  if (maxPos <= 0 || maxPos >= SIZE - 1) {
    return -1;
  }

  // Parabolic interpolation for sub-sample accuracy
  const prev = c[maxPos - 1];
  const peak = c[maxPos];
  const next = c[maxPos + 1];
  const a = (prev + next - 2 * peak) / 2;
  const b = (next - prev) / 2;
  const interpolatedPeriod = a !== 0 ? maxPos - b / (2 * a) : maxPos;

  return sampleRate / interpolatedPeriod;
}
