# 05 — Live outbound delivery over SSE

Mountain: spine-tells-the-story
Ship: spine
Status: resolved

**What to build:** `GET /tables/:table_id/events/stream` — one Server-Sent Events stream
per table. Every event appended to that table's log is pushed to every open subscribed
stream as it happens, in `{event: {...same shape the log persists...}, meta:
{traceparent: "..."}}`, no polling. Chosen over WebSocket because delivery is one-way
(fan-out only) and SSE gets browser-native reconnect (`EventSource`) for free. Internally
this goes through a plain-Ruby broadcaster/pub-sub object that appending an event
notifies; the SSE route is a thin adapter that subscribes a connection to that object and
formats notifications as SSE `data:` frames — this split is what makes the broadcaster
testable without going through the wire format.

**Blocked by:** 04

- [x] Subscribing to `GET /tables/:table_id/events/stream` and then appending an event
      to that table (via ticket 04's endpoint) delivers the event on the open stream,
      with no polling
- [x] The delivered payload is `{event: {...}, meta: {traceparent}}` — trace context
      travels alongside the event, not merged into it
- [x] A dropped connection can reconnect (standard `EventSource` behavior) and resume
      receiving new events
- [x] The broadcaster/pub-sub object is unit tested directly: push an event in, assert
      every subscribed listener receives it, without touching the SSE wire format
- [x] Multiple subscribers to the same table's stream all receive the same event
