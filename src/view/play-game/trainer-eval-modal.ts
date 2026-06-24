/**
 * The "End Chat" evaluation modal for the Trainer chat. Reuses the shared modal
 * classes (.modal-overlay / .modal-dialog / ...) and renders into #modal-container.
 *
 * It asks how the Trainer did: optional free-text feedback plus a required rating
 * (1–5 stars or N/A). "Cancel" closes the modal and leaves the chat alone (via the
 * shared /close-modal route). "We're done here" posts the evaluation, which emits a
 * `trainer.evaluation` span, wipes the conversation, resets the chat, and closes
 * the drawer. See POST /mulligan-advisor/end-chat in app.ts.
 */
export function formatTrainerEvalModalHtmlFragment(gameId: number): string {
  // Stars 5→1 first (so CSS could render high-to-low if desired), then N/A.
  const starInputs = [5, 4, 3, 2, 1]
    .map(
      (n) => `<label class="trainer-eval-star" title="${n} star${n === 1 ? "" : "s"}">
                <input type="radio" class="trainer-eval-rating" name="rating" value="${n}" required />
                <span class="trainer-eval-star-glyph" aria-label="${n} stars">★</span>
              </label>`
    )
    .join("");

  return `<div class="modal-overlay trainer-eval-modal">
      <div class="modal-dialog trainer-eval-dialog">
        <div class="modal-header">
          <h2 class="modal-title">How did the trainer do?</h2>
          <button type="button" class="modal-close trainer-eval-cancel"
                  hx-get="/close-modal" hx-target="#modal-container" hx-swap="innerHTML"
                  aria-label="Cancel">&times;</button>
        </div>
        <form class="modal-body trainer-eval-form"
              hx-post="/mulligan-advisor/end-chat/${gameId}"
              hx-target="#advisor-chat-messages"
              hx-swap="innerHTML">
          <label class="trainer-eval-field">
            <span class="trainer-eval-label">Feedback (optional)</span>
            <textarea class="trainer-eval-feedback" name="feedback" rows="3"
                      placeholder="What worked, what didn't?"></textarea>
          </label>
          <fieldset class="trainer-eval-field trainer-eval-rating-field">
            <legend class="trainer-eval-label">Rating (required)</legend>
            <div class="trainer-eval-stars">${starInputs}</div>
            <label class="trainer-eval-na">
              <input type="radio" class="trainer-eval-rating" name="rating" value="na" required />
              N/A
            </label>
          </fieldset>
          <div class="trainer-eval-actions">
            <button type="button" class="trainer-eval-cancel"
                    hx-get="/close-modal" hx-target="#modal-container" hx-swap="innerHTML">Cancel</button>
            <button type="submit" class="trainer-eval-submit">We're done here</button>
          </div>
        </form>
      </div>
    </div>`;
}
