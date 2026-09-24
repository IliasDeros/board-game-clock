export class InvalidTransitionError extends Error {}

export const SERVER_NOW = 'SERVER_NOW';

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

function deductElapsed(state, nowMs) {
  const elapsed = nowMs - state.turnStartedAtMs;
  return state.players.map((p, i) =>
    i === state.activePlayerIndex ? { ...p, remainingMs: p.remainingMs - elapsed } : p
  );
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
    turnStartedAtMs: SERVER_NOW,
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

export function resume(state) {
  if (state.status !== 'paused') throw new InvalidTransitionError('not paused');
  return { ...state, status: 'running', turnStartedAtMs: SERVER_NOW };
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
