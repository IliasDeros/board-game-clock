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

function three(overrides = {}) {
  return running({
    players: [
      { id: 'a', name: 'A', remainingMs: 60_000 },
      { id: 'b', name: 'B', remainingMs: 60_000 },
      { id: 'c', name: 'C', remainingMs: 60_000 },
    ],
    ...overrides,
  });
}

function sittingOut(state, ...ids) {
  return { ...state, players: state.players.map((p) => (ids.includes(p.id) ? { ...p, playing: false } : p)) };
}

describe('players sitting out', () => {
  it('skips a deactivated player when a turn ends', () => {
    const next = fsm.endTurn(sittingOut(three(), 'b'), { playerId: 'a', nowMs: 1_005_000 });
    expect(next.players[next.activePlayerIndex].id).toBe('c');
  });

  it('wraps past deactivated players back to the start', () => {
    const state = sittingOut(three({ activePlayerIndex: 1 }), 'c');
    const next = fsm.endTurn(state, { playerId: 'b', nowMs: 1_005_000 });
    expect(next.players[next.activePlayerIndex].id).toBe('a');
  });

  it('treats a player with no flag as playing', () => {
    const next = fsm.endTurn(three(), { playerId: 'a', nowMs: 1_005_000 });
    expect(next.players[next.activePlayerIndex].id).toBe('b');
  });

  it('deactivating a waiting player leaves the turn alone', () => {
    const next = fsm.setPlayerPlaying(three(), { playerId: 'b', playing: false, nowMs: 1_005_000 });
    expect(next.players[1].playing).toBe(false);
    expect(next.activePlayerIndex).toBe(0);
    expect(next.turnStartedAtMs).toBe(1_000_000);
  });

  it('deactivating the running player charges their turn and hands over', () => {
    const next = fsm.setPlayerPlaying(three(), { playerId: 'a', playing: false, nowMs: 1_005_000 });
    expect(next.players[0].remainingMs).toBe(55_000);
    expect(next.players[next.activePlayerIndex].id).toBe('b');
    expect(next.turnStartedAtMs).toBe(1_005_000);
    expect(next.status).toBe('running');
  });

  it('deactivating the active player of a paused game moves the turn without a clock', () => {
    const state = three({ status: 'paused', turnStartedAtMs: null });
    const next = fsm.setPlayerPlaying(state, { playerId: 'a', playing: false, nowMs: 2_000_000 });
    expect(next.players[next.activePlayerIndex].id).toBe('b');
    expect(next.turnStartedAtMs).toBeNull();
    expect(next.players[0].remainingMs).toBe(60_000);
  });

  it('reactivating a player only sets the flag', () => {
    const state = sittingOut(three(), 'b');
    const next = fsm.setPlayerPlaying(state, { playerId: 'b', playing: true, nowMs: 1_005_000 });
    expect(next.players[1].playing).toBe(true);
    expect(next.activePlayerIndex).toBe(0);
  });

  it('refuses to deactivate the last player in the game', () => {
    const state = sittingOut(three(), 'b', 'c');
    expect(() => fsm.setPlayerPlaying(state, { playerId: 'a', playing: false, nowMs: 1_005_000 }))
      .toThrow(fsm.InvalidTransitionError);
  });

  it('reset brings everyone back and starts from the first player', () => {
    const next = fsm.reset(sittingOut(three({ activePlayerIndex: 2 }), 'a', 'b'));
    expect(next.players.every((p) => p.playing !== false)).toBe(true);
    expect(next.activePlayerIndex).toBe(0);
  });

  it('new games start with everyone playing', () => {
    const state = fsm.createInitialState({ playerNames: ['A', 'B'], initialMs: 60_000 });
    expect(state.players.every((p) => p.playing === true)).toBe(true);
  });
});

describe('editing while the clock runs', () => {
  it('reorders a running game and keeps the same player on the clock', () => {
    const next = fsm.reorder(three(), { newOrder: ['c', 'a', 'b'] });
    expect(next.players[next.activePlayerIndex].id).toBe('a');
    expect(next.turnStartedAtMs).toBe(1_000_000);
  });

  it('sets the running player\'s time so it reads exactly as set at that moment', () => {
    const state = three();
    const next = fsm.setPlayerTime(state, { playerId: 'a', remainingMs: 30_000, nowMs: 1_004_000 });
    expect(fsm.currentRemainingMs(next, 0, 1_004_000)).toBe(30_000);
  });

  it('sets a waiting player\'s time as given', () => {
    const next = fsm.setPlayerTime(three(), { playerId: 'b', remainingMs: 30_000, nowMs: 1_004_000 });
    expect(next.players[1].remainingMs).toBe(30_000);
  });

  it('sets the active player\'s time as given while paused', () => {
    const state = three({ status: 'paused', turnStartedAtMs: null });
    const next = fsm.setPlayerTime(state, { playerId: 'a', remainingMs: 30_000, nowMs: 2_000_000 });
    expect(next.players[0].remainingMs).toBe(30_000);
  });
});
