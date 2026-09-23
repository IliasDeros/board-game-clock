// Scripted timeline for the homepage hero demo. Pure data, no React: each
// beat is one visible state of the three phone mockups, shown for `ms`
// milliseconds before the next beat. The loop is BEATS[0] .. BEATS[last],
// then back to BEATS[0].

export const FAKE_URL = 'bg-clock.web.app/xxxxxxxx';

export const FAKE_PLAYERS = [
  { name: 'Player 1', time: '10:00' },
  { name: 'Player 2', time: '10:00' },
  { name: 'Player 3', time: '10:00' },
  { name: 'Player 4', time: '10:00' },
];

const BASE = {
  players: null, // value shown in phone 1's mini create form
  time: null, // ditto
  pressed: false, // "Create clock" button mid-press
  peersLit: false, // phones 2 and 3 fully visible
  activeIndex: null, // highlighted player row
  tapHint: false, // pulsing "tap to pass the turn" ring on phone 1
};

export const BEATS = [
  // Setup (~3s): phone 1 fills in the form, then presses Create.
  { phase: 'setup', ms: 700 },
  { phase: 'setup', ms: 800, players: 4 },
  { phase: 'setup', ms: 900, players: 4, time: '10:00' },
  { phase: 'setup', ms: 600, players: 4, time: '10:00', pressed: true },
  // Share (~2s): link appears, travels to phones 2 and 3, which light up.
  { phase: 'share', ms: 900 },
  { phase: 'share', ms: 1100, peersLit: true },
  // Sync (~4.5s): the active row moves across all three phones at once.
  { phase: 'sync', ms: 1500, peersLit: true, activeIndex: 0, tapHint: true },
  { phase: 'sync', ms: 1500, peersLit: true, activeIndex: 1 },
  { phase: 'sync', ms: 1500, peersLit: true, activeIndex: 2 },
].map((beat) => ({ ...BASE, ...beat }));

// With prefers-reduced-motion, hold still on the first synced beat.
export const REDUCED_MOTION_BEAT = BEATS.findIndex((b) => b.phase === 'sync');
