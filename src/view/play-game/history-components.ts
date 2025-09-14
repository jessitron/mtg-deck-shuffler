import { GameState } from "../../GameState.js";
import { GameEvent } from "../../GameEvents.js";
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
  switch (event.eventName) {
    case "move card":
      const card = cardIndexToDefinition(game, event.move.gameCardIndex);
      const cardNameLink = formatCardNameAsGathererLink(card);
      return `Move ${cardNameLink} from ${printLocation(event.move.fromLocation)} to ${printLocation(event.move.toLocation)}`;
    case "shuffle library":
      return `Shuffle ${event.moves.length} cards in library`;
    case "start game":
      return "Start game";
  }
}

function formatHistoryListHtmlFragment(game: GameState): string {
  const events = game.gameEvents();

  return events
    .map((event, index) => ({ event, originalIndex: index + 1 }))
    .reverse()
    .map(
      ({ event, originalIndex }) =>
        `<li class="history-item">
        <span class="event-number">${originalIndex}.</span>
        <span class="event-description">${formatGameEventHtmlFragment(event, game)}</span>
      </li>`
    )
    .join("");
}

export function formatHistoryModalHtmlFragment(game: GameState): string {
  const events = game.gameEvents();
  const historyList = formatHistoryListHtmlFragment(game);

  const bodyContent = `<p style="margin-bottom: 16px; color: #666; font-size: 0.9rem;">
          ${events.length} actions taken
        </p>
        <ol class="history-list" style="list-style: none; padding: 0;">
          ${historyList}
        </ol>`;

  return formatModalHtmlFragment("Game History", bodyContent);
}
