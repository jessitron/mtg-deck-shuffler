# Decide how a card tucks behind another card

Mountain: tabletop-replaces-mural
Type: grilling
Status: open
Blocked by: 07

## Question

Jess's ramble: *"I need to be able to put cards behind cards."*

At a physical table this carries real meaning that the table itself doesn't interpret — an aura
or equipment tucked under its host, a pile of tokens, a card set aside under a permanent, a face-
down card under a face-up one. The Tabletop's job is to make the arrangement hold together when
the top card moves; deciding *what it means* is Mountain 3's.

Today there is no z-order handling at all beyond a monotonic `nextIndex(tableName)` that puts
each newly injected shape above the last, and graveyard/Stack "piles" are just cascading x/y
offsets.

Decide:

- **Is this the same attachment mechanism as counters** (blocked on that ticket for exactly this
  reason), or does a card behind a card need something different — most obviously because the
  attached thing is itself a full card that can be pulled out, tapped, and moved independently?
- **What moves together.** Dragging the front card takes the back one. Does dragging the back one
  detach it, or move the pair?
- **Ordering and depth.** Two cards behind one card — a stack, or a fan? Does the arrangement
  need to be visible enough to count?
- **Zone entry for the passengers.** Today zone detection tests a card's own centre. When a host
  card is dragged to the graveyard, do the cards behind it register as entering the graveyard too?
  That question lands on [what furniture is](03-what-furniture-is.md), and its answer is what map
  5 will have to report.
