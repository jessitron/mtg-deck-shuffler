import { AvailableDecks } from "./port-deck-retrieval/types.js";
import { Deck, getCardImageUrl, WhatHappened } from "./types.js";
import { GameCard, GameState } from "./GameState.js";
import { CARD_BACK } from "./view/common.js";

// Core building blocks
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

function formatCardActionButton(
  action: string,
  endpoint: string,
  gameId: number,
  cardIndex: number,
  title: string,
  cssClass = "card-action-button",
  cardId?: string
): string {
  const extraAttrs = action === "Play" && cardId ? `data-card-id="${cardId}"` : "";
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

function formatCardActionsGroup(actions: CardAction[], gameId: number, cardIndex: number, cardId?: string): string {
  return actions.map((action) => formatCardActionButton(action.action, action.endpoint, gameId, cardIndex, action.title, action.cssClass, cardId)).join("");
}

function formatLibraryCardActions(game: GameState, gameCard: any): string {
  if (game.status !== "Active") return "";

  const actions: CardAction[] = [
    { action: "Reveal", endpoint: "/reveal-card", title: "Reveal" },
    { action: "Put in Hand", endpoint: "/put-in-hand", title: "Put in Hand", cssClass: "card-action-button secondary" },
  ];

  return `<div class="card-actions">
    ${formatCardActionsGroup(actions, game.gameId, gameCard.gameCardIndex)}
  </div>`;
}

function formatRevealedCardActions(game: GameState, gameCard: GameCard): string {
  const actions: CardAction[] = [
    { action: "Play", endpoint: "/play-card", title: "Copy image and remove from revealed", cssClass: "play-button" },
    { action: "Put in Hand", endpoint: "/put-in-hand", title: "Move card to hand", cssClass: "put-in-hand-button" },
    { action: "Put on Top", endpoint: "/put-on-top", title: "Move card to top of library", cssClass: "put-on-top-button" },
    { action: "Put on Bottom", endpoint: "/put-on-bottom", title: "Move card to bottom of library", cssClass: "put-on-bottom-button" },
  ];

  return `<div class="card-buttons">
    ${formatCardActionsGroup(actions, game.gameId, gameCard.gameCardIndex, gameCard.card.scryfallId)}
  </div>`;
}

function formatHandCardActions(game: GameState, gameCard: GameCard, index: number): string {
  const handSize = game.listHand().length;
  const swapButton =
    index < handSize - 1
      ? `<button class="swap-button"
             hx-post="/swap-with-next/${game.gameId}/${index}"
             hx-target="#game-container"
             hx-swap="outerHTML"
             title="Swap with next card">
       ↔
     </button>`
      : "";

  const actions: CardAction[] = [
    { action: "Play", endpoint: "/play-card", title: "Copy image and remove from hand", cssClass: "play-button" },
    { action: "Put down", endpoint: "/put-down", title: "Move card to revealed", cssClass: "put-down-button" },
  ];

  return `<div class="hand-card-buttons">
    ${formatCardActionsGroup(actions, game.gameId, gameCard.gameCardIndex, gameCard.card.scryfallId)}
    ${swapButton}
  </div>`;
}

function formatCardContainer(gameCard: GameCard, containerType: "revealed" | "hand", actions: string, animationClass = ""): string {
  const imageUrl = getCardImageUrl(gameCard.card.scryfallId);
  const cardClass = containerType === "revealed" ? "revealed-card" : "hand-card";

  return `<div id="card-container-${gameCard.gameCardIndex}" class="${containerType}-card-container">
    <img src="${imageUrl}"
         alt="${gameCard.card.name}"
         class="mtg-card-image ${cardClass}${animationClass}"
         title="${gameCard.card.name}" />
    ${actions}
  </div>`;
}

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
  const commanderImageHtml = formatCommanderImageHtml(deck.commanders);
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

export function formatGamePageHtml(game: GameState): string {
  const gameContent = formatGameHtml(game);
  return formatPageWrapper(`MTG Game - ${game.deckName}`, gameContent);
}

function formatLibraryCardList(game: GameState): string {
  const libraryCards = game.listLibrary();

  return libraryCards
    .map((gameCard: any) => {
      const cardActions = formatLibraryCardActions(game, gameCard);
      return `<li class="library-card-item">
          <span class="card-position">${gameCard.location.position + 1}</span>
          <div class="card-info">
            <a href="https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${gameCard.card.multiverseid}" target="_blank" class="card-name-link">${
        gameCard.card.name
      }</a>
          </div>
          ${cardActions}
        </li>`;
    })
    .join("");
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
          <img src="${CARD_BACK}" alt="Library" class="mtg-card-image library-card-back library-card-1" data-testid="card-back" />
          <img src="${CARD_BACK}" alt="Library" class="mtg-card-image library-card-back library-card-2" data-testid="card-back" />
          <img src="${CARD_BACK}" alt="Library" class="mtg-card-image library-card-back library-card-3" data-testid="card-back" />
        </div>`;
}

export function formatDeckReviewHtmlSection(game: GameState): string {
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

function getAnimationClass(whatHappened: WhatHappened, gameCardIndex: number): string {
  if (whatHappened.movedLeft && whatHappened.movedLeft.some((card) => card.gameCardIndex === gameCardIndex)) {
    return " card-moved-left";
  } else if (whatHappened.movedRight && whatHappened.movedRight.some((card) => card.gameCardIndex === gameCardIndex)) {
    return " card-moved-right";
  }
  return "";
}

function formatRevealedCardsHtml(game: GameState, whatHappened: WhatHappened): string {
  const revealedCards = game.listRevealed();

  if (revealedCards.length === 0) return "";

  const revealedCardsArea = revealedCards
    .map((gameCard: any) => {
      const animationClass = getAnimationClass(whatHappened, gameCard.gameCardIndex);
      const actions = formatRevealedCardActions(game, gameCard);
      return formatCardContainer(gameCard, "revealed", actions, animationClass);
    })
    .join("");

  return `<div id="revealed-cards-section" class="revealed-cards-section">
      <h3>Revealed Cards (${revealedCards.length})</h3>
      <div id="revealed-cards-area" class="revealed-cards-area">
        ${revealedCardsArea}
        ${revealedCards.length === 0 ? '<p class="no-revealed-cards">No cards revealed yet</p>' : ""}
      </div>
    </div>`;
}

function formatHandSectionHtml(game: GameState, whatHappened: WhatHappened): string {
  const handCards = game
    .listHand()
    .map((gameCard: GameCard, index: number) => {
      const animationClass = getAnimationClass(whatHappened, gameCard.gameCardIndex);
      const actions = formatHandCardActions(game, gameCard, index);
      return formatCardContainer(gameCard, "hand", actions, animationClass);
    })
    .join("");

  return `<div id="hand-section" data-testid="hand-section">
        <h3>Hand (${game.listHand().length})</h3>
        <div id="hand-cards" class="hand-cards">
          ${handCards}
        </div>
      </div>`;
}

function formatLibrarySectionHtml(game: GameState, whatHappened: WhatHappened): string {
  const shufflingClass = whatHappened.shuffling ? " shuffling" : "";

  return `<div id="library-section" data-testid="library-section">
        <h3>Library (${game.listLibrary().length})</h3>
        <div class="library-stack${shufflingClass}" data-testid="library-stack">
          <img src="${CARD_BACK}" alt="Library" class="mtg-card-image library-card-back library-card-1" data-testid="card-back" />
          <img src="${CARD_BACK}" alt="Library" class="mtg-card-image library-card-back library-card-2" data-testid="card-back" />
          <img src="${CARD_BACK}" alt="Library" class="mtg-card-image library-card-back library-card-3" data-testid="card-back" />
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
      </div>`;
}

function formatGameActionsHtml(game: GameState): string {
  return `<div id="end-game-actions" class="game-actions">
        <form method="post" action="/restart-game" style="display: inline;">
          <input type="hidden" name="game-id" value="${game.gameId}" />
          <button type="submit">Restart Game</button>
        </form>
        <form method="post" action="/end-game" style="display: inline;">
          <input type="hidden" name="game-id" value="${game.gameId}" />
          <button type="submit">Choose Another Deck</button>
        </form>
      </div>`;
}

export function formatActiveGameHtml(game: GameState, whatHappened: WhatHappened): string {
  const gameHeaderHtml = formatGameHeaderHtml(game);
  const tableCardsCount = game.listTable().length;
  const librarySectionHtml = formatLibrarySectionHtml(game, whatHappened);
  const revealedCardsHtml = formatRevealedCardsHtml(game, whatHappened);
  const handSectionHtml = formatHandSectionHtml(game, whatHappened);
  const gameActionsHtml = formatGameActionsHtml(game);

  return `<div id="game-container">
      ${gameHeaderHtml}
      
      <div id="mid-game-buttons">
        <button class="table-cards-button"
                hx-get="/table-modal/${game.gameId}"
                hx-target="#modal-container"
                hx-swap="innerHTML">${tableCardsCount} Cards on table</button>
      </div>
      
      ${librarySectionHtml}
      
      ${revealedCardsHtml}
      
      ${handSectionHtml}

      <!-- Modal Container -->
      <div id="modal-container"></div>
      
      ${gameActionsHtml}
    </div>`;
}

function formatTableCardList(game: GameState): string {
  const tableCards = game.listTable();

  return tableCards
    .map(
      (gameCard: any, index: number) =>
        `<li class="table-card-item">
          <div class="card-info">
            <a href="https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${gameCard.card.multiverseid}" target="_blank" class="card-name-link">${gameCard.card.name}</a>
          </div>
          <div class="card-actions">
              <button class="card-action-button"
                      hx-post="/reveal-card/${game.gameId}/${gameCard.gameCardIndex}"
                      hx-target="#game-container"
                      hx-swap="outerHTML">Return</button>
          </div>
        </li>`
    )
    .join("");
}

export function formatTableModalHtml(game: GameState): string {
  const tableCards = game.listTable();
  const tableCardList = formatTableCardList(game);

  const bodyContent = `<p style="margin-bottom: 16px; color: #666; font-size: 0.9rem;">
          ${tableCards.length} cards on table
        </p>
        <ul class="table-search-list">
          ${tableCardList}
        </ul>`;

  return formatModalHtml("Cards on Table", bodyContent);
}

export function formatGameHtml(game: GameState, whatHappened: WhatHappened = {}): string {
  if (game.status === "NotStarted") {
    return formatDeckReviewHtmlSection(game);
  } else {
    return formatActiveGameHtml(game, whatHappened);
  }
}
