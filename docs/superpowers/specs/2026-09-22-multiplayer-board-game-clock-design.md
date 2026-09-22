# Multiplayer Board Game Clock — Design

## Summary

A shared, link-based chess-clock web app for 2+ player board games, modeled
on [multiplayerchessclock.com](https://multiplayerchessclock.com) with two
additions: resetting a game while keeping its players, and reordering
players (for games with variable turn order). No accounts — anyone with a
game's link can fully control it, same trust model as the original site.
Built to run indefinitely on Firebase's free Spark plan.

## Goals

- Create a game (player count + shared starting minutes), get a shareable link.
- Anyone with the link can: end their turn (advancing the clock to the next
  player), pause/resume the whole game, reset the clock while keeping
  players/order, reorder players, and edit any player's name or remaining
  time at any time.
- Real-time sync across all devices viewing the same game.
- Stays free to run indefinitely (no paid Firebase plan required).

## Non-goals

- Accounts/login, private games, or access control beyond "has the link."
- Sound/vibration alerts (v1 is visual only).
- Automated test suite (explicitly out of scope per project owner; manual
  testing only for v1).
- Server-side validation of every transition beyond basic shape/bounds
  checks in security rules (no Cloud Functions — see Architecture).

## Architecture

**Stack:** React + Vite SPA, deployed to Firebase Hosting. Firestore as the
real-time data store. No backend server, no Cloud Functions, no
authentication.

**Why no Cloud Functions:** Cloud Functions require Firebase's paid Blaze
plan even when usage falls within a free quota. Every other Firebase
primitive used here (Firestore, Hosting) has a permanent free Spark-plan
tier. All state-transition logic therefore runs client-side as Firestore
transactions, with security rules doing shape/bounds validation instead of
a trusted server. This mirrors the original site's trust model anyway:
anyone with the link already has full control, so server-side transition
validation wouldn't be protecting much.

**Free-tier feasibility:** Firestore's Spark quota is 50K reads / 20K
writes per day and 1GiB storage; Hosting gives 10GB storage and 360MB/day
transfer. Only the five state transitions below ever write to Firestore
(ticking is computed client-side, not written per-second), so read/write
volume for a personal/friends-scale tool stays orders of magnitude under
quota. The one long-term risk — abandoned games accumulating storage
forever — is handled by auto-expiry (see Data Model).

## Data model

One Firestore document per game, at `games/{gameId}`, where `gameId` is a
random unguessable slug (e.g. via `nanoid`) generated at creation time —
there is no listing/enumeration of games, so an unguessable ID is the only
access control.

```
games/{gameId}
{
  players: [{ id: string, name: string, remainingMs: number }, ...], // order = turn order
  activePlayerIndex: number,
  status: "running" | "paused",
  turnStartedAt: Timestamp | null,   // set only while status == "running"
  initialMs: number,                 // per-player starting time, for Reset
  createdAt: Timestamp,
  expiresAt: Timestamp,              // refreshed on every transition; TTL target
}
```

**Auto-expiry:** `expiresAt` is set to `now + 90 days` at creation and
recomputed on every transition. A Firestore TTL policy on `expiresAt`
auto-deletes inactive games at no cost and with no Cloud Function. A game
untouched for 90 days (and its link) simply stops existing.

## State machine

Two states — `running`, `paused` — and five transitions, each implemented
as a single atomic Firestore transaction (read current doc, validate,
write). Two additional writes (name/time edit) are not state transitions
and are allowed in either state.

- **EndTurn(playerId)** — valid only when `status == "running"` **and**
  `players[activePlayerIndex].id == playerId`. The identity check guards
  against a stale tap being applied after the active player has already
  changed (e.g. two rapid taps racing). Deducts elapsed time
  (`now - turnStartedAt`) from the active player's `remainingMs` (may go
  negative — no floor at zero, per design decision), advances
  `activePlayerIndex` to the next player in `players` order (wrapping),
  sets `turnStartedAt = now`.
- **Pause()** — valid only when `status == "running"`. Deducts elapsed
  time into the active player's `remainingMs`, sets `status = "paused"`,
  clears `turnStartedAt`.
- **Resume()** — valid only when `status == "paused"`. Sets
  `turnStartedAt = now`, `status = "running"`.
- **Reset()** — valid in either state. Sets every player's
  `remainingMs = initialMs`, `activePlayerIndex = 0`, `status = "paused"`,
  `turnStartedAt = null`. Player list, names, and order are untouched. UI
  confirms before calling this (destructive to elapsed progress).
- **Reorder(newOrder: playerId[])** — valid only when `status ==
  "paused"` (enforced in UI; ideally also in security rules). Rewrites the
  `players` array into `newOrder`. Because `activePlayerIndex` is
  positional, the transaction must recompute it by locating the
  previously-active player's `id` within `newOrder`, not assume the index
  is unchanged.

Not a transition — allowed anytime, in either state:

- **RenamePlayer(playerId, name)** — updates one player's `name`.
- **SetPlayerTime(playerId, remainingMs)** — manually overrides one
  player's `remainingMs` (e.g. correcting a mistake or applying a
  house-rule time bonus).

Every transition also bumps `expiresAt` to `now + 90 days`.

## Real-time sync & clock display

- Every client subscribes to `games/{gameId}` via Firestore's
  `onSnapshot`, so all devices converge on state changes within roughly
  100-300ms of each other.
- No per-second writes. Each client runs a local render loop
  (`requestAnimationFrame` or a ~200ms interval): the active player's
  displayed time is `remainingMs - (localNow - turnStartedAtLocal)`; every
  other player just shows their stored `remainingMs`.
- **Clock-skew correction:** on each snapshot, a client computes
  `offset = serverTimestamp - Date.now()` (using Firestore's
  `serverTimestamp()` semantics) and applies that offset when converting
  the document's `turnStartedAt` into local wall-clock time. This keeps
  displayed times consistent across devices without a dedicated
  time-sync service. Accuracy is sub-second — fine for a casual board-game
  clock, not tournament chess.
- Negative time display falls out of the same formula with no special
  case: once `remainingMs` goes below zero the UI flags that player (e.g.
  red) but keeps counting.

## Frontend structure

React + Vite SPA, two routes:

- **`/`** — creation form: `# Players`, `# Minutes` (matches the
  original). On submit: generate a random `gameId`, write the initial
  document, navigate to `/game/:gameId`.
- **`/game/:gameId`** — the clock:
  - A tap zone per player; tapping the *active* player's zone calls
    `EndTurn`. Non-active zones are not tappable to end a turn.
  - Global pause/resume control.
  - Reset control, with a confirmation prompt.
  - Reorder control (drag-to-reorder list), enabled only while paused.
  - Inline rename / edit-remaining-time affordance per player, available
    regardless of running/paused state.
  - Copy-link / "Link to Share" control.

No login screen, no account system.

## Security rules

No authentication; rules validate shape and bounds instead of identity,
since (as with the original site) anyone holding the link is a trusted
controller of that game:

- Reads/writes restricted to documents under `games/{gameId}` matching
  the expected schema: correct field types, `players.length` within
  [2, 12], player name length capped (e.g. 40 chars), numeric fields
  within sane bounds.
- Game IDs are random and unguessable, so there's no enumeration/access
  concern without the specific link.
- No rate limiting in v1 (would need App Check or auth); the free-tier
  volume is already trivial for legitimate use, and this can be added
  later without changing app logic if abuse ever becomes a problem.

## Testing

Per explicit direction from the project owner: no automated test suite
for v1. Verification is manual — exercising each transition and the
real-time sync across multiple browser tabs/devices during development.

## Open items for implementation planning

- Exact visual design/styling (colors, layout for varying player counts)
  is left to implementation; this spec fixes behavior, not visuals.
- Player count bound of 12 is a placeholder default from typical board
  game group sizes; adjustable with no architectural impact.
