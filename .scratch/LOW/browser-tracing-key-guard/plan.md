# browser-tracing-key-guard plan

## Problem

`apps/shuffler/src/view/common/html-layout.ts`, `formatHtmlHead`, the inline
`<script>` block that initializes Honeycomb browser tracing:

```js
if (window.Hny && window.browserTabId) {
  Hny.initializeTracing({
    apiKey: "${process.env.HONEYCOMB_INGEST_API_KEY || process.env.HONEYCOMB_API_KEY}",
    ...
  });
}
```

When neither env var is set, string interpolation bakes the literal 4-character
string `"undefined"` into the apiKey field. The guard only checks `window.Hny &&
window.browserTabId`, both of which are true, so `initializeTracing` runs anyway
with a useless key, and OTLP export 401s silently. Browser cousin of the known
Node-side "x-honeycomb-team= present, non-empty, useless" finding.

## Fix

Extend the *same* guard (don't add a second one, don't touch the
`HONEYCOMB_INGEST_API_KEY || HONEYCOMB_API_KEY` fallback) to also check the
apiKey value, and warn instead of silently no-op'ing.

To make this testable in Jest (per the task's ask — the current guard is raw
JS inside a template-literal `<script>` block, invisible to any TS test), pull
the guard + init logic out into a small named function, `initHoneycombTracing(apiKey)`,
emitted as its own literal script source string
(`HONEYCOMB_TRACING_INIT_SCRIPT`, exported from html-layout.ts), which
`formatHtmlHead` inlines into the `<script>` tag and then calls once with the
interpolated key:

```js
function initHoneycombTracing(apiKey) {
  if (!(window.Hny && window.browserTabId)) return;
  if (!apiKey || apiKey === "undefined") {
    console.warn("Honeycomb browser tracing disabled: no valid API key configured (set HONEYCOMB_INGEST_API_KEY or HONEYCOMB_API_KEY)");
    return;
  }
  Hny.initializeTracing({
    apiKey: apiKey,
    serviceName: "mtg-deck-shuffler-web",
    debug: false,
    provideOneLinkToHoneycomb: true,
    resourceAttributes: {
      "game.browser_tab_id": window.browserTabId
    }
  });
}
initHoneycombTracing("${apiKey}");
```

This stays a single bootstrap (one function, defined once, in the one shell),
and the exact same source string that ships to the browser is what the Jest
test evals (via `new Function` / `vm`) with mocked `window`/`Hny`/`console`,
so the test exercises real behavior, not a reimplementation.

Test file: `apps/shuffler/test/html-layout-tracing-guard.test.ts` — three
cases (empty key, literal `"undefined"`, real key), asserting
`Hny.initializeTracing` called/not-called and `console.warn` called/not-called.

Script order (tab-id before tracing) is unchanged. No new bootstrap point.

## Sibling scan

Checked immediate vicinity of the guard in html-layout.ts for other
silent-skip patterns (per owner's ask to fix siblings found nearby, without an
unbounded hunt). The only other conditional near this code is
`stylesheets.map(...)` / `scriptsHtml` composition — not a silent-skip, just
normal template composition. No siblings found in this file.
