# Make tap a state the card holds, not incidental geometry

Mountain: tabletop-replaces-mural
Type: grilling
Status: resolved
Blocked by: 02

## Question

Tap works — `onClick` toggles `shape.rotation` between 0 and π/2, pivoting on the card centre —
but it is stored *as rotation*, and tldraw's stock selection handles let a player free-rotate a
card to any angle. `MtgCardImageShapeUtil`'s `UNTAPPED_EPSILON` check then reads any hand-rotation
as "tapped," so the next click snaps the card to 0 and the toggle is silently wrong. Resize does
the same kind of damage.

This is the one place where the stock tldraw surface actively breaks physics, which is why it
sits on this map rather than on map 4 with the rest of the curation.

Decide:

- **Is tapped a boolean the card carries**, with rotation derived from it — or does rotation stay
  the source of truth?
- **What happens to the free-rotate and resize handles on a card?** Suppressed entirely, or
  allowed with tap tracked separately? A player rotating a card slightly to mean something (the
  physical-table habit of angling a card) is a real gesture worth not destroying by accident.
- **Untapping at end of turn.** Real players untap everything at once. Is that a physics concern
  (select-all-and-untap), or does it wait for something that knows about turns?
- **90° which way?** Right for tap is the convention; does it matter that some playmats will be
  sideways to others once map 2's square lands?

## Answer

Resolved 2026-08-07 by grilling with Jess, plus the `animations` and `shuffler-looks-like-itself`
owners and a throwaway Playwright prototype (branch `proto/multi-tap`, deleted; nothing landed).

### `tapped` is a stored boolean; rotation is written as a delta

`props.tapped: boolean` (already allocated by [ticket 02](02-what-a-card-is.md)) is the truth, and it
is **never read back out of an angle** — `UNTAPPED_EPSILON` dies with the bug it caused.

But the *visual* stays tldraw's own `shape.rotation`, applied as a **delta** rather than an absolute:
tap is `rotation += 90°`, untap is `rotation -= 90°`, keeping the existing centre-preserving
`Vec.Add`/`Vec.Rot` math. No `baseRotation` prop is needed, because only deltas are ever applied — a
player angles a card to 20°, tap makes it 110°, untap returns it to 20°, and `tapped` stays honest
throughout.

**The rejected alternative, and why.** The `animations` owner first recommended storing only the
boolean and rendering the rotation as a CSS transform inside the card's own component — one synced
write, free local animation, composes with free rotation. It then **withdrew that recommendation**
once Jess decided the resize handle stays (below): CSS-only rotation is invisible to tldraw, so a
tapped card would draw landscape while its hit-test box, selection indicator and **resize handles**
stayed portrait. The owner's words: *"not a rendering nit — it's a lie about where the object is, on
the gesture players repeat more than any other."* Dead zones on the ends of a tapped card, on the
most-repeated gesture in the game, are not payable. **Do not re-derive the CSS-only route; it was
considered and killed on this specific ground.**

Also rejected: overriding `getGeometry()` to return the swapped box when tapped (keeps CSS-only
honest, but resize handles then operate in a swapped frame, `onResize` must un-swap `w`/`h`, and
free-rotate composes a *second* frame — a permanent coordinate-frame translation), and
`editor.animateShapes()` (writes interpolated state per frame, which in a synced room means per-frame
synced writes and an undo trail — the same reason [ticket 03](03-what-furniture-is.md) rejected
`onDragShapesOver`).

Independent confirmation from the prototype: **a tapped card's page bounds are the rotated bounds**,
so a marquee drawn around three upright cards also swept in a tapped card beside them. The geometry
is honest, which is the whole point. (Minor UX wrinkle for any future marquee-based interaction;
not worth a ticket.)

### Resize and free-rotate both stay

Jess: *"I like resizing cards in Mural. I don't want the weird cropping thing, but I do like resize
— I like to make creatures bigger than lands."* And on rotation: *"people might want to angle a card
a little bit to indicate that it's attacking (even if vigilant)."*

- **Resize stays, aspect-ratio locked** (`isAspectRatioLocked = () => true`). It costs nothing:
  `BaseBoxShapeUtil` already supplies `onResize`, so keeping it is doing nothing.
- **Free-rotate stays.** It costs nothing now that tap is a delta — tap composes on top of whatever
  angle the player chose, and neither mechanism needs to know about the other.
- **Crop goes away for free.** [Ticket 02](02-what-a-card-is.md) found that `DefaultImageToolbar`
  gates on `shape.type !== 'image'`; the crop button exists only because we're currently an
  `ImageShapeUtil` subclass. Becoming `mtg-card` removes it without asking. This is exactly the
  "weird cropping thing" Jess didn't want, and no work buys it.

The `shuffler-looks-like-itself` owner had argued resize should die, on the grounds that `CARD_W =
170` fixes the canvas coordinate system at 68 units/inch and every other dimension derives from it
("the playmat is 9.6 cards wide"). **That argument does not survive contact:** the playmat is 9.6
*default* cards wide, and one player-scaled creature doesn't falsify it. Recorded here so the
argument isn't re-run. The owner's other points stand — suppressing handles would have been
behaviour, not appearance, and a custom `indicator()` that looks like anything other than tldraw's
default is a **separate design decision** that must not ride along.

### Tap is +90° clockwise, relative to the card's own current angle

Convention, and delta rotation makes map 2's sideways playmats a non-question: a card at the far side
of the square turns clockwise *from where it sits*, which is what a player across the table would do
with their hand.

### Untapping many: click one card in a selection, and the whole selection follows

**Jess's gesture, prototyped and confirmed working.** Multi-select (marquee drag on empty canvas —
locked furniture underneath does not intercept it), then click any selected card. The clicked card's
**new** state propagates to every selected card. Click a tapped one and all untap; click an untapped
one and all tap. It **propagates the new state rather than toggling each**, so an already-tapped card
in the selection stays tapped instead of flipping the wrong way.

This needs no turn concept and no ownership concept — per ticket 02's symmetry principle there is no
"whose cards" to resolve.

**Why clicking works at all** (verified in `PointingShape.js` and empirically): because the util
defines `onClick`, a card is **not** selected on pointer-down (`didSelectOnEnter = false`); and on
pointer-up, if `onClick` returns a change, tldraw calls `markHistoryStoppingPoint('shape on click')`,
`updateShapes([change])`, and **returns early** — never reaching the selection logic. So the
selection survives. Returning `undefined` instead falls through and collapses the selection to the
clicked card.

**⚠️ The other cards must be written in a `queueMicrotask`, and this is load-bearing.** Measured:

| Approach | Result |
| --- | --- |
| Synchronous `updateShapes` inside `onClick` | Undo #1 reverted **only the clicked card**; undo #2 reverted the rest **welded onto an unrelated earlier tap**, and cleared the selection. The side-effect writes join the *previous* history entry. |
| `markHistoryStoppingPoint` + one combined write + `return undefined` | Selection **collapses** to the clicked card, and it costs **two** Ctrl+Z — the collapse itself consumes one press. |
| **`queueMicrotask` (chosen)** | One Ctrl+Z reverts **all** bulk-tapped cards, leaves the earlier unrelated tap alone, and **preserves the selection**. |

```ts
const selected = this.editor.getSelectedShapeIds();
if (selected.length > 1 && selected.includes(shape.id)) {
  const others = selected
    .filter((id) => id !== shape.id)
    .map((id) => this.editor.getShape(id))
    .filter((s) => !!s && s.type === 'mtg-card')
    .map((s) => rotateAboutCenter(s, rotation));
  // Deferred to a microtask ON PURPOSE: tldraw's PointingShape.onPointerUp calls
  // markHistoryStoppingPoint() and updateShapes([change]) AFTER onClick returns.
  // Writing the other cards synchronously lands them in the PREVIOUS history entry.
  if (others.length) queueMicrotask(() => this.editor.updateShapes(others));
}
return change;
```

(The prototype used today's `meta.instanceId` test; on `mtg-card` it becomes a type check.
`rotateAboutCenter` is the existing centre-preserving math lifted to a module-level helper.)

**This depends on an undocumented tldraw internal** — the mark → `updateShapes` → return ordering
inside `PointingShape.onPointerUp`. Jess accepted the dependency explicitly: *"Depending on the
internal with a regression test makes sense to me."* So **a Playwright undo regression test is part
of the implementation, not optional** — it is what catches a tldraw upgrade silently breaking the
grouping. The prototype demonstrated the test is writable.

**Undo is per-client in a synced room**, verified with two tabs: a client who has done nothing gets
nothing from Ctrl+Z, and one player's undo syncs to the others as an ordinary edit. Nobody can rewind
your board. (Undo generally remains map 4's; this is just the fact this ticket needed.)

### Constraints handed to [ticket 05](05-rotate-to-tap.md)

From the `animations` owner. A tap is one synced write, so there is nothing for CSS to interpolate —
the motion is a **local catch-up**: apply an inner counter-transform of ∓90° on the frame of the
change and transition it to 0. That is **not** the banned FLIP pattern (FLIP's forbidden part is
*measuring* an unknown delta; ±90° is a constant known from the state change) — it's the same
mechanism as the Shuffler's `.card-flipped`. Four constraints:

1. **Key the catch-up off `props.tapped` changing, not off a ±90 rotation delta.** A delta sniffer is
   reading tap back out of the angle again — this ticket's sin, relocated into the view layer. It
   misfires when a player free-rotates through 90°.
2. **Don't animate on first render.** Initialize the previous-value ref to the first-seen `tapped`,
   not `false`, or a card that arrives tapped swings on mount — and swings again on a store
   reconnect. Precedent: `3970e53`.
3. **Comment the coupling** between the centre-preserving x/y write and the transform origin. Frame 0
   is pixel-identical only because both hold the centre; deleting the `Vec.Rot` math "because tldraw
   handles rotation now" makes the first frame jump.
4. **Nothing on the path may clip.** Mid-swing the counter-rotated card extends outside its own
   `w × h` box; any `overflow: hidden` ancestor chops the animation.

Free bonus: because the trigger is a prop change, remote peers animate identically with no extra
work. Duration/easing are 05's, with the design owner — the Shuffler's vocabulary is 0.8s (flip
transition) and 0.5s (card motion); tap is a flip-like reorientation, not a translation. **No
duration or easing literal is decided here**, and the Tabletop still has no CSS source file
(`tabletop-css-tokens`), which blocks implementing 05 but not deciding it.
