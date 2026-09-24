import { Link } from 'react-router-dom';
import { useRecentGames } from '../hooks/useRecentGames';
import { formatAgo, formatDuration } from '../state/recentGames';

export function JoinGameCard() {
  const games = useRecentGames();

  return (
    <section className="create-card join-card">
      <h1>Join game</h1>
      {games.length === 0 ? (
        <p className="field-hint join-empty">No games created in the last 2 minutes.</p>
      ) : (
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
      )}
    </section>
  );
}
