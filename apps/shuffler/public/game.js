// Store scroll positions before HTMX swaps
let handScrollPosition = 0;
let revealedCardsScrollPosition = 0;

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

  syncMenuToggleAria();
});

function setMenuOpen(open) {
  document.body.classList.toggle("game-menu-open", open);
  syncMenuToggleAria();
}

function syncMenuToggleAria() {
  const toggle = document.querySelector("#menu-toggle");
  if (toggle) {
    toggle.setAttribute("aria-expanded", document.body.classList.contains("game-menu-open") ? "true" : "false");
  }
}

document.addEventListener("click", function (evt) {
  if (evt.target.closest("#menu-toggle")) {
    setMenuOpen(!document.body.classList.contains("game-menu-open"));
    return;
  }

  if (document.body.classList.contains("game-menu-open") && !evt.target.closest("#game-menu")) {
    setMenuOpen(false);
  }
});

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

// Function to copy the fleet's generic card-back image to the clipboard — used for
// "Play Face Down": no Scryfall lookup needed, the card back is already a local file.
async function copyCardBackToClipboard() {
  Hny = Hny || {
    inSpanAsync: (a, b, fn, c) => {
      console.log("warning: no tracing");
      return fn();
    },
  };
  return Hny.inSpanAsync("mtg-deck-shuffler-web", "copy card back to clipboard", async (span) => {
    const response = await fetch("/images/mtg-card-back.jpg");
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

document.addEventListener("htmx:beforeRequest", function (evt) {
  if (evt.detail.elt.classList.contains("table-play-button") || evt.detail.elt.classList.contains("table-face-down-button")) {
    evt.detail.elt.textContent = "Sent to table";
    evt.detail.elt.disabled = true;
  }
});

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
  }
});

// Handle clipboard copying of the generic card back when "Play Face Down" is used solo
document.addEventListener("htmx:beforeRequest", async function (evt) {
  if (evt.detail.elt.classList.contains("play-face-down-button")) {
    const button = evt.detail.elt;

    try {
      const success = await copyCardBackToClipboard();
      if (success) {
        button.textContent = "Copied!";
      } else {
        button.textContent = "Copy failed 😨";
      }
    } catch (clipboardErr) {
      console.warn("Failed to copy card back to clipboard:", clipboardErr);
      button.textContent = "Copy failed 😨";
    }

    button.disabled = true;
  }
});

// Function to copy card image to clipboard from modal
window.copyCardImageToClipboard = async function (event, imageUrl, cardName) {
  try {
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

// Drag-and-drop state
let draggedCard = null;
let draggedFromPosition = null;

// Easter egg: the hand-symbol (image + count) can be dragged into any hand-drop-zone
// like a card. Its position is purely cosmetic — not GameState, not persisted past the
// tab — so it's tracked in sessionStorage and re-applied after every htmx re-render.
const HAND_SYMBOL_SENTINEL = "hand-symbol";

function handSymbolPositionKey(gameId) {
  return `hand-symbol-position:${gameId}`;
}

function restoreHandSymbolPosition() {
  const gameContainer = document.querySelector("#game-container");
  const gameId = gameContainer?.dataset.gameId;
  const handSymbol = document.querySelector("#hand-cards .hand-symbol");
  if (!gameId || !handSymbol) {
    return;
  }

  const stored = sessionStorage.getItem(handSymbolPositionKey(gameId));
  if (stored === null) {
    return;
  }

  const dropZones = document.querySelectorAll("#hand-cards .hand-drop-zone");
  if (dropZones.length === 0) {
    return;
  }

  const maxPosition = dropZones.length - 1; // one drop zone per hand position, 0..cardCount
  const targetPosition = Math.min(parseInt(stored), maxPosition);
  const targetZone = document.querySelector(`#hand-cards .hand-drop-zone[data-hand-position="${targetPosition}"]`);
  if (targetZone) {
    targetZone.parentNode.insertBefore(handSymbol, targetZone.nextSibling);
  }
}

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
  const handSymbol = document.querySelector("#hand-cards .hand-symbol");
  const dropZones = document.querySelectorAll("#hand-cards .hand-drop-zone");

  handCards.forEach((card) => {
    card.addEventListener("dragstart", handleDragStart);
    card.addEventListener("dragend", handleDragEnd);
  });

  if (handSymbol) {
    handSymbol.addEventListener("dragstart", handleDragStart);
    handSymbol.addEventListener("dragend", handleDragEnd);
  }

  dropZones.forEach((zone) => {
    zone.addEventListener("dragover", handleDragOver);
    zone.addEventListener("dragleave", handleDragLeave);
    zone.addEventListener("drop", handleDrop);
  });

  restoreHandSymbolPosition();
}

function handleDragStart(e) {
  draggedCard = e.currentTarget;

  if (draggedCard.classList.contains("hand-symbol")) {
    draggedFromPosition = HAND_SYMBOL_SENTINEL;
    draggedCard.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", draggedCard.innerHTML);
    return;
  }

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

  if (draggedCard && draggedFromPosition === HAND_SYMBOL_SENTINEL) {
    dropZone.parentNode.insertBefore(draggedCard, dropZone.nextSibling);

    const gameContainer = document.querySelector("#game-container");
    const gameId = gameContainer?.dataset.gameId;
    if (gameId) {
      sessionStorage.setItem(handSymbolPositionKey(gameId), String(dropPosition));
    }

    return false;
  }

  if (draggedCard && draggedFromPosition !== null) {
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

// Opens one native EventSource per tab against /game-events/:gameId (only for a
// table-mode game — data-spine-table-id is absent for solo games, which have nothing to
// push). On message, dispatches the same "game-state-updated" CustomEvent the page's
// own #game-container hx-trigger already listens for, so a card returned from the table
// re-fetches through the identical path any other externally-triggered update uses.
// Opened once per full page load (this script isn't re-injected on an HTMX swap), and
// left open across #game-container swaps — only closing the tab closes it.
document.addEventListener("DOMContentLoaded", function () {
  const gameContainer = document.querySelector("#game-container");
  const gameId = gameContainer?.dataset.gameId;
  const spineTableId = gameContainer?.dataset.spineTableId;
  if (!gameId || !spineTableId) return;

  const source = new EventSource(`/game-events/${gameId}`);
  source.onmessage = function () {
    document.body.dispatchEvent(new CustomEvent("game-state-updated", { bubbles: true }));
  };
});

document.addEventListener('keydown', (event) => {
  const isUndo = (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'z';
  if (!isUndo) return;

  const target = event.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
  if (document.querySelector('.modal-overlay, .card-modal-overlay')) return;

  const undoButton = document.querySelector('.undo-button');
  if (!undoButton) return;

  event.preventDefault();
  undoButton.click();
});

document.addEventListener('keydown', (event) => {
  // Check if card modal is open
  const modal = document.querySelector('.card-modal-overlay');
  if (!modal) return;

  // Navigate with arrow keys
  if (event.key === 'ArrowLeft') {
    const prevButton = modal.querySelector('.card-modal-nav-prev');
    if (prevButton) {
      prevButton.click();
      event.preventDefault(); // Prevent default arrow key behavior
    }
  } else if (event.key === 'ArrowRight') {
    const nextButton = modal.querySelector('.card-modal-nav-next');
    if (nextButton) {
      nextButton.click();
      event.preventDefault(); // Prevent default arrow key behavior
    }
  }
});
