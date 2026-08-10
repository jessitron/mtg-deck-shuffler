import { escapeHtml } from "./shared-components.js";

interface HtmlHeadOptions {
  title: string;
  // Loaded after /fleet/tokens.css and /styles.css, in the order given.
  stylesheets?: string[];
  // Google font families fetched in addition to Orbitron (e.g. ["Ovo"]).
  additionalFonts?: string[];
  // Trusted HTML only — appended verbatim at the end of the head.
  // Never interpolate user-supplied data into this.
  scriptsHtml?: string;
}

// The browser-side Honeycomb tracing guard + init, as a literal script
// source string rather than a plain TS function: it has to ship as-is inside
// the page's inline <script> tag (browser JS, no build step reaches it), and
// keeping it as one exported constant means the exact source the browser
// runs is also what test/html-layout-tracing-guard.test.ts evals and
// exercises — no separate reimplementation to drift out of sync.
//
// Guards on window.Hny && window.browserTabId (hny.js loaded, tab id minted)
// same as before. Extends that guard to also skip — with a console.warn,
// instead of silently calling initializeTracing with a useless key — when
// apiKey is empty or the literal string "undefined" (what string
// interpolation produces when neither HONEYCOMB_INGEST_API_KEY nor
// HONEYCOMB_API_KEY is set server-side): browser-tracing-key-guard.
const HONEYCOMB_TRACING_INIT_SCRIPT = `      function initHoneycombTracing(apiKey) {
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
      }`;

// The one page shell. Every page's <head> — EJS-rendered (via
// views/partials/head.ejs, which reaches this through app.locals) and
// TS-rendered (/game, error pages) — comes from here, so the skeleton
// (tokens first, fonts, tab-id + tracing bootstrap) cannot diverge again.
function formatHtmlHead(options: HtmlHeadOptions): string {
  const { title, stylesheets = [], additionalFonts = [], scriptsHtml = "" } = options;

  const fontFamilies = ["Orbitron:wght@400;600;700;900", ...additionalFonts];
  const fontsParam = fontFamilies.map((f) => `family=${f}`).join("&");
  const stylesheetsHtml = stylesheets.map((href) => `    <link rel="stylesheet" href="${href}" />`).join("\n");

  return `<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?${fontsParam}&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/fleet/tokens.css" />
    <link rel="stylesheet" href="/styles.css" />
${stylesheetsHtml}
    <script src="/browser-tab-id.js"></script>
    <script src="/hny.js"></script>
    <script>
      // Initialize Honeycomb tracing for the browser. browserTabId must exist
      // before this runs: it's baked into the resource, immutable after init.
${HONEYCOMB_TRACING_INIT_SCRIPT}
      initHoneycombTracing("${process.env.HONEYCOMB_INGEST_API_KEY || process.env.HONEYCOMB_API_KEY}");
    </script>
${scriptsHtml}
  </head>`;
}

// The /game head's page-specific scripts. responseHandling references the
// htmx global, so this block must stay after htmx.js loads.
const GAME_HEAD_SCRIPTS_HTML = `    <script src="/htmx.js"></script>
    <script>
      // Configure HTMX to swap on 409 Conflict responses
      htmx.config.responseHandling = [
        {code: "204", swap: false},  // No Content
        {code: "2..", swap: true},   // All other 2xx
        {code: "409", swap: true},   // Conflict (stale state)
        // Bad Gateway: tabletop rejected/unreachable. swap:true renders the
        // error modal; error:true keeps event.detail.successful false so the
        // table-play-button's conditional close-modal leaves the modal visible.
        // Full protocol, all stations: notes/DESIGN-send-then-commit.md.
        {code: "502", swap: true, error: true},
      ];
    </script>
    <script src="/game.js"></script>
    <script src="/modal-query-params.js"></script>`;

interface PageWrapperOptions {
  title: string;
  content: string;
  footerContent?: string;
  additionalStylesheets?: string[];
  includeFooter?: boolean;
  devMode?: boolean;
}

function formatPageWrapper(options: PageWrapperOptions): string {
  const {
    title,
    content,
    footerContent = ``,
    additionalStylesheets = [],
    includeFooter = true,
    devMode = false
  } = options;

  const headHtml = formatHtmlHead({
    title,
    // playmat before game: the bare .playmat rule and the page modifiers are
    // equal specificity, so the tie is resolved by load order — deliberate.
    stylesheets: ["/playmat.css", "/game.css", ...additionalStylesheets],
    additionalFonts: ["Ovo"],
    scriptsHtml: GAME_HEAD_SCRIPTS_HTML,
  });
  const bodyClasses = [devMode ? "dev-mode" : ""].filter(Boolean);
  const bodyClass = bodyClasses.length ? ` class="${bodyClasses.join(" ")}"` : ``;
  const footerHtml = includeFooter ? `
    <footer>
      ${footerContent}
      <a href="https://github.com/jessitron/mtg-deck-shuffler" target="_blank"><img src="/images/github-mark.svg" height=50px alt="GitHub" class="github-logo"></a></p>
    </footer>` : '';

  return `<!DOCTYPE html>
<html lang="en">
  ${headHtml}
  <body${bodyClass}>
    ${content}${footerHtml}
  </body>
</html>`;
}

interface ErrorPageOptions {
  icon: string;
  title: string;
  message: string;
  details?: string;
}

export function formatErrorPageHtmlPage(options: ErrorPageOptions): string {
  const { icon, title, message, details } = options;

  const content = `<div class="error-page-container">
      <div class="error-message">
        <h2>${icon} ${title}</h2>
        <p>${message}</p>
        ${details ? `<p class="error-details">${details}</p>` : ""}
      </div>
      <div class="error-actions">
        <a href="/">home</a>
      </div>
    </div>`;

  return formatPageWrapper({
    title: `${title} - MTG Deck Shuffler`,
    content
  });
}

export { formatHtmlHead, formatPageWrapper, HONEYCOMB_TRACING_INIT_SCRIPT };
