// ── metronome.js ──────────────────────────────────────────────────────────────
// The Timing Engine: Web Worker proxy timer + compositing loop driver.
//
// Why a Web Worker?
//   Main-thread setTimeout/setInterval can be clamped to ≥1 s when the browser
//   tab is hidden or backgrounded. A dedicated Worker is not subject to that
//   restriction, so the recording loop keeps running at the target frame rate
//   even when the user switches tabs.
//
// Two modes:
//   fps = 0  → requestAnimationFrame loop (preview; fine to throttle in bg)
//   fps > 0  → async Worker-timed loop   (recording; must keep running + apply
//               backpressure so the encoder never starves or overflows)

// Inline Worker source — a minimal setTimeout proxy.
const _blob   = new Blob(
  ['let t;self.onmessage=function(e){clearTimeout(t);t=setTimeout(function(){self.postMessage(null);},e.data);}'],
  { type: 'application/javascript' }
);
const _url    = URL.createObjectURL(_blob);
const _worker = new Worker(_url);
URL.revokeObjectURL(_url);

export class Metronome {
  #active       = false;
  #done         = Promise.resolve();
  #animFrameId  = null;
  #sleepResolve = null;

  // Resolves when the current recording loop has fully exited.
  // Await this before calling finalize() on the encoder.
  get done() { return this.#done; }

  // Start a compositing loop.
  //
  // fps = 0  → rAF preview loop; onFrame is called on every animation frame.
  // fps > 0  → async recording loop; onFrame is awaited each tick so that slow
  //            encoder calls apply back-pressure on the frame producer.
  //
  // onFrame(frameStart: DOMHighResTimeStamp) → Promise<void> | void
  start(fps, onFrame) {
    this.stop();

    if (fps > 0) {
      const interval  = Math.round(1000 / fps);
      this.#active    = true;
      this.#done = (async () => {
        while (this.#active) {
          const frameStart = performance.now();
          await onFrame(frameStart);
          if (!this.#active) break;
          const elapsed = performance.now() - frameStart;
          await new Promise(resolve => {
            this.#sleepResolve    = resolve;
            _worker.onmessage     = () => { this.#sleepResolve = null; resolve(); };
            _worker.postMessage(Math.max(0, interval - elapsed));
          });
        }
      })();
    } else {
      // Preview mode — rAF, throttled in background (acceptable for preview)
      const rafLoop = () => {
        onFrame(performance.now());
        this.#animFrameId = requestAnimationFrame(rafLoop);
      };
      rafLoop();
    }
  }

  // Stops the current loop.
  // For the recording loop, stop() signals exit and immediately unblocks any
  // in-progress sleep so the loop can check the flag and exit cleanly.
  // Callers should await metronome.done before finalising the encoder.
  stop() {
    this.#active = false;
    if (this.#animFrameId) { cancelAnimationFrame(this.#animFrameId); this.#animFrameId = null; }
    // Clear the worker handler so stale ticks from a previous session cannot
    // accidentally wake up a future session's sleep promise.
    _worker.onmessage = null;
    // Unblock the inter-frame sleep immediately so the recording loop exits.
    if (this.#sleepResolve) { this.#sleepResolve(); this.#sleepResolve = null; }
  }
}
