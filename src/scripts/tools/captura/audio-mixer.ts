// @ts-nocheck
// ── audio-mixer.ts ────────────────────────────────────────────────────────────
// The Audio Engine: everything related to the AudioContext.
// Responsibilities:
//   • Mix system audio + microphone through GainNodes and AnalyserNodes.
//   • Drive the green/yellow/red RMS level-meter canvases.
//   • Start/stop the silent WAV loop that opens a macOS Core Audio session so
//     the Media Session API and hardware media keys function correctly.
//   • Manage a lightweight preview AudioContext for mic/sys metering outside
//     of an active recording.

export class AudioMixer {
  #audioCtx      = null;
  #audioDestNode = null;
  #micGainNode   = null;
  #sysGainNode   = null;
  #micAnalyser   = null;
  #sysAnalyser   = null;

  #silentAudioEl  = null;
  #silentAudioUrl = null;

  #previewAudioCtx    = null;
  #previewMicAnalyser = null;
  #previewSysAnalyser = null;
  #previewMicStream   = null;

  #meterRafId     = null;
  #micLevelCanvas = null;
  #sysLevelCanvas = null;

  constructor(micLevelCanvas, sysLevelCanvas) {
    this.#micLevelCanvas = micLevelCanvas;
    this.#sysLevelCanvas = sysLevelCanvas;
  }

  get micAnalyser() { return this.#micAnalyser; }
  get sysAnalyser() { return this.#sysAnalyser; }

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

  setMicGain(value) { if (this.#micGainNode) this.#micGainNode.gain.value = value; }
  setSysGain(value) { if (this.#sysGainNode) this.#sysGainNode.gain.value = value; }

  teardownMix() {
    if (this.#audioCtx) { this.#audioCtx.close(); this.#audioCtx = null; }
    this.#micGainNode = this.#sysGainNode = null;
    this.#micAnalyser = this.#sysAnalyser = null;
  }

  startSilentAudio() {
    const rate = 8000, numSamples = rate / 10; // 100 ms @ 8 kHz
    const buf  = new ArrayBuffer(44 + numSamples);
    const d    = new DataView(buf);
    const str  = (off, s) => { for (let i = 0; i < s.length; i++) d.setUint8(off + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); d.setUint32(4, 36 + numSamples, true);
    str(8, 'WAVE'); str(12, 'fmt '); d.setUint32(16, 16, true);
    d.setUint16(20, 1, true);
    d.setUint16(22, 1, true);
    d.setUint32(24, rate, true);
    d.setUint32(28, rate, true);
    d.setUint16(32, 1, true);
    d.setUint16(34, 8, true);
    str(36, 'data'); d.setUint32(40, numSamples, true);
    for (let i = 0; i < numSamples; i++) d.setUint8(44 + i, 128);

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

  #drawMeter(analyser, mCanvas) {
    const mCtx = mCanvas.getContext('2d');
    const W = mCanvas.width, H = mCanvas.height;
    mCtx.fillStyle = '#1e1e1e';
    mCtx.fillRect(0, 0, W, H);
    if (!analyser) return;

    const buf = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buf);

    let sum = 0;
    for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
    const level  = Math.min(1, Math.sqrt(sum / buf.length) * 8);
    const filled = level * W;
    const greenEnd = W * 0.70, yellowEnd = W * 0.85;

    if (filled > 0)         { mCtx.fillStyle = '#22c55e'; mCtx.fillRect(0,         0, Math.min(filled, greenEnd),                       H); }
    if (filled > greenEnd)  { mCtx.fillStyle = '#eab308'; mCtx.fillRect(greenEnd,  0, Math.min(filled - greenEnd, yellowEnd - greenEnd), H); }
    if (filled > yellowEnd) { mCtx.fillStyle = '#ef4444'; mCtx.fillRect(yellowEnd, 0, filled - yellowEnd,                                H); }
  }

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
        return;
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

  #stopPreviewMicStream() {
    if (this.#previewMicStream) {
      this.#previewMicStream.getTracks().forEach(t => t.stop());
      this.#previewMicStream = null;
    }
  }
}
