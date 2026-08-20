# 02 — Tabletop → Spine send leg

**What to build:** A best-effort Tabletop-side send function that POSTs a
`card.returned.v1` event to the Spine's existing generic `POST /tables/:tableId/events` —
the same send shape `card.played` already uses today, mirroring
`sendCardPlayedToSpineBestEffort`'s existing precedent exactly: rides the ambient
request/gesture span plus undici's automatic outbound header for trace propagation (no new
server-side `traceparent`-minting helper). On failure: a `spine_send.send_failed` span
attribute (the fleet's existing name for this outcome, reused verbatim) plus `log.warn`;
never throws, never blocks the caller. `eventsUrl` is not introduced — the address is
simply "the Spine," matching `seat.joined` and `card.played`.

This function is not wired to the drag gesture yet (that's ticket 12's job, out of scope
here) — it's called directly from this ticket's own test and later from ticket 12.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] A Tabletop-side send function builds and POSTs a `card.returned.v1` envelope
      (`gameCardIndex`, `card.scryfallId`, `seat`, optional `fromZone`,
      `occurredIn: "tabletop"`) to the Spine's generic events endpoint
- [ ] Against a fake Spine HTTP server, a test asserts the POST body/envelope shape is
      correct
- [ ] Against a down/erroring fake Spine server, a test asserts the send function never
      throws and the caller can proceed (best-effort)
- [ ] On failure, the function sets `spine_send.send_failed` on the active span and logs a
      warning
