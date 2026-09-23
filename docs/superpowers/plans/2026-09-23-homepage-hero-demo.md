# Homepage Hero Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a looping, three-phone animated demo (setup → share → synced clock) above the create-game form on `/`.

**Architecture:** A pure-data timeline (`heroDemoScript.js`) lists "beats", each one visible state of the three phone mockups plus how long it lasts. `HeroDemo.jsx` walks the beats with one `setTimeout` at a time and renders the state; CSS transitions/keyframes do the visual movement. It is a props-free, self-contained sibling `<section>` on `CreateGamePage`, with no Firestore and no new dependency.

**Tech Stack:** React 19 (`useState`/`useEffect`), plain CSS in `src/App.css`, Vite. No new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-09-22-homepage-hero-demo-design.md`

## Global Constraints

- No new route: `/` still renders `CreateGamePage`; the demo is a new section above the existing form.
- No real Firestore calls, no real game creation, no real shareable link: all three phones show scripted fake data on a timer.
- No new npm dependency and no animation library; `HeroDemo` takes no props and depends only on React.
- No new colors: use only existing CSS custom properties from `src/App.css` (`--glass`, `--glass-border`, `--active-grad`, `--active-border`, `--ink-soft`, `--accent*`, ...). Player names/times use Poppins (`--font-display`), other text Inter (`--font-body`).
- Three phones are always side-by-side in one row, never stacked, even on narrow screens; they shrink proportionally (a `min()`/`clamp()` size) instead of wrapping.
- `prefers-reduced-motion: reduce` means no transitions/animations and a static synced (stage 3) end state.
- The demo is an independent sibling `<section>`, not wrapping the form, so a demo bug can never break the real form.
- Fake data must read as obviously demo content (placeholder URL, never a real or confusable game). The brand is always written lowercase: "bg clock".
- This project has no automated test suite (owner's explicit decision). Verification scripts live OUTSIDE the repo in `/tmp/bgclock-hero-check` and are never committed.

## Review Focus

Failure modes the spec implies but a straight implementation would not exercise, most likely first:

- **Reduced-motion visitor, or a browser with no `window.matchMedia`:** with the OS setting on, no timers run and the demo sits on the synced state with no pulsing ring; with `matchMedia` missing, it must fall back to animating without throwing. (Pinned in Task 1, check group 4 and the jsdom no-`matchMedia` default.)
- **React StrictMode double-mount, and navigating away and back:** exactly one timer loop may ever be running, and unmounting must leave zero pending timers, otherwise beats skip twice as fast or the timer fires on an unmounted component. (Pinned in Task 1, check groups 1 and 3.)
- **Keyboard / screen-reader user:** the mock "Create clock" button and fake link must not be real buttons or links (no extra tab stops, no second "Create clock" next to the real form), and the whole section is `aria-hidden`. (Pinned in Task 1, check group 2.)
- **320px-wide phone:** three phones must stay in one row with no horizontal page scroll and no clipped text. Layout cannot be measured headlessly, so this is a manual check in Task 2, Step 7.
- **Short / landscape viewport:** adding the demo above the form must not push the real form out of reach; the page must still scroll to it. Manual check in Task 2, Step 7 (the headless page check pins that the form is still rendered and intact).

---

### Task 1: Demo timeline and `HeroDemo` component

**Files:**
- Create: `src/components/heroDemoScript.js`
- Create: `src/components/HeroDemo.jsx`
- Create (outside the repo, never committed): `/tmp/bgclock-hero-check/hero-demo-check.mjs`

**Interfaces:**
- Consumes: React only.
- Produces:
  - `heroDemoScript.js` exports `BEATS` (array of `{ phase: 'setup'|'share'|'sync', ms: number, players: number|null, time: string|null, pressed: boolean, peersLit: boolean, activeIndex: number|null, tapHint: boolean }`), `FAKE_PLAYERS` (array of `{ name, time }`), `FAKE_URL` (string), `REDUCED_MOTION_BEAT` (index into `BEATS`).
  - `HeroDemo.jsx` exports `HeroDemo` (no props). It renders `<section class="hero-demo" aria-hidden="true" data-phase="setup|share|sync">` containing three `.hero-phone` (`.lit` when fully visible), `.hero-row` (`.active` for the highlighted player), `.hero-ring` (tap hint) and two `.hero-dot` (only during the share phase). Task 2 styles exactly these class names.

- [ ] **Step 1: Create the headless check (outside the repo)**

```bash
mkdir -p /tmp/bgclock-hero-check && cd /tmp/bgclock-hero-check && npm init -y >/dev/null && npm i jsdom @sinonjs/fake-timers
```

Create `/tmp/bgclock-hero-check/hero-demo-check.mjs`:

```js
// Headless structural check for HeroDemo. Usage: node hero-demo-check.mjs <project-root>
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

const P = process.argv[2];
if (!P) { console.error('usage: node hero-demo-check.mjs <project-root>'); process.exit(2); }

const dom = new JSDOM('<!doctype html><div id="root"></div>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { createServer } = await import(`${P}/node_modules/vite/dist/node/index.js`);
const server = await createServer({ root: P, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
const React = (await import(`${P}/node_modules/react/index.js`)).default;
const { createRoot } = await import(`${P}/node_modules/react-dom/client.js`);
const { HeroDemo } = await server.ssrLoadModule('/src/components/HeroDemo.jsx');
const { BEATS, REDUCED_MOTION_BEAT } = await server.ssrLoadModule('/src/components/heroDemoScript.js');

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  -> ${detail}`}`);
  if (!ok) failures++;
}

const container = document.getElementById('root');
const q = (sel) => [...container.querySelectorAll(sel)];
const snapshot = () => ({
  phase: container.querySelector('.hero-demo')?.dataset.phase,
  lit: q('.hero-phone.lit').length,
  active: q('.hero-phone.lit:first-child .hero-row.active').map((r) => q('.hero-row').indexOf(r)),
  activeRows: q('.hero-row.active').length,
  rings: q('.hero-ring').length,
  dots: q('.hero-dot').length,
});
async function mount({ strict = false, reducedMotion } = {}) {
  window.matchMedia = reducedMotion === undefined ? undefined : () => ({ matches: reducedMotion });
  const clock = FakeTimers.install({ toFake: ['setTimeout', 'clearTimeout'] });
  const root = createRoot(container);
  const el = React.createElement(HeroDemo);
  await React.act(async () => root.render(strict ? React.createElement(React.StrictMode, null, el) : el));
  return { clock, root };
}
async function unmount({ clock, root }) {
  await React.act(async () => root.unmount());
  const leaked = clock.countTimers();
  clock.uninstall();
  return leaked;
}
const advance = (clock, ms) => React.act(async () => { clock.tick(ms); });

check('sanity: jsdom has no matchMedia (the no-matchMedia path is the default here)',
  typeof new JSDOM('').window.matchMedia === 'undefined');

// 1. Walk the whole timeline, twice, checking every beat's DOM.
{
  const m = await mount();
  for (let lap = 0; lap < 2; lap++) {
    for (let i = 0; i < BEATS.length; i++) {
      const b = BEATS[i];
      const s = snapshot();
      const expectLit = b.peersLit ? 3 : 1;
      const expectActive = b.activeIndex === null ? [] : [b.activeIndex];
      const ok = s.phase === b.phase && s.lit === expectLit
        && JSON.stringify(s.active) === JSON.stringify(expectActive)
        && s.activeRows === expectActive.length * (b.peersLit ? 3 : 1)
        && s.rings === (b.tapHint ? 1 : 0)
        && (b.phase === 'share' ? s.dots === 2 : s.dots === 0);
      check(`lap ${lap + 1} beat ${i} (${b.phase}${b.activeIndex !== null ? ` active=${b.activeIndex}` : ''})`, ok, JSON.stringify(s));
      await advance(m.clock, b.ms);
    }
  }
  const leaked = await unmount(m);
  check('unmount leaves no pending timers', leaked === 0, `${leaked} left`);
}

// 2. Setup form text and non-interactivity.
{
  const m = await mount();
  check('a11y: section is aria-hidden', container.querySelector('.hero-demo')?.getAttribute('aria-hidden') === 'true');
  check('no interactive elements anywhere in the demo',
    q('button, a, input, select, textarea, [tabindex]').length === 0);
  await advance(m.clock, BEATS[0].ms + BEATS[1].ms);
  check('setup shows 4 players after beat 1', container.textContent.includes('Players4'), container.textContent);
  await advance(m.clock, BEATS[2].ms);
  check('setup shows 10:00 after beat 2', container.textContent.includes('Time10:00'), container.textContent);
  await unmount(m);
}

// 3. StrictMode double-mount must not leave a second loop running.
{
  const m = await mount({ strict: true });
  check('StrictMode: exactly one pending timer after mount', m.clock.countTimers() === 1, `${m.clock.countTimers()}`);
  await advance(m.clock, BEATS[0].ms);
  const b1 = BEATS[1];
  check('StrictMode: one beat advance = one beat',
    snapshot().phase === 'setup' && container.textContent.includes(`Players${b1.players}`));
  check('StrictMode: still exactly one pending timer', m.clock.countTimers() === 1, `${m.clock.countTimers()}`);
  const leaked = await unmount(m);
  check('StrictMode: unmount leaves no timers', leaked === 0, `${leaked}`);
}

// 4. prefers-reduced-motion: no timers, static synced state, no ring.
{
  const m = await mount({ reducedMotion: true });
  const expected = BEATS[REDUCED_MOTION_BEAT];
  const before = snapshot();
  check('reduced motion: no timers scheduled', m.clock.countTimers() === 0, `${m.clock.countTimers()}`);
  check('reduced motion: shows synced state on all 3 phones',
    before.phase === 'sync' && before.lit === 3 && before.activeRows === 3, JSON.stringify(before));
  check('reduced motion: no pulsing tap ring', before.rings === 0 && expected.phase === 'sync');
  await advance(m.clock, 60000);
  check('reduced motion: unchanged after 60s', JSON.stringify(snapshot()) === JSON.stringify(before));
  await unmount(m);
}

// 5. matchMedia present but not reduced: animates normally.
{
  const m = await mount({ reducedMotion: false });
  check('reduced-motion=false: timer scheduled and starts at setup',
    m.clock.countTimers() === 1 && snapshot().phase === 'setup');
  await unmount(m);
}

await server.close();
console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
```

- [ ] **Step 2: Run it to verify it fails**

Run (from the worktree root): `node /tmp/bgclock-hero-check/hero-demo-check.mjs "$(pwd)"`
Expected: exit code 1 with `Error: Failed to load url /src/components/HeroDemo.jsx ... Does the file exist?`

- [ ] **Step 3: Create the timeline**

Create `src/components/heroDemoScript.js`:

```js
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
```

- [ ] **Step 4: Create the component**

Create `src/components/HeroDemo.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { BEATS, FAKE_PLAYERS, FAKE_URL, REDUCED_MOTION_BEAT } from './heroDemoScript';

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Everything in here is decorative and non-interactive: plain divs (never
// buttons or links), so it adds no tab stops and can't be mistaken for the
// real form below it.
function MiniForm({ beat }) {
  return (
    <div className="hero-screen">
      <div className="hero-title">New game</div>
      <div className="hero-field"><span>Players</span><b>{beat.players ?? '—'}</b></div>
      <div className="hero-field"><span>Time</span><b>{beat.time ?? '—:——'}</b></div>
      <div className={`hero-fake-btn${beat.pressed ? ' pressed' : ''}`}>Create clock</div>
    </div>
  );
}

function MiniList({ beat, showTapHint }) {
  return (
    <div className="hero-screen">
      <div className="hero-link-label">Link to Share</div>
      <div className="hero-link">{FAKE_URL}</div>
      <div className="hero-rows">
        {FAKE_PLAYERS.map((player, i) => (
          <div key={player.name} className={`hero-row${beat.activeIndex === i ? ' active' : ''}`}>
            <span className="hero-row-name">{player.name}</span>
            <span className="hero-row-time">{player.time}</span>
            {showTapHint && beat.activeIndex === i && <span className="hero-ring" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function Phone({ beat, index, reduced }) {
  const lit = index === 0 || beat.peersLit;
  return (
    <div className={`hero-phone${lit ? ' lit' : ''}`}>
      {lit && beat.phase === 'setup' && <MiniForm beat={beat} />}
      {lit && beat.phase !== 'setup' && (
        <MiniList beat={beat} showTapHint={index === 0 && beat.tapHint && !reduced} />
      )}
    </div>
  );
}

export function HeroDemo() {
  const [reduced] = useState(prefersReducedMotion);
  const [beatIndex, setBeatIndex] = useState(reduced ? REDUCED_MOTION_BEAT : 0);

  useEffect(() => {
    if (reduced) return;
    const id = setTimeout(() => setBeatIndex((i) => (i + 1) % BEATS.length), BEATS[beatIndex].ms);
    return () => clearTimeout(id);
  }, [reduced, beatIndex]);

  const beat = BEATS[beatIndex];
  return (
    <section className="hero-demo" aria-hidden="true" data-phase={beat.phase}>
      <div className="hero-phones">
        {[0, 1, 2].map((index) => (
          <Phone key={index} beat={beat} index={index} reduced={reduced} />
        ))}
        {beat.phase === 'share' && (
          <>
            <span className="hero-dot hero-dot-1" />
            <span className="hero-dot hero-dot-2" />
          </>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Run the check to verify it passes**

Run: `node /tmp/bgclock-hero-check/hero-demo-check.mjs "$(pwd)"`
Expected: every line `PASS`, last line `All checks passed`, exit code 0.

- [ ] **Step 6: Prove the check can actually fail**

```bash
cp src/components/HeroDemo.jsx /tmp/bgclock-hero-check/HeroDemo.good
sed -i 's/    return () => clearTimeout(id);//' src/components/HeroDemo.jsx
node /tmp/bgclock-hero-check/hero-demo-check.mjs "$(pwd)" | grep -E "FAIL|checks"
cp /tmp/bgclock-hero-check/HeroDemo.good src/components/HeroDemo.jsx
node /tmp/bgclock-hero-check/hero-demo-check.mjs "$(pwd)" | tail -1
```
Expected: the first run prints 3 `FAIL` lines (`unmount leaves no pending timers`, `StrictMode: exactly one pending timer after mount`, `StrictMode: unmount leaves no timers`) and `3 check(s) FAILED`; after restoring, the last line is `All checks passed`.

- [ ] **Step 7: Lint and build**

Run: `npx oxlint src/components && npm run build`
Expected: no lint errors; `✓ built`.

- [ ] **Step 8: Commit**

```bash
git add src/components/heroDemoScript.js src/components/HeroDemo.jsx
git commit -m "Add HeroDemo component and scripted timeline"
```

---

### Task 2: Style the demo and place it on the create page

**Files:**
- Modify: `src/pages/CreateGamePage.jsx` (import at line 3, JSX at line ~50)
- Modify: `src/App.css` (append at end of file)
- Create (outside the repo, never committed): `/tmp/bgclock-hero-check/hero-demo-page-check.mjs`

**Interfaces:**
- Consumes: `HeroDemo` from Task 1 and the class names listed in its Produces block.
- Produces: the finished feature on `/`.

- [ ] **Step 1: Create the page check (outside the repo) and watch it fail**

Create `/tmp/bgclock-hero-check/hero-demo-page-check.mjs`:

```js
// Headless check that CreateGamePage renders the demo above the brand and form.
// Usage: node hero-demo-page-check.mjs <project-root>
import { JSDOM } from 'jsdom';

const P = process.argv[2];
if (!P) { console.error('usage: node hero-demo-page-check.mjs <project-root>'); process.exit(2); }

const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { createServer } = await import(`${P}/node_modules/vite/dist/node/index.js`);
const server = await createServer({
  root: P, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom',
  ssr: { external: ['react-router-dom', 'react-router'] },
});
const React = (await import(`${P}/node_modules/react/index.js`)).default;
const { createRoot } = await import(`${P}/node_modules/react-dom/client.js`);
const { MemoryRouter } = await import(`${P}/node_modules/react-router-dom/dist/index.mjs`);
const { CreateGamePage } = await server.ssrLoadModule('/src/pages/CreateGamePage.jsx');

const root = createRoot(document.getElementById('root'));
await React.act(async () =>
  root.render(React.createElement(MemoryRouter, null, React.createElement(CreateGamePage))));

const order = [...document.querySelector('.create-page').children].map((c) => c.className);
const ok = order.join(' | ') === 'hero-demo | brand | create-card';
console.log(`${ok ? 'PASS' : 'FAIL'}  create page order is demo -> brand -> form  (got: ${order.join(' | ')})`);
const formIntact = !!document.querySelector('.create-card select')
  && !!document.querySelector('.create-card input[type="time"]')
  && document.querySelector('.create-card button[type="submit"]')?.textContent === 'Create clock';
console.log(`${formIntact ? 'PASS' : 'FAIL'}  real create form is intact (players, time, submit)`);
await server.close();
process.exit(ok && formIntact ? 0 : 1);
```

Run (from the worktree root): `node /tmp/bgclock-hero-check/hero-demo-page-check.mjs "$(pwd)"`
Expected: `FAIL  create page order is demo -> brand -> form  (got: brand | create-card)`, then `PASS  real create form is intact ...`, exit code 1.

- [ ] **Step 2: Render the demo above the brand**

In `src/pages/CreateGamePage.jsx`, add the import directly after the existing `createGame` import:

```jsx
import { createGame } from '../state/createGame';
import { HeroDemo } from '../components/HeroDemo';
```

and add `<HeroDemo />` as the first child of `.create-page`, above the brand:

```jsx
    <div className="create-page">
      <HeroDemo />
      <div className="brand">
```

- [ ] **Step 3: Append the demo styles**

Append to the end of `src/App.css`:

```css

/* Homepage hero demo (decorative; see src/components/HeroDemo.jsx) */
.hero-demo {
  width: 100%;
  max-width: 560px;
  pointer-events: none;
  user-select: none;
}
.hero-phones {
  position: relative;
  display: flex;
  flex-wrap: nowrap; /* three phones always stay in one row, even at 320px */
  justify-content: center;
  gap: clamp(0.4rem, 2.5vw, 1rem);
}
.hero-phone {
  flex: 1 1 0;
  min-width: 0;
  max-width: 170px;
  aspect-ratio: 9 / 16;
  padding: 0.7em;
  overflow: hidden;
  font-size: clamp(0.5rem, 2vw, 0.75rem); /* everything inside scales in em */
  background: var(--glass);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 1.8em;
  box-shadow: var(--shadow-soft), var(--shadow-inset);
  opacity: 0.35;
  transform: scale(0.92);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.hero-phone.lit {
  opacity: 1;
  transform: none;
}

.hero-screen {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  height: 100%;
}
.hero-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.15em;
}
.hero-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.45em 0.6em;
  background: var(--glass-strong);
  border: 1px solid var(--glass-border);
  border-radius: 0.8em;
  color: var(--ink-soft);
}
.hero-field b {
  font-family: var(--font-display);
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
.hero-fake-btn {
  margin-top: auto;
  text-align: center;
  padding: 0.55em;
  border-radius: var(--radius-pill);
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  transition: transform 0.15s ease;
}
.hero-fake-btn.pressed { transform: scale(0.92); }

.hero-link-label {
  color: var(--ink-soft);
  font-weight: 500;
}
.hero-link {
  padding: 0.4em 0.5em;
  background: var(--glass-strong);
  border: 1px solid var(--glass-border);
  border-radius: 0.7em;
  color: var(--accent-strong);
  font-size: 0.9em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hero-rows {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.4em;
}
.hero-row {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.6em;
  background: var(--glass);
  border: 1px solid var(--glass-border);
  border-radius: 0.9em;
  transition: background 0.3s ease, border-color 0.3s ease;
}
.hero-row.active {
  background: var(--active-grad);
  border-color: var(--active-border);
}
.hero-row-name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.85em;
}
.hero-row-time {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.1em;
  font-variant-numeric: tabular-nums;
}
.hero-ring {
  position: absolute;
  inset: -3px;
  border-radius: inherit;
  border: 2px solid var(--accent);
  animation: hero-pulse 0.9s ease-out infinite;
}
@keyframes hero-pulse {
  from { transform: scale(1); opacity: 0.9; }
  to { transform: scale(1.1); opacity: 0; }
}

/* The "share" dots: one travels from phone 1 to phone 2, one to phone 3.
   Phone centres sit at roughly 1/6, 1/2 and 5/6 of the row. */
.hero-dot {
  position: absolute;
  top: 45%;
  left: 16.67%;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
  opacity: 0;
  z-index: 2;
  animation: hero-travel-1 1.6s ease-in-out forwards;
}
.hero-dot-2 { animation-name: hero-travel-2; }
@keyframes hero-travel-1 {
  0% { left: 16.67%; opacity: 0; }
  15%, 85% { opacity: 1; }
  100% { left: 50%; opacity: 0; }
}
@keyframes hero-travel-2 {
  0% { left: 16.67%; opacity: 0; }
  15%, 85% { opacity: 1; }
  100% { left: 83.33%; opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .hero-demo *, .hero-demo *::before, .hero-demo *::after {
    transition: none;
    animation: none;
  }
}
```

- [ ] **Step 4: Run both headless checks**

```bash
node /tmp/bgclock-hero-check/hero-demo-page-check.mjs "$(pwd)"
node /tmp/bgclock-hero-check/hero-demo-check.mjs "$(pwd)" | tail -1
```
Expected: two `PASS` lines from the page check (order is `hero-demo | brand | create-card`), and `All checks passed`.

- [ ] **Step 5: Lint and build**

Run: `npm run lint && npm run build`
Expected: no lint errors; `✓ built`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/CreateGamePage.jsx src/App.css
git commit -m "Show the hero demo above the create-game form"
```

- [ ] **Step 7: Hand off for visual review (do NOT claim this step done from headless output)**

Start `npm run dev` and open the printed local URL. The headless checks cannot judge look, timing or layout, so report these as "needs owner eyes", listing what to look at:
1. Desktop width: the three phones sit centred above the "bg clock" wordmark and the form; the loop reads setup (form fills in, "Create clock" presses) → share (dots travel to phones 2 and 3, which light up) → sync (the mint highlight moves Player 1 → 2 → 3 on all three phones at once; one pulsing ring on phone 1's first highlighted row).
2. Device toolbar at 320px width: the three phones stay in one row, no horizontal page scroll, no text spilling out of a phone (the fake URL should end in an ellipsis).
3. Landscape phone (e.g. 667×375): the page scrolls and the real form is reachable below the demo.
4. DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce", then reload: the demo is static on the synced state with all three phones visible, nothing moving.
5. Timing feel and polish: durations are in `BEATS` in `heroDemoScript.js` (~9.5s loop) and are easy to tune after feedback.

Do not deploy from this plan: production still serves the pre-round-2 build, so a single `npm run build` + `firebase deploy --only hosting` should ship round 2 and this demo together once the owner signs off.
