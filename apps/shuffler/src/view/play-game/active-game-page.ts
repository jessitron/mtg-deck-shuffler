import { GameState, WhatHappened } from "../../GameState.js";
import { formatPageWrapper } from "../common/html-layout.js";
import { formatHandSectionHtmlFragment } from "./hand-components.js";
import { formatLibrarySectionHtmlFragment } from "./library-components.js";
import { formatRevealedCardsHtmlFragment } from "./revealed-cards-components.js";
import { escapeHtml, formatCommandZoneHtmlFragment, formatDeckTitleHtmlFragment } from "../common/shared-components.js";
import { formatGameMenuHtmlFragment } from "./game-menu.js";

export function formatGamePageHtmlPage(game: GameState, whatHappened: WhatHappened = {}, devMode: boolean = false): string {
  const gameContent = formatActiveGameHtmlSection(game, whatHappened);
  const playmatStyle = game.playmatImagePath ? ` style="background-image: url('${game.playmatImagePath}')"` : "";
  const contentWithModal = `
    <div class="playmat playmat-game"${playmatStyle}>
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

function tabletopPublicUrl(): string {
  // http on purpose: the deployed Tabletop is http-only (tldraw license gate).
  return process.env.TABLETOP_PUBLIC_URL || "http://table.jessitron.honeydemo.io";
}

export function formatActiveGameHtmlSection(game: GameState, whatHappened: WhatHappened = {}): string {

  const commandZoneHtml = formatCommandZoneHtmlFragment(game);
  const tableCardsCount = game.listTable().length;
  const librarySectionHtml = formatLibrarySectionHtmlFragment(game, whatHappened);
  const revealedCardsHtml = formatRevealedCardsHtmlFragment(game, whatHappened);
  const handSectionHtml = formatHandSectionHtmlFragment(game, whatHappened);
  const menuHtml = formatGameMenuHtmlFragment(game);

  const goToTableButtonHtml = game.tableName
    ? `<a class="pushable-flat go-to-table-button" href="${tabletopPublicUrl()}/t/${encodeURIComponent(game.tableName)}" target="_blank" rel="noopener">Go to Table: ${escapeHtml(game.tableName)}</a>`
    : "";

  const tableCardsSizeClass = game.tableName ? "pushable-dark pushable-small" : "";
  const tableCardsButtonHtml = `<button class="pushable-flat ${tableCardsSizeClass} table-cards-button"
            hx-get="/table-modal/${game.gameId}"
            hx-target="#modal-container"
            hx-swap="innerHTML">${tableCardsCount} Cards on table</button>`;

  const tableSectionHtml = ` <div id="table-section" class="table-section">
          ${goToTableButtonHtml}
          ${tableCardsButtonHtml}
        </div>`;

  return `<div id="game-container"
           data-game-id="${game.gameId}"
           data-expected-version="${game.getStateVersion()}"
           hx-trigger="game-state-updated from:body"
           hx-get="/game-section/${game.gameId}"
           hx-target="#game-container"
           hx-swap="outerHTML">

           <div class="game-header-row">
             ${formatDeckTitleHtmlFragment(game.deckName, game.sleeveColor)}
             ${menuHtml}
           </div>
           ${tableSectionHtml}
      <div class="game-top-row">
        ${commandZoneHtml}
        ${revealedCardsHtml}
        ${librarySectionHtml}

      </div>

      <div class="game-hand-row">
        ${handSectionHtml}
      </div>
    </div>`;
}
