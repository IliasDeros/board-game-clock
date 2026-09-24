export class InvalidTransitionError extends Error {}

// Starting time for the player at `index`: each seat after the first gets
// `decrementMs` less than the one before it (never below zero).
export function startingMs(initialMs, decrementMs, index) {
  return Math.max(0, initialMs - index * decrementMs);
}

export function createInitialState({ playerNames, initialMs, decrementMs = 0 }) {
  return {
    players: playerNames.map((name, i) => ({
      id: crypto.randomUUID(),
      name,
      remainingMs: startingMs(initialMs, decrementMs, i),
    })),
    activePlayerIndex: 0,
    status: 'paused',
    turnStartedAtMs: null,
    initialMs,
    decrementMs,
  };
}

function nextIndex(state) {
  return (state.activePlayerIndex + 1) % state.players.length;
}

// Time left for the player at `index` as of `nowMs`. Callers pass server-clock
// time, so the value shown on screen and the value committed when a turn ends
// come from the same formula and the same clock. A `nowMs` slightly before
// turnStartedAtMs (offset error) counts as zero elapsed, never negative.
export function currentRemainingMs(state, index, nowMs) {
  const player = state.players[index];
  if (state.status !== 'running' || index !== state.activePlayerIndex || state.turnStartedAtMs == null) {
    return player.remainingMs;
  }
  return player.remainingMs - Math.max(0, nowMs - state.turnStartedAtMs);
}

function deductElapsed(state, nowMs) {
  return state.players.map((p, i) => ({ ...p, remainingMs: currentRemainingMs(state, i, nowMs) }));
}

export function endTurn(state, { playerId, nowMs }) {
  if (state.status !== 'running') throw new InvalidTransitionError('not running');
  const active = state.players[state.activePlayerIndex];
  if (!active || active.id !== playerId) {
    throw new InvalidTransitionError('caller is not the active player');
  }
  return {
    ...state,
    players: deductElapsed(state, nowMs),
    activePlayerIndex: nextIndex(state),
    turnStartedAtMs: nowMs,
  };
}

export function pause(state, { nowMs }) {
  if (state.status !== 'running') throw new InvalidTransitionError('not running');
  return {
    ...state,
    players: deductElapsed(state, nowMs),
    status: 'paused',
    turnStartedAtMs: null,
  };
}

export function resume(state, { nowMs }) {
  if (state.status !== 'paused') throw new InvalidTransitionError('not paused');
  return { ...state, status: 'running', turnStartedAtMs: nowMs };
}

export function reset(state) {
  return {
    ...state,
    players: state.players.map((p, i) => ({
      ...p,
      remainingMs: startingMs(state.initialMs, state.decrementMs ?? 0, i),
    })),
    activePlayerIndex: 0,
    status: 'paused',
    turnStartedAtMs: null,
  };
}

export function reorder(state, { newOrder }) {
  if (state.status !== 'paused') throw new InvalidTransitionError('not paused');
  if (newOrder.length !== state.players.length) {
    throw new InvalidTransitionError('newOrder length mismatch');
  }
  const byId = new Map(state.players.map((p) => [p.id, p]));
  const players = newOrder.map((id) => {
    const p = byId.get(id);
    if (!p) throw new InvalidTransitionError('unknown player id in newOrder');
    return p;
  });
  const activePlayerId = state.players[state.activePlayerIndex].id;
  return { ...state, players, activePlayerIndex: players.findIndex((p) => p.id === activePlayerId) };
}

export function renamePlayer(state, { playerId, name }) {
  return {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? { ...p, name } : p)),
  };
}

export function setPlayerTime(state, { playerId, remainingMs }) {
  return {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? { ...p, remainingMs } : p)),
  };
}
