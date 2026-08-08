# Shrink active-game-page.ts's interface

Mountain: overhead
Ship: shuffler
Type: task
Status: resolved

## Context

Architecture review candidate #3 (Worth exploring). `src/view/play-game/active-game-page.ts`
(94 lines, second-hottest file by churn after `app.ts`) has two jobs — page-wrapper
composition (`formatGamePageHtmlPage`) and section composition (`formatActiveGameHtmlSection`)
— plus two single-use helper functions that inflate its interface without adding a reusable
concept: `formatTableCardsButtonHtmlFragment` and `formatGoToTableButtonHtmlFragment`, each
interpolated exactly once.

## What to change

Fold both single-use fragment functions inline at their one call site. Add a short comment
naming the file's one real job ("game screen layout/composition order, including the HTMX
swap contract on `#game-container`") so future touches recognize it as the assembly seam, not
a place for new business logic.

Deletion test is deliberately ambiguous here (noted in the original review) — deleting the
whole file would just move the six-import glue into `app.ts`'s route handlers, so this isn't
about eliminating the module, just shrinking its interface in place.

## Ship

`apps/shuffler/` only. Small enough that a Playwright smoke check
(`./verify.sh` from `apps/shuffler/`) covering `/game` is sufficient; no new test needed since
this changes no behavior, only which function owns which HTML fragment.

## Answer

Done (2026-08-08). Both single-use fragment helpers folded inline into
`formatActiveGameHtmlSection` as local template expressions (`goToTableButtonHtml`,
`tableCardsButtonHtml`), keeping their explanatory comments. A file-header comment now names
the file's one job: game screen layout/composition order, including the HTMX swap contract on
`#game-container` — the assembly seam, not a home for business logic. Bonus interface shrink
found while checking call sites: `tabletopPublicUrl()` had no importers anywhere in src/ or
test/, so its `export` was dropped too (the doc comment distinguishing it from `TABLETOP_URL`
stays). The file's exports are now exactly its two jobs: `formatGamePageHtmlPage` and
`formatActiveGameHtmlSection`. No behavior change; build + 302 unit tests + full Playwright
verify (48 passed) all green.
