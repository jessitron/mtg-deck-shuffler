import { formatModalHtmlFragment } from "../play-game/game-modals.js";

export function formatLoadStateModalHtmlFragment(): string {
  const bodyContent = `<div class="load-state-container">
          <p class="modal-subtitle">
            Paste the JSON state from another game to create a new game with that state:
          </p>
          <form hx-post="/create-game-from-state" hx-target="#deck-input" hx-swap="innerHTML">
            <textarea id="state-json"
                      name="state-json"
                      placeholder="Paste JSON state here..."
                      class="state-textarea"
                      rows="10"
                      required></textarea>
            <div class="modal-actions">
              <button type="submit" class="load-state-submit-button">Create Game</button>
              <button type="button"
                      class="cancel-button"
                      hx-get="/close-modal"
                      hx-target="#modal-container"
                      hx-swap="innerHTML">Cancel</button>
            </div>
          </form>
        </div>
        <style>
          .load-state-container {
            max-width: 600px;
          }
          .state-textarea {
            width: 100%;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 8px;
            resize: vertical;
            min-height: 200px;
          }
          .modal-actions {
            margin-top: 16px;
            display: flex;
            gap: 12px;
            justify-content: flex-end;
          }
          .load-state-submit-button {
            background-color: #28a745;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
          }
          .load-state-submit-button:hover {
            background-color: #218838;
          }
          .cancel-button {
            background-color: #6c757d;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
          }
          .cancel-button:hover {
            background-color: #5a6268;
          }
        </style>`;

  return formatModalHtmlFragment("Load Game State", bodyContent);
}