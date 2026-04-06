// ── recorder-state-machine.js ─────────────────────────────────────────────────
// Finite-state machine for the Captura recording lifecycle.
// Declares all valid states, events, and the transition table.
// Side-effects delegate to RecorderAPI — no DOM access here.

export const STATE = Object.freeze({
  IDLE:       'IDLE',       // No active session; all controls enabled
  REQUESTING: 'REQUESTING', // Acquiring streams + initialising encoder
  RECORDING:  'RECORDING',  // Actively encoding to disk
  PAUSED:     'PAUSED',     // Recording paused; encoder holds pause offset
  STOPPING:   'STOPPING',   // Finalising encoder / flushing to disk
  SESSION:    'SESSION',    // Screen shared but not currently recording
  ERROR:      'ERROR',      // Unrecoverable error; shows error dialog
});

export const EVENT = Object.freeze({
  USER_START:     'USER_START',
  USER_PAUSE:     'USER_PAUSE',
  USER_RESUME:    'USER_RESUME',
  USER_STOP:      'USER_STOP',
  END_SESSION:    'END_SESSION',
  ENCODER_READY:  'ENCODER_READY',
  STREAMS_FAILED: 'STREAMS_FAILED',
  ENCODER_ERROR:  'ENCODER_ERROR',
  FINALIZE_DONE:  'FINALIZE_DONE',
  ERROR_DISMISSED:'ERROR_DISMISSED',
});

export class RecorderStateMachine {
  #state     = STATE.IDLE;
  #listeners = [];
  #api;

  constructor(api) {
    this.#api = api;

    // Wire the stream-ended callback so the machine reacts to the native
    // browser "Stop Sharing" button without requiring external intervention.
    api.onStreamEnded = () => {
      const s = this.#state;
      if (s === STATE.RECORDING || s === STATE.PAUSED || s === STATE.REQUESTING) {
        this.transition(EVENT.USER_STOP);
      } else if (s === STATE.SESSION) {
        this.transition(EVENT.END_SESSION);
      }
    };
  }

  get state() { return this.#state; }

  // Subscribe to state changes. Returns an unsubscribe function.
  onStateChange(cb) {
    this.#listeners.push(cb);
    return () => { this.#listeners = this.#listeners.filter(l => l !== cb); };
  }

  // Apply an event transition.
  // Silently ignores events that have no valid transition from the current
  // state, which prevents stale async callbacks from mis-firing after the
  // machine has already moved on.
  transition(event, payload) {
    const key   = `${this.#state}:${event}`;
    const entry = TRANSITIONS[key] ?? TRANSITIONS[`*:${event}`];
    if (!entry) return;

    const nextState = typeof entry.nextState === 'function'
      ? entry.nextState(this.#api)
      : entry.nextState;

    this.#state = nextState;
    this.#listeners.forEach(cb => cb(nextState, event, payload));

    if (entry.effect) {
      Promise.resolve(entry.effect(this, this.#api, payload)).catch(err =>
        console.error('[RecorderStateMachine] Unhandled effect error:', err)
      );
    }
  }
}

// ── Shared side-effect helpers ────────────────────────────────────────────────

async function effectAcquireAndInit(machine, api, payload) {
  try {
    await api.acquireAndInit(payload);
    machine.transition(EVENT.ENCODER_READY, payload);
  } catch (err) {
    if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
      machine.transition(EVENT.STREAMS_FAILED, err);
    } else {
      machine.transition(EVENT.ENCODER_ERROR, err);
    }
  }
}

async function effectFinalize(machine, api) {
  try {
    const fileHandle = await api.finalizeEncoding();
    machine.transition(EVENT.FINALIZE_DONE, fileHandle);
  } catch (err) {
    machine.transition(EVENT.ENCODER_ERROR, err);
  }
}

// ── Transition table ──────────────────────────────────────────────────────────
// Each entry: { nextState, effect(machine, api, payload) }
// nextState may be a function (api) => STATE.xxx for runtime routing.

const TRANSITIONS = {
  // ── Start recording (from idle or between-recording session) ──────────────
  [`${STATE.IDLE}:${EVENT.USER_START}`]:    { nextState: STATE.REQUESTING, effect: effectAcquireAndInit },
  [`${STATE.SESSION}:${EVENT.USER_START}`]: { nextState: STATE.REQUESTING, effect: effectAcquireAndInit },

  // ── Encoder fully initialised → begin recording ───────────────────────────
  [`${STATE.REQUESTING}:${EVENT.ENCODER_READY}`]: {
    nextState: STATE.RECORDING,
    effect:    (_m, api, p) => api.startEncoding(p.fps),
  },

  // ── Streams failed (permission denied / user cancelled) ───────────────────
  [`${STATE.REQUESTING}:${EVENT.STREAMS_FAILED}`]: {
    nextState: api => api.hasSession ? STATE.SESSION : STATE.IDLE,
    effect:    (_m, api) => api.restartPreviews(),
  },

  // ── Screen-share track ended during setup ─────────────────────────────────
  [`${STATE.REQUESTING}:${EVENT.USER_STOP}`]: {
    nextState: STATE.IDLE,
    effect:    (_m, api) => { api.cleanupAll(); api.restartPreviews(); },
  },

  // ── Pause / Resume ────────────────────────────────────────────────────────
  [`${STATE.RECORDING}:${EVENT.USER_PAUSE}`]: {
    nextState: STATE.PAUSED,
    effect:    (_m, api) => api.pauseEncoding(),
  },
  [`${STATE.PAUSED}:${EVENT.USER_RESUME}`]: {
    nextState: STATE.RECORDING,
    effect:    (_m, api, p) => api.resumeEncoding(p.fps),
  },

  // ── Stop recording (from RECORDING or PAUSED) ─────────────────────────────
  [`${STATE.RECORDING}:${EVENT.USER_STOP}`]: { nextState: STATE.STOPPING, effect: effectFinalize },
  [`${STATE.PAUSED}:${EVENT.USER_STOP}`]:    { nextState: STATE.STOPPING, effect: effectFinalize },

  // ── Encoder finalised → back to session or idle ───────────────────────────
  [`${STATE.STOPPING}:${EVENT.FINALIZE_DONE}`]: {
    nextState: api => api.hasSession ? STATE.SESSION : STATE.IDLE,
    effect:    (_m, api) => api.restartPreviews(),
  },

  // ── End session ───────────────────────────────────────────────────────────
  [`${STATE.SESSION}:${EVENT.END_SESSION}`]: {
    nextState: STATE.IDLE,
    effect:    (_m, api) => { api.endSession(); api.restartPreviews(); },
  },

  // Ending a session while recording: null masterStream first so that
  // FINALIZE_DONE routing resolves to IDLE rather than SESSION.
  [`${STATE.RECORDING}:${EVENT.END_SESSION}`]: {
    nextState: STATE.STOPPING,
    effect:    async (machine, api) => { api.endSession(); await effectFinalize(machine, api); },
  },
  [`${STATE.PAUSED}:${EVENT.END_SESSION}`]: {
    nextState: STATE.STOPPING,
    effect:    async (machine, api) => { api.endSession(); await effectFinalize(machine, api); },
  },

  // ── Encoder error (wildcard — triggered from any state) ───────────────────
  [`*:${EVENT.ENCODER_ERROR}`]: {
    nextState: STATE.ERROR,
    effect:    (_m, api) => api.cleanupAll(),
  },

  // ── Error dialog dismissed → back to session or idle ──────────────────────
  [`${STATE.ERROR}:${EVENT.ERROR_DISMISSED}`]: {
    nextState: api => api.hasSession ? STATE.SESSION : STATE.IDLE,
    effect:    (_m, api) => api.restartPreviews(),
  },
};
