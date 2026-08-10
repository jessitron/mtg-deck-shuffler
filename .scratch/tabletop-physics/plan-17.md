# Plan — ticket 17: flip and turn face-down

Ticket: `.scratch/tabletop-physics/issues/17-flip-and-face-down.md`
Scope: apps/tabletop only. Binding decisions from ticket 06 (two separate context-menu
items; faceDown = plain image swap; concealment depicted never enforced; hand/library
entry resets both axes table-locally; no table→Shuffler face sync).

## 1. `src/shared/mtgCardShape.ts` — one new prop

Add `cardBackImageUrl: string | null` (validator `T.string.nullable()`), doc'd as the
table's generic back for the unsleeved face-down render. Baked at mint like
`sleeveColor` and legal by the same argument: the table's card back is a game constant.
`null` for sleeved seats (whose `seat.joined` omits it — the sleeve branch always wins)
and for pre-existing shapes. No tldraw migration: tables are in-memory and ephemeral
(same posture as when `sleeveColor` was added).

## 2. `src/server/cardArrival.ts` — bake it at mint

In the `store.put` props: `cardBackImageUrl: playerArea.cardBackImageUrl ?? null`,
next to `sleeveColor`, with a comment mirroring its "seat data, not payload data" note.

## 3. `src/client/CardContextMenu.tsx` (new) — the first custom context menu

`TableContextMenu(props: TLUiContextMenuProps)` wraps `DefaultContextMenu` and renders
`<CardMenuItems />` **followed by `<DefaultContextMenuContent />`** — children replace
the default content entirely, so omitting that line silently deletes Lock/Unlock and
the whole stock menu app-wide.

`CardMenuItems`: `useEditor()` + `useValue` to read the selection reactively.

- `cards` = selected shapes with `type === "mtg-card"`. Empty → return `null`.
- **"Flip"**: rendered only when at least one selected card has `backImageUrl !== null`
  (single card: exactly the ticket's gate). `onSelect` swaps `face` on each flippable
  selected card (per-card swap — flip has no convergent target state).
- **"Turn face down" / "Turn face up"**: label and target from convergence, the
  ticket-16 precedent — if any selected card is face-up, item says "Turn face down" and
  sets `faceDown: true` on all; only when all are already face-down does it say
  "Turn face up" and set all `false`. Single card degenerates to a plain toggle.
- Each `onSelect`: `editor.markHistoryStoppingPoint(...)` → one `editor.updateShapes`
  (no-op cards skipped) → `editor.setSelectedShapes([])`. The trailing clear defuses
  the stale-selection hazard: right-click selects the card and `DefaultContextMenu`
  only clears selection on close for _locked_ shapes, and per shape-mechanics watch
  point 1 a lingering card selection makes the next drag of a _different_ card silently
  move this one. (Context-menu `onSelect` runs outside `PointingShape.onPointerUp`, so
  no `queueMicrotask` needed — that dance is `onClick`-specific.)

Wire in `TablePage.tsx`: `components: { Toolbar: ToolbarWithCounter, ContextMenu: TableContextMenu }`.
Stock tldraw chrome, plain string labels — same posture as the counter toolbar item
(map 4 owns menu curation; no new visual decisions).

### Note from Jess — menu curation

Trim the stock menu content instead of rendering all of `DefaultContextMenuContent`.
Keep only `ReorderMenuSubmenu` and `ClipboardMenuGroup` (Cut/Copy/Paste/Duplicate/
Delete is exactly that one group in tldraw's `menu-items.tsx`); drop `EditMenuSubmenu`
(Lock/Unlock — the sole other place Lock/Unlock lived; losing it here is intentional
per Jess), `ArrangeMenuSubmenu`, `MoveToPageMenu`, `ConversionsMenuGroup`,
`SelectAllMenuItem`, `CursorChatItem`.

Add a third card action, Tap/Untap, alongside Flip and Turn face down — same
convergent-push semantics as face-down (any untapped selected → "Tap", set all
`tapped: true`; all tapped → "Untap", set all `false`). Reuses the existing tap
rotation math from `MtgCardShapeUtil.onClick`'s private `tapPartial`, which must be
pulled out to a standalone exported function (`shapes/cardTap.ts`) so the menu item
(no `this`) and `onClick` share one implementation.

Render order, top to bottom: **Flip, Turn face down/up, Tap/Untap** (new — Jess wants
these first since they're important), then `ReorderMenuSubmenu`, then
`ClipboardMenuGroup`.

Final custom content, replacing `<DefaultContextMenuContent />`:

```tsx
<CardMenuItems />                                   {/* Flip / faceDown / tap, own group */}
<TldrawUiMenuGroup id="modify"><ReorderMenuSubmenu /></TldrawUiMenuGroup>
<ClipboardMenuGroup />
```

## 4. `MtgCardShapeUtil.tsx` — render the unsleeved back; reset on library entry

**Render**: the unsleeved branch becomes faceDown-aware:

```tsx
) : faceDown ? (
  // Concealed without a sleeve: the table's generic card back, a plain
  // image swap (ticket 06 decision 3). cardBackImageUrl is null only for
  // shapes minted before the prop existed or sleeved seats (unreachable
  // here); fall back to a flat dark rectangle rather than leaking the face.
  cardBackImageUrl
    ? <img className="tl-image" src={cardBackImageUrl} alt="face-down card" draggable={false} />
    : <div style={{ width: "100%", height: "100%", background: "#3a3a3a" }} />
) : (
  <img className="tl-image" src={src} ... />   // unchanged
)
```

The sleeved branches don't change (sleeved + faceDown already renders the sleeve rect).

**Reset**: inside `onTranslateEnd`'s existing `if (zoneHit)` block — after the
unconditional `setSelectedShapes([])` (line 310, untouched, stays first) and the
`meta.zone` debounce (untouched) — when `zoneHit.zone === "library"` fold a props reset
into the _same_ returned partial (one write, one undo entry):

```ts
const reset =
  zoneHit?.zone === "library" &&
  (current.props.face !== "front" || current.props.faceDown);
return {
  id,
  type,
  ...(reset ? { props: { face: "front", faceDown: false } } : {}),
  meta: { ...current.meta, zone: zone ?? null },
};
```

There is no `hand` zone (the enum is playmat/library/graveyard/exile/stack/command),
so "hand or library" is implementable for library only today — noted on the ticket,
not invented here. The debounce means a nudge _within_ the library won't re-reset;
fine, the card was already reset on entry.

## 5. Tests

**Vitest** (`test/cardArrival.test.ts`): unsleeved seat → card props carry the seat's
`cardBackImageUrl`; sleeved seat → `null`. (Template: the existing sleeve-baking tests.)

**Playwright** (`test/verification/verify-flip-face-down.spec.ts`, templates:
`verify-multi-untap.spec.ts` for fixtures + two-client, `verify-zone-entry.spec.ts`
for `dragCardTo`):

1. Two-client flip: card with a real `backImageUrl` → right-click → "Flip" → the
   card's `<img src>` is the back URL **on both clients** (ticket checkbox 4).
2. Flip gating: card with `backImageUrl: null` → right-click → no "Flip" item
   (but "Turn face down" present).
3. Face-down: right-click → "Turn face down" → unsleeved card's `<img src>` is the
   table's cardBackImageUrl; "Turn face up" restores the face.
4. Library reset: flip a card face-down, drag it onto the library zone → src is
   `frontImageUrl` again (face + faceDown both reset).
5. Drag-identity regression: right-click card A → Flip → drag card B → B moves, A
   doesn't (guards the post-menu selection clear).

Two-client assertions ride test 1 only; the rest are single-client.

## 6. Not doing

- No `card.flipped` event, no Shuffler sync (ticket 06 decision 2 — divergence accepted) -- for now.
- No hand zone, no menu redesign, no flip animation (tap's WAAPI catch-up stays as is;
  flip is an instant swap for now).
- No control gating — anyone can flip anything (table-vision principle).

## Sequencing (TDD at the seams)

1. Vitest mint test red → props + cardArrival change → green.
2. Playwright spec written (all five) red → context menu + render + reset → green.
3. `npx tsc --noEmit` + `npx vitest run` along the way; `./verify.sh` full at the end.
