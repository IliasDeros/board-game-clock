import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useGameDoc } from '../hooks/useGameDoc';
import { useClockTick } from '../hooks/useClockTick';
import { PlayerZone } from '../components/PlayerZone';
import { Controls } from '../components/Controls';
import { ReorderList } from '../components/ReorderList';
import { EditPlayerModal } from '../components/EditPlayerModal';
import * as transactions from '../state/gameTransactions';

export function GamePage() {
  const { gameId } = useParams();
  const { game, error } = useGameDoc(gameId);
  const { displayedRemainingMs } = useClockTick(game);
  const [reordering, setReordering] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);

  if (error) return <p>Error loading game: {error.message}</p>;
  if (!game) return <p>Loading...</p>;

  return (
    <div className="game-page">
      {reordering ? (
        <ReorderList
          players={game.players}
          onMove={(newOrder) => transactions.reorder(gameId, newOrder)}
          onDone={() => setReordering(false)}
        />
      ) : (
        <div className="player-zones">
          {game.players.map((player, index) => (
            <PlayerZone
              key={player.id}
              player={player}
              isActive={index === game.activePlayerIndex}
              displayedMs={displayedRemainingMs(player, index)}
              status={game.status}
              onTap={(playerId) => transactions.endTurn(gameId, playerId)}
              onEdit={setEditingPlayer}
            />
          ))}
        </div>
      )}
      <Controls
        status={game.status}
        onPause={() => transactions.pause(gameId)}
        onResume={() => transactions.resume(gameId)}
        onReset={() => transactions.reset(gameId)}
        onToggleReorder={() => setReordering((r) => !r)}
        reordering={reordering}
        shareUrl={window.location.href}
      />
      {editingPlayer && (
        <EditPlayerModal
          player={editingPlayer}
          onSave={({ name, remainingMs }) => {
            transactions.renamePlayer(gameId, editingPlayer.id, name);
            transactions.setPlayerTime(gameId, editingPlayer.id, remainingMs);
          }}
          onClose={() => setEditingPlayer(null)}
        />
      )}
    </div>
  );
}
