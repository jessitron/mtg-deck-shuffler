import { GameState, WhatHappened } from "../../GameState.js";
import { formatPageWrapper } from "../common/html-layout.js";
import { formatHandSectionHtmlFragment } from "./hand-components.js";
import { formatLibrarySectionHtmlFragment } from "./library-components.js";
import { formatRevealedCardsHtmlFragment } from "./revealed-cards-components.js";
import { escapeHtml, formatCommandZoneHtmlFragment, formatDeckTitleHtmlFragment } from "../common/shared-components.js";
import { formatGameMenuHtmlFragment } from "./game-menu.js";
import { colorsForPlaymat, DEFAULT_PLAYMAT_PATH, luminance } from "../../table-look.js";

/** White reads better than black against anything darker than the midpoint. */
function textColorFor(hex: string): string {
  return luminance(hex) < 128 ? "white" : "black";
}

/**
 * --seat-primary/--seat-secondary (plus matching text colors) let every button on the
 * page read the seat's resolved colors via CSS custom-property inheritance, without
 * threading them through each component's own render function.
 */
function seatColorCustomProperties(game: GameState): string {
  const { primaryColor, secondaryColor } = colorsForPlaymat(game.playmatImagePath ?? DEFAULT_PLAYMAT_PATH, game.sleeveColor);
  return `--seat-primary: ${primaryColor}; --seat-secondary: ${secondaryColor}; --seat-text-on-primary: ${textColorFor(primaryColor)}; --seat-text-on-secondary: ${textColorFor(secondaryColor)};`;
}

export function formatGamePageHtmlPage(game: GameState, whatHappened: WhatHappened = {}, devMode: boolean = false): string {
  const gameContent = formatActiveGameHtmlSection(game, whatHappened);
  const playmatImageStyle = game.playmatImagePath ? `background-image: url('${game.playmatImagePath}');` : "";
  const contentWithModal = `
    <div class="playmat playmat-game" style="${playmatImageStyle}${seatColorCustomProperties(game)}">
      ${gameContent}
      <div id="modal-container"></div>
      <div id="card-modal-container"></div>
    </div>`;
  return formatPageWrapper({
    title: `MTG Game - ${game.deckName}`,
    content: contentWithModal,
    devMode,
    tableName: game.tableName,
    playerName: game.playerName,
    gameId: String(game.gameId)
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
  const { secondaryColor } = colorsForPlaymat(game.playmatImagePath ?? DEFAULT_PLAYMAT_PATH, game.sleeveColor);

  const tableHref = game.tableUrl ?? `${tabletopPublicUrl()}/t/${encodeURIComponent(game.tableName ?? "")}`;
  const goToTableButtonHtml = game.tableName
    ? `<a class="pushable-flat go-to-table-button" href="${tableHref}" target="_blank" rel="noopener">Go to Table: ${escapeHtml(game.tableName)}</a>`
    : "";

  const tableCardsSizeClass = game.tableName ? "pushable-dark pushable-small" : "";
  const tableCardsButtonHtml = `<button id="table-cards-button" class="pushable-flat ${tableCardsSizeClass} table-cards-button"
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
             ${formatDeckTitleHtmlFragment(game.deckName, secondaryColor)}
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
