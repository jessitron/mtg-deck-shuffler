# Tabletop cards report zone entry as named events

Mountain: tabletop-replaces-mural
Status: ready-for-human

## Context

Was `tabletop-card-shape` in the repo-root `TODO.md` (← mountain: tabletop-replaces-mural
← was: JES-149). Triaged 2026-08-06.

> "card was dragged into the graveyard" / "card was dragged from here to here" are essential
> game events — not cosmetic, core to whether this architecture works at all.

**Redundancy check (2026-08-06):** the Tabletop already has a custom card `ShapeUtil` —
`MtgCardImageShapeUtil`, extending tldraw's `ImageShapeUtil`, registered in `TablePage.tsx`'s
`shapeUtils` array. It landed for JES-144 (tap/untap on click) and currently overrides only
`onClick`. So the TODO.md line's own rationale ("no `shapeUtils` registered, so no hook
fires") is stale — the shape exists, but nothing on it observes drag/drop yet. Grepped the
whole `apps/tabletop/src` tree for `onDragShapesOver`, `onDropShapesOver`, `onTranslateEnd`,
and any zone-entry-event concept: zero hits. `zoneHint` on `cardArrival.ts` only describes
where a card lands on *arrival* from the Shuffler — nothing observes a card moving between
zones once it's on the live board. Confirmed genuinely unbuilt, not a duplicate.

This is the prerequisite three other inbox lines are blocked on: `no-doubleclick-crop`,
`animate-tap` (cosmetic/rotation, don't build the shape for those — this ticket already
provides it), and `tabletop-survives-restart` (which needs named domain events, not raw
tldraw sync diffs, to log to the Spine).

## Agent Brief

**Category:** enhancement
**Summary:** When a player drags a card into a zone (graveyard, exile, library, command
zone, or off a playmat) on the Tabletop, the system should know which zone it entered and be
able to name that as a domain event — not just a raw position change.

**Current behavior:**
Cards on the Tabletop are tldraw `image` shapes, extended by `MtgCardImageShapeUtil` for
tap/untap. Zones (library, graveyard, exile, command zone, playmat) are separate stock
tldraw shapes drawn as furniture (`tableFurniture.ts`) with known bounds. Nothing on the
card shape or the room observes a card being dragged into or out of a zone's bounds — the
only record of card movement is the raw tldraw sync protocol diff, which has no notion of
"zone" at all.

**Desired behavior:**
Dragging a card such that it comes to rest inside a zone's bounds should be detectable as
a distinct occurrence: "this card instance entered this zone," carrying at minimum the
card's `instanceId` and the zone it entered (by the same identifiers `tableFurniture.ts`
already uses for zones — library/graveyard/exile/command zone/playmat). This should fire
once per meaningful zone change (entering a new zone), not on every intermediate drag
position. A card being dropped back into the zone it's already in, or moved within a zone,
should not re-fire the event.

This ticket produces the *detection and naming* of the occurrence inside the Tabletop
client. It does not need to send anything to the Spine or persist anything — that's
`tabletop-survives-restart`'s job, and it explicitly waits on this ticket existing first.

**Descoped 2026-08-06 (Jess):** don't design a callback/emitter/queue for downstream
consumers yet — that's speculative until something actually needs to consume it. For now,
a detected zone entry should just `console.log` (or the server-side `log.ts`, whichever
fits where the hook runs) the card instance and the zone it entered. The value of this
ticket right now is proving the detection logic (which hook, correctly debounced to one
occurrence per real zone change) — not the notification mechanism. Wiring it to real
downstream consumers is deferred to whichever later ticket actually needs to react to it.

**Key interfaces:**
- Whatever shape-level hook tldraw exposes for a shape finishing a drag and for shapes
  being dropped onto/over another shape — confirmed present on `tldraw@5.2.5`:
  `onDragShapesOver` / `onDropShapesOver` (fired on the *target* shape a dragged shape is
  over/dropped onto — this is how tldraw's own frame shape reparents children) and
  `onTranslateEnd` (fired on the *moved* shape when a drag ends). Use whichever combination
  actually fires reliably for a card dragged over/onto a zone shape; verify with a manual
  drag in the running app, not just by reading tldraw's types.
- A card must still be identifiable as a card (via `meta.instanceId`, already set in
  `cardArrival.ts`) and a zone must still be identifiable as a specific zone (already true
  of the shapes `tableFurniture.ts` creates) from within these hooks.
- Don't design the event's payload shape to match `contracts/` — no `card.moved` contract
  payload exists yet, and defining the wire format is `tabletop-survives-restart`'s job.
  Keep this ticket's output an in-process notion.

**Acceptance criteria:**
- [ ] Dragging a card from the playmat into the graveyard zone logs the card instance and
      the destination zone, once — not once per animation frame of the drag.
- [ ] Dragging a card within a zone it's already in does not re-log.
- [ ] Dragging a card between two zones (e.g. graveyard → exile in one motion) logs exactly
      once, naming the destination zone.
- [ ] Tapping/untapping a card (the existing `onClick` rotation) still works unchanged —
      this ticket adds hooks, it doesn't replace the existing one.
- [ ] A test (unit or Playwright, whichever fits how the hook is exercised) demonstrates
      the zone-entry *detection* logic (correct debouncing, correct zone identification)
      without requiring a human to watch the canvas or read console output.

**Out of scope:**
- Any callback/emitter/queue for downstream consumers — console.log (or `log.ts`) is the
  whole notification surface for now. Wiring a real consumer is a later ticket's job, once
  one exists.
- Sending zone-entry events to the Spine, or defining a `contracts/` payload for them —
  `tabletop-survives-restart`.
- Rotate/tap animation polish, MDFC flip, context-menu curation — `animate-tap` and
  `no-doubleclick-crop`, which ride on this ticket's shape work but are separate tickets.
- Sleeve/playmat cosmetics on the shape — `personal-play-space`.
- Persisting or replaying anything — no snapshot store, no event log writer, here.

## Comments

> *This was generated by AI during triage.*

Verified via triage on 2026-08-06: not already implemented (see redundancy check above).
Promoted directly to `ready-for-agent` at Jess's direction — no grilling round needed, the
original TODO.md line was already well-specified (exact tldraw hooks named and confirmed
present in `tldraw@5.2.5`).

> *This was generated by AI during triage.*

Implemented 2026-08-06.

**Mechanism chosen:** `onTranslateEnd` on the card's own `MtgCardImageShapeUtil` (not
`onDragShapesOver`/`onDropShapesOver` on the zone shapes). Verified in the running app via a
Playwright drag: the zones `tableFurniture.ts` draws are stock, locked `geo`/`image` shapes,
not a custom `ShapeUtil` — there's nothing to attach a target-side hook to without giving
zones their own `ShapeUtil`, which felt like a bigger change than this ticket needed.
`onTranslateEnd` fires exactly once, on the moved card, when the drag settles — that alone
gives the "once per real zone change" behavior the acceptance criteria wants, no separate
debounce timer required.

**Debounce state:** rides on the card shape's own `meta.zone` (a new key alongside the
existing `instanceId`/`scryfallId`/`cardName`) — the last zone the card was known to be in.
Furniture shapes for playmat/library/graveyard/exile now carry `meta.zone` too (added in
`tableFurniture.ts`), so the hook identifies "which zone is the card's new center inside"
by scanning `editor.getCurrentPageShapes()` for `meta.zone` and testing
`Box.containsPoint`. Comparing the two is what suppresses re-firing for staying in (or
nudging within) the same zone, while still firing again if the card leaves and comes back.

**Notification:** per Jess's 2026-08-06 descope, this is a bare `console.log` — no
callback/emitter/queue. Confirmed with the fleet-is-observable owner that this is fine as
explicitly-temporary detection-proving output (no live span in scope for a pure client-side
drag gesture); flagged for whoever builds the real downstream consumer
(`tabletop-survives-restart`) to route it through a span attribute or `log.ts` at that
point, not before.

**Owners consulted:** `animations` (no collision — that KB is entirely Shuffler-scoped;
this is new Tabletop territory outside its remit), `fleet-is-observable` (cleared the bare
`console.log` choice given the explicit descope and the absence of a live span),
`two-faced-cards` (cleared — the new `meta.zone` field is a sibling to the existing identity
fields, doesn't touch `onClick`, face, or rendering).

**Test:** `apps/tabletop/test/verification/verify-zone-entry.spec.ts` (Playwright) — drags a
card via real mouse events and asserts on captured `console` output, so no human needs to
watch the canvas or read logs by eye. Covers: one log entering a zone, no log for a small
drag that stays inside the same zone, exactly one log for a graveyard→exile drag in one
motion, and a regression check that tap/untap (`onClick`) still works with the new hook
present. `npx vitest run` (35 tests) and `./verify.sh` (7 Playwright tests) both pass.

**Left out, per the brief's own scope:** no Spine send, no `contracts/` payload, no
persistence, no rotate/tap animation polish, no context-menu work. "Command zone" is named
in the brief as a zone a card could enter, but nothing in `tableFurniture.ts`/`DESIGN.md`
builds a command zone shape today — the `Zone` type and the `meta.zone` tagging are written
so adding one later (whenever a command-zone furniture shape exists) is a one-line addition,
not a rework.

One thing to flag rather than decide myself: while working through the owner-context step,
one of the forked owner-skill subagents left an unrelated, unintended edit in
`notes/AGENT-NOTES.md` (deleting real content under "Logs, not span events"). I reverted it
before committing — it's not reflected in git history — but it's worth mentioning in case
that skill has a stray write path worth tightening.
