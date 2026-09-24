import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { serverClockReady, serverNowMs } from './serverClock';

// How long a new game stays listed on the Join game box.
export const RECENT_WINDOW_MS = 2 * 60 * 1000;

const MAX_GAMES = 20;
// The query's lower bound is built from our estimate of the server clock, and
// the Firestore rule only allows bounds within 3 minutes of the server's time.
// The extra slack covers offset error without brushing against that limit.
const QUERY_SLACK_MS = 5000;

export function formatAgo(ageMs) {
  const seconds = Math.max(0, Math.floor(ageMs / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)} min ago`;
}

// 120000 -> "2:00", 3725000 -> "1:02:05"
export function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export async function fetchRecentGames() {
  await serverClockReady();
  const since = Timestamp.fromMillis(serverNowMs() - RECENT_WINDOW_MS - QUERY_SLACK_MS);
  const snap = await getDocs(
    query(collection(db, 'games'), where('createdAt', '>', since), orderBy('createdAt', 'desc'), limit(MAX_GAMES))
  );
  return snap.docs.map((d) => {
    const data = d.data({ serverTimestamps: 'estimate' });
    return {
      id: d.id,
      playerCount: data.players.length,
      initialMs: data.initialMs,
      createdAtMs: data.createdAt.toMillis(),
    };
  });
}
