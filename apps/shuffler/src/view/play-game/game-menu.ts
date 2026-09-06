import { GameState } from "../../GameState.js";
import { formatGameEventHtmlFragment } from "./history-components.js";
import { formatDebugSectionHtmlFragment } from "../debug/debug-section.js";

export function formatGameMenuHtmlFragment(game: GameState): string {
  return `<div id="game-menu" class="game-menu">
      <button id="menu-toggle" class="menu-toggle" type="button" aria-label="Menu" aria-expanded="false">☰</button>
      <div id="game-menu-panel" class="game-menu-panel">
        ${formatUndoAndHistoryHtmlFragment(game)}
        ${formatEndGameActionsHtmlFragment(game)}
        <div class="menu-section menu-debug">
          ${formatDebugSectionHtmlFragment(game.gameId, game.getStateVersion())}
          <a class="exit-dev-mode" href="/dontdie/off">Exit dev mode</a>
        </div>
      </div>
    </div>`;
}

function formatUndoAndHistoryHtmlFragment(game: GameState): string {
  const eventLog = game.getEventLog();
  const events = eventLog.getEvents();

  const mostRecentUndoableEvent = events
    .slice()
    .reverse()
    .find((event) => eventLog.canBeUndone(event.gameEventIndex));

  const historyButton = `<button id="history-button" class="history-button"
                  hx-get="/history-modal/${game.gameId}"
                  hx-target="#modal-container"
                  hx-swap="innerHTML">Action History (${events.length})</button>`;

  const mostRecentEvent = events[events.length - 1];
  const blockedByTableReturn = mostRecentEvent?.eventName === "move card" && mostRecentEvent.verb === "returned";

  const undoButton = mostRecentUndoableEvent
    ? `<button id="undo-button" class="undo-button"
        hx-post="/undo/${game.gameId}/${mostRecentUndoableEvent.gameEventIndex}"
        hx-vals='{"expected-version": ${game.getStateVersion()}}'
        hx-target="#game-container"
        hx-swap="outerHTML">UNDO ${formatGameEventHtmlFragment(mostRecentUndoableEvent, game)}</button>`
    : blockedByTableReturn
    ? `<button id="undo-button" class="undo-button" disabled
        title="Can't undo tabletop-initiated card return yet, sorry">UNDO</button>`
    : "";

  return `<div class="menu-section history-actions">
      ${undoButton}
      ${historyButton}
    </div>`;
}

function formatEndGameActionsHtmlFragment(game: GameState): string {
  return `<div class="menu-section end-game-actions">
      <form method="post" action="/restart-game" class="inline-form">
        <input type="hidden" name="game-id" value="${game.gameId}" />
        <button type="submit" id="restart-game-button">Restart Game</button>
      </form>
      <a href="/choose-any-deck">Choose Another Deck</a>
      <a href="/">Home</a>
    </div>`;
}
