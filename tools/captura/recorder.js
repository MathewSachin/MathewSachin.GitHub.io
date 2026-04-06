(function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────────────
  const DEFAULT_WIDTH  = 1280;
  const DEFAULT_HEIGHT = 720;
  const VIDEO_READY_TIMEOUT_MS      = 3000;
  const BLOB_URL_REVOKE_TIMEOUT_MS  = 5 * 60 * 1000; // 5 minutes
  const FORMAT_MP4  = 'mp4-h264-aac';
  const FORMAT_WEBM = 'webm-vp9-opus';

  // ── Timer Worker ─────────────────────────────────────────────────────────────
  // Uses a Web Worker so that inter-frame sleeps are not throttled when the
  // browser tab is in the background (main-thread setTimeout can be clamped to
  // ≥1 s in hidden tabs; Worker timers are not subject to that restriction).
  const _timerWorkerBlob = new Blob(
    ['let t;self.onmessage=function(e){clearTimeout(t);t=setTimeout(function(){self.postMessage(null);},e.data);}'],
    { type: 'application/javascript' }
  );
  const _timerWorkerUrl = URL.createObjectURL(_timerWorkerBlob);
  const timerWorker = new Worker(_timerWorkerUrl);
  URL.revokeObjectURL(_timerWorkerUrl);

  // ── State ───────────────────────────────────────────────────────────────────
  let masterStream        = null;   // persistent display-capture stream (reused across recordings)
  let webcamStream        = null;
  let previewWebcamStream = null;   // webcam stream active before/between recordings for positioning
  let micStream       = null;
  let audioCtx        = null;
  let audioDestNode   = null;
  let micGainNode     = null;   // GainNode for microphone channel
  let sysGainNode     = null;   // GainNode for system-audio channel
  let micAnalyser     = null;   // AnalyserNode for mic level meter
  let sysAnalyser     = null;   // AnalyserNode for system-audio level meter
  let meterRafId      = null;   // rAF id for the meter animation loop
  let silentAudioEl   = null;   // <audio> element that opens a Core Audio session for Media Session
  let silentAudioUrl  = null;   // object URL for the silent WAV blob (revoked on cleanup)
  let mediabunnyOutput       = null;  // Mediabunny Output instance
  let mediabunnyCanvasSource = null;  // Mediabunny CanvasSource (video)
  let mediabunnyAudioSource  = null;  // Mediabunny MediaStreamAudioTrackSource (audio)
  let writableStream  = null;   // FSA writable
  let savedFileHandle = null;   // FSA file handle (for open-in-new-tab after stop)
  let dirHandle       = null;   // FSA directory handle (persisted in IndexedDB)
  let idbDb           = null;   // IndexedDB database instance
  let animFrameId     = null;
  let timerIntervalId = null;
  let elapsedSecs     = 0;
  let isRecording     = false;
  let isPaused        = false;
  let pipX            = -1;   // fractional x (0-1) of pip top-left; -1 = default (bottom-left corner)
  let pipY            = -1;   // fractional y (0-1) of pip top-left; -1 = default (bottom-left corner)
  let pipDragging     = false;
  let pipDragOffX     = 0;    // canvas-pixel offset from pip top-left to mousedown point
  let pipDragOffY     = 0;
  let recordingLoopActive = false;             // guards the async recording loop
  let recordingLoopDone   = Promise.resolve(); // resolves when the current loop exits
  let recordingStartTime  = 0;   // performance.now() at the moment encoding started
  let totalPausedMs       = 0;   // cumulative pause duration (ms) within this recording
  let pauseStartTime      = 0;   // performance.now() when the last pause began
  let sleepResolve        = null; // resolve fn for the inter-frame sleep; called by stopCompositor to unblock the loop

  // Preview audio state (mic metering before/between recordings; sys metering during session)
  let previewAudioCtx    = null;
  let previewMicAnalyser = null;
  let previewSysAnalyser = null;
  let previewMicStream   = null;

  // Offscreen video elements used by compositor
  const screenVid = Object.assign(document.createElement('video'),
    { muted: true, autoplay: true, playsInline: true });
  const webcamVid = Object.assign(document.createElement('video'),
    { muted: true, autoplay: true, playsInline: true });

  // ── DOM refs ────────────────────────────────────────────────────────────────
  const canvas      = document.getElementById('recorder-canvas');
  const ctx         = canvas.getContext('2d');
  const webcamSel   = document.getElementById('webcam-select');
  const micSel      = document.getElementById('mic-select');
  const fpsSel      = document.getElementById('fps-select');
  const qualitySel  = document.getElementById('quality-select');
  const formatSel   = document.getElementById('format-select');
  const sysAudioChk = document.getElementById('sys-audio-chk');
  const startBtn    = document.getElementById('start-btn');
  const pauseBtn    = document.getElementById('pause-btn');
  const stopBtn     = document.getElementById('stop-btn');
  const endSessionBtn = document.getElementById('end-session-btn');
  const pickDirBtn  = document.getElementById('pick-dir-btn');
  const dirNameEl   = document.getElementById('dir-name');
  const statusBadge = document.getElementById('status-badge');
  const timerEl     = document.getElementById('timer-text');
  const alertBox    = document.getElementById('alert-box');
  const micGainSlider  = document.getElementById('mic-gain-slider');
  const sysGainSlider  = document.getElementById('sys-gain-slider');
  const micGainLabel   = document.getElementById('mic-gain-label');
  const sysGainLabel   = document.getElementById('sys-gain-label');
  const micLevelCanvas = document.getElementById('mic-level-canvas');
  const sysLevelCanvas = document.getElementById('sys-level-canvas');

  // ── Mobile / capability check ────────────────────────────────────────────────
  const hasGetDisplayMedia = !!(navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function');
  const hasFSA = typeof window.showDirectoryPicker === 'function';

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

  // ── IndexedDB helpers ────────────────────────────────────────────────────────
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('captura-db', 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore('settings');
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    });
  }

  function idbGet(key) {
    return new Promise((resolve, reject) => {
      const req = idbDb.transaction('settings', 'readonly').objectStore('settings').get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  function idbPut(key, value) {
    return new Promise((resolve, reject) => {
      const req = idbDb.transaction('settings', 'readwrite').objectStore('settings').put(value, key);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  // ── Preferences (localStorage) ──────────────────────────────────────────────
  const PREFS = {
    sysAudio : 'captura-sysAudio',
    fps      : 'captura-fps',
    quality  : 'captura-quality',
    format   : 'captura-format',
    pipX     : 'captura-pipX',
    pipY     : 'captura-pipY',
    webcam   : 'captura-webcam',
    mic      : 'captura-mic',
    micGain  : 'captura-micGain',
    sysGain  : 'captura-sysGain',
  };

  function savePref(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  }

  function loadPref(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }

  function gainPct(v) { return Math.round(parseFloat(v) * 100) + '%'; }

  // Restore non-device preferences immediately (no async enumeration needed)
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
      pipX = parseFloat(storedPipX);
      pipY = parseFloat(storedPipY);
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

  // Restore device selections after options have been populated
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

  restoreSimplePrefs();

  // ── Webcam PiP drag ─────────────────────────────────────────────────────────
  // Converts a MouseEvent position to canvas-pixel coordinates.
  function canvasPos(e) {
    const rect  = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left)  * scaleX,
      y: (e.clientY - rect.top)   * scaleY,
    };
  }

  // Returns the current pip pixel rect on the canvas (or null when webcam is off).
  function getPipRect() {
    if (!webcamStream && !previewWebcamStream) return null;
    const W    = canvas.width;
    const H    = canvas.height;
    const pipW = Math.round(W / 4);
    const pipH = Math.round(H / 4);
    const marg = Math.round(W / 80);
    const px   = pipX < 0 ? marg              : Math.round(pipX * W);
    const py   = pipY < 0 ? H - pipH - marg   : Math.round(pipY * H);
    return { px, py, pipW, pipH };
  }

  canvas.addEventListener('mousedown', e => {
    const r = getPipRect();
    if (!r) return;
    const { x, y } = canvasPos(e);
    if (x >= r.px && x <= r.px + r.pipW && y >= r.py && y <= r.py + r.pipH) {
      pipDragging  = true;
      pipDragOffX  = x - r.px;
      pipDragOffY  = y - r.py;
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
    }
  });

  canvas.addEventListener('mousemove', e => {
    const r = getPipRect();
    if (r) {
      const { x, y } = canvasPos(e);
      const overPip = x >= r.px && x <= r.px + r.pipW && y >= r.py && y <= r.py + r.pipH;
      if (!pipDragging) canvas.style.cursor = overPip ? 'grab' : '';
    }
    if (!pipDragging || !r) return;
    const W    = canvas.width;
    const H    = canvas.height;
    const { x, y } = canvasPos(e);
    pipX = Math.max(0, Math.min((x - pipDragOffX) / W, (W - r.pipW) / W));
    pipY = Math.max(0, Math.min((y - pipDragOffY) / H, (H - r.pipH) / H));
  });

  function stopPipDrag() {
    if (!pipDragging) return;
    pipDragging = false;
    canvas.style.cursor = '';
    savePref(PREFS.pipX, pipX);
    savePref(PREFS.pipY, pipY);
  }

  canvas.addEventListener('mouseup',    stopPipDrag);
  canvas.addEventListener('mouseleave', stopPipDrag);

  // ── Device enumeration ──────────────────────────────────────────────────────
  async function enumerateDevices() {
    try {
      const devices   = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices.filter(d => d.kind === 'videoinput');
      const audioDevs = devices.filter(d => d.kind === 'audioinput');

      webcamSel.innerHTML = '<option value="">None</option>';
      videoDevs.forEach((d, i) => {
        webcamSel.add(new Option(d.label || `Camera ${i + 1}`, d.deviceId));
      });

      micSel.innerHTML = '<option value="">None</option>';
      audioDevs.forEach((d, i) => {
        micSel.add(new Option(d.label || `Microphone ${i + 1}`, d.deviceId));
      });
      restoreDevicePrefs();
      if (!isRecording) {
        startWebcamPreview();
        startMicLevelPreview().catch(() => {});
      }
    } catch (err) {
      showErrorDialog('Device Error', 'Could not enumerate devices: ' + err.message);
    }
  }

  if (hasGetDisplayMedia) {
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
    enumerateDevices();
  }

  // ── Webcam preview (pre-recording) ──────────────────────────────────────────
  async function startWebcamPreview() {
    stopWebcamPreview();
    if (webcamSel.selectedIndex <= 0) return;
    try {
      const constraint = webcamSel.value
        ? { deviceId: { exact: webcamSel.value } }
        : true;
      previewWebcamStream = await navigator.mediaDevices.getUserMedia({
        video: constraint, audio: false,
      });
      webcamVid.srcObject = previewWebcamStream;
      await webcamVid.play();
    } catch (err) {
      previewWebcamStream = null;
      showErrorDialog('Webcam Error', 'Could not start webcam preview: ' + err.message);
    }
  }

  function stopWebcamPreview() {
    if (previewWebcamStream) {
      previewWebcamStream.getTracks().forEach(t => t.stop());
      previewWebcamStream = null;
    }
    // Only clear webcamVid when no recording stream is actively using it
    if (!webcamStream) webcamVid.srcObject = null;
  }

  // ── Canvas compositor ───────────────────────────────────────────────────────
  function compositeFrame() {
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);

    // Show screen layer whenever a live stream is available (recording OR session active)
    if (screenVid.srcObject && screenVid.readyState >= 2) {
      ctx.drawImage(screenVid, 0, 0, W, H);
    } else {
      // Placeholder shown only when no stream is active yet
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = `${Math.round(W / 40)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Click "Start Recording" to begin', W / 2, H / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    // Webcam PiP — rendered in both preview and recording modes
    if ((webcamStream || previewWebcamStream) && webcamVid.readyState >= 2) {
      const pipW = Math.round(W / 4);
      const pipH = Math.round(H / 4);
      const marg = Math.round(W / 80);
      const px   = pipX < 0 ? marg            : Math.round(pipX * W);
      const py   = pipY < 0 ? H - pipH - marg : Math.round(pipY * H);

      ctx.save();
      roundRect(px, py, pipW, pipH, 8);
      ctx.clip();
      ctx.drawImage(webcamVid, px, py, pipW, pipH);
      ctx.restore();

      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth   = 2;
      roundRect(px, py, pipW, pipH, 8);
      ctx.stroke();

      // Drag hint (only in preview/pre-recording state)
      if (!isRecording) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.font      = `${Math.round(W / 80)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('drag to reposition', px + pipW / 2, py + pipH - 4);
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'alphabetic';
      }
    }

    if (isRecording) {
      // Timestamp overlay
      const ts  = new Date().toLocaleTimeString();
      const pad = 6;
      const fw  = 120;
      const fh  = 20;
      ctx.fillStyle    = 'rgba(0,0,0,0.45)';
      ctx.fillRect(W - fw - pad, H - fh - pad, fw, fh);
      ctx.fillStyle    = '#fff';
      ctx.font         = '12px monospace';
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(ts, W - pad - 2, H - pad - 2);
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  }

  function stopCompositor() {
    recordingLoopActive = false;
    if (animFrameId)  { cancelAnimationFrame(animFrameId); animFrameId = null; }
    // Clear the worker message handler so any in-flight tick from the previous
    // recording session cannot accidentally resolve a future session's sleep.
    timerWorker.onmessage = null;
    // If the recording loop is suspended in its inter-frame sleep, wake it up
    // immediately so it can check recordingLoopActive and exit cleanly.
    if (sleepResolve) { sleepResolve();                    sleepResolve = null; }
  }

  // fps=0 → rAF (preview, throttled in background — fine when not recording)
  // fps>0 → async self-scheduling loop (recording, must keep running and apply backpressure)
  function startCompositor(fps) {
    stopCompositor();
    if (fps > 0) {
      const interval = Math.round(1000 / fps);
      recordingLoopActive = true;
      recordingLoopDone = (async function recordingLoop() {
        while (recordingLoopActive) {
          const frameStart = performance.now();
          compositeFrame();
          if (mediabunnyCanvasSource) {
            const ts = (frameStart - recordingStartTime - totalPausedMs) / 1000;
            await mediabunnyCanvasSource.add(ts);
          }
          if (!recordingLoopActive) break;
          const elapsed = performance.now() - frameStart;
          await new Promise(resolve => {
            sleepResolve = resolve;
            timerWorker.onmessage = () => {
              sleepResolve = null;
              resolve();
            };
            timerWorker.postMessage(Math.max(0, interval - elapsed));
          });
        }
      })();
    } else {
      (function rafLoop() {
        compositeFrame();
        animFrameId = requestAnimationFrame(rafLoop);
      })();
    }
  }

  // Resolves once a video element has at least one decoded frame, or after a timeout.
  function waitForVideoReady(vid) {
    return new Promise(resolve => {
      if (vid.readyState >= 2) { resolve(); return; }
      vid.addEventListener('loadeddata', resolve, { once: true });
      setTimeout(resolve, VIDEO_READY_TIMEOUT_MS);
    });
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x,     y,     x + r, y);
    ctx.closePath();
  }

  // ── Audio mixer ─────────────────────────────────────────────────────────────
  function buildAudioMix(sysAudioTracks, micMStream) {
    audioCtx      = new AudioContext();
    audioDestNode = audioCtx.createMediaStreamDestination();

    if (sysAudioTracks.length > 0) {
      const src = audioCtx.createMediaStreamSource(new MediaStream(sysAudioTracks));
      sysGainNode = audioCtx.createGain();
      sysGainNode.gain.value = parseFloat(sysGainSlider.value);
      sysAnalyser = audioCtx.createAnalyser();
      sysAnalyser.fftSize = 512;
      sysAnalyser.smoothingTimeConstant = 0.75;
      src.connect(sysGainNode);
      sysGainNode.connect(sysAnalyser);
      sysAnalyser.connect(audioDestNode);
    }

    if (micMStream) {
      const src = audioCtx.createMediaStreamSource(micMStream);
      micGainNode = audioCtx.createGain();
      micGainNode.gain.value = parseFloat(micGainSlider.value);
      micAnalyser = audioCtx.createAnalyser();
      micAnalyser.fftSize = 512;
      micAnalyser.smoothingTimeConstant = 0.75;
      src.connect(micGainNode);
      micGainNode.connect(micAnalyser);
      micAnalyser.connect(audioDestNode);
    }

    startMeterAnimation();
    return audioDestNode.stream;
  }

  // ── Level meters ─────────────────────────────────────────────────────────────
  // Draws a green/yellow/red RMS bar on a canvas for one audio channel.
  function drawMeter(analyser, mCanvas) {
    const mCtx = mCanvas.getContext('2d');
    const W    = mCanvas.width;
    const H    = mCanvas.height;

    // Background
    mCtx.fillStyle = '#1e1e1e';
    mCtx.fillRect(0, 0, W, H);

    if (!analyser) return;

    const buf = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buf);

    // Compute RMS of the time-domain signal (samples are unsigned 8-bit; 128 = silence)
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    const rms   = Math.sqrt(sum / buf.length);
    const level = Math.min(1, rms * 8); // scale so typical speech is visually meaningful

    const filled    = level * W;
    const greenEnd  = W * 0.70;
    const yellowEnd = W * 0.85;

    if (filled > 0) {
      mCtx.fillStyle = '#22c55e';
      mCtx.fillRect(0, 0, Math.min(filled, greenEnd), H);
    }
    if (filled > greenEnd) {
      mCtx.fillStyle = '#eab308';
      mCtx.fillRect(greenEnd, 0, Math.min(filled - greenEnd, yellowEnd - greenEnd), H);
    }
    if (filled > yellowEnd) {
      mCtx.fillStyle = '#ef4444';
      mCtx.fillRect(yellowEnd, 0, filled - yellowEnd, H);
    }
  }

  function startMeterAnimation() {
    stopMeterAnimation();
    (function tick() {
      const micAn = micAnalyser || previewMicAnalyser;
      const sysAn = sysAnalyser || previewSysAnalyser;
      if (!micAn && !sysAn) {
        // Reset meters to dark/inactive state when nothing is connected
        [micLevelCanvas, sysLevelCanvas].forEach(c => {
          const mCtx = c.getContext('2d');
          mCtx.fillStyle = '#1e1e1e';
          mCtx.fillRect(0, 0, c.width, c.height);
        });
        return;
      }
      drawMeter(micAn, micLevelCanvas);
      drawMeter(sysAn, sysLevelCanvas);
      meterRafId = requestAnimationFrame(tick);
    })();
  }

  function stopMeterAnimation() {
    if (meterRafId) { cancelAnimationFrame(meterRafId); meterRafId = null; }
  }

  // ── Preview audio metering ───────────────────────────────────────────────────
  // Shows mic / system-audio level meters outside of an active recording so the
  // user can confirm levels before committing to a capture session.

  async function startMicLevelPreview() {
    // Stop any existing preview mic stream
    if (previewMicStream) {
      previewMicStream.getTracks().forEach(t => t.stop());
      previewMicStream = null;
    }
    previewMicAnalyser = null;

    if (isRecording || isPaused || micSel.selectedIndex <= 0) return;

    try {
      const constraint = micSel.value
        ? { deviceId: { exact: micSel.value }, echoCancellation: false }
        : { echoCancellation: false };
      previewMicStream = await navigator.mediaDevices.getUserMedia({ audio: constraint, video: false });

      if (!previewAudioCtx || previewAudioCtx.state === 'closed') {
        previewAudioCtx = new AudioContext();
      }
      const src = previewAudioCtx.createMediaStreamSource(previewMicStream);
      previewMicAnalyser = previewAudioCtx.createAnalyser();
      previewMicAnalyser.fftSize = 512;
      previewMicAnalyser.smoothingTimeConstant = 0.75;
      src.connect(previewMicAnalyser);
      startMeterAnimation();
    } catch (_) {
      // Silently fail — preview metering is optional
      previewMicStream   = null;
      previewMicAnalyser = null;
    }
  }

  function stopMicLevelPreview() {
    if (previewMicStream) {
      previewMicStream.getTracks().forEach(t => t.stop());
      previewMicStream = null;
    }
    previewMicAnalyser = null;
    if (previewAudioCtx && !previewSysAnalyser) {
      previewAudioCtx.close().catch(() => {});
      previewAudioCtx = null;
    }
  }

  function startSysLevelPreview(tracks) {
    previewSysAnalyser = null;
    if (!tracks || tracks.length === 0) return;

    if (!previewAudioCtx || previewAudioCtx.state === 'closed') {
      previewAudioCtx = new AudioContext();
    }
    const src = previewAudioCtx.createMediaStreamSource(new MediaStream(tracks));
    previewSysAnalyser = previewAudioCtx.createAnalyser();
    previewSysAnalyser.fftSize = 512;
    previewSysAnalyser.smoothingTimeConstant = 0.75;
    src.connect(previewSysAnalyser);
    startMeterAnimation();
  }

  function stopSysLevelPreview() {
    previewSysAnalyser = null;
    if (previewAudioCtx && !previewMicAnalyser) {
      previewAudioCtx.close().catch(() => {});
      previewAudioCtx = null;
    }
  }

  // ── Media Session API ────────────────────────────────────────────────────────

  // macOS Now Playing and hardware media key forwarding in Chrome require an
  // actual Core Audio session to be open. Chrome only opens one when a media
  // element plays with volume > 0. A MediaStream srcObject (live/infinite) is
  // not forwarded to the OS widget; a finite, looping file-backed src is.
  //
  // We build a minimal 100 ms silent PCM WAV in memory, expose it via a Blob
  // URL, and play it looped at volume 0.001 (−60 dB, inaudible). That is
  // enough for Chrome to open the audio session and register the page with
  // macOS Now Playing / hardware media keys.
  //
  // Must be called within a user-gesture event chain (autoplay policy).
  function startSilentAudio() {
    // Build a minimal silent WAV: 8 kHz, 8-bit unsigned PCM, mono, 100 ms.
    const rate = 8000, numSamples = rate / 10; // 100 ms
    const buf  = new ArrayBuffer(44 + numSamples);
    const d    = new DataView(buf);
    const str  = (off, s) => { for (let i = 0; i < s.length; i++) d.setUint8(off + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); d.setUint32(4, 36 + numSamples, true);
    str(8, 'WAVE'); str(12, 'fmt '); d.setUint32(16, 16, true);
    d.setUint16(20, 1, true);           // PCM
    d.setUint16(22, 1, true);           // mono
    d.setUint32(24, rate, true);        // sample rate
    d.setUint32(28, rate, true);        // byte rate
    d.setUint16(32, 1, true);           // block align
    d.setUint16(34, 8, true);           // 8-bit
    str(36, 'data'); d.setUint32(40, numSamples, true);
    for (let i = 0; i < numSamples; i++) d.setUint8(44 + i, 128); // 128 = silence (unsigned 8-bit midpoint)

    silentAudioUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
    silentAudioEl  = new Audio();
    silentAudioEl.src    = silentAudioUrl;
    silentAudioEl.loop   = true;
    silentAudioEl.volume = 0.001; // −60 dBFS: inaudible, but non-zero so Chrome opens a Core Audio session
    document.body.appendChild(silentAudioEl);
    silentAudioEl.play().catch(() => {});
  }

  function setupMediaSession() {
    if (!navigator.mediaSession) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title:   'Captura Web',
      artist:  'Recording Session Active',
      artwork: [{ src: new URL('/images/captura.png', location.href).href, sizes: '512x512', type: 'image/png' }]
    });

    navigator.mediaSession.setActionHandler('play', () => {
      if (isPaused) resumeRecording();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      if (isRecording && !isPaused) pauseRecording();
    });
    navigator.mediaSession.setActionHandler('stop', () => {
      if (isRecording) stopRecording();
    });
  }

  function clearMediaSession() {
    if (!navigator.mediaSession) return;
    navigator.mediaSession.metadata = null;
    ['play', 'pause', 'stop'].forEach(action => {
      try { navigator.mediaSession.setActionHandler(action, null); } catch (_) {}
    });
  }

  // ── Recording ────────────────────────────────────────────────────────────────

  // Returns the persistent master stream, acquiring a new one only when needed.
  // Sets up a one-time 'ended' listener so that the native "Stop Sharing" button
  // is handled gracefully.
  async function ensureStreamActive() {
    if (masterStream && masterStream.active &&
        masterStream.getVideoTracks()[0]?.readyState === 'live') return masterStream;

    masterStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'monitor',
        frameRate: { ideal: parseInt(fpsSel.value) },
        ...resolutionConstraints()
      },
      audio: { systemAudio: 'include' },
      surfaceSwitching: 'include'
    });

    const videoTrack = masterStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.addEventListener('ended', () => {
        masterStream = null;
        if (isRecording) {
          stopRecording();
        } else {
          screenVid.srcObject = null;
          cleanup();
          setUIState('idle');
        }
      }, { once: true });
    }

    return masterStream;
  }

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

      screenVid.srcObject = stream;
      await screenVid.play();

      // Resize canvas to actual captured dimensions
      const videoTracks = stream.getVideoTracks();
      const settings    = videoTracks.length > 0 ? videoTracks[0].getSettings() : {};
      canvas.width      = settings.width  || DEFAULT_WIDTH;
      canvas.height     = settings.height || DEFAULT_HEIGHT;

      // 2 — Webcam (stop preview first to release the camera before re-acquiring)
      stopWebcamPreview();
      if (webcamSel.selectedIndex > 0) {
        const vidConstraint = webcamSel.value
          ? { deviceId: { exact: webcamSel.value } }
          : true;
        webcamStream = await navigator.mediaDevices.getUserMedia({
          video: vidConstraint,
          audio: false
        });
        webcamVid.srcObject = webcamStream;
        await webcamVid.play();
        await waitForVideoReady(webcamVid);
      }

      // 3 — Microphone
      if (micSel.selectedIndex > 0) {
        const audConstraint = micSel.value
          ? { deviceId: { exact: micSel.value }, echoCancellation: true }
          : { echoCancellation: true };
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: audConstraint,
          video: false
        });
      }

      // 4 — Audio mix
      const sysAudioTracks = stream.getAudioTracks();

      // If the user requested system audio but the browser share dialog didn't
      // provide any audio tracks, abort and explain what to do.
      if (sysAudioChk.checked && sysAudioTracks.length === 0) {
        showErrorDialog(
          'System Audio Not Captured',
          'System audio was not captured. In the browser share dialog, make sure to enable ' +
          '"Share system audio" (or "Share tab audio"). ' +
          'Uncheck "Capture system audio" in settings to record without it.'
        );
        if (webcamStream) { webcamStream.getTracks().forEach(t => t.stop()); webcamStream = null; }
        if (micStream)    { micStream.getTracks().forEach(t => t.stop());    micStream    = null; }
        setUIState(masterStream && masterStream.active ? 'session' : 'idle');
        startCompositor(0);
        startWebcamPreview();
        startMicLevelPreview().catch(() => {});
        return;
      }

      // Stop preview audio before building the recording mix
      stopMicLevelPreview();
      stopSysLevelPreview();
      const hasMic         = !!(micStream && micStream.getAudioTracks().length);
      const hasAudio       = sysAudioTracks.length > 0 || hasMic;

      let mixedAudioTracks = [];
      if (hasAudio) {
        const mixedStream = buildAudioMix(sysAudioTracks, micStream);
        mixedAudioTracks  = mixedStream.getAudioTracks();
      }

      // 5 — Output: File System Access API (directory-based)
      const fps    = parseInt(fpsSel.value);
      const dirOk = await ensureDirectoryAccess();
      if (!dirOk) { cleanup(); return; }

      try {
        const ext = formatSel.value === FORMAT_MP4 ? 'mp4' : 'webm';
        const fileHandle = await dirHandle.getFileHandle(
          `recording-${dateStamp()}.${ext}`, { create: true }
        );
        writableStream  = await fileHandle.createWritable();
        savedFileHandle = fileHandle;
      } catch (pickErr) {
        showErrorDialog('File Error', 'Could not create recording file: ' + pickErr.message);
        cleanup();
        return;
      }

      // 6 — Mediabunny output
      // Dynamic import is cached by the browser after the first load.
      const { Output, WebMOutputFormat, Mp4OutputFormat, StreamTarget, CanvasSource, MediaStreamAudioTrackSource } =
        await import('https://cdn.jsdelivr.net/npm/mediabunny@1.40.1/+esm');

      const isMp4 = formatSel.value === FORMAT_MP4;
      mediabunnyOutput = new Output({
        format: isMp4 ? new Mp4OutputFormat() : new WebMOutputFormat(),
        target: new StreamTarget(writableStream)
      });

      mediabunnyCanvasSource = new CanvasSource(canvas, {
        codec:   isMp4 ? 'avc' : 'vp9',
        bitrate: videoBitrate()
      });
      mediabunnyOutput.addVideoTrack(mediabunnyCanvasSource);

      if (hasAudio) {
        mediabunnyAudioSource = new MediaStreamAudioTrackSource(mixedAudioTracks[0], {
          codec:   isMp4 ? 'aac' : 'opus',
          bitrate: 128_000
        });
        mediabunnyOutput.addAudioTrack(mediabunnyAudioSource);
      }

      // 7 — Start encoding
      recordingStartTime = performance.now();
      totalPausedMs      = 0;
      await mediabunnyOutput.start();
      isRecording = true;

      // Activate Media Session API so hardware media keys can control the recording
      startSilentAudio();
      setupMediaSession();
      if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';

      // Switch compositor to async recording loop so it keeps running when the tab is hidden
      startCompositor(fps);

      elapsedSecs = 0;
      timerEl.textContent = '00:00';
      timerIntervalId = setInterval(() => {
        elapsedSecs++;
        timerEl.textContent = fmtTime(elapsedSecs);
      }, 1000);

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
    isRecording = false;
    isPaused    = false;
    stopCompositor();
    if (navigator.mediaSession) navigator.mediaSession.playbackState = 'none';
    clearInterval(timerIntervalId);
    setUIState(masterStream && masterStream.active ? 'session' : 'idle');

    if (mediabunnyOutput) {
      const output = mediabunnyOutput;
      const handle = savedFileHandle;
      mediabunnyOutput       = null;
      mediabunnyCanvasSource = null;
      mediabunnyAudioSource  = null;
      savedFileHandle        = null;

      // Wait for any in-flight canvasSource.add() to finish before finalizing.
      // finalize() flushes hardware encoders, writes the correct duration header,
      // and automatically closes the writableStream — do NOT call close() manually.
      recordingLoopDone.then(() => output.finalize()).then(async () => {
        writableStream = null;

        // Build success alert with an open-in-new-tab link
        const msg = document.createDocumentFragment();
        msg.append('Recording saved to disk. ');
        if (handle) {
          try {
            const file = await handle.getFile();
            const url  = URL.createObjectURL(file);
            const link = Object.assign(document.createElement('a'), {
              href: url, target: '_blank', rel: 'noopener noreferrer',
              textContent: 'Open in new tab',
              className: 'toast-link'
            });
            msg.append(link);
            // Revoke the blob URL when the tab navigates away or after 5 minutes
            setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_REVOKE_TIMEOUT_MS);
            window.addEventListener('beforeunload', () => URL.revokeObjectURL(url), { once: true });
          } catch (_) {
            // getFile() may fail if the user moved/deleted the file; skip the link
          }
        }
        showToast(msg, 'success');
        cleanup();
      }).catch(err => {
        showErrorDialog('Save Error', 'Error saving recording: ' + err.message);
        if (writableStream) {
          try { writableStream.close(); } catch (_) {}
          writableStream = null;
        }
        cleanup();
      });
    }
  }

  function pauseRecording() {
    if (!isRecording || isPaused) return;
    isPaused       = true;
    pauseStartTime = performance.now();
    stopCompositor();
    clearInterval(timerIntervalId);
    // Pause the Mediabunny audio source so it discards incoming samples while
    // accumulating a pauseOffset. This keeps the audio timeline in sync with
    // the video timeline: when resumed, Mediabunny subtracts the total dropped
    // duration from subsequent sample timestamps, eliminating any silence gap.
    // Do NOT suspend audioCtx here — the AudioContext must keep running so
    // that audio samples continue to flow into the source, giving Mediabunny
    // the data it needs to measure the pause duration accurately.
    if (mediabunnyAudioSource) mediabunnyAudioSource.pause();
    if (navigator.mediaSession) navigator.mediaSession.playbackState = 'paused';
    if (silentAudioEl) silentAudioEl.pause();
    setUIState('paused');
  }

  function resumeRecording() {
    if (!isRecording || !isPaused) return;
    totalPausedMs += performance.now() - pauseStartTime;
    isPaused = false;
    // Resume the Mediabunny audio source. Mediabunny has been accumulating a
    // pauseOffset from the samples it discarded during the pause, so it will
    // automatically stamp the resumed audio with the correct timestamp — no
    // silence gap in the output.
    if (mediabunnyAudioSource) mediabunnyAudioSource.resume();
    startCompositor(parseInt(fpsSel.value, 10));
    timerIntervalId = setInterval(() => {
      elapsedSecs++;
      timerEl.textContent = fmtTime(elapsedSecs);
    }, 1000);
    if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';
    if (silentAudioEl) silentAudioEl.play().catch(() => {});
    setUIState('recording');
  }

  // Cleans up per-recording resources (webcam, mic, audio graph) but leaves
  // masterStream alive so the next recording can reuse it without re-prompting.
  function cleanup() {
    [webcamStream, micStream].forEach(s => {
      if (s) s.getTracks().forEach(t => t.stop());
    });
    webcamStream = micStream = null;

    if (audioCtx)      { audioCtx.close(); audioCtx = null; }
    micGainNode = sysGainNode = null;
    micAnalyser = sysAnalyser = null;
    stopMeterAnimation();
    if (silentAudioEl) {
      silentAudioEl.pause();
      if (silentAudioEl.parentNode) silentAudioEl.parentNode.removeChild(silentAudioEl);
      silentAudioEl = null;
    }
    if (silentAudioUrl) { URL.revokeObjectURL(silentAudioUrl); silentAudioUrl = null; }
    webcamVid.srcObject = null;
    mediabunnyOutput       = null;
    mediabunnyCanvasSource = null;
    mediabunnyAudioSource  = null;
    isRecording = false;
    isPaused    = false;

    // Return compositor to preview (rAF) mode, then restart webcam and audio previews
    startCompositor(0);
    startWebcamPreview();
    startMicLevelPreview().catch(() => {});
    if (masterStream && masterStream.active) {
      startSysLevelPreview(masterStream.getAudioTracks());
    }
  }

  // Tears down the persistent screen stream and resets all state to idle.
  function endSession() {
    if (isRecording) stopRecording();

    if (masterStream) {
      masterStream.getTracks().forEach(t => t.stop());
      masterStream = null;
    }

    screenVid.srcObject = null;
    stopWebcamPreview();
    cleanup();
    clearMediaSession();
    setUIState('idle');
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function resolutionConstraints() {
    const map = {
      '480':  { width: { ideal: 854  }, height: { ideal: 480  } },
      '720':  { width: { ideal: 1280 }, height: { ideal: 720  } },
      '1080': { width: { ideal: 1920 }, height: { ideal: 1080 } }
    };
    return map[qualitySel.value] || {};
  }

  function videoBitrate() {
    const map = { '480': 2_000_000, '720': 4_000_000, '1080': 8_000_000 };
    return map[qualitySel.value] || 4_000_000;
  }

  function fmtTime(s) {
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' +
           String(s % 60).padStart(2, '0');
  }

  function dateStamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }

  function togglePauseResume() {
    if (isPaused) resumeRecording(); else pauseRecording();
  }

  function setUIState(state) {
    const rec     = state === 'recording';
    const paused  = state === 'paused';
    const active  = rec || paused;
    const session = state === 'session' || active;
    startBtn.hidden         = active;
    pauseBtn.hidden         = !active;
    pauseBtn.innerHTML      = paused
      ? '<i class="fas fa-play me-1"></i>Resume'
      : '<i class="fas fa-pause me-1"></i>Pause';
    pauseBtn.className      = paused ? 'btn btn-success' : 'btn btn-warning text-dark';
    stopBtn.hidden          = !active;
    endSessionBtn.hidden    = !session;
    pickDirBtn.disabled     = active;
    // Settings that cannot be changed mid-recording
    webcamSel.disabled      = active;
    micSel.disabled         = active;
    sysAudioChk.disabled    = active;
    fpsSel.disabled         = active;
    qualitySel.disabled     = active;
    statusBadge.textContent = rec    ? '⏺ Recording'
      : paused ? '⏸ Paused'
      : session ? '◉ Session Active' : 'Idle';
    // paused and session intentionally share the same yellow badge style
    statusBadge.className   = rec    ? 'badge bg-danger'
      : paused || session ? 'badge bg-warning text-dark' : 'badge bg-secondary';
    if (!active) timerEl.textContent = '00:00';
  }

  function showAlert(msgOrNode, type) {
    alertBox.className = 'alert alert-' + type + ' mb-3';
    alertBox.hidden    = false;
    if (typeof msgOrNode === 'string') {
      alertBox.textContent = msgOrNode;
    } else {
      alertBox.replaceChildren(msgOrNode);
    }
  }

  const TOAST_FADE_MS = 150; // ms to match Bootstrap fade transition

  // Success toast (auto-hides after 8 s, dismissable).
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
    if (typeof msgOrNode === 'string') {
      body.textContent = msgOrNode;
    } else {
      body.appendChild(msgOrNode);
    }

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = type === 'warning'
      ? 'btn-close me-2 m-auto flex-shrink-0'
      : 'btn-close btn-close-white me-2 m-auto flex-shrink-0';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', () => {
      toast.classList.remove('show');
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, TOAST_FADE_MS);
    });

    inner.appendChild(body);
    inner.appendChild(closeBtn);
    toast.appendChild(inner);
    container.appendChild(toast);

    if (autohide) {
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, TOAST_FADE_MS);
      }, 8000);
    }
  }

  // Centered error/warning dialog (more prominent than a toast for issues that
  // require user attention before proceeding).
  const errorDialog = document.getElementById('captura-error-dialog');
  if (errorDialog) {
    const closeEl = document.getElementById('captura-error-close');
    const closeDialog = () => errorDialog.close();
    if (closeEl) closeEl.addEventListener('click', closeDialog);
    // Click on backdrop (outside dialog box) to close
    errorDialog.addEventListener('click', e => { if (e.target === errorDialog) closeDialog(); });
  }

  function showErrorDialog(title, message) {
    if (!errorDialog) {
      // Fallback if dialog element is missing
      showAlert(message, 'danger');
      return;
    }
    document.getElementById('captura-error-title').textContent = title;
    document.getElementById('captura-error-body').textContent  = message;
    errorDialog.showModal();
  }

  // ── Directory handle management ──────────────────────────────────────────────
  function updateDirUI() {
    dirNameEl.textContent = dirHandle ? dirHandle.name : '(no folder selected)';
  }

  async function pickDirectory() {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      dirHandle = handle;
      updateDirUI();
      if (idbDb) {
        try { await idbPut('dir-handle', dirHandle); } catch (e) { console.warn('IndexedDB put failed:', e); }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        showErrorDialog('Folder Error', 'Could not select folder: ' + err.message);
      }
    }
  }

  // Verifies (and if needed re-requests) write permission for the stored directory handle.
  // If no handle exists, prompts the user to pick one. Returns true when access is granted.
  async function ensureDirectoryAccess() {
    if (!dirHandle) {
      try {
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
        dirHandle = handle;
        updateDirUI();
        if (idbDb) {
          try { await idbPut('dir-handle', dirHandle); } catch (e) { console.warn('IndexedDB put failed:', e); }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          showErrorDialog('Folder Error', 'Could not select a save folder: ' + err.message);
        }
        return false;
      }
    }

    let perm = await dirHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      try {
        perm = await dirHandle.requestPermission({ mode: 'readwrite' });
      } catch (_) {
        perm = 'denied';
      }
    }
    if (perm !== 'granted') {
      showErrorDialog(
        'Permission Denied',
        'Write permission for the save folder was denied. ' +
        'Please choose a different folder with the "Choose Folder" button.'
      );
      return false;
    }
    return true;
  }

  async function initDB() {
    try {
      idbDb = await openDB();
      const handle = await idbGet('dir-handle');
      if (handle) {
        dirHandle = handle;
        updateDirUI();
      }
    } catch (_) {
      // IndexedDB unavailable; proceed without persistence
    }
  }

  // ── Bootstrap ───────────────────────────────────────────────────────────────
  startBtn     .addEventListener('click', startRecording);
  pauseBtn     .addEventListener('click', togglePauseResume);
  stopBtn      .addEventListener('click', stopRecording);
  endSessionBtn.addEventListener('click', endSession);
  pickDirBtn   .addEventListener('click', pickDirectory);

  // Persist configuration changes to localStorage
  fpsSel     .addEventListener('change', () => savePref(PREFS.fps,      fpsSel.value));
  qualitySel .addEventListener('change', () => savePref(PREFS.quality,  qualitySel.value));
  formatSel  .addEventListener('change', () => savePref(PREFS.format, formatSel.value));
  sysAudioChk.addEventListener('change', () => savePref(PREFS.sysAudio, sysAudioChk.checked));
  webcamSel  .addEventListener('change', () => {
    savePref(PREFS.webcam, webcamSel.value);
    if (!isRecording) startWebcamPreview();
  });
  micSel     .addEventListener('change', () => {
    savePref(PREFS.mic, micSel.value);
    if (!isRecording && !isPaused) startMicLevelPreview().catch(() => {});
  });

  micGainSlider.addEventListener('input', () => {
    const v = parseFloat(micGainSlider.value);
    micGainLabel.textContent = gainPct(v);
    if (micGainNode) micGainNode.gain.value = v;
    savePref(PREFS.micGain, v);
  });

  sysGainSlider.addEventListener('input', () => {
    const v = parseFloat(sysGainSlider.value);
    sysGainLabel.textContent = gainPct(v);
    if (sysGainNode) sysGainNode.gain.value = v;
    savePref(PREFS.sysGain, v);
  });

  // Kick off the compositor loop (preview mode) and initialise IndexedDB
  startCompositor(0);
  if (hasFSA) initDB();

})();

// ── PWA Service Worker Registration ──────────────────────────────────────────
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const updateBar    = document.getElementById('pwa-update-bar');
  const updateBtn    = document.getElementById('pwa-update-btn');
  const dismissBtn   = document.getElementById('pwa-dismiss-btn');
  if (!updateBar || !updateBtn) return;
  let newWorker  = null;
  let reloading  = false;

  // Only show the update notification when running as an installed PWA.
  const isPwa = () => window.matchMedia('(display-mode: standalone)').matches;

  // Reload the page once the new service worker takes control.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  navigator.serviceWorker.register('./sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        // An update is available only when there is already a controller
        // (i.e. this is not the very first install) and the app is running
        // as an installed PWA.
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller && isPwa()) {
          updateBar.hidden = false;
        }
      });
    });
  }).catch(err => {
    console.warn('Service worker registration failed:', err);
  });

  updateBtn.addEventListener('click', () => {
    updateBtn.textContent = 'Updating…';
    updateBtn.disabled = true;
    if (newWorker) newWorker.postMessage('SKIP_WAITING');
  });

  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      updateBar.hidden = true;
    });
  }
}

registerServiceWorker();

