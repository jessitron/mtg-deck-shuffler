# Decide how a card flips, and how it sits face-down

Mountain: tabletop-replaces-mural
Type: grilling
Status: resolved
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

## Answer

**Trigger: two separate context-menu items, not one combined gesture.** "Flip" and "Turn face
down" each live in tldraw's right-click/long-press context menu — the same surface furniture's
Lock/Unlock already uses — rather than a hover affordance or a keyboard-modifier click. Each item
is shown/enabled based on the card's own state (no "Flip" entry on a one-faced card, since
`backImageUrl` is null and `face:'back'` is unreachable per ticket 02). Jess: two separate
actions, surfaced as menu items.

**`currentFace` authority: the divergence is accepted, table-local.** The `two-faced-cards` owner
confirmed there is no Spine→Shuffler inbound path today for *anything* — the Shuffler only ever
sends `card.played`; nothing consumes events back into `GameState`. "Table becomes authoritative"
would mean building that channel for the first time (a new `card.flipped`-shaped event with an
explicit axis discriminator, per `contract.md`'s rule, plus the Shuffler's first-ever inbound
listener) — real new infrastructure, not a small add. Jess chose to accept the known divergence
instead: flip-on-table stays table-local, and a table-flipped Table-zone card that's later
discarded may show its pre-flip face on the Shuffler's screen/clipboard. Known, not a bug to fix
here.

**`faceDown` visual: plain image swap, no extra treatment.** Confirmed against the
`shuffler-looks-like-itself` owner: the Shuffler's own library furniture already renders "face-down"
as nothing but `<img src=CARD_BACK>` with the card's normal round-corner/shadow treatment — no
border, dimming, or badge exists anywhere in the fleet for concealment. Land the same: `faceDown`
swaps to the table's generic card-back image (`cardBackImageUrl`, the same asset the sleeve
picker will use for "no sleeve chosen") and nothing else. If a distinct "concealed from you
specifically" cue is ever wanted, that's a new choice for a future ticket, not implied here.

**Leaving the table resets both axes.** A card returning to hand or library goes back to
`face:'front'`, `faceDown:false` — its regular face-up state — regardless of how it was sitting
on the table. Jess: *"if a card goes back to the hand or library, it goes to its regular face-up
again. This is desired."* Matches the Shuffler's own `mulligan()`, which already resets
`currentFace` to `"front"` when a card returns to the library. Which mechanism performs the reset
(the zone-entry detection from
[Tabletop cards report zone entry as named events](../tabletop-card-shape/issues/01-zone-entry-events.md),
now keyed on `type === 'mtg-zone'` per ticket 03) is an implementation detail for whoever builds
this, not a further decision — the target state is unambiguous.

**The wire question is settled: `card.returned` carries no face** (2026-08-08,
[cards-come-and-go ticket 02](../../tabletop-cards-come-and-go/issues/02-event-vocabulary.md)).
Jess: "cards removed from play no longer have a face up." The table is **not** authoritative
for a card's face; the Shuffler keeps its own `currentFace`, and no `face`/`faceDown` field
rides the return event. This composes with the reset rule above: the table resets its axes
locally on exit, the Shuffler applies its own face rules on arrival, and the wire says nothing.
