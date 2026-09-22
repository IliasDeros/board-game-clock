import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useGameDoc } from '../hooks/useGameDoc';
import { useClockTick } from '../hooks/useClockTick';
import { PlayerZone } from '../components/PlayerZone';
import { Controls } from '../components/Controls';
import * as transactions from '../state/gameTransactions';

export function GamePage() {
  const { gameId } = useParams();
  const { game, error } = useGameDoc(gameId);
  const { displayedRemainingMs } = useClockTick(game);
  const [reordering, setReordering] = useState(false);

  if (error) return <p>Error loading game: {error.message}</p>;
  if (!game) return <p>Loading...</p>;

  return (
    <div className="game-page">
      <div className="player-zones">
        {game.players.map((player, index) => (
          <PlayerZone
            key={player.id}
            player={player}
            isActive={index === game.activePlayerIndex}
            displayedMs={displayedRemainingMs(player, index)}
            status={game.status}
            onTap={(playerId) => transactions.endTurn(gameId, playerId)}
            onEdit={() => {}}
          />
        ))}
      </div>
      <Controls
        status={game.status}
        onPause={() => transactions.pause(gameId)}
        onResume={() => transactions.resume(gameId)}
        onReset={() => transactions.reset(gameId)}
        onToggleReorder={() => setReordering((r) => !r)}
        reordering={reordering}
        shareUrl={window.location.href}
      />
    </div>
  );
}
