# Homepage Hero Demo Animation — Design

## Summary

Add an animated, looping demo to the top of the existing create-game
screen (`/`, `CreateGamePage.jsx`) that shows, at a glance, what "bg
clock" does: set up a clock, share the link, and watch it stay in sync
across devices. Modeled on the reference site
[multiplayerchessclock.com](https://multiplayerchessclock.com)'s own
homepage, which combines a short instructional walkthrough with the
real creation form on one page — this app does the same, adding a
demo above the existing form rather than introducing a separate
landing route.

## Goals

- Give a first-time visitor an instant, wordless sense of the product
  (turn-based clock, shareable link, real-time multi-device sync)
  before they read or fill in anything.
- Reuse the app's existing "bg clock" visual language (glass panels,
  soft gradients, muted mint/coral accents, Poppins/Inter) — explicitly
  NOT the reference site's dark-navy/bright-red/hand-drawn-sketch style,
  which was used only as a layout reference, not a visual one.
- Ship as a self-contained, dependency-free component that degrades
  gracefully (no console errors, no dependency on real Firestore) if
  anything about the animation timing is imperfect.

## Non-goals

- No new route. `/` still renders `CreateGamePage`; the demo is a new
  section rendered above the existing `.create-card` form on that same
  page.
- No real Firestore calls, no real game creation. All three phone
  mockups show scripted, fake data on a timer — nothing here writes to
  the database or generates a real shareable link.
- No pixel-perfect device frame illustrations (bezels, notches, etc.) —
  simple rounded-rectangle "phone" outlines are enough to read as
  "device," consistent with the app's minimal aesthetic.
- No accessibility-motion-reduction work beyond respecting
  `prefers-reduced-motion` (see Testing/Constraints below) — deeper a11y
  work on this decorative element is out of scope for v1.

## Layout

Three phone-frame mockups, always arranged side-by-side in a single
row — **never stacked vertically**, even on narrow screens (the
three-devices story is the whole point; stacking would lose it). On
narrow viewports the frames shrink proportionally (smaller width,
smaller font sizes inside) rather than wrapping to a column or
overflowing; a `min()`-based width keeps them from getting too small to
read on very narrow phones.

Placement: a new `<section className="hero-demo">` inside
`CreateGamePage.jsx`, rendered above the existing `<div className="brand">`
wordmark, so the page reads top-to-bottom as: demo → brand → form.

## Animation timeline

A single component (`HeroDemo`) drives a small internal state machine
through four stages on a repeating timer (~10s total loop, exact timings
are implementation judgment, not load-bearing):

1. **Setup (~3s)** — only the first phone is visually prominent (the
   other two are present but dimmed/scaled down, hinting they're
   "waiting"). Inside phone 1, a mini mockup of the create form
   auto-fills: a player-count value ticks up or lands on a number (e.g.
   "4 players"), a time value appears (e.g. "10:00"), then a "Create
   clock" button visibly presses (brief scale/tap animation).
2. **Share (~2s)** — phone 1 now shows "Link to Share" plus a short
   fake URL (e.g. `bgclock.web.app/xxxxxxxx`, clearly fake, never a
   real game). A small animated element (a dot, line, or simple icon —
   implementation's choice) travels from phone 1 toward phones 2 and 3,
   which simultaneously fade/scale from dimmed to fully visible, now
   showing the identical "Link to Share" + URL and the same player
   list as phone 1.
3. **Sync (~4s)** — all three phones show an identical, static player
   list (names + times, styled like the real `PlayerZone` component:
   glass rows, mint-gradient highlight for the active player). The
   "active player" highlight visibly moves from Player 1 → Player 2 →
   Player 3 **simultaneously across all three phones**, proving the
   real-time-sync value proposition. A small pulsing/tap-indicator
   affordance appears briefly on the active row of one phone to hint at
   "tap to pass the turn" (echoing the reference site's hand-drawn
   arrow, but as a simple pulsing ring or minimal pointer glyph in this
   app's own style — not a literal sketch).
4. **Loop** — return to stage 1 and repeat indefinitely while the page
   is open.

## Visual style

Reuse existing CSS custom properties from `src/App.css` — no new
colors introduced beyond what's already defined:
- Phone frames: rounded-rectangle outline using `--glass`/`--glass-border`
  glass panel styling, consistent with `.create-card`/`.player-zone`.
- Active-player row inside a phone: `--active-grad`/`--active-border`
  (the same mint gradient real running games use).
- Fake link text: styled like existing form/label text
  (`--ink-soft`, `Inter`).
- Player names/times inside the mockup: `Poppins`, matching
  `.player-name`/`.player-time`'s real styling, at a smaller scale
  appropriate to the mockup's size.

## Implementation approach

- New component: `src/components/HeroDemo.jsx`. Pure `useState`/
  `useEffect` with `setTimeout`/`setInterval` driving a small `stage`
  index (0-3) through scripted fake data — no external animation
  library, no new npm dependency. CSS transitions/keyframes (in
  `src/App.css`, under a `.hero-demo` block) handle the visual movement
  (fades, scale, the highlight sliding between rows, the share-icon
  travel).
- Respect `prefers-reduced-motion: reduce`: when set, skip transitions/
  animations and just show stage 3 (the "synced" end state) statically,
  rather than forcing motion on users who've opted out at the OS level.
- The component takes no props and has no external dependencies beyond
  React itself — it's entirely self-contained, safe to mount/unmount
  freely.

## Error handling

None needed — this is a purely decorative, client-side-only animation
with no network calls, no user input, and no failure modes beyond a
CSS/JS bug (which would just look wrong, not crash the app). If the
component threw for some unexpected reason, it would only affect the
demo section, not the functional create-game form below it — implemented
as an independent sibling `<section>`, not wrapping the form.

## Testing

No automated test suite in this project (established convention).
Verification is necessarily different from the rest of the app, given
this is a visual/animation feature:
- **Structural verification (headless, doable in this environment):**
  confirm the component cycles through the expected 4 stages over time
  (e.g. via fake timers), that the DOM reflects the right fake data at
  each stage, and that it respects `prefers-reduced-motion` (mockable in
  jsdom via `window.matchMedia`).
- **Visual verification (not doable in this environment):** the actual
  look, timing feel, and polish of the animation can only be judged by
  a human looking at it in a real browser. The project owner will need
  to view it via the dev server or the deployed site and give feedback,
  the same way earlier UI rounds in this project were reviewed.

## Open items for implementation planning

- Exact animation durations/easing curves are implementation judgment,
  not fixed by this spec.
- Exact fake data shown (player names in the mockup, the fake URL
  slug) is implementation judgment — should read as obviously
  demo/placeholder content, not a real or confusable game.
