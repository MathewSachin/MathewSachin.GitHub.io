<script lang="ts">
import { onDestroy } from 'svelte';
import { calculateTapBpm, clampBpm, getBeatIntervalMs, normalizeTimeSignature, shouldResetTapSequence } from '@scripts/tools/metronome.js';

let bpm = $state(120);
let beatsPerBar = $state(4);
let beatUnit = $state(4);
let isRunning = $state(false);
let activeBeat = $state(0);
let tapCount = $state(0);
let audioUnavailable = $state(false);

let tapTimes: number[] = [];
let lastTapTime: number | null = null;
let timerId: ReturnType<typeof setTimeout> | null = null;
let beatCursor = 0;
let audioContext: AudioContext | null = null;

const timeSignature = $derived(normalizeTimeSignature(beatsPerBar, beatUnit));

function clearTimer() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
}

function clampInputs() {
  bpm = clampBpm(bpm);
  const normalized = normalizeTimeSignature(beatsPerBar, beatUnit);
  beatsPerBar = normalized.beats;
  beatUnit = normalized.noteValue;
}

async function ensureAudioContext(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    audioUnavailable = true;
    return false;
  }

  audioContext ??= new AudioContextCtor();

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  return true;
}

function playClick(accent: boolean) {
  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(accent ? 1200 : 800, now);
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(accent ? 0.28 : 0.18, now + 0.008);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.07);
}

function tick() {
  if (!isRunning) {
    return;
  }

  const beatIndex = beatCursor % timeSignature.beats;
  playClick(beatIndex === 0);
  activeBeat = beatIndex + 1;
  beatCursor = (beatIndex + 1) % timeSignature.beats;

  timerId = setTimeout(tick, getBeatIntervalMs(bpm, timeSignature.noteValue));
}

async function startMetronome() {
  clampInputs();
  const isAudioReady = await ensureAudioContext();
  if (!isAudioReady) {
    return;
  }

  clearTimer();
  beatCursor = 0;
  activeBeat = 0;
  isRunning = true;
  tick();
}

function stopMetronome() {
  isRunning = false;
  activeBeat = 0;
  beatCursor = 0;
  clearTimer();
}

function toggleMetronome() {
  if (isRunning) {
    stopMetronome();
    return;
  }

  void startMetronome();
}

function tapTempo() {
  const now = performance.now();
  if (shouldResetTapSequence(lastTapTime, now)) {
    tapTimes = [now];
  } else {
    tapTimes = [...tapTimes.slice(-7), now];
  }

  lastTapTime = now;
  tapCount = tapTimes.length;

  const tappedBpm = calculateTapBpm(tapTimes);
  if (tappedBpm) {
    bpm = tappedBpm;
  }
}

onDestroy(() => {
  stopMetronome();
  void audioContext?.close();
});
</script>

<div class="card google-anno-skip">
  <div class="card-body">
    <div class="row g-4">
      <div class="col-12 col-lg-5">
        <h5 class="mb-3">Metronome Controls</h5>

        <div class="mb-3">
          <label class="form-label" for="bpm-range">Tempo (BPM)</label>
          <input id="bpm-range" class="form-range" type="range" min="20" max="300" step="1" bind:value={bpm} />
          <input
            id="bpm-input"
            class="form-control"
            type="number"
            min="20"
            max="300"
            step="1"
            bind:value={bpm}
            on:change={clampInputs}
            aria-label="Tempo in beats per minute"
          />
        </div>

        <div class="row g-2 mb-3">
          <div class="col-6">
            <label class="form-label" for="beats-input">Beats / Bar</label>
            <input
              id="beats-input"
              class="form-control"
              type="number"
              min="1"
              max="12"
              step="1"
              bind:value={beatsPerBar}
              on:change={clampInputs}
            />
          </div>
          <div class="col-6">
            <label class="form-label" for="note-value">Beat Unit</label>
            <select id="note-value" class="form-select" bind:value={beatUnit}>
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={8}>8</option>
              <option value={16}>16</option>
            </select>
          </div>
        </div>

        <div class="d-flex flex-wrap gap-2">
          <button type="button" class={`btn ${isRunning ? 'btn-danger' : 'btn-success'}`} on:click={toggleMetronome}>
            {isRunning ? 'Stop' : 'Start'}
          </button>
          <button type="button" class="btn btn-primary" on:click={tapTempo}>Tap Tempo</button>
        </div>

        {#if audioUnavailable}
          <p class="text-danger mt-3 mb-0">Your browser does not support Web Audio, so the metronome cannot play sound.</p>
        {/if}
      </div>

      <div class="col-12 col-lg-7">
        <h5 class="mb-3">Status</h5>
        <p class="mb-2"><strong>Tempo:</strong> {clampBpm(bpm)} BPM</p>
        <p class="mb-2"><strong>Time Signature:</strong> {timeSignature.beats}/{timeSignature.noteValue}</p>
        <p class="mb-3"><strong>Tap Count:</strong> {tapCount}</p>

        <p class="mb-2"><strong>Beat Indicator</strong></p>
        <div class="d-flex flex-wrap gap-2" aria-live="polite">
          {#each Array.from({ length: timeSignature.beats }, (_, i) => i + 1) as beat}
            <span class={`badge ${isRunning && activeBeat === beat ? (beat === 1 ? 'text-bg-danger' : 'text-bg-primary') : 'text-bg-secondary'}`}>
              {beat}
            </span>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>
