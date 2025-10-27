import { GameState, WhatHappened } from "../../GameState.js";
import { formatPageWrapper } from "../common/html-layout.js";
import { formatHandSectionHtmlFragment } from "./hand-components.js";
import { formatLibrarySectionHtmlFragment } from "./library-components.js";
import { formatRevealedCardsHtmlFragment } from "./revealed-cards-components.js";
import { formatGameEventHtmlFragment } from "./history-components.js";
import { formatCommandZoneHtmlFragment } from "../common/shared-components.js";
import { formatDebugButtonHtmlFragment } from "../debug/state-copy.js";

export function formatGamePageHtmlPage(game: GameState, whatHappened: WhatHappened = {}): string {
  const gameContent = formatActiveGameHtmlSection(game, whatHappened);
  const gameEndActions = formatGameEndActionsHtmlFragment(game);
  const debugSection = `<div class="debug-section">
  <p class="game-id">Game ID: ${game.gameId}</p>
  ${formatDebugButtonHtmlFragment(game.gameId)}
    </div>`;
  const contentWithModal = `
    <div class="page-container">
      ${gameContent}
      <div id="modal-container"></div>
      <div id="card-modal-container"></div>
    </div>`;
  return formatPageWrapper(`MTG Game - ${game.deckName}`, contentWithModal, gameEndActions + debugSection);
}

function formatGameEndActionsHtmlFragment(game: GameState): string {
  return `<div class="end-game-actions">
      <form method="post" action="/restart-game" class="inline-form">
        <input type="hidden" name="game-id" value="${game.gameId}" />
        <button type="submit">Restart Game</button>
      </form>
      <form method="post" action="/end-game" class="inline-form">
        <input type="hidden" name="game-id" value="${game.gameId}" />
        <button type="submit">Choose Another Deck</button>
      </form>
    </div>`;
}

export function formatActiveGameHtmlSection(game: GameState, whatHappened: WhatHappened = {}): string {
  const title = `
      <span class="game-name">${game.deckName}</span> <a href="${game.deckProvenance.sourceUrl}" target="_blank">↗</a>
`;
  const commandZoneHtml = formatCommandZoneHtmlFragment(game.listCommanders(), title, game.gameId);
  const tableCardsCount = game.listTable().length;
  const librarySectionHtml = formatLibrarySectionHtmlFragment(game, whatHappened);
  const revealedCardsHtml = formatRevealedCardsHtmlFragment(game, whatHappened);
  const handSectionHtml = formatHandSectionHtmlFragment(game, whatHappened);
  const historyActionsHtml = formatGameHistoryFragment(game);
  const tableSectionHtml = ` <div id="table-section" class="table-section">
          <button class="table-cards-button"
            hx-get="/table-modal/${game.gameId}"
            hx-target="#modal-container"
            hx-swap="innerHTML">${tableCardsCount} Cards on table</button>
        </div>`;

  return `<div id="game-container"
           data-game-id="${game.gameId}"
           hx-trigger="game-state-updated from:body"
           hx-get="/game-section/${game.gameId}"
           hx-target="#game-container"
           hx-swap="outerHTML">

           ${tableSectionHtml}
      <div class="game-top-row">
        ${librarySectionHtml}
        ${revealedCardsHtml}
        ${commandZoneHtml}
       
      </div>

      <div class="game-hand-row">
        ${handSectionHtml}
      </div>

      <div class="history-actions-row">
        ${historyActionsHtml}
      </div>
    </div>`;
}

function formatGameHistoryFragment(game: GameState): string {
  const eventLog = game.getEventLog();

  // Find the most recent undoable event
  const mostRecentUndoableEvent = eventLog
    .getEvents()
    .slice()
    .reverse()
    .find((event) => eventLog.canBeUndone(event.gameEventIndex));

  const historyButton = ` <button class="history-button"
                  hx-get="/history-modal/${game.gameId}"
                  hx-target="#modal-container"
                  hx-swap="innerHTML">Action History (${eventLog.getEvents().length})</button>`;

  if (!mostRecentUndoableEvent) {
    return historyButton;
  }

  return `<div class="history-actions">
  <button class="undo-button"
  hx-post="/undo/${game.gameId}/${mostRecentUndoableEvent.gameEventIndex}"
  hx-target="#game-container"
  hx-swap="outerHTML"
  class="undo-button">UNDO ${formatGameEventHtmlFragment(mostRecentUndoableEvent, game)}</button>
  ${historyButton}
  </div>`;
}
