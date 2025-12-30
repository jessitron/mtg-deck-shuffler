/**
 * Deck Selection Page JavaScript
 * Handles validation for the deck input field and tab switching on the deck selection page
 */

/**
 * Set the active tab button state
 * Removes 'active' class from all tab buttons and adds it to the clicked button
 * Also toggles full-width mode for the container based on which tab is selected
 */
function setActiveTab(clickedButton) {
  // Remove active class from all hero buttons
  const allButtons = document.querySelectorAll('.hero-button');
  allButtons.forEach(button => button.classList.remove('active'));

  // Add active class to clicked button
  clickedButton.classList.add('active');

  // Toggle full-width class on container based on selected tab
  const container = document.querySelector('.deck-selection-container');
  if (container) {
    const buttonText = clickedButton.textContent.trim();
    if (buttonText === 'Precon') {
      container.classList.add('full-width');
    } else {
      container.classList.remove('full-width');
    }
  }
}

/**
 * Set up precon deck search functionality
 * Filters deck tiles based on search input
 */
function setupPreconSearch() {
  const searchInput = document.getElementById("precon-search");
  if (!searchInput) return;

  const deckTiles = document.querySelectorAll(".precon-tile");
  
  // Pre-compute searchable text for each tile once during setup
  const tileSearchData = Array.from(deckTiles).map(tile => {
    const deckName = tile.querySelector(".tile-deck-name")?.textContent.toLowerCase() || "";
    const commanderNames = Array.from(tile.querySelectorAll(".commander-name"))
      .map(el => el.textContent.toLowerCase())
      .join(" ");
    const setName = tile.querySelector(".tile-meta span:first-child")?.textContent.toLowerCase() || "";
    
    return {
      tile,
      searchableText: `${deckName} ${commanderNames} ${setName}`
    };
  });

  searchInput.addEventListener("input", function() {
    const searchTerm = this.value.toLowerCase().trim();

    tileSearchData.forEach(({ tile, searchableText }) => {
      // Show or hide tile based on search match
      if (searchableText.includes(searchTerm)) {
        tile.style.display = "";
      } else {
        tile.style.display = "none";
      }
    });
  });
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
        errorElement.style.visibility = "hidden";
        return;
      }

      // Check if it's a valid deck number
      if (deckNumberPattern.test(value)) {
        loadDeckButton.disabled = false;
        errorElement.style.visibility = "hidden";
        return;
      }

      // Check if it's a valid Archidekt URL
      if (archidektUrlPattern.test(value)) {
        loadDeckButton.disabled = false;
        errorElement.style.visibility = "hidden";
        return;
      }

      // Invalid format - show error and disable button
      loadDeckButton.disabled = true;
      errorElement.textContent = "Please enter a deck number or a valid Archidekt URL (e.g., https://archidekt.com/decks/18476272)";
      errorElement.style.visibility = "unset";
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
  setupPreconSearch();

  // Set initial full-width state based on which tab is active
  const activeButton = document.querySelector('.hero-button.active');
  const container = document.querySelector('.deck-selection-container');
  if (activeButton && container) {
    const buttonText = activeButton.textContent.trim();
    if (buttonText === 'Precon') {
      container.classList.add('full-width');
    }
  }
});

// Re-run validation setup when HTMX loads new content (for tab switching)
document.addEventListener("htmx:afterSwap", function (event) {
  // Only run if the swap happened in the deck-inputs container
  if (event.detail.target.id === "deck-inputs") {
    setupDeckNumberValidation();
    setupPreconSearch();
  }
});
