# Decide how a card tucks behind another card

Mountain: tabletop-replaces-mural
Type: grilling
Status: resolved
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

## Answer

Consulted `tabletop-shape-mechanics` (mechanics of parenting a full card, as opposed to a counter)
and `two-faced-cards` (whether tuck interacts with face/faceDown) before grilling.

- **Same attachment mechanism as counters: card-hosted native drag-and-drop parenting.**
  `tabletop-shape-mechanics` confirmed tldraw draws no line between "circle child" and "card
  child" — plain parenting (not a group) leaves the passenger independently selectable, tappable,
  and draggable; dragging the host carries the passenger for free (page transform composition);
  dragging the passenger directly does *not* auto-detach it, same explicit
  `canReceiveNewChildrenOfType`/`onDropShapesOver`-attach, reparent-to-page-on-drag-off-detach
  dance ticket 07 already built for counters. Depth/stacking among multiple passengers on one host
  is free too — tldraw's sibling `index` renders them in a real nested stack, no fan-out logic
  needed.
- **Face/faceDown is orthogonal, confirmed by the `two-faced-cards` owner.** A tucked card keeps
  whatever `face`/`faceDown` state it already has. "Hidden under another card" is pure z-order —
  it is *not* a third kind of concealment alongside `faceDown`, and this ticket doesn't touch
  those props.
- **Rotation does not ride along — passengers stay visually upright regardless of the host's tap.**
  tldraw composes rotation through parenting unconditionally (tapping the host would otherwise
  visually tap every passenger too), and Jess rejected that: an aura tucked under a creature
  shouldn't visibly rotate just because the creature tapped. This needs an explicit counter-rotation
  compensation applied to each passenger at the moment the host's tap toggles — not free, unlike
  everything else in this decision — and the compensation has to be reconciled back to zero at
  detach time, or the passenger will visibly snap to a new angle the instant it's dragged off.
  Implementation's job to work out the exact mechanism (e.g. writing a compensating local
  `rotation` delta alongside the host's own tap-delta write); not decided further here.
- **The attach/z-order gesture is uniform across passenger types, not card-type-aware — because
  the Tabletop has no card-type prop to be aware with.** Dropping anything (counter, note, or
  another card) onto a host lands it wherever dropped — no snap-to-center, same as ticket 07 —
  and it defaults to the **front**, same as counters and notes. There is no special "cards tuck
  behind by default" rule: Jess considered and rejected that (enchantments that neuter a creature
  read as *on top*, not behind, and the physics layer can't tell an equipment from an enchantment
  to pick a default either way). **Getting something to read as tucked-under is an explicit
  "send backward" / "send to back" reorder command**, the same context-menu surface tap/flip/
  lock already use. Positioning is continuous and player-driven: the same drop-position + send-
  backward combination covers both a partial peek (equipment under a creature) and a fully solid
  cover (a card exiled face-down-under-another by an ability's more literal "put it under this
  card") — no separate mechanism for the more-solid case, the player just overlaps it fully and
  sends it back. The Tabletop draws no distinction; the table does.
- **A host leaving the battlefield auto-detaches every passenger, which stays behind on the
  battlefield, unattached — regardless of what kind of passenger it is or where the host went.**
  Unlike a counter, a passenger card doesn't vanish (it's a real card that has to keep existing
  somewhere) — it just stops being parented and sits wherever it was. Jess declined to route it
  automatically to a "correct" destination (equipment stays on the battlefield when its creature
  dies; an aura goes to the graveyard with its host; an exiled-by-ability card goes to its owner's
  exile) precisely because those destinations are rules knowledge the Tabletop doesn't have and
  shouldn't guess at: *"Let the players sort that out."* Same "physics, not meaning" posture as
  the rest of this map — mirrors ticket 07's counter-death rule, minus the disappearing.
- **Zone entry for passengers stays deferred, unchanged from the open question above** — it's
  [ticket 10](10-what-a-shape-knows.md)'s and map 5's question, not re-decided here.
