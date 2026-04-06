// ── app.js ────────────────────────────────────────────────────────────────────
// The Orchestrator: the only file that touches the DOM.
// Responsibilities:
//   • Own all document.getElementById() calls and event listener bindings.
//   • Import the five engine modules and wire them together.
//   • Drive the recording lifecycle: startRecording, pauseRecording,
//     resumeRecording, stopRecording, endSession, cleanup.
//   • Manage UI state, preferences, device enumeration, and Media Session.

import { AudioMixer }              from './audio-mixer.js';
import { Compositor }              from './compositor.js';
import { Metronome }               from './metronome.js';
import { StorageManager, dateStamp } from './storage.js';
import { RecorderCore }            from './recorder-core.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_WIDTH  = 1280;
const DEFAULT_HEIGHT = 720;
const FORMAT_MP4  = 'mp4-h264-aac';
const BLOB_URL_REVOKE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ── DOM refs ───────────────────────────────────────────────────────────────────

const canvas        = document.getElementById('recorder-canvas');
const webcamSel     = document.getElementById('webcam-select');
const micSel        = document.getElementById('mic-select');
const fpsSel        = document.getElementById('fps-select');
const qualitySel    = document.getElementById('quality-select');
const formatSel     = document.getElementById('format-select');
const sysAudioChk   = document.getElementById('sys-audio-chk');
const startBtn      = document.getElementById('start-btn');
const pauseBtn      = document.getElementById('pause-btn');
const stopBtn       = document.getElementById('stop-btn');
const endSessionBtn = document.getElementById('end-session-btn');
const pickDirBtn    = document.getElementById('pick-dir-btn');
const dirNameEl     = document.getElementById('dir-name');
const statusBadge   = document.getElementById('status-badge');
const timerEl       = document.getElementById('timer-text');
const alertBox      = document.getElementById('alert-box');
const micGainSlider = document.getElementById('mic-gain-slider');
const sysGainSlider = document.getElementById('sys-gain-slider');
const micGainLabel  = document.getElementById('mic-gain-label');
const sysGainLabel  = document.getElementById('sys-gain-label');
const micLevelCanvas = document.getElementById('mic-level-canvas');
const sysLevelCanvas = document.getElementById('sys-level-canvas');
const errorDialog   = document.getElementById('captura-error-dialog');

// ── Capability checks ──────────────────────────────────────────────────────────

const hasGetDisplayMedia = !!(navigator.mediaDevices?.getDisplayMedia);
const hasFSA = typeof window.showDirectoryPicker === 'function';

// ── Preferences ────────────────────────────────────────────────────────────────

const PREFS = {
  sysAudio: 'captura-sysAudio',
  fps:      'captura-fps',
  quality:  'captura-quality',
  format:   'captura-format',
  pipX:     'captura-pipX',
  pipY:     'captura-pipY',
  webcam:   'captura-webcam',
  mic:      'captura-mic',
  micGain:  'captura-micGain',
  sysGain:  'captura-sysGain',
};

const savePref = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
const loadPref = k      => { try { return localStorage.getItem(k); } catch (_) { return null; } };
const gainPct  = v      => Math.round(parseFloat(v) * 100) + '%';
const fmtTime  = s      => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

// ── Engine instances ───────────────────────────────────────────────────────────

const compositor = new Compositor(canvas, {
  onPipMoved: (x, y) => { savePref(PREFS.pipX, x); savePref(PREFS.pipY, y); },
});

const metronome    = new Metronome();
const audioMixer   = new AudioMixer(micLevelCanvas, sysLevelCanvas);
const storage      = new StorageManager(dirNameEl, showErrorDialog);
const recorderCore = new RecorderCore();

// ── Recording state ────────────────────────────────────────────────────────────

let masterStream    = null;   // persistent display-capture stream (reused across recordings)
let webcamStream    = null;
let previewWebcamStream = null;
let micStream       = null;
let writableStream  = null;
let savedFileHandle = null;
let isRecording     = false;
let isPaused        = false;
let elapsedSecs     = 0;
let timerIntervalId = null;
let recordingStartTime = 0;
let totalPausedMs   = 0;
let pauseStartTime  = 0;

// ── UI helpers ─────────────────────────────────────────────────────────────────

function setUIState(state) {
  const rec     = state === 'recording';
  const paused  = state === 'paused';
  const active  = rec || paused;
  const session = state === 'session' || active;

  startBtn.hidden        = active;
  pauseBtn.hidden        = !active;
  pauseBtn.innerHTML     = paused
    ? '<i class="fas fa-play me-1"></i>Resume'
    : '<i class="fas fa-pause me-1"></i>Pause';
  pauseBtn.className     = paused ? 'btn btn-success' : 'btn btn-warning text-dark';
  stopBtn.hidden         = !active;
  endSessionBtn.hidden   = !session;
  pickDirBtn.disabled    = active;
  // Settings that cannot be changed mid-recording
  webcamSel.disabled     = active;
  micSel.disabled        = active;
  sysAudioChk.disabled   = active;
  fpsSel.disabled        = active;
  qualitySel.disabled    = active;

  statusBadge.textContent = rec     ? '⏺ Recording'
    : paused  ? '⏸ Paused'
    : session ? '◉ Session Active' : 'Idle';
  statusBadge.className  = rec     ? 'badge bg-danger'
    : paused || session  ? 'badge bg-warning text-dark' : 'badge bg-secondary';

  if (!active) timerEl.textContent = '00:00';
}

function showAlert(msgOrNode, type) {
  alertBox.className = 'alert alert-' + type + ' mb-3';
  alertBox.hidden    = false;
  if (typeof msgOrNode === 'string') alertBox.textContent = msgOrNode;
  else alertBox.replaceChildren(msgOrNode);
}

const TOAST_FADE_MS = 150;

function showToast(msgOrNode, type, autohide = true) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
  toast.setAttribute('role', type === 'danger' ? 'alert' : 'status');
  toast.setAttribute('aria-atomic', 'true');

  const inner = document.createElement('div');
  inner.className = 'd-flex';

  const body = document.createElement('div');
  body.className = 'toast-body';
  if (typeof msgOrNode === 'string') body.textContent = msgOrNode;
  else body.appendChild(msgOrNode);

  const closeBtn = document.createElement('button');
  closeBtn.type      = 'button';
  closeBtn.className = type === 'warning'
    ? 'btn-close me-2 m-auto flex-shrink-0'
    : 'btn-close btn-close-white me-2 m-auto flex-shrink-0';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.addEventListener('click', () => {
    toast.classList.remove('show');
    setTimeout(() => toast.parentNode?.removeChild(toast), TOAST_FADE_MS);
  });

  inner.append(body, closeBtn);
  toast.appendChild(inner);
  container.appendChild(toast);

  if (autohide) {
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.parentNode?.removeChild(toast), TOAST_FADE_MS);
    }, 8000);
  }
}

function showErrorDialog(title, message) {
  if (!errorDialog) { showAlert(message, 'danger'); return; }
  document.getElementById('captura-error-title').textContent = title;
  document.getElementById('captura-error-body').textContent  = message;
  errorDialog.showModal();
}

// ── Resolution / bitrate helpers ───────────────────────────────────────────────

function resolutionConstraints() {
  return (
    { '480':  { width: { ideal: 854  }, height: { ideal: 480  } },
      '720':  { width: { ideal: 1280 }, height: { ideal: 720  } },
      '1080': { width: { ideal: 1920 }, height: { ideal: 1080 } } }
  )[qualitySel.value] || {};
}

function videoBitrate() {
  return ({ '480': 2_000_000, '720': 4_000_000, '1080': 8_000_000 })[qualitySel.value] || 4_000_000;
}

// ── Webcam preview (pre-recording) ────────────────────────────────────────────

async function startWebcamPreview() {
  stopWebcamPreview();
  if (webcamSel.selectedIndex <= 0) return;
  try {
    const constraint = webcamSel.value ? { deviceId: { exact: webcamSel.value } } : true;
    previewWebcamStream = await navigator.mediaDevices.getUserMedia({ video: constraint, audio: false });
    compositor.previewWebcamStream    = previewWebcamStream;
    compositor.webcamVid.srcObject    = previewWebcamStream;
    await compositor.webcamVid.play();
  } catch (err) {
    previewWebcamStream = compositor.previewWebcamStream = null;
    showErrorDialog('Webcam Error', 'Could not start webcam preview: ' + err.message);
  }
}

function stopWebcamPreview() {
  if (previewWebcamStream) {
    previewWebcamStream.getTracks().forEach(t => t.stop());
    previewWebcamStream = null;
  }
  compositor.previewWebcamStream = null;
  if (!webcamStream) compositor.webcamVid.srcObject = null;
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

    if (!isRecording) {
      startWebcamPreview();
      audioMixer.startMicPreview(micSel.value, isPaused).catch(() => {});
    }
  } catch (err) {
    showErrorDialog('Device Error', 'Could not enumerate devices: ' + err.message);
  }
}

// ── Media Session API ──────────────────────────────────────────────────────────

function setupMediaSession() {
  if (!navigator.mediaSession) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title:   'Captura Web',
    artist:  'Recording Session Active',
    artwork: [{ src: new URL('/images/captura.png', location.href).href, sizes: '512x512', type: 'image/png' }],
  });
  navigator.mediaSession.setActionHandler('play',  () => { if (isPaused) resumeRecording(); });
  navigator.mediaSession.setActionHandler('pause', () => { if (isRecording && !isPaused) pauseRecording(); });
  navigator.mediaSession.setActionHandler('stop',  () => { if (isRecording) stopRecording(); });
}

function clearMediaSession() {
  if (!navigator.mediaSession) return;
  navigator.mediaSession.metadata = null;
  ['play', 'pause', 'stop'].forEach(a => {
    try { navigator.mediaSession.setActionHandler(a, null); } catch (_) {}
  });
}

// ── Screen stream ──────────────────────────────────────────────────────────────

// Returns the persistent master stream, acquiring a new one only when needed.
async function ensureStreamActive() {
  if (masterStream?.active && masterStream.getVideoTracks()[0]?.readyState === 'live') {
    return masterStream;
  }

  masterStream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: 'monitor',
      frameRate: { ideal: parseInt(fpsSel.value) },
      ...resolutionConstraints(),
    },
    audio: { systemAudio: 'include' },
    surfaceSwitching: 'include',
  });

  // Handle the native "Stop Sharing" button gracefully.
  masterStream.getVideoTracks()[0]?.addEventListener('ended', () => {
    masterStream = null;
    if (isRecording) {
      stopRecording();
    } else {
      compositor.screenVid.srcObject = null;
      cleanup();
      setUIState('idle');
    }
  }, { once: true });

  return masterStream;
}

// ── Recording lifecycle ────────────────────────────────────────────────────────

async function startRecording() {
  if (!hasGetDisplayMedia) {
    showErrorDialog(
      'Not Supported',
      'Screen recording is not supported on this device. ' +
      'Mobile browsers cannot access the device screen due to security sandbox restrictions. ' +
      'Please use a desktop browser (Chrome or Edge).'
    );
    return;
  }

  try {
    // 1 — Ensure the persistent screen stream is alive
    const stream = await ensureStreamActive();
    compositor.screenVid.srcObject = stream;
    await compositor.screenVid.play();

    // Resize canvas to the actual captured dimensions
    const settings  = stream.getVideoTracks()[0]?.getSettings() ?? {};
    canvas.width    = settings.width  || DEFAULT_WIDTH;
    canvas.height   = settings.height || DEFAULT_HEIGHT;

    // 2 — Webcam (stop preview first to release camera before re-acquiring)
    stopWebcamPreview();
    if (webcamSel.selectedIndex > 0) {
      const vidConstraint = webcamSel.value ? { deviceId: { exact: webcamSel.value } } : true;
      webcamStream = await navigator.mediaDevices.getUserMedia({ video: vidConstraint, audio: false });
      compositor.webcamStream        = webcamStream;
      compositor.webcamVid.srcObject = webcamStream;
      await compositor.webcamVid.play();
      await compositor.waitForVideoReady(compositor.webcamVid);
    }

    // 3 — Microphone
    if (micSel.selectedIndex > 0) {
      const audConstraint = micSel.value
        ? { deviceId: { exact: micSel.value }, echoCancellation: true }
        : { echoCancellation: true };
      micStream = await navigator.mediaDevices.getUserMedia({ audio: audConstraint, video: false });
    }

    // 4 — Audio mix
    const sysAudioTracks = stream.getAudioTracks();

    // If the user requested system audio but the share dialog gave no tracks,
    // abort and explain what to do rather than silently recording without audio.
    if (sysAudioChk.checked && sysAudioTracks.length === 0) {
      showErrorDialog(
        'System Audio Not Captured',
        'System audio was not captured. In the browser share dialog, make sure to enable ' +
        '"Share system audio" (or "Share tab audio"). ' +
        'Click "End Session" and try again, or uncheck "Capture system audio" in settings to record without it.'
      );
      if (webcamStream) { webcamStream.getTracks().forEach(t => t.stop()); webcamStream = compositor.webcamStream = null; }
      if (micStream)    { micStream.getTracks().forEach(t => t.stop());    micStream = null; }
      setUIState(masterStream?.active ? 'session' : 'idle');
      startPreviewLoop();
      startWebcamPreview();
      audioMixer.startMicPreview(micSel.value, false).catch(() => {});
      return;
    }

    audioMixer.stopMicPreview();
    audioMixer.stopSysPreview();

    const hasMic   = !!(micStream?.getAudioTracks().length);
    const hasAudio = sysAudioTracks.length > 0 || hasMic;

    let mixedAudioTrack = null;
    if (hasAudio) {
      const mixedStream = audioMixer.buildMix(
        sysAudioTracks,
        micStream,
        parseFloat(micGainSlider.value),
        parseFloat(sysGainSlider.value)
      );
      mixedAudioTrack = mixedStream.getAudioTracks()[0] ?? null;
    }

    // 5 — Output file (File System Access API)
    const dirOk = await storage.ensureAccess();
    if (!dirOk) { cleanup(); return; }

    const ext = formatSel.value === FORMAT_MP4 ? 'mp4' : 'webm';
    try {
      const fileHandle = await storage.dirHandle.getFileHandle(
        `recording-${dateStamp()}.${ext}`, { create: true }
      );
      writableStream  = await fileHandle.createWritable();
      savedFileHandle = fileHandle;
    } catch (pickErr) {
      showErrorDialog('File Error', 'Could not create recording file: ' + pickErr.message);
      cleanup();
      return;
    }

    // 6 — Initialise Mediabunny encoder pipeline
    await recorderCore.init({
      canvas,
      mixedAudioTrack,
      writableStream,
      isMp4:       formatSel.value === FORMAT_MP4,
      videoBitrate: videoBitrate(),
    });
    await recorderCore.start();

    // 7 — Mark recording as active and start all engines
    recordingStartTime     = performance.now();
    totalPausedMs          = 0;
    isRecording            = true;
    compositor.isRecording = true;

    audioMixer.startSilentAudio();
    setupMediaSession();
    if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';

    startRecordingLoop(parseInt(fpsSel.value));

    elapsedSecs = 0;
    timerEl.textContent = '00:00';
    timerIntervalId = setInterval(() => { timerEl.textContent = fmtTime(++elapsedSecs); }, 1000);

    setUIState('recording');

  } catch (err) {
    if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
      showErrorDialog('Recording Error', 'Error starting recording: ' + err.message);
    }
    cleanup();
  }
}

function stopRecording() {
  if (!isRecording && !isPaused) return;

  isRecording = isPaused = compositor.isRecording = false;
  metronome.stop();
  if (navigator.mediaSession) navigator.mediaSession.playbackState = 'none';
  clearInterval(timerIntervalId);
  setUIState(masterStream?.active ? 'session' : 'idle');

  const handle = savedFileHandle;
  savedFileHandle = null;

  // Wait for any in-flight addFrame() to complete before finalising.
  // finalize() flushes hardware encoders, writes the container duration header,
  // and automatically closes writableStream — do NOT call close() manually.
  metronome.done
    .then(() => recorderCore.finalize())
    .then(async () => {
      writableStream = null;

      // Build success toast with an open-in-new-tab link
      const msg = document.createDocumentFragment();
      msg.append('Recording saved to disk. ');
      if (handle) {
        try {
          const file = await handle.getFile();
          const url  = URL.createObjectURL(file);
          const link = Object.assign(document.createElement('a'), {
            href: url, target: '_blank', rel: 'noopener noreferrer',
            textContent: 'Open in new tab', className: 'toast-link',
          });
          msg.append(link);
          setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_REVOKE_TIMEOUT_MS);
          window.addEventListener('beforeunload', () => URL.revokeObjectURL(url), { once: true });
        } catch (_) {
          // getFile() may fail if the user moved/deleted the file; skip the link
        }
      }
      showToast(msg, 'success');
      cleanup();
    })
    .catch(err => {
      showErrorDialog('Save Error', 'Error saving recording: ' + err.message);
      try { writableStream?.close(); } catch (_) {}
      writableStream = null;
      cleanup();
    });
}

function pauseRecording() {
  if (!isRecording || isPaused) return;
  isPaused       = true;
  pauseStartTime = performance.now();
  metronome.stop();
  clearInterval(timerIntervalId);
  // Pause the Mediabunny audio source so it discards incoming samples while
  // accumulating a pauseOffset. The AudioContext keeps running so samples
  // continue to flow; Mediabunny simply stamps resumed audio correctly.
  recorderCore.pause();
  audioMixer.pauseSilentAudio();
  if (navigator.mediaSession) navigator.mediaSession.playbackState = 'paused';
  setUIState('paused');
}

function resumeRecording() {
  if (!isRecording || !isPaused) return;
  totalPausedMs += performance.now() - pauseStartTime;
  isPaused = false;
  recorderCore.resume();
  startRecordingLoop(parseInt(fpsSel.value, 10));
  timerIntervalId = setInterval(() => { timerEl.textContent = fmtTime(++elapsedSecs); }, 1000);
  audioMixer.resumeSilentAudio();
  if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';
  setUIState('recording');
}

// ── Compositing loop helpers ───────────────────────────────────────────────────

function startRecordingLoop(fps) {
  metronome.start(fps, async frameStart => {
    compositor.drawFrame();
    const ts = (frameStart - recordingStartTime - totalPausedMs) / 1000;
    await recorderCore.addFrame(ts);
  });
}

function startPreviewLoop() {
  metronome.start(0, () => compositor.drawFrame());
}

// ── Cleanup ────────────────────────────────────────────────────────────────────

// Releases per-recording resources (webcam, mic, audio graph, encoder) but
// leaves masterStream alive so the next recording can reuse the share without
// re-prompting.
function cleanup() {
  [webcamStream, micStream].forEach(s => s?.getTracks().forEach(t => t.stop()));
  webcamStream = micStream = null;
  compositor.webcamStream    = null;
  compositor.webcamVid.srcObject = null;

  audioMixer.teardownMix();
  audioMixer.stopMeterAnimation();
  audioMixer.stopSilentAudio();

  isRecording = isPaused = compositor.isRecording = false;

  // Return compositor to preview (rAF) mode and restart audio/webcam previews
  startPreviewLoop();
  startWebcamPreview();
  audioMixer.startMicPreview(micSel.value, false).catch(() => {});
  if (masterStream?.active) audioMixer.startSysPreview(masterStream.getAudioTracks());
}

function endSession() {
  if (isRecording) stopRecording();

  masterStream?.getTracks().forEach(t => t.stop());
  masterStream = null;

  compositor.screenVid.srcObject = null;
  stopWebcamPreview();
  cleanup();
  clearMediaSession();
  setUIState('idle');
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
    'Please open this page on a desktop browser (Chrome or Edge) to use the recorder.',
    'warning'
  );
  document.getElementById('recorder-ui').hidden = true;
} else if (!hasFSA) {
  showAlert(
    'Your browser does not support the File System Access API, which this recorder requires to ' +
    'stream video directly to disk. Please open this page in Chrome or Edge to use the recorder.',
    'warning'
  );
  document.getElementById('recorder-ui').hidden = true;
}

// Error dialog close handlers
if (errorDialog) {
  const closeDialog = () => errorDialog.close();
  document.getElementById('captura-error-close')?.addEventListener('click', closeDialog);
  errorDialog.addEventListener('click', e => { if (e.target === errorDialog) closeDialog(); });
}

restoreSimplePrefs();

if (hasGetDisplayMedia) {
  navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
  enumerateDevices();
}

startPreviewLoop();
if (hasFSA) storage.init();

// ── Event listeners ────────────────────────────────────────────────────────────

startBtn     .addEventListener('click', startRecording);
pauseBtn     .addEventListener('click', () => { if (isPaused) resumeRecording(); else pauseRecording(); });
stopBtn      .addEventListener('click', stopRecording);
endSessionBtn.addEventListener('click', endSession);
pickDirBtn   .addEventListener('click', () => storage.pickDirectory());

// Persist configuration changes to localStorage
fpsSel     .addEventListener('change', () => savePref(PREFS.fps,      fpsSel.value));
qualitySel .addEventListener('change', () => savePref(PREFS.quality,  qualitySel.value));
formatSel  .addEventListener('change', () => savePref(PREFS.format,   formatSel.value));
sysAudioChk.addEventListener('change', () => savePref(PREFS.sysAudio, sysAudioChk.checked));

webcamSel.addEventListener('change', () => {
  savePref(PREFS.webcam, webcamSel.value);
  if (!isRecording) startWebcamPreview();
});

micSel.addEventListener('change', () => {
  savePref(PREFS.mic, micSel.value);
  if (!isRecording && !isPaused) audioMixer.startMicPreview(micSel.value, false).catch(() => {});
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

// ── PWA Service Worker Registration ───────────────────────────────────────────

(function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const updateBar  = document.getElementById('pwa-update-bar');
  const updateBtn  = document.getElementById('pwa-update-btn');
  const dismissBtn = document.getElementById('pwa-dismiss-btn');
  if (!updateBar || !updateBtn) return;

  let newWorker = null;
  let reloading = false;

  // Only show the update notification when running as an installed PWA.
  const isPwa = () => window.matchMedia('(display-mode: standalone)').matches;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  // sw.js lives one directory above js/app.js
  navigator.serviceWorker.register('../sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller && isPwa()) {
          updateBar.hidden = false;
        }
      });
    });
  }).catch(err => console.warn('Service worker registration failed:', err));

  updateBtn.addEventListener('click', () => {
    updateBtn.textContent = 'Updating…';
    updateBtn.disabled    = true;
    newWorker?.postMessage('SKIP_WAITING');
  });

  dismissBtn?.addEventListener('click', () => { updateBar.hidden = true; });
}());
