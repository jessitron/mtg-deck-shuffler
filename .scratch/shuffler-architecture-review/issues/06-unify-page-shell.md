# Unify the Shuffler's two page-shell builders

Mountain: overhead
Ship: shuffler
Type: task
Status: resolved

## Context

Architecture review candidate #6 (Strong) — surfaced by Jess, not the original automated
scan. Two independent modules build the same page shell (title, tokens, fonts, tracing/
browser-tab-id bootstrap, per-page stylesheets) in two different templating technologies:

- `views/partials/head.ejs` — used by `/`, `/prepare`, `/choose-any-deck`, `/docs`, `/about`.
  Loads browser-tab-id via an external `/browser-tab-id.js` script; takes an `additionalFonts`
  array; never loads `playmat.css`/`game.css`.
- `formatHtmlHead` in `src/view/common/html-layout.ts` — used by `/game`. Inlines the
  browser-tab-id generation directly in a `<script>` block; hardcodes `Ovo`+`Orbitron`;
  always loads `playmat.css` and `game.css` regardless of page.

Already-observed drift confirms this is two adapters solving one problem instead of two
adapters behind a real seam: the design-tokens KB (`owners/shuffler-looks-like-itself/`) has
an existing note that "the typeface names still appear in the three `<head>`s" awaiting a
sweep — this ticket is that sweep, generalized to the whole shell, not just font literals.

## What to change

One canonical page-shell definition — front the varying bits as data (title,
additionalStylesheets, additionalFonts) — rendered from whichever templating path calls it.
Two directions to weigh:

- Keep both templating systems but have both render from one shared shell definition (a
  single source of truth for the `<head>` contents, called from EJS via a helper and from TS
  directly).
- Migrate `/game`'s shell onto the EJS partial, since the shell itself carries no gameplay
  logic — only `formatActiveGameHtmlSection`'s *body* content is TS-rendered, not the page
  wrapper around it.

**Consult `owners/shuffler-looks-like-itself/` before deciding** — this is exactly its
territory (the `<head>`, fonts, tokens), and the existing KB note above is likely relevant
context it can supply directly.

## Ship

`apps/shuffler/` only. Verify with `./verify.sh` from `apps/shuffler/` — this touches every
page's `<head>`, so the full Playwright suite is the right check, not a targeted one.

## Comments

**2026-08-08 — resolved, direction (a).** One canonical shell: `formatHtmlHead(options)` in
`src/view/common/html-layout.ts`, reached by EJS via `app.locals` through a thin
`views/partials/head.ejs` adapter (which is also the one spot adding `site.css`). `/game`'s
page-specific scripts (htmx + 409/502 responseHandling, game.js, modal-query-params.js) ride
in a `scriptsHtml` tail constant. Both owners (shuffler-looks-like-itself,
fleet-is-observable) consulted and reviewed; plan at
`.scratch/shuffler-architecture-review/plan-06-unify-page-shell.md`. Three deliberate fixes
landed with the unification: meta charset/viewport now on EJS pages, the tracing-init guard
now on /game, and the title is HTML-escaped in the shell (it wasn't, on the TS path).
Correction to this ticket's premise: the design KB note about typeface names in the heads
says they are *correctly* literal (font delivery, not tokenisable) — no sweep was pending.
Follow-up buoy in TODO.md: `browser-tracing-key-guard`.
