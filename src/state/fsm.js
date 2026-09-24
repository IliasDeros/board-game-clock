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
      playing: true,
    })),
    activePlayerIndex: 0,
    status: 'paused',
    turnStartedAtMs: null,
    initialMs,
    decrementMs,
  };
}

// A player with no flag (a game made before players could sit out) is playing.
function isPlaying(player) {
  return player.playing !== false;
}

// The next player after the active one who is still in the rotation. Falls
// back to the active player when nobody else is playing.
function nextIndex(state) {
  const count = state.players.length;
  for (let step = 1; step <= count; step++) {
    const index = (state.activePlayerIndex + step) % count;
    if (isPlaying(state.players[index])) return index;
  }
  return state.activePlayerIndex;
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
      playing: true,
    })),
    activePlayerIndex: 0,
    status: 'paused',
    turnStartedAtMs: null,
  };
}

// Allowed while the clock runs: the active player is followed by id, and their
// clock (players[].remainingMs plus turnStartedAtMs) is untouched by the move.
export function reorder(state, { newOrder }) {
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

// While the clock runs, the active player's displayed time is their stored time
// minus the turn so far, so the stored value is set that much higher for the
// display to read exactly `remainingMs` at `nowMs`.
export function setPlayerTime(state, { playerId, remainingMs, nowMs }) {
  const runningTurn = state.status === 'running' && state.turnStartedAtMs != null;
  const elapsed = runningTurn ? Math.max(0, nowMs - state.turnStartedAtMs) : 0;
  return {
    ...state,
    players: state.players.map((p, i) => {
      if (p.id !== playerId) return p;
      return { ...p, remainingMs: i === state.activePlayerIndex ? remainingMs + elapsed : remainingMs };
    }),
  };
}

// Takes a player out of (or back into) the rotation. Taking out the player whose
// turn it is ends that turn on the spot, charging what they have used.
export function setPlayerPlaying(state, { playerId, playing, nowMs }) {
  if (!state.players.some((p) => p.id === playerId)) {
    throw new InvalidTransitionError('unknown player id');
  }
  const withFlag = (players) => players.map((p) => (p.id === playerId ? { ...p, playing } : p));

  if (!playing && state.players.filter((p) => isPlaying(p) && p.id !== playerId).length === 0) {
    throw new InvalidTransitionError('at least one player must keep playing');
  }

  const active = state.players[state.activePlayerIndex];
  if (playing || active.id !== playerId) {
    return { ...state, players: withFlag(state.players) };
  }

  const settled = { ...state, players: withFlag(deductElapsed(state, nowMs)) };
  return {
    ...settled,
    activePlayerIndex: nextIndex(settled),
    turnStartedAtMs: state.status === 'running' ? nowMs : null,
  };
}
