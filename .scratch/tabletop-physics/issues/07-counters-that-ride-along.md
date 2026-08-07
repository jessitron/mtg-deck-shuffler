# Decide what a counter is, and how it rides a card

Mountain: tabletop-replaces-mural
Type: grilling
Status: open
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
