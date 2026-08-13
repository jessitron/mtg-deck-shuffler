import { GameId } from "../../domain-types.js";

export function formatDebugSectionHtmlFragment(gameId: GameId, stateVersion: number): string {
  return `<p class="game-id">Game: ${gameId} | <button id="debug-state-button" class="debug-button"
                  hx-get="/debug-state/${gameId}"
                  hx-target="#modal-container"
                  hx-swap="innerHTML">State</button>: ${stateVersion} | Tab: <span id="browser-tab-id-display">loading...</span></p>
  <script>
    // Display the browser tab ID once available
    if (window.browserTabId) {
      document.getElementById('browser-tab-id-display').textContent = window.browserTabId.slice(0, 8);
      document.getElementById('browser-tab-id-display').title = window.browserTabId;
    }
  </script>
  `;
}
