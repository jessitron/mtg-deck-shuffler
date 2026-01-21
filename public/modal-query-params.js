/**
 * Query parameter support for auto-opening modals
 *
 * This module handles automatically opening modals based on URL query parameters
 * for both game pages (/game/:gameId) and prep pages (/prepare/:prepId).
 *
 * Supported query parameters:
 *
 * Game page:
 * - ?openCard=N - Opens card modal for card index N
 * - ?openLibrary=true - Opens library search modal
 * - ?openTable=true - Opens table contents modal
 * - ?openHistory=true - Opens action history modal
 * - ?openDebug=true - Opens debug state JSON modal
 * - Combinations: ?openLibrary=true&openCard=N, ?openTable=true&openCard=N
 *
 * Prep page:
 * - ?openCard=N - Opens card modal for card index N
 * - ?openLibrary=true - Opens library contents modal
 * - ?openLibrary=true&openCard=N - Opens library modal with card N overlaid
 */

function autoOpenModalsFromQueryParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const currentPath = window.location.pathname;

  // Extract game ID or prep ID from the URL
  const gameMatch = currentPath.match(/\/game\/(\d+)/);
  const prepMatch = currentPath.match(/\/prepare\/(\d+)/);

  if (!gameMatch && !prepMatch) {
    return; // Not on a game or prep page
  }

  const isGamePage = !!gameMatch;
  const isPrepPage = !!prepMatch;
  const id = gameMatch ? gameMatch[1] : prepMatch[1];

  // Check which modals to open
  const openCard = urlParams.get('openCard');
  const openLibrary = urlParams.get('openLibrary');
  const openTable = urlParams.get('openTable');
  const openHistory = urlParams.get('openHistory');
  const openDebug = urlParams.get('openDebug');

  // Determine which modal(s) to open and in what order
  // Card modal overlays on other modals, so open it last

  if (isGamePage) {
    // Game page modals
    if (openLibrary === 'true') {
      htmx.ajax('GET', `/library-modal/${id}`, { target: '#modal-container' });
    } else if (openTable === 'true') {
      htmx.ajax('GET', `/table-modal/${id}`, { target: '#modal-container' });
    } else if (openHistory === 'true') {
      htmx.ajax('GET', `/history-modal/${id}`, { target: '#modal-container' });
    } else if (openDebug === 'true') {
      htmx.ajax('GET', `/debug-state/${id}`, { target: '#modal-container' });
    }

    // Open card modal (possibly overlaying another modal)
    if (openCard !== null) {
      // Use a small delay if another modal is being opened first
      const delay = (openLibrary === 'true' || openTable === 'true') ? 300 : 0;
      setTimeout(() => {
        // Get expected version from game container if available
        const gameContainer = document.querySelector('#game-container');
        const expectedVersion = gameContainer?.dataset.expectedVersion;
        const versionParam = expectedVersion ? `?expected-version=${expectedVersion}` : '';
        htmx.ajax('GET', `/card-modal/${id}/${openCard}${versionParam}`, { target: '#card-modal-container' });
      }, delay);
    }
  } else if (isPrepPage) {
    // Prep page modals
    if (openLibrary === 'true') {
      htmx.ajax('GET', `/prep-library-modal/${id}`, { target: '#modal-container' });
    }

    // Open card modal (possibly overlaying library modal)
    if (openCard !== null) {
      const delay = (openLibrary === 'true') ? 300 : 0;
      setTimeout(() => {
        htmx.ajax('GET', `/prep-card-modal/${id}/${openCard}`, { target: '#card-modal-container' });
      }, delay);
    }
  }
}

// Run auto-open on page load
document.addEventListener('DOMContentLoaded', autoOpenModalsFromQueryParams);
