# 05 — `card.moved`: subsequent moves, from and to

**What to build:** A `card.moved` event recording every subsequent card move after
arrival, carrying both the prior and the new position (and zone, where relevant) — not
just the destination — so the diagnostic can catch a gap (a logged move whose "from"
doesn't match the end of the previous logged move) as well as a final mismatch.

**Blocked by:** 04 (extends the position field that ticket introduced).

**Status:** ready-for-agent

- [ ] `contracts/payloads/card.moved.v1.json` published: `significance: "physical"`
      (default, per the deferred zone-based refinement in the spec's Out of Scope),
      carries prior and new position/zone, card identity fields per
      `contracts/README.md`.
- [ ] Contract validated on send (Tabletop) and ingest (Spine).
- [ ] Wired into the existing move hook point (`MtgCardShapeUtil.onTranslateEnd` /
      `handleTranslateEnd` in `cardZoneEntry.ts`) rather than a new hook.
- [ ] Self-echo skip and dedup-by-event-id, same pattern as `card.arrived`.
- [ ] `TableState`/`projectEvents`/`snapshotCanvas` unchanged in shape (still just
      position) but the diff gains a second discrepancy kind: a "from" gap, where a
      logged move's prior position doesn't match the end of the previous logged move for
      that card.
- [ ] Send function tested against a fake HTTP endpoint, asserting the right payload
      shape (including both positions) on the right trigger.
- [ ] Self-echo skip tested the same way as `card.arrived`'s.
- [ ] `projectEvents` test added covering a "from" gap and asserting the diff catches it.
