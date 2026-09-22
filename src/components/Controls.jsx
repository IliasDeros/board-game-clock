import { useState } from 'react';

export function Controls({ status, onPause, onResume, onReset, onToggleReorder, reordering, shareUrl }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleReset() {
    if (window.confirm('Reset the clock? This clears elapsed time for all players.')) {
      onReset();
    }
  }

  return (
    <div className="controls">
      {status === 'running' ? (
        <button onClick={onPause}>Pause</button>
      ) : (
        <button className="btn-primary" onClick={onResume}>Resume</button>
      )}
      <button onClick={handleReset}>Reset</button>
      <button onClick={onToggleReorder} disabled={status !== 'paused'}>
        {reordering ? 'Done Reordering' : 'Reorder Players'}
      </button>
      <button onClick={copyLink}>{copied ? 'Copied!' : 'Link to Share'}</button>
    </div>
  );
}
