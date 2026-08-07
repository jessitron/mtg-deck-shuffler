import { getCardImageUrl } from "../../types.js";
import { GameCard, GameState, WhatHappened } from "../../GameState.js";

export const CARD_BACK = "/images/mtg-card-back.jpg";

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * The deck-title plaque. It used to live inside `.cool-command-zone-surround`;
 * it now rests on the playmat itself — centered in the mat's top row on /prepare,
 * left of the hamburger in `.game-header-row` on /game. Appearance lives in
 * `playmat.css` (shared), placement in `prepare.css` / `game.css`.
 *
 * On /game it must stay a SIBLING of `#game-menu`, never a child: game.js closes
 * the menu on `!evt.target.closest("#game-menu")`, so a title nested inside would
 * swallow the dismiss click.
 */
export function formatDeckTitleHtmlFragment(deckName: string): string {
  return `<div class="game-title"><span class="game-name">${escapeHtml(deckName)}</span></div>`;
}

export function formatCardNameAsModalLink(cardName: string, gameId: number, cardIndex: number, expectedVersion?: number): string {
  const versionParam = expectedVersion !== undefined ? `?expected-version=${expectedVersion}` : '';
  return `<span class="card-name-link clickable-card-name"
               hx-get="/card-modal/${gameId}/${cardIndex}${versionParam}"
               hx-target="#card-modal-container"
               hx-swap="innerHTML"
               style="cursor: pointer;">${cardName}</span>`;
}

/**
 * How the flip button asks the server for the other face of a two-faced card.
 *
 * In a game, flipping mutates persisted state, so it POSTs to the game and carries
 * the optimistic-lock version. On the prepare screen there is no game yet — the deck
 * is only being reviewed — so flipping is a stateless GET that re-renders the card on
 * the requested face, the same `?face=` idiom the prep card modal uses.
 */
export type FlipRequest =
  | { page: "game"; gameId: number; expectedVersion?: number }
  | { page: "prep"; prepId: number };

type CardRenderOptions = {
  gameCard: GameCard;
  gameId: number;
  expectedVersion?: number;
  actions?: string;
  whatHappened?: WhatHappened;
  draggable?: boolean;
  handPosition?: number;
  /** Defaults to flipping within the game identified by `gameId`. */
  flipRequest?: FlipRequest;
};

export function formatCardContainer({ gameCard, gameId, expectedVersion, actions = "", whatHappened, draggable = false, handPosition, flipRequest }: CardRenderOptions): string {
  const finalAnimationClass = whatHappened ? getAnimationClassHelper(whatHappened, gameCard.gameCardIndex) : "";

  const cardId = `card-${gameCard.gameCardIndex}`;
  // TODO: always reload only the card container

  const draggableAttr = draggable ? 'draggable="true"' : "";
  const handPositionAttr = handPosition !== undefined ? `data-hand-position="${handPosition}"` : "";
  const versionParam = expectedVersion !== undefined ? `?expected-version=${expectedVersion}` : '';

  if (gameCard.card.twoFaced) {
    if (gameId === undefined) {
      // TODO: make required everywhere
      throw new Error("Game ID is required for two-faced cards");
    }
    const flip: FlipRequest = flipRequest ?? { page: "game", gameId, expectedVersion };
    // On the prepare screen which face is showing is page state, so the click has to tell
    // the modal. In a game the modal reads currentFace from the game itself.
    const modalQuery = flip.page === "prep" ? `?face=${gameCard.currentFace}` : versionParam;
    return `<div id="${cardId}-container" class="card-container clickable-card ${finalAnimationClass}"
                 ${draggableAttr}
                 ${handPositionAttr}
                 hx-get="/card-modal/${gameId}/${gameCard.gameCardIndex}${modalQuery}"
                 hx-target="#card-modal-container"
                 hx-swap="innerHTML"
                 style="cursor: pointer;">
      ${formatFlippingContainer(gameCard, flip)}
      ${actions}
    </div>`;
  } else {
    const imageUrl = getCardImageUrl(gameCard.card, "normal", gameCard.currentFace);
    return `<div id="${cardId}-container" class="card-container clickable-card ${finalAnimationClass}"
                 ${draggableAttr}
                 ${handPositionAttr}
                 hx-get="/card-modal/${gameId}/${gameCard.gameCardIndex}${versionParam}"
                 hx-target="#card-modal-container"
                 hx-swap="innerHTML"
                 style="cursor: pointer;">
      <img id="${cardId}-face" src="${imageUrl}" alt="${gameCard.card.name}" class="mtg-card-image" title="${gameCard.card.name}" />
      ${actions}
    </div>`;
  }
}

export function formatFlippingContainer(gameCard: GameCard, flipRequest: FlipRequest): string {
  const frontImageUrl = getCardImageUrl(gameCard.card, "normal", "front");
  const backImageUrl = getCardImageUrl(gameCard.card, "normal", "back");
  const flippedClass = gameCard.currentFace === "back" ? " card-flipped" : "";

  const cardId = `card-${gameCard.gameCardIndex}`;
  const flipContainerId = `${cardId}-outer-flip-container`;

  const otherFace = gameCard.currentFace === "back" ? "front" : "back";
  const requestAttrs =
    flipRequest.page === "game"
      ? `hx-post="/flip-card/${flipRequest.gameId}/${gameCard.gameCardIndex}" ${
          flipRequest.expectedVersion !== undefined ? `hx-vals='{"expected-version": ${flipRequest.expectedVersion}}'` : ""
        }`
      : `hx-get="/prep-flip-card/${flipRequest.prepId}/${gameCard.gameCardIndex}?face=${otherFace}"`;
  // In a game the new face is in the game state, so only the flip container needs replacing.
  // On the prepare screen the face lives in the page, and the card container is what carries
  // it (in its modal URL) — so the whole container is replaced.
  const swapTarget = flipRequest.page === "prep" ? `#${cardId}-container` : `#${flipContainerId}-with-button`;
  const flipButton = `<button class="flip-button" id="${cardId}-flip-button" ${requestAttrs} hx-swap="outerHTML" hx-target="${swapTarget}" onclick="event.stopPropagation()">Flip</button>`;

  return `<div id="${flipContainerId}-with-button" class="flip-container-with-button">
            <div id="${flipContainerId}" class=" flip-container-outer${flippedClass}">
              <div id="${cardId}-inner-flip-container" class="flip-container-inner">
                <img id="${cardId}-back-face" src="${backImageUrl}" alt="${gameCard.card.name} (back face)" class="mtg-card-image two-sided-back${flippedClass}" />
                <img id="${cardId}-front-face" src="${frontImageUrl}" alt="${gameCard.card.name}" class="mtg-card-image two-sided-front" title="${gameCard.card.name}" />
             </div>
            </div>
           ${flipButton}
          </div>`;
}

// Function for displaying commanders when we have GameCard objects (in active game)
export function formatCommandZoneHtmlFragment(game: GameState): string {
  const commanders = game.listCommanders();
  const gameId = game.gameId;
  const expectedVersion = game.getStateVersion();
  return commanders.length == 0
    ? `<div class="commander-placeholder">No Commander</div>`
    : `<div id="command-zone">
    <div class="cool-command-zone-surround ${commanders.length > 1 ? "two-commanders" : ""}">
      <div class="multiple-cards">
        ${commanders.map((gameCard) => formatCardContainer({ gameCard, gameId, expectedVersion })).join("")}
      </div>
      </div>
    </div>`;
}

export function getAnimationClassHelper(whatHappened: WhatHappened, gameCardIndex: number): string {
  if (whatHappened.movedLeft && whatHappened.movedLeft.some((card) => card.gameCardIndex === gameCardIndex)) {
    return " card-moved-left";
  } else if (whatHappened.movedRight && whatHappened.movedRight.some((card) => card.gameCardIndex === gameCardIndex)) {
    return " card-moved-right";
  }
  if (whatHappened.dropppedFromLeft && whatHappened.dropppedFromLeft.gameCardIndex === gameCardIndex) {
    return " dropped-from-left";
  } else if (whatHappened.dropppedFromRight && whatHappened.dropppedFromRight.gameCardIndex === gameCardIndex) {
    return " dropped-from-right";
  }
  return "";
}

export function formatLibraryStack(whatHappened: WhatHappened = {}, cardCount: number): string {
  const shufflingClass = whatHappened.shuffling ? " shuffling" : "";
  const emptyClass = cardCount === 0 ? " library-stack-empty" : "";

  return `<div class="library-stack${shufflingClass}${emptyClass}" data-testid="library-stack">
          <img src="${CARD_BACK}" alt="Library" class="mtg-card-image library-card-back library-card-1" data-testid="card-back" title="${cardCount} cards"/>
          <img src="${CARD_BACK}" alt="Library" class="mtg-card-image library-card-back library-card-2" data-testid="card-back" />
          <img src="${CARD_BACK}" alt="Library" class="mtg-card-image library-card-back library-card-3" data-testid="card-back"/>
        </div>`;
}

export type CardAction = {
  action: string;
  endpoint: string;
  title: string;
  cssClass?: string;
};
