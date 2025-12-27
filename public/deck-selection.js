/**
 * Deck Selection Page JavaScript
 * Handles validation for the deck input field and tab switching on the deck selection page
 */

/**
 * Set the active tab button state
 * Removes 'active' class from all tab buttons and adds it to the clicked button
 */
function setActiveTab(clickedButton) {
  // Remove active class from all hero buttons
  const allButtons = document.querySelectorAll('.hero-button');
  allButtons.forEach(button => button.classList.remove('active'));

  // Add active class to clicked button
  clickedButton.classList.add('active');
}

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

// Re-run validation setup when HTMX loads new content (for tab switching)
document.addEventListener("htmx:afterSwap", function (event) {
  // Only run if the swap happened in the deck-inputs container
  if (event.detail.target.id === "deck-inputs") {
    setupDeckNumberValidation();
  }
});
