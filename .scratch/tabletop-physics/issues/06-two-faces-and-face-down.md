# Decide how a card flips, and how it sits face-down

Mountain: tabletop-replaces-mural
Type: grilling
Status: open
Blocked by: 02

## Question

Jess's ramble: *"we have to be able to flip cards over."* Nothing on the table can change a
card's face today. `face` arrives in the card-arrival payload and is validated and then never
used, because the Shuffler bakes the chosen face into `imageUrl`
(`types.ts: getCardImageUrl(..., gameCard.currentFace)`). `cardBackImageUrl` exists but is only
used as the library furniture's background.

Two related things, and part of this ticket is deciding whether they're the same mechanism:

- **Flip an MDFC / transforming card** — turn it to its other face, both faces being real card
  faces the deck already knows about.
- **Turn a card face-down** — the back of the sleeve, no card identity shown. Note that
  *playing* a card face-down from the library is explicitly **out of parity** (Mural doesn't do
  it), but a card that's face-down for other reasons may still be needed. Decide whether it is.

Decide: does the card carry both face images and a "which side" state, or does it ask for a new
image on flip? Who is authoritative about a card's current face once it's on the table — the
Tabletop or the Shuffler, which has its own flip button and its own `currentFace`? What happens
when they disagree?

**Consult the `two-faced-cards` owner first.** It is fleet-scoped and explicitly names
`CardDefinition`/`CardFace` types, flip buttons, the Tabletop's card rendering, and the event
contract's card/face fields — all four are in this question. Do not design a parallel
Tabletop-side flip mechanism without going through it.
