# Sweep every chrome corner to the decided radius

Mountain: safe-harbor
Status: ready-for-agent

Resolves **choice 4**. Last, so it catches the rules issues 02 and 03 introduce. These are
value-only edits, so they don't shift line numbers.

## The decision

Square is the aesthetic; the softening is a concession applied exactly where a sharp corner
becomes a spike. Jess's words:

> While I want square corners, there are times when the square gets painfully pointy. So on
> buttons and stuff, there is a "not too pointy" minimal border radius. (4px is acceptable.)
> Of course cards have their border radius, that's how they really are.

The line falls at **"do you touch it"**, not at "is it small". A size test would make the next
agent guess; this one they can apply.

## `var(--radius-soft)` — things you press

Changing: `.modal-action-button` 8→4, `.card-modal-nav-button` 8→4, `.card-action-button`
3→4, `.flip-button` in `prepare.css` 5→4.

Already 4px, just tokenize: `.card-buttons button, .library-buttons button` (`playmat.css:71`),
`.menu-section button, .end-game-actions a` (the grouped rule at `game.css:559-569`),
`.modal-close` (**both copies** — `playmat.css:199` and `prepare.css:194`),
`.debug-copy-button`.

Issue 02 already set the text input to `--radius-soft`; confirm it, don't redo it. Issue 03's
two collapsed button classes need it too.

## `0` — flat surfaces

`.cool-command-zone-surround` 2→0, `.cool-command-zone-surround .multiple-cards` 2→0,
`.game-menu-panel` 4→0, `.modal-dialog` 10→0 (**both copies** — `playmat.css:168` and
`prepare.css:163`), `.debug-container` 4→0, `.debug-note` 4→0, `.hand-drop-zone` 5→0 and
`.hand-drop-zone.drag-over` 20→0, `.card-modal-position-indicator` 6→0.

`prepare.css:280` `.join-table-summary` and `:313` are already `0` — precedent, leave them.

## Untouched — physical objects

`.mtg-card-image` 10, `.commander-placeholder` 10 (**both copies**), `.playmat` 20,
`.page-container` 80, `.card-modal-image` 3vh, `.modal-card-image` 30px,
`.library-card-back::before` 8, `.hand-count` 50%, `.card-modal-close` 50%.

## Corrections to `open-choices.md`'s list

Its choice-4 list was stale — trust this issue, not that one:

- **`.table-cards-button` 2px does not exist.** No `border-radius` on it at all.
- It never listed `.card-buttons button, .library-buttons button`,
  `.cool-command-zone-surround .multiple-cards`, or `.end-game-actions a`.
- It counted `.modal-dialog`, `.modal-close` and `.commander-placeholder` once each; all
  three are duplicated across files.
- The real count is **12 distinct non-zero values**, not 13.

## Verify

`npx playwright test verify-design-gallery` will legitimately break — it asserts computed
values. Update the spec in the same commit.

Then look at `/game` and `/prepare`: the menu panel, modal dialog, command-zone surround and
drop zone should read hard square, while every button and the text inputs keep a soft 4px.
Cards, playmat and page-container unchanged.

## Then

Run the "When a choice is resolved" checklist in
`owners/shuffler-looks-like-itself/open-choices.md`. This one closes the last open choice, so
the table in the owner's `README.md` empties out — state the standing rule in its
design-language section, and put it in `apps/shuffler/CLAUDE.md` → UI Style, replacing the
bare "square corners except physical" line with the three-way rule.

## Out of scope — capture separately

`404.html` carries inline `<style>` radii (15px, 8px) governed by no stylesheet. Not part of
this sweep; worth a buoy.
