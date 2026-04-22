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

interface RecorderApi {
  onStreamEnded?: () => void;
  acquireAndInit(payload?: unknown): Promise<void>;
  startEncoding(fps: number): unknown | Promise<unknown>;
  resumeEncoding(fps: number): unknown | Promise<unknown>;
  pauseEncoding(): void;
  finalizeEncoding(): Promise<unknown>;
  cleanupAll(): void;
  restartPreviews(): void;
  endSession(): void;
  hasSession?: boolean;
}

type TransitionEntry = {
  nextState: State | ((api: RecorderApi) => State);
  effect?: (machine: RecorderStateMachine, api: RecorderApi, payload?: any) => unknown;
};

export class RecorderStateMachine {
  #state: State = STATE.IDLE as State;
  #listeners: Array<(s: State, e: Event, p?: unknown) => void> = [];
  #api: RecorderApi;

  constructor(api: RecorderApi) {
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

  onStateChange(cb: (s: State, e: Event, p?: unknown) => void) {
    this.#listeners.push(cb);
    return () => { this.#listeners = this.#listeners.filter(l => l !== cb); };
  }

  transition(event: Event, payload?: unknown) {
    const key = `${this.#state}:${event}`;
    const entry: TransitionEntry | undefined = TRANSITIONS[key] ?? TRANSITIONS[`*:${event}`];
    if (!entry) return;

    const nextState = typeof entry.nextState === 'function'
      ? entry.nextState(this.#api)
      : entry.nextState;

    this.#state = nextState;
    this.#listeners.forEach(cb => cb(nextState, event, payload));

    if (entry.effect) {
      Promise.resolve(entry.effect(this, this.#api, payload)).catch((err: unknown) =>
        console.error('[RecorderStateMachine] Unhandled effect error:', err)
      );
    }
  }
}

async function effectAcquireAndInit(machine: RecorderStateMachine, api: RecorderApi, payload?: unknown) {
  try {
    await api.acquireAndInit(payload);
    machine.transition(EVENT.ENCODER_READY as Event, payload);
  } catch (err: unknown) {
    const e = err as { name?: string } | undefined;
    if (e?.name === 'AbortError' || e?.name === 'NotAllowedError') {
      machine.transition(EVENT.STREAMS_FAILED as Event, err);
    } else {
      machine.transition(EVENT.ENCODER_ERROR as Event, err);
    }
  }
}

async function effectFinalize(machine: RecorderStateMachine, api: RecorderApi) {
  try {
    const fileHandle = await api.finalizeEncoding();
    machine.transition(EVENT.FINALIZE_DONE as Event, fileHandle);
  } catch (err) {
    machine.transition(EVENT.ENCODER_ERROR as Event, err);
  }
}

const TRANSITIONS: Record<string, TransitionEntry> = {
  [`${STATE.IDLE}:${EVENT.USER_START}`]:    { nextState: STATE.REQUESTING, effect: effectAcquireAndInit },
  [`${STATE.SESSION}:${EVENT.USER_START}`]: { nextState: STATE.REQUESTING, effect: effectAcquireAndInit },

  [`${STATE.REQUESTING}:${EVENT.ENCODER_READY}`]: { nextState: STATE.COUNTDOWN },

  [`${STATE.COUNTDOWN}:${EVENT.COUNTDOWN_DONE}`]: {
    nextState: STATE.RECORDING,
    effect:    (_m: RecorderStateMachine, api: RecorderApi, p?: { fps?: number }) => api.startEncoding(p?.fps ?? 30),
  },

  [`${STATE.COUNTDOWN}:${EVENT.COUNTDOWN_CANCEL}`]: {
    nextState: (api: RecorderApi) => api.hasSession ? STATE.SESSION : STATE.IDLE,
    effect:    (_m: RecorderStateMachine, api: RecorderApi) => { api.cleanupAll(); api.restartPreviews(); },
  },

  [`${STATE.COUNTDOWN}:${EVENT.USER_STOP}`]: {
    nextState: STATE.IDLE,
    effect:    (_m: RecorderStateMachine, api: RecorderApi) => { api.cleanupAll(); api.restartPreviews(); },
  },

  [`${STATE.REQUESTING}:${EVENT.STREAMS_FAILED}`]: {
    nextState: (api: RecorderApi) => api.hasSession ? STATE.SESSION : STATE.IDLE,
    effect:    (_m: RecorderStateMachine, api: RecorderApi) => api.restartPreviews(),
  },

  [`${STATE.REQUESTING}:${EVENT.USER_STOP}`]: {
    nextState: STATE.IDLE,
    effect:    (_m: RecorderStateMachine, api: RecorderApi) => { api.cleanupAll(); api.restartPreviews(); },
  },

  [`${STATE.RECORDING}:${EVENT.USER_PAUSE}`]: {
    nextState: STATE.PAUSED,
    effect:    (_m: RecorderStateMachine, api: RecorderApi) => api.pauseEncoding(),
  },
  [`${STATE.PAUSED}:${EVENT.USER_RESUME}`]: {
    nextState: STATE.RECORDING,
    effect:    (_m: RecorderStateMachine, api: RecorderApi, p?: { fps?: number }) => api.resumeEncoding(p?.fps ?? 30),
  },

  [`${STATE.RECORDING}:${EVENT.USER_STOP}`]: { nextState: STATE.STOPPING, effect: effectFinalize },
  [`${STATE.PAUSED}:${EVENT.USER_STOP}`]:    { nextState: STATE.STOPPING, effect: effectFinalize },

  [`${STATE.STOPPING}:${EVENT.FINALIZE_DONE}`]: {
    nextState: (api: RecorderApi) => api.hasSession ? STATE.SESSION : STATE.IDLE,
    effect:    (_m: RecorderStateMachine, api: RecorderApi) => api.restartPreviews(),
  },

  [`${STATE.SESSION}:${EVENT.END_SESSION}`]: {
    nextState: STATE.IDLE,
    effect:    (_m: RecorderStateMachine, api: RecorderApi) => { api.endSession(); api.restartPreviews(); },
  },

  [`${STATE.RECORDING}:${EVENT.END_SESSION}`]: {
    nextState: STATE.STOPPING,
    effect:    async (machine: RecorderStateMachine, api: RecorderApi) => { api.endSession(); await effectFinalize(machine, api); },
  },
  [`${STATE.PAUSED}:${EVENT.END_SESSION}`]: {
    nextState: STATE.STOPPING,
    effect:    async (machine: RecorderStateMachine, api: RecorderApi) => { api.endSession(); await effectFinalize(machine, api); },
  },

  [`*:${EVENT.ENCODER_ERROR}`]: {
    nextState: STATE.ERROR,
    effect:    (_m: RecorderStateMachine, api: RecorderApi) => api.cleanupAll(),
  },

  [`${STATE.ERROR}:${EVENT.ERROR_DISMISSED}`]: {
    nextState: (api: RecorderApi) => api.hasSession ? STATE.SESSION : STATE.IDLE,
    effect:    (_m: RecorderStateMachine, api: RecorderApi) => api.restartPreviews(),
  },
};
