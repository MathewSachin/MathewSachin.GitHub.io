<script lang="ts">
import { AudioMixer }                          from '../../scripts/tools/captura/audio-mixer';
import { Compositor }                          from '../../scripts/tools/captura/compositor';
import { Metronome }                           from '../../scripts/tools/captura/metronome';
import { StorageManager }                      from '../../scripts/tools/captura/storage';
import { RecorderCore }                        from '../../scripts/tools/captura/recorder-core';
import { PREFS, savePref, loadPref }           from '../../scripts/tools/captura/prefs';
import { showAlert, showToast, showErrorDialog, initDialogs } from '../../scripts/tools/captura/dialogs';
import { RecorderAPI }                         from '../../scripts/tools/captura/recorder-api';
import { RecorderStateMachine, STATE, EVENT, type State, type Event }  from '../../scripts/tools/captura/recorder-state-machine';
import { onMount, untrack } from 'svelte';

let elapsedSecs = $state(0);
let recorderState: State = $state(STATE.IDLE);
let micMuted = $state(false);
let sysMuted = $state(false);

// Svelte-bound state variables for form controls
let webcamValue = $state(loadPref(PREFS.webcam) ?? '');
let micValue = $state(loadPref(PREFS.mic) ?? '');
let fpsValue = $state(loadPref(PREFS.fps) ?? '30');
let qualityValue = $state(loadPref(PREFS.quality) ?? '720');
let formatValue = $state(loadPref(PREFS.format) ?? 'webm-vp9-opus');
let countdownValue = $state(loadPref(PREFS.countdown) ?? '3');
let sysAudioChecked = $state(loadPref(PREFS.sysAudio) === 'true');
let micGainValue = $state(loadPref(PREFS.micGain) ?? '1');
let sysGainValue = $state(loadPref(PREFS.sysGain) ?? '1');

// Device options for selects
let webcamOptions = $state([{ label: 'None', value: '' }]);
let micOptions = $state([{ label: 'None', value: '' }]);

const BLOB_URL_REVOKE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const gainPct = (v: string | number) => Math.round(parseFloat(String(v)) * 100) + '%';
const fmtTime = (s: number) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

let canvas: HTMLCanvasElement;
let dirName = $state('(no folder selected)');
let micGainLabelValue = $derived(micMuted ? `Muted · ${gainPct(micGainValue)}` : gainPct(micGainValue));
let sysGainLabelValue = $derived(sysMuted ? `Muted · ${gainPct(sysGainValue)}` : gainPct(sysGainValue));
let micLevelCanvas: HTMLCanvasElement;
let sysLevelCanvas: HTMLCanvasElement;
let errorDialog: HTMLDialogElement;
let countdownOverlay: HTMLElement;
let countdownNumberEl: HTMLElement;
const fpsOptions = [
  { value: '15', label: '15 fps' },
  { value: '30', label: '30 fps' },
  { value: '60', label: '60 fps' },
];
const countdownOptions = [
  { value: '0', label: 'Off' },
  { value: '3', label: '3 sec' },
  { value: '5', label: '5 sec' },
  { value: '10', label: '10 sec' },
];

let timerIntervalId: ReturnType<typeof setInterval> | null = null;
let countdownIntervalId: ReturnType<typeof setInterval> | null = null;

let compositor: Compositor;
let audioMixer: AudioMixer;
let storage: StorageManager;
const metronome    = new Metronome();
const recorderCore = new RecorderCore();
let api: RecorderAPI;
let machine: RecorderStateMachine;

function hasGetDisplayMedia() {
  return !!(navigator.mediaDevices?.getDisplayMedia);
}

function startTimer() {
  if (timerIntervalId !== null) clearInterval(timerIntervalId);
  elapsedSecs = 0;
  timerIntervalId = setInterval(() => { elapsedSecs++; }, 1000);
}

function pauseTimer() {
  if (timerIntervalId !== null) clearInterval(timerIntervalId);
  timerIntervalId = null;
}

function resumeTimer() {
  if (timerIntervalId === null) {
    timerIntervalId = setInterval(() => { elapsedSecs++; }, 1000);
  }
}

function resetTimer() {
  if (timerIntervalId !== null) clearInterval(timerIntervalId);
  timerIntervalId = null;
  elapsedSecs = 0;
}

function startCountdownOverlay(secs: number, onDone: () => void) {
  stopCountdownOverlay();
  if (secs <= 0) {
    onDone();
    return;
  }
  countdownNumberEl.textContent = String(secs);
  countdownOverlay.hidden = false;
  let remaining = secs;
  countdownIntervalId = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      stopCountdownOverlay();
      onDone();
    } else {
      countdownNumberEl.textContent = String(remaining);
      countdownNumberEl.style.animation = 'none';
      void countdownNumberEl.offsetWidth;
      countdownNumberEl.style.animation = '';
    }
  }, 1000);
}

function stopCountdownOverlay(): void {
  if (countdownIntervalId !== null) clearInterval(countdownIntervalId);
  countdownIntervalId = null;
  countdownOverlay.hidden = true;
  countdownNumberEl.textContent = '';
}

const timerText = $derived(fmtTime(elapsedSecs));

const isSession = $derived(recorderState === STATE.SESSION as State);
const isReq = $derived(recorderState === STATE.REQUESTING as State);
const isCountdown = $derived(recorderState === STATE.COUNTDOWN as State);
const isRec = $derived(recorderState === STATE.RECORDING as State);
const isPaused = $derived(recorderState === STATE.PAUSED as State);
const isStopping = $derived(recorderState === STATE.STOPPING as State);
const isError = $derived(recorderState === STATE.ERROR as State);
const active = $derived(isRec || isPaused);
const hasSession = $derived(isSession || active || isStopping || isCountdown);
const showPreviewHint = $derived(!hasSession && !isReq);
const showSessionHint = $derived(isSession);
const showMicMixControls = $derived(micValue !== '');
const showSysMixControls = $derived(sysAudioChecked);
const previewDimmed = $derived(!isRec);

const showStartBtn = $derived(!(active || isStopping || isCountdown));
const startBtnDisabled = $derived(isReq);

const showPauseBtn = $derived(active);
const pauseBtnDisabled = $derived(false);
const pauseBtnIcon = $derived(isPaused ? 'fa-play' : 'fa-pause');
const pauseBtnText = $derived(isPaused ? 'Resume' : 'Pause');
const pauseBtnClass = $derived(isPaused ? 'btn btn-success' : 'btn btn-warning text-dark');
const showStopBtn = $derived(active);
const stopBtnDisabled = $derived(false);
const showCancelCountdownBtn = $derived(isCountdown);
const showEndSessionBtn = $derived(hasSession && !isCountdown);
const endSessionBtnDisabled = $derived(isStopping || isReq);

const statusText = $derived(
      isRec       ? '⏺ Recording'
    : isPaused    ? '⏸ Paused'
    : isReq       ? '⏳ Acquiring…'
    : isCountdown ? '⏱ Starting…'
    : isStopping  ? '⏳ Saving…'
    : isSession   ? '◉ Screen share ready'
    : isError     ? '⚠ Error'
    :               'Idle');

const statusClass = $derived(
      isRec                    ? 'badge bg-danger'
    : isPaused || isStopping   ? 'badge bg-warning text-dark'
    : isSession || isCountdown ? 'badge bg-warning text-dark'
    : isError                  ? 'badge bg-danger'
    :                            'badge bg-secondary');

const lockControls = $derived(active || isStopping || isReq || isCountdown);
const webcamDisabled = $derived(isStopping || isReq || isCountdown);
const micDisabled = $derived(lockControls);
const sysAudioDisabled = $derived(lockControls);
const fpsDisabled = $derived(lockControls);
const qualityDisabled = $derived(lockControls);
const formatDisabled = $derived(lockControls);
const countdownDisabled = $derived(lockControls);
const micMixDisabled = $derived(!showMicMixControls);
const sysMixDisabled = $derived(!showSysMixControls);
const timerClass = $derived(active ? 'font-monospace small text-danger fw-semibold' : 'font-monospace text-muted small');
const micGainLabelClass = $derived(micMuted ? 'text-secondary small font-monospace' : 'text-muted small font-monospace');
const sysGainLabelClass = $derived(sysMuted ? 'text-secondary small font-monospace' : 'text-muted small font-monospace');

$effect(() => savePref(PREFS.fps, fpsValue));
$effect(() => savePref(PREFS.quality, qualityValue));
$effect(() => savePref(PREFS.format, formatValue));
$effect(() => savePref(PREFS.sysAudio, String(sysAudioChecked)));
$effect(() => savePref(PREFS.countdown, countdownValue));

$effect(() => {
  const currentWebcam = webcamValue;

  untrack(() => {
    savePref(PREFS.webcam, currentWebcam);
    const s = machine?.state;
    
    if (s) {
      if (s === STATE.RECORDING || s === STATE.PAUSED) {
        const hasWebcamSelected = currentWebcam !== '' && currentWebcam !== 'none';
        
        api.changeWebcam(currentWebcam, hasWebcamSelected)
          .catch(err => { 
            const e = err; 
            showToast('Failed to switch webcam: ' + (e?.message ?? String(err)), 'danger'); 
          });
      } else if (s !== STATE.STOPPING) {
        syncDevicesToApi();
        api.restartPreviews();
      }
    }
  });
});

$effect(() => {
  const currentMic = micValue;

  untrack(() => {
    savePref(PREFS.mic, currentMic);
    const s = machine?.state;
    
    if (s && s !== STATE.RECORDING && s !== STATE.PAUSED && s !== STATE.STOPPING) {
      syncDevicesToApi();
      api.restartPreviews();
    }
  });
});

function render(state: State): void {
  recorderState = state;
}

type MachinePayload = {
  fps?: number;
  quality?: string;
  format?: string;
  webcamSelected?: boolean;
  micSelected?: boolean;
  wantSysAudio?: boolean;
  name?: string;
  message?: string;
  title?: string;
};

function onStateChanged(state: State, event: Event, payload: MachinePayload): void {
  render(state);

  if (state === STATE.COUNTDOWN) {
    const savedPayload = payload;
    startCountdownOverlay(
      parseInt(countdownValue, 10),
      () => machine.transition(EVENT.COUNTDOWN_DONE, savedPayload)
    );
  } else {
    stopCountdownOverlay();
  }

  if (state === STATE.RECORDING) {
    if (event === EVENT.USER_RESUME) resumeTimer();
    else startTimer();
  } else if (state === STATE.PAUSED) {
    pauseTimer();
  } else {
    resetTimer();
  }

  if (event === EVENT.FINALIZE_DONE && payload) {
    showSaveSuccessToast(payload as any);
  }

  if (state === STATE.ERROR) {
    showErrorDialog(
      payload?.title   || 'Recording Error',
      payload?.message || String(payload ?? 'An unknown error occurred.')
    );
  }

  if (state === STATE.IDLE || state === STATE.SESSION) {
    syncDevicesToApi();
  }
}

function syncDevicesToApi(): void {
  api.setDevices({
    webcamDeviceId: webcamValue,
    webcamSelected: webcamValue !== '',
    micDeviceId:    micValue,
    micSelected:    micValue !== '',
  });
}

function buildStartPayload(): {
    fps: string;
    quality: string;
    format: string;
    wantSysAudio: boolean;
    webcamSelected: boolean;
    webcamDeviceId: string;
    micSelected: boolean;
    micDeviceId: string;
    micGain: number;
    sysGain: number;
  } {
  syncDevicesToApi();
  return {
    fps:           fpsValue,
    quality:       qualityValue,
    format:        formatValue,
    wantSysAudio:  sysAudioChecked,
    webcamSelected: webcamValue !== '',
    webcamDeviceId: webcamValue,
    micSelected:   micValue !== '',
    micDeviceId:   micValue,
    micGain:       parseFloat(micGainValue),
    sysGain:       parseFloat(sysGainValue),
  };
}

async function showSaveSuccessToast(fileHandle: { getFile: () => Promise<File> } | null): Promise<void> {
  const msg = document.createDocumentFragment();

  if (storage.isOPFS) {
    msg.append('Recording complete. ');
    if (fileHandle) {
      try {
        const file = await fileHandle.getFile();
        const url  = URL.createObjectURL(file);
        const name = file.name;

        const link = Object.assign(document.createElement('a'), {
          href: url, download: name,
          textContent: 'Download recording', className: 'toast-link',
        });
        msg.append(link);

        const cleanup = () => {
          URL.revokeObjectURL(url);
          storage.dirHandle?.removeEntry(name).catch(() => {});
        };
        setTimeout(cleanup, BLOB_URL_REVOKE_TIMEOUT_MS);
        window.addEventListener('beforeunload', cleanup, { once: true });
      } catch (_) {
      }
    }
    showToast(msg, 'success', false);
  } else {
    msg.append('Recording saved to disk. ');
    if (fileHandle) {
      try {
        const file = await fileHandle.getFile();
        const url  = URL.createObjectURL(file);
        const link = Object.assign(document.createElement('a'), {
          href: url, target: '_blank', rel: 'noopener noreferrer',
          textContent: 'Open in new tab', className: 'toast-link',
        });
        msg.append(link);
        setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_REVOKE_TIMEOUT_MS);
        window.addEventListener('beforeunload', () => URL.revokeObjectURL(url), { once: true });
      } catch (_) {
      }
    }
    showToast(msg, 'success');
  }
}

async function enumerateDevices(): Promise<void> {
  try {
    // Get permission and close any active streams just to ensure we get labels and can select specific devices
    await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then(stream => { try {stream.getTracks().forEach(track => track.stop());} catch (_) {} })
    const devices   = await navigator.mediaDevices.enumerateDevices();
    const videoDevs = devices.filter(d => d.kind === 'videoinput' && d.deviceId);
    const audioDevs = devices.filter(d => d.kind === 'audioinput' && d.deviceId);

    webcamOptions = [{ label: 'None', value: '' }, ...videoDevs.map((d, i) => ({ label: d.label || `Camera ${i + 1}`, value: d.deviceId }))];
    micOptions = [{ label: 'None', value: '' }, ...audioDevs.map((d, i) => ({ label: d.label || `Microphone ${i + 1}`, value: d.deviceId }))];

    const s = machine.state;
    if (s !== STATE.RECORDING && s !== STATE.PAUSED && s !== STATE.STOPPING) {
      syncDevicesToApi();
      api.restartPreviews();
    }
  } catch (err) {
      const e = err as { message?: string } | undefined;
      showErrorDialog('Device Error', 'Could not enumerate devices: ' + (e?.message ?? String(err)));
  }
}

function restoreSimplePrefs(): void {
  const storedPipX = loadPref(PREFS.pipX);
  const storedPipY = loadPref(PREFS.pipY);
  if (storedPipX !== null && storedPipY !== null) {
    compositor.pipX = parseFloat(storedPipX);
    compositor.pipY = parseFloat(storedPipY);
  }
}

function startRecording() {
  if (!hasGetDisplayMedia()) {
    showErrorDialog(
      'Not Supported',
      'Screen recording is not supported on this device. ' +
      'Mobile browsers cannot access the device screen due to security sandbox restrictions. ' +
      'Please use a desktop browser with screen-recording support (Chrome, Edge, or Firefox) to use the recorder.'
    );
    return;
  }
  machine.transition(EVENT.USER_START, buildStartPayload());
}

function getEffectiveMicGain(): number {
  return micMuted ? 0 : parseFloat(micGainValue);
}

function getEffectiveSysGain(): number {
  return sysMuted ? 0 : parseFloat(sysGainValue);
}

function applyAudioMixSettings(): void {
  if (audioMixer) {
    audioMixer.setMicMuted(micMuted);
    audioMixer.setSysMuted(sysMuted);
    audioMixer.setMicGain(getEffectiveMicGain());
    audioMixer.setSysGain(getEffectiveSysGain());
  }
}

function toggleMicMute() {
  micMuted = !micMuted;
}

function toggleSysMute() {
  sysMuted = !sysMuted;
}

function handlePauseResume() {
  if (machine.state === STATE.PAUSED) {
    machine.transition(EVENT.USER_RESUME, { fps: parseInt(fpsValue, 10) });
  } else {
    machine.transition(EVENT.USER_PAUSE);
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    ('isContentEditable' in el && el.isContentEditable)
  );
}

function handleGlobalShortcut(event: KeyboardEvent) {
  if (!machine || event.repeat || isTypingTarget(event.target)) return;

  if (event.key === 'Escape' && machine.state === STATE.COUNTDOWN) {
    event.preventDefault();
    machine.transition(EVENT.COUNTDOWN_CANCEL);
    return;
  }

  if (!event.shiftKey) return;

  const key = event.key.toLowerCase();
  if (key === 'r') {
    event.preventDefault();
    if (machine.state === STATE.PAUSED) handlePauseResume();
    else if (machine.state === STATE.IDLE || machine.state === STATE.SESSION) startRecording();
  } else if (key === 'p' && machine.state === STATE.RECORDING) {
    event.preventDefault();
    handlePauseResume();
  } else if (key === 's' && (machine.state === STATE.RECORDING || machine.state === STATE.PAUSED)) {
    event.preventDefault();
    machine.transition(EVENT.USER_STOP);
  }
}

onMount(() => {
  compositor = new Compositor(canvas, {
    onPipMoved: (x: number, y: number) => { savePref(PREFS.pipX, String(x)); savePref(PREFS.pipY, String(y)); },
  });
  audioMixer   = new AudioMixer(micLevelCanvas, sysLevelCanvas);
  storage      = new StorageManager((name: string) => dirName = name, showErrorDialog);
  api = new RecorderAPI({
    compositor, audioMixer, metronome, recorderCore, storage, canvas,
  });

  machine = new RecorderStateMachine(api);
  machine.onStateChange(onStateChanged);
  initDialogs();

  if (!hasGetDisplayMedia()) {
    showAlert(
      'Screen recording is not supported on this device. ' +
      'Mobile browsers run inside a security sandbox that prevents access to the device screen — ' +
      'this is where native desktop apps still shine. ' +
      'Please open this page on a desktop browser (Chrome, Edge, or Firefox) to use the recorder.',
      'warning'
    );
    const recUi = document.getElementById('recorder-ui');
    if (recUi) recUi.hidden = true;
  }

  restoreSimplePrefs();

  const handleDeviceChange = () => {
    enumerateDevices().catch((err) => {
      console.error('[Captura] Device refresh failed:', err);
    });
  };
  if (hasGetDisplayMedia()) {
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    enumerateDevices();
  }

  api.restartPreviews();

  storage.init();

  errorDialog?.addEventListener('close', () => {
    if (machine.state === STATE.ERROR) {
      machine.transition(EVENT.ERROR_DISMISSED);
    }
  });

  window.addEventListener('beforeunload', (e) => {
    const s = machine.state;
    if (s === STATE.RECORDING || s === STATE.PAUSED ||
        s === STATE.STOPPING  || s === STATE.COUNTDOWN) {
      e.preventDefault();
    }
  });

  window.addEventListener('keydown', handleGlobalShortcut);

  return () => {
    if (hasGetDisplayMedia()) {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    }
    window.removeEventListener('keydown', handleGlobalShortcut);
  };
});

$effect(() => {
  savePref(PREFS.micGain, micGainValue);
  savePref(PREFS.sysGain, sysGainValue);
  applyAudioMixSettings();
});
</script>

<div id="alert-box" class="alert mb-3" hidden></div>

<div id="toast-container" class="toast-container position-fixed bottom-0 end-0 p-3"></div>

<dialog id="captura-error-dialog" aria-labelledby="captura-error-title" bind:this={errorDialog}>
  <div class="captura-dialog-content">
    <button type="button" class="captura-dialog-close" id="captura-error-close" aria-label="Close">&times;</button>
    <h5 id="captura-error-title" class="captura-dialog-title"></h5>
    <p id="captura-error-body" class="captura-dialog-body"></p>
  </div>
</dialog>

<!-- ── Recorder ──────────────────────────────────────────────────────────── -->
<div id="recorder-ui" class="card mb-4 google-anno-skip">
  <div class="card-body">

    <div class="row g-4">

      <!-- Left: canvas preview -->
      <div class="col-lg-8">
        <div class="mb-2 d-flex align-items-center justify-content-between">
          <span class="fw-semibold">Preview</span>
          <span class="d-flex align-items-center gap-2">
            <span id="status-badge" class={statusClass}>{statusText}</span>
            <span id="timer-text" class={timerClass}>{timerText}</span>
          </span>
        </div>
          <div class="canvas-wrap">
            <div class="preview-frame" class:preview-frame-dimmed={previewDimmed}>
            <canvas id="recorder-canvas" width="1280" height="720" bind:this={canvas}></canvas>
              {#if showPreviewHint}
                <div class="preview-hint" aria-hidden="true">
                  <span class="preview-hint-title">Preview will appear here</span>
                  <span class="preview-hint-body">Select your sources, then start recording to share a screen or window.</span>
                </div>
              {/if}
            </div>
            <div id="countdown-overlay" hidden aria-live="assertive" aria-atomic="true" bind:this={countdownOverlay}>
              <span id="countdown-number" bind:this={countdownNumberEl}></span>
            </div>
          </div>
        <div class="mt-3 d-flex gap-2 flex-wrap">
          {#if showStartBtn}
            <button id="start-btn" class="btn btn-danger" disabled={startBtnDisabled} onclick={startRecording} title="Start recording (Shift+R)">
              <i class="fas fa-circle me-1"></i>Start Recording
            </button>
          {/if}
          {#if showPauseBtn}
            <button id="pause-btn" class={pauseBtnClass} disabled={pauseBtnDisabled} onclick={handlePauseResume} title={isPaused ? 'Resume recording (Shift+R)' : 'Pause recording (Shift+P)'}>
              <i class="fas {pauseBtnIcon} me-1"></i>{pauseBtnText}
            </button>
          {/if}
          {#if showStopBtn}
            <button id="stop-btn" class="btn btn-danger" disabled={stopBtnDisabled} onclick={() => machine.transition(EVENT.USER_STOP)} title="Stop recording (Shift+S)">
              <i class="fas fa-stop me-1"></i>Stop
            </button>
          {/if}
          {#if showCancelCountdownBtn}
            <button id="cancel-countdown-btn" class="btn btn-secondary" onclick={() => machine.transition(EVENT.COUNTDOWN_CANCEL)} title="Cancel countdown (Esc)">
              <i class="fas fa-times me-1"></i>Cancel
            </button>
          {/if}
          {#if showEndSessionBtn}
            <button id="end-session-btn" class="btn btn-outline-warning" disabled={endSessionBtnDisabled} onclick={() => machine.transition(EVENT.END_SESSION)} title="Release the current screen share so you can choose a different screen or window">
              <i class="fas fa-times-circle me-1"></i>Release Screen Share
            </button>
          {/if}
        </div>
        {#if showSessionHint}
          <div class="alert alert-secondary mt-3 mb-0 py-2 small">
            Your screen share is still active so you can start another recording without reopening the browser picker.
            Use <strong>Release Screen Share</strong> when you want to choose a different screen or window.
          </div>
        {/if}
        <p class="text-muted small mt-3 mb-0">
          Shortcuts: <kbd>Shift</kbd>+<kbd>R</kbd> start/resume, <kbd>Shift</kbd>+<kbd>P</kbd> pause,
          <kbd>Shift</kbd>+<kbd>S</kbd> stop, <kbd>Esc</kbd> cancel countdown.
        </p>

        <div class="row g-3 mt-1">
          <div class="col-md-6">
            <section class="h-100 me-1">
              <h6 class="mb-2">Output</h6>
              <div class="mb-2">
                <div class="d-flex align-items-center gap-2">
                  <span id="dir-name" class="text-muted small flex-grow-1 text-truncate">{dirName}</span>
                  <button id="pick-dir-btn" class="btn btn-sm btn-outline-secondary flex-shrink-0" onclick={() => { storage.pickDirectory(); }} hidden={storage?.isOPFS} disabled={lockControls}>
                    <i class="fas fa-folder-open me-1"></i>Choose Folder
                  </button>
                </div>
                <div class="text-muted small mt-1">Pick where recordings are saved before you start.</div>
              </div>

              <div>
                <label class="form-label text-muted small mb-1" for="format-select">Recording format</label>
                <select id="format-select" class="form-select form-select-sm" bind:value={formatValue} disabled={formatDisabled}>
                  <option value="webm-vp9-opus">WebM — VP9 + Opus</option>
                  <option value="mp4-h264-aac">MP4 — H.264 + AAC</option>
                </select>
              </div>
            </section>
          </div>

          <div class="col-md-6">
            <section class="h-100">
              <h6 class="mb-2">Quality</h6>

              <div class="mb-2">
                <label class="form-label text-muted small mb-1">Frame rate</label>
                <div id="fps-pill-group" class="pill-toggle-group" role="group" aria-label="Frame rate">
                  {#each fpsOptions as opt}
                    <button
                      type="button"
                      class:active={fpsValue === opt.value}
                      class="pill-toggle-btn"
                      aria-pressed={fpsValue === opt.value}
                      onclick={() => { fpsValue = opt.value; }}
                      disabled={fpsDisabled}
                    >
                      {opt.label}
                    </button>
                  {/each}
                </div>
              </div>

              <div class="mb-2">
                <label class="form-label text-muted small mb-1" for="quality-select">Quality preset</label>
                <select id="quality-select" class="form-select form-select-sm" bind:value={qualityValue} disabled={qualityDisabled}>
                  <option value="480">480p — ~2 Mbps</option>
                  <option value="720">720p — ~4 Mbps</option>
                  <option value="1080">1080p — ~8 Mbps</option>
                </select>
              </div>

              <div>
                <label class="form-label text-muted small mb-1">Countdown timer</label>
                <div id="countdown-pill-group" class="pill-toggle-group" role="group" aria-label="Countdown timer">
                  {#each countdownOptions as opt}
                    <button
                      type="button"
                      class:active={countdownValue === opt.value}
                      class="pill-toggle-btn"
                      aria-pressed={countdownValue === opt.value}
                      onclick={() => { countdownValue = opt.value; }}
                      disabled={countdownDisabled}
                    >
                      {opt.label}
                    </button>
                  {/each}
                </div>
              </div>
            </section>
          </div>
        </div>

      </div>

      <!-- Right: settings -->
      <div class="col-lg-4">
        <!-- Audio / Video sources -->
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h6 class="mb-0">Sources</h6>
          {#if !micDisabled}
            <button type="button" class="btn btn-sm btn-outline-secondary" title="Refresh device list" onclick={enumerateDevices}>
              <i class="fas fa-refresh"></i>
            </button>
          {/if}
        </div>

        <div class="mb-3">
          <label class="form-label text-muted small mb-1" for="webcam-select">
            <i class="fas fa-video me-1"></i>Webcam overlay
          </label>
          <select id="webcam-select" class="form-select form-select-sm" bind:value={webcamValue} disabled={webcamDisabled}>
            {#each webcamOptions as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label text-muted small mb-1" for="mic-select">
            <i class="fas fa-microphone me-1"></i>Microphone
          </label>
          <select id="mic-select" class="form-select form-select-sm" bind:value={micValue} disabled={micDisabled}>
            {#each micOptions as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>

        <div class="mb-3" class:source-audio-card-disabled={micMixDisabled}>
          <div class="d-flex align-items-center justify-content-between mb-1">
            <label class="form-label text-muted small mb-0" for="mic-gain-slider">Mic level</label>
            <span id="mic-gain-label" class={micGainLabelClass}>{micGainLabelValue}</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <button id="mic-mute-btn" type="button" class="btn btn-sm btn-outline-secondary flex-shrink-0" aria-pressed={micMuted} onclick={toggleMicMute} disabled={micMixDisabled}>
              <i class={`fas ${micMuted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
              <span class="ms-1">{micMuted ? 'Unmute' : 'Mute'}</span>
            </button>
            <input type="range" class="form-range mb-0" id="mic-gain-slider" min="0" max="2" step="0.01" bind:value={micGainValue} disabled={micMixDisabled}>
          </div>
          <canvas id="mic-level-canvas" class="audio-meter mt-2" width="200" height="10" bind:this={micLevelCanvas}></canvas>
          {#if micMixDisabled}
            <div id="mic-mix-help" class="text-muted small mt-2">Select a microphone to enable level control and live metering.</div>
          {/if}
        </div>

        <div class="mb-3 form-check form-switch">
          <input class="form-check-input" type="checkbox" id="sys-audio-chk" bind:checked={sysAudioChecked} disabled={sysAudioDisabled}>
          <label class="form-check-label small" for="sys-audio-chk">Capture system audio</label>
        </div>

        <div class="mb-3" class:source-audio-card-disabled={sysMixDisabled}>
          <div class="d-flex align-items-center justify-content-between mb-1">
            <label class="form-label text-muted small mb-0" for="sys-gain-slider">System level</label>
            <span id="sys-gain-label" class={sysGainLabelClass}>{sysGainLabelValue}</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <button id="sys-mute-btn" type="button" class="btn btn-sm btn-outline-secondary flex-shrink-0" aria-pressed={sysMuted} onclick={toggleSysMute} disabled={sysMixDisabled}>
              <i class={`fas ${sysMuted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
              <span class="ms-1">{sysMuted ? 'Unmute' : 'Mute'}</span>
            </button>
            <input type="range" class="form-range mb-0" id="sys-gain-slider" min="0" max="2" step="0.01" bind:value={sysGainValue} disabled={sysMixDisabled}>
          </div>
          <canvas id="sys-level-canvas" class="audio-meter mt-2" width="200" height="10" bind:this={sysLevelCanvas}></canvas>
          {#if sysMixDisabled}
            <div id="sys-mix-help" class="text-muted small mt-2">Turn on system audio capture to enable level control and live metering.</div>
          {/if}
        </div>
      </div>
    </div><!-- /.row -->

  </div><!-- /.card-body -->
</div><!-- /.card -->