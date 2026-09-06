# 04 — `card.arrived`: landing position

**What to build:** A new Tabletop-originated event, `card.arrived`, recording the
position a card actually lands at on the canvas — distinct from `card.played` (which
carries no canvas position, since the Shuffler doesn't have one). `TableState`,
`projectEvents`, and `snapshotCanvas` grow a position field for cards, so the diagnostic
can catch position mismatches, not just presence mismatches.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] `contracts/payloads/card.arrived.v1.json` published: Tabletop-originated
      (`occurredIn: "tabletop"`), `significance: "physical"`, carries landing position,
      card identity fields following `card.played.v1.json`'s precedent (`scryfallId` +
      `instanceId`) per `contracts/README.md`'s Card Identity section. Sibling to
      `card.played`, not a replacement.
- [ ] Contract validated on send (Tabletop) and ingest (Spine
      `services/spine/lib/event_contract.rb`) — schema registration only, no new Spine
      logic.
- [ ] Send function follows the existing send-then-commit pattern
      (`sendCardReturned.ts`), POSTing to `POST /tables/:tableId/events`.
- [ ] Wired at the point a card lands on the canvas (existing arrival hook point, no new
      UI needed).
- [ ] Self-echo skip: `card.arrived` events with `occurredIn === "tabletop"` are ignored
      when the Spine broadcasts them back over the Tabletop's own SSE subscription (same
      pattern as `card.returned`'s fix).
- [ ] Dedup-by-event-id: replaying `card.arrived` through the existing
      `spineEventDispatch.ts` dedup path never double-applies it on reconnect.
- [ ] `TableState`/`projectEvents`/`snapshotCanvas` extended to include a card's position;
      the diff now reports a position mismatch as its own discrepancy kind.
- [ ] New send function tested against a fake HTTP endpoint (captured fetch, no real
      Spine), asserting the right payload shape on the right trigger.
- [ ] Self-echo skip tested: dispatch a `card.arrived` event with `occurredIn: "tabletop"`
      back through the Tabletop's own event handling and assert it's a no-op.
