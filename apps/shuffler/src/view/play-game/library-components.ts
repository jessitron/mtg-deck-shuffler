import { GameState, WhatHappened } from "../../GameState.js";
import { formatLibraryStack } from "../common/shared-components.js";

export function formatLibrarySectionHtmlFragment(game: GameState, whatHappened: WhatHappened): string {
  const expectedVersion = game.getStateVersion();
  const inTableMode = !!game.tableName;
  const faceDownClass = inTableMode ? "table-face-down-button" : "play-face-down-button";
  const faceDownTitle = inTableMode ? "Send face down to the table" : "Copy card back";
  return `<div id="library-section" data-testid="library-section">
        ${formatLibraryStack(whatHappened, game.listLibrary().length, game.sleeveColor)}
        <div class="library-buttons">

          <button id="draw-button" class="draw-button"
                  hx-post="/draw/${game.gameId}"
                  hx-vals='{"expected-version": ${expectedVersion}}'
                  hx-target="#game-container"
                  hx-swap="outerHTML">Draw</button>
          <button id="shuffle-button" class="shuffle-button"
                  hx-post="/shuffle/${game.gameId}"
                  hx-vals='{"expected-version": ${expectedVersion}}'
                  hx-target="#game-container"
                  hx-swap="outerHTML">Shuffle</button>
           <button id="library-search-button" class="search-button"
                  hx-get="/library-modal/${game.gameId}"
                  hx-target="#modal-container"
                  hx-swap="innerHTML">Search</button>
          <button id="reveal-button" class="reveal-button"
                  ${
                    game.listLibrary().length > 0
                      ? `hx-post="/reveal-card/${game.gameId}/${game.listLibrary()[0].gameCardIndex}"
                       hx-vals='{"expected-version": ${expectedVersion}}'
                       hx-target="#game-container"
                       hx-swap="outerHTML"`
                      : "disabled"
                  }
                  >Reveal</button>
          <button id="mill-button" class="mill-button"
                  ${
                    game.listLibrary().length > 0
                      ? `hx-post="/mill/${game.gameId}"
                       hx-vals='{"expected-version": ${expectedVersion}}'
                       hx-target="#game-container"
                       hx-swap="outerHTML"`
                      : "disabled"
                  }
                  >Mill</button>
          <button id="play-top-face-down-button" class="${faceDownClass}"
                  title="${faceDownTitle}"
                  ${
                    game.listLibrary().length > 0
                      ? `hx-post="/play-top-card-face-down/${game.gameId}"
                       hx-vals='{"expected-version": ${expectedVersion}}'
                       hx-target="#game-container"
                       hx-swap="outerHTML"`
                      : "disabled"
                  }
                  >Play Face Down</button>
        </div>
      </div>`;
}
