import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame } from '../state/createGame';

export function CreateGamePage() {
  const [numPlayers, setNumPlayers] = useState(4);
  const [minutes, setMinutes] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const playerNames = Array.from({ length: numPlayers }, (_, i) => `Player ${i + 1}`);
      const gameId = await createGame({ playerNames, initialMs: minutes * 60 * 1000 });
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
          <input type="number" min={2} max={12} required value={numPlayers}
            onChange={(e) => setNumPlayers(Number(e.target.value))} />
        </label>
        <label>
          Minutes per player
          <input type="number" min={1} required value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>Create clock</button>
      </form>
    </div>
  );
}
