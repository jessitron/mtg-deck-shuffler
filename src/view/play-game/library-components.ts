import { GameState, WhatHappened } from "../../GameState.js";
import { CARD_BACK, formatLibraryStack } from "../common/shared-components.js";

export function formatLibrarySectionHtmlFragment(game: GameState, whatHappened: WhatHappened): string {
  const isEmpty = game.listLibrary().length === 0;
  const emptyClass = isEmpty ? ' library-empty' : '';
  return `<div id="library-section" data-testid="library-section" class="${emptyClass}">
        <h3>Library (${game.listLibrary().length})</h3>
        ${formatLibraryStack(whatHappened)}
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
                  ${game.listLibrary().length > 0
                    ? `hx-post="/reveal-card/${game.gameId}/${game.listLibrary()[0].gameCardIndex}"
                       hx-target="#game-container"
                       hx-swap="outerHTML"`
                    : 'disabled'}
                  >Reveal</button>
        </div>
      </div>`;
}

