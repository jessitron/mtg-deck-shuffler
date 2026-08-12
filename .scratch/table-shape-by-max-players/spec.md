# Spec: The Stack's shape is decided once, from the max players named at Shuffle Up

Mountain: spine-gathers-data
Ship: fleet
Status: ready-for-agent

## Problem Statement

The Stack is always a fixed 1000×1000 square, no matter how many seats end up
occupied (`apps/tabletop/src/server/cardLayout.ts`, `stackBounds()`). That size was
chosen so a full four-seat table's E/W player areas never overlap the N/S ones. In a
two-player game, only the S and N slots are ever used — the Stack's full width exists
purely to clear seats that were never going to sit there, and the board reads as
mostly empty space around two player areas.

Fixing this by resizing the Stack live as seats join is expensive: neither
`ensureStackDrawn` nor `ensurePlayerArea` ever redraws already-placed furniture, and a
live resize would have to reconcile geometry against cards a player has already
dragged onto the board — a new kind of mutation this codebase has deliberately never
built. Deciding the shape once, before anyone's placed a card, avoids that problem
entirely.

## Solution

At Shuffle Up, the first player to create a table also states the table's **max
players** (2–4). That number, not live join count, decides the Stack's shape once,
at table creation: 2 max players gets a narrower rectangle sized only for the S/N
slots that will ever be used; 3 or 4 max players gets today's square. The number
travels alongside `table-name`/`player-name` on the existing "Join a table" fields,
through the existing Shuffler→Spine join call and the existing Shuffler→Tabletop
`seat.joined` call, to whichever seat happens to create the table — later seats
joining the same table have their own guess ignored, exactly the way `ensureStackDrawn`
already ignores every seat after the first.

The Spine also records the number against the table it just created — not to enforce
it yet (that's later, and would need a design of its own for what a rejected join
looks like), but because a table's declared size is exactly the kind of
administrative fact Mountain 2 says belongs in the Spine's log, and storing it now
costs little and pays for the enforcement ticket whenever it comes.

If the first player guesses wrong, they start a new table. The world does not end —
this spec deliberately does not build any live reshaping for that case.

## User Stories

1. As a player creating a table at Shuffle Up, I want to say how many players will
   ultimately join, so that the Stack isn't sized for four when I know it'll only ever
   be two.
2. As a two-player table's first player, I want the Stack to be visibly smaller than
   today's square, so that the board isn't dominated by empty space neither of us will
   ever use.
3. As a three- or four-player table's first player, I want the Stack to look exactly
   like it does today, so that nothing changes for the table size the current
   geometry was already built for.
4. As a second (or third, fourth) player joining an existing table, I want my own guess
   at max players to be silently ignored once I've joined, so that the table's shape
   stays exactly what the first player set — no confusing mid-table change.
5. As a player who guessed max players wrong, I want no special error or recovery
   flow — just the option to start a new table — so that this stays a small feature
   instead of growing a reshape-in-place capability nobody asked for yet.
6. As Jess building toward the Interpreter, I want a table's declared max-player count
   recorded on the Spine's own log at table creation, so that "how big was this table
   supposed to be" is answerable from the Spine alone, the same way other
   administrative facts about a table are meant to be.
7. As Jess, I want the Spine to store this number without enforcing it yet, so that
   this ticket stays scoped to recording a fact, and the harder "what does a rejected
   join look like" design question stays its own future ticket.
8. As a developer reading `apps/tabletop/DESIGN.md`'s "square" section after this
   change, I want it to describe max-players-driven shape selection instead of "always
   1000×1000", so that the documented geometry matches the code.
9. As a developer touching `cardLayout.ts`'s disjointness invariant, I want the
   2-player rectangle geometry checked the same way the square already is, so that a
   narrower Stack can't accidentally let an S or N player area overlap it.
10. As a player, I want the "max players" question to offer only the values that are
    actually meaningful (2, 3, or 4) rather than free text, so that I can't produce a
    table size the layout code has no shape for.
11. As a developer reading `apps/shuffler/CLAUDE.md`'s Table Mode section after this
    change, I want it to mention the new max-players field alongside table
    name/player name, so that the documented prep-page fields match the form.
12. As a developer, I want the Spine's `tables` schema and the `table.created` event
    payload to carry the same max-players value, consistent with how `name` and
    `creator` already live in both places, so that the fact is queryable without
    replaying the log and durable in the log if the column is ever dropped.
13. As a developer picking up the eventual "Spine enforces the cap" ticket, I want the
    number already sitting on `tables` and in `table.created`, so that ticket is
    "add a check" against existing data, not "add a check and also go find somewhere
    to store the thing being checked."

## Implementation Decisions

- **The prep-page field is a bounded choice, not free text.** `views/partials/playmat-prepare.ejs`'s
  "Join a table" `<details>` gains a max-players control (2/3/4 only) alongside the
  existing `table-name`/`player-name` inputs — the bounded range means there's no
  invalid-number case to handle downstream. Stored on `PersistedGamePrep` the same way
  `tableName`/`playerName` already are, so it survives a page reload the same way.

- **`TableInfo` gains `maxPlayers`.** Threaded through `/start-game`'s existing calls —
  `joinSpineTableBestEffort` (the Spine bookkeeping call) and `sendSeatJoinedBestEffort`
  (the direct Shuffler→Tabletop call) both gain the field on their request/payload.
  No new call is introduced; this rides the two calls that already exist today, so it's
  decoupled from whether `.scratch/spine-in-the-middle/spec.md`'s single-call rework has
  landed yet — whichever join mechanism is current when this is implemented gains the
  field on whatever request shape it already has.

- **The Spine stores `maxPlayers` only at table creation, never after.** `Table.join!`'s
  `create_with_event!` path gains a `max_players` parameter, written once when a table
  is first created; the existing find-or-create-by-name path for a second+ join at the
  same table ignores whatever `maxPlayers` that later request carries — mirroring the
  Tabletop's own draw-once guard, so the "first joiner's number wins" rule holds
  identically on both sides rather than being enforced in only one place. The `tables`
  schema gains a `max_players` integer column (migration); `table.created`'s event
  payload gains a matching `maxPlayers` field, consistent with how `name`/`creator`
  already live as both column and event field. No enforcement: `Table::SEAT_NUMBERS`,
  `next_available_seat_number`, and `TableFull` are untouched — a table can still be
  joined past its declared max players today, exactly as it can be joined past 4 seats
  worth of shape assumptions today. That gap is intentional and tracked in Out of Scope.

- **`seat.joined`'s payload gains `maxPlayers`.** Required going forward. Since the
  schema has `additionalProperties: false`, this is a new contract version
  (`contracts/payloads/seat.joined.vN.json`) per `contracts/README.md`'s versioning
  rule — see Further Notes for a version-number collision this needs to check for at
  implementation time.

- **`cardLayout.ts`'s `stackBounds()` and `playerAreaOrigin()` take `maxPlayers`, not a
  fixed constant.** Two shape tiers: `maxPlayers` 3 or 4 get exactly today's 1000×1000
  square, unchanged. `maxPlayers` 2 gets a rectangle narrower on the E/W (x) axis than
  the square, sized only for the S/N slots' own clearance needs (no E/W areas will ever
  exist at this table, so the "exceed `PLAYMAT_H` so E/W never overlaps N/S" reasoning
  that sized today's square doesn't apply) — exact dimensions are the implementer's
  choice at build time, following the same edge-clearance reasoning ticket 14's "Built
  geometry" already used for the square, not fixed numbers here.

- **The Tabletop's in-memory table state gains the decided shape, set once.**
  Whatever in-memory structure already tracks a table's seats (the `entry` that
  `ensureStackDrawn`/`ensurePlayerArea` both close over) gains a `maxPlayers` (or
  derived shape) field, populated from the first `seat.joined` event's payload the
  table ever receives. `ensureStackDrawn` keeps its existing "only once, guarded by
  `entry.seats.size === 0`" behavior — the change is that the shape it draws now comes
  from that stored value instead of the `STACK_SIZE` constant.

- **`assertLayoutInvariants()`/`checkZonesDisjoint` run against both shapes, not just
  the square.** The module-load-time invariant check that currently only ever
  validates the fixed 1000×1000 case extends to also validate the 2-player rectangle,
  so a narrower Stack can't silently let an S or N player area's bounds touch it.

## Testing Decisions

- Tests exercise external behavior only — pure function inputs/outputs for the
  geometry, HTTP in/out for the ships — not internal method shapes, per the fleet's
  "no mocks, only fakes" rule.
- **Tabletop seam (primary): `apps/tabletop/test/cardLayout.test.ts`.** Extend with
  cases for `stackBounds(2)` (narrower rectangle) and `stackBounds(3)`/`stackBounds(4)`
  (identical to today's square, unchanged — a regression guard that this feature
  doesn't quietly change the 3/4-player case). Extend the disjointness assertions to
  run for `maxPlayers = 2` as well as the existing 3/4-seat cases.
- **Spine seam: extend `services/spine/test/integration/events_test.rb`'s style (or a
  new `join_test.rb`).** Cases: a first join with `maxPlayers: 2` stores `2` on the
  table row and on the `table.created` event payload; a second join at the same table
  name with a different `maxPlayers` value leaves the stored value unchanged (the
  "first joiner's number wins, second joiner's is ignored" rule, proven at the Spine
  layer the same way it's proven at the Tabletop layer).
- **Shuffler seam: a test on `/start-game`** (extending whatever test already covers
  that handler) asserting `maxPlayers` is forwarded on both the Spine join call and the
  Tabletop `seat.joined` call, and that the prep-page field round-trips through
  `PersistedGamePrep` the same way `tableName` already does.
- **Cross-ship proof: extend `apps/shuffler/test/verification/verify-tabletop-integration.spec.ts`**
  (already spawns a real Tabletop) to shuffle up with `maxPlayers: 2` and assert the
  Stack shape actually drawn on the Tabletop's canvas is the narrower rectangle, not
  the square — the one test that proves the whole path end to end rather than each
  ship's piece of it in isolation.
- Run each ship's existing unit suite (`bin/test` for the Spine, `npm test` for the
  Shuffler and Tabletop) plus the extended verification spec before calling this done.

## Out of Scope

- **The Spine enforcing the max-players cap** — rejecting a join once a table's
  declared max is reached. Storing the number now is explicitly to make that ticket
  cheaper later, not to build it now; what a rejected join even looks like (error page?
  redirect? a different seat?) is undesigned.
- **Any live reshaping** if reality diverges from the first player's guess — no
  "resize the Stack when a surprise third player shows up" capability. The stated
  recovery is "start a new table," accepted explicitly.
- **Surfacing a table's actual max-players back to a later joiner** whose own guess on
  the prep form differs from the table's real value — their guess is silently ignored;
  they're never told the table already committed to a different number.
- **A distinct shape for `maxPlayers = 3`** — 3 and 4 share today's square unchanged;
  only 2 gets a new shape.
- **The Spine→Tabletop notification architecture** — untouched by this spec either
  way; whether the current direct Shuffler→Tabletop `seat.joined` call or
  `spine-in-the-middle`'s planned single-call rework is what's live when this is
  implemented, `maxPlayers` rides whichever shape that call already has.
- **Per-viewer rotation** and the E/W "sideways" cosmetic quirk — untouched, tracked
  separately, unaffected by the Stack's shape.
- **Solo Mode** — no table exists, so no max-players question ever arises.

## Further Notes

- **Version-number collision risk.** `.scratch/spine-in-the-middle/spec.md` also plans
  to add a field to `seat.joined` (`gameUrl`, landing as v2). Whichever of these two
  tickets is implemented first claims v2; the other becomes v3. The implementing agent
  needs to check `contracts/payloads/seat.joined.v*.json` at build time rather than
  assuming a version number from either spec.
- **Mountain choice.** This is filed under `spine-gathers-data` (Mountain 2) because
  its most forward-looking piece is the Spine recording a genuinely new administrative
  fact about a table — but the problem it solves ("the Stack is too big in a
  two-player game") is a Mountain 1 layout complaint, the same territory
  `tabletop-table-layout`'s spec already covers. Both are true; Mountain 2 was chosen
  because storing the number is explicitly framed (per Jess) as "where we're going,"
  not just a means to the layout fix.
- Consult `owners/tabletop-shape-mechanics` before finalizing the plan — the
  disjointness invariant and the draw-once guard are exactly its territory, and this
  spec changes what both of them check against.
- Consult `owners/shuffler-looks-like-itself` on the new prep-page control (a 2/3/4
  choice next to `table-name`/`player-name`) — placement and appearance, not just
  wiring.
- Consult `owners/fleet-is-observable` on the new Spine migration and the new
  `seat.joined` contract version, following the same pattern as other schema/version
  bumps in this repo.
- `apps/tabletop/DESIGN.md`'s "square" section and "How a table comes into being"
  section, and `apps/shuffler/CLAUDE.md`'s Table Mode section, describe the current
  fixed-square, two-call reality in detail and will need updating once this lands —
  that's the implementing ticket's job, not a separate one.
