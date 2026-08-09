# 16 — Prep-screen picker v1: playmat swatches and sleeve color

Mountain: tabletop-replaces-mural
Ship: shuffler
Type: task
Status: done
Blocked by: None — can start immediately

**What to build:** On the Shuffler's prep screen, one surface with two fields. **Playmat:**
curated image swatches seeded from the `aeoe-*` art-card images already used as home-page
hero backgrounds, presented in the precon-tile style with the hero-button underline as the
selection signal, defaulting to today's hardcoded mat; the choice flows to the table
through the existing `playmatImageUrl` plumbing, end to end. **Sleeves:** a color picker
plus quick color swatches; the chosen color is captured in the seat's prep state, ready
for ticket 17 to send (picking no sleeve is valid — cards keep the standard Magic back).

No modal, no free-text URL in v1. Phase-2 pickers (image sleeves, custom URLs, two-color
sleeves) are out of scope.

Design source of truth: [09 — sleeve and playmat picker](09-sleeve-and-playmat-picker.md).

**Prototype verdict (2026-08-09):** Jess picked variant A ("setup panel" — one compact
opaque panel on the mat: mat-thumb row + sleeve-chip row with None/mana-pie/custom) from
the three-variant prototype, preserved in main's history at commit `683ca1c` (reverted
right after; `git checkout 683ca1c` to dig it up) and on branch
`worktree-proto-ticket-16-picker` (`?variant=A|B|C` on /prepare). Two live previews are
part of the design: picking a playmat swaps the mat art on the page; picking a sleeve
color tints the command-zone surround and the deck-title plaque. Sleeves dressing the
library is later, a separate task.

User-visible Shuffler work → Playwright verification (pick a playmat, see it on the
table; pick a sleeve color, see it captured).

Consult owners: `shuffler-looks-like-itself` (picker appearance — swatch tiles, selection
signal, color picker styling).

- [x] Prep screen offers curated playmat swatches, defaulting to the current hardcoded mat
- [x] A picked playmat renders on that seat's player area on the Tabletop (existing plumbing)
- [x] Prep screen offers a sleeve color picker plus quick swatches; choosing nothing is valid
- [x] Chosen sleeve color is held in the seat's prep state where the seat-joined send can reach it
- [x] Playwright covers the playmat pick end-to-end and the sleeve pick's capture

**Built (2026-08-09):** variant A landed as `views/partials/table-look-panel.ejs` +
`public/prep-picker.js` + a `prepare.css` block; curated data in `src/table-look.ts`
(5 aeoe mats, mana-pie quick picks). Picks persist immediately via
`POST /prep-table-look/:prepId` into `PersistedGamePrep.playmatImagePath` /
`.sleeveColor`; `sendSeatJoinedBestEffort` sends the picked mat as an absolute URL
(default when unpicked). Live previews as designed. `/design` got a table-look-panel
specimen. Verified: `verify-prep-picker.spec.ts` (5 specs) plus a picked-mat
assertion in `verify-tabletop-integration.spec.ts`, and unit tests on the send +
validators. Caveat, buoyed as `game-page-picked-mat`: /game still paints the
default mat. Plan: `../plan-16.md`.
