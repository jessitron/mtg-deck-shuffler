# Implementation plan: the Tabletop tells the Spine what happened

## The goal

The tldraw room stays the source of truth. The Tabletop starts sending every physical
gesture to the Spine's log, and a projection of that log gradually converges on the live
canvas. The gap is measured **in production, during real games**, by pushing the 😠 button
and reading the span.

It is expected to start wrong. The work is to close the gap one gesture at a time.

## What to read

| Document | Read it for |
| --- | --- |
| `apps/tabletop/notes/DESIGN-spine-projection.md` | Where the seams go and why. The shape of the whole thing. |
| `apps/tabletop/CLAUDE.md` | Commands, the SSE telemetry standard, the ship's gotchas. |
| `contracts/README.md` | Envelope conventions and the Card Identity section every payload follows. |
| `.scratch/tabletop-persists-physical-events/spec.md` | **Decisions already made** — payload significance, the two-origins split, testing choices. Mine it for what's settled; it is not a work breakdown and its issue files are not the unit of work. |

Three decisions from that spec:

- **`card.played` and `card.returned` are untouched.** A card landing on the canvas gets a
  *new* `card.arrived` event, because two different origins are involved: the Shuffler
  decides a card is played and has no canvas position; the Tabletop decides where it
  lands. Two origins, two events.
- **Move events carry the prior position as well as the new one**, so the diagnostic can
  catch a gap in the chain — a move whose "from" doesn't match where the last move left
  the card — not only a final mismatch.
- **`significance` is `"domain"`** for tap/untap, flip and face-down (they are always
  game-significant), **`"physical"`** for arrivals, moves and generic shapes. Do not try
  to refine `card.moved`'s: that is blocked on "designated zone" being pinned down in
  `notes/GLOSSARY.md`.

## Ground rules

- **Fakes, never mocks.** The `TableState` snapshot tests against a real in-memory tldraw
  `TLSocketRoom` — tldraw is cheap to construct and must not be faked.
- **Application tests fake the adapter. Only adapter tests fake a gateway.**
- **Owner consults**: `owners/INDEX.md`. Match the consult to the question, not to the
  file list — usually one owner, sometimes none. The phases below name the ones that
  actually apply.
- **Telemetry**: attributes on spans first; the ship's logger when there is no live span.
  Never `span.addEvent`.
- **Commit after each conceptual change**, tagged `- claude`. Local main only — no push,
  no PR.
- **Isolation, and how it differs for you and for a subagent.** Working in this session:
  `EnterWorktree`, then `ExitWorktree({action: "keep"})` and
  `scripts/merge-worktree.sh <branch>`, which runs the full fleet gate before merging.

  **`EnterWorktree` refuses for a subagent** — subagents run with a pinned cwd. A subagent
  does it by hand instead:

  ```
  git worktree add -b <branch> .claude/worktrees/<branch>
  # …work, commit…
  # from the repo root, on main:
  git merge --no-ff <branch>
  git worktree remove .claude/worktrees/<branch>
  ```

  **A subagent taking that path must run the fleet suite itself before merging** — `npm test`
  from the root, `npx vitest run` in `apps/tabletop`, and the Spine's Ruby tests if it
  touched Ruby. `merge-worktree.sh` is what normally runs that gate, and the manual path
  skips it. Do not merge on a red suite. (Phase 2 spawns four subagents in parallel; each
  needs its own branch name.)
- **Delete newly-unused code**, especially CSS, after each change.

## Why the ports come first

They are a prerequisite, not a cleanup afterwards.

Outbound is a two-hop path today: the client `fetch`es a Tabletop Express route
(`cardSwallow.ts:97` → `/api/tables/:slug/cards/return`), and that route calls
`sendCardReturnedToSpineBestEffort`, which builds its own envelope and POSTs to the Spine.
Add six gestures that way and you get **six new Express routes, six client fetches and six
send functions** — every one a fresh instance of the structure the port exists to collapse,
written onto the layering we are trying to remove.

With the port, one endpoint accepts the physics-event union and each gesture is a payload
schema plus a call site. **The port makes the gesture work smaller.**

And much of it already exists unnamed: `TableState` *is* `TableSurfacePort`'s domain model,
and its read-side adapter is a read off `room.getCurrentSnapshot().documents` — which
`hasInstance` and `stackCardCount` in `src/server/rooms.ts` already do, one field at a
time. Naming them is most of the job.

(`snapshotCanvas(editor)` is today's version of that read, but it lives in
`src/client/` and reads a client `Editor`. **The diff runs on the server** — decided
2026-09-07; see the section of that name in `DESIGN-spine-projection.md`. So this
function moves to the server as part of Phase 1 rather than being kept where it is.)

---

## Phase 1 — The ports

Read `DESIGN-spine-projection.md` and the fleet's `notes/PATTERN-port-adapter-gateway.md`.
The Shuffler's landed version (`apps/shuffler/notes/DESIGN-layering.md`,
`apps/shuffler/src/port-spine/`) is the worked example.

### 1. The vocabulary

One union covering every gesture below plus the inbound kinds already flowing. Both ports
quote it, so nothing else starts until it is settled. Check each kind against the six
replayability rules in the design doc — removals exist, geometry travels, identity is by
reference, creation carries a payload, pairs are symmetric, nothing is dropped on unmount.

### 2. The composition point

`src/server/server.ts` constructs the adapters once and passes them down; `SPINE_URL` is
read in one place instead of two with duplicated `http://localhost:4600` defaults. Until
this exists, "hand it a fake adapter" is not expressible and the ports are decoration.

### 3. `WhatsHappeningPort` — the Spine, both directions

- **Inbound:** move Ajv validation, the `slugifyTableName(envelope.tableId) !== tableName`
  check (copy-pasted into three files today), the `occurredIn` self-echo filter and the
  event-kind sniffing out of `cardArrival.ts`, `cardRemoval.ts` and `seatJoined.ts` into an
  abstract adapter. Self-echo and dedup-by-event-id are applied **once, here**, so every
  gesture inherits them.
- **Outbound:** one path parameterized by kind. Envelope construction (`randomUUID`,
  `occurredAt`, `significance`, `origin`, `schemaVersion`) lives here once. It must report
  whether the send landed — the library-portal swallow is send-then-commit and reverts the
  card's visuals when it fails.
- **The client→server hop is part of this port.** One endpoint that accepts a physics event
  from the browser, so gestures add call sites rather than routes.
- **Gateways:** the SSE stream and the outbound POST. Reconnect, backoff, the
  `Last-Event-ID` cursor and frame parsing move up into the abstract adapter; the gateway
  keeps only `fetch`, the `undici.Agent` with its bounded timeouts, and `data: <json>\n\n`
  parsing. `test/spineSubscriber.test.ts` and `test/sendCardReturned.test.ts` become
  gateway tests, which is where they already belong.
- **Delete the `seat.joined` POST route.** The Spine has replay, so `seat.joined` is just
  another event in the stream and the subscription can open when a client does. This
  *removes* a gateway. `apps/tabletop/CLAUDE.md` calls the route "SCAFFOLDING the Spine
  absorbs" — update it.
- **Add the port-level fake** and retire `testSeedRoute.ts` wherever it now serves. That
  route is an HTTP hole in the production build that exists only because there was no seam
  at the boundary.

### 4. `TableSurfacePort` — tldraw sync

Mostly naming what exists.

- Extend `TableState` to its full field set — position, tapped, face,
  concealment, generic shapes — so no Phase 2 subagent ever touches its shape.
  `projectEvents` and the room snapshot grow with it.
- **Move the snapshot to the server.** `src/client/snapshotCanvas.ts` becomes
  `snapshotRoom(entry) -> TableState`, reading `room.getCurrentSnapshot().documents`
  instead of `editor.getCurrentPageShapes()`; `test/snapshotCanvas.test.ts` moves with it
  and becomes a room test shaped like `test/updateStore.test.ts`. This is the read side of
  `TableSurfacePort`.
- **The generic-shape rule:** a shape with no dedicated event carries `id`, position and
  its `ridesOn` parent hoisted out; everything else is quarantined in a field named
  `tldrawRecord`. **The domain may hold, move, reparent and delete that record; it may
  never read inside it.** The first time something needs to read inside, that shape has
  earned its own event kind — that is how tokens and notes get modeled later.
- The write side (`TableState -> tldraw records`) is not built here.

**Consult:** `fleet-is-observable-context` before moving any span, `-review` on the plan,
`-update` after. The receiving-span / doing-span nesting is load-bearing and documented in
two `CLAUDE.md` files; after the move the receiving span belongs on the adapter and the
doing-span stays in the application.

**Done when:** Ports and application code are in Table's vocabulary, not Spine or HTTP or tldraw-sync. (Shapes and client code still use TLDraw concepts.) Tests use fake adapters, not fake HTTP servers. (Tests of the adapters can use fake gateways.) 

**Checkpoint — stop and report to Jess.**

## Phase 2 — The gestures

**Four subagents in parallel**, each in its own worktree. Each publishes a payload schema
under `contracts/payloads/`, registers it for validation on the Spine
(`services/spine/lib/event_contract.rb` — schema registration only, no Ruby logic), wires
the call site, and extends `projectEvents` with a test.

| Subagent | Gestures | Where it hooks |
| --- | --- | --- |
| A | a card **arrives**, then a card **moves** | Sequential: moves extend the position field arrivals introduce. Existing arrival hook, then `MtgCardShapeUtil.onTranslateEnd` / `handleTranslateEnd` in `cardZoneEntry.ts`. **Do not add new hooks.** |
| B | a card **taps** and **untaps** | Existing `cardTapClick.ts` `handleCardClick`. No new UI. |
| C | a card **flips**; a card **turns face down** and back up | **Paired deliberately** — both need a new card-menu affordance and would collide in `CardContextMenu.tsx`. One agent, one affordance pass, two gestures. |
| D | **everything else on the canvas** — created, moved, removed | The generic fallback, scoped to shape types with no dedicated event. Implements Phase 1's quarantine rule for real, so the freeform layer stops being a blind spot. |

**Subagent C consults** `fleet-design-language-context` and
`tabletop-shape-mechanics-context` before designing the affordances, and the matching
`-review` skills on its plan. New player-visible UI is their territory, and placement and
styling are two separate sign-offs.

**Done when:** every gesture a player makes reaches the log, and `npm test` passes at the
fleet root.

## Phase 3 — Convergence

**With Jess.** This is the point of the project and it is not a coding step.

**Prerequisite, and it is coding:** the 😠 button is a stub today — it emits a
`diagnostic button clicked` span and nothing else. It must become a POST to a Tabletop
route that runs `diffTableStates(projectEvents(log), snapshotRoom(entry))` and mints the
span server-side, with the state dumps attached. Until that lands there is nothing to
read. It needs the log retained server-side, so it follows the inbound port.

Play a real game. Push the 😠 button. Read the span in Honeycomb (environment
`mtg-deck-shuffler`): `diagnostic.discrepancy_count` and `diagnostic.discrepancy_kinds`.
Every remaining kind names a gesture still unmodeled or an event still lossy. Fix, re-run,
repeat until it trends to zero.

## Deferred

- **The `Table` domain object**, replacing the mutable `RoomEntry` struct in
  `src/server/rooms.ts` that every module reaches into directly
  (`entry.seenEventIds.add`, `playerArea.graveyardCount++`, `entry.seats.set`). Agreed to
  follow the port extraction; genuinely separable, since the outbound physics path never
  touches the room registry. Phase 1 leaves it strictly easier — a `Table` will hold a
  `TableSurfacePort` rather than a raw `TLSocketRoom`.
- **`TableState -> tldraw records`**, the write-side renderer, and the "load a table by
  replaying its log" feature it enables — including the animated catch-up.
