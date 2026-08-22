# 07 — Shuffler-side exits tell the table (and the dedup trap dies)

Mountain: tabletop-replaces-mural
Ship: fleet
Status: ready-for-agent

**What to build:**
The shuffler can initiate `card.returned` with its existing `return` functionality for cards on the table.
When the tabletop receives card.returned, it deletes the card object.

Any transition out of the Shuffler's `Table` location sends this event with
`occurredIn: "shuffler"` — the card modal's Return button, and any other route that reaches
a Table card by crafted request (put-in-hand, put-on-top, put-on-bottom). The Tabletop
receives it (over its Spine SSE subscription — see below) and poofs the shape, identified
by the shape's `instanceId` **prop** (not shape meta); attachments stay behind, detached.

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
