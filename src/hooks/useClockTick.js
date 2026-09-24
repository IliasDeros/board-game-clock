import { useEffect, useState } from 'react';
import { currentRemainingMs } from '../state/fsm';
import { serverNowMs, useServerClock } from '../state/serverClock';

const TICK_MS = 200;

export function useClockTick(game) {
  const [, forceRender] = useState(0);
  // Re-renders when the measured server-clock offset changes.
  useServerClock();

  useEffect(() => {
    if (game?.status !== 'running') return;
    const id = setInterval(() => forceRender((n) => n + 1), TICK_MS);
    return () => clearInterval(id);
  }, [game?.status]);

  // Same formula and clock as the deduction committed when a turn ends, so the
  // display agrees with the stored time and across devices.
  function displayedRemainingMs(index) {
    return currentRemainingMs(game, index, serverNowMs());
  }

  return { displayedRemainingMs };
}
