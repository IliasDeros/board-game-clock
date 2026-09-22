export function PlayerZone({ player, isActive, displayedMs, status, onTap, onEdit }) {
  const negative = displayedMs < 0;
  const totalSeconds = Math.floor(Math.abs(displayedMs) / 1000);
  const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const ss = (totalSeconds % 60).toString().padStart(2, '0');
  const tappable = isActive && status === 'running';

  return (
    <div
      className={`player-zone${isActive ? ' active' : ''}${negative ? ' negative' : ''}`}
      onClick={() => tappable && onTap(player.id)}
    >
      <div className="player-name">{player.name}</div>
      <div className="player-time">{negative ? '-' : ''}{mm}:{ss}</div>
      <button onClick={(e) => { e.stopPropagation(); onEdit(player); }}>Edit</button>
    </div>
  );
}
