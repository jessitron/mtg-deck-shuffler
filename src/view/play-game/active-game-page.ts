import { GameState, WhatHappened } from "../../GameState.js";
import { formatPageWrapper } from "../common/html-layout.js";
import { formatHandSectionHtmlFragment } from "./hand-components.js";
import { formatLibrarySectionHtmlFragment } from "./library-components.js";
import { formatRevealedCardsHtmlFragment } from "./revealed-cards-components.js";
import { formatTableModalHtmlFragment } from "./game-modals.js";
import { formatGameEventHtmlFragment } from "./history-components.js";
import { formatCommandZoneHtmlFragment } from "../common/shared-components.js";
import { formatDebugButtonHtmlFragment } from "../debug/state-copy.js";

function formatGameHistoryFragment(game: GameState): string {
  const eventLog = game.getEventLog();

  // Find the most recent undoable event
  const mostRecentUndoableEvent = eventLog
    .getEvents()
    .slice()
    .reverse()
    .find((event) => eventLog.canBeUndone(event.gameEventIndex));

  return `
        <div class="history">
          ${
            mostRecentUndoableEvent
              ? `<div class="undo-controls"> Last action:
              ${formatGameEventHtmlFragment(mostRecentUndoableEvent, game)}
              <button class="undo-button"
                      hx-post="/undo/${game.gameId}/${mostRecentUndoableEvent.gameEventIndex}"
                      hx-target="#game-container"
                      hx-swap="outerHTML"
                      class="undo-button">Undo</button>
            </div>`
              : "<p>No actions to undo</p>"
          }
          <button class="history-button"
                  hx-get="/history-modal/${game.gameId}"
                  hx-target="#modal-container"
                  hx-swap="innerHTML">View History (${eventLog.getEvents().length})</button>
      </div>`;
}

function formatGameActionsHtmlFragment(game: GameState): string {
  const history = formatGameHistoryFragment(game);

  return `
  <div id="end-game-actions" class="game-actions">
    ${history}
    <form method="post" action="/restart-game" class="inline-form">
      <input type="hidden" name="game-id" value="${game.gameId}" />
      <button type="submit">Restart Game</button>
    </form>
    <form method="post" action="/end-game" class="inline-form">
      <input type="hidden" name="game-id" value="${game.gameId}" />
      <button type="submit">Choose Another Deck</button>
    </form>
    ${formatDebugButtonHtmlFragment(game.gameId)}
  </div>`;
}

export function formatGamePageHtmlPage(game: GameState, whatHappened: WhatHappened = {}): string {
  const gameContent = formatActiveGameHtmlSection(game, whatHappened);
  const gameHeader = `<div id="game-header" class="game-header">
      <span class="game-name">${game.deckName}</span> from <a href="${game.deckProvenance.sourceUrl}" target="_blank">${game.deckProvenance.deckSource}</a>
    </div>`;
  const contentWithModal = `
    <div class="page-container">
      ${gameHeader}
      ${gameContent}
      <div id="modal-container"></div>
      <div id="card-modal-container"></div>
      <div class="debug-section">
      <p class="game-id">Game ID: ${game.gameId}</p>
    </div>
    </div>`;
  return formatPageWrapper(`MTG Game - ${game.deckName}`, contentWithModal);
}

export function formatActiveGameHtmlSection(game: GameState, whatHappened: WhatHappened): string {
  const commanderImageHtml = formatCommandZoneHtmlFragment(game.listCommanders(), game.gameId);
  const tableCardsCount = game.listTable().length;
  const librarySectionHtml = formatLibrarySectionHtmlFragment(game, whatHappened);
  const revealedCardsHtml = formatRevealedCardsHtmlFragment(game, whatHappened);
  const handSectionHtml = formatHandSectionHtmlFragment(game, whatHappened);
  const gameActionsHtml = formatGameActionsHtmlFragment(game);

  return `<div id="game-container"
           data-game-id="${game.gameId}"
           hx-trigger="game-state-updated from:body"
           hx-get="/game-section/${game.gameId}"
           hx-target="#game-container"
           hx-swap="outerHTML">
        ${commanderImageHtml}

      ${librarySectionHtml}

      ${revealedCardsHtml}

      <div id="table-section" class="table-section">
        <button class="table-cards-button"
          hx-get="/table-modal/${game.gameId}"
          hx-target="#modal-container"
          hx-swap="innerHTML">${tableCardsCount} Cards on table</button>
        <img src="/table.png" alt="Table" class="table-image" />
      </div>

      ${handSectionHtml}

      ${gameActionsHtml}
    </div>`;
}

export function formatGameHtmlSection(game: GameState, whatHappened: WhatHappened = {}): string {
  return formatActiveGameHtmlSection(game, whatHappened);
}

export { formatTableModalHtmlFragment };
