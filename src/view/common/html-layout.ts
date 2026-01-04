function formatHtmlHead(title: string, additionalStylesheets: string[] = []): string {
  const additionalStylesheetsHtml = additionalStylesheets.map(href => `    <link rel="stylesheet" href="${href}" />`).join('\n');

  return `<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Rampart+One&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/game.css" />
${additionalStylesheetsHtml}
    <script>
      // Generate browserTabId first, before tracing initialization
      const SESSION_STORAGE_KEY = "browserTabId";
      let browserTabId = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!browserTabId) {
        browserTabId = crypto.randomUUID();
        sessionStorage.setItem(SESSION_STORAGE_KEY, browserTabId);
      }
      window.browserTabId = browserTabId;
    </script>
    <script src="/hny.js"></script>
    <script>
      Hny.initializeTracing({
        apiKey: "${process.env.HONEYCOMB_INGEST_API_KEY || process.env.HONEYCOMB_API_KEY}",
        serviceName: "mtg-deck-shuffler-web",
        debug: false,
        provideOneLinkToHoneycomb: true,
        resourceAttributes: {
          "game.browser_tab_id": window.browserTabId
        }
      });
    </script>
    <script src="/htmx.js"></script>
    <script>
      // Configure HTMX to include browserTabId in all requests
      document.addEventListener("htmx:configRequest", function (event) {
        event.detail.headers["X-Browser-Tab-Id"] = window.browserTabId;
      });

      // Configure HTMX to swap on 409 Conflict responses
      htmx.config.responseHandling = [
        {code: "204", swap: false},  // No Content
        {code: "2..", swap: true},   // All other 2xx
        {code: "409", swap: true},   // Conflict (stale state)
      ];
    </script>
    <script src="/game.js"></script>
  </head>`;
}

interface PageWrapperOptions {
  title: string;
  content: string;
  footerContent?: string;
  additionalStylesheets?: string[];
  includeFooter?: boolean;
}

function formatPageWrapper(options: PageWrapperOptions): string {
  const {
    title,
    content,
    footerContent = ``,
    additionalStylesheets = [],
    includeFooter = true
  } = options;

  const headHtml = formatHtmlHead(title, additionalStylesheets);
  const footerHtml = includeFooter ? `
    <footer>
      ${footerContent}
      <a href="https://github.com/jessitron/mtg-deck-shuffler" target="_blank"><img src="/images/github-mark.svg" height=50px alt="GitHub" class="github-logo"></a></p>
    </footer>` : '';

  return `<!DOCTYPE html>
<html lang="en">
  ${headHtml}
  <body>
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

export { formatHtmlHead, formatPageWrapper };
