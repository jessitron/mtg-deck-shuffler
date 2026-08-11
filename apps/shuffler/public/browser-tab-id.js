(function () {
  const SESSION_STORAGE_KEY = "browserTabId";

  function getBrowserTabId() {
    // Try to get existing ID from session storage
    let tabId = sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (!tabId) {
      // Generate a new UUID for this tab
      tabId = crypto.randomUUID();
      sessionStorage.setItem(SESSION_STORAGE_KEY, tabId);
    }

    return tabId;
  }

  // Initialize browserTabId and make it globally available
  window.browserTabId = getBrowserTabId();

  document.addEventListener("htmx:configRequest", function (event) {
    event.detail.headers["X-Browser-Tab-Id"] = window.browserTabId;
  });
})();
