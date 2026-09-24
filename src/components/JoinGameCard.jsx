import { Link } from 'react-router-dom';
import { useRecentGames } from '../hooks/useRecentGames';
import { formatAgo, formatDuration } from '../state/recentGames';

export function JoinGameCard() {
  const games = useRecentGames();

  if (games.length === 0) return null;

  return (
    <section className="create-card join-card">
      <h1>Join game</h1>
      <ul className="join-list">
        {games.map((g) => (
          <li key={g.id}>
            <Link className="join-item" to={`/game/${g.id}`}>
              <span className="join-players">{g.playerCount}p, {formatDuration(g.initialMs)}</span>
              <span className="join-age">{formatAgo(g.ageMs)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
