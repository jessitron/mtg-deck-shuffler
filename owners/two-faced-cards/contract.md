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
- **That scaffolding freedom is what makes unbaking the face free.** `imageUrl` is being
  replaced by `frontImageUrl` + `backImageUrl: string | null` in the arrival payload
  (ticket 02, 2026-08-07) so the Tabletop can flip client-side — and because those fields
  are *scaffolding, not contract*, it is **zero contract churn**: two hand-edits, no
  `card.played.v2.json`. Worth remembering as the general lesson: rendering conveniences
  kept out of the contract can be reshaped at will; anything promoted into `contracts/`
  cannot.

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

## Watch points

- Changing `face`'s shape (or the card reference) in `contracts/payloads/card.played.v1.json`
  is a payload schemaVersion bump: add a new `card.played.v2.json` file, never edit v1
  in place — the Spine resolves schemas by `<name>.v<schemaVersion>.json` filename and
  old senders keep validating against v1.

- Adding a new card-referencing event kind? Ask "does this event reveal or choose a
  face?" If yes, `face` goes beside `card`, same shape as `card.played`.
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
