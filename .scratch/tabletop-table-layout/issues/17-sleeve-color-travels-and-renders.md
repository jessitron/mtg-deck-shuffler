# 17 — Sleeve color travels and renders on the cards

Mountain: tabletop-replaces-mural
Ship: fleet
Type: task
Status: done
Blocked by: 15 — deck name to the table (the `seat.joined` schema, which already carries the optional `sleeveColor` field); 16 — prep-screen picker v1 (a chosen color to send)

**What to build:** A player's picked sleeve color makes their cards recognizably theirs
on the shared board. The Shuffler sends `sleeveColor` (hex string) in `seat.joined`,
omitting `cardBackImageUrl` when a sleeve is defined (if both arrive, `sleeveColor`
wins). At card arrival the Tabletop server looks up the seat's sleeve and **bakes the
color into the `mtg-card` shape's props at mint time** — sleeve color is a game
constant, chosen before the game and never changed mid-game, which is what makes baking
legal. Face-down cards and the library pile render as a solid sleeve-colored rectangle
slightly larger than the card; a face-up sleeved card renders the card image centered
inside that rectangle (the IRL sleeve-border look). Unsleeved seats keep today's look:
bare image face-up, standard Magic back face-down.

Exact margin, corner radius, and any border/sheen are appearance choices to make at
implementation time with the `shuffler-looks-like-itself` owner.

No `card.played` revision — sleeve is seat data. Redeploy fragility (seat memory wiped →
later cards arrive sleeveless) is accepted, same as playmat and deck name.

Design source of truth: [11 — sleeve color to card back](11-sleeve-color-to-card-back.md).

Test at the Shuffler's port-tabletop unit tests (`sleeveColor` present, `cardBackImageUrl`
omitted; and their absence for an unsleeved seat) and the Tabletop server event-handler
seam (sleeve baked into minted card props; library/face-down/face-up shapes carry it).

Consult owners: `shuffler-looks-like-itself` (sleeve appearance), `two-faced-cards`
(card props and rendering paths).

- [x] `seat.joined` from the Shuffler carries `sleeveColor` when picked and omits `cardBackImageUrl` then
- [x] Tabletop bakes the seat's sleeve color into `mtg-card` props at mint time
- [x] Face-down cards and the library pile render as the solid sleeve color — implemented as image-inset-within-card-footprint rather than a larger shape (owner-blessed inversion; shape growth would break layout/hit-testing)
- [x] Face-up sleeved cards show the image centered in a sleeve-colored frame
- [x] A seat with no sleeve keeps the standard Magic card back (library pile) and bare face-up image — unsleeved *faceDown* card back deferred to tabletop-physics ticket 06 with the gesture; nothing sets faceDown yet
- [x] If both `sleeveColor` and `cardBackImageUrl` arrive, `sleeveColor` wins (enforced on both ships)

Done 2026-08-08 (commits 0a768e6, bfdc877; plan-17.md; screenshots verify-17-*.png).
The Shuffler sends `prep.sleeveColor` — ticket 16's picker writes that field.
