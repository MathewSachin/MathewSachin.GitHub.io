(function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────────────
  const DEFAULT_WIDTH  = 1280;
  const DEFAULT_HEIGHT = 720;
  const VIDEO_READY_TIMEOUT_MS      = 3000;
  const BLOB_URL_REVOKE_TIMEOUT_MS  = 5 * 60 * 1000; // 5 minutes
  const WEBM_HEADER_MAX_BYTES       = 100_000;        // 100 KB — safely contains the full EBML header

  // ── State ───────────────────────────────────────────────────────────────────
  let masterStream    = null;   // persistent display-capture stream (reused across recordings)
  let webcamStream    = null;
  let micStream       = null;
  let audioCtx        = null;
  let audioDestNode   = null;
  let silentAudioEl   = null;   // <audio> element that opens a Core Audio session for Media Session
  let silentAudioUrl  = null;   // object URL for the silent WAV blob (revoked on cleanup)
  let mediaRecorder   = null;
  let writableStream  = null;   // FSA writable
  let savedFileHandle = null;   // FSA file handle (for open-in-new-tab after stop)
  let dirHandle       = null;   // FSA directory handle (persisted in IndexedDB)
  let idbDb           = null;   // IndexedDB database instance
  let animFrameId     = null;
  let drawIntervalId  = null;
  let timerIntervalId = null;
  let isRecording     = false;
  let isPaused        = false;
  // Duration tracking: wall-clock ms elapsed, accounting for pauses
  let recordingStartTime  = 0;   // Date.now() when recording/last-resume started
  let accumulatedDurationMs = 0; // ms accumulated before the current segment
  let pipPos          = 'bottom-left';

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
  const mimeDisplay = document.getElementById('mime-display');

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

  // ── Capability display ──────────────────────────────────────────────────────
  const mimeType = getSupportedMimeType();
  mimeDisplay.textContent = mimeType || '(none detected)';

  // ── Preferences (localStorage) ──────────────────────────────────────────────
  const PREFS = {
    sysAudio : 'captura-sysAudio',
    fps      : 'captura-fps',
    quality  : 'captura-quality',
    pipPos   : 'captura-pipPos',
    webcam   : 'captura-webcam',
    mic      : 'captura-mic',
  };

  function savePref(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  }

  function loadPref(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }

  // Restore non-device preferences immediately (no async enumeration needed)
  function restoreSimplePrefs() {
    const fps = loadPref(PREFS.fps);
    if (fps) fpsSel.value = fps;

    const quality = loadPref(PREFS.quality);
    if (quality) qualitySel.value = quality;

    const sysAudio = loadPref(PREFS.sysAudio);
    if (sysAudio !== null) sysAudioChk.checked = sysAudio === 'true';

    const pos = loadPref(PREFS.pipPos);
    if (pos) {
      pipPos = pos;
      document.querySelectorAll('.pip-corner-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.pos === pos);
      });
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

  // ── PiP position picker ─────────────────────────────────────────────────────
  document.querySelectorAll('.pip-corner-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pip-corner-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      pipPos = btn.dataset.pos;
      savePref(PREFS.pipPos, pipPos);
    });
  });

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
    } catch (err) {
      showAlert('Could not enumerate devices: ' + err.message, 'warning');
    }
  }

  if (hasGetDisplayMedia) {
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
    enumerateDevices();
  }

  // ── Canvas compositor ───────────────────────────────────────────────────────
  function compositeFrame() {
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);

    if (!isRecording) {
      // Placeholder
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = `${Math.round(W / 40)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Click "Start Recording" to begin', W / 2, H / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    } else {
      // Screen layer
      if (screenVid.readyState >= 2) {
        ctx.drawImage(screenVid, 0, 0, W, H);
      }

      // Webcam PiP
      if (webcamStream && webcamVid.readyState >= 2) {
        const pipW = Math.round(W / 4);
        const pipH = Math.round(H / 4);
        const marg = Math.round(W / 80);
        let px, py;

        if      (pipPos === 'top-left')     { px = marg;             py = marg; }
        else if (pipPos === 'top-right')    { px = W - pipW - marg;  py = marg; }
        else if (pipPos === 'bottom-right') { px = W - pipW - marg;  py = H - pipH - marg; }
        else                                { px = marg;             py = H - pipH - marg; } // bottom-left

        ctx.save();
        roundRect(px, py, pipW, pipH, 8);
        ctx.clip();
        ctx.drawImage(webcamVid, px, py, pipW, pipH);
        ctx.restore();

        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth   = 2;
        roundRect(px, py, pipW, pipH, 8);
        ctx.stroke();
      }

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
    if (animFrameId)    { cancelAnimationFrame(animFrameId); animFrameId = null; }
    if (drawIntervalId) { clearInterval(drawIntervalId);     drawIntervalId = null; }
  }

  // fps=0 → rAF (preview, throttled in background — fine when not recording)
  // fps>0 → setInterval (recording, must keep running in background tabs)
  function startCompositor(fps) {
    stopCompositor();
    if (fps > 0) {
      drawIntervalId = setInterval(compositeFrame, Math.round(1000 / fps));
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
      src.connect(audioDestNode);
    }

    if (micMStream) {
      const src = audioCtx.createMediaStreamSource(micMStream);
      src.connect(audioDestNode);
    }

    return audioDestNode.stream;
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
      if (mediaRecorder && mediaRecorder.state === 'paused') resumeRecording();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') pauseRecording();
    });
    navigator.mediaSession.setActionHandler('stop', () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') stopRecording();
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
    clearAlert();

    if (!hasGetDisplayMedia) {
      showAlert(
        'Screen recording is not supported on this device. ' +
        'Mobile browsers cannot access the device screen due to security sandbox restrictions. ' +
        'Please use a desktop browser (Chrome, Edge, or Firefox).',
        'warning'
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

      // 2 — Webcam
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
      const hasMic         = !!(micStream && micStream.getAudioTracks().length);
      const hasAudio       = sysAudioTracks.length > 0 || hasMic;

      let mixedAudioTracks = [];
      if (hasAudio) {
        const mixedStream = buildAudioMix(sysAudioTracks, micStream);
        mixedAudioTracks  = mixedStream.getAudioTracks();
      }

      // 5 — Canvas stream + audio
      const fps          = parseInt(fpsSel.value);
      const canvasStream = canvas.captureStream(fps);
      mixedAudioTracks.forEach(t => canvasStream.addTrack(t));

      // 6 — Output: File System Access API (directory-based)
      const ext = 'webm';

      const dirOk = await ensureDirectoryAccess();
      if (!dirOk) { cleanup(); return; }

      try {
        const fileHandle = await dirHandle.getFileHandle(
          `recording-${dateStamp()}.${ext}`, { create: true }
        );
        writableStream  = await fileHandle.createWritable();
        savedFileHandle = fileHandle;
      } catch (pickErr) {
        showAlert('Could not create recording file: ' + pickErr.message, 'danger');
        cleanup();
        return;
      }

      // 7 — MediaRecorder
      mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: videoBitrate()
      });

      mediaRecorder.ondataavailable = async (e) => {
        if (!e.data || e.data.size === 0) return;
        await writableStream.write(e.data);
      };

      mediaRecorder.onstop = async () => {
        await writableStream.close();
        writableStream = null;

        // Calculate total recording duration in ms (accounting for pauses).
        // accumulatedDurationMs is finalized by stopRecording() before .stop() is called.
        const finalDurationMs = accumulatedDurationMs;

        const handle = savedFileHandle;
        savedFileHandle = null;

        // Patch the WebM header to inject accurate duration metadata.
        // Only the first 100 KB (which safely contains the full EBML header)
        // is read into RAM; the rest of the file is never loaded.
        if (handle) {
          try {
            const file       = await handle.getFile();
            const headerBlob = file.slice(0, WEBM_HEADER_MAX_BYTES);
            const buffer     = await headerBlob.arrayBuffer();
            const patched    = patchWebMDuration(buffer, finalDurationMs);

            // Seek-and-overwrite only the header — keepExistingData prevents truncation
            const patchStream = await handle.createWritable({ keepExistingData: true });
            await patchStream.seek(0);
            await patchStream.write(patched);
            await patchStream.close();
          } catch (patchErr) {
            // Duration patching is best-effort; the file is still valid without it
            console.warn('Failed to patch WebM duration:', patchErr);
          }
        }

        // Build success alert with an open-in-new-tab link
        const msg = document.createDocumentFragment();
        msg.append('Recording saved to disk. ');
        if (handle) {
          try {
            const file = await handle.getFile();
            const url  = URL.createObjectURL(file);
            const link = Object.assign(document.createElement('a'), {
              href: url, target: '_blank', rel: 'noopener noreferrer',
              textContent: 'Open in new tab'
            });
            msg.append(link);
            // Revoke the blob URL when the tab navigates away or after 5 minutes
            setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_REVOKE_TIMEOUT_MS);
            window.addEventListener('beforeunload', () => URL.revokeObjectURL(url), { once: true });
          } catch (_) {
            // getFile() may fail if the user moved/deleted the file; skip the link
          }
        }
        showAlert(msg, 'success');
        cleanup();
      };

      // Stop if the user ends the screen-share from the browser UI
      // 'ended' listener is already set up in ensureStreamActive(); no duplicate needed here.

      // Emit chunks every second so we can stream to disk incrementally
      mediaRecorder.start(1000);
      isRecording = true;

      // Activate Media Session API so hardware media keys can control the recording
      startSilentAudio();
      setupMediaSession();
      if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';

      // Switch compositor to setInterval so it keeps running when the tab is hidden
      startCompositor(fps);

      accumulatedDurationMs = 0;
      recordingStartTime    = Date.now();
      timerEl.textContent = '00:00';
      timerIntervalId = setInterval(() => {
        const totalMs = accumulatedDurationMs + (Date.now() - recordingStartTime);
        timerEl.textContent = fmtTime(Math.floor(totalMs / 1000));
      }, 1000);

      setUIState('recording');
    } catch (err) {
      if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
        showAlert('Error starting recording: ' + err.message, 'danger');
      }
      cleanup();
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      // Finalize duration before stopping: if currently recording (not paused),
      // add the time since the last resume/start to the accumulator.
      if (!isPaused) {
        accumulatedDurationMs += Date.now() - recordingStartTime;
      }
      mediaRecorder.stop();
    }
    isRecording = false;
    isPaused    = false;
    if (navigator.mediaSession) navigator.mediaSession.playbackState = 'none';
    clearInterval(timerIntervalId);
    setUIState(masterStream && masterStream.active ? 'session' : 'idle');
  }

  function pauseRecording() {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
    mediaRecorder.pause();
    isPaused = true;
    // Accumulate elapsed time before the pause
    accumulatedDurationMs += Date.now() - recordingStartTime;
    stopCompositor();
    clearInterval(timerIntervalId);
    if (navigator.mediaSession) navigator.mediaSession.playbackState = 'paused';
    if (silentAudioEl) silentAudioEl.pause();
    setUIState('paused');
  }

  function resumeRecording() {
    if (!mediaRecorder || mediaRecorder.state !== 'paused') return;
    mediaRecorder.resume();
    isPaused = false;
    recordingStartTime = Date.now(); // restart wall-clock for this segment
    startCompositor(parseInt(fpsSel.value, 10));
    timerIntervalId = setInterval(() => {
      const totalMs = accumulatedDurationMs + (Date.now() - recordingStartTime);
      timerEl.textContent = fmtTime(Math.floor(totalMs / 1000));
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
    if (silentAudioEl) {
      silentAudioEl.pause();
      if (silentAudioEl.parentNode) silentAudioEl.parentNode.removeChild(silentAudioEl);
      silentAudioEl = null;
    }
    if (silentAudioUrl) { URL.revokeObjectURL(silentAudioUrl); silentAudioUrl = null; }
    webcamVid.srcObject = null;
    isRecording = false;
    isPaused    = false;

    // Return compositor to preview (rAF) mode
    startCompositor(0);
  }

  // Tears down the persistent screen stream and resets all state to idle.
  function endSession() {
    if (isRecording) stopRecording();

    if (masterStream) {
      masterStream.getTracks().forEach(t => t.stop());
      masterStream = null;
    }

    screenVid.srcObject = null;
    cleanup();
    clearMediaSession();
    setUIState('idle');
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function getSupportedMimeType() {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];
    return candidates.find(t => MediaRecorder.isTypeSupported(t)) || '';
  }

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
    stopBtn.disabled        = !active;
    endSessionBtn.disabled  = !session;
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

  function clearAlert() { alertBox.hidden = true; }

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
        showAlert('Could not select folder: ' + err.message, 'warning');
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
          showAlert('Could not select a save folder: ' + err.message, 'warning');
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
      showAlert(
        'Write permission for the save folder was denied. ' +
        'Please choose a different folder with the "Choose Folder" button.',
        'warning'
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
  sysAudioChk.addEventListener('change', () => savePref(PREFS.sysAudio, sysAudioChk.checked));
  webcamSel  .addEventListener('change', () => savePref(PREFS.webcam,   webcamSel.value));
  micSel     .addEventListener('change', () => savePref(PREFS.mic,      micSel.value));

  // Kick off the compositor loop (preview mode) and initialise IndexedDB
  startCompositor(0);
  if (hasFSA) initDB();

})();
