# The Spine's projection of the table

status: designed (2026-09-07), not yet built — supersedes the survey of the same date

All paths in this file are relative to `apps/tabletop/`, per this ship's `CLAUDE.md`.
The pattern this quotes is the fleet's `notes/PATTERN-port-adapter-gateway.md`; the
Shuffler's version of it landed as `apps/shuffler/notes/DESIGN-layering.md`.

## The destination

**The tldraw room stays the source of truth.** That is not changing, and no step here
moves it.

What changes is that the Tabletop starts *telling the Spine what happened*. Every
physical event — a card taps, flips, moves zone, gains a counter, leaves the table —
goes to the Spine's append-only log, alongside the arrivals that already come the other
way. The Spine can then fold that log into a **projection** of the table.

The projection starts wrong. It is expected to start wrong. The work is to add
event-sends, one gesture at a time, until the projection matches the room — and to
**measure the gap in production, during real games, with observability.** That is the
whole shape of the project: not a cutover, a convergence.

Nothing downstream depends on the projection being complete until it demonstrably is.
That is what makes this safe to do incrementally against live play.

### Why this reorders everything

If the projection is a fold over the events, then the event vocabulary and the table's
own mutation vocabulary are **the same vocabulary**:

```
TableSurfaceState = events.reduce(apply, empty)
```

`aCardIsTapped` is simultaneously a method on the port that mutates the table and a kind
in the log that reconstructs it. So the vocabulary cannot be designed twice, once per
port. It is designed once, and both ports quote it. That is why step 1 below is neither
of the ports.

## Two ports

**`WhatsHappeningPort`** — the Spine connection, both directions. Not `SpineEventsPort`:
"Spine" is the transport's name, and this ship shouldn't say it above the adapter. Not
"traffic" either — there's an *event-or-it-didn't-happen* quality here, and "event" is a
real word, not merely the Spine's. These are physical and game events at once. The name
is deliberately a little silly and deliberately easy to search-and-replace if a better
one arrives.

One port, not two, because the Tabletop participates only in the table's event bus — it
does no table administration, so it needs no equivalent of the Shuffler's `join/` port.

The outbound leg **must report whether the send landed**. The library-portal swallow
(`src/client/shapes/cardSwallow.ts`) is send-then-commit: it deletes the card shape only
once the send is confirmed and reverts the card's visuals if it isn't. Fire-and-forget
would break it.

**`TableSurfacePort`** — the tldraw sync connection: what is on the table, and putting
things on it or taking them off. Speaks physics, never records.

The word **"Room" survives only inside this port's gateway**, which is where it belongs.
It's tldraw's word for the thing this ship calls a Table, exactly as "event kind" is the
Spine's word for what this ship calls a gesture.

### Gateways under them

| Gateway | Port | Driven or driving |
| --- | --- | --- |
| SSE stream from the Spine | `WhatsHappeningPort` | driving |
| POST to the Spine | `WhatsHappeningPort` | driving |
| tldraw `TLSocketRoom` | `TableSurfacePort` | driving |
| tldraw websocket connect (`server.ts`) | `TableSurfacePort` | **driven** — tldraw calls us |

Note there is no third inbound gateway for the Spine. See "The `seat.joined` POST goes
away" below.

## What an event must carry to be replayable

The vocabulary belongs in **code**, as types — a list of event kinds in a markdown file
is stale the day the first type is written. What belongs here is the rule every kind is
checked against.

An event is replayable when it satisfies all six:

1. **Removals are events.** A thing leaving the table is as real as it arriving.
2. **Geometry travels with the gesture.** Zone slots can be re-derived from
   `cardLayout.ts`, but a creature parked anywhere on the playmat is real Magic and its
   position is meaningful. Record it.
3. **Identity is by reference, not description.** "A counter reading `+1/+1` was
   attached" is unreplayable; "counter `<id>` attached to card `<instanceId>`" is.
4. **Creation carries its payload.** A type and an id do not say what was created.
5. **Pairs are symmetric.** If there is a `card.turnedFaceDown` there is a
   `card.turnedFaceUp`.
6. **Nothing is dropped on unmount.** A debounced, settle-timer event that gets cleared
   when the tab closes is acceptable telemetry and unacceptable truth.

`src/client/usePhysicsAnnouncements.ts` is the seed of this vocabulary — it already names
this ship's physics in this ship's language (`card.tapped`, `card.untapped`,
`card.flipped`, `card.turnedFaceDown`, `card.zoneMoved`, `counter.attached`) and sends it
only to Honeycomb. **It currently fails all six.** That is the gap step 1 closes, and it
is cheap to close now and expensive to close once a production log holds the old shapes.

One thing it already gets right, and the hardest thing to have retrofitted: it listens
with `{ source: "user", scope: "document" }`, so only the tab that *caused* a change
announces it. Five players watching one drag produce one event, not five. Preserve that
property in every future emitter.

## Modeling the table: three tiers

Long-term, everything on the table gets domain language. That has to be gradual, so the
port models what it knows and quarantines what it doesn't.

**Tier membership is decided by domain meaning, not by whether the tldraw type name
starts with `mtg-`.** The playmat and card back are minted as stock `image` shapes
(`tableFurniture.ts:201,218`) and are unambiguously tier 1.

1. **Modeled** — the domain knows the fields. Card, counter, life counter, zone, title,
   playmat.
2. **Named, not modeled** — the domain knows a *role*, not a schema. Today that is
   `note`: `src/shared/passengerTypes.ts` puts it alongside `mtg-counter` as a thing that
   rides on a card, and `cardRemoval.ts` reparents and rotates passengers when their card
   leaves. So a note is not opaque — the physics already has a rule about it — but the
   domain never needs to know what a note *is*. This tier is a capability flag, not a
   type.
3. **Opaque** — the domain knows nothing. Geo, draw, arrow, text, and tokens until they
   are modeled.

### The quarantine

```ts
type ThingOnTheTable =
  | { kind: "card"; /* … */ }
  | { kind: "counter"; /* … */ }
  | { kind: "unmodeled";
      id: ThingId;
      at: Point;             // zone queries need it
      ridesOn?: ThingId;     // tier 2
      tldrawRecord: unknown; // quarantine
    };
```

Only what the domain must query is hoisted out of the blob: identity, position, and the
passenger relationship. Everything else stays inside.

The field is named `tldrawRecord` on purpose. It puts a vendor name in the domain, which
is ugly, and that is the point — *how much tldraw is left above the adapter* stays a
single grep, forever. A neutral name like `raw` hides the debt from whoever does the
swap.

**The rule that keeps this a hatch and not a bypass:** the domain may hold, move,
reparent, and delete a `tldrawRecord`. It may never read inside one. The first time
domain code branches on its contents, that shape has earned promotion to tier 1. That
tripwire is also the promotion path — modeling tokens later is a new variant in the union
plus a branch in the adapter, never a domain rewrite. This is staged modeling, not debt.

### The opaque record does go to the Spine

Decided: for now, tier 3 crosses the wire with its `tldrawRecord` intact, so the
projection can hold shapes the domain can't yet describe. Consequences, to be handled
rather than re-argued:

- `contracts/` gains a kind whose payload is a passthrough the Spine cannot meaningfully
  validate. **Name it renderer-specific in the schema**, so nobody reading `contracts/`
  in a year mistakes it for fleet domain language.
- The Shuffler will see events it cannot interpret. That is fine; it should ignore them
  by kind, not choke on them.
- Every shape promoted to tier 1 later *removes* payload from this kind. The schema
  should expect to shrink.

## The blocker: there is no composition point

This is the largest mechanical change and it is prerequisite to both ports, so it is done
**once, for both**.

Every module reaches for `getOrCreateRoom` — a module-level `Map` in `src/server/rooms.ts`
— by import, and `seatJoined.ts` reaches for `subscribeToSpine` by import too. Nothing in
this ship can be *handed* an adapter, because nothing is constructed anywhere. `SPINE_URL`
is read in two separate modules, each with its own duplicated `http://localhost:4600`
default.

Until `src/server/server.ts` builds both adapters once and passes them down, "swap in a
fake adapter" is not expressible and the ports are decoration. Doing it once for both is
the difference between one pass and two.

## The `Table` object

`RoomEntry` is a Table that never got named. It holds `seats`, `seenEventIds`,
`spineTableId`, `spineSubscription` and `stackCardCount()` — none of which are tldraw's
business — plus a raw `.room` it never encapsulates, which every module mutates directly
(`entry.seenEventIds.add`, `playerArea.graveyardCount++`, `entry.seats.set`).

A `Table` owns its seats, its dedup set, its Spine subscription and its zone geography,
and exposes physics operations rather than fields. It holds a `TableSurfacePort` handle,
not a `TLSocketRoom`.

This is also what makes the ports' application side *small*. Without it, the "application
layer" the adapters hand values to is still loose functions over a shared mutable map.

## The `seat.joined` POST goes away

Today the Spine POSTs `seat.joined` to `POST /api/tables/:tableName/events`, and that
route opens the SSE subscription as a side effect. This ship's `CLAUDE.md` calls it
"SCAFFOLDING the Spine absorbs" — written before the SSE stream existed, and before the
Spine had event replay.

With replay, `seat.joined` is just another event in the stream, and the trigger for
opening the stream can be the opening of a client. **Delete the route.** The port design
assumes a single inbound path. `CLAUDE.md` needs updating to match.

## How we will know it is working

**In production, during real play.** The convergence is the deliverable, so it is the
thing measured:

- Emit the Spine's projected state and the live room's state as comparable
  observations, and put the **drift** — things in one and not the other, per tier — on a
  span attribute. A game where drift trends to zero is the acceptance criterion for a
  gesture being fully modeled.
- A replay test: run a session, replay its log into a fresh room, diff the card set.

**Do not switch anything onto the projection until that test passes.** A partial log that
looks authoritative is worse than no log, because the first time it silently drops a card
it will be trusted anyway. Emitting to both adapters early is cheap and safe; *reading*
from the projection is the thing to withhold.

### Fakes go at the port, not the gateway

**Application tests fake adapters. Only adapter tests use a fake gateway.**

`src/server/testSeedRoute.ts` — a route that ships to production behind
`ENABLE_TEST_SEED_ROUTE` so specs can seed a card without a live Spine, and which
`test/cardArrival.test.ts` spawns an entire server to reach — is a seam carved through the
HTTP layer to compensate for the absence of a seam at the boundary. A port-level fake
gives tests the same reach with no HTTP hole in the production build, and retires both the
route and the server-spawning. This is one of the concrete prizes; it must not be dropped
as a nice-to-have.

The same prize exists one layer down. Eight test files currently reach through
`entry.room.updateStore` / `getCurrentSnapshot()` and assert on tldraw record internals. A
fake `TableSurfacePort` lets `cardArrival.test.ts` say *"a card sits in the stack's second
slot"* instead of *"a document with `typeName: shape` and `x: …`"*.

The existing boundary tests are good and mostly survive: `test/spineSubscriber.test.ts`
and `test/sendCardReturned.test.ts` already stand up real `http.createServer` fake Spines,
and become **gateway-level** tests, which is where they belong. `test/updateStore.test.ts`
stays exactly as it is — it is a characterization test of tldraw, which is precisely what a
gateway test is.

## Reconnect logic moves up

Following the Shuffler: the cursor, the `Last-Event-ID` protocol, the backoff and the
reconnect loop move into an **abstract adapter**, tested against a `FakeSpineStreamGateway`
that can emit a frame, end a stream, and drop a connection. The HTTP gateway keeps only
`fetch`, the `undici.Agent` with its bounded `headersTimeout`/`bodyTimeout`, and the
`data: <json>\n\n` frame parsing.

This is the part of `spineSubscriber.ts` that is currently untestable except against a real
socket, and the part most likely to harbour a bug. The split earns its keep immediately.

## Telemetry is load-bearing — do not lose it

This ship's `CLAUDE.md` documents an SSE telemetry standard: **a receiving span for every
arriving event, then a doing-span nested inside it if the dispatcher actually acts.** The
receiving span continues the trace from the broadcast envelope's `traceparent` as a CHILD
span, so one Honeycomb trace covers publish-through-placement.

After the move, the receiving span belongs on the **adapter** — "an event arrived" is a
boundary fact — and the doing-span (`place arrived card`, `poof returned card`) stays in
the application. The `traceparent` is on the envelope, which the adapter is the last thing
to see, so it must extract and establish context before handing domain values inward.

Outbound, the announcements become a **port with two adapters composed** the way
`notes/PATTERN-port-adapter-gateway.md` describes: one emits telemetry, one tells the
Spine. That is what turns today's telemetry side-effect into the ship's actual outbound
domain interface — and it means truth and observability leave from one call site, so they
cannot drift apart. It is also the natural home for the Interpreter work in
`notes/DESIGN-the-table-vision.md`.

Get `fleet-is-observable-review` on the plan before implementing, and again on the drift
measurement. The span shape is documented in two `CLAUDE.md` files and in that owner's
knowledge base.

## Envelope construction belongs in the adapter

Outbound envelope construction in `sendCardReturned.ts` is hand-rolled: `randomUUID()`,
`occurredAt`, `significance`, `origin`, `schemaVersion` all inline. The Shuffler has
builders for this (`buildCardReturnedEvent` and friends in
`apps/shuffler/src/port-tabletop/types.ts`). There is no shared TypeScript package for
envelope construction — `contracts/` publishes JSON Schema only — so the Tabletop writing
its own builders is correct, not duplication to eliminate. It just belongs inside the
adapter rather than in a module the application calls directly.

## The sequence

1. **Establish the vocabulary.** Write the physics event union as types: the kinds
   `usePhysicsAnnouncements.ts` already names, plus the inbound Spine kinds, with all six
   replayability properties satisfied. Nothing else can start until this is settled,
   because both ports quote it.
2. **Build the composition point** in `src/server/server.ts` — construct both adapters
   once, read `SPINE_URL` once, pass them down. Replace `seatJoined.ts`'s direct
   `subscribeToSpine` import. Fixes the duplicated env-var default for free.
3. **Inbound `WhatsHappeningPort`.** Move Ajv validation, the tableId-matches-the-slug
   check (copy-pasted into three files today), the `occurredIn: "shuffler"` filter and the
   event-kind sniffing out of `cardArrival.ts`, `cardRemoval.ts` and `seatJoined.ts` into
   an abstract adapter. Split transport into gateways; reconnect and cursor logic move up.
   Delete the `seat.joined` route.
4. **`Table` + `TableSurfacePort`.** `apply(state, event)`. Add the port-level fakes,
   rewrite the application functions to take domain values, retire `testSeedRoute.ts`.
5. **Outbound announcements as a port with two adapters.** Start emitting physics events
   to the Spine, then begin the convergence: one gesture at a time, drift measured in
   production.

Steps 3 and 4 meet at the same three application functions but on opposite halves — step 3
changes their *input* (raw envelope → domain values), step 4 changes their *output*
(`entry.room.updateStore(...)` → a physics call on the Table). They do not collide.

The three wire kinds `card.played`, `card.played-face-down` and `card.discarded` carry
**two physical facts**: a card lands on the Stack (concealed or not), or a card lands in
the graveyard. Today that fan-in is smeared across three `Set` constants in
`spineEventDispatch.ts`, the `isFaceDownEnvelope` sniff in `cardArrival.ts`, and two
near-identical `applyCard*` functions. Under a port it is one arrival with a destination
and a concealment flag, translated once, in the adapter, where it is visible and testable.

This is genuinely multi-session work and belongs in the tracker as a spec with
dependency-ordered tickets.

---

# Appendix A: where the leakage lives today

Five modules carry the Spine connection, none separated from the domain:

| File | What it holds |
| --- | --- |
| `src/server/spineSubscriber.ts` | SSE transport, reconnect, exponential backoff, the `Last-Event-ID` cursor, frame parsing, and the `undici.Agent` — one function, calling `fetch` inline |
| `src/server/sendCardReturned.ts` | a hand-built `card.returned` envelope and the POST that sends it, with its own copy of `SPINE_URL` and its default |
| `src/server/spineEventDispatch.ts` | routing by *wire* event name, plus the receiving span, plus outcome logging |
| `src/server/contractValidation.ts` | Ajv envelope and payload validation — but invoked *from* the application code, not at the boundary |
| `src/server/seatJoined.ts` | an Express route that is really an inbound Spine event, and which opens the SSE subscription as a side effect |

The clearest tell is `applyCardArrival(tableName, body: unknown)` in `src/server/cardArrival.ts`:
it accepts a raw envelope, runs Ajv, checks `slugifyTableName(envelope.tableId) !== tableName`,
sniffs whether `name === "card.played-face-down"`, and only then places a shape. Those are
adapter responsibilities living inside application functions.

The tldraw sync surface, by contrast, is already almost a gateway — six calls total:

| Call | Where |
| --- | --- |
| `new TLSocketRoom({ schema, onSessionRemoved })` | `rooms.ts` |
| `room.updateStore(cb)` → `store.put` ×15, `store.get` ×3, `store.getAll` ×1, `store.delete` ×1 | `cardArrival`, `cardRemoval`, `tableFurniture` |
| `room.getCurrentSnapshot().documents` | `rooms.ts`, `tableFurniture.ts` |
| `room.handleSocketConnect` | `server.ts:108` |
| `room.getNumActiveSessions()` | `server.ts:106` |

The coupling is not that surface. It is the **record format** — `store.put()` takes a
`TLRecord` whose `props` match `src/shared/mtgCardShape.ts`, and that same schema is what
the client's `MtgCardShapeUtil` renders. A port that passes `TLRecord`s across is a port in
name only. Hence the tiers above.

Nothing persists today: `getCurrentSnapshot()` appears three times and all three are
queries. Rooms die on process restart. Durability is exactly what the projection is for.

# Appendix B: why this is a refactor and not a rewrite

The question was asked. About 4,900 lines of `src/` against about 7,100 lines of `test/` —
a small ship with more test than code, so a rewrite is not physically daunting. That is
precisely why it is tempting and why it should be resisted.

- **The tests are the asset.** A 1.45:1 test-to-source ratio including Playwright
  verification and a self-tracing harness is most of the accumulated value here. A rewrite
  either throws them away or keeps them — and if it keeps them, it is a refactor with extra
  steps.
- **The hard-won knowledge is about other people's software.** Puma won't flush a streamed
  response's headers until the body's `each` yields; undici 8 silently breaks every `fetch`
  through a custom dispatcher; tldraw non-null-asserts every still-settling shape in a
  multi-select drag; a locked shape can never be a drop target; the `geo` shape's `font`
  prop is a closed enum, so on-brand canvas text needs a self-rendering shape; tldraw ≥ 4
  blanks an unlicensed HTTPS canvas after five seconds. **None of that is recoverable by
  rewriting.** It was paid for in production incidents and Honeycomb archaeology.
- **Most of the mass is tldraw's shape, not ours.** The five `Mtg*ShapeUtil` files exist in
  the form tldraw dictates. Rewriting them produces different code in the same shape.
- **The layering problem is local** — five server modules and the three application
  functions they leak into.

**Leave the client rendering alone.** `TablePage.tsx`, the shape utils, drag and drop and
zone hit-testing carry the tldraw lore above and are covered by
`owners/tabletop-shape-mechanics`. There is no layering win there worth the disturbance.
The port goes around *notifications about shapes moving*, not around the shapes themselves.

A note on the comments: this ship is documented well past the usual standard, which is to
say it has too many comments. The refactor is a chance to thin them where extracted code
becomes self-explaining — but the vendor-lore comments listed above are the expensive ones
and must survive the thinning.
