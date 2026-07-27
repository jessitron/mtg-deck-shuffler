import { GameState, WhatHappened } from "../../GameState.js";
import { formatPageWrapper } from "../common/html-layout.js";
import { formatHandSectionHtmlFragment } from "./hand-components.js";
import { formatLibrarySectionHtmlFragment } from "./library-components.js";
import { formatRevealedCardsHtmlFragment } from "./revealed-cards-components.js";
import { formatCommandZoneHtmlFragment } from "../common/shared-components.js";
import { formatGameMenuHtmlFragment } from "./game-menu.js";

export function formatGamePageHtmlPage(game: GameState, whatHappened: WhatHappened = {}, devMode: boolean = false): string {
  const gameContent = formatActiveGameHtmlSection(game, whatHappened);
  const contentWithModal = `
    <div class="page-container">
      ${gameContent}
      <div id="modal-container"></div>
      <div id="card-modal-container"></div>
    </div>`;
  return formatPageWrapper({
    title: `MTG Game - ${game.deckName}`,
    content: contentWithModal,
    devMode
  });
}

/**
 * Where spectators (and the "at table" link) find the Tabletop in a browser.
 * Distinct from TABLETOP_URL (the server-to-server address used to send cards,
 * in-cluster DNS in production).
 */
export function tabletopPublicUrl(): string {
  return process.env.TABLETOP_PUBLIC_URL || "https://table.jessitron.honeydemo.io";
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * "at table <name>" — shown when the game joined a table (JES-127). The link
 * opens the table page in a new tab; sharing that URL is how spectators join.
 */
function formatAtTableBannerHtmlFragment(game: GameState): string {
  if (!game.tableName) {
    return "";
  }
  const tableUrl = `${tabletopPublicUrl()}/t/${encodeURIComponent(game.tableName)}`;
  return `<div class="at-table-banner">at table <a class="at-table-link" href="${tableUrl}" target="_blank" rel="noopener">${escapeHtml(game.tableName)}</a></div>`;
}

export function formatActiveGameHtmlSection(game: GameState, whatHappened: WhatHappened = {}): string {

  const commandZoneHtml = formatCommandZoneHtmlFragment(game);
  const tableCardsCount = game.listTable().length;
  const librarySectionHtml = formatLibrarySectionHtmlFragment(game, whatHappened);
  const revealedCardsHtml = formatRevealedCardsHtmlFragment(game, whatHappened);
  const handSectionHtml = formatHandSectionHtmlFragment(game, whatHappened);
  const menuHtml = formatGameMenuHtmlFragment(game);
  const tableSectionHtml = ` <div id="table-section" class="table-section">
          ${formatAtTableBannerHtmlFragment(game)}
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
