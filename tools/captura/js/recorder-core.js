// ── recorder-core.js ──────────────────────────────────────────────────────────
// The Mediabunny Wrapper: ties canvas frames and a mixed audio track to a
// FileSystemWritableFileStream via WebCodecs hardware encode + mux.
// Responsibilities:
//   • Lazily import Mediabunny from CDN (browser caches after first load).
//   • Build the Output / CanvasSource / MediaStreamAudioTrackSource graph.
//   • Expose start(), addFrame(), pause(), resume(), and finalize() so that
//     app.js can drive the encode pipeline without knowing the Mediabunny API.

const MEDIABUNNY_CDN = 'https://cdn.jsdelivr.net/npm/mediabunny@1.40.1/+esm';

export class RecorderCore {
  #output       = null;
  #canvasSource = null;
  #audioSource  = null;

  // The Mediabunny audio source; exposed so app.js can pause/resume it
  // when the recording is paused (Mediabunny tracks the pause offset
  // internally to keep audio and video timestamps in sync).
  get audioSource() { return this.#audioSource; }

  // Dynamically imports Mediabunny (module-level cache means only one network
  // request is ever made, even if init() is called multiple times).
  static async #importMediabunny() {
    const { Output, WebMOutputFormat, Mp4OutputFormat,
            StreamTarget, CanvasSource, MediaStreamAudioTrackSource } =
      await import(MEDIABUNNY_CDN);
    return { Output, WebMOutputFormat, Mp4OutputFormat,
             StreamTarget, CanvasSource, MediaStreamAudioTrackSource };
  }

  // Builds the encode pipeline. Must be called before start().
  //
  // canvas          – HTMLCanvasElement whose pixels are encoded each frame.
  // mixedAudioTrack – MediaStreamTrack from the mixed audio graph, or null.
  // writableStream  – FileSystemWritableFileStream opened by StorageManager.
  // isMp4           – true → H.264/AAC in MP4; false → VP9/Opus in WebM.
  // videoBitrate    – target video bitrate in bits per second.
  async init({ canvas, mixedAudioTrack, writableStream, isMp4, videoBitrate }) {
    const { Output, WebMOutputFormat, Mp4OutputFormat,
            StreamTarget, CanvasSource, MediaStreamAudioTrackSource } =
      await RecorderCore.#importMediabunny();

    this.#output = new Output({
      format: isMp4 ? new Mp4OutputFormat() : new WebMOutputFormat(),
      target: new StreamTarget(writableStream),
    });

    this.#canvasSource = new CanvasSource(canvas, {
      codec:   isMp4 ? 'avc' : 'vp9',
      bitrate: videoBitrate,
    });
    this.#output.addVideoTrack(this.#canvasSource);

    if (mixedAudioTrack) {
      this.#audioSource = new MediaStreamAudioTrackSource(mixedAudioTrack, {
        codec:   isMp4 ? 'aac' : 'opus',
        bitrate: 128_000,
      });
      this.#output.addAudioTrack(this.#audioSource);
    }
  }

  // Signals Mediabunny to open the output container and begin accepting frames.
  async start() {
    await this.#output.start();
  }

  // Encodes one video frame at the given presentation timestamp (in seconds).
  // Awaiting this call provides back-pressure when the hardware encoder is busy.
  async addFrame(timestamp) {
    await this.#canvasSource.add(timestamp);
  }

  // Pauses the audio source so that incoming samples are discarded while
  // Mediabunny accumulates a pause offset. The AudioContext keeps running so
  // samples continue to flow; Mediabunny simply marks them as dropped and
  // adjusts future timestamps accordingly — no silence gap in the output.
  pause() {
    this.#audioSource?.pause();
  }

  // Resumes the audio source. Mediabunny uses the accumulated pause offset to
  // stamp subsequent audio samples with the correct presentation timestamp.
  resume() {
    this.#audioSource?.resume();
  }

  // Flushes the hardware encoders, writes the correct duration/seek header,
  // and closes the FileSystemWritableFileStream. Do NOT call
  // writableStream.close() manually after this — finalize() does it.
  async finalize() {
    await this.#output.finalize();
    this.#output = this.#canvasSource = this.#audioSource = null;
  }
}
