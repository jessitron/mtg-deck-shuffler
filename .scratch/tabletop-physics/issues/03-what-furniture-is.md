# Decide what furniture is, and who owns zone membership

Mountain: tabletop-replaces-mural
Type: grilling
Status: open
Blocked by: 02

## Question

Jess, charting this map (2026-08-06): *"the furniture is custom (inheriting, whatever) shapes
too, so that they can recognize stuff."*

Today furniture is stock locked `geo` and `image` shapes tagged with `meta.zone`
(`tableFurniture.ts`), and zone membership is computed **card-side**: `onTranslateEnd` on the
card scans `editor.getCurrentPageShapes()` for anything with a `meta.zone` and tests
`Box.containsPoint`, first match wins. That was a deliberate choice — the
[zone-entry ticket](../../tabletop-card-shape/issues/01-zone-entry-events.md) picked it over
target-side hooks precisely because zones weren't custom shapes, and said giving them their own
`ShapeUtil` "felt like a bigger change than this ticket needed."

Decide:

- **Which furniture becomes a custom shape** — library, graveyard, exile, playmat, the Stack
  strip, the command zone, the seat name label. All of them, or only the ones that need to react?
- **Does the zone recognise the card, or does the card find the zone?** Target-side hooks
  (`onDragShapesOver`/`onDropShapesOver`) versus today's card-side scan. What does each buy —
  and does the library "changing appearance as a card comes over it" (map 3's parity item) force
  the target-side answer?
- **Overlap and precedence.** First-match-wins is currently an accident of shape order. With a
  command zone and a square layout coming, what should happen when zones overlap or a card's
  centre sits in two?
- **The Stack strip carries no `meta.zone` at all** (`ensureStackStripWidth` omits it), so
  dropping a card on the Stack detects nothing today. Is the Stack a zone like the others?
- **Locking and protection.** Furniture is protected only by `isLocked: true`, and the seat name
  label isn't locked, so a player can drag or delete it. What does a custom furniture shape do
  about that?
