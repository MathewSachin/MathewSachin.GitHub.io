// ── recorder-api.js ───────────────────────────────────────────────────────────
// The Media / Encoder API layer.
// All media acquisition, encoder lifecycle, and stream management live here.
// No DOM references — receives engine instances at construction time and all
// configuration values via method parameters.

import { dateStamp } from './storage.js';

const DEFAULT_WIDTH  = 1280;
const DEFAULT_HEIGHT = 720;
const FORMAT_MP4     = 'mp4-h264-aac';

const RESOLUTION_CONSTRAINTS = {
  '480':  { width: { ideal: 854  }, height: { ideal: 480  } },
  '720':  { width: { ideal: 1280 }, height: { ideal: 720  } },
  '1080': { width: { ideal: 1920 }, height: { ideal: 1080 } },
};

const VIDEO_BITRATES = { '480': 2_000_000, '720': 4_000_000, '1080': 8_000_000 };

export class RecorderAPI {
  // Engine instances (injected at construction time)
  #compositor;
  #audioMixer;
  #metronome;
  #recorderCore;
  #storage;
  #canvas;

  // Active streams / file handles
  #masterStream        = null;
  #webcamStream        = null;
  #micStream           = null;
  #previewWebcamStream = null;
  #writableStream      = null;
  #savedFileHandle     = null;

  // Recording timing
  #recordingStartTime = 0;
  #totalPausedMs      = 0;
  #pauseStartTime     = 0;

  // Stored device selection for preview restarts (updated via setDevices)
  #webcamDeviceId = '';
  #webcamSelected = false;
  #micDeviceId    = '';
  #micSelected    = false;

  // Called when the screen-share track ends via the native "Stop Sharing" button.
  onStreamEnded = null;

  constructor({ compositor, audioMixer, metronome, recorderCore, storage, canvas }) {
    this.#compositor   = compositor;
    this.#audioMixer   = audioMixer;
    this.#metronome    = metronome;
    this.#recorderCore = recorderCore;
    this.#storage      = storage;
    this.#canvas       = canvas;
  }

  // ── Public getters ────────────────────────────────────────────────────────

  // True when a screen-share session is currently alive.
  get hasSession() {
    return !!(this.#masterStream?.active &&
              this.#masterStream.getVideoTracks()[0]?.readyState === 'live');
  }

  // ── Device configuration ──────────────────────────────────────────────────

  // Update stored device IDs so restartPreviews() uses the latest selection.
  setDevices({ webcamDeviceId, webcamSelected, micDeviceId, micSelected }) {
    this.#webcamDeviceId = webcamDeviceId;
    this.#webcamSelected = webcamSelected;
    this.#micDeviceId    = micDeviceId;
    this.#micSelected    = micSelected;
  }

  // ── Main recording setup ──────────────────────────────────────────────────

  // Acquires all streams and initialises the encoder pipeline in one shot.
  // Throws on failure; err.name distinguishes user-cancel from other errors.
  async acquireAndInit({ fps, quality, format, wantSysAudio,
                         webcamSelected, webcamDeviceId,
                         micSelected, micDeviceId,
                         micGain, sysGain }) {
    // 1 — Screen stream (reused when still live from a previous recording)
    if (!this.hasSession) {
      this.#masterStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: parseInt(fps, 10) },
          ...(RESOLUTION_CONSTRAINTS[quality] ?? {}),
        },
        audio: { systemAudio: 'include' },
        surfaceSwitching: 'include',
      });
      this.#masterStream.getVideoTracks()[0]?.addEventListener(
        'ended',
        () => { this.#masterStream = null; this.onStreamEnded?.(); },
        { once: true }
      );
    }

    this.#compositor.screenVid.srcObject = this.#masterStream;
    await this.#compositor.screenVid.play().catch(() => {});

    const settings      = this.#masterStream.getVideoTracks()[0]?.getSettings() ?? {};
    this.#canvas.width  = settings.width  || DEFAULT_WIDTH;
    this.#canvas.height = settings.height || DEFAULT_HEIGHT;

    // 2 — Webcam (stop any existing preview first to release the camera)
    this.#stopWebcamPreview();
    if (webcamSelected) {
      const constraint = webcamDeviceId ? { deviceId: { exact: webcamDeviceId } } : true;
      this.#webcamStream = await navigator.mediaDevices.getUserMedia(
        { video: constraint, audio: false }
      );
      this.#compositor.webcamStream        = this.#webcamStream;
      this.#compositor.webcamVid.srcObject = this.#webcamStream;
      await this.#compositor.webcamVid.play().catch(() => {});
      await this.#compositor.waitForVideoReady(this.#compositor.webcamVid);
    }

    // 3 — Microphone
    if (micSelected) {
      const constraint = micDeviceId
        ? { deviceId: { exact: micDeviceId }, echoCancellation: true }
        : { echoCancellation: true };
      this.#micStream = await navigator.mediaDevices.getUserMedia(
        { audio: constraint, video: false }
      );
    }

    // 4 — Validate system audio availability
    const sysAudioTracks = this.#masterStream.getAudioTracks();
    if (wantSysAudio && sysAudioTracks.length === 0) {
      this.#releaseNonScreenStreams();
      const err = new Error(
        'System audio was not captured. In the browser share dialog, make sure to enable ' +
        '"Share system audio" (or "Share tab audio"). ' +
        'Click "End Session" and try again, or uncheck "Capture system audio" to record without it.'
      );
      err.name  = 'SysAudioNotCaptured';
      err.title = 'System Audio Not Captured';
      throw err;
    }

    // 5 — Audio mix
    this.#audioMixer.stopMicPreview();
    this.#audioMixer.stopSysPreview();
    const hasMic    = !!(this.#micStream?.getAudioTracks().length);
    const hasAudio  = sysAudioTracks.length > 0 || hasMic;
    let mixedAudioTrack = null;
    if (hasAudio) {
      const mixed     = this.#audioMixer.buildMix(sysAudioTracks, this.#micStream, micGain, sysGain);
      mixedAudioTrack = mixed.getAudioTracks()[0] ?? null;
    }

    // 6 — Output file
    const dirOk = await this.#storage.ensureAccess();
    if (!dirOk) {
      this.#releaseNonScreenStreams();
      const err = new Error('Save folder access was not granted.');
      err.name = 'AbortError';
      throw err;
    }

    const ext        = format === FORMAT_MP4 ? 'mp4' : 'webm';
    const fileHandle = await this.#storage.dirHandle.getFileHandle(
      `recording-${dateStamp()}.${ext}`, { create: true }
    );
    this.#writableStream  = await fileHandle.createWritable();
    this.#savedFileHandle = fileHandle;

    // 7 — Encoder pipeline
    await this.#recorderCore.init({
      canvas:         this.#canvas,
      mixedAudioTrack,
      writableStream: this.#writableStream,
      isMp4:          format === FORMAT_MP4,
      videoBitrate:   VIDEO_BITRATES[quality] ?? 4_000_000,
    });
    await this.#recorderCore.start();
  }

  // ── Encoding controls ─────────────────────────────────────────────────────

  startEncoding(fps) {
    this.#compositor.isRecording = true;
    this.#recordingStartTime     = performance.now();
    this.#totalPausedMs          = 0;
    this.#audioMixer.startSilentAudio();
    this.#startLoop(fps);
  }

  pauseEncoding() {
    this.#pauseStartTime = performance.now();
    this.#metronome.stop();
    this.#recorderCore.pause();
    this.#audioMixer.pauseSilentAudio();
  }

  resumeEncoding(fps) {
    this.#totalPausedMs += performance.now() - this.#pauseStartTime;
    this.#recorderCore.resume();
    this.#audioMixer.resumeSilentAudio();
    this.#startLoop(fps);
  }

  // Stops the recording loop, flushes the encoder, closes the output file.
  // Returns the saved FileSystemFileHandle so the caller can show a toast link.
  async finalizeEncoding() {
    this.#compositor.isRecording = false;
    this.#metronome.stop();
    await this.#metronome.done;

    const handle          = this.#savedFileHandle;
    this.#savedFileHandle = null;

    await this.#recorderCore.finalize();
    this.#writableStream = null;

    this.#releaseNonScreenStreams();
    return handle;
  }

  // ── Session / cleanup ─────────────────────────────────────────────────────

  // Stops the screen-share stream and clears the compositor video source.
  // Does NOT restart previews — callers handle that separately.
  endSession() {
    this.#masterStream?.getTracks().forEach(t => t.stop());
    this.#masterStream = null;
    this.#compositor.screenVid.srcObject = null;
  }

  // Releases all resources (streams, encoder, audio) on error paths.
  // Leaves the screen-share session alive so hasSession reflects its state.
  cleanupAll() {
    this.#compositor.isRecording = false;
    this.#metronome.stop();
    try { this.#writableStream?.close(); } catch (_) {}
    this.#writableStream  = null;
    this.#savedFileHandle = null;
    this.#releaseNonScreenStreams();
  }

  // Restarts the canvas preview loop and audio / webcam previews using the
  // device IDs most recently set via setDevices().
  restartPreviews() {
    this.#metronome.start(0, () => this.#compositor.drawFrame());
    this.#startWebcamPreview();
    this.#audioMixer.startMicPreview(this.#micDeviceId, false).catch(() => {});
    if (this.#masterStream?.active) {
      this.#audioMixer.startSysPreview(this.#masterStream.getAudioTracks());
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  #startLoop(fps) {
    const startTime = this.#recordingStartTime;
    const paused    = () => this.#totalPausedMs;
    this.#metronome.start(fps, async frameStart => {
      this.#compositor.drawFrame();
      await this.#recorderCore.addFrame((frameStart - startTime - paused()) / 1000);
    });
  }

  // Releases webcam + mic recording streams and tears down the audio graph.
  // Does not touch masterStream or preview webcam state.
  #releaseNonScreenStreams() {
    this.#stopWebcamPreview();
    [this.#webcamStream, this.#micStream].forEach(s => s?.getTracks().forEach(t => t.stop()));
    this.#webcamStream = this.#micStream = null;
    this.#compositor.webcamStream        = null;
    this.#compositor.webcamVid.srcObject = null;
    this.#audioMixer.teardownMix();
    this.#audioMixer.stopMeterAnimation();
    this.#audioMixer.stopSilentAudio();
  }

  #stopWebcamPreview() {
    if (this.#previewWebcamStream) {
      this.#previewWebcamStream.getTracks().forEach(t => t.stop());
      this.#previewWebcamStream = null;
    }
    this.#compositor.previewWebcamStream = null;
    if (!this.#webcamStream) this.#compositor.webcamVid.srcObject = null;
  }

  #startWebcamPreview() {
    this.#stopWebcamPreview();
    if (!this.#webcamSelected) return;
    const constraint = this.#webcamDeviceId ? { deviceId: { exact: this.#webcamDeviceId } } : true;
    navigator.mediaDevices.getUserMedia({ video: constraint, audio: false })
      .then(async stream => {
        this.#previewWebcamStream            = stream;
        this.#compositor.previewWebcamStream = stream;
        this.#compositor.webcamVid.srcObject = stream;
        await this.#compositor.webcamVid.play().catch(() => {});
      })
      .catch(() => {
        this.#previewWebcamStream            = null;
        this.#compositor.previewWebcamStream = null;
      });
  }
}
