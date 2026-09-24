import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { db } from '../firebase';
import { createInitialState } from './fsm';

const EXPIRY_MS = 90 * 24 * 60 * 60 * 1000;

export async function createGame({ playerNames, initialMs, decrementMs }) {
  const gameId = nanoid(16);
  const state = createInitialState({ playerNames, initialMs, decrementMs });

  await setDoc(doc(db, 'games', gameId), {
    players: state.players,
    activePlayerIndex: state.activePlayerIndex,
    status: state.status,
    turnStartedAt: null,
    initialMs: state.initialMs,
    decrementMs: state.decrementMs,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + EXPIRY_MS),
  });

  return gameId;
}
