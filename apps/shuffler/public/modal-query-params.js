
function planAutoOpenActions(search, pathname) {
  const urlParams = new URLSearchParams(search);

  const gameMatch = pathname.match(/\/game\/([^/?]+)/);
  const prepMatch = pathname.match(/\/prepare\/(\d+)/);

  if (!gameMatch && !prepMatch) {
    return []; // Not on a game or prep page
  }

  const isGamePage = !!gameMatch;
  const id = gameMatch ? gameMatch[1] : prepMatch[1];

  const openCard = urlParams.get('openCard');
  const openLibrary = urlParams.get('openLibrary');
  const groupBy = urlParams.get('groupBy');
  const openTable = urlParams.get('openTable');
  const openHistory = urlParams.get('openHistory');
  const openDebug = urlParams.get('openDebug');

  const actions = [];

  // Card modal overlays on other modals, so it's always planned last.
  if (isGamePage) {
    if (openLibrary === 'true') {
      actions.push(groupBy
        ? { type: 'ajax', method: 'GET', path: `/library-modal/${id}?groupBy=${groupBy}`, target: '#modal-container', withExpectedVersion: true }
        : { type: 'click', selector: '.search-button' });
    } else if (openTable === 'true') {
      actions.push({ type: 'click', selector: '.table-cards-button' });
    } else if (openHistory === 'true') {
      actions.push({ type: 'click', selector: '.history-button' });
    } else if (openDebug === 'true') {
      actions.push({ type: 'click', selector: '.debug-button' });
    }

    if (openCard !== null) {
      const delay = (openLibrary === 'true' || openTable === 'true') ? 300 : 0;
      actions.push({ type: 'ajax', method: 'GET', path: `/card-modal/${id}/${openCard}`, target: '#card-modal-container', delay, withExpectedVersion: true });
    }
  } else {
    if (openLibrary === 'true') {
      actions.push(groupBy
        ? { type: 'ajax', method: 'GET', path: `/prep-library-modal/${id}?groupBy=${groupBy}`, target: '#modal-container' }
        : { type: 'click', selector: '.search-button' });
    }

    if (openCard !== null) {
      const delay = (openLibrary === 'true') ? 300 : 0;
      actions.push({ type: 'ajax', method: 'GET', path: `/prep-card-modal/${id}/${openCard}`, target: '#card-modal-container', delay });
    }
  }

  return actions;
}

function runAjaxAction(action) {
  let path = action.path;
  if (action.withExpectedVersion) {
    const gameContainer = document.querySelector('#game-container');
    const expectedVersion = gameContainer?.dataset.expectedVersion;
    if (expectedVersion) {
      path += (path.includes('?') ? '&' : '?') + `expected-version=${expectedVersion}`;
    }
  }
  htmx.ajax(action.method, path, { target: action.target });
}

function autoOpenModalsFromQueryParams() {
  const actions = planAutoOpenActions(window.location.search, window.location.pathname);

  for (const action of actions) {
    if (action.type === 'click') {
      document.querySelector(action.selector)?.click();
    } else if (action.delay) {
      setTimeout(() => runAjaxAction(action), action.delay);
    } else {
      runAjaxAction(action);
    }
  }
}

// Run auto-open on page load
document.addEventListener('DOMContentLoaded', autoOpenModalsFromQueryParams);
