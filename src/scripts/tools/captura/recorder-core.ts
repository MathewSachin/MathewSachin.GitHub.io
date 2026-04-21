// ── recorder-core.ts ─────────────────────────────────────────────────────────
const MEDIABUNNY_CDN = 'https://cdn.jsdelivr.net/npm/mediabunny@1.40.1/+esm';

export class RecorderCore {
  #output: any = null;
  #canvasSource: any = null;
  #audioSource: any = null;

  get audioSource(): any { return this.#audioSource; }

  static async #importMediabunny(): Promise<any> {
    const mod = await import(MEDIABUNNY_CDN);
    return mod as any;
  }

  async init({ canvas, mixedAudioTrack, writableStream, isMp4, videoBitrate } : {
    canvas: HTMLCanvasElement,
    mixedAudioTrack: MediaStreamTrack | null,
    writableStream: FileSystemWritableFileStream,
    isMp4: boolean,
    videoBitrate: number,
  }) {
    const {
      Output, WebMOutputFormat, Mp4OutputFormat,
      StreamTarget, CanvasSource, MediaStreamAudioTrackSource,
    } = await RecorderCore.#importMediabunny();

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

  async start() { await this.#output.start(); }
  async addFrame(timestamp: number) { await this.#canvasSource.add(timestamp); }
  pause() { this.#audioSource?.pause(); }
  resume() { this.#audioSource?.resume(); }

  async finalize() {
    await this.#output.finalize();
    this.#output = this.#canvasSource = this.#audioSource = null;
  }
}
