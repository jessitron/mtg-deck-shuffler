
export function formatDebugSectionHtmlFragment(gameId: number, stateVersion: number): string {
  return `<p class="game-id">Game ID: ${gameId} | State Version: ${stateVersion}</p>
  <button class="debug-button"
                  hx-get="/debug-state/${gameId}"
                  hx-target="#modal-container"
                  hx-swap="innerHTML"
                  class="debug-button">Debug State</button>`;
}
