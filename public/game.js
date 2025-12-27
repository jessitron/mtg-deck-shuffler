// Store scroll positions before HTMX swaps
let handScrollPosition = 0;
let revealedCardsScrollPosition = 0;

/**
 * Retain scroll position of hand
 */
document.addEventListener("htmx:beforeSwap", function (evt) {
  // Store the current scroll position of the hand section
  const handSection = document.querySelector("#hand-section .hand-cards");
  if (handSection) {
    handScrollPosition = handSection.scrollLeft;
  }

  // Store the current scroll position of the revealed cards section
  const revealedCardsSection = document.querySelector("#revealed-cards-area");
  if (revealedCardsSection) {
    revealedCardsScrollPosition = revealedCardsSection.scrollLeft;
  }
});

document.addEventListener("htmx:afterSwap", function (evt) {
  // Restore the scroll position of the hand section
  const handSection = document.querySelector("#hand-section .hand-cards");
  if (handSection && handScrollPosition > 0) {
    // Only restore if the scroll position is still valid (not beyond the new scroll width)
    const maxScrollLeft = handSection.scrollWidth - handSection.clientWidth;
    handSection.scrollLeft = Math.min(handScrollPosition, Math.max(0, maxScrollLeft));
  }

  // Restore the scroll position of the revealed cards section
  const revealedCardsSection = document.querySelector("#revealed-cards-area");
  if (revealedCardsSection && revealedCardsScrollPosition > 0) {
    // Only restore if the scroll position is still valid (not beyond the new scroll width)
    const maxScrollLeft = revealedCardsSection.scrollWidth - revealedCardsSection.clientWidth;
    revealedCardsSection.scrollLeft = Math.min(revealedCardsScrollPosition, Math.max(0, maxScrollLeft));
  }
});

/**
 * Copy card image to clipboard
 */
// Function to copy card image to clipboard using proxy URL
async function copyCardToClipboard(cardId, face) {
  // make sure tracing exists
  Hny = Hny || {
    inSpanAsync: (a, b, fn, c) => {
      console.log("warning: no tracing");
      return fn();
    },
  };
  return Hny.inSpanAsync("mtg-deck-shuffler-web", "copy card to clipboard", async (span) => {
    const proxyUrl = `/proxy-image?cardId=${encodeURIComponent(cardId)}&face=${encodeURIComponent(face)}`;
    const response = await fetch(proxyUrl);
    span?.setAttribute("app.response.ok", response.ok);
    if (response.ok) {
      const blob = await response.blob();
      span?.setAttribute("app.blob.type", blob.type);
      span?.setAttribute("app.blob.size", blob.size);
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      return true;
    }
    return false;
  });
}

// Handle clipboard copying when HTMX is about to make the request
document.addEventListener("htmx:beforeRequest", async function (evt) {
  if (evt.detail.elt.classList.contains("play-button")) {
    const button = evt.detail.elt;
    const cardId = button.dataset.cardId;
    const currentFace = button.dataset.currentFace || "front";

    // Try to copy to clipboard first
    try {
      const success = await copyCardToClipboard(cardId, currentFace);
      if (success) {
        button.textContent = "Copied!";
      } else {
        button.textContent = "Copy failed 😨";
      }
    } catch (clipboardErr) {
      console.warn("Failed to copy image to clipboard:", clipboardErr);
      button.textContent = "Copy failed 😨";
    }

    button.disabled = true;

    // Find the card container and add "being-played" class
    const cardContainer = button.closest(".card-container");
    console.log("cardContainer", cardContainer);
    if (cardContainer) {
      cardContainer.classList.add("being-played");
    }
  }
});

// Function to copy card image to clipboard from modal
window.copyCardImageToClipboard = async function (event, imageUrl, cardName) {
  try {
    // Extract card ID and face from the image URL
    // URL format: https://cards.scryfall.io/large/front/{first}/{second}/{cardId}.jpg
    const urlParts = imageUrl.split("/");
    const filename = urlParts[urlParts.length - 1];
    const cardId = filename.split(".")[0];
    const face = urlParts.includes("/back/") ? "back" : "front";

    const success = await copyCardToClipboard(cardId, face);

    // Show feedback to user
    const copyButton = event.target;
    const originalText = copyButton.textContent;

    if (success) {
      copyButton.textContent = "Copied!";
    } else {
      copyButton.textContent = "Copy failed 😨";
    }
    copyButton.disabled = true;

    setTimeout(() => {
      copyButton.textContent = originalText;
      copyButton.disabled = false;
    }, 2000);
  } catch (error) {
    console.warn("Failed to copy image to clipboard:", error);

    // Show error feedback
    const copyButton = event.target;
    const originalText = copyButton.textContent;
    copyButton.textContent = "Copy failed 😨";
    copyButton.disabled = true;

    setTimeout(() => {
      copyButton.textContent = originalText;
      copyButton.disabled = false;
    }, 2000);
  }
};

/**
 * Drag/drop for hand card rearranging
 */
// Drag-and-drop state
let draggedCard = null;
let draggedFromPosition = null;

// Set up drag-and-drop handlers after HTMX swaps
document.addEventListener("htmx:afterSwap", function (evt) {
  setupHandCardDragAndDrop();
});

// Also set up on initial page load
document.addEventListener("DOMContentLoaded", function () {
  setupHandCardDragAndDrop();
  setupDeckNumberValidation();
});

function setupHandCardDragAndDrop() {
  const handCards = document.querySelectorAll("#hand-cards .card-container[draggable='true']");
  const dropZones = document.querySelectorAll("#hand-cards .hand-drop-zone");

  handCards.forEach((card) => {
    card.addEventListener("dragstart", handleDragStart);
    card.addEventListener("dragend", handleDragEnd);
  });

  dropZones.forEach((zone) => {
    zone.addEventListener("dragover", handleDragOver);
    zone.addEventListener("dragleave", handleDragLeave);
    zone.addEventListener("drop", handleDrop);
  });
}

function handleDragStart(e) {
  draggedCard = e.currentTarget;
  draggedFromPosition = parseInt(draggedCard.dataset.handPosition);
  draggedCard.classList.add("dragging");

  draggedCard.classList.remove("card-moved-left"); // if it has these it flickers when dropped
  draggedCard.classList.remove("card-moved-right");
  draggedCard.classList.remove("dropped-from-left");
  draggedCard.classList.remove("dropped-from-right");

  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/html", draggedCard.innerHTML);
}

function handleDragEnd(e) {
  draggedCard.classList.remove("dragging");
  draggedCard = null;
  draggedFromPosition = null;
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = "move";
  e.currentTarget.classList.add("drag-over");
  return false;
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove("drag-over");
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  e.preventDefault();

  const dropZone = e.currentTarget;
  dropZone.classList.remove("drag-over");

  const dropPosition = parseInt(dropZone.dataset.handPosition);

  if (draggedCard && draggedFromPosition !== null) {
    // Calculate the target position
    // If dropping after the dragged card's current position, adjust by -1 (why?)
    let targetPosition = dropPosition;
    if (dropPosition > draggedFromPosition) {
      targetPosition = dropPosition - 1;
    }

    if (draggedFromPosition === targetPosition) {
      return false;
    }

    // Get the game ID and expected version from the page
    const gameContainer = document.querySelector("#game-container");
    const gameId = gameContainer?.dataset.gameId;
    const expectedVersion = gameContainer?.dataset.expectedVersion;

    if (gameId) {
      // Use HTMX to make the POST request
      htmx.ajax("POST", `/move-hand-card/${gameId}/${draggedFromPosition}/${targetPosition}`, {
        target: "#game-container",
        swap: "outerHTML",
        values: { "expected-version": expectedVersion },
      });
    }
  }

  return false;
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
