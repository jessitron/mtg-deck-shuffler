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
- Names and image URLs are derivable conveniences and do NOT belong in the
  contract's card reference. (The pre-Spine Shuffler→Tabletop scaffolding payload
  carries `imageUrl`/`cardName` for rendering without a Scryfall lookup — that is
  the scaffolding's business, explicitly not contract.)

## Watch points

- Changing `face`'s shape (or the card reference) in `contracts/payloads/card.played.v1.json`
  is a payload schemaVersion bump: add a new `card.played.v2.json` file, never edit v1
  in place — the Spine resolves schemas by `<name>.v<schemaVersion>.json` filename and
  old senders keep validating against v1.

- Adding a new card-referencing event kind? Ask "does this event reveal or choose a
  face?" If yes, `face` goes beside `card`, same shape as `card.played`.
- Never let a face leak *identity*: a shadow event ("seat 2 drew a card") must not
  carry face any more than it carries the card.
- `gameCardIndex` is forbidden in any payload — it is a decodable secret
  (alphabetical rank in a known decklist). The no-index unit test lives in
  `apps/shuffler/test/port-tabletop/`.
