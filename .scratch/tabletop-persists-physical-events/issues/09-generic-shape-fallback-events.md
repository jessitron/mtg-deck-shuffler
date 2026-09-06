# 09 — Generic `shape.*` fallback for untooled shapes

**What to build:** Any tldraw shape type without its own dedicated event (freeform
arrows, notes, future token piles) gets recorded generically — `shape.created`,
`shape.moved`, `shape.removed` — so nothing on the canvas is invisible to the log by
default. This closes the freeform "Mural-joy" layer as a blind spot.

**Blocked by:** 02.

**Status:** ready-for-agent

- [ ] `contracts/payloads/shape.created.v1.json` / `shape.moved.v1.json` /
      `shape.removed.v1.json` published: carry shape id, tldraw shape type, and raw
      position/props (`shape.moved` carries both prior and new position),
      `significance: "physical"`.
- [ ] Contract validated on send (Tabletop) and ingest (Spine).
- [ ] New hook(s), scoped to shape types with no dedicated event, firing create/move/
      remove.
- [ ] Self-echo skip and dedup-by-event-id, same pattern as `card.arrived`.
- [ ] `TableState`/`projectEvents`/`snapshotCanvas` extended to represent generic shapes
      (raw props) alongside cards; the diff reports generic-shape discrepancies (missing,
      extra, moved) as their own discrepancy kinds.
- [ ] Send functions tested against a fake HTTP endpoint for create/move/remove.
- [ ] Self-echo skip tested the same way as `card.arrived`'s.
- [ ] `projectEvents` test covering a generic `shape.created`/`moved`/`removed` sequence
      for an untooled shape type.
