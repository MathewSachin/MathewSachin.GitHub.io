// ── recorder-state-machine.ts ───────────────────────────────────────────────
export const STATE = Object.freeze({
  IDLE:       'IDLE',
  REQUESTING: 'REQUESTING',
  COUNTDOWN:  'COUNTDOWN',
  RECORDING:  'RECORDING',
  PAUSED:     'PAUSED',
  STOPPING:   'STOPPING',
  SESSION:    'SESSION',
  ERROR:      'ERROR',
} as const);

export const EVENT = Object.freeze({
  USER_START:        'USER_START',
  USER_PAUSE:        'USER_PAUSE',
  USER_RESUME:       'USER_RESUME',
  USER_STOP:         'USER_STOP',
  END_SESSION:       'END_SESSION',
  ENCODER_READY:     'ENCODER_READY',
  STREAMS_FAILED:    'STREAMS_FAILED',
  ENCODER_ERROR:     'ENCODER_ERROR',
  FINALIZE_DONE:     'FINALIZE_DONE',
  ERROR_DISMISSED:   'ERROR_DISMISSED',
  COUNTDOWN_DONE:    'COUNTDOWN_DONE',
  COUNTDOWN_CANCEL:  'COUNTDOWN_CANCEL',
} as const);

type State = (typeof STATE)[keyof typeof STATE];
type Event = (typeof EVENT)[keyof typeof EVENT];

export class RecorderStateMachine {
  #state: State = STATE.IDLE as State;
  #listeners: Array<(s: State, e: Event, p?: any) => void> = [];
  #api: any;

  constructor(api: any) {
    this.#api = api;
    api.onStreamEnded = () => {
      const s = this.#state;
      if (s === STATE.RECORDING || s === STATE.PAUSED ||
          s === STATE.REQUESTING || s === STATE.COUNTDOWN) {
        this.transition(EVENT.USER_STOP as Event);
      } else if (s === STATE.SESSION) {
        this.transition(EVENT.END_SESSION as Event);
      }
    };
  }

  get state() { return this.#state; }

  onStateChange(cb: (s: State, e: Event, p?: any) => void) {
    this.#listeners.push(cb);
    return () => { this.#listeners = this.#listeners.filter(l => l !== cb); };
  }

  transition(event: Event, payload?: any) {
    const key = `${this.#state}:${event}`;
    const entry = (TRANSITIONS as any)[key] ?? (TRANSITIONS as any)[`*:${event}`];
    if (!entry) return;

    const nextState = typeof entry.nextState === 'function'
      ? entry.nextState(this.#api)
      : entry.nextState;

    this.#state = nextState;
    this.#listeners.forEach(cb => cb(nextState, event, payload));

    if (entry.effect) {
      Promise.resolve(entry.effect(this, this.#api, payload)).catch((err: any) =>
        console.error('[RecorderStateMachine] Unhandled effect error:', err)
      );
    }
  }
}

async function effectAcquireAndInit(machine: RecorderStateMachine, api: any, payload: any) {
  try {
    await api.acquireAndInit(payload);
    machine.transition(EVENT.ENCODER_READY as Event, payload);
  } catch (err: any) {
    if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
      machine.transition(EVENT.STREAMS_FAILED as Event, err);
    } else {
      machine.transition(EVENT.ENCODER_ERROR as Event, err);
    }
  }
}

async function effectFinalize(machine: RecorderStateMachine, api: any) {
  try {
    const fileHandle = await api.finalizeEncoding();
    machine.transition(EVENT.FINALIZE_DONE as Event, fileHandle);
  } catch (err) {
    machine.transition(EVENT.ENCODER_ERROR as Event, err);
  }
}

const TRANSITIONS: any = {
  [`${STATE.IDLE}:${EVENT.USER_START}`]:    { nextState: STATE.REQUESTING, effect: effectAcquireAndInit },
  [`${STATE.SESSION}:${EVENT.USER_START}`]: { nextState: STATE.REQUESTING, effect: effectAcquireAndInit },

  [`${STATE.REQUESTING}:${EVENT.ENCODER_READY}`]: { nextState: STATE.COUNTDOWN },

  [`${STATE.COUNTDOWN}:${EVENT.COUNTDOWN_DONE}`]: {
    nextState: STATE.RECORDING,
    effect:    (_m: any, api: any, p: any) => api.startEncoding(p.fps),
  },

  [`${STATE.COUNTDOWN}:${EVENT.COUNTDOWN_CANCEL}`]: {
    nextState: (api: any) => api.hasSession ? STATE.SESSION : STATE.IDLE,
    effect:    (_m: any, api: any) => { api.cleanupAll(); api.restartPreviews(); },
  },

  [`${STATE.COUNTDOWN}:${EVENT.USER_STOP}`]: {
    nextState: STATE.IDLE,
    effect:    (_m: any, api: any) => { api.cleanupAll(); api.restartPreviews(); },
  },

  [`${STATE.REQUESTING}:${EVENT.STREAMS_FAILED}`]: {
    nextState: (api: any) => api.hasSession ? STATE.SESSION : STATE.IDLE,
    effect:    (_m: any, api: any) => api.restartPreviews(),
  },

  [`${STATE.REQUESTING}:${EVENT.USER_STOP}`]: {
    nextState: STATE.IDLE,
    effect:    (_m: any, api: any) => { api.cleanupAll(); api.restartPreviews(); },
  },

  [`${STATE.RECORDING}:${EVENT.USER_PAUSE}`]: {
    nextState: STATE.PAUSED,
    effect:    (_m: any, api: any) => api.pauseEncoding(),
  },
  [`${STATE.PAUSED}:${EVENT.USER_RESUME}`]: {
    nextState: STATE.RECORDING,
    effect:    (_m: any, api: any, p: any) => api.resumeEncoding(p.fps),
  },

  [`${STATE.RECORDING}:${EVENT.USER_STOP}`]: { nextState: STATE.STOPPING, effect: effectFinalize },
  [`${STATE.PAUSED}:${EVENT.USER_STOP}`]:    { nextState: STATE.STOPPING, effect: effectFinalize },

  [`${STATE.STOPPING}:${EVENT.FINALIZE_DONE}`]: {
    nextState: (api: any) => api.hasSession ? STATE.SESSION : STATE.IDLE,
    effect:    (_m: any, api: any) => api.restartPreviews(),
  },

  [`${STATE.SESSION}:${EVENT.END_SESSION}`]: {
    nextState: STATE.IDLE,
    effect:    (_m: any, api: any) => { api.endSession(); api.restartPreviews(); },
  },

  [`${STATE.RECORDING}:${EVENT.END_SESSION}`]: {
    nextState: STATE.STOPPING,
    effect:    async (machine: any, api: any) => { api.endSession(); await effectFinalize(machine, api); },
  },
  [`${STATE.PAUSED}:${EVENT.END_SESSION}`]: {
    nextState: STATE.STOPPING,
    effect:    async (machine: any, api: any) => { api.endSession(); await effectFinalize(machine, api); },
  },

  [`*:${EVENT.ENCODER_ERROR}`]: {
    nextState: STATE.ERROR,
    effect:    (_m: any, api: any) => api.cleanupAll(),
  },

  [`${STATE.ERROR}:${EVENT.ERROR_DISMISSED}`]: {
    nextState: (api: any) => api.hasSession ? STATE.SESSION : STATE.IDLE,
    effect:    (_m: any, api: any) => api.restartPreviews(),
  },
};
