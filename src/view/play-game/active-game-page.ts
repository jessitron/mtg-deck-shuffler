import { GameState, WhatHappened } from "../../GameState.js";
import { formatPageWrapper } from "../common/html-layout.js";
import { formatHandSectionHtmlFragment } from "./hand-components.js";
import { formatLibrarySectionHtmlFragment } from "./library-components.js";
import { formatRevealedCardsHtmlFragment } from "./revealed-cards-components.js";
import { formatCommandZoneHtmlFragment } from "../common/shared-components.js";
import { formatGameMenuHtmlFragment } from "./game-menu.js";
import { formatAdvisorChatPanel } from "./advisor-chat.js";
import { TrainerConversation } from "../../mulligan/trainerConversationStore.js";

export function formatGamePageHtmlPage(game: GameState, whatHappened: WhatHappened = {}, devMode: boolean = false, conversation?: TrainerConversation): string {
  const gameContent = formatActiveGameHtmlSection(game, whatHappened);
  // The advisor chat drawer is rendered once here (outside #game-container, which
  // HTMX swaps) so the conversation survives game-state swaps. The conversation
  // itself lives in the backend store and is rehydrated here on every full page
  // load. Dev-mode only.
  const advisorChatHtml = devMode ? formatAdvisorChatPanel(game, conversation) : "";
  // Auto-open the drawer when there's a conversation to come back to. Rendering
  // the body class server-side (like dev-mode) means it survives game-state swaps
  // with no afterSwap JS — see the animations feature owner's settle-phase note.
  const advisorChatOpen = devMode && (conversation?.messages.length ?? 0) > 0;
  // game-layout is a flex row: the playmat (.page-container) and the advisor
  // drawer are real siblings. The drawer is OUTSIDE #game-container (which HTMX
  // swaps) so the conversation survives game-state swaps, but inside game-layout
  // so it takes real layout space and the playmat stays centered in what's left.
  const contentWithModal = `
    <div class="game-layout">
      <div class="page-container">
        ${gameContent}
        <div id="modal-container"></div>
        <div id="card-modal-container"></div>
      </div>
      ${advisorChatHtml}
    </div>`;
  return formatPageWrapper({
    title: `MTG Game - ${game.deckName}`,
    content: contentWithModal,
    devMode,
    advisorChatOpen
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
