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
    const imageUrl = button.dataset.imageUrl;

    // Try to copy to clipboard first
    try {
      // Use proxy endpoint to avoid CORS issues
      const proxyUrl = `/proxy-image?url=${encodeURIComponent(imageUrl)}`;
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