# Plan: the /game surface is a playmat, so call it one

Mountain: overhead
Status: in progress

## Why

On `/game` the big rounded card-art surface everything sits on is called `.page-container`.
In the domain it IS the playmat — the same object `/prepare` calls `.playmat`. An agent
reasoned "the /game screen has no playmat" (true of the class names, false of the app) and
asked Jess a question built on that false premise. Jess: rename it so the code uses the
domain word.

## What I found (investigation)

- `.page-container` appears **only** in `apps/shuffler/public/game.css` (`.page-container`,
  `.page-container>*`) and `apps/shuffler/src/view/play-game/active-game-page.ts` (the div).
  Not in `styles.css` / `site.css` / `prepare.css` / `docs.css` / `deck-selection.css`,
  not in `game.js`, not in any Playwright spec. `.error-page-container`
  (`src/view/common/html-layout.ts`) is a different class. **It is NOT shared with the site
  pages.** A rename is safe.
- `.playmat` rules live in `prepare.css` only: the bare appearance rule plus three
  placement rules (`.playmat > .game-title`, `.playmat .cool-command-zone-surround`,
  `.playmat .commander-placeholder`). The **shared** `playmat.css` has no bare `.playmat`
  rule at all.
- `/design` (`views/design.ejs`) co-loads `playmat.css`, `game.css`, `prepare.css`,
  `deck-selection.css`, `design-candidates.css`, `design-gallery.css`. Its specimens use
  `class="stage stage-playmat"` (gallery chrome in `design-gallery.css`) — **no element on
  `/design` carries a bare `playmat` class**, so a straight rename wouldn't break anything
  today, but it would leave two contradictory bare `.playmat` rules co-loaded on the one
  page whose job is to not lie about the app. Latent trap.
- Specs that key on `.playmat`: `verify-deck-title-placement.spec.ts` asserts the literal
  selector `.playmat > .game-title`; `verify-prep-commander-flip.spec.ts` locates
  `.playmat`. Both must keep matching.

## The change (symmetric modifier, per the design owner's context)

Domain word in the markup on **both** play pages; the differing looks stay behind
page-specific modifier selectors. No visual change anywhere.

1. `src/view/play-game/active-game-page.ts` — `class="page-container"` →
   `class="playmat playmat-game"`.
2. `public/game.css` — `.page-container` → `.playmat-game`, `.page-container>*` →
   `.playmat-game>*`. Comment says this is the game page's playmat.
3. `views/prepare.ejs` — `class="playmat"` → `class="playmat playmat-prepare"`.
4. `public/prepare.css` — the bare appearance rule `.playmat {` → `.playmat-prepare {`.
   The three **placement** rules stay keyed on bare `.playmat` (they still match; and a
   spec pins `.playmat > .game-title`). Comment saying that's deliberate.
5. `public/playmat.css` — one comment reserving the bare `.playmat` slot for shared
   playmat appearance, should the two treatments ever converge.
6. `views/design.ejs` prose — the radius table currently lists `20px .playmat` and
   `80px .page-container` as two different objects, which is exactly the confusion being
   fixed; also the contrast table row and the "square corners on chrome" house rule.
7. `notes/GLOSSARY.md` — a **Playmat** entry naming this surface on both play screens.
   (There is no `apps/shuffler/CONTEXT.md`; `docs/agents/domain.md` says the glossary is
   the one to extend.)
8. `apps/shuffler/CLAUDE.md` — the UI Style bullet that names `.page-container`.
9. `TODO.md` buoy: the two playmats now differ visually (20px/outline 10px/no shadow/local
   Cascading Cataracts vs 80px/border 5px/box-shadow/hotlinked Scryfall PNG) with no
   remaining "they're different objects" justification. Surface as a design choice; do NOT
   converge them in this change.

## Explicitly not doing

- Not changing any visual value. `/prepare`, `/game`, `/design` must render identically.
- Not touching `test/verification/verify-table-mode.spec.ts` or
  `verify-tabletop-integration.spec.ts` (another agent owns them).
- Not re-adding `.candidate-game-title-flat`; choice 7 landed in `20b83aa`.

## Verify

`npm run build && npm test` in `apps/shuffler`; `./verify.sh verify-design-gallery`,
`verify-deck-title-placement`, `verify-prep-commander-flip`; screenshots of `/prepare`,
`/game`, `/design`.
