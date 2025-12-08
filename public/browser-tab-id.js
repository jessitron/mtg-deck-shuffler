/**
 * Manages a unique browser tab ID stored in session storage.
 * This ID persists across page reloads but is unique per browser tab.
 */
(function () {
  const SESSION_STORAGE_KEY = "browserTabId";

  /**
   * Get or create a browserTabId for this tab
   * @returns {string} The unique browser tab ID
   */
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

  // Configure HTMX to include browserTabId in all requests
  // Use htmx:configRequest event to add the header to each request
  document.addEventListener("htmx:configRequest", function (event) {
    event.detail.headers["X-Browser-Tab-Id"] = window.browserTabId;
  });
})();
