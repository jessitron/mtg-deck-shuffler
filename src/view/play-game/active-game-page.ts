import { CardDefinition, getCardImageUrl, WhatHappened } from "../../types.js";
import { GameCard, GameState } from "../../GameState.js";
import { GameEvent } from "../../GameEvents.js";
import { printLocation } from "../../port-persist-state/types.js";
import { formatPageWrapper } from "../common/html-layout.js";
import { formatHandSectionHtmlFragment } from "./hand-components.js";
import { formatLibrarySectionHtmlFragment } from "./library-components.js";
import { formatRevealedCardsHtmlFragment } from "./revealed-cards-components.js";
import { formatTableModalHtmlFragment } from "./game-modals.js";

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

function formatGameHeaderHtmlFragment(game: GameState): string {
  const commanderImageHtml = formatCommanderImageHtmlFragment(game.commanders);
  const gameDetailsHtml = formatGameDetailsHtmlFragment(game);

  return `<div id="command-zone">
        ${commanderImageHtml}
      </div>
      ${gameDetailsHtml}`;
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

export function formatGameHtmlSection(game: GameState, whatHappened: WhatHappened = {}): string {
  if (game.gameStatus() === "NotStarted") {
    const { formatDeckReviewHtmlSection } = require("../../html-formatters.js");
    return formatDeckReviewHtmlSection(game);
  } else {
    return formatActiveGameHtmlSection(game, whatHappened);
  }
}

export { formatTableModalHtmlFragment };