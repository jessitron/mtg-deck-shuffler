# Decide how a note attaches to a card, and how it differs from a counter

Mountain: tabletop-replaces-mural
Type: grilling
Status: resolved
Blocked by: 07

## Question

Jess's ramble: *"I need to be able to make little notes on post-its, and I need to be able to
attach those to cards, similar to counters. I can put whatever text I want on those, similar to
counters."*

She described notes twice by reference to counters, so the honest question is whether they're one
thing with two looks or two things. Resolve that first; the rest follows.

Decide:

- **Is a post-it a counter with text, or its own object?** If a counter can carry text (see
  [Counters that ride along](07-counters-that-ride-along.md)), the distinction may be purely
  visual — a circle versus a square of paper — and collapsing them is cheaper than maintaining two
  attachment mechanisms.
- **Does a note attached to a card die with the card**, the way counters do in the graveyard? A
  note saying "attacking with this" should probably go; a note saying "Sarah's, don't shuffle in"
  probably shouldn't. Is that a distinction worth building, or does one rule win?
- **Free-floating notes.** tldraw's stock note tool already exists and players can already use it
  — that's the Mural joy the ship's SEAMAP promises to keep. Does *that* note become this note
  when dragged onto a card, or is the attachable post-it a separate object from the freeform one?
  Whichever way, map 4 decides whether the stock note tool stays in the toolbar; say what this
  ticket needs from it.

## Comments

[Ticket 07](07-counters-that-ride-along.md)'s resolution (2026-08-07) surfaced a strong lean, not
a decision: Jess pictures the counter as a purpose-built attaching shape (`mtg-counter`) and the
note as tldraw's stock sticky note, and she's fine with the note *not* attaching to a card via
the same mechanism the counter uses. Start from that steer rather than re-opening "one thing or
two" from scratch.

## Answer

**A note is its own object — tldraw's stock note shape, never `mtg-counter`.** Confirmed, not
just leaned on: a post-it and a counter stay visually and structurally distinct types. No
"counter with a text-only variant that looks like a note."

**But it rides the card exactly like a counter does.** The card's drag-attach accept-list
(`canReceiveNewChildrenOfType`/`onDropShapesOver`, from ticket 07) is extended to accept the
stock `note` type alongside `mtg-counter` — dropping a note on a card parents it the same way a
counter does. "Separate object" was never "separate mechanism": Jess's first answer here treated
those as the same question, but they aren't — the shape *type* differs, the *attachment plumbing*
doesn't. Once parented, a note inherits the same battlefield-exit behavior ticket 07 gave
counters: leaving the battlefield (graveyard, exile, hand, library) detaches it and nudges it to
an open spot near the zone's edge. **One rule, no per-note distinction** — Jess did not want a
special case for notes like "Sarah's, don't shuffle in" that should survive a zone change; every
attached note detaches on exit, same as every counter. If a note needs to survive independent of
any card's lifecycle, the answer is: don't attach it — leave it free-floating.

**Free-floating and attached are the same shape, not two variants.** tldraw's stock note that
already exists on the canvas today *is* the attachable note — there's no separate purpose-built
"attachable post-it" type. Whether a note is "attached" or "free-floating" is purely a function
of whether it currently has a parent shape; dragging a free note onto a card parents it, dragging
it off unparents it. Nothing for map 4 to build here beyond leaving the stock note tool in the
toolbar (a decision map 4 already owns) and the card's accept-list extension above.
