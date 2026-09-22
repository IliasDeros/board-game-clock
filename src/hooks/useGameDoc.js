import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function useGameDoc(gameId) {
  const [game, setGame] = useState(null);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setGame(null);
    setError(null);
    setNotFound(false);

    const ref = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snap) => {
        if (!snap.exists()) {
          setGame(null);
          setNotFound(true);
          return;
        }
        setNotFound(false);
        const data = snap.data();
        setGame({
          players: data.players,
          activePlayerIndex: data.activePlayerIndex,
          status: data.status,
          turnStartedAtMs: data.turnStartedAt ? data.turnStartedAt.toMillis() : null,
          initialMs: data.initialMs,
          hasPendingWrites: snap.metadata.hasPendingWrites,
        });
      },
      (err) => setError(err)
    );
    return unsubscribe;
  }, [gameId]);

  return { game, error, notFound };
}
