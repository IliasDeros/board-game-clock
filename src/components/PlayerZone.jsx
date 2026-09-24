import { useState } from 'react';

const MAX_TILT_DEG = 7;

function clamp(n) {
  return Math.min(1, Math.max(-1, n));
}

export function PlayerZone({ player, isActive, displayedMs, status, onTap, onResume }) {
  const [pressed, setPressed] = useState(false);
  const [pressing, setPressing] = useState(false);
  const playing = player.playing !== false;
  const negative = displayedMs < 0;
  const totalSeconds = Math.floor(Math.abs(displayedMs) / 1000);
  const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const ss = (totalSeconds % 60).toString().padStart(2, '0');

  // Lean toward the touch point: a tap on the right sends the right edge away
  // from the viewer, a tap at the bottom sends the bottom edge away.
  function handlePointerDown(e) {
    if (!playing || e.button !== 0) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1);
    el.style.setProperty('--tilt-x', `${-y * MAX_TILT_DEG}deg`);
    el.style.setProperty('--tilt-y', `${x * MAX_TILT_DEG}deg`);
    setPressing(true);
  }

  function handleClick() {
    // Acknowledge the tap at once; the state only changes when the server confirms.
    // The lean is dropped in the same render the release animation starts, so
    // the zone never flashes flat in between.
    if (!playing || !isActive) return;
    setPressing(false);
    setPressed(true);
    if (status === 'running') onTap(player.id);
    else onResume();
  }

  return (
    <div
      className={`player-zone${isActive ? ' active' : ''}${negative ? ' negative' : ''}${playing ? '' : ' sitting-out'}${pressing ? ' pressing' : ''}${pressed ? ' pressed' : ''}`}
      onPointerDown={handlePointerDown}
      // An active zone keeps its lean until the click that follows hands over to
      // the release animation (the timer only catches a release that never
      // clicks). An inactive zone has no click to wait for: it just eases back.
      onPointerUp={() => (isActive ? setTimeout(() => setPressing(false), 150) : setPressing(false))}
      // On touch this fires right after pointerup, before the click; an active zone ignores it there.
      onPointerLeave={(e) => { if (!(isActive && e.pointerType === 'touch')) setPressing(false); }}
      onPointerCancel={() => setPressing(false)}
      onClick={handleClick}
      onAnimationEnd={(e) => { if (e.target === e.currentTarget) setPressed(false); }}
    >
      <div className="player-name">{player.name}</div>
      <div className="player-time">{negative ? '-' : ''}{mm}:{ss}</div>
      {isActive && playing && (
        <div className="player-prompt">{status === 'running' ? 'Press to end turn' : 'Press to resume turn'}</div>
      )}
    </div>
  );
}
