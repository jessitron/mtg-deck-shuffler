# Leave a table, and join one from the game page

Mountain: tabletop-replaces-mural
Ship: fleet
Status: ready-for-agent

Grilled with Jess 2026-08-11. All decisions below were reached in that session; this
document synthesizes them — it mints nothing new. Promotes `TODO.md`'s
"Let a player exit the table" item, which flagged the real open question (what
happens to the leaving player's cards) as a game-design call, not plumbing — that call
is made below.

## Problem Statement

A player can only join a table during deck prep, before Shuffle Up — if they forget, or
decide mid-game they want to play at a table after all, there's no way to do it without
abandoning their current game and starting over. And once seated, there's no way to
leave at all: a seat taken at a Spine table is permanent, so a player who wants to walk
away — or rejoin with a different deck — leaves that seat permanently occupied,
eventually exhausting all 4 of a table's seats for good.

## Solution

Two new actions on the game page, both reached from the existing hamburger menu:

- **Join a table**, available whenever the player isn't already at one and their table
  (the cards in the `Table` zone) is empty. Same table-name/player-name fields as
  today's prep-screen join, but it updates the game already in progress instead of
  starting a new one.
- **Leave a table**, available whenever the player is currently at one. If their table
  is empty, leaving happens immediately. If it isn't, a confirmation dialog warns that
  leaving cannot be undone before it proceeds.

Leaving actually releases the seat at the Spine (a new capability — no seat-release
logic exists today) and tells the Tabletop to remove that player's cards from the
shared canvas. The Shuffler's own view of "cards on the table" is untouched by leaving
— matching the physical metaphor that your cards stay right where you left them on a
real table until someone clears them.

## User Stories

1. As a player who forgot to fill in the table name before clicking Shuffle Up, I want
   to join a table from the game page, so that I don't have to restart my game just to
   play at a table.
2. As a player deciding mid-game that they want to play with friends after all, I want
   to join a table without losing my current deck, hand, library, or board state.
3. As a player, I want the "Join a table" option to be unavailable (but visible, with an
   explanation) while I still have cards on the table, so that I understand why I can't
   join yet rather than wondering where the option went.
4. As a player who hasn't played any cards yet, I want to join a table using the same
   table-name and player-name fields I'd use during prep.
5. As a player trying to join a table that already has 4 seats taken, I want a plain,
   friendly message telling me the table is full, so that I understand a known,
   expected condition rather than seeing a raw error.
6. As a player hitting some other join failure (a dropped connection, an unexpected
   Spine error), I want to see what actually went wrong, so that I'm not left guessing.
7. As a player at a table with an empty battlefield, I want leaving to happen instantly
   with no confirmation, so that walking away costs nothing when I have nothing at
   stake.
8. As a player at a table with cards still on the battlefield, I want a confirmation
   dialog before I leave, so that I don't accidentally abandon a table mid-play.
9. As a player reading the leave-confirmation dialog, I want to know plainly that
   leaving cannot be undone, so that I can decide with full information.
10. As a player who leaves a table, I want my seat released at the Spine, so that the
    table's seat count reflects reality and someone else (or I, later) can take it.
11. As a player who leaves a table, I want the cards I had on the shared Tabletop canvas
    removed from it, so that other players aren't left looking at an orphaned pile that
    belongs to nobody.
12. As a player who leaves a table, I want my own local "cards on the table" to remain
    exactly as they were, so that my own solo view of the game continues uninterrupted
    — leaving the table doesn't mean abandoning my game.
13. As a player, I want leaving to fail loudly (not silently) if the Spine seat-release
    or the Tabletop cleanup signal doesn't succeed, so that I never wrongly believe I've
    left when I haven't.
14. As a player attempting to leave when the underlying calls only partially succeed
    (e.g. the seat releases at the Spine but the Tabletop was never told), I want the
    whole action treated as failed and to stay at the table locally, so that I get one
    consistent, honest answer rather than a confusing half-success.
15. As a developer maintaining the existing prep-screen join flow, I want this feature
    to leave that flow's known error-swallowing behavior alone, so that this spec's
    scope stays bounded to the new game-page actions.
16. As a player, I want to be able to share a player name with someone else at the same
    table without being rejected, so that name collisions are never treated as an
    error condition.

## Implementation Decisions

### Scope: full seat release, not a local-only flag clear

This is genuinely cross-ship: a new Spine seat-release capability, a new contract
event, and Tabletop-side cleanup — not just clearing fields on the Shuffler's own
persisted game/prep state. A seat that can never be released defeats the purpose of
"leave," since a table only has 4 seats total.

### Join a table (from the game page)

- **Gate**: only offered when the player is not already table-associated, and their own
  `Table` zone is empty (`GameState.listTable().length === 0` / `isOnTable()`). This
  mirrors the existing gate reasoning for prep's join, extended to mid-game.
- **UI**: a new "Join a table" item in the hamburger menu
  (`formatEndGameActionsHtmlFragment` in `game-menu.ts`), alongside Restart Game /
  Choose Another Deck / Home. Shown only when not currently table-associated; when the
  `Table` zone is non-empty, shown but disabled, with inline text explaining why (e.g.
  "clear the table first").
- **Fields**: the same table-name + player-name inputs used in prep's "Join a table"
  disclosure (`playmat-prepare.ejs`).
- **Mechanics**: an in-place update, not a page/game restart. Submits via HTMX, sets
  `tableName`/`playerName`/`seatId` (and whatever Spine identifiers result) on the
  *existing* game/persisted state, and sends the join to the Spine (and, depending on
  the join-call architecture at build time — see Further Notes — to the Tabletop).
  Deck, hand, library, and the (necessarily empty) table zone are completely
  undisturbed.
- **Errors**:
  - Table full (all 4 seats taken) is a known, expected condition — show a
    Shuffler-authored friendly message, not the Spine's raw error text.
  - Any other failure — show the underlying error message as-is.
  - Duplicate player names across a table are explicitly *not* an error condition;
    players may share a name. Nothing in this feature validates or rejects on name
    collision.
- **Explicitly not fixed here**: the existing prep-screen join flow
  (`joinSpineTableBestEffort` in `sendToSpine.ts`, used by `/start-game` and
  `/restart-game`) currently swallows *all* Spine join failures identically — including
  a full-table rejection — and silently proceeds as if nothing happened. That's the
  same underlying bug this spec's join-error handling fixes for the new game-page
  entry point, but prep's existing behavior is deliberately left untouched. See Out of
  Scope.

### Leave a table

- **Gate**: none. Leaving is always available once table-associated, regardless of
  what's on the battlefield.
- **UI**: a new "Leave table" item in the hamburger menu, shown only when currently
  table-associated.
- **Confirmation**:
  - If the player's `Table` zone is currently empty, leaving happens immediately — no
    dialog.
  - If it's non-empty, a confirmation dialog appears first, reusing the existing
    HTMX-modal pattern (`#modal-container` swap target, overlay + dialog div,
    click-outside/Escape to close, `role="dialog" aria-modal="true"` — see
    `card-modal.ejs`/`library-modal.ejs`). Text: **"Leave table? This cannot be
    undone."** Confirm proceeds with the leave; cancel closes the dialog with no
    effect.
  - No messaging about the freed seat possibly being taken by someone else before
    rejoining — players at a table coordinate verbally, and this isn't treated as a
    risk worth calling out.
- **Effects of leaving**:
  - The Spine releases the seat — a new capability that doesn't exist today (seats are
    currently permanent once taken). This frees that seat number for reuse via the
    Spine's existing `next_available_seat_number` assignment logic.
  - The Tabletop is told to delete every shape belonging to that player's seat/position
    from the shared canvas.
  - The Shuffler's own local `Table` zone for this player is **not** cleared as part of
    leaving. The player continues to see exactly the cards they had on the table in
    their own solo view — leaving the table is a social/connectivity change, not a
    change to the game itself.
- **Failure handling**: not best-effort. If either the Spine seat-release call or the
  Tabletop cleanup signal fails, the whole leave is treated as failed: the player
  remains table-associated locally and sees an error — even in a partial-failure case
  where, say, the Spine side actually released the seat underneath but the Tabletop
  was never told. One consistent answer, not a partial/confusing state.

### Contract change

A new event kind is needed for the seat-release — no `seat.left`/`player.left`/
`seat.vacated` event exists today (only `table.created.v1`, `seat.taken.v1`,
`seat.joined.v1`, `card.played.v1`). Follow the existing payload conventions in
`contracts/README.md`: a new `payloads/seat.left.v1.json` file, envelope carries "who"
via `initiator` (as `seat.joined.v1` already does), the payload itself carries only
what changed. Validated on both the Spine and the Shuffler/Tabletop sides, failing
loudly (not best-effort) on an unknown name/version, per the existing house rule.

### Spine changes

- `Table`/`Seat` models need a release/leave capability analogous to today's
  `take_seat!` (e.g. releasing a seat by table + seat identity), which deletes the
  `Seat` row (freeing its seat number) and mints the new `seat.left` event via the
  existing `append_event!` path.
- A new Roda route analogous to today's `r.post "join"`, following the same
  rescue/response-shape convention already used there (specific rescued exceptions →
  meaningful JSON error bodies with real HTTP status codes, not a generic 500).

### Tabletop changes

On receiving the new seat-departure event (via whatever channel `seat.joined` arrives
on today), delete all shapes belonging to that seat/player's position from the shared
canvas.

### Shuffler changes

- New routes for the join-from-game-page and leave-table actions, following the
  existing route conventions in `app.ts` (naming/shape decided at ticket-writing time).
- New conditional menu items in `game-menu.ts`'s `formatEndGameActionsHtmlFragment`.
- A new confirmation-modal partial (or an extension of the existing modal partials),
  following the established `card-modal.ejs`/`library-modal.ejs` shape.
- Clearing `tableName`/`playerName`/`seatId`/`spineTableId`/`spineSeatNumber` on leave —
  these are already-optional fields on `PersistedGamePrep`/`PersistedGameState` (per
  `apps/shuffler/CLAUDE.md`'s Table Mode notes), so no persistence version bump is
  needed.

## Testing Decisions

- Fakes only, never mocks — the repo's house testing rule
  (`apps/shuffler/CLAUDE.md`, reiterated in prior specs).
- The highest usable seam is the browser for anything UI-observable — menu item
  visibility/disabled states, modal text, confirm/cancel behavior, cards
  appearing/disappearing on the Tabletop canvas. Prior art:
  `apps/shuffler/test/verification/verify-table-mode.spec.ts` (prep's join disclosure,
  the game page's table-mode link, restart carrying table info forward via the
  hamburger menu) — extend this pattern (its `seedPrep`/`startGame` helpers) for:
  - joining from the game page: menu item visible/disabled states, the join
    modal/form, a successful join, the table-full friendly message, and the
    show-underlying-error path for other failures.
  - leaving a table: the menu item's visibility, the no-confirm-when-empty path, the
    confirm-modal-when-nonempty path (including its exact "cannot be undone" text),
    and the failure path that leaves the player table-associated with an error shown.
- Tabletop-side cleanup: extend or add a spec alongside
  `apps/tabletop/test/verification/verify-seat-joined.spec.ts` (its seat-arrival
  counterpart) verifying a departed player's shapes are removed from the canvas.
- Spine-side seat-release logic: internal Ruby model behavior, best tested at the model
  layer per the existing pattern in `services/spine/test/models/table_test.rb` — one
  behavior per `test_...` method, `assert_raises` per invariant (mirroring
  `SeatOccupied`/`TableFull`/`NameTaken`), plus a dedicated event-shape assertion test
  (mirroring the existing `seat_taken`-event-shape test) for the new `seat.left` event.
- Per `docs/agents/coding-standards.md`: any literal shared across ≥2 spec files (a
  modal test-id, a fixture marker string) must be exported as a named constant from the
  production code that defines it, not hand-copied into each spec.

## Out of Scope

- Fixing the existing prep-screen join flow's silent swallowing of all Spine join
  errors (`joinSpineTableBestEffort`). Same underlying bug class as this spec's
  join-error handling, but explicitly left alone here — a separate, pre-existing issue.
- Any messaging or UI for what the *other* players seated at a table see when someone
  leaves, beyond the Tabletop's automatic removal of that player's shapes. No toast, no
  notification to remaining players.
- Any handling of "someone else grabs the freed seat before I rejoin" — explicitly
  decided as not a concern; players coordinate verbally.
- A combined "switch tables" gesture (leave one, join another, in one action). A player
  who wants to switch does two separate actions.
- Changing seat-number assignment logic — the existing
  `next_available_seat_number` behavior is reused as-is once a seat is freed.
- Redesigning the join-call architecture between the Shuffler, Spine, and Tabletop.
  See Further Notes — this spec assumes whatever that shape is at implementation time.

## Further Notes

**Architecture in flux, and this spec doesn't hard-code today's shape.** As of this
writing, joining calls the Spine best-effort (`joinSpineTableBestEffort`, catching and
swallowing every error) and separately sends a required message to the Tabletop
(`sendSeatJoinedBestEffort` — despite the name, treated as the message that must land).
Jess expects this to change before this feature is implemented, with the Spine becoming
the orchestrator: the Shuffler calls the Spine, and the Spine is responsible for
telling the Tabletop, rather than the Shuffler making two independent calls. None of
this spec's decisions depend on today's specific call shape — "report join/leave
failures to the player rather than swallowing them" and "treat a partial failure as a
total failure" should hold regardless of whether that ends up being one call or two.
Whoever picks up implementation should check the current shape of the join/leave call
path first, rather than building against what's described here as "today."

**Terminology**: "cards on the table" means cards whose location is the `Table` zone —
`GameState.listTable()` / `isOnTable()` — not a separate concept. There is no "table
zone count" as a named thing in the domain; it's just the size of that zone.
