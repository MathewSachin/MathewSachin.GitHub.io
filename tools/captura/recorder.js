(function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────────────
  const DEFAULT_WIDTH  = 1280;
  const DEFAULT_HEIGHT = 720;
  const VIDEO_READY_TIMEOUT_MS      = 3000;
  const BLOB_URL_REVOKE_TIMEOUT_MS  = 5 * 60 * 1000; // 5 minutes

  // ── State ───────────────────────────────────────────────────────────────────
  let screenStream    = null;
  let webcamStream    = null;
  let micStream       = null;
  let audioCtx        = null;
  let audioDestNode   = null;
  let mediaRecorder   = null;
  let writableStream  = null;   // FSA writable
  let savedFileHandle = null;   // FSA file handle (for open-in-new-tab after stop)
  let animFrameId     = null;
  let drawIntervalId  = null;
  let timerIntervalId = null;
  let elapsedSecs     = 0;
  let isRecording     = false;
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
  const stopBtn     = document.getElementById('stop-btn');
  const statusBadge = document.getElementById('status-badge');
  const timerEl     = document.getElementById('timer-text');
  const alertBox    = document.getElementById('alert-box');
  const mimeDisplay = document.getElementById('mime-display');

  // ── Mobile / capability check ────────────────────────────────────────────────
  const hasGetDisplayMedia = !!(navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function');
  const hasFSA = typeof window.showSaveFilePicker === 'function';

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

  // ── Capability display ──────────────────────────────────────────────────────
  const mimeType = getSupportedMimeType();
  mimeDisplay.textContent = mimeType || '(none detected)';

  // ── PiP position picker ─────────────────────────────────────────────────────
  document.querySelectorAll('.pip-corner-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pip-corner-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      pipPos = btn.dataset.pos;
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

  // ── Recording ────────────────────────────────────────────────────────────────
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
      // 1 — Screen capture
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: parseInt(fpsSel.value) },
          ...resolutionConstraints()
        },
        audio: sysAudioChk.checked
      });

      screenVid.srcObject = screenStream;
      await screenVid.play();

      // Resize canvas to actual captured dimensions
      const videoTracks = screenStream.getVideoTracks();
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
      const sysAudioTracks = screenStream.getAudioTracks();
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

      // 6 — Output: File System Access API (required)
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';

      if (typeof window.showSaveFilePicker !== 'function') {
        showAlert(
          'Your browser does not support the File System Access API. ' +
          'Please use Chrome or Edge to record.',
          'danger'
        );
        cleanup();
        return;
      }

      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: `recording-${dateStamp()}.${ext}`,
          types: [{
            description: 'Video file',
            accept: { [mimeType.split(';')[0]]: ['.' + ext] }
          }]
        });
        writableStream  = await fileHandle.createWritable();
        savedFileHandle = fileHandle;
      } catch (pickErr) {
        if (pickErr.name === 'AbortError') { cleanup(); return; }
        showAlert('Could not open save file: ' + pickErr.message, 'danger');
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

        // Build success alert with an open-in-new-tab link
        const handle = savedFileHandle;
        savedFileHandle = null;
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
      const firstVideoTrack = screenStream.getVideoTracks()[0];
      if (firstVideoTrack) {
        firstVideoTrack.addEventListener('ended', () => {
          if (isRecording) stopRecording();
        });
      }

      // Emit chunks every second so we can stream to disk incrementally
      mediaRecorder.start(1000);
      isRecording = true;

      // Switch compositor to setInterval so it keeps running when the tab is hidden
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
        showAlert('Error starting recording: ' + err.message, 'danger');
      }
      cleanup();
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    isRecording = false;
    clearInterval(timerIntervalId);
    setUIState('idle');
  }

  function cleanup() {
    [screenStream, webcamStream, micStream].forEach(s => {
      if (s) s.getTracks().forEach(t => t.stop());
    });
    screenStream = webcamStream = micStream = null;

    if (audioCtx) { audioCtx.close(); audioCtx = null; }
    screenVid.srcObject = webcamVid.srcObject = null;
    isRecording = false;

    // Return compositor to preview (rAF) mode
    startCompositor(0);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function getSupportedMimeType() {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=h264,aac',
      'video/mp4'
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

  function setUIState(state) {
    const rec = state === 'recording';
    startBtn.disabled       = rec;
    stopBtn.disabled        = !rec;
    // Settings that cannot be changed mid-recording
    webcamSel.disabled      = rec;
    micSel.disabled         = rec;
    sysAudioChk.disabled    = rec;
    fpsSel.disabled         = rec;
    qualitySel.disabled     = rec;
    statusBadge.textContent = rec ? '⏺ Recording' : 'Idle';
    statusBadge.className   = rec ? 'badge bg-danger' : 'badge bg-secondary';
    if (!rec) timerEl.textContent = '00:00';
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

  // ── Bootstrap ───────────────────────────────────────────────────────────────
  startBtn.addEventListener('click', startRecording);
  stopBtn .addEventListener('click', stopRecording);

  // Kick off the compositor loop (preview mode)
  startCompositor(0);

})();
