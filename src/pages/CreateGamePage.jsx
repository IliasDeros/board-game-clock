import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame } from '../state/createGame';

const DEFAULT_TIME_VALUE = '00:10:00';
const PLAYER_COUNT_OPTIONS = Array.from({ length: 9 }, (_, i) => i + 2); // 2..10

function parseTimeToMs(value) {
  if (!value) return null;
  const parts = value.split(':').map(Number);
  if (parts.length < 2) return null;
  const [h, m, s = 0] = parts;
  if ([h, m, s].some((n) => Number.isNaN(n))) return null;
  return ((h * 3600) + (m * 60) + s) * 1000;
}

export function CreateGamePage() {
  const [numPlayers, setNumPlayers] = useState(4);
  const [timeValue, setTimeValue] = useState(DEFAULT_TIME_VALUE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function handleTimeChange(e) {
    const next = e.target.value;
    // Defensively guard against an empty/unparseable value (e.g. the user
    // clears the field): fall back to the last valid value instead of
    // letting the state go bad.
    if (parseTimeToMs(next) !== null) {
      setTimeValue(next);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const playerNames = Array.from({ length: numPlayers }, (_, i) => `Player ${i + 1}`);
      const initialMs = parseTimeToMs(timeValue) ?? parseTimeToMs(DEFAULT_TIME_VALUE);
      const gameId = await createGame({ playerNames, initialMs });
      navigate(`/game/${gameId}`);
    } catch (err) {
      setBusy(false);
      setError(err.message || 'Something went wrong creating the game.');
    }
  }

  return (
    <div className="create-page">
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
        <label>
          Starting time
          <input type="time" step="1" className="time-input" required value={timeValue}
            disabled={busy} onChange={handleTimeChange} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>Create clock</button>
      </form>
    </div>
  );
}
