<script lang="ts">
import { onDestroy } from 'svelte';
import { autocorrelate, frequencyToNoteInfo, nearestGuitarString, GUITAR_STRINGS, type NoteInfo } from '@scripts/tools/tuner.js';

type Mode = 'chromatic' | 'guitar';

let mode = $state<Mode>('guitar');
let isListening = $state(false);
let permissionDenied = $state(false);
let audioUnavailable = $state(false);
let noteInfo = $state<NoteInfo | null>(null);
let targetString = $state<typeof GUITAR_STRINGS[number] | null>(null);

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let mediaStream: MediaStream | null = null;
let animFrameId: number | null = null;
let buffer: Float32Array | null = null;

const BUFFER_SIZE = 2048;

function tick() {
  if (!analyser || !buffer) {
    return;
  }

  analyser.getFloatTimeDomainData(buffer);
  const frequency = autocorrelate(buffer, audioContext!.sampleRate);

  if (frequency > 0) {
    noteInfo = frequencyToNoteInfo(frequency);
    targetString = mode === 'guitar' ? nearestGuitarString(frequency) : null;
  } else {
    noteInfo = null;
    targetString = null;
  }

  animFrameId = requestAnimationFrame(tick);
}

async function startListening() {
  if (typeof window === 'undefined') {
    return;
  }

  const AudioContextCtor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor || !navigator.mediaDevices?.getUserMedia) {
    audioUnavailable = true;
    return;
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch {
    permissionDenied = true;
    return;
  }

  audioContext = new AudioContextCtor();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = BUFFER_SIZE;
  buffer = new Float32Array(analyser.fftSize);

  const source = audioContext.createMediaStreamSource(mediaStream);
  source.connect(analyser);

  isListening = true;
  permissionDenied = false;
  tick();
}

function stopListening() {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }

  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = null;

  void audioContext?.close();
  audioContext = null;
  analyser = null;
  buffer = null;

  isListening = false;
  noteInfo = null;
  targetString = null;
}

function toggleListening() {
  if (isListening) {
    stopListening();
  } else {
    void startListening();
  }
}

onDestroy(stopListening);

// Cents meter: -50 = fully flat, 0 = in tune, +50 = fully sharp
const MAX_CENTS = 50;
const meterPercent = $derived(
  noteInfo ? Math.min(100, Math.max(0, ((noteInfo.cents + MAX_CENTS) / (MAX_CENTS * 2)) * 100)) : 50
);

const tuningLabel = $derived(
  !noteInfo ? '' : noteInfo.cents === 0 ? 'In tune' : noteInfo.cents > 0 ? `+${noteInfo.cents}¢ Sharp` : `${noteInfo.cents}¢ Flat`
);

const meterColor = $derived(
  !noteInfo ? 'secondary' : Math.abs(noteInfo.cents) <= 5 ? 'success' : Math.abs(noteInfo.cents) <= 15 ? 'warning' : 'danger'
);
</script>

<div class="card google-anno-skip">
  <div class="card-body">
    <div class="row g-4">
      <!-- Controls -->
      <div class="col-12 col-lg-4">
        <h5 class="mb-3">Controls</h5>

        <div class="mb-3">
          <label class="form-label" for="tuner-mode">Mode</label>
          <select id="tuner-mode" class="form-select" bind:value={mode} disabled={isListening}>
            <option value="chromatic">Chromatic</option>
            <option value="guitar">Acoustic Guitar</option>
          </select>
        </div>

        <button type="button" class={`btn ${isListening ? 'btn-danger' : 'btn-success'} w-100`} on:click={toggleListening}>
          {#if isListening}
            <i class="fas fa-stop me-2" aria-hidden="true"></i>Stop
          {:else}
            <i class="fas fa-microphone me-2" aria-hidden="true"></i>Start Tuner
          {/if}
        </button>

        {#if audioUnavailable}
          <p class="text-danger mt-3 mb-0">
            Web Audio or microphone access is not available in your browser.
          </p>
        {/if}

        {#if permissionDenied}
          <p class="text-danger mt-3 mb-0">
            Microphone access was denied. Please allow microphone access and try again.
          </p>
        {/if}

        {#if mode === 'guitar'}
          <div class="mt-4">
            <h6 class="mb-2">Standard Tuning</h6>
            <ul class="list-unstyled mb-0">
              {#each GUITAR_STRINGS as string}
                <li class={`py-1 ${targetString?.label === string.label && isListening ? 'text-info fw-bold' : ''}`}>
                  <i class="fas fa-guitar me-2" aria-hidden="true"></i>
                  String {string.label}
                  <span class="text-muted ms-1">({string.frequency.toFixed(2)} Hz)</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>

      <!-- Tuner Display -->
      <div class="col-12 col-lg-8">
        <h5 class="mb-3">Tuner</h5>

        <div class="text-center mb-4" aria-live="polite">
          {#if noteInfo}
            <div class="display-1 fw-bold mb-1" style="line-height:1">
              {noteInfo.note}<sub style="font-size:0.4em">{noteInfo.octave}</sub>
            </div>
            <p class="text-muted mb-0">{noteInfo.frequency.toFixed(1)} Hz</p>
          {:else}
            <div class="display-1 fw-bold mb-1 text-muted" style="line-height:1">—</div>
            <p class="text-muted mb-0">{isListening ? 'Listening…' : 'Start to detect pitch'}</p>
          {/if}
        </div>

        <!-- Cents meter -->
        <div class="mb-3">
          <div class="d-flex justify-content-between small text-muted mb-1">
            <span>♭ Flat</span>
            <span>In Tune</span>
            <span>Sharp ♯</span>
          </div>
          <div class="progress" style="height: 24px;" role="progressbar" aria-label="Tuning meter">
            <div
              class={`progress-bar bg-${meterColor}`}
              style={`width: ${meterPercent}%`}
            ></div>
          </div>
          <div class="text-center mt-1">
            <small class={`text-${meterColor}`}>{tuningLabel}</small>
          </div>
        </div>

        <!-- Center marker -->
        <div class="position-relative" style="height:2px; background:#444; margin: 0 4px;">
          <div class="position-absolute top-50 start-50 translate-middle" style="width:2px; height:12px; background:#aaa; margin-top:-6px;"></div>
        </div>

        {#if mode === 'guitar' && targetString && isListening}
          <p class="text-center mt-3 mb-0">
            <span class="badge text-bg-info fs-6">String {targetString.label}</span>
          </p>
        {/if}
      </div>
    </div>
  </div>
</div>
