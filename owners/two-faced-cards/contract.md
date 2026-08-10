# Two-Faced Cards — Contract component

How faces appear in the fleet's published language (`notes/DESIGN-event-contract-v0.md`,
JES-128). **Landed** (JES-129, `9e3ca60`): the JSON Schema lives at
`contracts/payloads/card.played.v1.json` — `card: { scryfallId, instanceId }` (both
uuid-format) with a required sibling `face: enum ["front","back"]`. The Spine
(`services/spine/`, Ruby) validates every ingested event against these schemas via
`lib/event_contract.rb` and fails loudly (422) on unknown name/version or a payload
that doesn't match.

## The rule

- **Identity is `card: { scryfallId, instanceId }`.** `scryfallId` is the definition
  (the exact printing, all faces); `instanceId` is *this particular card* in *this
  game* (opaque GUID minted by the Shuffler).
- **`face` is a sibling field, not part of the card reference.** Events about
  playing/revealing a card carry `face: "front" | "back"` beside `card`, because
  MDFCs are played as a chosen face. Events that don't reveal a face don't carry one.
  Its **meaning** shifts once the Tabletop can flip (ticket 02, 2026-08-07): from "which
  face the sender baked into the image" to "**which face is up on arrival**." Same schema,
  same enum — no version bump, because the field was never the picture.
- **`face` ranges over printed sides only** (decided 2026-08-07). The enum is exactly the
  card's physical faces, so `face: "back"` is unreachable for a one-faced card. It is NOT a
  "which side is up" bit, and it does NOT express concealment.
- **Concealment (face-down) is a second, orthogonal axis, and it is not in the contract
  yet.** A card can be face down *while* having a chosen `face` (a two-faced card can be
  played face down). No schema in `contracts/` carries it. When one does, it is a sibling
  concept to `face`, not a third value of it. The Tabletop's own model calls it
  `faceDown: boolean` (ticket 02) — use that name if it ever reaches the contract.
- Names and image URLs are derivable conveniences and do NOT belong in the
  contract's card reference. (The pre-Spine Shuffler→Tabletop scaffolding payload
  carries `imageUrl`/`cardName` for rendering without a Scryfall lookup — that is
  the scaffolding's business, explicitly not contract.)
- **That scaffolding freedom is what made unbaking the face free — until ticket 05
  promoted it into the schema.** `imageUrl` was replaced by `frontImageUrl` +
  `backImageUrl: string | null` in the arrival payload (ticket 02, 2026-08-07) so the
  Tabletop can flip client-side, and at the time it was zero contract churn because those
  fields were scaffolding, not contract. **cards-come-and-go ticket 05 (2026-08-09)
  changed that**: `frontImageUrl`, `backImageUrl`, and `cardName` are now real,
  validated properties in `contracts/payloads/card.played.v1.json` — `required`, not
  optional (`backImageUrl` is typed `["string","null"]` and is **required, never
  omitted**; `null` means no printed back exists, per watch point 17). They were
  promoted **in place** on v1, not via a `card.played.v2.json` — see the new exception
  below. Worth remembering as the general lesson, now with its boundary case attached:
  rendering conveniences kept off-schema can be reshaped at will; the moment ajv is
  asked to validate the whole body, "off-schema" stops being available, and promoting
  them into the schema is itself a contract change — just one this repo chose to make
  as an in-place edit rather than a version bump, for a stated, narrow reason (below).

- **Sleeve color is seat data and stays out of card events** (decided table-layout
  ticket 11, built ticket 17, both 2026-08-08). Optional `sleeveColor` (hex,
  `#rrggbb`) is on the `seat.joined` player data, and `cardBackImageUrl` is optional
  there — omitted when a sleeve is defined; `sleeveColor` wins if both arrive.
  **`card.played` was NOT revved** — held: the Tabletop bakes the sleeve into the
  `mtg-card` shape from *seat memory* at mint time; the sleeve never rides a card event.
  The schema exists now: `contracts/payloads/seat.joined.v1.json` carries both fields
  (six-hex-digit pattern on `sleeveColor`, the wins-over rule in the descriptions) —
  written in one session with the deck-name field, as predicted. The Tabletop's
  `seatJoined.ts` mirrors the pattern check and 400s a malformed sleeve.

## Contract validation gets real — cards-come-and-go ticket 05 (2026-08-09)

`.scratch/tabletop-cards-come-and-go/issues/05-contract-validation-gets-real.md`, landed. The
Tabletop's `cardArrival.ts`/`seatJoined.ts` now validate the **whole request body** for real,
via `apps/tabletop/src/server/contractValidation.ts` (ajv `Ajv2020`, loading schemas straight
out of `contracts/` at module load) — replacing the hand-rolled `if`-chain `validationError`
this KB had been citing since JES-128. That retirement, predicted in the ticket-02 entry below,
has now happened.

Two in-place schema edits landed as part of making that validation real, both using the
**same exception `envelope.v1` used** (recorded explicitly in the ticket file, not left to
read as a new default policy — "zero conforming producers/consumers exist yet" only holds
pre-Spine, while these two endpoints are the only senders/receivers in the world):

- **`card.played.v1.json`**: removed the `seat: integer` field (unused since `seat` lives on
  the envelope's `initiator.seatId` — it had been dead weight since JES-128's first cut).
  Promoted `frontImageUrl`/`backImageUrl`/`cardName` from off-schema scaffolding into real,
  `required` payload properties (see above). `zoneHint`'s enum is unchanged in this ticket
  (still `stack | battlefield | graveyard`; the `stack | battlefield` narrowing cards-come-and-go
  ticket 02 predicted is a `card.discarded` build-time change, not part of ticket 05).
- **`seat.joined.v1.json`**: removed `seatId`/`playerName` from the payload — both are now
  redundant with `envelope.initiator`, same rationale as `card.played`'s `seat` removal.
  `deckName`/`playmatImageUrl`/`cardBackImageUrl`/`sleeveColor` are unchanged.

**Flagged, not fixed — a note for ticket 10.** `seat.joined`'s future `commanders` array
(cards-come-and-go ticket 02's vocabulary decision, not yet implemented) is documented to carry
the same `cardName`/`frontImageUrl`/`backImageUrl` trio *off-schema*, mirroring what
`card.played` used to do before this ticket promoted its copy on-schema. Ticket 05 explicitly
did **not** resolve that asymmetry — it flagged it. Whoever builds ticket 10 (`commanders`)
needs to make an explicit call — contractize that trio the same way, or state a reason it stays
scaffolding on `seat.joined` specifically — rather than silently inheriting either default.

## The vocabulary grew — cards-come-and-go ticket 02 (2026-08-08, `7b7f868`, decisions only)

`.scratch/tabletop-cards-come-and-go/issues/02-event-vocabulary.md` § Answer named every
message for cards leaving the table, undo, and commanders at seating. No schemas written
yet — files to write/amend are listed in the ticket for build time. The face rules per kind:

| Kind | `face`? | Why |
|---|---|---|
| `card.played.v1` | yes | plays reveal a chosen face; `zoneHint` **narrows to `stack \| battlefield`** |
| `card.discarded.v1` (new, split from `card.played`) | yes | a discard shows the card publicly; payload `card`+`face`+`seat`, no `zoneHint` (graveyard *is* its meaning) |
| `card.returned.v1` (new, one kind for BOTH table exits) | **no** — and no `faceDown` | Jess: "cards removed from play no longer have a face up." The table is not authoritative for a card's face (physics ticket 06); the Shuffler keeps its own `currentFace`. `occurredIn: "tabletop"` (portal drag) vs `"shuffler"` (Return button et al.) distinguishes the exits; payload `card`+`seat`+optional `fromZone` (absent when `occurredIn:"shuffler"`) |
| `undo.card.played.v1` / `undo.card.discarded.v1` (new) | **no** | deletion neither reveals nor chooses a face; payload `card`+`seat`; undo kinds are named `undo.<full name of the event undone>` |
| `commanders` on `seat.joined.v1` (new optional array, 0–2 of `{ card: { scryfallId, instanceId } }`) | **no** | a commander always arrives in the command zone face up; flipping it there afterward is table-local. Scaffolding (`cardName`/`frontImageUrl`/`backImageUrl`) rides off-schema, with `backImageUrl` derived from `twoFaced` — never stored-URI presence — making this a second sender site bound by that watch point |

Also decided there, adjacent to this owner's territory:

- **`envelope.v1` is amended in place** (free exactly now — zero conforming producers or
  consumers exist): `tableId` drops `format: uuid` (pre-Spine, the table name IS the id),
  and `initiator` becomes the object `{ seatId?, playerName }`.
- **Contract validation gets real in this map** — decided here, **landed at ticket 05
  (2026-08-09)**: both Tabletop receivers load `contracts/` and validate on receipt via ajv,
  rejecting unknown name/version loudly. This retired the hand-rolled "JES-128" `if`-chains,
  including `apps/tabletop/src/server/cardArrival.ts`'s `validationError` — the "two edit
  sites" for payload changes are now one schema file plus one shared validator
  (`apps/tabletop/src/server/contractValidation.ts`). See the ticket-05 section above.
- **`seat.taken` vs `seat.joined` are two facts, not two names for one** — `seat.joined`
  (Shuffler→Tabletop: a seat's game connected, carrying how the player's stuff looks) vs
  `seat.taken` (Spine's own join flow). Documented, deliberately not unified; convergence
  is map-5 work.

## Watch points

- Changing `face`'s shape (or the card reference) in `contracts/payloads/card.played.v1.json`
  is a payload schemaVersion bump: add a new `card.played.v2.json` file, never edit v1
  in place — the Spine resolves schemas by `<name>.v<schemaVersion>.json` filename and
  old senders keep validating against v1. **The one standing exception**, used twice now
  (`envelope.v1`'s JES-128 amendment, and ticket 05's edits to `card.played.v1.json` +
  `seat.joined.v1.json`): while a schema has **zero conforming producers or consumers in
  the world**, editing it in place is free — there's nothing to break. The instant a real
  sender or receiver exists (the Spine's ingestion, most likely), this exception is gone
  and every future change is a version bump. Don't generalize from these two edits to "in-
  place edits are fine here" — they were fine *because* nothing depended on the old shape
  yet, a fact that stops being true the moment the Spine starts consuming these payloads.

- Adding a new card-referencing event kind? Ask "does this event reveal or choose a
  face?" If yes, `face` goes beside `card`, same shape as `card.played`. This rule now
  has worked precedent (ticket 02, see the vocabulary table above): `card.discarded`
  yes; `card.returned`, both `undo.*` kinds, and `seat.joined`'s `commanders` no.
- **Design the payload so it doesn't need to carry what it doesn't mean.** A shadow event
  ("seat 2 drew a card") shouldn't carry a face any more than it carries the card — not
  because a leak is dangerous, but because an event should say what happened and no more.

  This used to be phrased as a hard concealment rule, and **it has been softened
  deliberately** (2026-08-07):

  - **On the canvas, concealment is not enforced at all.** A face-down card keeps
    `scryfallId`, `cardName`, and both image URLs in its synced tldraw `props`. Guarding
    that would be theatre — any player can turn the card over. Principle in
    `notes/DESIGN-the-table-vision.md` § Principles: *"everything that can be done by one
    player is doable by any player"*; the Tabletop has no ownership or permission model.
    See [tabletop.md](tabletop.md).
  - **`gameCardIndex`: Jess reversed her own call.** It was forbidden in any payload as a
    decodable secret (alphabetical rank in a known decklist). She now wants it *out* —
    *"I don't want you to have to reason about what is hidden and what isn't."* Buoy
    `let-gamecardindex-out` in the repo-root `TODO.md`; the no-index unit test in
    `apps/shuffler/test/port-tabletop/` still exists and will go with it. **Don't cite the
    old rule as binding, and don't re-erect it.**

  What the guard was protecting still has a home, just one level up: SEAMAP's *"hand counts
  but never hands"* is about **what an event means** — the Spine's log says a card was
  drawn, not which card — so it constrains payload *design*, not a boundary check on every
  door.
