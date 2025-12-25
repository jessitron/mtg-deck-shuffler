import { formatPageWrapper } from "../common/html-layout.js";

export function formatLoadStateHtmlPage(): string {
  const content = `<div class="deck-input-section">
      <h1>Load Game State</h1>
      <div class="load-state-container">
        <p>Paste the JSON state from another game to create a new game with that state:</p>
        <form method="post" action="/create-game-from-state">
          <textarea id="state-json"
                    name="state-json"
                    placeholder="Paste JSON state here..."
                    class="state-textarea"
                    rows="10"
                    required></textarea>
          <div class="form-actions">
            <button type="submit" class="load-state-submit-button">Create Game</button>
            <a href="/choose-any-deck" class="cancel-link">Cancel</a>
          </div>
        </form>
      </div>
    </div>
    <style>
      .load-state-container {
        max-width: 600px;
        margin: 0 auto;
      }
      .state-textarea {
        width: 100%;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        border: 1px solid #ddd;
        padding: 8px;
        resize: vertical;
        min-height: 200px;
        box-sizing: border-box;
      }
      .form-actions {
        margin-top: 16px;
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .load-state-submit-button {
        background-color: #28a745;
        color: white;
        border: none;
        padding: 8px 16px;
        cursor: pointer;
      }
      .load-state-submit-button:hover {
        background-color: #218838;
      }
      .cancel-link {
        color: #6c757d;
        text-decoration: none;
        padding: 8px 16px;
      }
      .cancel-link:hover {
        text-decoration: underline;
      }
    </style>`;

  return formatPageWrapper({
    title: "Load Game State - MTG Deck Shuffler",
    content
  });
}