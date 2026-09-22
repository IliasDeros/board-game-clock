import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function useGameDoc(gameId) {
  const [game, setGame] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ref = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snap) => {
        if (!snap.exists()) {
          setGame(null);
          return;
        }
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

  return { game, error };
}
