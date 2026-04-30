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
let micGainLabelValue = $derived(gainPct(micGainValue));
let sysGainLabelValue = $derived(gainPct(sysGainValue));
let micLevelCanvas: HTMLCanvasElement;
let sysLevelCanvas: HTMLCanvasElement;
let errorDialog: HTMLDialogElement;
let countdownOverlay: HTMLElement;
let countdownNumberEl: HTMLElement;

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
    : isSession   ? '◉ Session Active'
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
const countdownDisabled = $derived(lockControls);

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

function handlePauseResume() {
  if (machine.state === STATE.PAUSED) {
    machine.transition(EVENT.USER_RESUME, { fps: parseInt(fpsValue, 10) });
  } else {
    machine.transition(EVENT.USER_PAUSE);
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

  if (hasGetDisplayMedia()) {
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
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
});

$effect(() => {
  const micGain = parseFloat(micGainValue);
  const sysGain = parseFloat(sysGainValue);

  savePref(PREFS.micGain, micGainValue);
  savePref(PREFS.sysGain, sysGainValue);

  if (audioMixer) {
    audioMixer.setMicGain(micGain);
    audioMixer.setSysGain(sysGain);
  }
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
            <span id="timer-text" class="font-monospace text-muted small">{timerText}</span>
          </span>
        </div>
          <div class="canvas-wrap">
            <canvas id="recorder-canvas" width="1280" height="720" bind:this={canvas}></canvas>
          <div id="countdown-overlay" hidden aria-live="assertive" aria-atomic="true" bind:this={countdownOverlay}>
            <span id="countdown-number" bind:this={countdownNumberEl}></span>
            </div>
          </div>
        <div class="mt-3 d-flex gap-2 flex-wrap">
          {#if showStartBtn}
            <button id="start-btn" class="btn btn-info text-white" disabled={startBtnDisabled} onclick={startRecording}>
              <i class="fas fa-circle me-1"></i>Start Recording
            </button>
          {/if}
          {#if showPauseBtn}
            <button id="pause-btn" class={pauseBtnClass} disabled={pauseBtnDisabled} onclick={handlePauseResume}>
              <i class="fas {pauseBtnIcon} me-1"></i>{pauseBtnText}
            </button>
          {/if}
          {#if showStopBtn}
            <button id="stop-btn" class="btn btn-danger" disabled={stopBtnDisabled} onclick={() => machine.transition(EVENT.USER_STOP)}>
              <i class="fas fa-stop me-1"></i>Stop
            </button>
          {/if}
          {#if showCancelCountdownBtn}
            <button id="cancel-countdown-btn" class="btn btn-secondary" onclick={() => machine.transition(EVENT.COUNTDOWN_CANCEL)}>
              <i class="fas fa-times me-1"></i>Cancel
            </button>
          {/if}
          {#if showEndSessionBtn}
            <button id="end-session-btn" class="btn btn-outline-warning" disabled={endSessionBtnDisabled} onclick={() => machine.transition(EVENT.END_SESSION)}>
              <i class="fas fa-times-circle me-1"></i>End Session
            </button>
          {/if}
        </div>

        <!-- Save location -->
        <div class="mt-3 d-flex align-items-center gap-2">
          <span id="dir-name" class="text-muted small flex-grow-1 text-truncate">{dirName}</span>
          <button id="pick-dir-btn" class="btn btn-sm btn-outline-secondary flex-shrink-0" onclick={() => { storage.pickDirectory(); }} hidden={storage?.isOPFS} disabled={lockControls}>
            <i class="fas fa-folder-open me-1"></i>Choose Folder
          </button>
        </div>

        <!-- Audio Mix -->
        <div class="mt-3">
          <h6 class="mb-2">Audio Mix</h6>

          <div class="mb-2">
            <div class="d-flex align-items-center justify-content-between mb-1">
              <label class="form-label text-muted small mb-0" for="mic-gain-slider">
                <i class="fas fa-microphone me-1"></i>Mic level
              </label>
              <span id="mic-gain-label" class="text-muted small font-monospace">{micGainLabelValue}</span>
            </div>
            <input type="range" class="form-range" id="mic-gain-slider" min="0" max="2" step="0.01" bind:value={micGainValue}>
            <canvas id="mic-level-canvas" class="audio-meter mt-1" width="200" height="10" bind:this={micLevelCanvas}></canvas>
          </div>

          <div class="mb-2">
            <div class="d-flex align-items-center justify-content-between mb-1">
              <label class="form-label text-muted small mb-0" for="sys-gain-slider">
                <i class="fas fa-desktop me-1"></i>System level
              </label>
              <span id="sys-gain-label" class="text-muted small font-monospace">{sysGainLabelValue}</span>
            </div>
            <input type="range" class="form-range" id="sys-gain-slider" min="0" max="2" step="0.01" bind:value={sysGainValue}>
            <canvas id="sys-level-canvas" class="audio-meter mt-1" width="200" height="10" bind:this={sysLevelCanvas}></canvas>
          </div>
        </div>

      </div>

      <!-- Right: settings -->
      <div class="col-lg-4">

        <!-- Audio / Video sources -->
        <h6 class="mb-3">
          Sources
          {#if !micDisabled}
            <button title="Refresh" class="btn" onclick={enumerateDevices}><i class="fas fa-refresh"></i></button>
          {/if}
        </h6>

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

        <div class="mb-3 form-check form-switch">
          <input class="form-check-input" type="checkbox" id="sys-audio-chk" bind:checked={sysAudioChecked} disabled={sysAudioDisabled}>
          <label class="form-check-label small" for="sys-audio-chk">Capture system audio</label>
        </div>

        <hr>

        <!-- Quality -->
        <h6 class="mb-3">Quality</h6>

        <div class="mb-3">
          <label class="form-label text-muted small mb-1" for="fps-select">Frame rate</label>
          <select id="fps-select" class="form-select form-select-sm" bind:value={fpsValue} disabled={fpsDisabled}>
            <option value="15">15 fps</option>
            <option value="30">30 fps</option>
            <option value="60">60 fps</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label text-muted small mb-1" for="quality-select">Quality preset</label>
          <select id="quality-select" class="form-select form-select-sm" bind:value={qualityValue} disabled={qualityDisabled}>
            <option value="480">480p — ~2 Mbps</option>
            <option value="720">720p — ~4 Mbps</option>
            <option value="1080">1080p — ~8 Mbps</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label text-muted small mb-1" for="format-select">Recording format</label>
          <select id="format-select" class="form-select form-select-sm" bind:value={formatValue}>
            <option value="webm-vp9-opus">WebM — VP9 + Opus</option>
            <option value="mp4-h264-aac">MP4 — H.264 + AAC</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label text-muted small mb-1" for="countdown-select">Countdown timer</label>
          <select id="countdown-select" class="form-select form-select-sm" bind:value={countdownValue} disabled={countdownDisabled}>
            <option value="0">Off</option>
            <option value="3">3 seconds</option>
            <option value="5">5 seconds</option>
            <option value="10">10 seconds</option>
          </select>
        </div>

      </div>
    </div><!-- /.row -->

  </div><!-- /.card-body -->
</div><!-- /.card -->