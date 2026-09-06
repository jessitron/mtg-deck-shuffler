# 07 — `card.flipped`

**What to build:** Flipping a two-faced card gets recorded, so which face is up is never
just a rendering accident. This needs a new UI affordance — there is none today.

**Blocked by:** 02.

**Status:** ready-for-agent

- [ ] New UI affordance to trigger a flip (menu action or equivalent) for two-faced cards.
- [ ] `contracts/payloads/card.flipped.v1.json` published: records the resulting face,
      `significance: "domain"`, card identity fields per `contracts/README.md`.
- [ ] Contract validated on send (Tabletop) and ingest (Spine).
- [ ] Send function follows the send-then-commit pattern, triggered by the new affordance.
- [ ] Self-echo skip and dedup-by-event-id, same pattern as `card.arrived`.
- [ ] `TableState`/`projectEvents`/`snapshotCanvas` extended to include a card's current
      face; the diff reports a face mismatch as its own discrepancy kind.
- [ ] Send function tested against a fake HTTP endpoint, asserting the right payload on
      flip.
- [ ] Self-echo skip tested the same way as `card.arrived`'s.
- [ ] `projectEvents` test covering a flip sequence (including flipping back).
