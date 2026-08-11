# 20 — Life counter on the name row

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: done
Blocked by: 13 — build command-zone redraw (the name row sits above the redrawn column)

**What to build:** Every player's name row gains a life counter on the far right,
starting at 40, that anyone at the table can change — quick pings via +/- buttons,
big corrections by typing directly — with every change syncing live to all browsers.

The counter is a new locked custom shape (working name `mtg-life-counter`) whose component
renders the number with +/- buttons and accepts direct typing, synced through the
tldraw room like every other shape. Name row layout: player name large and
left-justified; the life counter bigger, far right (commander-damage counters slot in
between in ticket 21). Everyone can change everything — no ownership enforcement;
last-writer-wins collisions are accepted.

Mechanics (from the design ticket): locking gates tldraw's gesture state machine but
not DOM events, so buttons work with `pointer-events: all` plus marking pointer events
handled (tldraw's own hyperlink-button pattern); typing must shield keystrokes from
tldraw's tool hotkeys; the new shape type pays the four-step registration cost.

Life-change events in the event log are Map 5's — parked, out of scope.

Design source of truth: [12 — life totals and commander damage](12-life-totals-and-commander-damage.md).

Test at the server event-handler seam for what it can see (counter shape minted on the
name row at 40, locked); counter +/-/typing is DOM interaction on a locked shape →
Playwright, few and behavioral (click + in one browser context → number increments in
a second).

Consult owners: `tabletop-shape-mechanics` (new shape registration, locked-shape DOM
events), `shuffler-looks-like-itself` (counter and name-row appearance).

- [x] Each seat's name row shows a life counter starting at 40, far right, name large on the left
- [x] +/- buttons and direct typing both work on the locked shape; tldraw hotkeys don't fire while typing
- [x] Any player can change any counter; changes sync live to a second browser context (Playwright)
- [x] The counter shape is locked furniture — it can't be dragged or deleted by reaching for a card

**Landed 2026-08-10.** `mtg-life-counter` (apps/tabletop/src/shared/mtgLifeCounterShape.ts,
apps/tabletop/src/client/shapes/MtgLifeCounterShapeUtil.tsx), minted at seat-join
(tableFurniture.ts) far right of the name row via `lifeCounterPosition` (cardLayout.ts).
One real bug found and fixed along the way, not anticipated by the design ticket:
`editor.updateShape` silently no-ops on a locked shape's props unless wrapped in
`editor.run(fn, { ignoreShapeLock: true })` — recorded as a new watch point in
owners/tabletop-shape-mechanics. Corner-radius appearance staged on `/design#life-counter`
(three options), not yet decided — current shape ships the soft-rectangle placeholder
pending Jess's sign-off; everything else (fill/border/text tokens, focus-visible) is
reused from already-decided fleet choices, not new. Ticket 21 (commander-damage
counters) can now proceed.
