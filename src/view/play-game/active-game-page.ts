import { GameState, WhatHappened } from "../../GameState.js";
import { formatPageWrapper } from "../common/html-layout.js";
import { formatHandSectionHtmlFragment } from "./hand-components.js";
import { formatLibrarySectionHtmlFragment } from "./library-components.js";
import { formatRevealedCardsHtmlFragment } from "./revealed-cards-components.js";
import { formatCommandZoneHtmlFragment } from "../common/shared-components.js";
import { formatGameMenuHtmlFragment } from "./game-menu.js";
import { formatAdvisorChatPanel } from "./advisor-chat.js";

export function formatGamePageHtmlPage(game: GameState, whatHappened: WhatHappened = {}, devMode: boolean = false): string {
  const gameContent = formatActiveGameHtmlSection(game, whatHappened);
  // The advisor chat drawer is rendered once here (outside #game-container, which
  // HTMX swaps) so the conversation survives game-state swaps. Dev-mode only.
  const advisorChatHtml = devMode ? formatAdvisorChatPanel(game) : "";
  const contentWithModal = `
    <div class="page-container">
      ${gameContent}
      ${advisorChatHtml}
      <div id="modal-container"></div>
      <div id="card-modal-container"></div>
    </div>`;
  return formatPageWrapper({
    title: `MTG Game - ${game.deckName}`,
    content: contentWithModal,
    devMode
  });
}

export function formatActiveGameHtmlSection(game: GameState, whatHappened: WhatHappened = {}): string {

  const commandZoneHtml = formatCommandZoneHtmlFragment(game);
  const tableCardsCount = game.listTable().length;
  const librarySectionHtml = formatLibrarySectionHtmlFragment(game, whatHappened);
  const revealedCardsHtml = formatRevealedCardsHtmlFragment(game, whatHappened);
  const handSectionHtml = formatHandSectionHtmlFragment(game, whatHappened);
  const menuHtml = formatGameMenuHtmlFragment(game);
  const tableSectionHtml = ` <div id="table-section" class="table-section">
          <button class="table-cards-button"
            hx-get="/table-modal/${game.gameId}"
            hx-target="#modal-container"
            hx-swap="innerHTML">${tableCardsCount} Cards on table</button>
        </div>`;

  return `<div id="game-container"
           data-game-id="${game.gameId}"
           data-expected-version="${game.getStateVersion()}"
           hx-trigger="game-state-updated from:body"
           hx-get="/game-section/${game.gameId}"
           hx-target="#game-container"
           hx-swap="outerHTML">

           ${menuHtml}
           ${tableSectionHtml}
      <div class="game-top-row">
        ${librarySectionHtml}
        ${revealedCardsHtml}
        ${commandZoneHtml}

      </div>

      <div class="game-hand-row">
        ${handSectionHtml}
      </div>
    </div>`;
}
