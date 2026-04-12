// ── audio-mixer.js ────────────────────────────────────────────────────────────
// The Audio Engine: everything related to the AudioContext.
// Responsibilities:
//   • Mix system audio + microphone through GainNodes and AnalyserNodes.
//   • Drive the green/yellow/red RMS level-meter canvases.
//   • Start/stop the silent WAV loop that opens a macOS Core Audio session so
//     the Media Session API and hardware media keys function correctly.
//   • Manage a lightweight preview AudioContext for mic/sys metering outside
//     of an active recording.

export class AudioMixer {
  // ── Private fields ──────────────────────────────────────────────────────────

  // Recording audio graph
  #audioCtx      = null;
  #audioDestNode = null;
  #micGainNode   = null;
  #sysGainNode   = null;
  #micAnalyser   = null;
  #sysAnalyser   = null;

  // macOS Core Audio / Media Session workaround
  #silentAudioEl  = null;
  #silentAudioUrl = null;

  // Preview audio (mic/sys metering before/between recordings)
  #previewAudioCtx    = null;
  #previewMicAnalyser = null;
  #previewSysAnalyser = null;
  #previewMicStream   = null;

  // Level-meter animation
  #meterRafId     = null;
  #micLevelCanvas = null;
  #sysLevelCanvas = null;

  // ── Constructor ─────────────────────────────────────────────────────────────

  constructor(micLevelCanvas, sysLevelCanvas) {
    this.#micLevelCanvas = micLevelCanvas;
    this.#sysLevelCanvas = sysLevelCanvas;
  }

  // ── Public getters ──────────────────────────────────────────────────────────

  get micAnalyser() { return this.#micAnalyser; }
  get sysAnalyser() { return this.#sysAnalyser; }

  // ── Audio mixing ─────────────────────────────────────────────────────────────

  // Builds the recording audio graph from the provided tracks and returns the
  // final mixed MediaStream. Starts the level-meter animation automatically.
  buildMix(sysAudioTracks, micStream, micGainValue, sysGainValue) {
    this.#audioCtx      = new AudioContext();
    this.#audioDestNode = this.#audioCtx.createMediaStreamDestination();

    if (sysAudioTracks.length > 0) {
      const src = this.#audioCtx.createMediaStreamSource(new MediaStream(sysAudioTracks));
      this.#sysGainNode = this.#audioCtx.createGain();
      this.#sysGainNode.gain.value = sysGainValue;
      this.#sysAnalyser = this.#audioCtx.createAnalyser();
      this.#sysAnalyser.fftSize = 512;
      this.#sysAnalyser.smoothingTimeConstant = 0.75;
      src.connect(this.#sysGainNode);
      this.#sysGainNode.connect(this.#sysAnalyser);
      this.#sysAnalyser.connect(this.#audioDestNode);
    }

    if (micStream) {
      const src = this.#audioCtx.createMediaStreamSource(micStream);
      this.#micGainNode = this.#audioCtx.createGain();
      this.#micGainNode.gain.value = micGainValue;
      this.#micAnalyser = this.#audioCtx.createAnalyser();
      this.#micAnalyser.fftSize = 512;
      this.#micAnalyser.smoothingTimeConstant = 0.75;
      src.connect(this.#micGainNode);
      this.#micGainNode.connect(this.#micAnalyser);
      this.#micAnalyser.connect(this.#audioDestNode);
    }

    this.startMeterAnimation();
    return this.#audioDestNode.stream;
  }

  // Live gain control — callable while a recording is active.
  setMicGain(value) { if (this.#micGainNode) this.#micGainNode.gain.value = value; }
  setSysGain(value) { if (this.#sysGainNode) this.#sysGainNode.gain.value = value; }

  // Tears down the recording audio graph (called after recording stops).
  // Preview state is intentionally left intact.
  teardownMix() {
    if (this.#audioCtx) { this.#audioCtx.close(); this.#audioCtx = null; }
    this.#micGainNode = this.#sysGainNode = null;
    this.#micAnalyser = this.#sysAnalyser = null;
  }

  // ── macOS Core Audio / Media Session workaround ──────────────────────────────

  // Chrome opens a Core Audio session only when a finite, looping audio file
  // plays with volume > 0. A MediaStream srcObject (live/infinite) does not
  // trigger the OS audio session or the Media Session UI. We build a minimal
  // 100 ms silent PCM WAV in memory and play it looped at −60 dBFS (inaudible)
  // to satisfy that requirement. Must be called inside a user-gesture chain.
  startSilentAudio() {
    const rate = 8000, numSamples = rate / 10; // 100 ms @ 8 kHz
    const buf  = new ArrayBuffer(44 + numSamples);
    const d    = new DataView(buf);
    const str  = (off, s) => { for (let i = 0; i < s.length; i++) d.setUint8(off + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); d.setUint32(4, 36 + numSamples, true);
    str(8, 'WAVE'); str(12, 'fmt '); d.setUint32(16, 16, true);
    d.setUint16(20, 1, true);          // PCM
    d.setUint16(22, 1, true);          // mono
    d.setUint32(24, rate, true);       // sample rate
    d.setUint32(28, rate, true);       // byte rate
    d.setUint16(32, 1, true);          // block align
    d.setUint16(34, 8, true);          // 8-bit
    str(36, 'data'); d.setUint32(40, numSamples, true);
    for (let i = 0; i < numSamples; i++) d.setUint8(44 + i, 128); // 128 = silence (unsigned midpoint)

    this.#silentAudioUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
    this.#silentAudioEl  = Object.assign(new Audio(), {
      src: this.#silentAudioUrl, loop: true, volume: 0.001,
    });
    document.body.appendChild(this.#silentAudioEl);
    this.#silentAudioEl.play().catch(() => {});
  }

  pauseSilentAudio()  { this.#silentAudioEl?.pause(); }
  resumeSilentAudio() { this.#silentAudioEl?.play().catch(() => {}); }

  stopSilentAudio() {
    if (this.#silentAudioEl) {
      this.#silentAudioEl.pause();
      this.#silentAudioEl.parentNode?.removeChild(this.#silentAudioEl);
      this.#silentAudioEl = null;
    }
    if (this.#silentAudioUrl) { URL.revokeObjectURL(this.#silentAudioUrl); this.#silentAudioUrl = null; }
  }

  // ── Level meters ─────────────────────────────────────────────────────────────

  // Draws a green/yellow/red RMS bar on a canvas for one audio channel.
  #drawMeter(analyser, mCanvas) {
    const mCtx = mCanvas.getContext('2d');
    const W = mCanvas.width, H = mCanvas.height;
    mCtx.fillStyle = '#1e1e1e';
    mCtx.fillRect(0, 0, W, H);
    if (!analyser) return;

    const buf = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buf);

    // Compute RMS; samples are unsigned 8-bit where 128 = silence
    let sum = 0;
    for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
    const level  = Math.min(1, Math.sqrt(sum / buf.length) * 8); // scale so speech is visible
    const filled = level * W;
    const greenEnd = W * 0.70, yellowEnd = W * 0.85;

    if (filled > 0)         { mCtx.fillStyle = '#22c55e'; mCtx.fillRect(0,         0, Math.min(filled, greenEnd),                       H); }
    if (filled > greenEnd)  { mCtx.fillStyle = '#eab308'; mCtx.fillRect(greenEnd,  0, Math.min(filled - greenEnd, yellowEnd - greenEnd), H); }
    if (filled > yellowEnd) { mCtx.fillStyle = '#ef4444'; mCtx.fillRect(yellowEnd, 0, filled - yellowEnd,                                H); }
  }

  // Prefer recording analysers; fall back to preview analysers.
  startMeterAnimation() {
    this.stopMeterAnimation();
    const tick = () => {
      const micAn = this.#micAnalyser || this.#previewMicAnalyser;
      const sysAn = this.#sysAnalyser || this.#previewSysAnalyser;
      if (!micAn && !sysAn) {
        [this.#micLevelCanvas, this.#sysLevelCanvas].forEach(c => {
          const mCtx = c.getContext('2d');
          mCtx.fillStyle = '#1e1e1e';
          mCtx.fillRect(0, 0, c.width, c.height);
        });
        return; // stop animation loop — nothing to visualise
      }
      this.#drawMeter(micAn, this.#micLevelCanvas);
      this.#drawMeter(sysAn, this.#sysLevelCanvas);
      this.#meterRafId = requestAnimationFrame(tick);
    };
    tick();
  }

  stopMeterAnimation() {
    if (this.#meterRafId) { cancelAnimationFrame(this.#meterRafId); this.#meterRafId = null; }
  }

  // ── Preview audio metering ───────────────────────────────────────────────────

  // Shows the mic level meter before/between recordings so the user can verify
  // input levels without starting a capture session.
  // isActive = (isRecording || isPaused) — preview is skipped when a recording
  // is live because the recording audio graph already drives the meters.
  async startMicPreview(micDeviceId, isActive) {
    this.#stopPreviewMicStream();
    this.#previewMicAnalyser = null;
    if (isActive || !micDeviceId) return;

    try {
      const constraint = { deviceId: { exact: micDeviceId }, echoCancellation: false };
      this.#previewMicStream = await navigator.mediaDevices.getUserMedia({ audio: constraint, video: false });

      if (!this.#previewAudioCtx || this.#previewAudioCtx.state === 'closed') {
        this.#previewAudioCtx = new AudioContext();
      }
      const src = this.#previewAudioCtx.createMediaStreamSource(this.#previewMicStream);
      this.#previewMicAnalyser = this.#previewAudioCtx.createAnalyser();
      this.#previewMicAnalyser.fftSize = 512;
      this.#previewMicAnalyser.smoothingTimeConstant = 0.75;
      src.connect(this.#previewMicAnalyser);
      this.startMeterAnimation();
    } catch (_) {
      // Preview metering is optional — silently ignore permission errors, etc.
      this.#previewMicStream = this.#previewMicAnalyser = null;
    }
  }

  stopMicPreview() {
    this.#stopPreviewMicStream();
    this.#previewMicAnalyser = null;
    if (this.#previewAudioCtx && !this.#previewSysAnalyser) {
      this.#previewAudioCtx.close().catch(() => {});
      this.#previewAudioCtx = null;
    }
  }

  startSysPreview(tracks) {
    this.#previewSysAnalyser = null;
    if (!tracks?.length) return;

    if (!this.#previewAudioCtx || this.#previewAudioCtx.state === 'closed') {
      this.#previewAudioCtx = new AudioContext();
    }
    const src = this.#previewAudioCtx.createMediaStreamSource(new MediaStream(tracks));
    this.#previewSysAnalyser = this.#previewAudioCtx.createAnalyser();
    this.#previewSysAnalyser.fftSize = 512;
    this.#previewSysAnalyser.smoothingTimeConstant = 0.75;
    src.connect(this.#previewSysAnalyser);
    this.startMeterAnimation();
  }

  stopSysPreview() {
    this.#previewSysAnalyser = null;
    if (this.#previewAudioCtx && !this.#previewMicAnalyser) {
      this.#previewAudioCtx.close().catch(() => {});
      this.#previewAudioCtx = null;
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  #stopPreviewMicStream() {
    if (this.#previewMicStream) {
      this.#previewMicStream.getTracks().forEach(t => t.stop());
      this.#previewMicStream = null;
    }
  }
}
