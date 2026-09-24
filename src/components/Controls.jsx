import { useState } from 'react';

function Icon({ children }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {children}
    </svg>
  );
}

function StrokeIcon({ children }) {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function Controls({ status, onPause, onResume, onReset, onToggleReorder, shareUrl }) {
  const [copied, setCopied] = useState(false);
  const [pressed, setPressed] = useState(null);

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

  // Acknowledge each tap at once; the state only changes when the server confirms.
  // `name` is the button's own class list; the result adds the press pulse while
  // this button is the one that was pressed.
  function pulse(key, name = '') {
    return {
      className: `${name}${pressed === key ? ' pressed' : ''}`.trim(),
      onAnimationEnd: () => setPressed(null),
    };
  }
  const press = (key, action) => () => { setPressed(key); action(); };

  return (
    <div className="controls">
      {status === 'running' ? (
        <button {...pulse('playPause', 'btn-primary btn-icon')} aria-label="Pause" onClick={press('playPause', onPause)}>
          <Icon><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></Icon>
        </button>
      ) : (
        <button {...pulse('playPause', 'btn-primary btn-icon')} aria-label="Resume" onClick={press('playPause', onResume)}>
          <Icon><path d="M8 5.5v13a.5.5 0 0 0 .77.42l10-6.5a.5.5 0 0 0 0-.84l-10-6.5A.5.5 0 0 0 8 5.5z" /></Icon>
        </button>
      )}
      <button {...pulse('reset')} onClick={press('reset', handleReset)}>Reset</button>
      <button {...pulse('edit')} onClick={press('edit', onToggleReorder)}>
        Edit Players
      </button>
      <button {...pulse('copy', 'btn-with-icon')} onClick={press('copy', copyLink)}>
        <StrokeIcon>
          {copied ? (
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          ) : (
            <>
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V6a2 2 0 0 1 2-2h9" />
            </>
          )}
        </StrokeIcon>
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
    </div>
  );
}
