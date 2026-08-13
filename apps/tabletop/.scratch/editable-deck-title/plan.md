# Plan: editable-deck-title

Mountain: (Tabletop usability — players control their own board)

## Goal
On the Tabletop, make the deck-title label editable. Today it is a **locked stock `text`
shape** reading `${playerName} 〜 ${deckName}` (id `name-label-<table>-<seat>`, `isLocked: true`).
It's locked on purpose: a live bug let any player drag/delete another player's name, and tldraw
ties text editing to the same unlocked state as drag/delete.

## Decision (from Jess, 2026-08-12)
The **whole label** (`PlayerName 〜 DeckName`) is one editable text field. **Anyone** at the
table can edit **any** title. Edits sync + persist via a synced shape prop — identical semantics
to the life counters, which are already anyone-edits-anyone.

## Mechanism (proven by MtgLifeCounterShapeUtil)
A **locked** custom shape can still contain interactive HTML that writes to its own props via
`this.editor.updateShape(..., { ignoreShapeLock: true })`. The life counter does exactly this
with an `<input>` while staying `isLocked: true`, so drag/delete stay off but the value edits.
We copy that pattern for text.

## Changes (all in apps/tabletop/)

1. **New shared shape props** — `src/shared/mtgTitleShape.ts` (mirror `mtgLifeCounterShape.ts`):
   props `{ w: number; h: number; text: string }`; registers `"mtg-title"` in
   `TLGlobalShapePropsMap`; exports `MtgTitleShape`, `mtgTitleShapeProps`.

2. **New shape util** — `src/client/shapes/MtgTitleShapeUtil.tsx` extending `BaseBoxShapeUtil`.
   - `component()` renders an `<input type="text">` styled to read like the current label:
     `font-family: var(--font-chrome)` (Orbitron — only reachable via a self-rendering custom
     shape, per CLAUDE.md), on-brand color. Transparent background, no border, so it looks like
     text until focused.
   - `draft` state pattern from the life counter: `onFocus` seeds draft, `onChange` updates
     draft, `onBlur`/Enter commits via `updateShape({ ..., props: { text }}, { ignoreShapeLock: true })`.
   - `markEventAsHandled` on pointer events so canvas doesn't steal the interaction.
   - Reuse the life counter's `:focus-visible` outline treatment (3px `--light-pink`, 3px offset).
   - `getIndicatorPath` returns the box rect.

3. **Register** it in `src/client/TablePage.tsx` `shapeUtils` array.

4. **Emit it from the server** — `src/server/tableFurniture.ts` `ensurePlayerArea`, the `labelId`
   block (~line 364): replace the `type: "text"` shape with `type: "mtg-title"`.
   - **KEEP** the same id `name-label-<table>-<seat>` and its **relative index**
     (`nextFurnitureIndex` call stays in the same position, just after the life counter `put`).
     `addCommanderDamageCounters` looks up this id and anchors counters with
     `getIndexAbove(label.index)`; the life counter is deliberately drawn just before it. Keeping
     id + index preserves that z-order fix (commit c90d13a).
   - props: `{ w: <same width>, h: <label height>, text: look.deckName ? `${playerName} 〜 ${look.deckName}` : playerName }`.
   - `isLocked: true` stays.

## Persistence check (done)
`seatJoined.ts:72` dedupes: an already-seated seat does NOT redraw furniture. `seat.joined` only
fires from the Shuffler at Shuffle Up. So a browser reload just reconnects to the existing synced
room store — the edited title (a synced prop) is already there. Same persistence profile as the
life-counter value. No new server round-trip needed; we deliberately do NOT feed the edit back
into the seat.joined → PlayerAreaLook.deckName flow.

## Verification
Playwright (verify.sh style): load a table with a seat, find the title, type a new value, blur,
assert the shape's `text` prop / rendered value changed; reload and assert it persisted.

## Open styling questions for the design owner
- The current label is `color: green, font: serif, size m, scale 2`. Should the editable version
  keep that exact look, or move to on-brand Orbitron/`--font-chrome` now that a custom shape
  finally *can* render Orbitron? (Lean: on-brand, but this is an appearance change riding a
  mechanism change — needs explicit sign-off, so ask.)
