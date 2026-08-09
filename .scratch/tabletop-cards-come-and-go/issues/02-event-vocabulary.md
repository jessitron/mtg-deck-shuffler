# The event vocabulary for cards that come and go

Mountain: tabletop-replaces-mural
Ship: fleet
Type: grilling
Status: needs-triage
Blocked by: 01

## Question

Name and shape every message this map mints, conforming to the `contracts/` envelope
(`name.vN`, validated payload) per the map's transport decision. Invoke
`/domain-modeling` — this is vocabulary work, not a field list.

The messages:

- **Card returns to the Shuffler** (Tabletop→Shuffler, the new direction from
  [ticket 01](01-return-channel.md)): a card dropped into the library portal, landing in
  the Reveal zone. What's it called — `card.returned`? What identifies the card
  (instanceId? see [ticket 03](03-round-trip-identity.md))?
- **Undo: play / undo: discard** (Shuffler→Tabletop): decided at charting to be their own
  event kinds — informational, distinct from the opposite action. The table poofs the
  card; attachments stay, detached. Name them.
- **Shuffler-initiated table exits** (Shuffler→Tabletop, added 2026-08-08 from ticket
  03's finding): the card modal's **Return** button already moves Table→Revealed today,
  pushing nothing to the table. Decided: it has the same table effect as the portal drag
  — poof, stuff falls off. Decide whether this and the undo events are one generic
  "card left the table" removal message or distinct kinds (undo was decided to be
  informational, so the distinction may be real). The sibling put-in-hand/top/bottom
  routes can also move Table cards via crafted requests — cover or close that hole.
- **Commanders at seating** (Shuffler→Tabletop): commanders start in the command zone as
  part of sitting down. Charting leaned toward the commander info riding **inside** the
  initial seating message (setup, not card traffic) rather than a separate "place in
  command zone" message — confirm and shape the payload. Converges with the
  table-layout map's seat-schema work (its tickets 06 and 11 both extend `seat.joined`,
  and no `seat.joined` schema exists in `contracts/` yet — only `seat.taken.v1.json`).

Also decide: does the existing sloppy trio get cleaned up in this map or explicitly left
for map 5? Today the Shuffler sends `seat.joined` while the contract file is named
`seat.taken.v1`, both TS validators are hand-rolled `if` chains against a different shape
than the schemas describe, and no code on either side loads `contracts/`. Minting new
conformant messages next to unvalidated old ones is coherent only if it's a recorded
choice.
