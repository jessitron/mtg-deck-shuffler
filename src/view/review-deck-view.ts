import { getCardImageUrl } from "../types.js";
import { GameState } from "../GameState.js";

function formatCommanderImageHtml(commanders: any[]): string {
  return commanders.length > 0
    ? commanders
        .map((commander) => `<img src="${getCardImageUrl(commander.scryfallId)}" alt="${commander.name}" class="mtg-card-image commander-image" />`)
        .join("")
    : `<div class="commander-placeholder">No Commander</div>`;
}

function formatGameDetailsHtml(game: GameState): string {
  const cardCountInfo = `${game.totalCards} cards`;
  return `<div id="game-details">
        <h2><a href="${game.deckProvenance.sourceUrl}" target="_blank">${game.deckName}</a></h2>
        <p>${cardCountInfo}</p>
        <p><strong>Game ID:</strong> ${game.gameId}</p>
        ${game.status !== "NotStarted" ? `<p><strong>Status:</strong> ${game.status}</p>` : ""}
      </div>`;
}

function formatModalHtml(title: string, bodyContent: string): string {
  return `<div class="modal-overlay"
               hx-get="/close-modal"
               hx-target="#modal-container"
               hx-swap="innerHTML"
               hx-trigger="click[target==this], keyup[key=='Escape'] from:body"
               tabindex="0">
    <div class="modal-dialog">
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button class="modal-close"
                hx-get="/close-modal"
                hx-target="#modal-container"
                hx-swap="innerHTML">&times;</button>
      </div>
      <div class="modal-body">
        ${bodyContent}
      </div>
    </div>
  </div>`;
}

type CardAction = {
  action: string;
  endpoint: string;
  title: string;
  cssClass?: string;
};

function formatCardActionButton(action: string, endpoint: string, gameId: number, cardIndex: number, title: string, cssClass = "card-action-button", imageUrl?: string): string {
  const extraAttrs = action === "Play" && imageUrl ? `data-image-url="${imageUrl}"` : "";
  const swapAttr = action === "Play" ? `hx-swap="outerHTML swap:1.5s"` : `hx-swap="outerHTML"`;
  return `<button class="${cssClass}"
                    hx-post="${endpoint}/${gameId}/${cardIndex}"
                    hx-target="#game-container"
                    ${swapAttr}
                    ${extraAttrs}
                    title="${title}">
                 ${action}
               </button>`;
}

function formatCardActionsGroup(actions: CardAction[], gameId: number, cardIndex: number, imageUrl?: string): string {
  return actions.map(action => 
    formatCardActionButton(action.action, action.endpoint, gameId, cardIndex, action.title, action.cssClass, imageUrl)
  ).join("");
}

function formatLibraryCardActions(game: GameState, gameCard: any): string {
  if (game.status !== "Active") return "";
  
  const actions: CardAction[] = [
    { action: "Reveal", endpoint: "/reveal-card", title: "Reveal" },
    { action: "Put in Hand", endpoint: "/put-in-hand", title: "Put in Hand", cssClass: "card-action-button secondary" }
  ];
  
  return `<div class="card-actions">
    ${formatCardActionsGroup(actions, game.gameId, gameCard.gameCardIndex)}
  </div>`;
}

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

function formatGameHeaderHtml(game: GameState): string {
  const commanderImageHtml = formatCommanderImageHtml(game.commanders);
  const gameDetailsHtml = formatGameDetailsHtml(game);
  
  return `<div id="command-zone">
        ${commanderImageHtml}
      </div>
      ${gameDetailsHtml}`;
}

function formatLibraryStackHtml(): string {
  return `<div class="library-stack" data-testid="library-stack">
          <img src="https://backs.scryfall.io/normal/2/2/222b7a3b-2321-4d4c-af19-19338b134971.jpg" alt="Library" class="mtg-card-image library-card-back library-card-1" data-testid="card-back" />
          <img src="https://backs.scryfall.io/normal/2/2/222b7a3b-2321-4d4c-af19-19338b134971.jpg" alt="Library" class="mtg-card-image library-card-back library-card-2" data-testid="card-back" />
          <img src="https://backs.scryfall.io/normal/2/2/222b7a3b-2321-4d4c-af19-19338b134971.jpg" alt="Library" class="mtg-card-image library-card-back library-card-3" data-testid="card-back" />
        </div>`;
}

function formatLibraryCardList(game: GameState): string {
  const libraryCards = game.listLibrary();
  
  return libraryCards
    .map((gameCard: any) => {
      const cardActions = formatLibraryCardActions(game, gameCard);
      return `<li class="library-card-item">
          <span class="card-position">${gameCard.location.position + 1}</span>
          <div class="card-info">
            <a href="https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${gameCard.card.multiverseid}" target="_blank" class="card-name-link">${gameCard.card.name}</a>
          </div>
          ${cardActions}
        </li>`;
    })
    .join("");
}

export function formatGamePageHtml(game: GameState): string {
  const gameContent = formatDeckReviewHtml(game);
  return formatPageWrapper(`MTG Game - ${game.deckName}`, gameContent);
}

export function formatLibraryModalHtml(game: GameState): string {
  const libraryCards = game.listLibrary();
  const libraryCardList = formatLibraryCardList(game);
  
  const bodyContent = `<p style="margin-bottom: 16px; color: #666; font-size: 0.9rem;">
          ${libraryCards.length} cards in library, ordered by position
        </p>
        <ul class="library-search-list">
          ${libraryCardList}
        </ul>`;
  
  return formatModalHtml("Library Contents", bodyContent);
}

export function formatDeckReviewHtml(game: GameState): string {
  const gameHeaderHtml = formatGameHeaderHtml(game);
  const libraryStackHtml = formatLibraryStackHtml();

  return `<div id="game-container">
      ${gameHeaderHtml}
      
      <div id="library-section" data-testid="library-section">
        <h3>Library (${game.listLibrary().length})</h3>
        ${libraryStackHtml}
        <div class="library-buttons-single">
          <button class="search-button"
                  hx-get="/library-modal/${game.gameId}"
                  hx-target="#modal-container"
                  hx-swap="innerHTML">Search</button>
        </div>
      </div>

      <!-- Modal Container -->
      <div id="modal-container"></div>
      
      <div id="start-game-buttons" class="deck-actions">
        <input type="hidden" name="game-id" value="${game.gameId}" />
        <button hx-post="/start-game" hx-include="closest div" hx-target="#game-container"    hx-swap="outerHTML" class="start-game-button">Shuffle Up</button>
        <form method="post" action="/end-game" style="display: inline;">
          <input type="hidden" name="game-id" value="${game.gameId}" />
          <button type="submit">Choose Another Deck</button>
        </form>
      </div>
    </div>`;
}