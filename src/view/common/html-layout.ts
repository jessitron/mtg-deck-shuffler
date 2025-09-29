function formatHtmlHead(title: string): string {
  return `<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <link rel="stylesheet" href="/styles.css" />
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

function formatPageWrapper(title: string, content: string, showHeader: boolean = true): string {
  const headHtml = formatHtmlHead(title);
  const headerHtml = showHeader ? '<h1>*Woohoo it\'s Magic time!*</h1>' : '';

  return `<!DOCTYPE html>
<html lang="en">
  ${headHtml}
  <body>
    ${headerHtml}
    ${content}

    <footer>
      <p>MTG Deck Shuffler | <a href="https://github.com/jessitron/mtg-deck-shuffler" target="_blank">GitHub</a></p>
    </footer>
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
        ${details ? `<p class="error-details">${details}</p>` : ''}
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