# 01 — Tabletop gains a live Spine SSE subscriber for card.played

Mountain: spine-gathers-data
Ship: tabletop
Status: ready-for-agent

**What to build:** The Tabletop's server opens one live SSE subscription per table room
against the Spine's `GET /tables/:tableId/events/stream`, the first time a `seat.joined`
notification tells that room its Spine `tableId`. `card.played` events arriving on that subscription land on the canvas exactly the
way the existing HTTP-driven path does today: same dedup (on event id and on
`card.instanceId`), same `ensurePlayerArea` self-heal, same card placement. This is purely
additive — the Shuffler's existing direct `card.played` POST to the Tabletop keeps running
unmodified alongside this ticket's work, so a card can legitimately arrive twice (once via
POST, once via SSE) during this window; the existing dedup already makes that harmless. A
dropped SSE connection reconnects on its own with no catch-up/replay of missed events. The
subscriber is a small hand-rolled client parsing the Spine's `data: <json>\n\n` frames
(confirmed at `services/spine/lib/sse_stream.rb:19`) via a streamed `fetch` — no
`EventSource` dependency, since a server process needs many concurrent per-table streams
at once. Non-`card.played` `kind`s arriving on the stream are ignored for now.

As part of this ticket, extract `handleCardArrival`'s core logic (validation, dedup,
`ensurePlayerArea`, placement — currently in `apps/tabletop/src/server/cardArrival.ts`,
signature `(req: Request, res: Response)`) into a form that takes an already-parsed
envelope instead of an Express req/res pair, so the existing HTTP route and the new SSE
dispatcher both call the same logic. `RoomEntry` (`apps/tabletop/src/server/rooms.ts`)
gains a slot for the room's Spine `tableId` and live subscription handle; `handleSeatJoined`
(`apps/tabletop/src/server/seatJoined.ts`) already reads `envelope.tableId` for validation —
this ticket adds storing it and opening the subscription.

Consult `owners/tabletop-shape-mechanics` and `owners/two-faced-cards` before implementing —
both know `cardArrival.ts`'s current behavior in detail and should confirm the HTTP→SSE
entry-point move doesn't change how a card's shape/face is placed. Consult
`owners/fleet-is-observable` on continuing the trace from the broadcast envelope's
`traceparent` (injected at publish time by the Spine's `Table#broadcast`) rather than
starting an unlinked one — same shape as the admin page's existing client-side trace-link
precedent, just server-side.

**Blocked by:** None — can start immediately.

- [ ] `RoomEntry` stores the room's Spine `tableId` and an open SSE subscription handle
- [ ] `handleSeatJoined` opens the subscription on first `seat.joined` for a room; a second
      seat joining the same room does not open a second subscription
- [ ] `handleCardArrival`'s dedup/`ensurePlayerArea`/placement logic is extracted to accept
      an already-parsed envelope, reused by both the existing HTTP route and the new SSE
      dispatcher, with no behavior change to the HTTP route
- [ ] The SSE client reconnects automatically on a dropped connection, with no replay of
      missed events
- [ ] `card.played` frames received over the subscription place a card on the canvas via
      the shared logic; other `kind`s on the stream are ignored
- [ ] Trace context from the broadcast envelope's `traceparent` is continued, not
      restarted, per `owners/fleet-is-observable`
- [ ] Fake-SSE-server test: publishes a `card.played` frame, asserts the same tldraw store
      mutation the existing HTTP-driven test asserts
- [ ] Dedup test: the same event id delivered twice over the subscription produces one card
- [ ] Reconnect test: close the fake server's connection mid-stream, reopen it, publish an
      event, confirm it still arrives and places a card
- [ ] Existing Tabletop and Shuffler test suites still pass unmodified (the Shuffler's
      direct POST path is untouched by this ticket)

## Comments
