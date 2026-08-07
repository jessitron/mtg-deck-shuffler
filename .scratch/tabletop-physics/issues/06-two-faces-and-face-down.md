# Decide how a card flips, and how it sits face-down

Mountain: tabletop-replaces-mural
Type: grilling
Status: claimed
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

**Ticket 02 answered most of this — read [its Answer](02-what-a-card-is.md) before starting.**
Settled there, don't re-litigate:

- The card **carries both images and a "which side" state**; it does not ask for a new image on
  flip. `frontImageUrl` + `backImageUrl | null` in `props`, and the per-instance tldraw asset is
  gone, so flip is a pure prop change.
- **Two independent axes**: `face: 'front' | 'back'` (which *printed* side, unreachable as `'back'`
  when `backImageUrl` is null) and `faceDown: boolean` (concealment, renders the *table's* card
  back — not a card property, because sleeves are coming). A two-faced card can't be *turned* face
  down but can be *played* face down.
- **Turning over a one-faced card sets `faceDown`, not `face`** — and any card can be turned over
  on the Tabletop, unlike in the Shuffler.
- **Face-down is depicted, not enforced.** Identity stays readable in `props`; don't build
  concealment, and don't gate the gesture on who controls the card — there is no privileged actor
  (`notes/DESIGN-the-table-vision.md` § Principles).

What's left for this ticket:

- **The trigger.** `onClick` is spoken for by tap (ticket 04), so flip and turn-over each need a
  different gesture. Context menu? A hover affordance? Two separate actions or one "turn over" that
  does the right thing per card? Note the menu-curation work is map 4, so decide the gesture here
  and let that map place it.
- **Authority over `currentFace`.** The Shuffler keeps `currentFace` on a card whose location is
  `{type:"Table"}` — persisted, shown in card modals, used by copy-to-clipboard. The
  `two-faced-cards` owner flagged the concrete failure: discard *keeps* `currentFace`, so a
  table-flipped card sent to the graveyard shows the **pre-flip** face on the Shuffler's screen.
  Decide explicitly: either the table is authoritative for Table-zone cards and the Shuffler stops
  trusting its own copy, or flip-on-table is table-local and the divergence is accepted knowingly.
  Don't leave it undecided.
- **Whether `faceDown` needs anything visual beyond swapping the image** — consult
  `shuffler-looks-like-itself`. And note the sleeve picker
  (`.scratch/tabletop-table-layout/issues/09-sleeve-and-playmat-picker.md`) shares this asset.

**Consult the `two-faced-cards` owner first.** It is fleet-scoped and explicitly names
`CardDefinition`/`CardFace` types, flip buttons, the Tabletop's card rendering, and the event
contract's card/face fields — all four are in this question. Do not design a parallel
Tabletop-side flip mechanism without going through it.
