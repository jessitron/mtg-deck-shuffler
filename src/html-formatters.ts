import { AvailableDecks } from "./port-deck-retrieval/types.js";
import { Deck, getCardImageUrl } from "./types.js";
import { GameCard, GameState } from "./GameState.js";

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
      ? deck.commanders
          .map((commander) => `<img src="${getCardImageUrl(commander.uid)}" alt="${commander.name}" class="mtg-card-image commander-image" />`)
          .join("")
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
    <script>
      // Handle clipboard copying when HTMX is about to make the request
      document.addEventListener('htmx:beforeRequest', async function(evt) {
        if (evt.detail.elt.classList.contains('play-button')) {
          const button = evt.detail.elt;
          const imageUrl = button.dataset.imageUrl;

          // Try to copy to clipboard first
          try {
            const response = await fetch(imageUrl);
            if (response.ok) {
              const blob = await response.blob();
              await navigator.clipboard.write([
                new ClipboardItem({
                  [blob.type]: blob
                })
              ]);
              button.textContent = 'Copied!';
            }
          } catch (clipboardErr) {
            console.warn('Failed to copy image to clipboard:', clipboardErr);
            button.textContent = 'Playing...';
          }

          button.disabled = true;
        }
      });
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
    .map((gameCard: any) => {
      return `<li class="library-card-item">
          <span class="card-position">${gameCard.location.position + 1}</span>
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
                    hx-post="/reveal-card/${game.gameId}/${gameCard.gameCardIndex}"
                    hx-target="#game-container"
                    hx-swap="outerHTML">Reveal</button>
            <button class="card-action-button secondary"
                    hx-post="/put-in-hand/${game.gameId}/${gameCard.gameCardIndex}"
                    hx-target="#game-container"
                    hx-swap="outerHTML">Put in Hand</button>
          </div>
          `
              : ""
          }
        </li>`;
    })
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

export function formatDeckReviewHtml(game: GameState): string {
  const commanderImageHtml =
    game.commanders.length > 0
      ? game.commanders
          .map((commander: any) => `<img src="${getCardImageUrl(commander.uid)}" alt="${commander.name}" class="mtg-card-image commander-image" />`)
          .join("")
      : `<div class="commander-placeholder">No Commander</div>`;

  const cardCountInfo = `${game.totalCards} cards`;

  return `<div id="game-container">
      <div id="command-zone">
        ${commanderImageHtml}
      </div>
      
      <div id="game-details">
        <h2><a href="${game.deckProvenance.sourceUrl}" target="_blank">${game.deckName}</a></h2>
        <p>${cardCountInfo}</p>
        <p><strong>Game ID:</strong> ${game.gameId}</p>
      </div>
      
      <div id="library-section" data-testid="library-section">
        <h3>Library (${game.listLibrary().length})</h3>
        <div class="library-stack" data-testid="library-stack">
          <img src="https://backs.scryfall.io/normal/2/2/222b7a3b-2321-4d4c-af19-19338b134971.jpg" alt="Library" class="mtg-card-image library-card-back library-card-1" data-testid="card-back" />
          <img src="https://backs.scryfall.io/normal/2/2/222b7a3b-2321-4d4c-af19-19338b134971.jpg" alt="Library" class="mtg-card-image library-card-back library-card-2" data-testid="card-back" />
          <img src="https://backs.scryfall.io/normal/2/2/222b7a3b-2321-4d4c-af19-19338b134971.jpg" alt="Library" class="mtg-card-image library-card-back library-card-3" data-testid="card-back" />
        </div>
        <div class="library-buttons">
          <button class="search-button"
                  hx-get="/library-modal/${game.gameId}"
                  hx-target="#modal-container"
                  hx-swap="innerHTML">Search</button>
          <button class="shuffle-button"
                  hx-post="/shuffle/${game.gameId}"
                  hx-target="#game-container"
                  hx-swap="outerHTML">Shuffle</button>
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

export function formatActiveGameHtml(game: GameState, shuffling: boolean): string {
  const commanderImageHtml =
    game.commanders.length > 0
      ? game.commanders
          .map((commander: any) => `<img src="${getCardImageUrl(commander.uid)}" alt="${commander.name}" class="mtg-card-image commander-image" />`)
          .join("")
      : `<div class="commander-placeholder">No Commander</div>`;

  const cardCountInfo = `${game.totalCards} cards`;

  const revealedCards = game.listRevealed();
  const revealedCardsHtml = `
    <div class="revealed-cards-section" class="revealed-cards-section">
      <h3>Revealed Cards ${revealedCards.length > 0 ? `(${revealedCards.length})` : ""}</h3>
      <div class="revealed-cards-area">
        ${revealedCards
          .map(
            (gameCard: any) =>
              `<div class="revealed-card-container">
             <img src="${getCardImageUrl(gameCard.card.uid)}" id="revealed-card-${gameCard.gameCardIndex}"
                  alt="${gameCard.card.name}"
                  class="mtg-card-image revealed-card"
                  title="${gameCard.card.name}" />
             <div class="card-buttons">
               <button class="play-button"
                       hx-post="/play-card/${game.gameId}/${gameCard.gameCardIndex}"
                       hx-target="#game-container"
                       hx-swap="outerHTML"
                       data-image-url="${getCardImageUrl(gameCard.card.uid)}"
                       title="Copy image and remove from revealed">
                 Play
               </button>
               <button class="put-in-hand-button"
                       hx-post="/put-in-hand/${game.gameId}/${gameCard.gameCardIndex}"
                       hx-target="#game-container"
                       hx-swap="outerHTML"
                       title="Move card to hand">
                 Put in Hand
               </button>
               <button class="put-on-top-button"
                       hx-post="/put-on-top/${game.gameId}/${gameCard.gameCardIndex}"
                       hx-target="#game-container"
                       hx-swap="outerHTML"
                       title="Move card to top of library">
                 Put on Top
               </button>
             </div>
           </div>`
          )
          .join("")}
        ${revealedCards.length === 0 ? '<p class="no-revealed-cards">No cards revealed yet</p>' : ""}
      </div>
    </div>`;

  const handCardsHtml = `<div id="hand-section" data-testid="hand-section">
        <h3>Hand (${game.listHand().length})</h3>
        <div class="hand-cards">
          ${game
            .listHand()
            .map((gameCard: GameCard, index: number) => {
              return `<div class="hand-card-container">
                   <img src="${getCardImageUrl(gameCard.card.uid)}"
                    alt="${gameCard.card.name}"
                    class="mtg-card-image hand-card"
                    title="${gameCard.card.name}" />
                   <button class="play-button"
                           hx-post="/play-card/${game.gameId}/${gameCard.gameCardIndex}"
                           hx-target="#game-container"
                           hx-swap="outerHTML"
                           data-image-url="${getCardImageUrl(gameCard.card.uid)}"
                           title="Copy image and remove from hand">
                     Play
                   </button>
                 </div>`;
            })
            .join("")}
        </div>
      </div>`;

  const tableCardsCount = game.listTable().length;

  return `<div id="game-container">
      <div id="command-zone">
        ${commanderImageHtml}
      </div>
      
      <div id="game-details">
        <h2><a href="${game.deckProvenance.sourceUrl}" target="_blank">${game.deckName}</a></h2>
        <p>${cardCountInfo}</p>
        <p><strong>Game ID:</strong> ${game.gameId}</p>
        <p><strong>Status:</strong> ${game.status}</p>
      </div>
      
      <div id="mid-game-buttons">
        <button class="table-cards-button"
                hx-get="/table-modal/${game.gameId}"
                hx-target="#modal-container"
                hx-swap="innerHTML">${tableCardsCount} Cards on table</button>
      </div>
      
      <div id="library-section" data-testid="library-section">
        <h3>Library (${game.listLibrary().length})</h3>
        <div class="library-stack ${shuffling ? "shuffling" : ""}" data-testid="library-stack">
          <img src="https://backs.scryfall.io/normal/2/2/222b7a3b-2321-4d4c-af19-19338b134971.jpg" alt="Library" class="mtg-card-image library-card-back library-card-1" data-testid="card-back" />
          <img src="https://backs.scryfall.io/normal/2/2/222b7a3b-2321-4d4c-af19-19338b134971.jpg" alt="Library" class="mtg-card-image library-card-back library-card-2" data-testid="card-back" />
          <img src="https://backs.scryfall.io/normal/2/2/222b7a3b-2321-4d4c-af19-19338b134971.jpg" alt="Library" class="mtg-card-image library-card-back library-card-3" data-testid="card-back" />
        </div>
        <div class="library-buttons">
          <button class="search-button"
                  hx-get="/library-modal/${game.gameId}"
                  hx-target="#modal-container"
                  hx-swap="innerHTML">Search</button>
          <button class="shuffle-button"
                  hx-post="/shuffle/${game.gameId}"
                  hx-target="#game-container"
                  hx-swap="outerHTML">Shuffle</button>
          <button class="draw-button"
                  hx-post="/draw/${game.gameId}"
                  hx-target="#game-container"
                  hx-swap="outerHTML">Draw</button>
          <button class="reveal-button"
                  hx-post="/reveal-card/${game.gameId}/${game.listLibrary()[0].gameCardIndex}"
                  hx-target="#game-container"
                  hx-swap="outerHTML">Reveal</button>
        </div>
      </div>
      
        ${revealedCardsHtml}
      
     ${handCardsHtml}

      <!-- Modal Container -->
      <div id="modal-container"></div>
      
      <div id="end-game-actions" class="game-actions">
        <form method="post" action="/restart-game" style="display: inline;">
          <input type="hidden" name="game-id" value="${game.gameId}" />
          <button type="submit">Restart Game</button>
        </form>
        <form method="post" action="/end-game" style="display: inline;">
          <input type="hidden" name="game-id" value="${game.gameId}" />
          <button type="submit">Choose Another Deck</button>
        </form>
      </div>
    </div>`;
}

export function formatTableModalHtml(game: GameState): string {
  const tableCards = game.listTable();

  const tableCardList = tableCards
    .map(
      (gameCard: any, index: number) =>
        `<li class="table-card-item">
          <div class="card-info">
            <a href="https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${gameCard.card.multiverseid}" target="_blank" class="card-name-link">${gameCard.card.name}</a>
          </div>
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
        <h2 class="modal-title">Cards on Table</h2>
        <button class="modal-close"
                hx-get="/close-modal"
                hx-target="#modal-container"
                hx-swap="innerHTML">&times;</button>
      </div>
      <div class="modal-body">
        <p style="margin-bottom: 16px; color: #666; font-size: 0.9rem;">
          ${tableCards.length} cards on table
        </p>
        <ul class="table-search-list">
          ${tableCardList}
        </ul>
      </div>
    </div>
  </div>`;
}

export function formatGameNotFoundPageHtml(gameId: number): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Game Not Found - MTG Deck Shuffler</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <h1>*Woohoo it's Magic time!*</h1>
    <div class="deck-input-section">
      <div style="text-align: center; color: #f44336; margin-bottom: 20px;">
        <h2>🎯 Game Not Found</h2>
        <p>Game <strong>${gameId}</strong> could not be found.</p>
        <p style="color: #666; font-size: 0.9rem;">It may have expired or the ID might be incorrect.</p>
      </div>
      <div class="deck-actions">
        <form method="get" action="/" style="display: inline;">
          <button type="submit" class="lets-play-button">Start a New Game</button>
        </form>
      </div>
    </div>
  </body>
</html>`;
}

export function formatGameHtml(game: GameState, shuffling: boolean = false): string {
  if (game.status === "NotStarted") {
    return formatDeckReviewHtml(game);
  } else {
    return formatActiveGameHtml(game, shuffling);
  }
}
