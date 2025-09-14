import { GameState } from "../../GameState.js";
import { GameEvent, nameMove } from "../../GameEvents.js";
import { printLocation } from "../../port-persist-state/types.js";
import { formatCardNameAsGathererLink } from "../common/shared-components.js";

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

export function formatGameEventHtmlFragment(event: GameEvent, game: GameState) {
  const isUndone = game.getEventLog().hasBeenUndone(event.gameEventIndex);
  const eventNameToCssClass = {
    "move card": "event-move-card",
    "shuffle library": "event-shuffle-library",
    "start game": "event-start-game",
    undo: "event-undo",
  };

  const description = describeEvent(event, game);
  return `
  <span class="event-description ${isUndone ? "undone" : ""} ${eventNameToCssClass[event.eventName]}">${description}</span>`;
}

function describeEvent(event: GameEvent, game: GameState): string {
  switch (event.eventName) {
    case "move card":
      const description = nameMove(event.move);
      const card = cardIndexToDefinition(game, event.move.gameCardIndex);
      const cardNameLink = formatCardNameAsGathererLink(card);
      return `${description}: ${cardNameLink}`;
    case "shuffle library":
      return `Shuffle ${event.moves.length} cards in library`;
    case "start game":
      return "Start game";
    case "undo":
      return `Undo: ${formatGameEventHtmlFragment(game.getEvent(event.originalEventIndex), game)}`;
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
        ${formatGameEventHtmlFragment(event, game)}
      </li>`;
    })
    .join("");
}

export function formatHistoryModalHtmlFragment(game: GameState): string {
  const historyList = formatHistoryListHtmlFragment(game);

  const bodyContent = `<p style="margin-bottom: 16px; color: #666; font-size: 0.9rem;">
          ${game.getEventLog().getEvents().length} actions taken
        </p>
        <ol class="history-list" style="list-style: none; padding: 0;">
          ${historyList}
        </ol>`;

  return formatModalHtmlFragment("Game History", bodyContent);
}
