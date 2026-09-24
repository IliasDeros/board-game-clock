import { doc, runTransaction, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import * as fsm from './fsm';
import { serverClockReady, serverNowMs } from './serverClock';

const EXPIRY_MS = 90 * 24 * 60 * 60 * 1000;

function docToState(data) {
  return {
    players: data.players,
    activePlayerIndex: data.activePlayerIndex,
    status: data.status,
    turnStartedAtMs: data.turnStartedAt ? data.turnStartedAt.toMillis() : null,
    initialMs: data.initialMs,
    decrementMs: data.decrementMs ?? 0,
  };
}

function stateToUpdate(state) {
  return {
    players: state.players,
    activePlayerIndex: state.activePlayerIndex,
    status: state.status,
    turnStartedAt: state.turnStartedAtMs == null ? null : Timestamp.fromMillis(state.turnStartedAtMs),
    initialMs: state.initialMs,
    expiresAt: Timestamp.fromMillis(Date.now() + EXPIRY_MS),
  };
}

// `nowMs` is the moment of the click on the server's clock (this device's clock
// plus its measured offset). Using one clock for every device is what keeps a
// device with a skewed clock from corrupting the times it commits.
//
// Resolves to 'applied', or 'ignored' when the game's current server state does
// not allow the transition (for example, this device was showing a stale turn).
async function applyTransition(gameId, transitionFn, args) {
  await serverClockReady();
  const nowMs = serverNowMs();
  const ref = doc(db, 'games', gameId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Game not found');
    const state = docToState(snap.data());
    let nextState;
    try {
      nextState = transitionFn(state, { ...args, nowMs });
    } catch (err) {
      if (err instanceof fsm.InvalidTransitionError) return 'ignored';
      throw err;
    }
    tx.update(ref, stateToUpdate(nextState));
    return 'applied';
  });
}

export function endTurn(gameId, playerId) {
  return applyTransition(gameId, fsm.endTurn, { playerId });
}

export function pause(gameId) {
  return applyTransition(gameId, fsm.pause);
}

export function resume(gameId) {
  return applyTransition(gameId, fsm.resume);
}

export function reset(gameId) {
  return applyTransition(gameId, fsm.reset);
}

export function reorder(gameId, newOrder) {
  return applyTransition(gameId, fsm.reorder, { newOrder });
}

export function renamePlayer(gameId, playerId, name) {
  return applyTransition(gameId, fsm.renamePlayer, { playerId, name });
}

export function setPlayerTime(gameId, playerId, remainingMs) {
  return applyTransition(gameId, fsm.setPlayerTime, { playerId, remainingMs });
}

export function setPlayerPlaying(gameId, playerId, playing) {
  return applyTransition(gameId, fsm.setPlayerPlaying, { playerId, playing });
}
