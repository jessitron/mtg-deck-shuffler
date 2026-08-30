GOAL: Make a named cross-ship flow (e.g. discard-card) fully traceable end-to-end in Honeycomb, so its actual runtime behavior — not just its code — is visible for debugging.

@AI: I said no examples

@AI: start with finding out what tracing is already available. There exists tracing in this project, so research in Honeycomb what is already there. Rewrite these steps existing-tracing-aware. Also, I don't want to inventory the whole thing first. I want to add the tracing bit by bit, starting with the trigger of the flow (if not already traced) and then test it, find that trace, see where it needs to be extended next.

@AI: This workflow document needs to work for any arbitrary tracing request I may make in the future, so don't use things specific to this situation.

1. Name the flow in one phrase (e.g. "discard card") and identify every ship it touches, in hop order, by grepping each ship's routes/handlers for the flow's trigger (route name, event kind, or button action). Record the ordered list of ships (subset of Shuffler, Tabletop, Spine).
2. For each pair of adjacent ships in that list, find the code that carries the flow from one to the next (an HTTP call, an SSE event envelope, a browser `fetch`) and confirm it propagates trace context:
   - If it's a `fetch()`/`Net::HTTP` call, confirm OTel auto-instrumentation is active for that client (no manual `traceparent` header set by hand).
   - If it's an event envelope (Spine SSE, `contracts/envelope.v1.json`), confirm the envelope's `traceparent` field is populated at build time and read back at receipt time.
   - If neither carries a `traceparent` (e.g. a browser `EventSource`, a timer callback), write down that this hop is NOT trace-connected and note the shared correlation id to use instead (e.g. `game.id`, `table.id`, `session.id`).
3. For each ship in the list, locate the existing span each hop runs under (ambient auto-instrumented request span for Node ships; `current_span` in `app.rb` for the Spine).
4. On each of those spans, add or confirm an outcome attribute for the flow, following that ship's existing pattern:
   - Node ships: `trace.getActiveSpan()?.setAttribute(...)`, or extend `CommonAttributes`/`setCommonSpanAttributes` in `tracing_util.ts` if the value is already computed elsewhere in the request.
   - Spine: `current_span.add_attributes(...)`, using `mark_span_failed` on the error path.
   - Name the attribute `<flow>.result` (e.g. `discard.result`) with a bounded, documented vocabulary (e.g. `applied`, `duplicate`, `invalid`, `error`) — do not reuse another flow's attribute name.
5. On each span, add the flow's identifying ids as attributes if not already present (e.g. `game.id`, `table.id`, `card.instance_id`) so spans from different ships for the same flow execution can be filtered to the same value.
6. For any step in the flow that is best-effort or can fail without raising (e.g. a Spine send that must not block the player), confirm a `log.warn`/`log.error` call exists at that failure point carrying the same identifying ids — never `span.addEvent`.
7. Build and run the fleet locally: `./run` from the repo root.
8. Trigger the flow once in the browser (or via `curl`/Playwright) so it emits one concrete execution to trace.
9. Query Honeycomb via the `honeycomb-modernity` MCP server, environment `local`:
   - Call `get_workspace_context` to confirm the environment slug.
   - For each ship's dataset (`mtg-deck-shuffler`, `mtg-deck-shuffler-web`, `mtg-tabletop` or equivalent, `mtg-spine`), call `list_spans` filtered to the flow's identifying id, to confirm that ship emitted a span for this execution.
10. If step 2 found every hop trace-connected, call `get_trace` on the trace id from the triggering request and confirm spans from all ships in the ordered list appear in that one trace.
11. If step 2 found a non-trace-connected hop, instead run one `run_query` per dataset, grouped by the shared correlation id from step 2, and confirm each ship's spans for this execution appear when filtered to that id's value.
12. Record the Honeycomb query URL(s) or trace URL from steps 10/11 in the flow's owner doc or ticket as the citation that the flow is now visible.
