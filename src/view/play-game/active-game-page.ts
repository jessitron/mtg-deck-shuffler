import { GameState, WhatHappened } from "../../GameState.js";
import { formatPageWrapper } from "../common/html-layout.js";
import { formatHandSectionHtmlFragment } from "./hand-components.js";
import { formatLibrarySectionHtmlFragment } from "./library-components.js";
import { formatRevealedCardsHtmlFragment } from "./revealed-cards-components.js";
import { formatTableModalHtmlFragment } from "./game-modals.js";
import { formatGameEventHtmlFragment } from "./history-components.js";
import { formatCommanderImageHtmlFragment } from "../common/shared-components.js";
import { formatDebugButtonHtmlFragment } from "../debug/state-copy.js";

function formatGameDetailsHtmlFragment(game: GameState): string {
  const cardCountInfo = `${game.totalCards} cards`;
  const eventLog = game.getEventLog();

  // Find the most recent undoable event
  const mostRecentUndoableEvent = eventLog
    .getEvents()
    .slice()
    .reverse()
    .find((event) => eventLog.canBeUndone(event.gameEventIndex));

  return `<div id="game-details" class="game-details game-active">
        <h2><a href="${game.deckProvenance.sourceUrl}" target="_blank">${game.deckName}</a></h2>
        <div><p>${cardCountInfo}</p>
        <p><strong>Game ID:</strong> ${game.gameId}</p>
        <p><strong>Status:</strong> ${game.gameStatus()}</p>
        </div>
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
        </div>
      </div>`;
}

function formatGameActionsHtmlFragment(game: GameState): string {
  return `<div id="end-game-actions" class="game-actions">
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
  return formatPageWrapper(`MTG Game - ${game.deckName}`, gameContent);
}

export function formatActiveGameHtmlSection(game: GameState, whatHappened: WhatHappened): string {
  const commanderImageHtml = formatCommanderImageHtmlFragment(game.listCommanders(), game.gameId);
  const gameDetailsHtml = formatGameDetailsHtmlFragment(game);
  const tableCardsCount = game.listTable().length;
  const librarySectionHtml = formatLibrarySectionHtmlFragment(game, whatHappened);
  const revealedCardsHtml = formatRevealedCardsHtmlFragment(game, whatHappened);
  const handSectionHtml = formatHandSectionHtmlFragment(game, whatHappened);
  const gameActionsHtml = formatGameActionsHtmlFragment(game);

  return `<div id="game-container"
               hx-get="/refresh-game/${game.gameId}"
               hx-trigger="cardFlipped from:body"
               hx-swap="outerHTML">
        ${commanderImageHtml}
      ${gameDetailsHtml}

      <div id="table-section" class="table-section">
        <img src="/table.png" alt="Table" class="table-image" />
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
  return formatActiveGameHtmlSection(game, whatHappened);
}

export { formatTableModalHtmlFragment };
