import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame } from '../state/createGame';
import { HeroDemo } from '../components/HeroDemo';
import { TimeWheelPicker } from '../components/TimeWheelPicker';
import { ThemeToggle } from '../components/ThemeToggle';

const PLAYER_COUNT_OPTIONS = Array.from({ length: 9 }, (_, i) => i + 2); // 2..10
const DEFAULT_INITIAL_MS = 120000;

export function CreateGamePage() {
  const [numPlayers, setNumPlayers] = useState(4);
  const [initialMs, setInitialMs] = useState(DEFAULT_INITIAL_MS);
  const [decrementMs, setDecrementMs] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const playerNames = Array.from({ length: numPlayers }, (_, i) => `Player ${i + 1}`);
      const gameId = await createGame({ playerNames, initialMs, decrementMs });
      navigate(`/game/${gameId}`);
    } catch (err) {
      setBusy(false);
      setError(err.message || 'Something went wrong creating the game.');
    }
  }

  return (
    <div className="create-page">
      <HeroDemo />
      <div className="brand-row">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
          bg clock
        </div>
        <ThemeToggle />
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
          <legend>Time per player</legend>
          <TimeWheelPicker valueMs={initialMs} onChange={setInitialMs} disabled={busy} />
        </fieldset>
        <details
          className="advanced-options"
          open={advancedOpen}
          onToggle={(e) => setAdvancedOpen(e.currentTarget.open)}
        >
          <summary>Advanced options</summary>
          {advancedOpen && (
            <fieldset className="minutes-picker" disabled={busy}>
              <legend>Decrement</legend>
              <p className="field-hint">
                Each player after the first starts with this much less time than the one before.
              </p>
              <TimeWheelPicker valueMs={decrementMs} onChange={setDecrementMs} disabled={busy} />
            </fieldset>
          )}
        </details>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy || initialMs <= 0}>Create clock</button>
      </form>
    </div>
  );
}
