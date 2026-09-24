import { describe, expect, it } from 'vitest';
import * as fsm from './fsm';

function running(overrides = {}) {
  return {
    players: [
      { id: 'a', name: 'A', remainingMs: 60_000 },
      { id: 'b', name: 'B', remainingMs: 60_000 },
    ],
    activePlayerIndex: 0,
    status: 'running',
    turnStartedAtMs: 1_000_000,
    initialMs: 60_000,
    decrementMs: 0,
    ...overrides,
  };
}

describe('currentRemainingMs', () => {
  it('counts down only the active player of a running game', () => {
    const s = running();
    expect(fsm.currentRemainingMs(s, 0, 1_005_000)).toBe(55_000);
    expect(fsm.currentRemainingMs(s, 1, 1_005_000)).toBe(60_000);
  });

  it('does not tick while paused', () => {
    const s = running({ status: 'paused', turnStartedAtMs: null });
    expect(fsm.currentRemainingMs(s, 0, 9_999_999)).toBe(60_000);
  });

  it('never adds time when now is slightly before the turn start', () => {
    expect(fsm.currentRemainingMs(running(), 0, 999_800)).toBe(60_000);
  });
});

describe('cross-device turns', () => {
  it('charges the same time no matter which device ends the turn', () => {
    // Both callers pass server-clock time, so the deduction is independent of
    // either device's local clock skew.
    const ended = fsm.endTurn(running(), { playerId: 'a', nowMs: 1_012_000 });
    expect(ended.players[0].remainingMs).toBe(48_000);
    expect(ended.activePlayerIndex).toBe(1);
    expect(ended.turnStartedAtMs).toBe(1_012_000);
  });

  it('conserves time across a hand-off with no gap or overlap', () => {
    const afterA = fsm.endTurn(running(), { playerId: 'a', nowMs: 1_010_000 });
    const afterB = fsm.endTurn(afterA, { playerId: 'b', nowMs: 1_025_000 });
    const spent = 60_000 * 2 - afterB.players.reduce((sum, p) => sum + p.remainingMs, 0);
    expect(spent).toBe(1_025_000 - 1_000_000);
  });

  it('pause then resume starts a fresh turn clock', () => {
    const paused = fsm.pause(running(), { nowMs: 1_020_000 });
    expect(paused.players[0].remainingMs).toBe(40_000);
    const resumed = fsm.resume(paused, { nowMs: 2_000_000 });
    expect(resumed.turnStartedAtMs).toBe(2_000_000);
    expect(fsm.currentRemainingMs(resumed, 0, 2_003_000)).toBe(37_000);
  });

  it('rejects an end-turn from a player who is not active', () => {
    expect(() => fsm.endTurn(running(), { playerId: 'b', nowMs: 1_001_000 }))
      .toThrow(fsm.InvalidTransitionError);
  });
});
