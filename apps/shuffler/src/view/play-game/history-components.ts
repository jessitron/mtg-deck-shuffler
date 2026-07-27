import { GameState } from "../../GameState.js";
import { GameEvent, nameMoveCardEvent } from "../../GameEvents.js";
import { formatCardNameAsModalLink } from "../common/shared-components.js";

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

function cardIndexToDefinition(game: GameState, gci: number) {
  return game.getCards()[gci].card;
}

// `cardNamesAsLinks` makes move-card card names clickable links that open the
// card modal. Off by default so the undo button (which embeds this fragment
// inside a <button>) avoids nesting interactive elements.
export function formatGameEventHtmlFragment(event: GameEvent, game: GameState, cardNamesAsLinks = false) {
  const isUndone = game.getEventLog().hasBeenUndone(event.gameEventIndex);
  const eventNameToCssClass = {
    "move card": "event-move-card",
    "shuffle library": "event-shuffle-library",
    "start game": "event-start-game",
    "deal opening hand": "event-deal-opening-hand",
    mulligan: "event-mulligan",
    "flip card": "event-flip-card",
    undo: "event-undo",
  };

  const description = describeEvent(event, game, cardNamesAsLinks);
  const tabIdDisplay = event.browserTabId
    ? ` <span class="event-tab-id" title="${event.browserTabId}">(${event.browserTabId.slice(0, 8)})</span>`
    : '';
  return `
  <span class="event-description ${isUndone ? "undone" : ""} ${eventNameToCssClass[event.eventName]}">${description}${tabIdDisplay}</span>`;
}

function describeEvent(event: GameEvent, game: GameState, cardNamesAsLinks: boolean): string {
  switch (event.eventName) {
    case "move card":
      const description = nameMoveCardEvent(event);
      const card = cardIndexToDefinition(game, event.move.gameCardIndex);
      const cardName = cardNamesAsLinks
        ? formatCardNameAsModalLink(card.name, game.gameId, event.move.gameCardIndex, game.getStateVersion())
        : card.name;
      return `${description}: ${cardName}`;
    case "shuffle library":
      return `Shuffle ${event.compactMoves.length} cards in library`;
    case "start game":
      return "Start game";
    case "deal opening hand":
      return "Deal opening hand";
    case "mulligan":
      return "Mulligan";
    case "undo":
      return `Undo: ${formatGameEventHtmlFragment(game.getEvent(event.originalEventIndex), game, cardNamesAsLinks)}`;
  }
}

function formatHistoryListHtmlFragment(game: GameState): string {
  const events = game.getEventLog().getEvents();

  return events
    .map((event, index) => ({ event, originalIndex: index + 1 }))
    .reverse()
    .map(({ event, originalIndex }) => {
      return `<li class="history-item" id="event-${event.gameEventIndex}">
        <span class="event-number">${originalIndex}.</span>
        ${formatGameEventHtmlFragment(event, game, true)}
      </li>`;
    })
    .join("");
}

export function formatHistoryModalHtmlFragment(game: GameState): string {
  const historyList = formatHistoryListHtmlFragment(game);

  const bodyContent = `<p class="modal-subtitle">
          ${game.getEventLog().getEvents().length} actions taken
        </p>
        <ol class="history-list ">
          ${historyList}
        </ol>`;

  return formatModalHtmlFragment("Game History", bodyContent);
}
