# Curate the card's menus — kill crop, add rotate, flip MDFC

Mountain: tabletop-replaces-mural
Type: grilling
Status: parked — belongs to map 4, Only Magic moves (not charted). See `README.md` in this directory.

## Question

`TODO.md`'s `no-doubleclick-crop` line. Double-clicking a card on the Tabletop brings up
tldraw's default cropping UI, which is useless here; the popup menu also carries "crop"
and "download," neither of which apply to a Magic card. What should replace them: drop
the double-click gesture and the crop/download menu items, keep "alt" and "replace
media," add rotate — and what does *flip MDFC* look like from this same surface? MDFC
touches the `two-faced-cards` owner's territory (`CardDefinition`/`CardFace` types,
existing flip-button precedent in the Shuffler) — consult it before designing the
Tabletop-side flip rather than inventing a parallel mechanism.

Cosmetic; rides on the same `ShapeUtil` as [Rotate a card 90° to tap
it](../../tabletop-physics/issues/05-rotate-to-tap.md) but is a separate decision (menu
surface, not motion).

**Parked 2026-08-06.** Two caveats for whoever charts map 4 and picks this up: the *flip MDFC*
half of this question has moved to map 1 as [Decide how a card flips, and how it sits
face-down](../../tabletop-physics/issues/06-two-faces-and-face-down.md), so what's left here is
the menu surface. And this ticket's old "don't build the shape, it already exists" note is now
misleading — map 1 is deciding what the shape *is*, so wait for it.
