# Curate the card's menus — kill crop, add rotate, flip MDFC

Mountain: tabletop-replaces-mural
Type: grilling
Status: open

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
it](02-rotate-to-tap.md) but is a separate decision (menu surface, not motion). Don't
build the shape for this — it already exists.

Unblocked: the custom `ShapeUtil` this needs already exists ([Tabletop cards report zone
entry as named events](../../tabletop-card-shape/issues/01-zone-entry-events.md)).
