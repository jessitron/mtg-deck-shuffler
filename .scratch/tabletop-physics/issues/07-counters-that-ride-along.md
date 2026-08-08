# Decide what a counter is, and how it rides a card

Mountain: tabletop-replaces-mural
Type: grilling
Status: resolved
Blocked by: 02

## Question

Jess's ramble, close to verbatim: *"I need to be able to add counters — little circles — and drag
them onto cards. When the counter lands on the card it groups itself with the card, so that when
you move the card the counter on the card moves too — unless you move it into the graveyard, in
which case they disappear."*

Nothing exists: zero hits for "counter" anywhere in `apps/tabletop/src`.

Decide:

- **What a counter is.** A custom shape of its own? A stock tldraw geo circle the card adopts? A
  prop on the card? Jess said "little circles," which is a look, not an implementation.
- **What "groups itself with the card" means mechanically.** tldraw has grouping, parenting, and
  binding, and they behave differently under a drag of the parent. (The
  [research ticket](01-tldraw-custom-shape-facts.md) establishes what each actually is in 5.2.5.)
- **Attaching and detaching.** Landing on a card attaches. What detaches — dragging it off?
  Does a counter dropped on a card that's already covered in counters find a free spot?
- **Do counters carry a number, or is a 3/3 buff three circles?** Physical play does both. Does a
  counter have text on it? (If so, how is it different from the post-it in
  [Notes on cards](08-notes-on-cards.md)?)
- **Death.** "They disappear" when the card hits the graveyard. Does that generalise to exile,
  back-to-library, back-to-hand — and is the rule "the counters die with the card" or "the
  counters die when the card leaves the battlefield"? Those differ, and the second one needs to
  know what the battlefield is.
- **Loose counters.** Are there counters that belong to a player rather than a card — poison,
  energy, experience? Those may be map 2's furniture problem instead; say which.

## Answer

Consulted the `tabletop-shape-mechanics` owner before grilling — see its findings folded into the
decisions below; full trace in the resolution comment.

- **A counter is a genuine custom shape type, `mtg-counter`.** Its own `ShapeUtil` registration,
  not a stock geo circle and not a prop on the card. Costs the three-place sync registration
  ticket 01 found, accepted for the flexibility (own click/edit behavior, own look).
- **Attach is card-hosted, via tldraw's native drag-and-drop**, not the counter self-checking on
  drag-settle. `mtg-card` implements `canReceiveNewChildrenOfType`/`onDropShapesOver`, which fires
  live during the drag and gives a free hover-highlight as a counter is dragged over a card. This
  is a deliberate, narrow exception to ticket 02's "the card knows nothing about its passengers" —
  worth the live feedback. Detach is the mirror: dragging a counter off the card's bounds
  reparents it back to the page wherever it's dropped.
- **No auto-spacing when a card already has counters.** Multiple counters on one card can overlap
  or stack in place, same as physical cardboard — the player nudges them apart if they care.
- **A counter carries free editable text, blank by default** — not a strict number field. Typing
  "+1/+1", "3", or anything else is all the same mechanism; click into the counter to edit it in
  place. Common presets (a pre-labeled "+1/+1" counter players can drop from stock) are a real
  future want but not built now — noted in the map's fog.
- **Counter vs. the note in [ticket 08](08-notes-on-cards.md): a counter is this purpose-built
  attaching shape; a note is tldraw's stock sticky note**, and it's fine if the stock note doesn't
  attach to a card via this same mechanism. This is a strong lean surfaced here, not a decision —
  ticket 08 still resolves it, but starts from this steer rather than from scratch.
- **Death generalizes uniformly: a counter detaches from its card the instant the card leaves the
  battlefield**, to any of graveyard, exile, hand, or library — one rule, no per-zone
  special-casing. Mechanically this can't be the counter watching for its own zone transition (the
  `tabletop-shape-mechanics` owner confirmed a parented shape's own `onTranslateEnd` never fires
  when only its parent moves) — it has to be driven from the card's own zone-transition code (the
  same `onTranslateEnd`/`zoneAt()` already computing the card's new zone) or a store-level side
  effect reacting to it. Which of those two is implementation, not decision.
- **On detach it doesn't just drop in place — it nudges to an open spot near the zone's edge.**
  Jess: *"if they could scoot themselves over to the edge of the furniture and hang around on the
  table, that would feel real."* This needs real open-spot-finding logic (and plausibly an
  animation), not a trivial reparent-and-done; the concrete placement/collision algorithm is
  implementation's job, not decided further here.
- **Player-level loose counters (poison, energy, experience) are out of scope for this ticket.**
  Jess: *"out of scope for now, I'll use a sticky note."* Not folded into `mtg-counter`, and not
  claimed by map 2 either — a real stand-in exists already, so nobody needs to build anything.
