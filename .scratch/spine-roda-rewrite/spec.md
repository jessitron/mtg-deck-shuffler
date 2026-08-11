# Delete the Spine, rewrite it as plain Ruby + Roda

Mountain: spine-tells-the-story
Ship: spine
Status: ready-for-agent

Produced from a `/grilling` session with Jess (2026-08-10). All decisions below were
reached in that conversation; this document synthesizes them — it mints nothing new.

## Problem Statement

`services/spine` is a Rails 8 + SQLite app, and Rails is in the way of what this ship is
for. Its conventions — autoloading, generators, ActiveRecord, the asset pipeline — mean
the actual logic is hard to find and hard to see: too much of what happens is implicit,
supplied by the framework rather than written down. Jess wants to learn plain Ruby, and
this project is the vehicle for that; Rails' magic defeats the purpose every time she
goes looking for where something actually happens.

Separately, and independently confirmed while scoping this: nothing in production
depends on the current Spine yet (`services/spine/SEAMAP.md` — the Shuffler's Prep
screen doesn't call its tables/seats API). So this isn't a live migration with a cutover
to choreograph; it's building the replacement at leisure and switching integrations on
once both sides are ready.

## Solution

Delete `services/spine` entirely and build a fresh app in its place: Roda for routing,
Sequel (not ActiveRecord) for persistence, SQLite unchanged, Minitest for tests. No
strangler, no incremental migration, no data migration — the new app starts with an
empty database.

The rewrite is scoped to what already exists and works today: tables, seats, the
event log, contract validation against `contracts/`, an admin screen, and telemetry.
`services/spine/interpreter/docs/journeys/` (26 ADRs + a 16-chapter guide) is pure
documentation with zero implementation — it carries over untouched and is explicitly
out of scope for this rewrite.

Two API-shape changes ride along, both surfaced while re-examining what the Spine is
actually for — not a passive event bus, but the table's administrator:

1. **Joining creates the table.** Today, creating a table and taking a seat are two
   separate calls, and the Shuffler has to know which one to make. They collapse into
   one `join` action: name a table, get a seat; if that name doesn't exist yet, it's
   created as a side effect of the first join. `GET /tables/lookup` (today's
   name→id-without-seating lookup) is dropped — nothing calls it independently of
   joining.
2. **Outbound delivery is new.** Today the Spine only ingests events (`POST
   /tables/:id/events`); nothing pushes events back out to the Shuffler or Tabletop.
   This rewrite adds that: Server-Sent Events, one stream per table, so a Return Card
   event (say) reaches the Shuffler the moment it's appended, instead of the Shuffler
   having no way to find out at all.

## User Stories

1. As the Shuffler, I want to join a table by name without first checking whether it
   exists, so that I never have to orchestrate a create-then-join sequence.
2. As the Shuffler, I want joining a not-yet-existing table name to create that table
   as a side effect, so that the first player to name a table just starts it.
3. As the Shuffler, I want joining to return a table id and a seat number in one
   response, so that I have everything I need to act on behalf of that seat.
4. As the Shuffler or Tabletop, I want to send an event to a table and get an
   immediate acknowledgment (the assigned seq, or a clear rejection), so that I know
   right away whether it was accepted.
5. As the Shuffler or Tabletop, I want to send the same event twice (e.g. after a
   retry) and have the second attempt recognized as a duplicate rather than
   double-appended, so that unreliable networks don't corrupt the log.
6. As the Shuffler or Tabletop, I want an event with a bad envelope or an unknown
   name/version to be rejected loudly, so that a schema mismatch is caught immediately
   rather than silently ignored.
7. As the Shuffler, I want to receive a Return Card event the moment it's appended to
   a table I'm watching, so that a card portaled back off the Tabletop actually lands
   in my Reveal zone without me polling for it.
8. As the Tabletop, I want to receive a Play Card event the moment it's appended, so
   that a played card appears on the shared canvas without delay.
9. As a subscriber whose connection drops, I want to reconnect and resume receiving
   new events, so that a network blip doesn't silently strand me.
10. As a developer, I want to open `/admin/tables` and see every table, so that I can
    tell what tables currently exist without querying the database directly.
11. As a developer, I want to open a table's admin page and see its full event log in
    order, so that I can debug what actually happened at that table.
12. As a developer watching a table's admin page, I want new events to appear live as
    they're appended, so that I don't have to reload the page to see what just
    happened.
13. As a developer, I want every request and event append to produce a trace in
    Honeycomb, so that I can follow what happened across the fleet.
14. As a developer, I want an event's trace context to travel with it to whoever
    receives it, so that a receiving app's own spans link back to the originating
    trace.
15. As a developer, I want the persisted event log to hold only domain and envelope
    data — never trace context — so that trace context (which expires) is never
    confused with durable causality data (which doesn't).
16. As a developer, I want the table/seat/event domain logic covered by fast,
    isolated unit tests, so that I can verify branching behavior (dedup, seat-full,
    contract violations) without going through HTTP.
17. As a developer, I want the HTTP-facing behavior covered by integration tests that
    hit real routes, so that I'm testing what callers actually experience.

## Implementation Decisions

**Stack**: Roda (routing only — no Rails-style MVC), Sequel for persistence (not
ActiveRecord — a query-building layer, not a magic ORM), SQLite (unchanged), Minitest.
No ActiveJob-equivalent; the current `ApplicationJob` stub defines zero jobs and isn't
carried over.

**Deletion scope**: all of `services/spine` as it exists today (Rails app structure,
Gemfile, config, app/, test/, db/) is deleted and replaced. `contracts/` (repo root,
shared with the Shuffler) is not deleted, but its envelope schema needs a version
decision — see "Envelope contract change" below. `services/spine/interpreter/docs/journeys/`
is preserved as-is; nothing under it changes.

**Data**: the new app starts with an empty SQLite database. No migration path from the
current dev/deployed data — nothing depended on it in production, and Jess confirmed no
migration is needed.

**Join endpoint**: `POST /join` (or equivalent path — naming is an implementation
detail) takes `{name, playerName}` and returns `{tableId, seatNumber}`. If no active
table has that name, one is created first (minting a `table.created` event), then a
seat is taken (minting a `seat.taken` event) — both existing event kinds, unchanged.
Today's `POST /tables`, `POST /tables/:table_id/seats`, and `GET /tables/lookup` are
all replaced by this single endpoint. The existing domain invariants (name uniqueness
among active tables, seat auto-assignment 1–4, seat-occupied/table-full rejection) carry
over unchanged — only the entry point changes shape.

**Event ingestion**: `POST /tables/:table_id/events` stays a plain HTTP request/response
endpoint — this is unchanged from today. It remains the only way to write to the log,
retains contract validation against `contracts/` (json_schemer or equivalent; the
"fail loudly on unknown name/version" behavior is unchanged), dedup on sender-supplied
event id, and server-assigned `seq`/`acceptedAt`. This stays synchronous/request-response
deliberately: the sender needs an immediate ack (assigned seq, duplicate, or rejection),
which is exactly what HTTP status codes are for — no reason to move it onto a different
transport.

**Outbound delivery (new)**: Server-Sent Events, one stream per table (e.g.
`GET /tables/:table_id/events/stream`). Every event appended to a table's log is pushed
to every open stream subscribed to that table, in the same envelope shape the log
stores, as it happens — no polling. Chosen over WebSocket because the direction is
inherently one-way (fan-out from the Spine; subscribers never need to talk back over
this channel — they already have the ingestion endpoint for that), and SSE rides on
plain HTTP with browser-native reconnect (`EventSource`) rather than requiring a
hand-rolled handshake/keepalive/reconnect protocol.

Internally, delivery goes through a plain-Ruby broadcaster/pub-sub object (name TBD,
e.g. `TableBroadcaster`) that appending an event notifies; the SSE route is a thin
adapter that subscribes a connection to that object and formats its notifications as
SSE `data:` frames. This split is what makes the object independently testable (see
Testing Decisions) and keeps the wire format out of the domain logic.

**Trace context — envelope contract change**: Today's `envelope.v2.json`
(`contracts/envelope.v2.json`) has `traceparent` as a **required top-level envelope
field** inside the JSON body, and the current `Event` model persists it as a column
(used to build Honeycomb trace links on the admin screen). Two things settled this:

- **Inbound**, trace context belongs in the HTTP `traceparent` header (standard W3C
  Trace Context propagation), not in the envelope JSON body — this is how it already
  arrives in practice (the Rack/OTel instrumentation extracts it from headers today;
  see `Table#append_event!`'s comment "inbound trace context is extracted by the Rack
  instrumentation"), so requiring it as a body field too is redundant. `POST
  /tables/:table_id/events` reads it from the request header, uses it to continue the
  trace, and never expects or requires it in the JSON payload.
- **Outbound**, there's no per-message HTTP header available — an SSE stream is one
  long-lived connection carrying many events over time, not one request per event —
  so each outbound message needs its trace context inline, alongside the event, not
  merged into it: `{event: {...same shape the log persists...}, meta: {traceparent:
  "..."}}`.
- **Persisted**, the `Event` row (Sequel model) stores no trace field at all, in
  either direction. Trace context is ambient/observability-only, never durable
  causality data.

This means `envelope.v2.json`'s `traceparent` field should become optional-or-removed
in whatever version the new Spine's contract usage lands on — implementers should
confirm with the `contracts/README.md` conventions before bumping it, since
`contracts/` is the fleet's shared published language (both the Shuffler and, later,
the Tabletop read/write against it), not something the Spine can casually redefine
alone.

The admin screen's Honeycomb-trace-link feature falls out of this for free rather
than being lost: since the admin screen watches a table's SSE stream live (see below),
every event it receives arrives with `meta.traceparent` attached, and it builds the
link at render time from that — the same way it always rendered from a stored column,
just sourced from the live envelope instead. Only rows already in the log before the
admin page was opened lack a link, which is the natural (and correct) consequence of
trace context being ephemeral rather than durable — the envelope schema's own
description already says as much ("expires with the trace ~60d").

**Admin screen**: kept, at a `/admin/tables`-shaped route (index of tables, show for a
single table's log). The "live" behavior changes: instead of the current 5-second
full-page-reload poll, the show page subscribes to that table's SSE stream (dogfooding
the same delivery mechanism the Shuffler/Tabletop use) and appends new rows as events
arrive, with no reload. No auth, no pagination/filtering/search — same as today.

**Telemetry**: OTel wired from the first commit (fleet-wide constraint, unchanged).
The existing `BackgroundChatterSampler` (health-check down-sampling) is **not** ported
as-is — Jess flagged it as broken (the app hasn't started/stopped cleanly since it was
added) and explicitly said not to copy it. For this rewrite's first landing: 100%
sampling, no health-check down-sampling. Revisit sampling once the new app's
start/stop behavior is confirmed clean.

**Deploy**: out of scope for this spec's tickets to redo immediately, given no
production dependents exist yet — the Docker/k8s deploy setup can be rebuilt once the
new app is functionally complete and ready to be wired into the fleet. (Not urgent;
see Out of Scope.)

## Testing Decisions

Two seams, chosen because SSE makes a single seam impractical (asserting on raw,
long-lived SSE wire output through a request/response test client is awkward; the
delivery logic is worth testing directly instead):

1. **HTTP integration seam** (Rack::Test or equivalent), covering everything
   request/response: `POST /join`, `POST /tables/:table_id/events`, `/admin/tables`
   index and show. Tests hit real routes end-to-end and assert on status codes and
   response bodies — same spirit as today's `test/integration/ingestion_test.rb` and
   `test/integration/admin_screen_test.rb`. This is the seam that proves what callers
   (Shuffler, Tabletop, a developer's browser) actually experience.
2. **Domain unit seam**, covering branching logic in isolation: table creation, seat
   assignment/occupied/full, dedup-on-event-id, contract-violation rejection — same
   spirit as today's `test/models/table_test.rb`. Also covers the broadcaster/pub-sub
   object directly: push an event in, assert every subscribed listener receives it,
   without going through the SSE wire format at all.

A good test here only asserts on external behavior (status code, response body,
"subscriber received this event") — never on internal structure like which Sequel
methods got called.

## Out of Scope

- The Interpreter/Journeys pattern (`interpreter/docs/journeys/`) — pure docs, zero
  code, untouched by this rewrite.
- Any real integration work on the Shuffler or Tabletop side to actually call the new
  `/join` endpoint or subscribe to the SSE stream — this spec is Spine-only; wiring the
  other ships to it is separate, later work, once both sides are ready.
- Redeploying the Spine (Docker/k8s config, `deploy.sh`) — no live dependents exist
  yet, so there's no urgency; rebuild deploy tooling once the app is functionally
  ready to be wired in.
- A rebuilt telemetry sampler for health-check chatter — deliberately skipped for v1;
  trace everything at 100% and revisit once start/stop behavior is confirmed clean.
- Auth of any kind (matches the fleet's current no-auth stance).
- Migrating or preserving any existing dev/deployed data.

## Further Notes

- Nothing in production currently depends on the Spine (`services/spine/SEAMAP.md`
  confirms the Shuffler's Prep screen doesn't call its API yet), which is why this can
  be a clean delete-and-rewrite rather than a strangler migration — there's no live
  cutover to choreograph.
- The envelope version bump for dropping `traceparent` from the required body fields
  should happen as its own explicit step during the ticket that implements event
  persistence — it's small in scope but touches `contracts/`, which is fleet-shared
  language, so it deserves a deliberate version bump rather than an implicit change
  made in passing while writing the `Event` model.
- The Spine's re-framing as "a real app / game administrator, not a dumb event bus"
  (Jess, during grilling) is why tables/seats/join stay first-class synchronous
  endpoints rather than being flattened into pure pub/sub — a future action like
  "look at target player's library" will need the same synchronous,
  administered-and-also-logged shape that joining has now.
