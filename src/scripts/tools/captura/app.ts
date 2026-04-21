// @ts-nocheck
// ── app.ts ────────────────────────────────────────────────────────────────────
// The UI layer.
// Responsibilities:
//   • Create engine instances and wire them into RecorderAPI + RecorderStateMachine.
//   • Render the correct button / badge / selector state for each machine state.
//   • Dispatch state machine events from user interactions.
//   • Manage the elapsed-time timer and OS media session.
//   • Enumerate devices, manage preferences, and bootstrap the page.

import { AudioMixer }                          from './audio-mixer.js';
import { Compositor }                          from './compositor.js';
import { Metronome }                           from './metronome.js';
import { StorageManager }                      from './storage.js';
import { RecorderCore }                        from './recorder-core.js';
import { PREFS, savePref, loadPref }           from './prefs.js';
import { showAlert, showToast, showErrorDialog } from './dialogs.js';
import { setupMediaSession, clearMediaSession }  from './media-session.js';
import { RecorderAPI }                         from './recorder-api.js';
import { RecorderStateMachine, STATE, EVENT }  from './recorder-state-machine.js';
import { trackEvent }                          from './analytics.js';

const BLOB_URL_REVOKE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const gainPct = v => Math.round(parseFloat(v) * 100) + '%';
const fmtTime = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

const canvas              = document.getElementById('recorder-canvas');
const webcamSel           = document.getElementById('webcam-select');
const micSel              = document.getElementById('mic-select');
const fpsSel              = document.getElementById('fps-select');
const qualitySel          = document.getElementById('quality-select');
const formatSel           = document.getElementById('format-select');
const countdownSel        = document.getElementById('countdown-select');
const sysAudioChk         = document.getElementById('sys-audio-chk');
const startBtn            = document.getElementById('start-btn');
const pauseBtn            = document.getElementById('pause-btn');
const stopBtn             = document.getElementById('stop-btn');
const cancelCountdownBtn  = document.getElementById('cancel-countdown-btn');
const endSessionBtn       = document.getElementById('end-session-btn');
const pickDirBtn          = document.getElementById('pick-dir-btn');
const dirNameEl           = document.getElementById('dir-name');
const statusBadge         = document.getElementById('status-badge');
const timerEl             = document.getElementById('timer-text');
const micGainSlider       = document.getElementById('mic-gain-slider');
const sysGainSlider       = document.getElementById('sys-gain-slider');
const micGainLabel        = document.getElementById('mic-gain-label');
const sysGainLabel        = document.getElementById('sys-gain-label');
const micLevelCanvas      = document.getElementById('mic-level-canvas');
const sysLevelCanvas      = document.getElementById('sys-level-canvas');
const errorDialog         = document.getElementById('captura-error-dialog');
const countdownOverlay    = document.getElementById('countdown-overlay');
const countdownNumberEl   = document.getElementById('countdown-number');

const hasGetDisplayMedia = !!(navigator.mediaDevices?.getDisplayMedia);
const hasFSA = typeof window.showDirectoryPicker === 'function';

const compositor = new Compositor(canvas, {
  onPipMoved: (x, y) => { savePref(PREFS.pipX, x); savePref(PREFS.pipY, y); },
});

const metronome    = new Metronome();
const audioMixer   = new AudioMixer(micLevelCanvas, sysLevelCanvas);
const storage      = new StorageManager(dirNameEl, showErrorDialog);
const recorderCore = new RecorderCore();

const api = new RecorderAPI({
  compositor, audioMixer, metronome, recorderCore, storage, canvas,
});

const machine = new RecorderStateMachine(api);

let elapsedSecs     = 0;
let timerIntervalId = null;

function startTimer() {
  clearInterval(timerIntervalId);
  elapsedSecs = 0;
  timerEl.textContent = '00:00';
  timerIntervalId = setInterval(() => { timerEl.textContent = fmtTime(++elapsedSecs); }, 1000);
}

function pauseTimer() {
  clearInterval(timerIntervalId);
  timerIntervalId = null;
}

function resumeTimer() {
  if (!timerIntervalId) {
    timerIntervalId = setInterval(() => { timerEl.textContent = fmtTime(++elapsedSecs); }, 1000);
  }
}

function resetTimer() {
  clearInterval(timerIntervalId);
  timerIntervalId = null;
  elapsedSecs = 0;
  timerEl.textContent = '00:00';
}

let countdownIntervalId = null;

function startCountdownOverlay(secs, onDone) {
  stopCountdownOverlay();
  if (secs <= 0) {
    onDone();
    return;
  }
  countdownNumberEl.textContent = secs;
  countdownOverlay.hidden = false;
  let remaining = secs;
  countdownIntervalId = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      stopCountdownOverlay();
      onDone();
    } else {
      countdownNumberEl.textContent = remaining;
      countdownNumberEl.style.animation = 'none';
      void countdownNumberEl.offsetWidth;
      countdownNumberEl.style.animation = '';
    }
  }, 1000);
}

function stopCountdownOverlay() {
  clearInterval(countdownIntervalId);
  countdownIntervalId = null;
  countdownOverlay.hidden = true;
  countdownNumberEl.textContent = '';
}

function render(state) {
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

machine.onStateChange((state, event, payload) => {
  render(state);
  if (state === STATE.RECORDING) {
    if (event === EVENT.COUNTDOWN_DONE) {
      trackEvent('captura_recording_start', {
        fps:        payload?.fps,
        quality:    payload?.quality,
        format:     payload?.format,
        has_webcam: payload?.webcamSelected,
        has_mic:    payload?.micSelected,
        sys_audio:  payload?.wantSysAudio,
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
    trackEvent('captura_stream_failed', { error_name: payload?.name ?? 'unknown' });
  } else if (state === STATE.ERROR) {
    trackEvent('captura_error', { error_message: payload?.message ?? String(payload ?? '') });
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
    showSaveSuccessToast(payload);
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
});

function syncDevicesToApi() {
  api.setDevices({
    webcamDeviceId: webcamSel.value,
    webcamSelected: webcamSel.selectedIndex > 0,
    micDeviceId:    micSel.value,
    micSelected:    micSel.selectedIndex > 0,
  });
}

function buildStartPayload() {
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

async function showSaveSuccessToast(fileHandle) {
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

async function enumerateDevices() {
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
    showErrorDialog('Device Error', 'Could not enumerate devices: ' + err.message);
  }
}

function restoreSimplePrefs() {
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

function restoreDevicePrefs() {
  const webcamId = loadPref(PREFS.webcam);
  if (webcamId && webcamSel.querySelector(`option[value="${CSS.escape(webcamId)}"]`)) {
    webcamSel.value = webcamId;
  }
  const micId = loadPref(PREFS.mic);
  if (micId && micSel.querySelector(`option[value="${CSS.escape(micId)}"]`)) {
    micSel.value = micId;
  }
}

if (!hasGetDisplayMedia) {
  showAlert(
    'Screen recording is not supported on this device. ' +
    'Mobile browsers run inside a security sandbox that prevents access to the device screen — ' +
    'this is where native desktop apps still shine. ' +
    'Please open this page on a desktop browser (Chrome, Edge, or Firefox) to use the recorder.',
    'warning'
  );
  document.getElementById('recorder-ui').hidden = true;
}

restoreSimplePrefs();

trackEvent('captura_page_view', {
  has_screen_capture:  hasGetDisplayMedia,
  has_file_system_api: hasFSA,
});

if (hasGetDisplayMedia) {
  navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
  enumerateDevices();
}

api.restartPreviews();

storage.init();

pickDirBtn.hidden = storage.isOPFS;

startBtn.addEventListener('click', () => {
  if (!hasGetDisplayMedia) {
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

function saveAndTrackPref(key, value, analyticsKey) {
  savePref(key, value);
  trackEvent('captura_pref_change', { pref: analyticsKey, value: String(value) });
}

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
      .catch(err => showToast('Failed to switch webcam: ' + err.message, 'danger'));
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
  savePref(PREFS.micGain, v);
});

sysGainSlider.addEventListener('input', () => {
  const v = parseFloat(sysGainSlider.value);
  sysGainLabel.textContent = gainPct(v);
  audioMixer.setSysGain(v);
  savePref(PREFS.sysGain, v);
});

window.addEventListener('beforeunload', (e) => {
  const s = machine.state;
  if (s === STATE.RECORDING || s === STATE.PAUSED ||
      s === STATE.STOPPING  || s === STATE.COUNTDOWN) {
    e.preventDefault();
  }
});
