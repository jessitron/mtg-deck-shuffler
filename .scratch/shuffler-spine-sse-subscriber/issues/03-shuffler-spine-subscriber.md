# 03 — Shuffler's Spine subscriber + registry

**What to build:** A new in-memory registry on the Shuffler server, mirroring the
Tabletop's room registry (`rooms.ts`), keyed by `gameId`, holding the open Spine SSE
connection for that game. Opened idempotently on every hit of `GET /game-section/:gameId`
— if the persisted game has a `spineTableId` but no live entry, one is opened — covering
first load, HTMX re-fetch, and "came back after a while" (server restart, new tab) with a
single check. Wire parsing is the same hand-rolled SSE client shape as the Tabletop's
`spineSubscriber.ts` (streamed `fetch`, `data: <json>\n\n` frames, bounded
`headersTimeout`/`bodyTimeout` matching the Tabletop's heartbeat-aware dispatcher fix) — not
`EventSource`, since one connection serves the whole game, not one per tab.

A `card.returned` arrival is deduped on the envelope's event id (a redelivered event is a
no-op, not a second move), then applied to Revealed via the existing
`findCardByIndex`-style lookup on `gameCardIndex`. Tracing follows the fleet's SSE event
standard (`apps/tabletop/CLAUDE.md`): a `"sse subscription: card.returned"` span,
`SpanKind.CONSUMER`, parent context extracted from the envelope's `traceparent` (falling
back to `ROOT_CONTEXT`), carrying a `card_return.outcome` attribute (`applied` /
`duplicate`), with a second nested span only when the event is actually acted on. No
reconnect catch-up — a dropped connection reconnects and only picks up what's broadcast
next.

Consult `owners/fleet-is-observable` on the tracing shape and `owners/animations` /
`owners/two-faced-cards` on a card arriving into Revealed with a face, before implementing.

Tab-level teardown (closing the Spine subscription when the last browser tab disconnects)
is ticket 04's job — this ticket's registry entry, once opened, stays open.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] A new in-memory registry, keyed by `gameId`, holds one live Spine SSE subscription
      per active game
- [ ] `GET /game-section/:gameId` opens a subscription idempotently when the game has a
      `spineTableId` but no live registry entry
- [ ] A `card.returned.v1` arrival moves the identified card (by `gameCardIndex`) into
      Revealed
- [ ] Against a fake SSE Spine server publishing a `card.returned.v1` frame, a test confirms
      the card lands in Revealed
- [ ] A second test confirms dedup: the same event id delivered twice produces one move,
      with `card_return.outcome: duplicate` on the second delivery
- [ ] A third test confirms reconnect: drop the fake server mid-stream, reopen it, publish
      an event, confirm delivery resumes with no replay of what was missed
- [ ] The receiving span follows the documented SSE event standard (CONSUMER kind,
      traceparent extraction, outcome attribute, nested "doing" span only when applied)
