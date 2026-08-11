# 03 — Shuffler: Leave a table

Mountain: tabletop-replaces-mural
Ship: shuffler
Status: ready-for-agent

**What to build:** A player who is currently table-associated can leave from the game
page's hamburger menu. If their `Table` zone is empty, leaving happens immediately with
no confirmation. If it's non-empty, a confirmation dialog appears first — reusing the
existing HTMX-modal pattern (`#modal-container` swap target, overlay + dialog div,
click-outside/Escape to close, `role="dialog" aria-modal="true"`), with the text "Leave
table? This cannot be undone." Confirming proceeds with the leave; cancelling closes the
dialog with no effect.

Leaving calls through to the Spine's seat-release capability (built in ticket 01) —
check the current shape of the join/leave call path first, since it may have changed to
have the Spine orchestrate telling the Tabletop rather than the Shuffler doing it
directly. Whatever that shape is, leaving is **not** best-effort: if the release call (or
whatever downstream signal is required to complete it) fails for any reason — including a
partial failure where the seat released but a downstream step didn't — the whole leave is
treated as failed. The player remains table-associated locally and sees an error. One
consistent, honest answer, never a confusing half-success.

On a successful leave, the Shuffler clears `tableName`/`playerName`/`seatId`/
`spineTableId`/`spineSeatNumber` on the persisted game state (already-optional fields, no
persistence version bump needed). The player's own local `Table` zone is deliberately
**not** cleared — they keep seeing exactly the cards they had, since leaving a table is a
social/connectivity change, not a change to the game itself.

**Blocked by:** 01 — Spine: seat-release capability + `seat.left.v1` contract event (this
ticket calls that capability; it doesn't need Tabletop cleanup (02) to be correct on the
Shuffler side).

**Status:** ready-for-agent

- [ ] "Leave table" item appears in the hamburger menu only when currently
      table-associated
- [ ] Leaving with an empty `Table` zone happens immediately, no dialog
- [ ] Leaving with a non-empty `Table` zone shows a confirmation dialog with the exact
      text "Leave table? This cannot be undone."; cancel closes it with no effect
- [ ] Confirming releases the seat at the Spine and clears the table-association fields
      on persisted state; the local `Table` zone is untouched
- [ ] Any failure (including partial failure) leaves the player table-associated
      locally and shows an error — never a silent or half-succeeded leave
- [ ] Browser verification extends the `verify-table-mode.spec.ts` pattern
      (`seedPrep`/`startGame` helpers) covering: menu visibility, no-confirm-when-empty,
      confirm-modal-when-nonempty (exact text), and the failure path
