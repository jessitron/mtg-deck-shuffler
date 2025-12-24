import { formatDebugButtonHtmlFragment } from "./state-copy.js";

export function formatDebugSectionHtmlFragment(gameId: number, stateVersion: number, includeDebugButton: boolean = false): string {
  const debugButton = includeDebugButton ? formatDebugButtonHtmlFragment(gameId) : '';

  return `<p class="game-id">Game ID: ${gameId} | State Version: ${stateVersion}</p>
  ${debugButton}`;
}
