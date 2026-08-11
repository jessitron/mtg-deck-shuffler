# 04 — Shuffler: Join a table from the game page

Mountain: tabletop-replaces-mural
Ship: shuffler
Status: ready-for-agent

**What to build:** A player who isn't yet table-associated, and whose own `Table` zone is
empty, can join a table from the game page's hamburger menu — without restarting their
game. A new "Join a table" menu item sits alongside Restart Game / Choose Another Deck /
Home. It's shown whenever the player isn't already table-associated; when their `Table`
zone is non-empty it's shown but disabled, with inline text explaining why (e.g. "clear
the table first").

The join form uses the same table-name + player-name fields as prep's existing "Join a
table" disclosure. Submitting via HTMX updates the *existing* game/persisted state
in-place — sets `tableName`/`playerName`/`seatId` (and whatever Spine identifiers result)
— and sends the join to the Spine (and, depending on the current shape of the join-call
architecture, to the Tabletop). Deck, hand, library, and the table zone are completely
undisturbed.

Unlike the existing prep-screen join (`joinSpineTableBestEffort`, which swallows all
Spine join failures), this new entry point must surface errors: a full table (all 4 seats
taken) shows a Shuffler-authored friendly message, not the Spine's raw error text; any
other failure shows the underlying error message as-is. Duplicate player names across a
table are never treated as an error — nothing here validates or rejects on name
collision. The existing prep-screen join flow's error-swallowing is explicitly left
untouched by this ticket.

**Blocked by:** None — can start immediately, independent of tickets 01–03.

**Status:** ready-for-agent

- [ ] "Join a table" menu item is shown only when not currently table-associated
- [ ] When the `Table` zone is non-empty, the item is shown disabled with inline
      explanatory text
- [ ] The join form reuses prep's table-name/player-name fields
- [ ] Submitting joins in-place (no restart): deck, hand, library, and table zone are
      undisturbed; table-association fields get set on the existing persisted state
- [ ] A full table shows a Shuffler-authored friendly message, not the Spine's raw error
- [ ] Any other join failure shows the underlying error message as-is
- [ ] Sharing a player name already in use at the table is never rejected
- [ ] The existing prep-screen join flow (`joinSpineTableBestEffort`) is unchanged
- [ ] Browser verification extends the `verify-table-mode.spec.ts` pattern covering:
      menu item visible/disabled states, the join modal/form, a successful join, the
      table-full message, and the show-underlying-error path
