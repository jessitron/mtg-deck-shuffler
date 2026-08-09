# The event vocabulary for cards that come and go

Mountain: tabletop-replaces-mural
Ship: fleet
Type: grilling
Status: resolved
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

## Answer

Grilled with Jess, 2026-08-08. The two-faced-cards owner was consulted before payload
shaping (its constraints are woven in below). The whole vocabulary:

### Envelope amendments (`envelope.v1`, amended in place)

Amending in place is free exactly now — zero conforming producers or consumers exist —
and never again after this map ships.

- **`tableId` drops `format: uuid`.** Pre-Spine, **the table name is the id** — one
  value, both roles, 1-1 mapping (Jess). When the Spine later mints UUIDs, that's a
  lookup change, not a vocabulary change. Description rewritten to say so.
- **`initiator` becomes the object `{ seatId?, playerName }`**, matching what the fleet
  already speaks (`buildCardPlayedEvent` et al.). `seatId` optional: a spectator has
  none; the Interpreter's identity is a later question. "When the unpublished dialect
  is strictly more expressive, publish the dialect."

### New event kinds

- **`card.returned.v1` — one kind for both table exits**, distinguished by the
  envelope's `occurredIn`:
  - `occurredIn: "tabletop"` — the library portal swallowed it; the Shuffler receives
    it on the event inbox (ticket 01's `eventsUrl`) and moves the card to **Revealed**.
  - `occurredIn: "shuffler"` — the card modal's Return button (or the sibling
    put-in-hand/top/bottom routes reached by crafted request — any transition out of
    the `Table` location) ; the Tabletop receives it and poofs the shape — attachments
    stay, detached.
  - Same fact, same payload, same schema file; direction of travel is transport, not
    meaning. Jess's framing: "return to Shuffler" is what the player did, so one kind
    is honest even though tabletop-initiated and shuffler-initiated exits may someday
    interest the Interpreter differently — which is what `occurredIn` and `fromZone`
    record.
  - **Payload**: `card: { scryfallId, instanceId }` (required), `seat: 1-4` (required),
    `fromZone` (optional — table geography, `zoneHitTest.ts` at the card's pre-drag
    position makes this cheap; **absent** when `occurredIn: "shuffler"` because the
    Shuffler honestly doesn't know table geography).
  - **No `face` field** (Jess, resolving the standing must-decide from
    `.scratch/tabletop-physics/issues/06-two-faces-and-face-down.md`): "cards removed
    from play no longer have a face up." The Shuffler keeps its own `currentFace`;
    **the table is NOT authoritative for a table card's face**. Known accepted
    consequence once table-flip lands: a table-flipped card returns showing the
    Shuffler's remembered face. No `faceDown` either — returning to the Shuffler is
    not a reveal because there is nothing face-up to reveal.
- **`card.discarded.v1` — discard splits out of `card.played`.** Today discard rides
  `card.played` with `zoneHint: "graveyard"`. Jess: the Shuffler barely feels the
  difference, the Tabletop routes on it, and someday the Interpreter will find the two
  very, very different. Payload: `card`, `face`, `seat` — like `card.played` minus
  `zoneHint` (graveyard *is* its meaning; keeps `face` because a discard shows the
  card publicly). Consequence: **`card.played.v1`'s `zoneHint` enum narrows to
  `stack | battlefield`**.
- **`undo.card.played.v1` / `undo.card.discarded.v1`** — undo events are named by
  prefixing `undo.` to the **full name of the event being undone** (Jess's principle:
  "adding undo shouldn't remove information"). Two kinds, as charting decided — and
  now each names an event that actually exists in the log, which only works because
  `card.discarded` became its own kind. Payload: `card` + `seat`. Tabletop effect for
  both: poof; attachments stay, detached (per the charting decision).

### Schema growth: `seat.joined.v1`

Gains optional **`commanders`** — an array of 0–2 entries, each
`{ card: { scryfallId, instanceId } }` — alongside ticket 01's `gameUrl`/`eventsUrl`
(fourth convergent extension with table-layout's `deckName`/`sleeveColor`).
Commanders are ordinary `GameCard`s in the `CommandZone` location (`GameState.ts:118`)
with real instanceIds. **No `face` per commander** (Jess): a commander always arrives
in the command zone face up; flipping it there afterward is table-local ("it isn't in
play, people can do what they want"). On the pre-Spine wire the scaffolding fields
ride along off-schema (`cardName`, `frontImageUrl`, `backImageUrl`) — with the owner's
sharp edge honored: `backImageUrl` derived from `twoFaced`
(`card.twoFaced ? getCardImageUrl(card, "normal", "back") : null`), never from
stored-URI presence, same test treatment as `cardPlayedEvent.test.ts`.

### Validation gets real (this map, not map 5)

Everything this map touches loads `contracts/` and validates on receipt: the
Shuffler's new event inbox from day one, and the Tabletop's card-arrival/seat-joined
handlers converted while their payloads churn anyway (`card.discarded`, `commanders`).
Unknown name/version rejected loudly (ticket 01). This retires the hand-rolled
"JES-128" `if`-chains (`apps/tabletop/src/server/cardArrival.ts:44`) and makes the TS
side symmetric with the Spine's Ruby-side validation. Removal handlers read
`props.instanceId` (not `meta.instanceId`) per the owner.

### `seat.taken` vs `seat.joined`: two facts, not two names

Not a divergence to unify — **two different facts from two different flows** that
share fields. `seat.joined` (Shuffler→Tabletop, the only fact live on this boundary):
a seat's game connected, carrying how the player's stuff looks. `seat.taken` (Spine
context, never crosses the Shuffler↔Tabletop boundary): someone sat down via the
Spine's own join endpoint, which mints the seatId and appends to the log
(`services/spine/app/models/table.rb:44`). This map documents the distinction in
`contracts/README.md` and the glossary; whether they ever converge is map-5 work with
real traffic to inform it.

### Left for the spec (implementation notes, not decisions)

- Schema files to write/amend at build time: `envelope.v1` (two amendments),
  `card.returned.v1`, `card.discarded.v1`, `undo.card.played.v1`,
  `undo.card.discarded.v1`, `seat.joined.v1` (+`commanders`, +ticket 01's URLs),
  `card.played.v1` (narrow `zoneHint`).
- The glossary's Command Zone entry was stale ("commanders are stored separately from
  game cards; they are not moved" — they're GameCards with a `CommandZoneLocation`);
  fixed in this resolution.

## Comments

2026-08-08 (claude, on resolving ticket 01): This ticket is now unblocked. The channel is
a **generic event inbox** per game (`eventsUrl`, handed out in `seat.joined`), so this
ticket is purely vocabulary. Facts to reconcile deliberately (details in
[ticket 01's answer](01-return-channel.md)): live wire traffic already diverges from
`contracts/payloads/` (`seat.joined` vs `seat.taken`, initiator object vs string, envelope
requires a Spine `tableId` nobody has — the table name is the key for now); the inbox
handler must look up cards by `instanceId` (no such inbound path exists yet); TS-side
contract validation is hand-rolled everywhere ("JES-128" TODO) — decide whether the new
inbox makes it real or stays consistent.
