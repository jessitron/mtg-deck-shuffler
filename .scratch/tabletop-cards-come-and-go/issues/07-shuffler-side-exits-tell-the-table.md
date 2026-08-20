# 07 — Shuffler-side exits tell the table (and the dedup trap dies)

Mountain: tabletop-replaces-mural
Ship: fleet
Status: ready-for-agent

**What to build:** New schema `card.returned.v1` — payload `card: { scryfallId, instanceId }`
(required), `seat: 1–4` (required), `fromZone` (optional, absent when `occurredIn:
"shuffler"` since the Shuffler doesn't know table geography). No `face`/`faceDown` — the
Shuffler stays authoritative for face; the table is never authoritative for a table card's
face.

Any transition out of the Shuffler's `Table` location sends this event with
`occurredIn: "shuffler"` — the card modal's Return button, and any other route that reaches
a Table card by crafted request (put-in-hand, put-on-top, put-on-bottom). The Tabletop
receives it (over its Spine SSE subscription — see below) and poofs the shape, identified
by the shape's `instanceId` **prop** (not shape meta); attachments stay behind, detached.

**Delivery is best-effort to the Spine's event log, mirroring how `card.played` already
works — not a blocking send-then-commit to the Tabletop.** There is no direct
Shuffler→Tabletop HTTP call anywhere in the fleet any more (`TabletopPort` /
`HttpTabletopGateway` / send-then-commit-to-the-Tabletop were deleted); the Shuffler posts
`card.played` to the Spine's event log via `sendCardPlayedToSpineBestEffort`
(`src/port-spine/sendToSpine.ts`, `SpinePort.sendEvent`) and the Tabletop only ever learns
about it later, over its own Spine SSE subscription (`spineEventDispatch.ts` →
`cardArrival.ts`'s `applyCardArrival`) — the Shuffler's route mutates and persists
`GameState` immediately, before or independent of whether the Spine accepts the event, and
never blocks or fails the player's action on delivery. `card.returned` should follow that
same shape: a new `sendCardReturnedToSpineBestEffort` (or a `faceDown`-style parameter on
a shared best-effort sender) posts `card.returned.v1` to the Spine, the Shuffler's own
`Table`→elsewhere location change happens regardless of whether that post succeeds, and
the Tabletop picks the event up asynchronously off its SSE stream and poofs the shape then.
This is a real design change from what's written above, not a mechanical substitution —
"the Shuffler does not commit until the Tabletop confirms delivery" is exactly the
send-then-commit contract that no longer exists anywhere in this fleet, and there is no
current mechanism for the Tabletop to "confirm delivery" back to the Shuffler at all (the
Spine sits between them and neither ship blocks on it). Whoever picks this ticket up needs
to decide how the dedup trap gets closed under eventual, best-effort delivery instead —
the poof-on-`card.returned` idea likely still works, since it's about what the Tabletop
does with an event it already asynchronously received, but "the Shuffler doesn't commit
until confirmed" needs to be dropped, not preserved.

This closes today's dedup trap: since the Tabletop's arrival dedup keys on shape-presence-
on-board, deleting the shape on exit is the whole fix — a returned card re-played with the
same `instanceId` passes dedup and lands as a fresh shape.

**Blocked by:** 05 — needs contract validation in place for the new schema.

- [ ] `card.returned.v1.json` schema written per the payload above
- [ ] Every Shuffler transition out of `Table` (Return button, and crafted
      put-in-hand/top/bottom) sends `card.returned.v1` with `occurredIn: "shuffler"` to
      the Spine's event log, best-effort — same pattern as
      `sendCardPlayedToSpineBestEffort`
- [ ] The Shuffler's own location-change mutation is not gated on Spine delivery
      succeeding (best-effort — a down Spine must not block the Return action, matching
      how `card.played` already works)
- [ ] The Tabletop poofs the shape by `instanceId` prop on receipt over its Spine SSE
      subscription; attachments remain, detached
- [ ] Regression test: return a card via the modal, then play it again — it actually
      lands on the table (today it's silently swallowed)
- [ ] Test coverage for the best-effort send (failure to reach the Spine is logged, not
      thrown, and never blocks the Return action) — mirroring existing coverage of
      `sendCardPlayedToSpineBestEffort`
