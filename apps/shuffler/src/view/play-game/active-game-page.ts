// This file's one job: game screen layout/composition order, including the HTMX
// swap contract on #game-container. It's the assembly seam — new business logic
// belongs in the section components it composes, not here.
import { GameState, WhatHappened } from "../../GameState.js";
import { formatPageWrapper } from "../common/html-layout.js";
import { formatHandSectionHtmlFragment } from "./hand-components.js";
import { formatLibrarySectionHtmlFragment } from "./library-components.js";
import { formatRevealedCardsHtmlFragment } from "./revealed-cards-components.js";
import { escapeHtml, formatCommandZoneHtmlFragment, formatDeckTitleHtmlFragment } from "../common/shared-components.js";
import { formatGameMenuHtmlFragment } from "./game-menu.js";

export function formatGamePageHtmlPage(game: GameState, whatHappened: WhatHappened = {}, devMode: boolean = false): string {
  const gameContent = formatActiveGameHtmlSection(game, whatHappened);
  // Longhand background-image only (see prepare.ejs) — the shorthand would wipe
  // the shared rule's background-size/position from playmat.css.
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

/**
 * Where spectators (and the "at table" link) find the Tabletop in a browser.
 * Distinct from TABLETOP_URL (the server-to-server address used to send cards,
 * in-cluster DNS in production).
 */
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

  // "Go to Table <name>" — shown when the game joined a table (JES-127). Opens
  // the table page in a new tab; sharing that URL is how spectators join.
  const goToTableButtonHtml = game.tableName
    ? `<a class="pushable-flat go-to-table-button" href="${tabletopPublicUrl()}/t/${encodeURIComponent(game.tableName)}" target="_blank" rel="noopener">Go to Table: ${escapeHtml(game.tableName)}</a>`
    : "";

  // The "N Cards on table" modal toggle. Full-size (the only control) when solo;
  // shrunk to a secondary button when the "Go to Table" CTA is also present.
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
             ${formatDeckTitleHtmlFragment(game.deckName)}
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
