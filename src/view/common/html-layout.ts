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
${additionalStylesheetsHtml}
    <script src="/hny.js"></script>
    <script>
      Hny.initializeTracing({
        apiKey: "${process.env.HONEYCOMB_INGEST_API_KEY || process.env.HONEYCOMB_API_KEY}",
        serviceName: "mtg-deck-shuffler-web",
        debug: false,
        provideOneLinkToHoneycomb: true,
      });
    </script>
    <script src="/htmx.js"></script>
    <script src="/game.js"></script>
  </head>`;
}

function formatPageWrapper(
  title: string,
  content: string,
  footerContent: string = ``,
  additionalStylesheets: string[] = [],
  includeFooter: boolean = true
): string {
  const headHtml = formatHtmlHead(title, additionalStylesheets);
  const footerHtml = includeFooter ? `
    <footer>
      ${footerContent}
      <a href="https://github.com/jessitron/mtg-deck-shuffler" target="_blank"><img src="/github-mark.svg" height=50px alt="GitHub" class="github-logo"></a></p>
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

  const content = `<div class="deck-input-section">
      <div class="error-message">
        <h2>${icon} ${title}</h2>
        <p>${message}</p>
        ${details ? `<p class="error-details">${details}</p>` : ""}
      </div>
      <div class="deck-actions">
        <form method="get" action="/" class="inline-form">
          <button type="submit" class="lets-play-button">Start a New Game</button>
        </form>
      </div>
    </div>`;

  return formatPageWrapper(`${title} - MTG Deck Shuffler`, content);
}

export { formatHtmlHead, formatPageWrapper };
