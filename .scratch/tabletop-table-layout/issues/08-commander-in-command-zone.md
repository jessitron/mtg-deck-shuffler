# Place the commander in the command zone when the Tabletop loads

Mountain: tabletop-replaces-mural
Type: grilling
Status: resolved
Blocked by: 01

## Question

`TODO.md`'s `commander-in-command-zone` line: "When the Tabletop loads, have the
commander appear in the command zone. Also place a transparent version of the commander
in its spot, one that doesn't move when they play the commander." The ghost copy is the
interesting half — it marks *where the commander lives* so the zone still reads as the
commander's home once the real card is out on the table. Decide: how does the Tabletop
know which card is the commander (does this ride the existing card-arrival payload, or
need a new flag), and how is the ghost rendered (a second shape at reduced opacity? a
`meta` flag on the furniture?) so it survives the real commander moving in and out of
the zone.

Blocked by [Design command-zone geometry and redraw the player
area](01-command-zone-and-player-area.md) — there's no command zone shape to place
anything in yet.

## Comments

- 2026-08-08, Jess, surfaced while resolving ticket 01 (the command zone is its own area,
  separate from the library, so dragging a commander in and out of it needs its own rules):
  the Shuffler needs to send a **"Play commander" event**; the Tabletop receives it and
  creates a commander object — a card with a special property marking it as the commander.
  The Command Zone should light up (arm) only when **a commander card belonging to that
  player** is dragged over it — not any card, and not another player's commander. This is
  a partial answer to this ticket's open question ("how does the Tabletop know which card is
  the commander") — the ghost-copy half is still open. New scope for whoever resolves this:
  a Shuffler → Tabletop contract change (a new event, or a flag on an existing one) and an
  owner-aware arming rule, which is new territory — `tabletop-physics` ticket 02 gave `mtg-card`
  no owner/seat field at all, and ticket 03 gave `mtg-zone` a `zone` but no per-seat identity
  either. Consult `two-faced-cards` (card props/contract) and `tabletop-shape-mechanics`
  (arming/zone-detection hooks) before resolving.

## Answer

Resolved 2026-08-08 by grilling with Jess, after consulting `two-faced-cards-context` and
`tabletop-shape-mechanics-context`.

### `owner` is a new, first-class `mtg-card` prop — not a cosmetic-only workaround

Both owners flagged the same tension going in: ticket 02 (tabletop-physics) deliberately gave
`mtg-card` no owner/seat/controller field, for the fleet's symmetry principle ("everything one
player can do, any player can do"). They suggested a compromise — a card-side owner field used
*only* to compute a local, derived, cosmetic arming highlight, never synced, never gating
anything — mirroring how ticket 03 justified `seatId` on zones.

Jess went further: **owner is a real domain property of the card, not a derived rendering
detail.** *"Owner is a property of the card. It is a very important property. This is
first-class. It doesn't limit who can move it."* So `mtg-card.props` gains a real, schema'd,
synced `owner: string` (seatId) field — not a locally-computed value recreated per render. The
symmetry principle survives intact because the field grants no capability: any player can still
drag any card anywhere, exactly as before. It just makes "whose card is this" a fact the shape
itself carries, the same way `face`/`faceDown` are facts rather than gates. Filed as an addendum
on `tabletop-physics` [ticket 02](../../tabletop-physics/issues/02-what-a-card-is.md), since it
amends that map's closed decision.

### Commander identity: `isCommander` flag on `mtg-card`, not a dedicated event

Rejected the "dedicated 'Play commander' event" framing from Jess's own earlier comment on this
ticket, in favor of the simpler option once `owner` already exists as a card prop: `mtg-card`
gains `isCommander: boolean`, set when the card arrives via the ordinary card-arrival path —
symmetric with how `face`/`faceDown` are just more props on the same shape, not special-event
territory. No new Shuffler → Tabletop event kind, no `card.played.v1.json` contract churn beyond
adding the two fields (`owner`, `isCommander`) the same way `face`/`faceDown` were added in
ticket 02.

### Arming: local, derived, in the zone's `component()` — per ticket 03's established pattern

The Command Zone arms (visually highlights) only when the shape currently being dragged is an
`mtg-card` with `props.isCommander === true` and `props.owner === zone.props.seatId`. Follows
ticket 03's zone-arming mechanism exactly, since `mtg-zone` shapes stay `isLocked: true` and so
`onDragShapesOver`/`onDropShapesOver` are permanently unavailable (tldraw filters locked shapes
out before checking those hooks). Arming is computed reactively via `useValue` inside the zone's
own `component()`, watching whatever shape is currently translating — nothing written to the
synced store, no undo-trail noise, local-only (only the dragging player sees their own commander
light up the right zone, same as every other zone's armed highlight today).

### Ghost copy: a second, faded `mtg-card` shape, locked in the zone

The "home marker" that survives the real commander moving out onto the battlefield is a genuine
second `mtg-card` shape — same shape type, same rendering path as every other card — placed in
the Command Zone at creation time, `isLocked: true`, rendered at reduced opacity, non-interactive
(no drag, no tap). It shows the commander's front image and persists regardless of where the real
commander instance currently sits. Kept as a real shape rather than zone-drawn chrome so it
inherits card rendering for free (image, corner treatment, etc.) instead of duplicating that
logic inside `tableFurniture.ts`.

### Not decided here

Exactly how/when the ghost shape is created (on card arrival if `isCommander`, or on a later
first entry to the zone), and how it's told apart from the real commander shape for tldraw's own
selection/hit-testing (a `meta`/`props` flag most likely) — implementation detail for whoever
picks this ticket up to build, not a further design decision.
