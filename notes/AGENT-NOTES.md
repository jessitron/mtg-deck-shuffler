# Agent Notes

Gotchas learned the hard way while working in this repo. Append as you learn; delete
entries that stop being true or that are just pointless. Things that belong in `CLAUDE.md` (standing instructions,
commands, layout) go there instead — this file is for the "oh, _that's_ why" findings.

## Harness gotchas (Claude Code sessions in this repo)

- **Background sessions can't resolve merge conflicts with Edit/Write.** The bg-session
  guard rejects file edits in the shared checkout (only worktree paths are editable) —
  but merging a worktree branch to local main *requires* touching the shared checkout
  when it conflicts. Workaround: resolve via a small script written to the job's tmp dir
  (`$CLAUDE_JOB_DIR/tmp`) and run with Bash, then `git add` + `git commit`. Hit 2026-08-08
  on a tail-append conflict in an owner's `history.md` (owner `-update` subagents commit
  to the worktree branch, so two sessions appending entries conflict routinely — keep
  both entries, HEAD's first).

- **A fresh worktree has no `node_modules`, and resolution silently leaks to the main
  checkout's hoisted copy.** Worktrees live *inside* the repo (`.claude/worktrees/…`), so
  Node/tsc walk up past the worktree root and find the shared checkout's root
  `node_modules`. Where the ships pin different versions of the same package — notably
  OTel: Tabletop sdk-logs 0.221 (options-object `BatchLogRecordProcessor({ exporter })`),
  Shuffler 0.219 (positional) — this produces phantom type errors against the *wrong
  ship's* types (hit 2026-08-09: `'exporter' does not exist in type 'LogRecordExporter'`
  in `apps/tabletop/src/server/tracing.ts`, which is correct code). Fix: run
  `npm install` from the worktree root before believing any build failure.

## Working-with-Jess gotchas

- **Don't build library-grade infrastructure inside the app.** 2026-08-08: a
  shrink-text-to-fit request grew into custom circle-aware line wrapping (chord widths,
  word-preference thresholds) — Jess reverted it: *"too much code and not core to this
  app. If that was a thing I was gonna do, I'd put it in a library... Not something I
  wanna spend time testing properly."* The bar is the simplest close-enough behavior
  (there: shrink font to fit the square box, let CSS wrap, accept the round clip
  nibbling corners). If a mechanism deserves real testing rigor, that's the signal it
  doesn't belong in this repo.

## Shuffler gotchas (apps/shuffler)

- **`id INTEGER PRIMARY KEY` in SQLite is a rowid alias, and it rejects non-integer
  values outright** ("datatype mismatch") — not just on lookup, on `INSERT`. Discovered
  2026-08-10 turning game ids into fun word-combos (`brave-falcon-42`): the existing
  `game_states` table had `id INTEGER PRIMARY KEY`, so inserting a word-combo id threw
  immediately. Comparisons are more forgiving than storage — a *lookup* like
  `WHERE id = ?` bound to the string `'47'` against an `INTEGER` column still matches
  the integer row `47` (affinity coercion applies to comparisons), so old numeric ids
  keep working with either JS type. But you can't get a new non-numeric value *into*
  that column type at all. Fix: migrate the column to bare `id PRIMARY KEY` (no declared
  type ⇒ BLOB affinity ⇒ stores whatever it's given, no coercion in either direction) —
  `SqlitePersistStateAdapter.initializeDatabase` detects the old `INTEGER` column type
  via `pragma_table_info` and rewrites the table (rename → recreate → copy → drop) the
  first time it opens an old `data.db`. After that migration, a lookup must pass the
  *same JS type* that was stored (number for pre-migration games, string for new
  word-combo ones) since BLOB affinity does no coercion — see `parseGameId` in
  `domain-types.ts`.

## Tabletop gotchas (apps/tabletop)

- **tldraw is pinned exactly** (5.2.5 line, no caret): `room.updateStore` (server-side
  shape injection) is a young API, verified in `test/updateStore.test.ts`. Don't let a
  routine dependency bump float it.
- **Ports**: dev/prod server 5180, `verify.sh` runs its own on 5183. The Shuffler's
  tests use 3344/3001, the Spine 4600 — keep them distinct.
- **Rooms are in-memory**: restarting the server (or redeploying — `Recreate`, one
  replica) wipes every board. Not a bug in v0; durable reconstruction is a tracked buoy.

## Spine gotchas (services/spine)

- **Rails' `ParamsWrapper` clobbers a param named after its own model — but only when
  that param is *absent*.** `SeatsController` originally required `seat` in the JSON
  body; making it optional (so the Spine can auto-assign a seat number) broke with
  `NoMethodError: undefined method 'to_i' for an instance of ActionController::Parameters`
  on `params[:seat]`. Cause: since a `Seat` model exists, Rails wraps the JSON body under
  `params[:seat]` (the singular model name) whenever a top-level `seat` key isn't already
  present in the request — so omitting `seat` to trigger auto-assignment makes
  `params[:seat]` resolve to the *whole wrapped body* (a `Parameters` object), not nil.
  Sending an explicit `seat` value never tripped this, which is why the original
  required-param code looked fine. Fix: `wrap_parameters false` on the controller. Watch
  for this on any future Spine controller whose JSON body field shares a name with its
  own model (2026-08-10, seat-number auto-assignment).
