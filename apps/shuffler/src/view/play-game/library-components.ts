import { GameState, WhatHappened } from "../../GameState.js";
import { formatLibraryStack } from "../common/shared-components.js";

export function formatLibrarySectionHtmlFragment(game: GameState, whatHappened: WhatHappened): string {
  const expectedVersion = game.getStateVersion();
  return `<div id="library-section" class="section-that-is-horizontally-aligned-with-command-zone" data-testid="library-section">
        ${formatLibraryStack(whatHappened, game.listLibrary().length)}
        <div class="library-buttons">

          <button class="draw-button"
                  hx-post="/draw/${game.gameId}"
                  hx-vals='{"expected-version": ${expectedVersion}}'
                  hx-target="#game-container"
                  hx-swap="outerHTML">Draw</button>
          <button class="shuffle-button"
                  hx-post="/shuffle/${game.gameId}"
                  hx-vals='{"expected-version": ${expectedVersion}}'
                  hx-target="#game-container"
                  hx-swap="outerHTML">Shuffle</button>
           <button class="search-button"
                  hx-get="/library-modal/${game.gameId}"
                  hx-target="#modal-container"
                  hx-swap="innerHTML">Search</button>
          <button class="reveal-button"
                  ${
                    game.listLibrary().length > 0
                      ? `hx-post="/reveal-card/${game.gameId}/${game.listLibrary()[0].gameCardIndex}"
                       hx-vals='{"expected-version": ${expectedVersion}}'
                       hx-target="#game-container"
                       hx-swap="outerHTML"`
                      : "disabled"
                  }
                  >Reveal</button>
        </div>
      </div>`;
}
