/**
 * Unit tests for tools/captura/js/recorder-state-machine.js
 *
 * The RecorderStateMachine is a pure-logic finite-state machine with no DOM
 * dependencies, making it straightforward to test in Node.js with a mock API.
 *
 * Run via: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  STATE,
  EVENT,
  RecorderStateMachine,
} from '../tools/captura/js/recorder-state-machine.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal mock API object that satisfies the state machine's contract.
 * All methods are no-ops by default; individual tests can override them.
 */
function makeMockApi({ hasSession = false } = {}) {
  return {
    get hasSession() { return hasSession; },
    acquireAndInit:   async () => {},
    startEncoding:    () => {},
    pauseEncoding:    () => {},
    resumeEncoding:   () => {},
    finalizeEncoding: async () => null,
    cleanupAll:       () => {},
    restartPreviews:  () => {},
    endSession:       () => {},
    onStreamEnded:    null,
  };
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

test('RecorderStateMachine: initial state is IDLE', () => {
  const machine = new RecorderStateMachine(makeMockApi());
  assert.equal(machine.state, STATE.IDLE);
});

// ---------------------------------------------------------------------------
// Basic transitions (synchronous state changes)
// ---------------------------------------------------------------------------

test('USER_START from IDLE transitions to REQUESTING', () => {
  const machine = new RecorderStateMachine(makeMockApi());
  machine.transition(EVENT.USER_START);
  assert.equal(machine.state, STATE.REQUESTING);
});

test('ENCODER_READY from REQUESTING transitions to RECORDING', () => {
  const api = makeMockApi();
  const machine = new RecorderStateMachine(api);
  machine.transition(EVENT.USER_START);
  machine.transition(EVENT.ENCODER_READY, { fps: 30 });
  assert.equal(machine.state, STATE.RECORDING);
});

test('USER_PAUSE from RECORDING transitions to PAUSED', () => {
  const machine = new RecorderStateMachine(makeMockApi());
  machine.transition(EVENT.USER_START);
  machine.transition(EVENT.ENCODER_READY, { fps: 30 });
  machine.transition(EVENT.USER_PAUSE);
  assert.equal(machine.state, STATE.PAUSED);
});

test('USER_RESUME from PAUSED transitions to RECORDING', () => {
  const machine = new RecorderStateMachine(makeMockApi());
  machine.transition(EVENT.USER_START);
  machine.transition(EVENT.ENCODER_READY, { fps: 30 });
  machine.transition(EVENT.USER_PAUSE);
  machine.transition(EVENT.USER_RESUME, { fps: 30 });
  assert.equal(machine.state, STATE.RECORDING);
});

test('USER_STOP from RECORDING transitions to STOPPING', () => {
  const machine = new RecorderStateMachine(makeMockApi());
  machine.transition(EVENT.USER_START);
  machine.transition(EVENT.ENCODER_READY, { fps: 30 });
  machine.transition(EVENT.USER_STOP);
  assert.equal(machine.state, STATE.STOPPING);
});

test('USER_STOP from PAUSED transitions to STOPPING', () => {
  const machine = new RecorderStateMachine(makeMockApi());
  machine.transition(EVENT.USER_START);
  machine.transition(EVENT.ENCODER_READY, { fps: 30 });
  machine.transition(EVENT.USER_PAUSE);
  machine.transition(EVENT.USER_STOP);
  assert.equal(machine.state, STATE.STOPPING);
});

test('FINALIZE_DONE from STOPPING transitions to IDLE when no session', () => {
  const api = makeMockApi({ hasSession: false });
  const machine = new RecorderStateMachine(api);
  machine.transition(EVENT.USER_START);
  machine.transition(EVENT.ENCODER_READY, { fps: 30 });
  machine.transition(EVENT.USER_STOP);
  machine.transition(EVENT.FINALIZE_DONE);
  assert.equal(machine.state, STATE.IDLE);
});

test('FINALIZE_DONE from STOPPING transitions to SESSION when session exists', () => {
  const api = makeMockApi({ hasSession: true });
  const machine = new RecorderStateMachine(api);
  machine.transition(EVENT.USER_START);
  machine.transition(EVENT.ENCODER_READY, { fps: 30 });
  machine.transition(EVENT.USER_STOP);
  machine.transition(EVENT.FINALIZE_DONE);
  assert.equal(machine.state, STATE.SESSION);
});

test('USER_START from SESSION transitions to REQUESTING', () => {
  const api = makeMockApi({ hasSession: true });
  const machine = new RecorderStateMachine(api);
  // Put machine in SESSION by finishing a recording with an active session
  machine.transition(EVENT.USER_START);
  machine.transition(EVENT.ENCODER_READY, { fps: 30 });
  machine.transition(EVENT.USER_STOP);
  machine.transition(EVENT.FINALIZE_DONE);
  assert.equal(machine.state, STATE.SESSION);

  machine.transition(EVENT.USER_START);
  assert.equal(machine.state, STATE.REQUESTING);
});

test('END_SESSION from SESSION transitions to IDLE', () => {
  const api = makeMockApi({ hasSession: true });
  const machine = new RecorderStateMachine(api);
  machine.transition(EVENT.USER_START);
  machine.transition(EVENT.ENCODER_READY, { fps: 30 });
  machine.transition(EVENT.USER_STOP);
  machine.transition(EVENT.FINALIZE_DONE);
  assert.equal(machine.state, STATE.SESSION);

  machine.transition(EVENT.END_SESSION);
  assert.equal(machine.state, STATE.IDLE);
});

// ---------------------------------------------------------------------------
// Wildcard ENCODER_ERROR transitions
// ---------------------------------------------------------------------------

test('ENCODER_ERROR from RECORDING transitions to ERROR', () => {
  const machine = new RecorderStateMachine(makeMockApi());
  machine.transition(EVENT.USER_START);
  machine.transition(EVENT.ENCODER_READY, { fps: 30 });
  machine.transition(EVENT.ENCODER_ERROR, new Error('codec failure'));
  assert.equal(machine.state, STATE.ERROR);
});

test('ENCODER_ERROR from PAUSED transitions to ERROR', () => {
  const machine = new RecorderStateMachine(makeMockApi());
  machine.transition(EVENT.USER_START);
  machine.transition(EVENT.ENCODER_READY, { fps: 30 });
  machine.transition(EVENT.USER_PAUSE);
  machine.transition(EVENT.ENCODER_ERROR, new Error('codec failure'));
  assert.equal(machine.state, STATE.ERROR);
});

test('ENCODER_ERROR from REQUESTING transitions to ERROR', () => {
  const machine = new RecorderStateMachine(makeMockApi());
  machine.transition(EVENT.USER_START);
  machine.transition(EVENT.ENCODER_ERROR, new Error('init error'));
  assert.equal(machine.state, STATE.ERROR);
});

test('ERROR_DISMISSED from ERROR transitions to IDLE when no session', () => {
  const api = makeMockApi({ hasSession: false });
  const machine = new RecorderStateMachine(api);
  machine.transition(EVENT.USER_START);
  machine.transition(EVENT.ENCODER_ERROR, new Error('err'));
  machine.transition(EVENT.ERROR_DISMISSED);
  assert.equal(machine.state, STATE.IDLE);
});

test('ERROR_DISMISSED from ERROR transitions to SESSION when session exists', () => {
  const api = makeMockApi({ hasSession: true });
  const machine = new RecorderStateMachine(api);
  machine.transition(EVENT.USER_START);
  machine.transition(EVENT.ENCODER_ERROR, new Error('err'));
  machine.transition(EVENT.ERROR_DISMISSED);
  assert.equal(machine.state, STATE.SESSION);
});

// ---------------------------------------------------------------------------
// STREAMS_FAILED transitions
// ---------------------------------------------------------------------------

test('STREAMS_FAILED from REQUESTING transitions to IDLE when no session', () => {
  const api = makeMockApi({ hasSession: false });
  const machine = new RecorderStateMachine(api);
  machine.transition(EVENT.USER_START);
  machine.transition(EVENT.STREAMS_FAILED, new Error('denied'));
  assert.equal(machine.state, STATE.IDLE);
});

test('STREAMS_FAILED from REQUESTING transitions to SESSION when session exists', () => {
  const api = makeMockApi({ hasSession: true });
  const machine = new RecorderStateMachine(api);
  machine.transition(EVENT.USER_START);
  machine.transition(EVENT.STREAMS_FAILED, new Error('denied'));
  assert.equal(machine.state, STATE.SESSION);
});

// ---------------------------------------------------------------------------
// Ignored / invalid events
// ---------------------------------------------------------------------------

test('unknown event from IDLE is silently ignored', () => {
  const machine = new RecorderStateMachine(makeMockApi());
  machine.transition('NOT_A_REAL_EVENT');
  assert.equal(machine.state, STATE.IDLE);
});

test('USER_PAUSE from IDLE is silently ignored', () => {
  const machine = new RecorderStateMachine(makeMockApi());
  machine.transition(EVENT.USER_PAUSE);
  assert.equal(machine.state, STATE.IDLE);
});

test('USER_RESUME from IDLE is silently ignored', () => {
  const machine = new RecorderStateMachine(makeMockApi());
  machine.transition(EVENT.USER_RESUME);
  assert.equal(machine.state, STATE.IDLE);
});

test('ENCODER_READY from IDLE is silently ignored', () => {
  const machine = new RecorderStateMachine(makeMockApi());
  machine.transition(EVENT.ENCODER_READY);
  assert.equal(machine.state, STATE.IDLE);
});

// ---------------------------------------------------------------------------
// onStateChange listeners
// ---------------------------------------------------------------------------

test('onStateChange listener is called with new state and event', () => {
  const machine = new RecorderStateMachine(makeMockApi());
  const calls = [];
  machine.onStateChange((state, event) => calls.push({ state, event }));

  machine.transition(EVENT.USER_START);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].state, STATE.REQUESTING);
  assert.equal(calls[0].event, EVENT.USER_START);
});

test('multiple onStateChange listeners are all notified', () => {
  const machine = new RecorderStateMachine(makeMockApi());
  let countA = 0;
  let countB = 0;
  machine.onStateChange(() => countA++);
  machine.onStateChange(() => countB++);

  machine.transition(EVENT.USER_START);

  assert.equal(countA, 1);
  assert.equal(countB, 1);
});

test('onStateChange unsubscribe stops notifications', () => {
  const machine = new RecorderStateMachine(makeMockApi());
  let count = 0;
  const unsubscribe = machine.onStateChange(() => count++);

  machine.transition(EVENT.USER_START);
  assert.equal(count, 1);

  unsubscribe();
  machine.transition(EVENT.ENCODER_READY, { fps: 30 });
  assert.equal(count, 1); // no additional call after unsubscribe
});

test('listener is not called when event has no valid transition', () => {
  const machine = new RecorderStateMachine(makeMockApi());
  let called = false;
  machine.onStateChange(() => { called = true; });

  machine.transition(EVENT.USER_PAUSE); // no transition from IDLE
  assert.equal(called, false);
});

// ---------------------------------------------------------------------------
// onStreamEnded callback wiring
// ---------------------------------------------------------------------------

test('onStreamEnded while RECORDING triggers USER_STOP → STOPPING', () => {
  const api = makeMockApi();
  const machine = new RecorderStateMachine(api);
  machine.transition(EVENT.USER_START);
  machine.transition(EVENT.ENCODER_READY, { fps: 30 });
  assert.equal(machine.state, STATE.RECORDING);

  api.onStreamEnded(); // simulates browser "Stop Sharing"
  assert.equal(machine.state, STATE.STOPPING);
});

test('onStreamEnded while PAUSED triggers USER_STOP → STOPPING', () => {
  const api = makeMockApi();
  const machine = new RecorderStateMachine(api);
  machine.transition(EVENT.USER_START);
  machine.transition(EVENT.ENCODER_READY, { fps: 30 });
  machine.transition(EVENT.USER_PAUSE);
  assert.equal(machine.state, STATE.PAUSED);

  api.onStreamEnded();
  assert.equal(machine.state, STATE.STOPPING);
});

test('onStreamEnded while REQUESTING triggers USER_STOP → IDLE', () => {
  const api = makeMockApi({ hasSession: false });
  const machine = new RecorderStateMachine(api);
  machine.transition(EVENT.USER_START);
  assert.equal(machine.state, STATE.REQUESTING);

  api.onStreamEnded();
  assert.equal(machine.state, STATE.IDLE);
});

test('onStreamEnded while SESSION triggers END_SESSION → IDLE', () => {
  const api = makeMockApi({ hasSession: true });
  const machine = new RecorderStateMachine(api);
  machine.transition(EVENT.USER_START);
  machine.transition(EVENT.ENCODER_READY, { fps: 30 });
  machine.transition(EVENT.USER_STOP);
  machine.transition(EVENT.FINALIZE_DONE);
  assert.equal(machine.state, STATE.SESSION);

  api.onStreamEnded();
  assert.equal(machine.state, STATE.IDLE);
});

test('onStreamEnded while IDLE is silently ignored', () => {
  const api = makeMockApi();
  const machine = new RecorderStateMachine(api);
  assert.equal(machine.state, STATE.IDLE);
  api.onStreamEnded(); // no-op; machine stays IDLE
  assert.equal(machine.state, STATE.IDLE);
});
