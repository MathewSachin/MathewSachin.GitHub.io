// ── metronome.ts ─────────────────────────────────────────────────────────────
// The Timing Engine: Web Worker proxy timer + compositing loop driver.

const _blob = new Blob(
  ['let t;self.onmessage=function(e){clearTimeout(t);t=setTimeout(function(){self.postMessage(null);},e.data);}'],
  { type: 'application/javascript' }
);
const _url = URL.createObjectURL(_blob);
const _worker = new Worker(_url);
URL.revokeObjectURL(_url);

export class Metronome {
  #active: boolean = false;
  #done: Promise<void> = Promise.resolve();
  #animFrameId: number | null = null;
  #sleepResolve: (() => void) | null = null;

  get done() { return this.#done; }

  start(fps: number, onFrame: (frameStart: number) => Promise<void> | void) {
    this.stop();

    if (fps > 0) {
      const interval = Math.round(1000 / fps);
      this.#active = true;
      this.#done = (async () => {
        while (this.#active) {
          const frameStart = performance.now();
          await onFrame(frameStart);
          if (!this.#active) break;
          const elapsed = performance.now() - frameStart;
          await new Promise<void>(resolve => {
            this.#sleepResolve = resolve;
            _worker.onmessage = () => { this.#sleepResolve = null; resolve(); };
            _worker.postMessage(Math.max(0, interval - elapsed));
          });
        }
      })();
    } else {
      const rafLoop = () => {
        onFrame(performance.now());
        this.#animFrameId = requestAnimationFrame(rafLoop);
      };
      rafLoop();
    }
  }

  stop() {
    this.#active = false;
    if (this.#animFrameId) { cancelAnimationFrame(this.#animFrameId); this.#animFrameId = null; }
    _worker.onmessage = null;
    if (this.#sleepResolve) { this.#sleepResolve(); this.#sleepResolve = null; }
  }
}
