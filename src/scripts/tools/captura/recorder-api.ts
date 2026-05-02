// ── recorder-api.ts ─────────────────────────────────────────────────────────
import { dateStamp } from './storage.js';
import type { Compositor } from './compositor.js';
import type { AudioMixer } from './audio-mixer.js';
import type { Metronome } from './metronome.js';
import type { RecorderCore } from './recorder-core.js';
import type { StorageManager } from './storage.js';

const DEFAULT_WIDTH  = 1280;
const DEFAULT_HEIGHT = 720;
const FORMAT_MP4     = 'mp4-h264-aac';

const RESOLUTION_CONSTRAINTS: Record<string, MediaTrackConstraints> = {
  '480':  { width: { ideal: 854  }, height: { ideal: 480  } },
  '720':  { width: { ideal: 1280 }, height: { ideal: 720  } },
  '1080': { width: { ideal: 1920 }, height: { ideal: 1080 } },
};

const VIDEO_BITRATES: Record<string, number> = { '480': 2_000_000, '720': 4_000_000, '1080': 8_000_000 };

export class RecorderAPI {
  #compositor: Compositor;
  #audioMixer: AudioMixer;
  #metronome: Metronome;
  #recorderCore: RecorderCore;
  #storage: StorageManager;
  #canvas: HTMLCanvasElement;

  #masterStream: MediaStream | null = null;
  #webcamStream: MediaStream | null = null;
  #micStream: MediaStream | null = null;
  #previewWebcamStream: MediaStream | null = null;
  #writableStream: FileSystemWritableFileStream | null = null;
  #savedFileHandle: FileSystemFileHandle | null = null;

  #recordingStartTime = 0;
  #totalPausedMs = 0;
  #pauseStartTime = 0;

  #webcamDeviceId = '';
  #webcamSelected = false;
  #micDeviceId = '';
  #micSelected = false;

  get micSelected() { return this.#micSelected; }

  onStreamEnded?: () => void;

  constructor({ compositor, audioMixer, metronome, recorderCore, storage, canvas }: {
    compositor: Compositor;
    audioMixer: AudioMixer;
    metronome: Metronome;
    recorderCore: RecorderCore;
    storage: StorageManager;
    canvas: HTMLCanvasElement;
  }) {
    this.#compositor = compositor;
    this.#audioMixer = audioMixer;
    this.#metronome = metronome;
    this.#recorderCore = recorderCore;
    this.#storage = storage;
    this.#canvas = canvas;
  }

  get hasSession() {
    return !!(this.#masterStream?.active &&
              this.#masterStream.getVideoTracks()[0]?.readyState === 'live');
  }

  setDevices({ webcamDeviceId, webcamSelected, micDeviceId, micSelected }: { webcamDeviceId: string; webcamSelected: boolean; micDeviceId: string; micSelected: boolean; }) {
    this.#webcamDeviceId = webcamDeviceId;
    this.#webcamSelected = webcamSelected;
    this.#micDeviceId    = micDeviceId;
    this.#micSelected    = micSelected;
  }

  async acquireAndInit({ fps, quality, format, wantSysAudio,
                         webcamSelected, webcamDeviceId,
                         micSelected, micDeviceId,
                         micGain, sysGain }: { fps: string; quality: string; format: string; wantSysAudio: boolean; webcamSelected: boolean; webcamDeviceId?: string; micSelected: boolean; micDeviceId?: string; micGain: number; sysGain: number; }) {
    if (!this.hasSession) {
      this.#masterStream = await navigator.mediaDevices.getDisplayMedia(({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: parseInt(fps, 10) },
          ...( RESOLUTION_CONSTRAINTS[quality] ?? {} ),
        },
        audio: { /* systemAudio intentionally omitted for TS */ } as unknown as MediaTrackConstraints,
        surfaceSwitching: 'include',
        } as unknown as MediaStreamConstraints));
      this.#masterStream.getVideoTracks()[0]?.addEventListener(
        'ended',
        () => { this.#masterStream = null; this.onStreamEnded?.(); },
        { once: true }
      );
    }

    this.#compositor.screenVid.srcObject = this.#masterStream;
    await this.#compositor.screenVid.play().catch(() => {});

    const settings      = this.#masterStream?.getVideoTracks()[0]?.getSettings() ?? {};
    this.#canvas.width  = settings.width  || DEFAULT_WIDTH;
    this.#canvas.height = settings.height || DEFAULT_HEIGHT;

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

    if (micSelected) {
      const constraint = micDeviceId
        ? { deviceId: { exact: micDeviceId }, echoCancellation: true }
        : { echoCancellation: true };
      this.#micStream = await navigator.mediaDevices.getUserMedia(
        { audio: constraint, video: false }
      );
    }

    const sysAudioTracks = this.#masterStream?.getAudioTracks() ?? [];
    if (wantSysAudio && sysAudioTracks.length === 0) {
      this.#releaseNonScreenStreams();
      const err = new Error(
        'System audio was not captured. In the browser share dialog, make sure to enable ' +
        '"Share system audio" (or "Share tab audio"). ' +
        'Click "End Session" and try again, or uncheck "Capture system audio" to record without it.'
      );
      err.name  = 'SysAudioNotCaptured';
      const e = err as { title?: string } & Error;
      e.title = 'System Audio Not Captured';
      throw err;
    }

    this.#audioMixer.stopMicPreview();
    this.#audioMixer.stopSysPreview();
    const hasMic    = !!(this.#micStream?.getAudioTracks().length);
    const hasAudio  = sysAudioTracks.length > 0 || hasMic;
    let mixedAudioTrack: MediaStreamAudioTrack | null = null;
    if (hasAudio) {
      const mixed     = await this.#audioMixer.buildMix(sysAudioTracks, this.#micStream, micGain, sysGain);
      mixedAudioTrack = mixed.getAudioTracks()[0] ?? null;
    }

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

    await this.#recorderCore.init({
      canvas:         this.#canvas,
      mixedAudioTrack,
      writableStream: this.#writableStream!,
      isMp4:          format === FORMAT_MP4,
      videoBitrate:   VIDEO_BITRATES[quality] ?? 4_000_000,
    });
  }

  startEncoding(fps: number) {
    this.#compositor.isRecording = true;
    this.#recordingStartTime     = performance.now();
    this.#totalPausedMs          = 0;
    this.#audioMixer.startSilentAudio();
    this.#recorderCore.start();
    this.#startLoop(fps);
  }

  pauseEncoding() {
    this.#pauseStartTime = performance.now();
    this.#metronome.stop();
    this.#recorderCore.pause();
    this.#audioMixer.pauseSilentAudio();
  }

  resumeEncoding(fps: number) {
    this.#totalPausedMs += performance.now() - this.#pauseStartTime;
    this.#recorderCore.resume();
    this.#audioMixer.resumeSilentAudio();
    this.#startLoop(fps);
  }

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

  async changeWebcam(webcamDeviceId: string | undefined, webcamSelected: boolean) {
    this.#webcamStream?.getTracks().forEach(t => t.stop());
    this.#webcamStream           = null;
    this.#compositor.webcamStream = null;

    if (webcamSelected) {
      const constraint = webcamDeviceId ? { deviceId: { exact: webcamDeviceId } } : true;
      this.#webcamStream = await navigator.mediaDevices.getUserMedia({ video: constraint, audio: false });
      this.#compositor.webcamStream        = this.#webcamStream;
      this.#compositor.webcamVid.srcObject = this.#webcamStream;
      await this.#compositor.webcamVid.play().catch(() => {});
      await this.#compositor.waitForVideoReady(this.#compositor.webcamVid);
    } else {
      this.#compositor.webcamVid.srcObject = null;
    }
  }

  endSession() {
    this.#masterStream?.getTracks().forEach(t => t.stop());
    this.#masterStream = null;
    this.#compositor.screenVid.srcObject = null;
  }

  cleanupAll() {
    this.#compositor.isRecording = false;
    this.#metronome.stop();
    try { this.#writableStream?.close(); } catch (_) {}
    this.#writableStream  = null;
    this.#savedFileHandle = null;
    this.#releaseNonScreenStreams();
  }

  restartPreviews() {
    this.#metronome.start(0, () => this.#compositor.drawFrame());
    this.#startWebcamPreview();
    this.#audioMixer.startMicPreview(this.#micDeviceId, false).catch(() => {});
    if (this.#masterStream?.active) {
      this.#audioMixer.startSysPreview(this.#masterStream.getAudioTracks());
    }
  }

  #startLoop(fps: number) {
    const startTime = this.#recordingStartTime;
    const paused    = () => this.#totalPausedMs;
    this.#metronome.start(fps, async (frameStart: number) => {
      this.#compositor.drawFrame();
      await this.#recorderCore.addFrame((frameStart - startTime - paused()) / 1000);
    });
  }

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
