import { GameState } from "../../GameState.js";
import { PersistedGameState } from "../../port-persist-state/types.js";
import { formatCardNameAsGathererLink } from "../common/shared-components.js";

function formatModalHtmlFragment(title: string, bodyContent: string): string {
  return `<div class="modal-overlay"
               hx-get="/close-modal"
               hx-target="#modal-container"
               hx-swap="innerHTML"
               hx-trigger="click[target==this], keyup[key=='Escape'] from:body"
               tabindex="0">
    <div class="modal-dialog">
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button class="modal-close"
                hx-get="/close-modal"
                hx-target="#modal-container"
                hx-swap="innerHTML">&times;</button>
      </div>
      <div class="modal-body">
        ${bodyContent}
      </div>
    </div>
  </div>`;
}

function formatTableCardListHtmlFragment(game: GameState): string {
  const tableCards = game.listTable();

  return tableCards
    .map(
      (gameCard: any, index: number) =>
        `<li class="table-card-item">
          <div class="card-info">
            ${formatCardNameAsGathererLink(gameCard.card)}
          </div>
          <div class="card-actions">
              <button class="card-action-button"
                      hx-post="/reveal-card/${game.gameId}/${gameCard.gameCardIndex}"
                      hx-target="#game-container"
                      hx-swap="outerHTML">Return</button>
          </div>
        </li>`
    )
    .join("");
}

export function formatTableModalHtmlFragment(game: GameState): string {
  const tableCards = game.listTable();
  const tableCardList = formatTableCardListHtmlFragment(game);

  const bodyContent = `<p class="modal-subtitle">
          ${tableCards.length} cards on table
        </p>
        <ul class="table-search-list">
          ${tableCardList}
        </ul>`;

  return formatModalHtmlFragment("Cards on Table", bodyContent);
}

function formatCollapsibleJson(obj: any, level: number = 0): string {
  const indent = '  '.repeat(level);

  if (obj === null) return '<span class="json-null">null</span>';
  if (typeof obj === 'string') return `<span class="json-string">"${obj}"</span>`;
  if (typeof obj === 'number') return `<span class="json-number">${obj}</span>`;
  if (typeof obj === 'boolean') return `<span class="json-boolean">${obj}</span>`;

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '<span class="json-bracket">[]</span>';

    const items = obj.map((item, index) =>
      `${indent}  ${formatCollapsibleJson(item, level + 1)}${index < obj.length - 1 ? ',' : ''}`
    ).join('\n');

    return `<details open>
      <summary class="json-summary"><span class="json-bracket">[</span> <span class="json-count">${obj.length} items</span></summary>
      <div class="json-content">
${items}
      </div>
    </details>${indent}<span class="json-bracket">]</span>`;
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '<span class="json-bracket">{}</span>';

    const items = keys.map((key, index) =>
      `${indent}  <span class="json-key">"${key}"</span>: ${formatCollapsibleJson(obj[key], level + 1)}${index < keys.length - 1 ? ',' : ''}`
    ).join('\n');

    return `<details open>
      <summary class="json-summary"><span class="json-bracket">{</span> <span class="json-count">${keys.length} keys</span></summary>
      <div class="json-content">
${items}
      </div>
    </details>${indent}<span class="json-bracket">}</span>`;
  }

  return String(obj);
}

export function formatDebugStateModalHtmlFragment(persistedGameState: PersistedGameState): string {
  const formattedJson = JSON.stringify(persistedGameState, null, 2);
  const collapsibleHtml = formatCollapsibleJson(persistedGameState);

  const bodyContent = `<div class="debug-container">
          <button onclick="copyDebugJson(this)"
                  class="copy-button">
            Copy JSON
          </button>
          <div class="collapsible-json">
            ${collapsibleHtml}
          </div>
          <pre class="hidden">${formattedJson}</pre>
        </div>
        <div class="debug-note">
          <strong>Game ID:</strong> ${persistedGameState.gameId} |
          <strong>Status:</strong> ${persistedGameState.status} |
          <strong>Version:</strong> ${persistedGameState.version}
        </div>
        <style>
          .collapsible-json details {
            margin-left: 16px;
          }
          .json-summary {
            cursor: pointer;
            list-style: none;
            outline: none;
          }
          .json-summary::-webkit-details-marker {
            display: none;
          }
          .json-summary::before {
            content: '▼ ';
            margin-right: 4px;
            font-size: 10px;
          }
          .collapsible-json details:not([open]) .json-summary::before {
            content: '▶ ';
          }
          .json-content {
            margin-left: 12px;
            border-left: 1px solid #ddd;
            padding-left: 8px;
          }
          .json-key { color: #0451a5; font-weight: bold; }
          .json-string { color: #d14; }
          .json-number { color: #098658; }
          .json-boolean { color: #0000ff; }
          .json-null { color: #999; }
          .json-bracket { color: #333; font-weight: bold; }
          .json-count { color: #999; font-size: 11px; font-style: italic; }
        </style>
        <script>
          function copyDebugJson(button) {
            const jsonElement = button.nextElementSibling.nextElementSibling;
            const text = jsonElement.textContent;
            navigator.clipboard.writeText(text).then(function() {
              const originalText = button.textContent;
              button.textContent = 'Copied!';
              button.style.backgroundColor = '#28a745';
              setTimeout(function() {
                button.textContent = originalText;
                button.style.backgroundColor = '#007acc';
              }, 2000);
            }).catch(function(err) {
              console.error('Failed to copy text: ', err);
              alert('Failed to copy to clipboard');
            });
          }
        </script>`;

  return formatModalHtmlFragment("Debug: Game State (PersistedGameState)", bodyContent);
}
