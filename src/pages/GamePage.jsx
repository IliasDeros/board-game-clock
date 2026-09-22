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
  const { game, error, notFound } = useGameDoc(gameId);
  const { displayedRemainingMs } = useClockTick(game);
  const [reordering, setReordering] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [actionError, setActionError] = useState(null);

  function runAction(promise) {
    promise.catch((err) => setActionError(err.message || 'Something went wrong'));
  }

  if (error) return <p>Error loading game: {error.message}</p>;
  if (notFound) {
    return (
      <p>
        This game doesn&apos;t exist — it may have expired. <a href="/">Create a new one</a>
      </p>
    );
  }
  if (!game) return <p>Loading...</p>;

  return (
    <div className="game-page">
      {actionError && (
        <div className="action-error">
          {actionError}
          <button onClick={() => setActionError(null)}>&times;</button>
        </div>
      )}
      {reordering ? (
        <ReorderList
          players={game.players}
          onMove={(newOrder) => runAction(transactions.reorder(gameId, newOrder))}
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
              onTap={(playerId) => runAction(transactions.endTurn(gameId, playerId))}
              onEdit={setEditingPlayer}
            />
          ))}
        </div>
      )}
      <Controls
        status={game.status}
        onPause={() => runAction(transactions.pause(gameId))}
        onResume={() => runAction(transactions.resume(gameId))}
        onReset={() => runAction(transactions.reset(gameId))}
        onToggleReorder={() => setReordering((r) => !r)}
        reordering={reordering}
        shareUrl={window.location.href}
      />
      {editingPlayer && (
        <EditPlayerModal
          player={editingPlayer}
          onSave={({ name, remainingMs }) => {
            runAction(transactions.renamePlayer(gameId, editingPlayer.id, name));
            runAction(transactions.setPlayerTime(gameId, editingPlayer.id, remainingMs));
          }}
          onClose={() => setEditingPlayer(null)}
        />
      )}
    </div>
  );
}
