# Task: Add card type grouping to the library search modal

## Context

There's a previous implementation at commit `99322b9` (tagged `bad-impl-of-library-search-grouping`) that shows the approach. Review that diff — it adds a "Group by Type" toggle button to the library search modal that groups cards by their Magic card type (Creature, Instant, etc.).

The previous attempt was blocked by a DB migration issue (cards didn't have `types` in persisted data). That's no longer a problem — the DB has been wiped and all cards now include `types` in their `CardDefinition`.

## What to implement

Cherry-pick or re-implement the changes from commit `99322b9`. The diff touches:
- `views/partials/library-modal.ejs` — toggle button + grouped card display
- `src/app.ts` — pass `groupBy`, `types`, `gameId`/`prepId`, `expectedVersion` to the template
- `public/modal-query-params.js` — support `?groupBy=type` query parameter
- `public/playmat.css` — styling for the toggle and type group headers
- `src/view/common/card-grouping.ts` — grouping logic (may not be needed if grouping is done in the EJS template)

## How to test

1. Start the app: `PORT=3344 ./run`
2. Run `npm run seed` to create test data
3. Check `test/TEST-DATA.md` for URLs — it includes a direct link to the library search modal with `?groupBy=type`
4. Verify in the browser:
   - Library modal opens normally (ungrouped)
   - Clicking "Group by Type" groups cards by type with headers
   - Clicking again returns to library order
   - Works on both game (`/game/:id`) and prep (`/prepare/:id`) pages

## Notes

- Update or remove the TODO entry in `notes/TODO.md` line 4 when done.
- The `.vscode/settings.json` change in that commit is unrelated (color theme) — skip it.
