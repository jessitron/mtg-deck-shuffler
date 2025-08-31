// Modal functionality for library search
function openLibraryModal() {
  const modal = document.getElementById('library-modal');
  if (modal) {
    modal.style.display = 'flex';
    // Focus trap - focus the close button
    const closeButton = modal.querySelector('.modal-close');
    if (closeButton) {
      closeButton.focus();
    }
  }
}

function closeLibraryModal() {
  const modal = document.getElementById('library-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Close modal when clicking outside the dialog
document.addEventListener('click', function(event) {
  const modal = document.getElementById('library-modal');
  if (modal && event.target === modal) {
    closeLibraryModal();
  }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeLibraryModal();
  }
});

// Placeholder functions for card actions (to be implemented later)
function revealCard(index) {
  console.log('Reveal card at position:', index);
  // TODO: Implement reveal card functionality
  alert('Reveal card functionality will be implemented in a future update');
}

function putInHand(index) {
  console.log('Put card in hand at position:', index);
  // TODO: Implement put in hand functionality
  alert('Put in hand functionality will be implemented in a future update');
}
