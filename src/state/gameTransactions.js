import { doc, runTransaction, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import * as fsm from './fsm';

const EXPIRY_MS = 90 * 24 * 60 * 60 * 1000;

function docToState(data) {
  return {
    players: data.players,
    activePlayerIndex: data.activePlayerIndex,
    status: data.status,
    turnStartedAtMs: data.turnStartedAt ? data.turnStartedAt.toMillis() : null,
    initialMs: data.initialMs,
  };
}

function stateToUpdate(state) {
  return {
    players: state.players,
    activePlayerIndex: state.activePlayerIndex,
    status: state.status,
    turnStartedAt:
      state.turnStartedAtMs === fsm.SERVER_NOW ? Timestamp.now()
      : state.turnStartedAtMs == null ? null
      : Timestamp.fromMillis(state.turnStartedAtMs),
    initialMs: state.initialMs,
    expiresAt: Timestamp.fromMillis(Date.now() + EXPIRY_MS),
  };
}

async function applyTransition(gameId, transitionFn, args) {
  const ref = doc(db, 'games', gameId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Game not found');
    const state = docToState(snap.data());
    let nextState;
    try {
      nextState = transitionFn(state, args);
    } catch (err) {
      if (err instanceof fsm.InvalidTransitionError) return;
      throw err;
    }
    tx.update(ref, stateToUpdate(nextState));
  });
}

export function endTurn(gameId, playerId) {
  return applyTransition(gameId, fsm.endTurn, { playerId, nowMs: Date.now() });
}

export function pause(gameId) {
  return applyTransition(gameId, fsm.pause, { nowMs: Date.now() });
}

export function resume(gameId) {
  return applyTransition(gameId, fsm.resume, undefined);
}

export function reset(gameId) {
  return applyTransition(gameId, fsm.reset, undefined);
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
