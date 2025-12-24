
export function formatDebugSectionHtmlFragment(gameId: number, stateVersion: number): string {
  return `<p class="game-id">Game ID: ${gameId} | State Version: ${stateVersion}</p>
  <p class="browser-tab-id">Tab ID: <span id="browser-tab-id-display">loading...</span></p>
  <script>
    // Display the browser tab ID once available
    if (window.browserTabId) {
      document.getElementById('browser-tab-id-display').textContent = window.browserTabId.slice(0, 8);
      document.getElementById('browser-tab-id-display').title = window.browserTabId;
    }
  </script>
  <button class="debug-button"
                  hx-get="/debug-state/${gameId}"
                  hx-target="#modal-container"
                  hx-swap="innerHTML"
                  class="debug-button">Debug State</button>`;
}
