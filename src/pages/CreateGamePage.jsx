import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame } from '../state/createGame';
import { HeroDemo } from '../components/HeroDemo';
import { formatMinutes } from '../state/minutes';

const PLAYER_COUNT_OPTIONS = Array.from({ length: 9 }, (_, i) => i + 2); // 2..10
const MINUTES_OPTIONS = [60, 120, 180, 210, 240, 300, 600, 900, 1800].map((seconds) => seconds * 1000);
const DEFAULT_INITIAL_MS = 120000;

export function CreateGamePage() {
  const [numPlayers, setNumPlayers] = useState(4);
  const [initialMs, setInitialMs] = useState(DEFAULT_INITIAL_MS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const playerNames = Array.from({ length: numPlayers }, (_, i) => `Player ${i + 1}`);
      const gameId = await createGame({ playerNames, initialMs });
      navigate(`/game/${gameId}`);
    } catch (err) {
      setBusy(false);
      setError(err.message || 'Something went wrong creating the game.');
    }
  }

  return (
    <div className="create-page">
      <HeroDemo />
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </span>
        bg clock
      </div>
      <form className="create-card" onSubmit={handleSubmit}>
        <h1>New game</h1>
        <label>
          Players
          <select value={numPlayers} disabled={busy}
            onChange={(e) => setNumPlayers(Number(e.target.value))}>
            {PLAYER_COUNT_OPTIONS.map((count) => (
              <option key={count} value={count}>{count}</option>
            ))}
          </select>
        </label>
        <fieldset className="minutes-picker" disabled={busy}>
          <legend>Minutes per player</legend>
          <div className="minutes-grid">
            {MINUTES_OPTIONS.map((ms) => (
              <label key={ms} className="minutes-option">
                <input type="radio" name="minutes" value={ms} checked={initialMs === ms}
                  onChange={() => setInitialMs(ms)} />
                <span>{formatMinutes(ms)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>Create clock</button>
      </form>
    </div>
  );
}
