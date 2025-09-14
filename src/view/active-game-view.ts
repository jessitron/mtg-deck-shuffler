import { CardDefinition, getCardImageUrl, WhatHappened } from "../types.js";
import { GameCard, GameState } from "../GameState.js";
import { CARD_BACK } from "./common.js";
import { GameEvent } from "../GameEvents.js";
import { printLocation } from "../port-persist-state/types.js";
import { formatPageWrapper } from "./common/html-layout.js";

function formatCommanderImageHtmlFragment(commanders: any[]): string {
  return commanders.length > 0
    ? commanders
        .map((commander) => `<img src="${getCardImageUrl(commander.scryfallId)}" alt="${commander.name}" class="mtg-card-image commander-image" />`)
        .join("")
    : `<div class="commander-placeholder">No Commander</div>`;
}

function formatGameDetailsHtmlFragment(game: GameState): string {
  const cardCountInfo = `${game.totalCards} cards`;
  return `<div id="game-details">
        <h2><a href="${game.deckProvenance.sourceUrl}" target="_blank">${game.deckName}</a></h2>
        <p>${cardCountInfo}</p>
        <p><strong>Game ID:</strong> ${game.gameId}</p>
        <p><strong>Status:</strong> ${game.gameStatus()}</p>
        <div class="history">
        You've done ${game.gameEvents().length} things so far
        <ol>
        ${game.gameEvents().map((e) => `<li>${formatGameEventHtmlFragment(e, game)}</li>`)}
        </ol>
        </div>
      </div>`;
}

function cardIndexToDefinition(game: GameState, gci: number) {
  return game.getCards()[gci].card;
}

function formatGameEventHtmlFragment(event: GameEvent, game: GameState) {
  switch (event.eventName) {
    case "move card":
      const cardName = cardIndexToDefinition(game, event.move.gameCardIndex).name;
      return `Move ${cardName} from ${printLocation(event.move.fromLocation)} to ${printLocation(event.move.toLocation)}`;
    case "shuffle library":
      return `Shuffle ${event.moves.length} cards in library`;
    case "start game":
      return "Start game";
  }
}

function formatModalHtmlFragment(title: string, bodyContent: string): string {
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

function formatCardActionButtonHtmlFragment(
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

function formatCardActionsGroupHtmlFragment(actions: CardAction[], gameId: number, cardIndex: number, cardId?: string): string {
  return actions.map((action) => formatCardActionButtonHtmlFragment(action.action, action.endpoint, gameId, cardIndex, action.title, action.cssClass, cardId)).join("");
}

function formatRevealedCardActionsHtmlFragment(game: GameState, gameCard: GameCard): string {
  const actions: CardAction[] = [
    { action: "Play", endpoint: "/play-card", title: "Copy image and remove from revealed", cssClass: "play-button" },
    { action: "Put in Hand", endpoint: "/put-in-hand", title: "Move card to hand", cssClass: "put-in-hand-button" },
    { action: "Put on Top", endpoint: "/put-on-top", title: "Move card to top of library", cssClass: "put-on-top-button" },
    { action: "Put on Bottom", endpoint: "/put-on-bottom", title: "Move card to bottom of library", cssClass: "put-on-bottom-button" },
  ];

  return `<div class="card-buttons">
    ${formatCardActionsGroupHtmlFragment(actions, game.gameId, gameCard.gameCardIndex, gameCard.card.scryfallId)}
  </div>`;
}

function formatHandCardActionsHtmlFragment(game: GameState, gameCard: GameCard, index: number): string {
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
    ${formatCardActionsGroupHtmlFragment(actions, game.gameId, gameCard.gameCardIndex, gameCard.card.scryfallId)}
    ${swapButton}
  </div>`;
}

function formatCardContainerHtmlFragment(gameCard: GameCard, containerType: "revealed" | "hand", actions: string, animationClass = ""): string {
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



function formatGameHeaderHtmlFragment(game: GameState): string {
  const commanderImageHtml = formatCommanderImageHtmlFragment(game.commanders);
  const gameDetailsHtml = formatGameDetailsHtmlFragment(game);

  return `<div id="command-zone">
        ${commanderImageHtml}
      </div>
      ${gameDetailsHtml}`;
}

function getAnimationClassHelper(whatHappened: WhatHappened, gameCardIndex: number): string {
  if (whatHappened.movedLeft && whatHappened.movedLeft.some((card) => card.gameCardIndex === gameCardIndex)) {
    return " card-moved-left";
  } else if (whatHappened.movedRight && whatHappened.movedRight.some((card) => card.gameCardIndex === gameCardIndex)) {
    return " card-moved-right";
  }
  return "";
}

function formatRevealedCardsHtmlFragment(game: GameState, whatHappened: WhatHappened): string {
  const revealedCards = game.listRevealed();

  if (revealedCards.length === 0) return "";

  const revealedCardsArea = revealedCards
    .map((gameCard: any) => {
      const animationClass = getAnimationClassHelper(whatHappened, gameCard.gameCardIndex);
      const actions = formatRevealedCardActionsHtmlFragment(game, gameCard);
      return formatCardContainerHtmlFragment(gameCard, "revealed", actions, animationClass);
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

function formatHandSectionHtmlFragment(game: GameState, whatHappened: WhatHappened): string {
  const handCards = game
    .listHand()
    .map((gameCard: GameCard, index: number) => {
      const animationClass = getAnimationClassHelper(whatHappened, gameCard.gameCardIndex);
      const actions = formatHandCardActionsHtmlFragment(game, gameCard, index);
      return formatCardContainerHtmlFragment(gameCard, "hand", actions, animationClass);
    })
    .join("");

  return `<div id="hand-section" data-testid="hand-section">
        <h3>Hand (${game.listHand().length})</h3>
        <div id="hand-cards" class="hand-cards">
          ${handCards}
        </div>
      </div>`;
}

function formatLibrarySectionHtmlFragment(game: GameState, whatHappened: WhatHappened): string {
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

function formatGameActionsHtmlFragment(game: GameState): string {
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

function formatTableCardListHtmlFragment(game: GameState): string {
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

export function formatGamePageHtmlPage(game: GameState, whatHappened: WhatHappened = {}): string {
  const gameContent = formatActiveGameHtmlSection(game, whatHappened);
  return formatPageWrapper(`MTG Game - ${game.deckName}`, gameContent);
}

export function formatActiveGameHtmlSection(game: GameState, whatHappened: WhatHappened): string {
  const gameHeaderHtml = formatGameHeaderHtmlFragment(game);
  const tableCardsCount = game.listTable().length;
  const librarySectionHtml = formatLibrarySectionHtmlFragment(game, whatHappened);
  const revealedCardsHtml = formatRevealedCardsHtmlFragment(game, whatHappened);
  const handSectionHtml = formatHandSectionHtmlFragment(game, whatHappened);
  const gameActionsHtml = formatGameActionsHtmlFragment(game);

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

export function formatTableModalHtmlFragment(game: GameState): string {
  const tableCards = game.listTable();
  const tableCardList = formatTableCardListHtmlFragment(game);

  const bodyContent = `<p style="margin-bottom: 16px; color: #666; font-size: 0.9rem;">
          ${tableCards.length} cards on table
        </p>
        <ul class="table-search-list">
          ${tableCardList}
        </ul>`;

  return formatModalHtmlFragment("Cards on Table", bodyContent);
}

export function formatGameHtmlSection(game: GameState, whatHappened: WhatHappened = {}): string {
  if (game.gameStatus() === "NotStarted") {
    const { formatDeckReviewHtmlSection } = require("./review-deck-view.js");
    return formatDeckReviewHtmlSection(game);
  } else {
    return formatActiveGameHtmlSection(game, whatHappened);
  }
}
