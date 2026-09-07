# Bringing port-adapter-gateway to the Tabletop's Spine connection

status: proposed (2026-09-07) — nothing here is built yet

All paths in this file are relative to `apps/tabletop/`, per this ship's `CLAUDE.md`.

The Shuffler's Spine connection is built on port-adapter-gateway: see the fleet's
`notes/PATTERN-port-adapter-gateway.md` for the pattern and
`apps/shuffler/notes/DESIGN-layering.md` for how it landed there. This document is the
survey of what it would take to bring the same shape to the Tabletop, and what the
Tabletop's version should say — because the Tabletop's language is not the Shuffler's.

## The verdict up front

The Tabletop is not a mess. The code is careful, and it is documented far past the usual
standard. What it lacks is a **layer boundary**: it is organised by *event kind* rather
than by *layer*, so the Spine's wire vocabulary reaches all the way into the code that
places tldraw shapes. There is no port, no adapter, and no gateway; there is a set of
peer modules that each know the Spine's URL, envelope shape and event names.

That means the work is a refactor with a clear shape, not a rescue.

## What the boundary looks like today

Five modules carry the Spine connection, none of them separated from the domain:

| File | What it holds |
|---|---|
| `src/server/spineSubscriber.ts` | SSE transport, reconnect, exponential backoff, the `Last-Event-ID` cursor, frame parsing, and the `undici.Agent` — one function, calling `fetch` inline |
| `src/server/sendCardReturned.ts` | a hand-built `card.returned` envelope and the POST that sends it, with its own copy of `SPINE_URL` and its default |
| `src/server/spineEventDispatch.ts` | routing by *wire* event name, plus the receiving span, plus outcome logging |
| `src/server/contractValidation.ts` | Ajv envelope and payload validation — but invoked *from* the application code, not at the boundary |
| `src/server/seatJoined.ts` | an Express route that is really an inbound Spine event, and which opens the SSE subscription as a side effect |

The clearest tell is `applyCardArrival(tableName, body: unknown)` in
`src/server/cardArrival.ts`. It accepts a raw envelope, runs Ajv against it, checks
`slugifyTableName(envelope.tableId) !== tableName`, sniffs whether
`name === "card.played-face-down"`, and only then places a tldraw shape.
`applyCardRemoval` (`src/server/cardRemoval.ts`) does the same and additionally filters on
`envelope.occurredIn !== "shuffler"` so the Tabletop's own sends don't bounce back at it.
Those are adapter responsibilities living inside application functions. The
`tableId`-matches-the-slug check alone is copy-pasted into three files.

Nothing here is wrong on its own terms. Each of those checks is correct and each is
commented with the reason it exists. The cost is that the domain code cannot be read, or
tested, without the wire format in scope.

## What the port should say

This is the real design work, and it is where the payoff is.

`CONTEXT-MAP.md` says the Tabletop's language is *the physics of Magic — card identity,
zone geography, gestures — never card meaning*. So the port must not say "event", and
must not say "card.played". Those are the Spine's published language, which is exactly
what an adapter exists to translate out of. The port should say things like: a card
**arrives** at a seat; a card **vanishes**; a seat's area is **set up**; a player
**pushes a card into the library portal**.

Notice what that collapses. `card.played`, `card.played-face-down` and `card.discarded`
are **three wire kinds carrying two physical facts**: a card lands on the Stack (face up
or face down), or a card lands in the graveyard. Today that fan-in is smeared across
three `Set` constants in `spineEventDispatch.ts`, the `isFaceDownEnvelope` sniff in
`cardArrival.ts`, and two near-identical `applyCard*` functions. Under a port it becomes
one arrival with a destination and a concealment flag, and the three-to-two translation
happens once, in the adapter, where it is visible and testable.

### One port, not two

The Shuffler has two ports because it has two capabilities — table administration
(`join/`) and the table's event bus (`events/`). The Tabletop participates in only the
event bus, so it wants **one port covering both directions**, the way the Shuffler's
`SpineEventsPort` does.

One wrinkle: the outbound leg must report **whether the send landed**. The library-portal
swallow (`src/client/shapes/cardSwallow.ts`) is send-then-commit — it deletes the card
shape only once the send is confirmed, and reverts the card's visuals if it isn't. So the
outbound port method returns success, and cannot be modelled as fire-and-forget.

### The naming question

Open, and worth deciding before any code moves. `SpineEventsPort` would be the lazy
choice; "event" is the Spine's word. Something like `TableTrafficPort` — cards arrive,
cards depart — is closer to what this ship actually thinks about. Decide this first: a
port is a vocabulary before it is an interface, and every other file in the refactor
quotes it.

## Three gateways, not two

The Shuffler needs two gateways under its events port, because a long-lived SSE stream
shares nothing with a one-shot POST. The Tabletop needs a third, because it has an
inbound transport the Shuffler doesn't: **the Spine POSTs `seat.joined` to us** at
`POST /api/tables/:tableName/events`.

That is an unusual gateway — driven rather than driving; it doesn't call the Spine, the
Spine calls it. It still belongs at the boundary: the Express handler becomes thin and
hands the raw envelope to the same adapter that the SSE stream feeds, so validation and
translation happen in exactly one place regardless of which pipe the event came down.

**Open question for Jess:** this ship's `CLAUDE.md` calls that route "SCAFFOLDING the
Spine absorbs". Is it converging onto the SSE stream? If it is, the port design should
assume a single inbound path and treat the route as a temporary second gateway that gets
deleted, rather than as a permanent part of the shape.

## The actual blocker: there is no composition point

This is the largest mechanical change, and it is prerequisite to everything else.

Every module here reaches for `getOrCreateRoom` — a module-level singleton registry in
`src/server/rooms.ts` — by import, and `seatJoined.ts` reaches for `subscribeToSpine` by
import too. Nothing in this ship can be *handed* an adapter, because nothing is
constructed anywhere; it is all wired by `import`. `SPINE_URL` is read in two separate
modules, each with its own duplicated `http://localhost:4600` default.

Until `src/server/server.ts` builds the adapter once and passes it down, "swap in a fake
adapter" is not expressible, and the port is decoration. Doing this first also fixes the
duplicated env-var default for free.

## The test-only HTTP route exists only because there is no port

`src/server/testSeedRoute.ts` is a route that ships to production behind
`ENABLE_TEST_SEED_ROUTE`, and exists so that specs can seed a card without a live Spine.
`test/cardArrival.test.ts` spawns an entire server to reach it.

That route is a seam carved through the HTTP layer to compensate for the absence of a
seam at the boundary. A port-level `FakeSpineTableAdapter` gives tests the same reach
without an HTTP hole in the production build, and retires both the route and the
server-spawning in those tests. This is one of the more concrete prizes in the whole
refactor, and worth naming in the spec so it doesn't get dropped as a nice-to-have.

Note the existing boundary tests are *good* and mostly survive: `test/spineSubscriber.test.ts`
and `test/sendCardReturned.test.ts` already stand up real `http.createServer` fake Spines.
Under P-A-G those become **gateway-level** tests, which is exactly where they belong.
What gets added is a second, port-level fake for the application tests — the same
two-levels-of-fakes arrangement the Shuffler's `DESIGN-layering.md` calls out as the
point of the pattern.

## Reconnect logic moves up

Following the Shuffler: the cursor, the `Last-Event-ID` protocol, the backoff and the
reconnect loop move into an **abstract adapter**, tested against a
`FakeSpineStreamGateway` that can emit a frame, end a stream, and drop a connection. The
HTTP gateway keeps only `fetch`, the `undici.Agent` with its bounded
`headersTimeout`/`bodyTimeout`, and the `data: <json>\n\n` frame parsing.

This is the part of `spineSubscriber.ts` that is currently untestable except against a
real socket, and it is the part most likely to harbour a bug, so the split earns its keep
immediately.

## Telemetry is load-bearing here — do not lose it

This ship's `CLAUDE.md` documents an SSE telemetry standard: **a receiving span for every
arriving event, then a doing-span nested inside it if the dispatcher actually acts.** The
receiving span continues the trace from the broadcast envelope's `traceparent` as a CHILD
span, so one Honeycomb trace covers publish-through-placement.

After the move, the receiving span belongs on the **adapter** side — "an event arrived
from the Spine" is a boundary fact — and the doing-span (`place arrived card`, `poof
returned card`) stays in the application. The `traceparent` is on the envelope, which the
adapter is the last thing to see, so it must extract and establish the context before
handing domain values inward.

Get `fleet-is-observable-review` on the plan before implementing. The span shape is
documented in two `CLAUDE.md` files and in the owner's knowledge base; changing where the
spans are opened without telling the owner is how those docs go stale.

## One more thing the adapter should absorb

Outbound envelope construction in `sendCardReturned.ts` is hand-rolled: `randomUUID()`,
`occurredAt`, `significance`, `origin`, `schemaVersion` all written inline. The Shuffler
has builders for this (`buildCardReturnedEvent` and friends in
`apps/shuffler/src/port-tabletop/types.ts`). There is no shared TypeScript package for
envelope construction — `contracts/` publishes JSON Schema only — so the Tabletop writing
its own builders is correct, not duplication to eliminate. It just belongs inside the
adapter rather than in a module the application calls directly.

## Recommended sequence

1. **Name the port.** Decide the Tabletop's own words for what crosses this boundary, and
   write the interface plus its domain types (an arriving card, a departing card, a seat
   setup). Nothing else can start until this is settled.
2. **Build the composition point** in `src/server/server.ts`: construct the adapter once,
   read `SPINE_URL` once, pass it down. Replace `seatJoined.ts`'s direct
   `subscribeToSpine` import.
3. **Move validation and translation** — Ajv, the `tableId`-matches-the-slug check, the
   `occurredIn: "shuffler"` filter, the event-kind sniffing — out of `cardArrival.ts`,
   `cardRemoval.ts` and `seatJoined.ts` into an abstract adapter.
4. **Split transport into gateways**: the SSE stream, the outbound POST, and the inbound
   `seat.joined` route. Reconnect and cursor logic move up into the abstract adapter.
5. **Add the port-level fake**, rewrite the application functions to take domain values,
   and retire `testSeedRoute.ts` wherever the fake now serves.

**Do the inbound side first, as its own pass** (dispatch, arrival, removal, seat setup),
and leave the outbound `card.returned` POST for a second pass. All the leakage is inbound;
the outbound side is one small function that is already nearly a gateway.

This is genuinely multi-session work, so by the repo's own size threshold it earns the
freight crane: `/to-spec`, then `/to-tickets`. Both are disable-agent-invocation, so Jess
has to invoke them.

---

# If the scope could be as broad as "rewrite the Tabletop"

The question was asked, so here is the honest answer, which is mostly an argument against
doing it — and then what I would actually do with that much licence.

## The size, so the question is grounded

About 4,900 lines of `src/` against about 7,100 lines of `test/`. That is a **small
ship with more test than code**. A rewrite is not physically daunting. That is precisely
why it is tempting and why it should be resisted in that form.

## Why a rewrite is the wrong instrument here

- **The tests are the asset, not the code.** A 1.45:1 test-to-source ratio, including
  Playwright verification and a self-tracing harness, is most of the accumulated value in
  this ship. A rewrite either throws them away or keeps them — and if it keeps them, it
  is a refactor with extra steps.
- **The hard-won knowledge is in the comments, and it is about other people's software.**
  Read what the docstrings actually say: Puma won't flush a streamed response's headers
  until the body's `each` yields; undici 8 silently breaks every `fetch` through a custom
  dispatcher; tldraw non-null-asserts every still-settling shape in a multi-select drag;
  a locked shape can never be a drop target; the `geo` shape's `font` prop is a closed
  enum so on-brand canvas text needs a self-rendering shape; tldraw ≥ 4 blanks an
  unlicensed HTTPS canvas after five seconds. **None of that knowledge is recoverable by
  rewriting.** It was paid for in production incidents and Honeycomb archaeology, and a
  rewrite rediscovers all of it at full price.
- **Most of the mass is tldraw's shape, not ours.** The five `Mtg*ShapeUtil` files and
  their hooks exist in the form tldraw dictates. Rewriting them produces different code
  in the same shape.
- **The layering problem is local.** It is confined to five server modules and the three
  application functions they leak into. A whole-ship rewrite to fix a boundary in a
  quarter of the server is a category error about where the problem lives.

## What I would actually do with that much licence

Not one rewrite. Three deliberate rewrites-in-place of specific things, plus one genuinely
new piece — each of which the port refactor is a prerequisite for anyway.

**1. Give the server a domain model instead of a room registry.** The deepest structural
problem is not the Spine boundary; it is that `rooms.ts` is a module-level `Map` of
mutable `RoomEntry` records with methods bolted on via `this`-bound free functions, and
every module mutates it directly — `entry.seenEventIds.add`, `playerArea.graveyardCount++`,
`entry.seats.set`. There is no **Table** object. A `Table` that owns its seats, its dedup
set, its Spine subscription and its zone geography — and exposes physics operations
(`aCardArrives`, `aCardLeaves`, `aSeatSitsDown`) rather than fields — would let the port's
inbound side call one method instead of five modules reaching into one struct. Note that
this is also the thing that makes the port's application side *small*: without it, the
"application layer" the adapter hands values to is still just loose functions over a
shared mutable map.

**2. Make the client's physics vocabulary real.** `src/client/usePhysicsAnnouncements.ts`
already names this ship's physics in its own language — `card.tapped`, `card.untapped`,
`card.flipped`, `card.turnedFaceDown`, `card.zoneMoved`, `counter.attached` — and then
sends them **only to Honeycomb, as spans**. That file is, accidentally, the vocabulary the
port has been missing: the outbound twin of the arrivals coming down the SSE stream. Today
exactly one physical gesture reaches the Spine (the library-portal swallow), by its own
bespoke route, while every other gesture a player makes is observable and otherwise
unsaid. The interesting move is to make those announcements a **first-class outbound port
with two adapters** — one that emits telemetry, one that tells the Spine — composed the
way `notes/PATTERN-port-adapter-gateway.md` describes composing adapters. That turns a
telemetry side-effect into the ship's actual outbound domain interface, and it is the
natural home for the Interpreter work described in `notes/DESIGN-the-table-vision.md`.

**3. Rewrite the seat-setup path, and only that path.** `seatJoined.ts` (228 lines) and
`tableFurniture.ts` (497 lines) are the least layered code on this ship: one Express
handler that validates a wire envelope, mutates the registry, opens an SSE subscription,
and mints a dozen tldraw shapes with inline geometry. If any single file deserves to be
rewritten rather than refactored, it is this pair — but as a scoped rewrite behind the new
port, not as part of a whole-ship one.

**4. Leave the client rendering alone.** `TablePage.tsx`, the shape utils, the drag and
drop and zone hit-testing carry the tldraw-specific knowledge above and are covered by an
owner (`owners/tabletop-shape-mechanics`). There is no layering win available there that
justifies disturbing them.

## The rule I'd apply

Every one of those four is reachable **incrementally, behind the port**, and each is
independently valuable and independently revertible. A rewrite bundles them into one
irreversible bet and adds the cost of rediscovering the tldraw, undici and Puma lore that
the current comments already record.

So: no rewrite. Take the port refactor as step one, then take the `Table` domain object as
step two — because that is the change a rewrite would be *for*, and it can be had without
one.
