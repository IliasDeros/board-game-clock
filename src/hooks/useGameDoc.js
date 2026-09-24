import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { db } from '../firebase';

function toGame(data) {
  return {
    players: data.players,
    activePlayerIndex: data.activePlayerIndex,
    status: data.status,
    turnStartedAtMs: data.turnStartedAt ? data.turnStartedAt.toMillis() : null,
    initialMs: data.initialMs,
  };
}

export function useGameDoc(gameId) {
  const [game, setGame] = useState(null);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [listenerNonce, setListenerNonce] = useState(0);

  useEffect(() => {
    setGame(null);
    setError(null);
    setNotFound(false);
  }, [gameId]);

  useEffect(() => {
    const ref = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setGame(null);
          setNotFound(true);
          return;
        }
        setNotFound(false);
        setGame(toGame(snap.data()));
      },
      (err) => setError(err)
    );
    return unsubscribe;
  }, [gameId, listenerNonce]);

  // Recovers a listener that has silently stopped delivering updates: show the
  // server's current state right away, and open a fresh listener.
  const refresh = useCallback(async () => {
    setListenerNonce((n) => n + 1);
    try {
      const snap = await getDocFromServer(doc(db, 'games', gameId));
      if (snap.exists()) setGame(toGame(snap.data()));
    } catch {
      // Offline: the fresh listener will catch up when the connection returns.
    }
  }, [gameId]);

  // A backgrounded tab or a network change is when listeners most often stall.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', refresh);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', refresh);
    };
  }, [refresh]);

  return { game, error, notFound, refresh };
}
