# Two-Faced Cards — Contract component

How faces appear in the fleet's published language (`notes/DESIGN-event-contract-v0.md`,
JES-128; JSON Schema in `contracts/` when it lands).

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

- Adding a new card-referencing event kind? Ask "does this event reveal or choose a
  face?" If yes, `face` goes beside `card`, same shape as `card.played`.
- Never let a face leak *identity*: a shadow event ("seat 2 drew a card") must not
  carry face any more than it carries the card.
- `gameCardIndex` is forbidden in any payload — it is a decodable secret
  (alphabetical rank in a known decklist). The no-index unit test lives in
  `apps/shuffler/test/port-tabletop/`.
