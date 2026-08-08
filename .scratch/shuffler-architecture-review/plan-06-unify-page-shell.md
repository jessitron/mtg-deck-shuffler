# Plan: Unify the Shuffler's two page-shell builders (ticket 06)

Ship: apps/shuffler only. All paths below relative to `apps/shuffler/`.

## Direction chosen

Direction (a) from the ticket: **one canonical shell definition in TypeScript**
(`formatHtmlHead` in `src/view/common/html-layout.ts`, reshaped), rendered by both
templating paths. EJS reaches it via `app.locals.formatHtmlHead`; `views/partials/head.ejs`
becomes a thin adapter so the seven EJS templates keep their existing
`include('partials/head', {...})` call sites unchanged.

Rationale (from shuffler-looks-like-itself-context): direction (b) collapses into (a)
anyway — head.ejs can't express /game without being parameterized into a shared shell.
The owner's KB wants "one list of stylesheets per page, defined once."

## The canonical shell

New signature:

```ts
interface HtmlHeadOptions {
  title: string;
  stylesheets?: string[];      // loaded AFTER /fleet/tokens.css and /styles.css, in order given
  additionalFonts?: string[];  // Google font families beyond Orbitron (e.g. ["Ovo"], ["Risque"])
  scriptsHtml?: string;        // page-specific <script> tags appended at the very end of the head
}
function formatHtmlHead(options: HtmlHeadOptions): string
```

Rendered skeleton, in order:

1. `<meta charset>` + `<meta viewport>` — **visible fix**: EJS pages gain these (they
   only existed on /game). Adding viewport changes phone rendering of /, /prepare, etc.
2. `<title>`
3. Font preconnects + one Google Fonts `<link>`: Orbitron always + additionalFonts.
4. `/fleet/tokens.css` **first**, then `/styles.css`, then `options.stylesheets` in order.
5. `<script src="/browser-tab-id.js">` — **/game switches from its inline copy to the
   external script** (fleet-is-observable confirmed no real constraint requires inlining;
   sync scripts preserve the tab-id-before-tracing-init ordering).
6. `<script src="/hny.js">` + inline `Hny.initializeTracing` **guarded by
   `if (window.Hny && window.browserTabId)`** — /game gains the guard (**visible fix**;
   fleet-is-observable says the guarded form is the fleet posture). Keeps: apiKey
   `process.env.HONEYCOMB_INGEST_API_KEY || process.env.HONEYCOMB_API_KEY` read per-render,
   serviceName `mtg-deck-shuffler-web`, `debug: false`, `provideOneLinkToHoneycomb: true`,
   resourceAttributes `game.browser_tab_id`.
7. `options.scriptsHtml` verbatim.

Deleted from /game's head: the duplicate inline `htmx:configRequest` listener
(browser-tab-id.js already registers it; running twice set the same header — noise).

## Callers

- **`formatPageWrapper`** (used by /game, debug load-state, error pages): passes
  `stylesheets: ["/playmat.css", "/game.css", ...additionalStylesheets]` (playmat before
  game — the decided cascade-tie order), `additionalFonts: ["Ovo"]`, and
  `scriptsHtml: GAME_HEAD_SCRIPTS_HTML` — a named constant in html-layout.ts holding,
  in order: `/htmx.js`, the inline block with `htmx.config.responseHandling`
  (409 + 502 send-then-commit entries, comments preserved, AFTER htmx.js since it
  references the `htmx` global), `/game.js`, `/modal-query-params.js`.
  Net behavior change for these pages: guard on tracing init, external tab-id script,
  duplicate configRequest listener removed. Everything else byte-equivalent in intent.
- **`views/partials/head.ejs`** becomes:
  `<%- formatHtmlHead({ title: pageTitle, stylesheets: ['/site.css', ...(locals.additionalStyles||[])], additionalFonts: locals.additionalFonts, scriptsHtml: locals.script ? deferred-script-tag : '' }) %>`
  — site.css stays hardcoded for all EJS pages (including /prepare; removing it there
  would be an appearance change, per design owner: don't tidy it here). site.css still
  never reaches /game.
- **`src/app.ts`**: `app.locals.formatHtmlHead = formatHtmlHead;` next to the existing
  view-engine setup.

Ordering note: EJS pages' font `<link>` moves from after the stylesheets to before them
(matching /game today). No cascade impact — fonts aren't a stylesheet-order participant.

## Tests

- Extend `test/html-layout-fleet-tokens.test.ts` to the new signature; add assertions:
  tokens.css appears before styles.css and before any passed stylesheet; Orbitron always
  present; additionalFonts appear when passed. This stays the cheap jest seam guard for
  /game's head (Playwright can't cheaply reach /game).
- Full `./verify.sh` from apps/shuffler — this touches every page's head, so the whole
  Playwright suite is the check (per ticket).
- `verify-fleet-tokens.spec.ts` and `verify-design-gallery.spec.ts` should pass unchanged
  (no page's stylesheet *set* changes).

## Not doing (recorded so it doesn't ride along)

- No change to which stylesheets any page loads (site.css on /prepare stays).
- No apiKey-nonempty/"undefined" guard improvement (fleet-is-observable flagged it as a
  separate decision) — will drop a TODO.md buoy.
- No Shuffler browser collector, no font self-hosting, no removal of the key-in-page.

## Post-landing

- `shuffler-looks-like-itself-update`: architecture.md "two heads" section, interactions.md
  dependency + "adding a stylesheet" watch point, README Fonts row ("three heads" → two:
  one Shuffler shell + tabletop index.html), CLAUDE.md UI Style bullet.
- `fleet-is-observable-update`: document the browser bootstrap (hny.js, browser-tab-id.js,
  resource-attribute ordering, the guard) — owner flagged this as a KB gap.
- apps/shuffler/CLAUDE.md: templating section still says "two systems" for bodies (true),
  but head wording updates.
