# 02 — Tabletop: remove a departed player's cards from the shared canvas

Mountain: tabletop-replaces-mural
Ship: tabletop
Status: ready-for-agent

**What to build:** When a player leaves a table, the other players at that table should
no longer see that player's cards sitting on the shared canvas. On receiving the new
`seat.left` event — via whatever channel `seat.joined` arrives on today — the Tabletop
deletes every shape belonging to that departed seat/player's position from the shared
board. This is scoped to shape cleanup only; no toast or notification to remaining
players is part of this ticket (explicitly out of scope for the whole feature).

**Blocked by:** 01 — Spine: seat-release capability + `seat.left.v1` contract event (needs
the event to actually exist and be mintable before the Tabletop can consume it).

**Status:** ready-for-agent

- [ ] Tabletop subscribes to / handles the `seat.left` event on the same channel as
      `seat.joined`
- [ ] On `seat.left`, every shape belonging to that seat/player's position is deleted
      from the shared canvas
- [ ] No other players' shapes are affected
- [ ] Verification alongside `apps/tabletop/test/verification/verify-seat-joined.spec.ts`
      confirms a departed player's shapes are removed
