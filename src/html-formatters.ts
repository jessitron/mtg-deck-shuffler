import { AvailableDecks } from "./port-deck-retrieval/types.js";
import { Deck, getCardImageUrl } from "./types.js";
import { GameState } from "./GameState.js";

export function formatChooseDeckHtml(availableDecks: AvailableDecks) {
  const archidektSelectionHtml = formatArchidektInput();

  const localSelectionHtml = formatLocalDeckInput(availableDecks);
  return `<div id="deck-input">
      ${archidektSelectionHtml}
      ${localSelectionHtml}
    </div>`;
}

function formatArchidektInput() {
  return `<div class="deck-input-section">
      <form method="POST" action="/deck">
        <label for="deck-number" class="deck-label">Enter <a href="https://archidekt.com/" target="_blank">Archidekt</a> Deck Number:</label>
        <input type="text" id="deck-number" name="deck-number" value="14669648" placeholder="14669648" class="deck-input" />
        <input type="hidden" name="deck-source" value="archidekt" />
        <button type="submit" class="lets-play-button">Let's Play (from Archidekt)</button>
      </form>
   </div>`;
}

function formatLocalDeckInput(availableDecks: AvailableDecks) {
  if (availableDecks.length === 0) {
    return "";
  }

  const options = availableDecks.filter((o) => o.deckSource === "local").map((o) => `<option value="${o.localFile}">${o.description}</option>`);
  return `<div class="deck-input-section">
      <form method="POST" action="/deck">
        <label for="local-deck" class="deck-label">Or choose a pre-loaded deck:</label> 
        <input type="hidden" name="deck-source" value="local" />
        <select id="local-deck" name="local-deck" class="deck-select">${options}</select>
        <button type="submit" class="lets-play-button">Let's Play</button>
      </form>
    </div>`;
}

export function formatDeckHtml(deck: Deck): string {
  const commanderImageHtml =
    deck.commanders.length > 0
      ? deck.commanders.map((commander) => `<img src="${getCardImageUrl(commander.uid)}" alt="${commander.name}" class="commander-image" />`).join("")
      : `<div class="commander-placeholder">No Commander Image</div>`;

  const cardCountInfo = `${deck.totalCards} cards`;

  const retrievedInfo = `Retrieved: ${deck.provenance.retrievedDate.toLocaleString()}`;

  return `<div id="deck-info">
        <div class="deck-details-layout">
          <div class="commander-section">
            ${commanderImageHtml}
          </div>
          <div class="deck-info-section">
            <h2><a href="https://archidekt.com/decks/${deck.id}" target="_blank">${deck.name}</a></h2>
            <p>${cardCountInfo}</p>
            <p><small>${retrievedInfo}</small></p>
          </div>
        </div>
        <div class="deck-actions">
          <input type="hidden" name="deck-id" value="${deck.id}" />
          <button hx-post="/start-game" class="start-game-button" hx-include="closest div" hx-target="#deck-input">Start Game</button>
          <form method="post" action="/" style="display: inline;">
            <button type="submit">Choose Another Deck</button>
          </form>
        </div>
    </div>`;
}

export function formatGamePageHtml(game: GameState): string {
  const gameContent = formatGameHtml(game);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MTG Game - ${game.deckName}</title>
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
    <script src="/modal.js"></script>
    <script>
      async function playCard(imageUrl, cardName, handPosition, gameId, buttonElement) {
        try {
          // Fetch the image as a blob
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error('Failed to fetch image');
          }
          const blob = await response.blob();
          
          // Copy to clipboard
          await navigator.clipboard.write([
            new ClipboardItem({
              [blob.type]: blob
            })
          ]);
          
          // Show feedback that image was copied
          buttonElement.textContent = 'Copied!';
          buttonElement.disabled = true;
          
          // Call backend to remove card from hand and update game state
          const playResponse = await fetch(\`/play-card/\${gameId}/\${handPosition}\`, {
            method: 'POST'
          });
          
          if (!playResponse.ok) {
            throw new Error('Failed to play card on server');
          }
          
          // Replace the game content with the updated state
          const updatedGameHtml = await playResponse.text();
          document.querySelector('.game-header').parentNode.innerHTML = updatedGameHtml;
          
        } catch (err) {
          console.error('Failed to play card:', err);
          buttonElement.textContent = 'Error';
          buttonElement.disabled = false;
          setTimeout(() => {
            buttonElement.textContent = 'Play';
          }, 2000);
        }
      }
    </script>
  </head>
  <body>
    <h1>*Woohoo it's Magic time!*</h1>
    ${gameContent}
  </body>
</html>`;
}

export function formatLibraryModalHtml(game: GameState): string {
  const libraryCards = game.listLibrary();

  const libraryCardList = libraryCards
    .map(
      (gameCard: any, index: number) =>
        `<li class="library-card-item">
          <span class="card-position">${index + 1}</span>
          <div class="card-info">
            <a href="https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${gameCard.card.multiverseid}" target="_blank" class="card-name-link">${
          gameCard.card.name
        }</a>
          </div>
          ${
            game.status === "Active"
              ? `
          <div class="card-actions">
            <button class="card-action-button"
                    hx-post="/reveal-card/${game.gameId}/${index}"
                    hx-target="#game-container"
                    hx-swap="outerHTML">Reveal</button>
            <button class="card-action-button secondary"
                    hx-post="/put-in-hand/${game.gameId}/${index}"
                    hx-target="#game-container"
                    hx-swap="outerHTML">Put in Hand</button>
          </div>
          `
              : ""
          }
        </li>`
    )
    .join("");

  return `<div class="modal-overlay"
               hx-get="/close-modal"
               hx-target="#modal-container"
               hx-swap="innerHTML"
               hx-trigger="click[target==this], keyup[key=='Escape'] from:body"
               tabindex="0">
    <div class="modal-dialog">
      <div class="modal-header">
        <h2 class="modal-title">Library Contents</h2>
        <button class="modal-close"
                hx-get="/close-modal"
                hx-target="#modal-container"
                hx-swap="innerHTML">&times;</button>
      </div>
      <div class="modal-body">
        <p style="margin-bottom: 16px; color: #666; font-size: 0.9rem;">
          ${libraryCards.length} cards in library, ordered by position
        </p>
        <ul class="library-search-list">
          ${libraryCardList}
        </ul>
      </div>
    </div>
  </div>`;
}

export function formatGameHtml(game: GameState): string {
  const commanderImageHtml =
    game.commanders.length > 0
      ? game.commanders.map((commander: any) => `<img src="${getCardImageUrl(commander.uid)}" alt="${commander.name}" class="commander-image" />`).join("")
      : `<div class="commander-placeholder">No Commander</div>`;

  const cardCountInfo = `${game.totalCards} cards`;

  const gameActions =
    game.status === "NotStarted"
      ? `<div class="game-actions">
         <input type="hidden" name="game-id" value="${game.gameId}" />
         <button hx-post="/start-game" hx-include="closest div" hx-target="#game-container" class="start-game-button">Shuffle Up</button>
         <form method="post" action="/end-game" style="display: inline;">
           <input type="hidden" name="game-id" value="${game.gameId}" />
           <button type="submit">Choose Another Deck</button>
         </form>
       </div>`
      : `<div class="game-actions">
         <form method="post" action="/restart-game" style="display: inline;">
           <input type="hidden" name="game-id" value="${game.gameId}" />
           <button type="submit">Restart Game</button>
         </form>
         <form method="post" action="/end-game" style="display: inline;">
           <input type="hidden" name="game-id" value="${game.gameId}" />
           <button type="submit">Choose Another Deck</button>
         </form>
       </div>`;

  return `<div id="game-container">
      <div id="game-state">
        <div class="game-header">
          <div class="commander-info">
            ${commanderImageHtml}
          </div>
          <div class="deck-info-right">
            <h2><a href="${game.deckProvenance.sourceUrl}" target="_blank">${game.deckName}</a></h2>
            <p>${cardCountInfo}</p>
            <p><strong>Game ID:</strong> ${game.gameId}</p>
            <p><strong>Status:</strong> ${game.status === "NotStarted" ? "Deck Review" : game.status}</p>
          </div>
        </div>
        
        <div class="game-board">
          <div class="library-section" data-testid="library-section">
            <div class="library-stack" data-testid="library-stack">
              <img src="https://backs.scryfall.io/normal/2/2/222b7a3b-2321-4d4c-af19-19338b134971.jpg" alt="Library" class="library-card-back library-card-1" data-testid="card-back" />
              <img src="https://backs.scryfall.io/normal/2/2/222b7a3b-2321-4d4c-af19-19338b134971.jpg" alt="Library" class="library-card-back library-card-2" data-testid="card-back" />
              <img src="https://backs.scryfall.io/normal/2/2/222b7a3b-2321-4d4c-af19-19338b134971.jpg" alt="Library" class="library-card-back library-card-3" data-testid="card-back" />
            </div>
            <div style="text-align: center; margin: 20px 0;">
              <button class="search-button"
                      hx-get="/library-modal/${game.gameId}"
                      hx-target="#modal-container"
                      hx-swap="innerHTML">Search</button>
              ${
                game.status === "Active"
                  ? `
              <button class="draw-button"
                      hx-post="/draw/${game.gameId}"
                      hx-target="#game-container"
                      hx-swap="outerHTML">Draw</button>
              `
                  : ""
              }
            </div>
          </div>
        </div>
        
        ${
          game.status === "Active"
            ? `
        <div class="hand-section" data-testid="hand-section">
          <h3>Hand</h3>
          <div class="hand-cards">
            ${game
              .listHand()
              .map(
                (gameCard: any, index: number) =>
                  `<div class="hand-card-container">
                     <img src="${getCardImageUrl(gameCard.card.uid)}"
                      alt="${gameCard.card.name}"
                      class="hand-card"
                      title="${gameCard.card.name}" />
                     <button class="play-button"
                             onclick="playCard('${getCardImageUrl(gameCard.card.uid)}', '${gameCard.card.name}', ${gameCard.location.position}, '${game.gameId}', this)"
                             title="Copy image and remove from hand">
                       Play
                     </button>
                   </div>`
              )
              .join("")}
          </div>
        </div>
        `
            : ""
        }

        <!-- Modal Container -->
        <div id="modal-container"></div>
        
        ${gameActions}
      </div>
    </div>`;
}
