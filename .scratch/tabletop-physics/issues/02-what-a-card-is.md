# Decide what a card is

Mountain: tabletop-replaces-mural
Type: grilling
Status: open
Blocked by: 01

## Question

The root decision of this map. Today a card is a stock tldraw `image` shape whose behaviour is
overridden by `MtgCardImageShapeUtil extends ImageShapeUtil`, and whose card-ness is a single
`meta.instanceId`. Everything the parity list wants from a card — flip, face-down, counters and
notes that travel with it, tucking behind another card, tap that survives the handles — is
either awkward or impossible on that footing.

Decide:

- **Custom shape type, or keep extending `ImageShapeUtil`?** If custom: what is the type called,
  and does it render the card image itself?
- **What lives in `props`** (schema'd, validated, migratable) **versus `meta`** (freeform)? Today
  `instanceId`, `scryfallId`, `cardName`, and `zone` are all `meta`. Which of those are really
  identity, which are state, and which are cache?
- **What state does a card carry?** Tapped. Face (which side is up). Face-down or not. What
  counters and notes are attached. What it's tucked behind. Is each of these a card prop, or a
  relationship between shapes?
- **Migration and blast radius.** `cardArrival.ts` creates cards, `cardLayout.ts` positions them,
  `MtgCardImageShapeUtil` behaves them, and the zone-entry Playwright test asserts on them. What
  changes, and does anything need to keep working during the change? (Note: nothing is persisted
  today, so there are no old boards to migrate — this is the cheapest this decision will ever be.)
- **The Shuffler's assumption.** Card arrival posts `imageUrl` with the face already baked in
  (`types.ts` calls `getCardImageUrl(..., currentFace)`), and `face` is validated then ignored.
  If a card is going to flip on the table, that assumption has to change or be worked around.
  Consult the `two-faced-cards` owner — this is squarely its territory.
