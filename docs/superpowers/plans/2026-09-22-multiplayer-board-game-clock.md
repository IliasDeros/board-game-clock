# Multiplayer Board Game Clock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared, link-based multiplayer chess clock web app with reset and player-reorder support, running entirely on Firebase's free Spark plan.

**Architecture:** React + Vite SPA, deployed to Firebase Hosting. A single Firestore document per game holds a two-state (`running`/`paused`) state machine; all transitions are client-side Firestore transactions (no Cloud Functions, no auth). A pure, Firestore-independent module implements the state machine logic; a thin adapter wraps it in transactions.

**Tech Stack:** React 18, Vite, react-router-dom, Firebase (Firestore + Hosting), nanoid.

**Spec:** `docs/superpowers/specs/2026-09-22-multiplayer-board-game-clock-design.md`

## Global Constraints

- No Cloud Functions and no Firebase Authentication — the app must run forever on the free Spark plan (Cloud Functions require the paid Blaze plan).
- No accounts/login — anyone with a game's link has full control, matching the original site.
- No automated test suite — explicit project-owner decision. Every task instead ends with a manual verification step using the Firestore emulator and/or a browser. Any scratch script written purely to smoke-test a module during development is deleted before committing (only production files are committed).
- Players per game: 2–12. Time may go negative (no floor at zero) — no special-casing needed.
- Game IDs are random, unguessable 16-character strings (`nanoid`), used directly as Firestore document IDs.
- Inactive games auto-expire after 90 days via a Firestore TTL policy on an `expiresAt` field, refreshed on every transition.

---

### Task 1: Project scaffold, routing, and base styles

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html` (via `npm create vite@latest`)
- Create: `src/main.jsx`
- Create: `src/App.jsx`
- Create: `src/App.css`
- Create: `src/pages/CreateGamePage.jsx` (placeholder, filled in Task 4)
- Create: `src/pages/GamePage.jsx` (placeholder, filled in Task 8+)
- Modify: `.gitignore`

**Interfaces:**
- Produces: `App` (default export from `src/App.jsx`) rendering routes `/` → `CreateGamePage`, `/game/:gameId` → `GamePage`. Both page components are named exports (`export function CreateGamePage()`, `export function GamePage()`) — later tasks replace their bodies, not their export shape.
- Produces CSS classes later tasks rely on: `.player-zones`, `.player-zone`, `.player-zone.active`, `.player-zone.negative`, `.player-name`, `.player-time`, `.controls`, `.reorder-list`, `.modal-backdrop`, `.modal`.

- [ ] **Step 1: Scaffold the Vite React project**

```bash
npm create vite@latest . -- --template react
npm install
npm install react-router-dom firebase nanoid
```

- [ ] **Step 2: Write `src/App.css`**

```css
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body { font-family: system-ui, sans-serif; }

.game-page { display: flex; flex-direction: column; height: 100%; }

.player-zones {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.player-zone {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #e0e0e0;
  border-bottom: 2px solid #fff;
  position: relative;
}

.player-zone.active { background: #a5d6a7; }
.player-zone.negative { background: #ef9a9a; }

.player-name { font-size: 1.2rem; margin-bottom: 0.5rem; }
.player-time { font-size: 2.5rem; font-variant-numeric: tabular-nums; }

.controls {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.reorder-list { list-style: none; padding: 1rem; margin: 0; }
.reorder-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
}
.reorder-list li span { flex: 1; }

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: #fff;
  padding: 1.5rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 240px;
}
```

- [ ] **Step 3: Write `src/pages/CreateGamePage.jsx` (placeholder)**

```jsx
export function CreateGamePage() {
  return <h1>Create Game</h1>;
}
```

- [ ] **Step 4: Write `src/pages/GamePage.jsx` (placeholder)**

```jsx
import { useParams } from 'react-router-dom';

export function GamePage() {
  const { gameId } = useParams();
  return <h1>Game: {gameId}</h1>;
}
```

- [ ] **Step 5: Write `src/App.jsx`**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CreateGamePage } from './pages/CreateGamePage';
import { GamePage } from './pages/GamePage';
import './App.css';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreateGamePage />} />
        <Route path="/game/:gameId" element={<GamePage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 6: Write `src/main.jsx`**

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 7: Add env files to `.gitignore`**

```bash
printf '\n.env.local\ndist\n' >> .gitignore
```

- [ ] **Step 8: Manually verify routing**

Run: `npm run dev`
Open `http://localhost:5173/` — expect an "Create Game" heading.
Open `http://localhost:5173/game/abc123` — expect "Game: abc123".
Stop the dev server.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Scaffold Vite React app with routing and base styles"
```

---

### Task 2: Firebase project wiring and local emulator

**Files:**
- Create: `src/firebase.js`
- Create: `.env.example`
- Create: `firebase.json`
- Create: `.firebaserc`
- Create: `firestore.rules` (permissive dev version — hardened in Task 12)
- Create: `firestore.indexes.json`

**Interfaces:**
- Produces: `db` (named export from `src/firebase.js`) — a Firestore instance every later data-access module imports.

This task requires a real Firebase account and project, which only you can create (it needs an interactive Google login). If you're running this as an agent, pause here and ask the human operator to do the steps marked **(human)**.

- [ ] **Step 1: (human) Create the Firebase project**

In the Firebase console, create a new project (Spark/free plan), then enable Firestore (Native mode, any region) from the Firestore Database section. Note the project ID.

- [ ] **Step 2: Install the Firebase CLI and log in**

```bash
npm install -g firebase-tools
firebase login
```

If running in a sandboxed/non-interactive environment, ask the human operator to run `firebase login` themselves (suggest `! firebase login` if they're in a Claude Code session) and confirm once it's done.

- [ ] **Step 3: Write `.firebaserc`**

Replace `YOUR_PROJECT_ID` with the real project ID from Step 1.

```json
{
  "projects": {
    "default": "YOUR_PROJECT_ID"
  }
}
```

- [ ] **Step 4: Write `firebase.json`**

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  },
  "emulators": {
    "firestore": { "port": 8080 },
    "hosting": { "port": 5000 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

- [ ] **Step 5: Write `firestore.indexes.json`**

```json
{
  "indexes": [],
  "fieldOverrides": []
}
```

- [ ] **Step 6: Write a permissive dev `firestore.rules`**

This gets hardened in Task 12; for now it just unblocks local development against the emulator.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /games/{gameId} {
      allow read, write: if true;
    }
  }
}
```

- [ ] **Step 7: (human) Register a web app and copy its config**

In the Firebase console, add a Web App to the project and copy the resulting config values.

- [ ] **Step 8: Write `.env.example`**

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_USE_FIRESTORE_EMULATOR=true
```

- [ ] **Step 9: (human) Copy `.env.example` to `.env.local` and fill in real values**

```bash
cp .env.example .env.local
```
Then edit `.env.local` with the values from Step 7. Leave `VITE_USE_FIRESTORE_EMULATOR=true` for now.

- [ ] **Step 10: Write `src/firebase.js`**

```js
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

if (import.meta.env.VITE_USE_FIRESTORE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

- [ ] **Step 11: Manually verify the emulator starts**

Run: `firebase emulators:start --only firestore`
Expect the Emulator UI to be reachable at `http://localhost:4000` with a Firestore tab showing an empty `games` collection. Stop the emulator (Ctrl+C).

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json .gitignore .firebaserc firebase.json \
  firestore.rules firestore.indexes.json .env.example src/firebase.js
git commit -m "Wire up Firebase project, Firestore emulator, and dev security rules"
```

Note: `.env.local` is gitignored and must never be committed.

---

### Task 3: Pure state machine module

**Files:**
- Create: `src/state/fsm.js`

**Interfaces:**
- Produces: `InvalidTransitionError` (class), `SERVER_NOW` (string constant), and functions `createInitialState({ playerNames, initialMs })`, `endTurn(state, { playerId, nowMs })`, `pause(state, { nowMs })`, `resume(state)`, `reset(state)`, `reorder(state, { newOrder })`, `renamePlayer(state, { playerId, name })`, `setPlayerTime(state, { playerId, remainingMs })`. Each transition function returns a **new** state object, or throws `InvalidTransitionError` if the transition's precondition fails. State shape: `{ players: [{ id, name, remainingMs }], activePlayerIndex, status: 'running' | 'paused', turnStartedAtMs: number | 'SERVER_NOW' | null, initialMs }`.
- Consumes: nothing (this module has no Firestore dependency, by design, so it stays trivially manually-verifiable).

- [ ] **Step 1: Write `src/state/fsm.js`**

```js
export class InvalidTransitionError extends Error {}

export const SERVER_NOW = 'SERVER_NOW';

export function createInitialState({ playerNames, initialMs }) {
  return {
    players: playerNames.map((name) => ({
      id: crypto.randomUUID(),
      name,
      remainingMs: initialMs,
    })),
    activePlayerIndex: 0,
    status: 'paused',
    turnStartedAtMs: null,
    initialMs,
  };
}

function nextIndex(state) {
  return (state.activePlayerIndex + 1) % state.players.length;
}

function deductElapsed(state, nowMs) {
  const elapsed = nowMs - state.turnStartedAtMs;
  return state.players.map((p, i) =>
    i === state.activePlayerIndex ? { ...p, remainingMs: p.remainingMs - elapsed } : p
  );
}

export function endTurn(state, { playerId, nowMs }) {
  if (state.status !== 'running') throw new InvalidTransitionError('not running');
  const active = state.players[state.activePlayerIndex];
  if (!active || active.id !== playerId) {
    throw new InvalidTransitionError('caller is not the active player');
  }
  return {
    ...state,
    players: deductElapsed(state, nowMs),
    activePlayerIndex: nextIndex(state),
    turnStartedAtMs: SERVER_NOW,
  };
}

export function pause(state, { nowMs }) {
  if (state.status !== 'running') throw new InvalidTransitionError('not running');
  return {
    ...state,
    players: deductElapsed(state, nowMs),
    status: 'paused',
    turnStartedAtMs: null,
  };
}

export function resume(state) {
  if (state.status !== 'paused') throw new InvalidTransitionError('not paused');
  return { ...state, status: 'running', turnStartedAtMs: SERVER_NOW };
}

export function reset(state) {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, remainingMs: state.initialMs })),
    activePlayerIndex: 0,
    status: 'paused',
    turnStartedAtMs: null,
  };
}

export function reorder(state, { newOrder }) {
  if (state.status !== 'paused') throw new InvalidTransitionError('not paused');
  if (newOrder.length !== state.players.length) {
    throw new InvalidTransitionError('newOrder length mismatch');
  }
  const byId = new Map(state.players.map((p) => [p.id, p]));
  const players = newOrder.map((id) => {
    const p = byId.get(id);
    if (!p) throw new InvalidTransitionError('unknown player id in newOrder');
    return p;
  });
  const activePlayerId = state.players[state.activePlayerIndex].id;
  return { ...state, players, activePlayerIndex: players.findIndex((p) => p.id === activePlayerId) };
}

export function renamePlayer(state, { playerId, name }) {
  return {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? { ...p, name } : p)),
  };
}

export function setPlayerTime(state, { playerId, remainingMs }) {
  return {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? { ...p, remainingMs } : p)),
  };
}
```

- [ ] **Step 2: Manually smoke-test the module**

Create a scratch file `scratch-fsm-check.mjs` at the project root (not committed):

```js
import { createInitialState, endTurn, pause, resume, reset, reorder } from './src/state/fsm.js';

let s = createInitialState({ playerNames: ['A', 'B', 'C'], initialMs: 60000 });
s = { ...s, status: 'running', turnStartedAtMs: 0 };
s = endTurn(s, { playerId: s.players[0].id, nowMs: 1000 });
console.log('after endTurn:', s.activePlayerIndex, s.players[0].remainingMs, s.turnStartedAtMs);

s = { ...s, turnStartedAtMs: 0 };
s = pause(s, { nowMs: 500 });
console.log('after pause:', s.status, s.players[1].remainingMs);

s = resume(s);
console.log('after resume:', s.status, s.turnStartedAtMs);

s = reorder(reset(s), { newOrder: [s.players[2].id, s.players[0].id, s.players[1].id] });
console.log('after reset+reorder:', s.players.map((p) => p.name), s.activePlayerIndex);
```

Run: `node scratch-fsm-check.mjs`
Expected output: activePlayerIndex advances to `1` after `endTurn`; player B's `remainingMs` is `59500` after pause; status is `running` and `turnStartedAtMs` is `'SERVER_NOW'` after resume; player order is `['C', 'A', 'B']` with `activePlayerIndex` pointing at whichever player was active (`A`, since it was reset to index 0 by `reset` before reordering) — confirm the printed name matches `players[activePlayerIndex]`.

Delete the scratch file once verified: `rm scratch-fsm-check.mjs`

- [ ] **Step 3: Commit**

```bash
git add src/state/fsm.js
git commit -m "Add pure state machine for game clock transitions"
```

---

### Task 4: Game creation

**Files:**
- Create: `src/state/createGame.js`
- Modify: `src/pages/CreateGamePage.jsx`

**Interfaces:**
- Consumes: `createInitialState` from `src/state/fsm.js` (Task 3), `db` from `src/firebase.js` (Task 2).
- Produces: `createGame({ playerNames, initialMs })` (async, returns the new `gameId` string) — used by `GamePage`'s data layer in later tasks only indirectly; directly consumed by `CreateGamePage`.

- [ ] **Step 1: Write `src/state/createGame.js`**

```js
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { db } from '../firebase';
import { createInitialState } from './fsm';

const EXPIRY_MS = 90 * 24 * 60 * 60 * 1000;

export async function createGame({ playerNames, initialMs }) {
  const gameId = nanoid(16);
  const state = createInitialState({ playerNames, initialMs });

  await setDoc(doc(db, 'games', gameId), {
    players: state.players,
    activePlayerIndex: state.activePlayerIndex,
    status: state.status,
    turnStartedAt: null,
    initialMs: state.initialMs,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + EXPIRY_MS),
  });

  return gameId;
}
```

- [ ] **Step 2: Write `src/pages/CreateGamePage.jsx`**

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame } from '../state/createGame';

export function CreateGamePage() {
  const [numPlayers, setNumPlayers] = useState(4);
  const [minutes, setMinutes] = useState(10);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    const playerNames = Array.from({ length: numPlayers }, (_, i) => `Player ${i + 1}`);
    const gameId = await createGame({ playerNames, initialMs: minutes * 60 * 1000 });
    navigate(`/game/${gameId}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>New Board Game Clock</h1>
      <label>
        # Players
        <input
          type="number"
          min={2}
          max={12}
          value={numPlayers}
          onChange={(e) => setNumPlayers(Number(e.target.value))}
        />
      </label>
      <label>
        # Minutes
        <input
          type="number"
          min={1}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
        />
      </label>
      <button type="submit" disabled={busy}>Create Clock</button>
    </form>
  );
}
```

- [ ] **Step 3: Manually verify game creation**

Run: `firebase emulators:start --only firestore` (leave running), then in another terminal `npm run dev`.
Open `http://localhost:5173/`, set players to 3 and minutes to 5, submit.
Expect: browser navigates to `/game/<16-char-id>`, and the Firestore emulator UI (`http://localhost:4000`) shows a new `games/<id>` document with 3 players each at `remainingMs: 300000`, `status: "paused"`, `activePlayerIndex: 0`.
Stop the dev server and emulator.

- [ ] **Step 4: Commit**

```bash
git add src/state/createGame.js src/pages/CreateGamePage.jsx
git commit -m "Add game creation flow"
```

---

### Task 5: Firestore transaction adapter

**Files:**
- Create: `src/state/gameTransactions.js`

**Interfaces:**
- Consumes: all transition functions and `InvalidTransitionError`/`SERVER_NOW` from `src/state/fsm.js` (Task 3), `db` from `src/firebase.js` (Task 2).
- Produces: async functions `endTurn(gameId, playerId)`, `pause(gameId)`, `resume(gameId)`, `reset(gameId)`, `reorder(gameId, newOrder)`, `renamePlayer(gameId, playerId, name)`, `setPlayerTime(gameId, playerId, remainingMs)` — each resolves once the Firestore transaction commits (or silently no-ops on a stale/invalid transition; never rejects for that case).

- [ ] **Step 1: Write `src/state/gameTransactions.js`**

```js
import { doc, runTransaction, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import * as fsm from './fsm';

const EXPIRY_MS = 90 * 24 * 60 * 60 * 1000;

function docToState(data) {
  return {
    players: data.players,
    activePlayerIndex: data.activePlayerIndex,
    status: data.status,
    turnStartedAtMs: data.turnStartedAt ? data.turnStartedAt.toMillis() : null,
    initialMs: data.initialMs,
  };
}

function stateToUpdate(state) {
  return {
    players: state.players,
    activePlayerIndex: state.activePlayerIndex,
    status: state.status,
    turnStartedAt: state.turnStartedAtMs === fsm.SERVER_NOW ? Timestamp.now() : null,
    initialMs: state.initialMs,
    expiresAt: Timestamp.fromMillis(Date.now() + EXPIRY_MS),
  };
}

async function applyTransition(gameId, transitionFn, args) {
  const ref = doc(db, 'games', gameId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Game not found');
    const state = docToState(snap.data());
    let nextState;
    try {
      nextState = transitionFn(state, args);
    } catch (err) {
      if (err instanceof fsm.InvalidTransitionError) return;
      throw err;
    }
    tx.update(ref, stateToUpdate(nextState));
  });
}

export function endTurn(gameId, playerId) {
  return applyTransition(gameId, fsm.endTurn, { playerId, nowMs: Date.now() });
}

export function pause(gameId) {
  return applyTransition(gameId, fsm.pause, { nowMs: Date.now() });
}

export function resume(gameId) {
  return applyTransition(gameId, fsm.resume, undefined);
}

export function reset(gameId) {
  return applyTransition(gameId, fsm.reset, undefined);
}

export function reorder(gameId, newOrder) {
  return applyTransition(gameId, fsm.reorder, { newOrder });
}

export function renamePlayer(gameId, playerId, name) {
  return applyTransition(gameId, fsm.renamePlayer, { playerId, name });
}

export function setPlayerTime(gameId, playerId, remainingMs) {
  return applyTransition(gameId, fsm.setPlayerTime, { playerId, remainingMs });
}
```

Note: `Timestamp.now()` (client-approximated commit time) is used rather than Firestore's `serverTimestamp()` sentinel because the sentinel can't be read back within the same transaction, and later transitions only ever read the previously-committed value — the sub-second discrepancy this introduces is imperceptible for a casual clock.

- [ ] **Step 2: Manually verify transactions against the emulator**

Run: `firebase emulators:start --only firestore` (leave running).
Create a scratch file `scratch-tx-check.mjs` at the project root (not committed) that sets `VITE_USE_FIRESTORE_EMULATOR` behavior manually (import `connectFirestoreEmulator` directly, since `import.meta.env` isn't available under plain Node):

```js
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc } from 'firebase/firestore';
import * as transactions from './src/state/gameTransactions.js';

const app = initializeApp({ projectId: 'demo-test' });
const db = getFirestore(app);
connectFirestoreEmulator(db, 'localhost', 8080);

const gameId = 'scratch-game';
await setDoc(doc(db, 'games', gameId), {
  players: [{ id: 'p1', name: 'A', remainingMs: 60000 }, { id: 'p2', name: 'B', remainingMs: 60000 }],
  activePlayerIndex: 0,
  status: 'running',
  turnStartedAt: null,
  initialMs: 60000,
});

await transactions.endTurn(gameId, 'p1');
console.log((await getDoc(doc(db, 'games', gameId))).data());
```

This script imports `src/state/gameTransactions.js`, which imports `src/firebase.js` — for this scratch check only, temporarily comment out the `import.meta.env` lines in `src/firebase.js` or run via Vite's node API. Simpler: instead, run this check from the browser console while `npm run dev` is running (paste the transaction calls there, using the app's already-initialized `db`), since `import.meta.env` only resolves under Vite. Confirm `activePlayerIndex` becomes `1` and player A's `remainingMs` decreased.
Delete any scratch file created: `rm -f scratch-tx-check.mjs`

- [ ] **Step 3: Commit**

```bash
git add src/state/gameTransactions.js
git commit -m "Add Firestore transaction adapter for state machine transitions"
```

---

### Task 6: Live game subscription hook

**Files:**
- Create: `src/hooks/useGameDoc.js`

**Interfaces:**
- Consumes: `db` from `src/firebase.js` (Task 2).
- Produces: `useGameDoc(gameId)` returning `{ game, error }`, where `game` is `null` (loading or not found) or `{ players, activePlayerIndex, status, turnStartedAtMs, initialMs, hasPendingWrites }`.

- [ ] **Step 1: Write `src/hooks/useGameDoc.js`**

```js
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function useGameDoc(gameId) {
  const [game, setGame] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ref = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snap) => {
        if (!snap.exists()) {
          setGame(null);
          return;
        }
        const data = snap.data();
        setGame({
          players: data.players,
          activePlayerIndex: data.activePlayerIndex,
          status: data.status,
          turnStartedAtMs: data.turnStartedAt ? data.turnStartedAt.toMillis() : null,
          initialMs: data.initialMs,
          hasPendingWrites: snap.metadata.hasPendingWrites,
        });
      },
      (err) => setError(err)
    );
    return unsubscribe;
  }, [gameId]);

  return { game, error };
}
```

- [ ] **Step 2: Manually verify live updates**

Temporarily render `useGameDoc`'s output in `GamePage` (e.g. `<pre>{JSON.stringify(game, null, 2)}</pre>`), run the emulator + dev server, open a game created via Task 4's flow, then edit that document's `status` field directly in the Firestore emulator UI. Confirm the rendered JSON updates within roughly a second without a page reload. Revert the temporary render change (Task 8 replaces `GamePage` properly).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGameDoc.js
git commit -m "Add live game document subscription hook"
```

---

### Task 7: Clock tick / display hook

**Files:**
- Create: `src/hooks/useClockTick.js`

**Interfaces:**
- Consumes: the `game` shape produced by `useGameDoc` (Task 6) — specifically `status`, `activePlayerIndex`, `turnStartedAtMs`, `hasPendingWrites`.
- Produces: `useClockTick(game)` returning `{ displayedRemainingMs(player, index) }`, a function usable per-player in render to get the live countdown value (may be negative).

- [ ] **Step 1: Write `src/hooks/useClockTick.js`**

```js
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
    const id = setInterval(() => forceRender((n) => n + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  function displayedRemainingMs(player, index) {
    if (!game || game.status !== 'running' || index !== game.activePlayerIndex || !anchorRef.current) {
      return player.remainingMs;
    }
    const elapsed = Date.now() - anchorRef.current.localAnchorMs;
    return player.remainingMs - elapsed;
  }

  return { displayedRemainingMs };
}
```

- [ ] **Step 2: Manually verify countdown behavior**

This is exercised end-to-end in Task 8 once `PlayerZone` renders it; no standalone verification needed here beyond confirming the file has no syntax errors: `node --check src/hooks/useClockTick.js` (JSX-free, so plain Node syntax check works).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useClockTick.js
git commit -m "Add clock tick display hook with per-turn skew calibration"
```

---

### Task 8: Player zones and the core end-turn loop

**Files:**
- Create: `src/components/PlayerZone.jsx`
- Modify: `src/pages/GamePage.jsx`

**Interfaces:**
- Consumes: `useGameDoc` (Task 6), `useClockTick` (Task 7), `transactions.endTurn` from `src/state/gameTransactions.js` (Task 5).
- Produces: `PlayerZone` component, props `{ player, isActive, displayedMs, status, onTap, onEdit }` — `onEdit` is wired to a no-op-safe placeholder here and connected properly in Task 11.

- [ ] **Step 1: Write `src/components/PlayerZone.jsx`**

```jsx
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
```

- [ ] **Step 2: Write `src/pages/GamePage.jsx`**

```jsx
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
```

- [ ] **Step 3: Manually verify end-turn syncing across two clients**

Run the emulator and dev server. Create a game with 3 players and 5 minutes from `/`. Open the resulting `/game/:id` URL in two separate browser tabs.
In one tab, manually flip `status` to `"running"` and set `turnStartedAt` to the current time in the Firestore emulator UI (since Task 9 hasn't added a Resume button yet).
Confirm both tabs show the active player's time counting down in sync (within roughly a second of each other), and that tapping the active player's zone in either tab advances `activePlayerIndex` and updates both tabs.

- [ ] **Step 4: Commit**

```bash
git add src/components/PlayerZone.jsx src/pages/GamePage.jsx
git commit -m "Render player zones with live countdown and end-turn tapping"
```

---

### Task 9: Pause, resume, reset, and share-link controls

**Files:**
- Create: `src/components/Controls.jsx`
- Modify: `src/pages/GamePage.jsx`

**Interfaces:**
- Consumes: `transactions.pause`, `transactions.resume`, `transactions.reset` from `src/state/gameTransactions.js` (Task 5).
- Produces: `Controls` component, props `{ status, onPause, onResume, onReset, onToggleReorder, reordering, shareUrl }`. `onToggleReorder`/`reordering` are wired here but only made functional in Task 10.

- [ ] **Step 1: Write `src/components/Controls.jsx`**

```jsx
import { useState } from 'react';

export function Controls({ status, onPause, onResume, onReset, onToggleReorder, reordering, shareUrl }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleReset() {
    if (window.confirm('Reset the clock? This clears elapsed time for all players.')) {
      onReset();
    }
  }

  return (
    <div className="controls">
      {status === 'running' ? (
        <button onClick={onPause}>Pause</button>
      ) : (
        <button onClick={onResume}>Resume</button>
      )}
      <button onClick={handleReset}>Reset</button>
      <button onClick={onToggleReorder} disabled={status !== 'paused'}>
        {reordering ? 'Done Reordering' : 'Reorder Players'}
      </button>
      <button onClick={copyLink}>{copied ? 'Copied!' : 'Link to Share'}</button>
    </div>
  );
}
```

- [ ] **Step 2: Wire `Controls` into `src/pages/GamePage.jsx`**

```jsx
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
```

- [ ] **Step 3: Manually verify pause/resume/reset across two tabs**

With the emulator and dev server running, open the same game in two tabs. Click Resume in one tab — confirm both tabs start counting down the first player. Click Pause in the other tab — confirm both stop at the same displayed time (within ~1s). Click Reset — confirm all players' times return to the original starting value and the game is paused, and that a JS `confirm()` dialog appeared first.

- [ ] **Step 4: Commit**

```bash
git add src/components/Controls.jsx src/pages/GamePage.jsx
git commit -m "Add pause, resume, reset, and share-link controls"
```

---

### Task 10: Player reordering

**Files:**
- Create: `src/components/ReorderList.jsx`
- Modify: `src/pages/GamePage.jsx`

**Interfaces:**
- Consumes: `transactions.reorder` from `src/state/gameTransactions.js` (Task 5), `reordering` state from Task 9.
- Produces: `ReorderList` component, props `{ players, onMove, onDone }`.

- [ ] **Step 1: Write `src/components/ReorderList.jsx`**

```jsx
export function ReorderList({ players, onMove, onDone }) {
  function moveUp(index) {
    if (index === 0) return;
    const newOrder = players.map((p) => p.id);
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    onMove(newOrder);
  }

  function moveDown(index) {
    if (index === players.length - 1) return;
    const newOrder = players.map((p) => p.id);
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onMove(newOrder);
  }

  return (
    <ul className="reorder-list">
      {players.map((p, i) => (
        <li key={p.id}>
          <span>{p.name}</span>
          <button onClick={() => moveUp(i)} disabled={i === 0}>Up</button>
          <button onClick={() => moveDown(i)} disabled={i === players.length - 1}>Down</button>
        </li>
      ))}
      <li><button onClick={onDone}>Done</button></li>
    </ul>
  );
}
```

- [ ] **Step 2: Wire `ReorderList` into `src/pages/GamePage.jsx`**

```jsx
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useGameDoc } from '../hooks/useGameDoc';
import { useClockTick } from '../hooks/useClockTick';
import { PlayerZone } from '../components/PlayerZone';
import { Controls } from '../components/Controls';
import { ReorderList } from '../components/ReorderList';
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
              onEdit={() => {}}
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
    </div>
  );
}
```

- [ ] **Step 3: Manually verify reordering**

With the game paused, click "Reorder Players". Move the last player to the top using the Up button. Click Done. Confirm the player zones now reflect the new order in both tabs (if testing with two), and that the player who was active before reordering is still the one flagged active in the new order. Confirm "Reorder Players" is disabled while `status` is `"running"`.

- [ ] **Step 4: Commit**

```bash
git add src/components/ReorderList.jsx src/pages/GamePage.jsx
git commit -m "Add player reordering, restricted to paused games"
```

---

### Task 11: Editing player name and remaining time

**Files:**
- Create: `src/components/EditPlayerModal.jsx`
- Modify: `src/pages/GamePage.jsx`

**Interfaces:**
- Consumes: `transactions.renamePlayer`, `transactions.setPlayerTime` from `src/state/gameTransactions.js` (Task 5).
- Produces: `EditPlayerModal` component, props `{ player, onSave, onClose }` where `onSave({ name, remainingMs })`.

- [ ] **Step 1: Write `src/components/EditPlayerModal.jsx`**

```jsx
import { useState } from 'react';

export function EditPlayerModal({ player, onSave, onClose }) {
  const [name, setName] = useState(player.name);
  const [minutes, setMinutes] = useState((player.remainingMs / 60000).toFixed(2));

  function handleSave() {
    onSave({ name, remainingMs: Math.round(Number(minutes) * 60000) });
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Minutes remaining
          <input type="number" step="0.1" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
        <button onClick={handleSave}>Save</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire `EditPlayerModal` into `src/pages/GamePage.jsx`**

```jsx
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
```

- [ ] **Step 3: Manually verify editing**

Click "Edit" on a player while the game is running — confirm the modal opens, change the name and minutes, save, and confirm both the name and displayed time update immediately (including in a second tab). Repeat while paused to confirm edits work in both states.

- [ ] **Step 4: Commit**

```bash
git add src/components/EditPlayerModal.jsx src/pages/GamePage.jsx
git commit -m "Add anytime player name and remaining-time editing"
```

---

### Task 12: Harden Firestore security rules

**Files:**
- Modify: `firestore.rules`

**Interfaces:**
- Consumes: nothing new — validates the document shape written by `src/state/createGame.js` (Task 4) and `src/state/gameTransactions.js` (Task 5).

Deep per-array-element validation is intentionally skipped: the spec calls for basic shape/bounds validation only, since anyone holding a game's link is already a fully trusted controller of that game (matching the original site's model), and Firestore rules have no ergonomic way to loop over arbitrary-length arrays.

- [ ] **Step 1: Replace `firestore.rules` with the hardened version**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /games/{gameId} {
      allow read: if true;
      allow write: if isValidGame(request.resource.data);
      allow delete: if false;
    }
  }
}

function isValidGame(data) {
  return data.players is list
    && data.players.size() >= 2
    && data.players.size() <= 12
    && data.status in ['running', 'paused']
    && data.activePlayerIndex is int
    && data.activePlayerIndex >= 0
    && data.activePlayerIndex < data.players.size()
    && data.initialMs is number
    && data.initialMs > 0
    && data.expiresAt is timestamp;
}
```

- [ ] **Step 2: Deploy rules to the emulator and manually verify allow/deny**

Run: `firebase emulators:start --only firestore`
Using the browser console on a running `npm run dev` page (which uses the app's real `db`), attempt:
- A valid transition (e.g. call `transactions.pause(gameId)` on an existing game) — expect it to succeed.
- An invalid direct write, e.g. `import('firebase/firestore').then(({ doc, updateDoc }) => updateDoc(doc(db, 'games', gameId), { status: 'bogus' }))` — expect a `permission-denied` error in the console.

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "Harden Firestore security rules with shape and bounds validation"
```

---

### Task 13: Firestore TTL policy for game expiry

**Files:**
- None (Google Cloud project configuration, not application code)

**Interfaces:**
- None — this operates on the real Firebase project's Firestore instance, keyed off the `expiresAt` field every game document already carries (Tasks 4–5).

- [ ] **Step 1: (human) Enable the TTL policy on the real project**

Replace `YOUR_PROJECT_ID` with the real project ID.

```bash
gcloud firestore fields ttls update expiresAt \
  --collection-group=games \
  --enable-ttl \
  --project=YOUR_PROJECT_ID
```

- [ ] **Step 2: Manually verify the policy is active**

```bash
gcloud firestore fields describe expiresAt \
  --collection-group=games \
  --project=YOUR_PROJECT_ID
```

Expect the output to show a `ttlConfig` block with state `CREATING` or `ACTIVE`. TTL deletion itself runs asynchronously within 24 hours of expiry once active — no further manual check is practical at this stage.

No commit — this task changes cloud project configuration, not files in the repo.

---

### Task 14: Production build and deploy

**Files:**
- Modify: `.env.local` (human, not committed) — flip `VITE_USE_FIRESTORE_EMULATOR` to `false` for the production build

**Interfaces:**
- None — this is the final integration task, exercising every transition end-to-end against the real (not emulated) Firebase project.

- [ ] **Step 1: (human) Set `.env.local` for production**

Edit `.env.local` and set `VITE_USE_FIRESTORE_EMULATOR=false`.

- [ ] **Step 2: Build and deploy**

```bash
npm run build
firebase deploy --only hosting,firestore:rules
```

- [ ] **Step 3: Manually verify the live deployment end-to-end**

Open the printed Hosting URL. Create a game with 2 players and 1 minute. Open the game link in a second device or browser. Confirm, across both: Resume starts the countdown in sync; tapping the active player's zone passes the turn; Pause freezes both; Reset restores the original time while keeping players; Reorder (while paused) changes turn order and preserves which player is active; editing a name/time works in either state; letting a player's time run out shows negative time in red rather than erroring.

- [ ] **Step 4: Commit**

Nothing new to commit if only `.env.local` changed (it's gitignored). If any fixes were needed during verification, commit them with a message describing the fix.

---

## Self-review notes

- **Spec coverage:** every spec section maps to a task — data model/FSM → Task 3; sync/display → Tasks 6-7; creation route → Task 4; game route/controls/reorder/edit → Tasks 8-11; security rules → Task 12; free-tier/expiry → Task 13; deploy → Task 14. The spec's "no automated tests" requirement is reflected in every task's Step structure (manual verification, no test files kept).
- **Type/name consistency checked:** `gameTransactions.js` (Task 5) and `fsm.js` (Task 3) function names match exactly; `useGameDoc`'s returned shape (Task 6) matches what `useClockTick` (Task 7) and `GamePage` (Tasks 8-11) destructure; `PlayerZone` props introduced in Task 8 are used identically in every later `GamePage` revision.
- **Deviation flagged to the user:** reordering uses up/down buttons instead of drag gestures (Task 10), for touch-device reliability — called out before writing this plan.
