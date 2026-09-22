import { useParams } from 'react-router-dom';
import { useGameDoc } from '../hooks/useGameDoc';
import { useClockTick } from '../hooks/useClockTick';
import { PlayerZone } from '../components/PlayerZone';
import * as transactions from '../state/gameTransactions';

export function GamePage() {
  const { gameId } = useParams();
  const { game, error } = useGameDoc(gameId);
  const { displayedRemainingMs } = useClockTick(game);

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
    </div>
  );
}
