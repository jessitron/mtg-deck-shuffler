# 04 — Shuffler: max-players field wired end-to-end

**What to build:** The prep page's "Join a table" `<details>`
(`views/partials/playmat-prepare.ejs`) gains a max-players control — a bounded choice of
2, 3, or 4, defaulting to 4 to match today's behavior for anyone who doesn't touch it —
alongside the existing `table-name`/`player-name` inputs. It's stored on
`PersistedGamePrep` the same way `tableName`/`playerName` already are, so it survives a
page reload. `TableInfo` gains `maxPlayers`, threaded through `/start-game`'s existing
`joinSpineBestEffort()` call (`src/port-spine/sendToSpine.ts`) — the field rides that
single call's request payload to both the Spine join call (ticket 02) and the Tabletop
`seat.joined` call (ticket 03); no new call is introduced. `apps/shuffler/CLAUDE.md`'s
Table Mode section is updated to mention the new field alongside table name/player name.

Consult `owners/shuffler-looks-like-itself` on the new prep-page control's placement and
appearance before finalizing the plan.

**Blocked by:** 02, 03

**Status:** ready-for-agent

- [ ] Prep page offers a bounded 2/3/4 max-players choice (no free text), defaulting to 4
- [ ] The choice round-trips through `PersistedGamePrep` across a page reload, the same
      way `tableName` does
- [ ] `maxPlayers` is forwarded on both the Spine join call and the Tabletop `seat.joined`
      call from a single `/start-game` request
- [ ] `apps/shuffler/CLAUDE.md`'s Table Mode section documents the new field
- [ ] `verify-tabletop-integration.spec.ts` shuffles up with `maxPlayers: 2` and asserts
      the Stack shape actually drawn on the Tabletop's canvas is the narrower rectangle,
      not the square — proving the whole path end to end
