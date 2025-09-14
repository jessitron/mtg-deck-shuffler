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

function formatPageWrapper(title: string, content: string): string {
  const headHtml = formatHtmlHead(title);

  return `<!DOCTYPE html>
<html lang="en">
  ${headHtml}
  <body>
    <h1>*Woohoo it's Magic time!*</h1>
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
      <div style="text-align: center; color: #f44336; margin-bottom: 20px;">
        <h2>${icon} ${title}</h2>
        <p>${message}</p>
        ${details ? `<p style="color: #666; font-size: 0.9rem;">${details}</p>` : ''}
      </div>
      <div class="deck-actions">
        <form method="get" action="/" style="display: inline;">
          <button type="submit" class="lets-play-button">Start a New Game</button>
        </form>
      </div>
    </div>`;

  return formatPageWrapper(`${title} - MTG Deck Shuffler`, content);
}

export { formatHtmlHead, formatPageWrapper };