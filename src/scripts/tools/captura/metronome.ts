// ── metronome.ts ─────────────────────────────────────────────────────────────
// The Timing Engine: Web Worker proxy timer + compositing loop driver.

function createWorker() {
  const blob = new Blob(
    ['let t;self.onmessage=function(e){clearTimeout(t);t=setTimeout(function(){self.postMessage(null);},e.data);}'],
    { type: 'application/javascript' }
  );
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  URL.revokeObjectURL(url);
  return worker;
}

export class Metronome {
  #active: boolean = false;
  #done: Promise<void> = Promise.resolve();
  #animFrameId: number | null = null;
  #sleepResolve: (() => void) | null = null;
  #worker: Worker | null = null;

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
            this.#worker ??= typeof Worker === 'undefined' ? null : createWorker();

            if (this.#worker) {
              this.#worker.onmessage = () => { this.#sleepResolve = null; resolve(); };
              this.#worker.postMessage(Math.max(0, interval - elapsed));
              return;
            }

            setTimeout(() => {
              this.#sleepResolve = null;
              resolve();
            }, Math.max(0, interval - elapsed));
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
    if (this.#worker) this.#worker.onmessage = null;
    if (this.#sleepResolve) { this.#sleepResolve(); this.#sleepResolve = null; }
  }
}
