// Store scroll positions before HTMX swaps
let handScrollPosition = 0;
let revealedCardsScrollPosition = 0;

document.addEventListener('htmx:beforeSwap', function(evt) {
  // Store the current scroll position of the hand section
  const handSection = document.querySelector('#hand-section .hand-cards');
  if (handSection) {
    handScrollPosition = handSection.scrollLeft;
  }
  
  // Store the current scroll position of the revealed cards section
  const revealedCardsSection = document.querySelector('#revealed-cards-area');
  if (revealedCardsSection) {
    revealedCardsScrollPosition = revealedCardsSection.scrollLeft;
  }
});

document.addEventListener('htmx:afterSwap', function(evt) {
  // Look for any card images that should continue the flip animation
  const newImages = evt.detail.target.querySelectorAll('.mtg-card-image');
  newImages.forEach(img => {
    // Check if this was part of a flip operation by looking at the animation state
    const container = img.closest('.revealed-card-container, .hand-card-container, .commander-container');
    if (container) {
      // Start the animation from the halfway point by adding the class
      img.classList.add('flipping');
      // Set initial transform to start from halfway point
      img.style.transform = 'rotateY(90deg) scale(1.1)';
      img.style.animation = 'cardFlip 0.3s ease-in-out 0.3s forwards';

      // Clean up after animation completes
      setTimeout(() => {
        img.style.transform = '';
        img.style.animation = '';
        img.classList.remove('flipping');
      }, 300);
    }
  });

  // Restore the scroll position of the hand section
  const handSection = document.querySelector('#hand-section .hand-cards');
  if (handSection && handScrollPosition > 0) {
    // Only restore if the scroll position is still valid (not beyond the new scroll width)
    const maxScrollLeft = handSection.scrollWidth - handSection.clientWidth;
    handSection.scrollLeft = Math.min(handScrollPosition, Math.max(0, maxScrollLeft));
  }

  // Restore the scroll position of the revealed cards section
  const revealedCardsSection = document.querySelector('#revealed-cards-area');
  if (revealedCardsSection && revealedCardsScrollPosition > 0) {
    // Only restore if the scroll position is still valid (not beyond the new scroll width)
    const maxScrollLeft = revealedCardsSection.scrollWidth - revealedCardsSection.clientWidth;
    revealedCardsSection.scrollLeft = Math.min(revealedCardsScrollPosition, Math.max(0, maxScrollLeft));
  }
});

// Handle clipboard copying when HTMX is about to make the request
document.addEventListener('htmx:beforeRequest', async function(evt) {
  if (evt.detail.elt.classList.contains('play-button')) {
    const button = evt.detail.elt;
    const cardId = button.dataset.cardId;

    // Try to copy to clipboard first
    try {
      // Use proxy endpoint to avoid CORS issues
      const proxyUrl = `/proxy-image?cardId=${encodeURIComponent(cardId)}`;
      const response = await fetch(proxyUrl);
      if (response.ok) {
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
        button.textContent = 'Copied!';
      }
    } catch (clipboardErr) {
      console.warn('Failed to copy image to clipboard:', clipboardErr);
      button.textContent = 'Copy failed 😨';
    }

    button.disabled = true;

    // Find the card container and add "being-played" class
    const cardContainer = button.closest('.revealed-card-container, .hand-card-container');
    console.log('cardContainer', cardContainer);
    if (cardContainer) {
      cardContainer.classList.add('being-played');
    }
  }
});

// Function to handle card flip animation with proper timing
function flipCardWithAnimation(button, url, target) {
  // Find the card image to animate
  const cardContainer = button.closest('.revealed-card-container, .hand-card-container, .commander-container');
  const cardImage = cardContainer.querySelector('.mtg-card-image');

  if (!cardImage) return;

  // Start the flip animation immediately
  cardImage.classList.add('flipping');

  // After 300ms (halfway through the 600ms animation), make the HTMX request
  setTimeout(() => {
    // Make the HTMX request programmatically
    htmx.ajax('POST', url, {
      target: target,
      swap: 'outerHTML'
    });
  }, 300);
}

