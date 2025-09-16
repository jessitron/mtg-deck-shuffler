import { GameState, WhatHappened } from "../../GameState.js";
import { CARD_BACK } from "../common/shared-components.js";

export function formatLibrarySectionHtmlFragment(game: GameState, whatHappened: WhatHappened): string {
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
