# 15 — Deck name travels to the table's name label

Mountain: tabletop-replaces-mural
Ship: fleet
Type: task
Status: done
Blocked by: None — can start immediately

**What to build:** The name label above a playmat shows the player's name *and* their
deck's name. The deck name is threaded from the Shuffler (it's in scope at both
seat-joined call sites) through the `SeatJoinedEvent` type into the Tabletop's
seat-joined validation and the label render.

This ticket also creates the **`seat.joined` contract schema** — none exists today
(only `seat.taken.v1`). Per [11 — sleeve transport](11-sleeve-color-to-card-back.md),
one schema session covers both fields: define the schema with the deck-name field
**and** an optional `sleeveColor` (hex string), with `cardBackImageUrl` optional.
Ticket 17 wires up the sleeve side; this ticket just gives it a home so the schema
lands once. Unknown name/version still fails loudly on both sides.

The Spine has no `seat.joined` handling yet — no Spine change.

Design source of truth: [06 — seat label deck name](06-seat-label-deck-name.md) (its
Answer lists the five threading spots).

Test at three seams: the Shuffler's port-tabletop unit tests (outbound payload carries
the deck name), the contract seam (valid/invalid payloads against the new schema, in
the established pattern), and the Tabletop server event-handler seam (label shape
carries player name + deck name).

- [x] New `seat.joined` contract schema exists with deck name, optional `sleeveColor`, optional `cardBackImageUrl`; both sides validate against it
- [x] Shuffler sends the deck name on seat-joined from both call sites
- [x] Tabletop name label shows player name and deck name above the playmat
- [x] Contract tests cover valid and invalid payloads; unknown name/version fails loudly
