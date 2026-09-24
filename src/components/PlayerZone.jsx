export function PlayerZone({ player, isActive, displayedMs, status, onTap, onResume }) {
  const negative = displayedMs < 0;
  const totalSeconds = Math.floor(Math.abs(displayedMs) / 1000);
  const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const ss = (totalSeconds % 60).toString().padStart(2, '0');

  function handleClick() {
    if (!isActive) return;
    if (status === 'running') onTap(player.id);
    else onResume();
  }

  return (
    <div
      className={`player-zone${isActive ? ' active' : ''}${negative ? ' negative' : ''}`}
      onClick={handleClick}
    >
      <div className="player-name">{player.name}</div>
      <div className="player-time">{negative ? '-' : ''}{mm}:{ss}</div>
    </div>
  );
}
