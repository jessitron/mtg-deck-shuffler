import { escapeHtml } from "./shared-components.js";

interface HtmlHeadOptions {
  title: string;
  // Loaded after /fleet/tokens.css and /styles.css, in the order given.
  stylesheets?: string[];
  // Google font families fetched in addition to Orbitron (e.g. ["Ovo"]).
  additionalFonts?: string[];
  scriptsHtml?: string;
  // Stamped onto browser spans as the boolean resource attribute app.dev_mode.
  devMode?: boolean;
  // Stamped onto browser spans as the string resource attributes table.name / player.name.
  // Present only for table-mode games (solo games leave them undefined).
  // tableName is lowercased at the point it's passed to the tracing init script, so the
  // same table doesn't fragment across span-attribute values by casing; the caller's
  // display casing (e.g. the page title) is untouched.
  tableName?: string;
  playerName?: string;
  // Stamped onto browser spans as the string resource attribute game.id.
  // Present once a game exists (the /game page); undefined elsewhere.
  gameId?: string;
}

const HONEYCOMB_TRACING_INIT_SCRIPT = `      function initHoneycombTracing(apiKey, devMode, tableName, playerName, gameId) {
        if (!(window.Hny && window.browserTabId)) return;
        if (!apiKey || apiKey === "undefined") {
          console.warn("Honeycomb browser tracing disabled: no valid API key configured (set HONEYCOMB_INGEST_API_KEY or HONEYCOMB_API_KEY)");
          return;
        }
        var resourceAttributes = {
          "game.browser_tab_id": window.browserTabId,
          "app.dev_mode": devMode
        };
        if (tableName) resourceAttributes["table.name"] = tableName;
        if (playerName) resourceAttributes["player.name"] = playerName;
        if (gameId) resourceAttributes["game.id"] = gameId;
        Hny.initializeTracing({
          apiKey: apiKey,
          serviceName: "mtg-deck-shuffler-web",
          debug: false,
          provideOneLinkToHoneycomb: true,
          resourceAttributes: resourceAttributes
        });
      }`;

// Serialize a value as a safe JS string-literal argument for the inline init script.
// JSON.stringify escapes quotes/backslashes; neutralizing "<" stops a table/player name
// containing "</script>" from breaking out of the <script> element (and blocks XSS).
function jsStringArg(value: string | undefined): string {
  if (!value) return "undefined";
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function formatHtmlHead(options: HtmlHeadOptions): string {
  const { title, stylesheets = [], additionalFonts = [], scriptsHtml = "", devMode = false, tableName, playerName, gameId } = options;

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
    <script src="/session-id.js"></script>
    <script src="/hny.js"></script>
    <script>
${HONEYCOMB_TRACING_INIT_SCRIPT}
      initHoneycombTracing("${process.env.HONEYCOMB_INGEST_API_KEY || process.env.HONEYCOMB_API_KEY}", ${devMode}, ${jsStringArg(tableName?.toLowerCase())}, ${jsStringArg(playerName)}, ${jsStringArg(gameId)});
    </script>
${scriptsHtml}
  </head>`;
}

const GAME_HEAD_SCRIPTS_HTML = `    <script src="/htmx.js"></script>
    <script>
      // Configure HTMX to swap on 409 Conflict responses
      htmx.config.responseHandling = [
        {code: "204", swap: false},  // No Content
        {code: "2..", swap: true},   // All other 2xx
        {code: "409", swap: true},   // Conflict (stale state)
        {code: "502", swap: true, error: true},
      ];
    </script>
    <script src="/game.js"></script>
    <script src="/modal-query-params.js"></script>
    <script src="/modal-focus.js"></script>`;

interface PageWrapperOptions {
  title: string;
  content: string;
  footerContent?: string;
  additionalStylesheets?: string[];
  includeFooter?: boolean;
  devMode?: boolean;
  tableName?: string;
  playerName?: string;
  gameId?: string;
}

function formatPageWrapper(options: PageWrapperOptions): string {
  const {
    title,
    content,
    footerContent = ``,
    additionalStylesheets = [],
    includeFooter = true,
    devMode = false,
    tableName,
    playerName,
    gameId
  } = options;

  const headHtml = formatHtmlHead({
    title,
    stylesheets: ["/playmat.css", "/game.css", ...additionalStylesheets],
    additionalFonts: ["Ovo"],
    scriptsHtml: GAME_HEAD_SCRIPTS_HTML,
    devMode,
    tableName,
    playerName,
    gameId,
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
