# Make tap a state the card holds, not incidental geometry

Mountain: tabletop-replaces-mural
Type: grilling
Status: open
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
