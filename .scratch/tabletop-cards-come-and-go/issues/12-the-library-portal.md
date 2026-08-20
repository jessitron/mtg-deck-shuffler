# 12 — The library portal (Vortex · inhale)

Mountain: tabletop-replaces-mural
Ship: fleet
Status: ready-for-agent

**What to build:** The full portal gesture, rebuilt properly at implementation time (not
merged from `prototype/portal-gesture-ticket-04`, kept for reference only):

- **Arming:** while a card drags over a library, pointer-keyed, gated to card shapes only
  (a dragged counter must not threaten a swallow) and to the player's **own** library
  (shares the `owner` card-prop gate from table-layout ticket 18 — the return channel lands
  the card in the owner's Reveal zone, so a foreign card has nowhere to go; the gesture may
  build behind the gate's absence but must not ship un-gated). A rotating two-color
  pink/amber conic-gradient swirl with a faint dark veil renders over the library, local to
  the dragger, in viewport space via the in-front-of-canvas layer (the opaque library image
  sits on top of the zone shape itself).
- **Swallow:** on drop, the card spins twice while shrinking and fading into the library's
  center over ~500ms, then leaves the table — a store write everyone at the table sees.
  Pointer-keyed: the pointer's position at drop decides the destination, for a single card
  and for a multi-selection alike (the whole group swallows together).
- Send-then-commit: the swallow animation may play, but the shape's deletion commits only
  on the Shuffler's 2xx from the inbox; on failure the shape visibly stays.
- Anything attached to the card (counters, tokens) falls off and stays on the table —
  invoke whatever the Physics map (`.scratch/tabletop-physics/`) already built for
  graveyard/exile entry rather than re-deriving the rule.
- Mechanics constraints from the prototype: the translate-end hook fires once per moving
  shape in a multi-select and tldraw non-null-asserts each shape during settle, so the hook
  must never synchronously delete a sibling moving shape, and should defer even
  self-deletion past settle; the shrink needs the ShapeUtil's interpolation hook since
  tldraw's shape animation only interpolates x/y/rotation/opacity natively.

**Blocked by:** 11 (superseded — see that ticket; the Revealed-landing must exist via the
Shuffler's Spine SSE subscriber for the swallow to send anywhere). Externally blocked from
shipping un-gated by `tabletop-table-layout` ticket 18's `owner` card prop (in flight) —
the gesture may be built ahead of it but must not ship without the gate.

- [ ] Arming swirl renders over a library while a card shape drags over it, local to the
      dragger, gated to card shapes and to the player's own library
- [ ] Drop plays the spin-and-shrink swallow (~500ms), visible to everyone at the table
- [ ] Swallow POSTs `card.returned.v1` (`occurredIn: "tabletop"`) to the Spine's
      `POST /tables/:tableId/events`, best-effort — the send never blocks the swallow
- [ ] Attachments fall off and remain on the table on swallow (via the Physics map's
      existing mechanism)
- [ ] Multi-select dropped on the library swallows the whole group, one gesture
- [ ] The gate against foreign libraries is wired to table-layout ticket 18's `owner` prop
      before this ships un-gated
- [ ] Playwright: drag a card onto your own library, see it arm then swallow, and see it
      land in the Shuffler's Reveal zone; multi-select smoke; foreign-library gate smoke
