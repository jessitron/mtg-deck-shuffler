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
  const proxyUrl = `/proxy-image?cardId=${encodeURIComponent(cardId)}&face=${encodeURIComponent(face)}`;
  const response = await fetch(proxyUrl);
  if (response.ok) {
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ]);
    return true;
  }
  return false;
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
window.copyCardImageToClipboard = async function(event, imageUrl, cardName) {
  try {
    // Extract card ID and face from the image URL
    // URL format: https://cards.scryfall.io/large/front/{first}/{second}/{cardId}.jpg
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const cardId = filename.split('.')[0];
    const face = urlParts.includes('/back/') ? 'back' : 'front';

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

  if (draggedCard && draggedFromPosition !== null && draggedFromPosition !== dropPosition) {
    // Calculate the target position
    // If dropping after the dragged card's current position, adjust by -1 (why?)
    let targetPosition = dropPosition;
    if (dropPosition > draggedFromPosition) {
      targetPosition = dropPosition - 1;
    }

    // Get the game ID from the page
    const gameContainer = document.querySelector("#game-container");
    const gameId = gameContainer?.dataset.gameId;

    if (gameId) {
      // Use HTMX to make the POST request
      htmx.ajax("POST", `/move-hand-card/${gameId}/${draggedFromPosition}/${targetPosition}`, {
        target: "#game-container",
        swap: "outerHTML",
      });
    }
  }

  return false;
}
