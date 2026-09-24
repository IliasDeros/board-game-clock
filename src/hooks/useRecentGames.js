import { useEffect, useState } from 'react';
import { RECENT_WINDOW_MS, fetchRecentGames } from '../state/recentGames';
import { serverNowMs, useServerClock } from '../state/serverClock';

const POLL_MS = 10000;

// Games created less than RECENT_WINDOW_MS ago, newest first, with their age.
export function useRecentGames() {
  useServerClock();
  const [games, setGames] = useState([]);
  const [, setTicks] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (document.visibilityState === 'hidden') return;
      try {
        const next = await fetchRecentGames();
        if (!cancelled) setGames(next);
      } catch (err) {
        console.warn('Could not load recent games', err);
      }
    }
    load();
    const poll = setInterval(load, POLL_MS);
    const second = setInterval(() => setTicks((n) => n + 1), 1000);
    document.addEventListener('visibilitychange', load);
    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(second);
      document.removeEventListener('visibilitychange', load);
    };
  }, []);

  const now = serverNowMs();
  return games
    .map((g) => ({ ...g, ageMs: Math.max(0, now - g.createdAtMs) }))
    .filter((g) => g.ageMs < RECENT_WINDOW_MS);
}
