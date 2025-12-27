/**
 * Deck Selection Page JavaScript
 * Handles validation for the deck input field on the deck selection page
 */

/**
 * Deck number validation for Load Deck button
 * Accepts either a deck number (digits only) or an Archidekt URL
 */
function setupDeckNumberValidation() {
  const deckNumberInput = document.getElementById("deck-number");
  const loadDeckButton = document.getElementById("load-deck-button");
  const errorElement = document.getElementById("deck-number-error");

  if (deckNumberInput && loadDeckButton) {
    // Regex to match Archidekt URLs and extract deck ID
    // Matches: https://archidekt.com/decks/18476272/endrek_sahr or https://archidekt.com/decks/18476272
    const archidektUrlPattern = /^https?:\/\/(?:www\.)?archidekt\.com\/decks\/(\d+)/i;
    // Regex to match just a deck number (digits only)
    const deckNumberPattern = /^\d+$/;

    function validateDeckNumber() {
      const value = deckNumberInput.value.trim();

      // Empty input - disable button, no error
      if (value.length === 0) {
        loadDeckButton.disabled = true;
        errorElement.style.display = "none";
        return;
      }

      // Check if it's a valid deck number
      if (deckNumberPattern.test(value)) {
        loadDeckButton.disabled = false;
        errorElement.style.display = "none";
        return;
      }

      // Check if it's a valid Archidekt URL
      if (archidektUrlPattern.test(value)) {
        loadDeckButton.disabled = false;
        errorElement.style.display = "none";
        return;
      }

      // Invalid format - show error and disable button
      loadDeckButton.disabled = true;
      errorElement.textContent = "Please enter a deck number or a valid Archidekt URL (e.g., https://archidekt.com/decks/18476272)";
      errorElement.style.display = "block";
    }

    // Check on input events
    deckNumberInput.addEventListener("input", validateDeckNumber);
    deckNumberInput.addEventListener("paste", function () {
      // Use setTimeout to check after paste content is processed
      setTimeout(validateDeckNumber, 0);
    });

    // Initial check
    validateDeckNumber();
  }
}

// Set up validation on page load
document.addEventListener("DOMContentLoaded", function () {
  setupDeckNumberValidation();
});
