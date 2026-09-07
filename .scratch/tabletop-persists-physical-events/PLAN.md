# Implementation plan: Tabletop persists physical events

Hand this to an agent and say **"use subagents for the steps."**

Everything here is already decided. The agent's job is to run the phases in order, fan
each phase out to subagents where this plan says to, and stop at the checkpoints.

## What to read first

| Document | What it gives you |
| --- | --- |
| `.scratch/tabletop-persists-physical-events/spec.md` | The goal, 21 user stories, contract and testing decisions. **This is the authority on what gets built.** |
| `.scratch/tabletop-persists-physical-events/issues/*.md` | Ten tickets with acceptance checklists. 01–03 are done. |
| `apps/tabletop/notes/DESIGN-spine-projection.md` | Where the seams go, and why. Authority on *shape*, not on scope. |
| `apps/tabletop/CLAUDE.md` | The ship's commands, telemetry standard, gotchas. Read before touching it. |
| `contracts/README.md` | Envelope conventions and the Card Identity section every payload follows. |

The goal in one line: **the tldraw room stays the source of truth; the Tabletop sends its
physical events to the Spine until a projection of that log matches the live canvas, and
the gap is measured in production with the 😠 button.**

## Ground rules

- **Fakes, never mocks.** `snapshotCanvas` tests against a real in-memory tldraw editor —
  tldraw is cheap to construct and must not be faked.
- **Owner consults are not optional.** `owners/INDEX.md` lists them. Match the consult to
  the question, not to the file list — usually one owner, sometimes none. Every phase
  below names the ones it actually needs.
- **Telemetry discipline**: attributes on spans first; the ship's logger when there is no
  live span. Never `span.addEvent`.
- **Commit after each conceptual change**, tagged `- claude`. Subagents working in
  worktrees exit with `ExitWorktree({action: "keep"})` then `scripts/merge-worktree.sh
  <branch>`. Local main only — no push, no PR.
- **Delete newly-unused code**, especially CSS, after each change.

## The sequencing decision this plan makes

Tickets 04–09 each independently call for a contract payload, a send function, a
self-echo skip, dedup wiring, and a `TableState`/`projectEvents`/`snapshotCanvas`
extension. Written six times that is six near-identical send functions — and, more
urgently, **six subagents editing the same three files at once**: `TableState`, the
dispatch switch, and the self-echo filter. They would collide.

So Phase 1 builds that shared seam **once**, before the fan-out. This is deliberately the
*narrow* version of `DESIGN-spine-projection.md`'s step 1 — the vocabulary and one send
path. It is **not** the port refactor: no composition point, no `Table` object, no
gateways. Those stay deferred (see the last section).

## Phase 0 — Replay (ticket 10)

**One subagent. Starts immediately, runs alongside Phase 1.**

Ticket 10 is `needs-triage` and has no blockers, but it **blocks the diagnostic being
real**: ticket 03 shipped against a stub, so the 😠 button currently has no way to fetch a
table's actual event history. Until this lands, nothing in this plan can be verified
against a live game.

The ticket is deliberately underspecified — the Shuffler already knows how to replay a
table's log and that capability was never ported. The subagent investigates how the
Shuffler does it and decides the right shape for the Tabletop, rather than following a
prescribed design.

**Done when:** `projectEvents` can be handed a real table's event history, and the 😠
button runs on real data instead of a stub.

## Phase 1 — The shared seam

**One subagent. Blocks Phase 2. Keep it small.**

1. **The physics event vocabulary, as types.** One union covering every kind tickets
   04–09 will add, plus the inbound kinds already flowing. Check each against the six
   replayability rules in `DESIGN-spine-projection.md` — the two that bite hardest here
   are *move events carry prior **and** new position* (spec story 21, so the diff can
   catch a gap in the chain, not just an end-state mismatch) and *pairs are symmetric*.
2. **One outbound send path**, parameterized by kind, extending
   `sendCardReturned.ts`'s send-then-commit pattern. Envelope construction
   (`randomUUID`, `occurredAt`, `significance`, `origin`, `schemaVersion`) lives here
   once, not in six copies. It must report whether the send landed — the library-portal
   swallow depends on that.
3. **Self-echo and dedup applied once**, at the dispatch boundary: `occurredIn ===
   "tabletop"` skip, and dedup-by-event-id through the existing `spineEventDispatch.ts`
   path. Tickets 04–09 then inherit both instead of each re-implementing them.
4. **Extend `TableState` in one edit** to its full field set — position, tapped, face,
   concealment, and generic shapes — so the Phase 2 subagents never touch its shape.
   `projectEvents` and `snapshotCanvas` grow with it.
5. **The generic-shape rule** (from `DESIGN-spine-projection.md`): a shape with no
   dedicated event carries `id`, position, and its `ridesOn` parent hoisted out, with
   everything else quarantined in a field named `tldrawRecord`. **The domain may hold,
   move, reparent and delete that record; it may never read inside it.** The first time
   something needs to read inside, that shape has earned its own event kind — that is the
   promotion path, and it is how tokens and notes get modeled later.

**Consult:** `fleet-is-observable-context` before writing the send path — the receiving
span / doing-span nesting is load-bearing and documented in two `CLAUDE.md` files.

**Done when:** a new event kind can be added by writing a payload schema and one call
site, with self-echo, dedup, and `TableState` already handled.

**Checkpoint — stop and report to Jess before Phase 2.**

## Phase 2 — The event kinds, in parallel

**Four subagents at once.** Each reads the spec, its ticket, and the Phase 1 seam, then
works in its own worktree.

| Subagent | Tickets | Notes |
| --- | --- | --- |
| A | **04** `card.arrived`, then **05** `card.moved` | Sequential — 05 extends 04's position field. 04 wires the existing arrival hook; 05 wires `MtgCardShapeUtil.onTranslateEnd` / `handleTranslateEnd` in `cardZoneEntry.ts`. Do not add new hooks. |
| B | **06** `card.tapped` / `card.untapped` | Wires the existing `cardTapClick.ts` `handleCardClick`. No new UI. |
| C | **07** `card.flipped` + **08** `card.turnedFaceDown` | **Paired on purpose**: both need a new card-menu affordance and would collide in `CardContextMenu.tsx`. One agent, one affordance pass, two events. |
| D | **09** generic `shape.*` fallback | Implements the Phase 1 quarantine rule for real. Needs new hooks scoped to shape types with no dedicated event. |

**Subagent C must consult** `fleet-design-language-context` and
`tabletop-shape-mechanics-context` before designing the affordances, and the matching
`-review` skills on its plan. New player-visible UI is exactly their territory, and a
placement decision and a styling decision are two separate sign-offs.

**Everyone:** `significance` is `"domain"` for tap/untap, flip and face-down;
`"physical"` for arrived, moved and the generic shapes. Do not refine `card.moved`'s —
that is explicitly out of scope, blocked on "designated zone" in `notes/GLOSSARY.md`.

**Everyone:** `card.played` and `card.returned` are untouched. `card.arrived` is
additive — two origins, two events.

**Done when:** every gesture a player makes reaches the Spine's log, all tickets' checklists
are ticked, and `npm test` passes at the fleet root.

## Phase 3 — Convergence

**Solo, with Jess.** This is the actual point of the project and it is not a code step.

Run a real game. Push the 😠 button. Read the span in Honeycomb (environment
`mtg-deck-shuffler`) and look at `diagnostic.discrepancy_count` and
`diagnostic.discrepancy_kinds`. Every remaining discrepancy kind names a gesture that is
still unmodeled or an event that is still lossy. Fix, re-run, repeat until it trends to
zero.

Then, and only then, ticket 10's replay can be trusted for the "load an existing table by
replaying the log" feature — which is out of scope here and needs the
`TableState -> tldraw records` renderer that this plan does not build.

## Deliberately deferred

Not part of this plan. Revisit after the events are flowing, when the shape of the
repetition is visible in real code rather than predicted:

- The composition point in `src/server/server.ts` (construct adapters once, read
  `SPINE_URL` once).
- `WhatsHappeningPort` and `TableSurfacePort` proper, with their gateways.
- The `Table` domain object replacing the `RoomEntry` struct in `rooms.ts`.
- Deleting the `seat.joined` POST route now that the Spine has replay.
- Retiring `testSeedRoute.ts` behind a port-level fake.

All five are argued in `apps/tabletop/notes/DESIGN-spine-projection.md`. Phase 1 is
scoped so that none of them is made harder by doing the events first.
