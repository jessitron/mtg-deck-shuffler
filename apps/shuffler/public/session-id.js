(function () {
  // Minted fresh every page load, on purpose: gameId already anchors identity
  // durably (see CONTEXT-MAP.md's "Initiator" table), so this needs no
  // sessionStorage persistence, unlike browser-tab-id.js.
  window.sessionId = crypto.randomUUID();

  document.addEventListener("htmx:configRequest", function (event) {
    event.detail.headers["X-Session-Id"] = window.sessionId;
  });
})();
