# 06 — `card.tapped`/`card.untapped`

**What to build:** Tapping and untapping a card gets recorded in the Spine's log, so tap
state survives a reload and is part of the game's history. Wired into the existing tap
UI (`cardTapClick.ts`) — no new affordance needed.

**Blocked by:** 02.

**Status:** ready-for-agent

- [ ] `contracts/payloads/card.tapped.v1.json` / `card.untapped.v1.json` published (or one
      event with a boolean, matching whichever precedent `card.played`/
      `card.played-face-down`'s sibling-events pattern favors) — `significance: "domain"`
      (always game-significant), card identity fields per `contracts/README.md`.
- [ ] Contract validated on send (Tabletop) and ingest (Spine).
- [ ] Wired into the existing hook point (`cardTapClick.ts`'s `handleCardClick`) rather
      than a new one.
- [ ] Self-echo skip and dedup-by-event-id, same pattern as `card.arrived`.
- [ ] `TableState`/`projectEvents`/`snapshotCanvas` extended to include a card's tapped
      state; the diff reports a tapped-state mismatch as its own discrepancy kind.
- [ ] Send function tested against a fake HTTP endpoint, asserting the right payload on
      tap and on untap.
- [ ] Self-echo skip tested the same way as `card.arrived`'s.
- [ ] `projectEvents` test covering tap/untap sequences, including interleaved with other
      cards.
