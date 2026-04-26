<script lang="ts">
import { AudioMixer }                          from '../../scripts/tools/captura/audio-mixer';
import { Compositor }                          from '../../scripts/tools/captura/compositor';
import { Metronome }                           from '../../scripts/tools/captura/metronome';
import { StorageManager }                      from '../../scripts/tools/captura/storage';
import { RecorderCore }                        from '../../scripts/tools/captura/recorder-core';
import { PREFS, savePref, loadPref }           from '../../scripts/tools/captura/prefs';
import { showAlert, showToast, showErrorDialog } from '../../scripts/tools/captura/dialogs';
import { setupMediaSession, clearMediaSession }  from '../../scripts/tools/captura/media-session';
import { RecorderAPI }                         from '../../scripts/tools/captura/recorder-api';
import { RecorderStateMachine, STATE, EVENT, type State, type Event }  from '../../scripts/tools/captura/recorder-state-machine';
import { trackEvent }                          from '../../scripts/tools/captura/analytics';
import { onMount } from 'svelte';

const BLOB_URL_REVOKE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const gainPct = (v: string | number) => Math.round(parseFloat(String(v)) * 100) + '%';
const fmtTime = (s: number) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

let canvas: HTMLCanvasElement;
let webcamSel: HTMLSelectElement;
let micSel: HTMLSelectElement;
let fpsSel: HTMLSelectElement;
let qualitySel: HTMLSelectElement;
let formatSel: HTMLSelectElement;
let countdownSel: HTMLSelectElement;
let sysAudioChk: HTMLInputElement;
let startBtn: HTMLButtonElement;
let pauseBtn: HTMLButtonElement;
let stopBtn: HTMLButtonElement;
let cancelCountdownBtn: HTMLButtonElement;
let endSessionBtn: HTMLButtonElement;
let pickDirBtn: HTMLButtonElement;
let dirNameEl: HTMLElement;
let statusBadge: HTMLElement;
let timerEl: HTMLElement;
let micGainSlider: HTMLInputElement;
let sysGainSlider: HTMLInputElement;
let micGainLabel: HTMLElement;
let sysGainLabel: HTMLElement;
let micLevelCanvas: HTMLCanvasElement;
let sysLevelCanvas: HTMLCanvasElement;
let errorDialog: HTMLDialogElement;
let countdownOverlay: HTMLElement;
let countdownNumberEl: HTMLElement;

let elapsedSecs     = 0;
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
function hasFSA() {
  return typeof window.showDirectoryPicker === 'function';
}

function startTimer() {
  if (timerIntervalId !== null) clearInterval(timerIntervalId);
  elapsedSecs = 0;
  timerEl.textContent = '00:00';
  timerIntervalId = setInterval(() => { timerEl.textContent = fmtTime(++elapsedSecs); }, 1000);
}

function pauseTimer() {
  if (timerIntervalId !== null) clearInterval(timerIntervalId);
  timerIntervalId = null;
}

function resumeTimer() {
  if (timerIntervalId === null) {
    timerIntervalId = setInterval(() => { timerEl.textContent = fmtTime(++elapsedSecs); }, 1000);
  }
}

function resetTimer() {
  if (timerIntervalId !== null) clearInterval(timerIntervalId);
  timerIntervalId = null;
  elapsedSecs = 0;
  timerEl.textContent = '00:00';
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

function render(state: string): void {
  const isSession    = state === STATE.SESSION;
  const isReq        = state === STATE.REQUESTING;
  const isCountdown  = state === STATE.COUNTDOWN;
  const isRec        = state === STATE.RECORDING;
  const isPaused     = state === STATE.PAUSED;
  const isStopping   = state === STATE.STOPPING;
  const isError      = state === STATE.ERROR;
  const active       = isRec || isPaused;
  const hasSession   = isSession || active || isStopping || isCountdown;

  startBtn.hidden   = active || isStopping || isCountdown;
  startBtn.disabled = isReq;

  pauseBtn.hidden    = !active;
  pauseBtn.disabled  = false;
  pauseBtn.innerHTML = isPaused
    ? '<i class="fas fa-play me-1"></i>Resume'
    : '<i class="fas fa-pause me-1"></i>Pause';
  pauseBtn.className = isPaused ? 'btn btn-success' : 'btn btn-warning text-dark';

  stopBtn.hidden   = !active;
  stopBtn.disabled = false;

  cancelCountdownBtn.hidden = !isCountdown;

  endSessionBtn.hidden   = !hasSession || isCountdown;
  endSessionBtn.disabled = isStopping || isReq;

  const lockControls = active || isStopping || isReq || isCountdown;
  pickDirBtn.hidden    = storage.isOPFS;
  pickDirBtn.disabled  = lockControls;
  webcamSel.disabled     = isStopping || isReq || isCountdown;
  micSel.disabled        = lockControls;
  sysAudioChk.disabled   = lockControls;
  fpsSel.disabled        = lockControls;
  qualitySel.disabled    = lockControls;
  countdownSel.disabled  = lockControls;

  statusBadge.textContent =
      isRec       ? '⏺ Recording'
    : isPaused    ? '⏸ Paused'
    : isReq       ? '⏳ Acquiring…'
    : isCountdown ? '⏱ Starting…'
    : isStopping  ? '⏳ Saving…'
    : isSession   ? '◉ Session Active'
    : isError     ? '⚠ Error'
    :               'Idle';

  statusBadge.className =
      isRec                    ? 'badge bg-danger'
    : isPaused || isStopping   ? 'badge bg-warning text-dark'
    : isSession || isCountdown ? 'badge bg-warning text-dark'
    : isError                  ? 'badge bg-danger'
    :                            'badge bg-secondary';
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

function onStateChanged(state: State, event: Event, payload: unknown): void {
  const p = payload as MachinePayload;
  render(state);
  if (state === STATE.RECORDING) {
    if (event === EVENT.COUNTDOWN_DONE) {
      trackEvent('captura_recording_start', {
        fps:        p?.fps,
        quality:    p?.quality,
        format:     p?.format,
        has_webcam: p?.webcamSelected,
        has_mic:    p?.micSelected,
        sys_audio:  p?.wantSysAudio,
      });
    } else if (event === EVENT.USER_RESUME) {
      trackEvent('captura_recording_resume', { elapsed_secs: elapsedSecs });
    }
  } else if (state === STATE.PAUSED) {
    trackEvent('captura_recording_pause', { elapsed_secs: elapsedSecs });
  } else if (state === STATE.STOPPING) {
    trackEvent('captura_recording_stop', { elapsed_secs: elapsedSecs, format: formatSel.value });
  } else if (state === STATE.IDLE && event === EVENT.END_SESSION) {
    trackEvent('captura_session_end');
  }

    if (event === EVENT.STREAMS_FAILED) {
    trackEvent('captura_stream_failed', { error_name: p?.name ?? 'unknown' });
  } else if (state === STATE.ERROR) {
    trackEvent('captura_error', { error_message: p?.message ?? String(payload ?? '') });
  }

  if (event === EVENT.FINALIZE_DONE && payload) {
    trackEvent('captura_recording_saved', { format: formatSel.value });
  }

  if (state === STATE.COUNTDOWN) {
    const savedPayload = payload;
    startCountdownOverlay(
      parseInt(countdownSel.value, 10),
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

  if (state === STATE.RECORDING) {
    if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';
    setupMediaSession(
      () => machine.transition(EVENT.USER_RESUME, { fps: parseInt(fpsSel.value, 10) }),
      () => machine.transition(EVENT.USER_PAUSE),
      () => machine.transition(EVENT.USER_STOP),
    );
  } else if (state === STATE.PAUSED) {
    if (navigator.mediaSession) navigator.mediaSession.playbackState = 'paused';
  } else {
    if (navigator.mediaSession) navigator.mediaSession.playbackState = 'none';
    clearMediaSession();
  }

  if (event === EVENT.FINALIZE_DONE && payload) {
    showSaveSuccessToast(payload as any);
  }

  if (state === STATE.ERROR) {
    showErrorDialog(
      p?.title   || 'Recording Error',
      p?.message || String(payload ?? 'An unknown error occurred.')
    );
  }

  if (state === STATE.IDLE || state === STATE.SESSION) {
    syncDevicesToApi();
  }
}

function syncDevicesToApi(): void {
  api.setDevices({
    webcamDeviceId: webcamSel.value,
    webcamSelected: webcamSel.selectedIndex > 0,
    micDeviceId:    micSel.value,
    micSelected:    micSel.selectedIndex > 0,
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
    fps:           fpsSel.value,
    quality:       qualitySel.value,
    format:        formatSel.value,
    wantSysAudio:  sysAudioChk.checked,
    webcamSelected: webcamSel.selectedIndex > 0,
    webcamDeviceId: webcamSel.value,
    micSelected:   micSel.selectedIndex > 0,
    micDeviceId:   micSel.value,
    micGain:       parseFloat(micGainSlider.value),
    sysGain:       parseFloat(sysGainSlider.value),
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
    const devices   = await navigator.mediaDevices.enumerateDevices();
    const videoDevs = devices.filter(d => d.kind === 'videoinput');
    const audioDevs = devices.filter(d => d.kind === 'audioinput');

    webcamSel.innerHTML = '<option value="">None</option>';
    videoDevs.forEach((d, i) => webcamSel.add(new Option(d.label || `Camera ${i + 1}`, d.deviceId)));

    micSel.innerHTML = '<option value="">None</option>';
    audioDevs.forEach((d, i) => micSel.add(new Option(d.label || `Microphone ${i + 1}`, d.deviceId)));

    restoreDevicePrefs();

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
  const fps = loadPref(PREFS.fps);
  if (fps) fpsSel.value = fps;

  const quality = loadPref(PREFS.quality);
  if (quality) qualitySel.value = quality;

  const format = loadPref(PREFS.format);
  if (format) formatSel.value = format;

  const sysAudio = loadPref(PREFS.sysAudio);
  if (sysAudio !== null) sysAudioChk.checked = sysAudio === 'true';

  const storedPipX = loadPref(PREFS.pipX);
  const storedPipY = loadPref(PREFS.pipY);
  if (storedPipX !== null && storedPipY !== null) {
    compositor.pipX = parseFloat(storedPipX);
    compositor.pipY = parseFloat(storedPipY);
  }

  const micGain = loadPref(PREFS.micGain);
  if (micGain !== null) {
    micGainSlider.value      = micGain;
    micGainLabel.textContent = gainPct(micGain);
  }

  const sysGain = loadPref(PREFS.sysGain);
  if (sysGain !== null) {
    sysGainSlider.value      = sysGain;
    sysGainLabel.textContent = gainPct(sysGain);
  }

  const countdown = loadPref(PREFS.countdown);
  if (countdown !== null && countdownSel.querySelector(`option[value="${CSS.escape(countdown)}"]`)) {
    countdownSel.value = countdown;
  }
}

function restoreDevicePrefs(): void {
  const webcamId = loadPref(PREFS.webcam);
  if (webcamId && webcamSel.querySelector(`option[value="${CSS.escape(webcamId)}"]`)) {
    webcamSel.value = webcamId;
  }
  const micId = loadPref(PREFS.mic);
  if (micId && micSel.querySelector(`option[value="${CSS.escape(micId)}"]`)) {
    micSel.value = micId;
  }
}

function saveAndTrackPref(key: string, value: string | number | boolean, analyticsKey?: string): void {
  savePref(key, String(value));
  trackEvent('captura_pref_change', { pref: analyticsKey, value: String(value) });
}

onMount(() => {
  compositor = new Compositor(canvas, {
    onPipMoved: (x: number, y: number) => { savePref(PREFS.pipX, String(x)); savePref(PREFS.pipY, String(y)); },
  });
  audioMixer   = new AudioMixer(micLevelCanvas, sysLevelCanvas);
  storage      = new StorageManager(dirNameEl, showErrorDialog);
  api = new RecorderAPI({
    compositor, audioMixer, metronome, recorderCore, storage, canvas,
  });

  machine = new RecorderStateMachine(api);
  machine.onStateChange(onStateChanged);

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

  trackEvent('captura_page_view', {
    has_screen_capture:  hasGetDisplayMedia(),
    has_file_system_api: hasFSA(),
  });

  if (hasGetDisplayMedia()) {
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
    enumerateDevices();
  }

  api.restartPreviews();

  storage.init();

  pickDirBtn.hidden = storage.isOPFS;

  startBtn.addEventListener('click', () => {
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
  });

  pauseBtn.addEventListener('click', () => {
    if (machine.state === STATE.PAUSED) {
      machine.transition(EVENT.USER_RESUME, { fps: parseInt(fpsSel.value, 10) });
    } else {
      machine.transition(EVENT.USER_PAUSE);
    }
  });

  stopBtn.addEventListener('click', () => machine.transition(EVENT.USER_STOP));

  cancelCountdownBtn.addEventListener('click', () => machine.transition(EVENT.COUNTDOWN_CANCEL));

  endSessionBtn.addEventListener('click', () => machine.transition(EVENT.END_SESSION));

  pickDirBtn.addEventListener('click', () => {
    trackEvent('captura_folder_pick');
    storage.pickDirectory();
  });

  errorDialog?.addEventListener('close', () => {
    if (machine.state === STATE.ERROR) {
      machine.transition(EVENT.ERROR_DISMISSED);
    }
  });

  fpsSel      .addEventListener('change', () => saveAndTrackPref(PREFS.fps,       fpsSel.value,          'fps'));
  qualitySel  .addEventListener('change', () => saveAndTrackPref(PREFS.quality,   qualitySel.value,      'quality'));
  formatSel   .addEventListener('change', () => saveAndTrackPref(PREFS.format,    formatSel.value,       'format'));
  sysAudioChk .addEventListener('change', () => saveAndTrackPref(PREFS.sysAudio,  sysAudioChk.checked,   'sys_audio'));
  countdownSel.addEventListener('change', () => saveAndTrackPref(PREFS.countdown, countdownSel.value,    'countdown'));

  webcamSel.addEventListener('change', () => {
    savePref(PREFS.webcam, webcamSel.value);
    const s = machine.state;
    if (s === STATE.RECORDING || s === STATE.PAUSED) {
        api.changeWebcam(webcamSel.value, webcamSel.selectedIndex > 0)
          .catch(err => { const e = err as { message?: string } | undefined; showToast('Failed to switch webcam: ' + (e?.message ?? String(err)), 'danger'); });
    } else if (s !== STATE.STOPPING) {
      syncDevicesToApi();
      api.restartPreviews();
    }
  });

  micSel.addEventListener('change', () => {
    savePref(PREFS.mic, micSel.value);
    const s = machine.state;
    if (s !== STATE.RECORDING && s !== STATE.PAUSED && s !== STATE.STOPPING) {
      syncDevicesToApi();
      api.restartPreviews();
    }
  });

  micGainSlider.addEventListener('input', () => {
    const v = parseFloat(micGainSlider.value);
    micGainLabel.textContent = gainPct(v);
    audioMixer.setMicGain(v);
    savePref(PREFS.micGain, String(v));
  });

  sysGainSlider.addEventListener('input', () => {
    const v = parseFloat(sysGainSlider.value);
    sysGainLabel.textContent = gainPct(v);
    audioMixer.setSysGain(v);
    savePref(PREFS.sysGain, String(v));
  });

  window.addEventListener('beforeunload', (e) => {
    const s = machine.state;
    if (s === STATE.RECORDING || s === STATE.PAUSED ||
        s === STATE.STOPPING  || s === STATE.COUNTDOWN) {
      e.preventDefault();
    }
  });
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
            <span id="status-badge" class="badge bg-secondary" bind:this={statusBadge}>Idle</span>
            <span id="timer-text" class="font-monospace text-muted small" bind:this={timerEl}>00:00</span>
          </span>
        </div>
        <div class="canvas-wrap">
          <canvas id="recorder-canvas" width="1280" height="720" bind:this={canvas}></canvas>
          <div id="countdown-overlay" hidden aria-live="assertive" aria-atomic="true" bind:this={countdownOverlay}>
            <span id="countdown-number" bind:this={countdownNumberEl}></span>
          </div>
        </div>
        <div class="mt-3 d-flex gap-2 flex-wrap">
          <button id="start-btn" class="btn btn-info text-white" bind:this={startBtn}>
            <i class="fas fa-circle me-1"></i>Start Recording
          </button>
          <button id="pause-btn" class="btn btn-warning text-dark" hidden bind:this={pauseBtn}>
            <i class="fas fa-pause me-1"></i>Pause
          </button>
          <button id="stop-btn" class="btn btn-danger" hidden bind:this={stopBtn}>
            <i class="fas fa-stop me-1"></i>Stop
          </button>
          <button id="cancel-countdown-btn" class="btn btn-secondary" hidden bind:this={cancelCountdownBtn}>
            <i class="fas fa-times me-1"></i>Cancel
          </button>
          <button id="end-session-btn" class="btn btn-outline-warning" hidden bind:this={endSessionBtn}>
            <i class="fas fa-times-circle me-1"></i>End Session
          </button>
        </div>

        <!-- Save location -->
        <div class="mt-3 d-flex align-items-center gap-2">
          <span id="dir-name" class="text-muted small flex-grow-1 text-truncate" bind:this={dirNameEl}>(no folder selected)</span>
          <button id="pick-dir-btn" class="btn btn-sm btn-outline-secondary flex-shrink-0" bind:this={pickDirBtn}>
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
              <span id="mic-gain-label" class="text-muted small font-monospace" bind:this={micGainLabel}>100%</span>
            </div>
            <input type="range" class="form-range" id="mic-gain-slider" min="0" max="2" step="0.01" value="1" bind:this={micGainSlider}>
            <canvas id="mic-level-canvas" class="audio-meter mt-1" width="200" height="10" bind:this={micLevelCanvas}></canvas>
          </div>

          <div class="mb-2">
            <div class="d-flex align-items-center justify-content-between mb-1">
              <label class="form-label text-muted small mb-0" for="sys-gain-slider">
                <i class="fas fa-desktop me-1"></i>System level
              </label>
              <span id="sys-gain-label" class="text-muted small font-monospace" bind:this={sysGainLabel}>100%</span>
            </div>
            <input type="range" class="form-range" id="sys-gain-slider" min="0" max="2" step="0.01" value="1" bind:this={sysGainSlider}>
            <canvas id="sys-level-canvas" class="audio-meter mt-1" width="200" height="10" bind:this={sysLevelCanvas}></canvas>
          </div>
        </div>

      </div>

      <!-- Right: settings -->
      <div class="col-lg-4">

        <!-- Audio / Video sources -->
        <h6 class="mb-3">Sources</h6>

        <div class="mb-3">
          <label class="form-label text-muted small mb-1" for="webcam-select">
            <i class="fas fa-video me-1"></i>Webcam overlay
          </label>
          <select id="webcam-select" class="form-select form-select-sm" bind:this={webcamSel}>
            <option value="">None</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label text-muted small mb-1" for="mic-select">
            <i class="fas fa-microphone me-1"></i>Microphone
          </label>
          <select id="mic-select" class="form-select form-select-sm" bind:this={micSel}>
            <option value="">None</option>
          </select>
        </div>

        <div class="mb-3 form-check form-switch">
          <input class="form-check-input" type="checkbox" id="sys-audio-chk" bind:this={sysAudioChk}>
          <label class="form-check-label small" for="sys-audio-chk">Capture system audio</label>
        </div>

        <hr>

        <!-- Quality -->
        <h6 class="mb-3">Quality</h6>

        <div class="mb-3">
          <label class="form-label text-muted small mb-1" for="fps-select">Frame rate</label>
          <select id="fps-select" class="form-select form-select-sm" bind:this={fpsSel}>
            <option value="15">15 fps</option>
            <option value="30" selected>30 fps</option>
            <option value="60">60 fps</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label text-muted small mb-1" for="quality-select">Quality preset</label>
          <select id="quality-select" class="form-select form-select-sm" bind:this={qualitySel}>
            <option value="480">480p — ~2 Mbps</option>
            <option value="720" selected>720p — ~4 Mbps</option>
            <option value="1080">1080p — ~8 Mbps</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label text-muted small mb-1" for="format-select">Recording format</label>
          <select id="format-select" class="form-select form-select-sm" bind:this={formatSel}>
            <option value="webm-vp9-opus" selected>WebM — VP9 + Opus</option>
            <option value="mp4-h264-aac">MP4 — H.264 + AAC</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label text-muted small mb-1" for="countdown-select">Countdown timer</label>
          <select id="countdown-select" class="form-select form-select-sm" bind:this={countdownSel}>
            <option value="0">Off</option>
            <option value="3" selected>3 seconds</option>
            <option value="5">5 seconds</option>
            <option value="10">10 seconds</option>
          </select>
        </div>

      </div>
    </div><!-- /.row -->

  </div><!-- /.card-body -->
</div><!-- /.card -->