# 08 — `card.turnedFaceDown`

**What to build:** Turning a card face down (and back up) gets recorded, so concealment
changes are auditable the same way everything else is. Covers both directions on one
event; needs a new UI affordance — there is none today.

**Blocked by:** 02.

**Status:** ready-for-agent

- [ ] New UI affordance to turn a card face down / back up.
- [ ] `contracts/payloads/card.turnedFaceDown.v1.json` published: covers both directions,
      the resulting concealment state rides on the payload, `significance: "domain"`,
      card identity fields per `contracts/README.md`.
- [ ] Contract validated on send (Tabletop) and ingest (Spine).
- [ ] Send function follows the send-then-commit pattern, triggered by the new affordance.
- [ ] Self-echo skip and dedup-by-event-id, same pattern as `card.arrived`.
- [ ] `TableState`/`projectEvents`/`snapshotCanvas` extended to include a card's
      concealment state; the diff reports a concealment mismatch as its own discrepancy
      kind.
- [ ] Send function tested against a fake HTTP endpoint, asserting the right payload for
      both directions.
- [ ] Self-echo skip tested the same way as `card.arrived`'s.
- [ ] `projectEvents` test covering turning face down and back up.
