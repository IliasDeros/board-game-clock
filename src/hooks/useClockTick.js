import { useEffect, useRef, useState } from 'react';

const TICK_MS = 200;

export function useClockTick(game) {
  const anchorRef = useRef(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (game && game.status === 'running' && !game.hasPendingWrites && game.turnStartedAtMs != null) {
      const current = anchorRef.current;
      if (!current || current.turnStartedAtMs !== game.turnStartedAtMs) {
        // Anchor on the first *confirmed* (non-optimistic) snapshot for this
        // turn, so the countdown's zero-point is calibrated once per turn
        // against the server-committed turnStartedAt rather than a local guess.
        anchorRef.current = { turnStartedAtMs: game.turnStartedAtMs, localAnchorMs: Date.now() };
      }
    } else {
      anchorRef.current = null;
    }
  }, [game]);

  useEffect(() => {
    if (game?.status !== 'running') return;
    const id = setInterval(() => forceRender((n) => n + 1), TICK_MS);
    return () => clearInterval(id);
  }, [game?.status]);

  function displayedRemainingMs(player, index) {
    // The anchor is (re)set in an effect, i.e. after the render that first sees
    // a new snapshot. Ignore an anchor left over from a previous turn, or the
    // new active player briefly shows their time minus the last turn's elapsed.
    const anchor = anchorRef.current;
    if (
      !game || game.status !== 'running' || index !== game.activePlayerIndex ||
      !anchor || anchor.turnStartedAtMs !== game.turnStartedAtMs
    ) {
      return player.remainingMs;
    }
    const elapsed = Date.now() - anchor.localAnchorMs;
    return player.remainingMs - elapsed;
  }

  return { displayedRemainingMs };
}
