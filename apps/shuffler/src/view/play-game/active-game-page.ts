import { GameState, WhatHappened } from "../../GameState.js";
import { formatPageWrapper } from "../common/html-layout.js";
import { formatHandSectionHtmlFragment } from "./hand-components.js";
import { formatLibrarySectionHtmlFragment } from "./library-components.js";
import { formatRevealedCardsHtmlFragment } from "./revealed-cards-components.js";
import { escapeHtml, formatCommandZoneHtmlFragment, formatDeckTitleHtmlFragment } from "../common/shared-components.js";
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

/**
 * The "N Cards on table" modal toggle. Full-size (the only control) when solo;
 * shrunk to a secondary button when a "Go to Table" CTA is also present.
 */
function formatTableCardsButtonHtmlFragment(game: GameState, tableCardsCount: number): string {
  const sizeClass = game.tableName ? "pushable-dark pushable-small" : "";
  return `<button class="pushable-flat ${sizeClass} table-cards-button"
            hx-get="/table-modal/${game.gameId}"
            hx-target="#modal-container"
            hx-swap="innerHTML">${tableCardsCount} Cards on table</button>`;
}

/**
 * "Go to Table <name>" — shown when the game joined a table (JES-127). Opens
 * the table page in a new tab; sharing that URL is how spectators join.
 */
function formatGoToTableButtonHtmlFragment(game: GameState): string {
  if (!game.tableName) {
    return "";
  }
  const tableUrl = `${tabletopPublicUrl()}/t/${encodeURIComponent(game.tableName)}`;
  return `<a class="pushable-flat go-to-table-button" href="${tableUrl}" target="_blank" rel="noopener">Go to Table: ${escapeHtml(game.tableName)}</a>`;
}

export function formatActiveGameHtmlSection(game: GameState, whatHappened: WhatHappened = {}): string {

  const commandZoneHtml = formatCommandZoneHtmlFragment(game);
  const tableCardsCount = game.listTable().length;
  const librarySectionHtml = formatLibrarySectionHtmlFragment(game, whatHappened);
  const revealedCardsHtml = formatRevealedCardsHtmlFragment(game, whatHappened);
  const handSectionHtml = formatHandSectionHtmlFragment(game, whatHappened);
  const menuHtml = formatGameMenuHtmlFragment(game);
  const tableSectionHtml = ` <div id="table-section" class="table-section">
          ${formatGoToTableButtonHtmlFragment(game)}
          ${formatTableCardsButtonHtmlFragment(game, tableCardsCount)}
        </div>`;

  return `<div id="game-container"
           data-game-id="${game.gameId}"
           data-expected-version="${game.getStateVersion()}"
           hx-trigger="game-state-updated from:body"
           hx-get="/game-section/${game.gameId}"
           hx-target="#game-container"
           hx-swap="outerHTML">

           <div class="game-header-row">
             ${formatDeckTitleHtmlFragment(game.deckName)}
             ${menuHtml}
           </div>
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
