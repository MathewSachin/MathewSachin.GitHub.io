// ── app.js ────────────────────────────────────────────────────────────────────
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
import { registerServiceWorker }               from './register-service-worker.js';
import { RecorderAPI }                         from './recorder-api.js';
import { RecorderStateMachine, STATE, EVENT }  from './recorder-state-machine.js';
import { trackEvent }                          from './analytics.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const BLOB_URL_REVOKE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ── Formatters ─────────────────────────────────────────────────────────────────

// Format a gain multiplier (0–2) as a percentage string, e.g. 1.0 → '100%', 0.5 → '50%'.
const gainPct = v => Math.round(parseFloat(v) * 100) + '%';

// Format elapsed seconds as MM:SS, e.g. 65 → '01:05'.
const fmtTime = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

// ── DOM refs ───────────────────────────────────────────────────────────────────

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

// ── Capability checks ──────────────────────────────────────────────────────────

const hasGetDisplayMedia = !!(navigator.mediaDevices?.getDisplayMedia);
const hasFSA = typeof window.showDirectoryPicker === 'function';

// ── Engine instances ───────────────────────────────────────────────────────────

const compositor = new Compositor(canvas, {
  onPipMoved: (x, y) => { savePref(PREFS.pipX, x); savePref(PREFS.pipY, y); },
});

const metronome    = new Metronome();
const audioMixer   = new AudioMixer(micLevelCanvas, sysLevelCanvas);
const storage      = new StorageManager(dirNameEl, showErrorDialog);
const recorderCore = new RecorderCore();

// ── API + state machine ────────────────────────────────────────────────────────

const api = new RecorderAPI({
  compositor, audioMixer, metronome, recorderCore, storage, canvas,
});

const machine = new RecorderStateMachine(api);

// ── Timer state ────────────────────────────────────────────────────────────────

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

// ── Countdown overlay state ────────────────────────────────────────────────────

let countdownIntervalId = null;

// Shows the overlay, ticks every second, and fires onDone() when it reaches 0.
// If secs === 0 the overlay is never shown and onDone() fires synchronously.
function startCountdownOverlay(secs, onDone) {
  stopCountdownOverlay();

  if (secs <= 0) {
    onDone();
    return;
  }

  countdownNumberEl.textContent = secs;
  // Force a re-trigger of the CSS pop animation on each tick by removing and
  // re-adding the element's text node (which causes a reflow / re-paint).
  countdownOverlay.hidden = false;

  let remaining = secs;
  countdownIntervalId = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      stopCountdownOverlay();
      onDone();
    } else {
      // Re-trigger the pop animation by forcing a reflow between style changes.
      countdownNumberEl.textContent = remaining;
      countdownNumberEl.style.animation = 'none';
      void countdownNumberEl.offsetWidth; // trigger reflow
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

// ── UI rendering ───────────────────────────────────────────────────────────────

// Single source of truth for every button, badge, and control state.
// Called on every state machine transition.
function render(state) {
  const isIdle       = state === STATE.IDLE;
  const isSession    = state === STATE.SESSION;
  const isReq        = state === STATE.REQUESTING;
  const isCountdown  = state === STATE.COUNTDOWN;
  const isRec        = state === STATE.RECORDING;
  const isPaused     = state === STATE.PAUSED;
  const isStopping   = state === STATE.STOPPING;
  const isError      = state === STATE.ERROR;
  const active       = isRec || isPaused;                       // recording or paused
  const hasSession   = isSession || active || isStopping || isCountdown; // screen shared

  // ── Recording control buttons ──────────────────────────────────────────────

  // Start: shown when not actively recording/paused/stopping/countdown
  startBtn.hidden   = active || isStopping || isCountdown;
  startBtn.disabled = isReq;

  // Pause/Resume: shown only while active
  pauseBtn.hidden    = !active;
  pauseBtn.disabled  = false;
  pauseBtn.innerHTML = isPaused
    ? '<i class="fas fa-play me-1"></i>Resume'
    : '<i class="fas fa-pause me-1"></i>Pause';
  pauseBtn.className = isPaused ? 'btn btn-success' : 'btn btn-warning text-dark';

  // Stop: shown only while active
  stopBtn.hidden   = !active;
  stopBtn.disabled = false;

  // Cancel Countdown: shown only during countdown
  cancelCountdownBtn.hidden = !isCountdown;

  // End Session: shown whenever a screen-share session is alive
  endSessionBtn.hidden   = !hasSession || isCountdown;
  endSessionBtn.disabled = isStopping || isReq;

  // ── Folder / settings controls ─────────────────────────────────────────────

  // Locked while recording is active, being saved, acquiring, or in countdown
  const lockControls = active || isStopping || isReq || isCountdown;
  pickDirBtn.hidden    = storage.isOPFS;
  pickDirBtn.disabled  = lockControls;
  webcamSel.disabled     = lockControls;
  micSel.disabled        = lockControls;
  sysAudioChk.disabled   = lockControls;
  fpsSel.disabled        = lockControls;
  qualitySel.disabled    = lockControls;
  countdownSel.disabled  = lockControls;

  // ── Status badge ───────────────────────────────────────────────────────────

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

// ── State-change handler ───────────────────────────────────────────────────────

machine.onStateChange((state, event, payload) => {
  render(state);

  // ── Analytics ─────────────────────────────────────────────────────────────
  // Capture elapsedSecs before resetTimer() zeroes it below.
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

  // ── Countdown overlay ──────────────────────────────────────────────────────
  if (state === STATE.COUNTDOWN) {
    // payload carries the full start config (fps, quality, etc.) forwarded from
    // ENCODER_READY — pass it through so COUNTDOWN_DONE has it for startEncoding.
    const savedPayload = payload;
    startCountdownOverlay(
      parseInt(countdownSel.value, 10),
      () => machine.transition(EVENT.COUNTDOWN_DONE, savedPayload)
    );
  } else {
    // Entering any other state (RECORDING, SESSION, IDLE, ERROR…) clears overlay.
    stopCountdownOverlay();
  }

  // ── Timer ──────────────────────────────────────────────────────────────────
  if (state === STATE.RECORDING) {
    // USER_RESUME continues the existing elapsed count; everything else resets.
    if (event === EVENT.USER_RESUME) resumeTimer();
    else startTimer();
  } else if (state === STATE.PAUSED) {
    pauseTimer();
  } else {
    // STOPPING, IDLE, SESSION, COUNTDOWN, ERROR — reset the display
    resetTimer();
  }

  // ── OS Media Session ───────────────────────────────────────────────────────
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

  // ── Success toast after a recording is saved ───────────────────────────────
  if (event === EVENT.FINALIZE_DONE && payload) {
    showSaveSuccessToast(payload);
  }

  // ── Error dialog ───────────────────────────────────────────────────────────
  if (state === STATE.ERROR) {
    showErrorDialog(
      payload?.title   || 'Recording Error',
      payload?.message || String(payload ?? 'An unknown error occurred.')
    );
  }

  // ── Keep stored device IDs in sync after non-recording state changes ───────
  if (state === STATE.IDLE || state === STATE.SESSION) {
    syncDevicesToApi();
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function syncDevicesToApi() {
  api.setDevices({
    webcamDeviceId: webcamSel.value,
    webcamSelected: webcamSel.selectedIndex > 0,
    micDeviceId:    micSel.value,
    micSelected:    micSel.selectedIndex > 0,
  });
}

// Build the config payload for USER_START, reading current UI values.
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
    // OPFS mode: the recording was staged in browser storage.
    // Show a "Download recording" link and keep the toast open until the user
    // dismisses it — Firefox requires a real user click to trigger a file download,
    // so we cannot auto-fire the download programmatically.
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

        // Revoke the blob URL and clean up the OPFS temp file together after the
        // timeout so the file remains accessible for the entire duration.
        // Do NOT call removeEntry() before this — Firefox's blob URL keeps a live
        // reference to the OPFS-backed File and becomes invalid if the entry is
        // removed while the URL is still alive.
        const cleanup = () => {
          URL.revokeObjectURL(url);
          storage.dirHandle?.removeEntry(name).catch(() => {});
        };
        setTimeout(cleanup, BLOB_URL_REVOKE_TIMEOUT_MS);
        window.addEventListener('beforeunload', cleanup, { once: true });
      } catch (_) {
        // getFile() may fail if something went wrong; skip the download link.
      }
    }
    // Disable auto-hide so the download link stays visible until the user acts.
    showToast(msg, 'success', false);
  } else {
    // FSA mode: file already saved to the user's chosen folder on disk.
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
        // getFile() may fail if the user moved/deleted the file; skip the link.
      }
    }
    showToast(msg, 'success');
  }
}

// ── Device enumeration ────────────────────────────────────────────────────────

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

    // Restart previews only when not actively recording
    const s = machine.state;
    if (s !== STATE.RECORDING && s !== STATE.PAUSED && s !== STATE.STOPPING) {
      syncDevicesToApi();
      api.restartPreviews();
    }
  } catch (err) {
    showErrorDialog('Device Error', 'Could not enumerate devices: ' + err.message);
  }
}

// ── Preferences ────────────────────────────────────────────────────────────────

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

// ── Bootstrap ──────────────────────────────────────────────────────────────────

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

// Start the canvas preview loop immediately (devices/webcam start after enumeration)
api.restartPreviews();

storage.init();

// isOPFS is determined synchronously at construction time; apply initial UI state now
// rather than waiting for init() to resolve so render() stays the single source of truth.
pickDirBtn.hidden = storage.isOPFS;

// ── Event listeners ────────────────────────────────────────────────────────────

// Recording controls → dispatch state machine events only; no logic inline.
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

// Error dialog close → return the machine to idle / session
errorDialog?.addEventListener('close', () => {
  if (machine.state === STATE.ERROR) {
    machine.transition(EVENT.ERROR_DISMISSED);
  }
});

// Persist configuration changes to localStorage
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
  if (s !== STATE.RECORDING && s !== STATE.PAUSED && s !== STATE.STOPPING) {
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

// ── Prevent navigation / tab-close during an active recording ─────────────────

window.addEventListener('beforeunload', (e) => {
  const s = machine.state;
  if (s === STATE.RECORDING || s === STATE.PAUSED ||
      s === STATE.STOPPING  || s === STATE.COUNTDOWN) {
    e.preventDefault();
    e.returnValue = ''; // Required by some browsers to trigger the dialog
  }
});

// ── PWA Service Worker Registration ───────────────────────────────────────────

registerServiceWorker();
