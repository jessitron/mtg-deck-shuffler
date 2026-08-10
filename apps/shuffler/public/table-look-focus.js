// The table-look picker's hx-swap="outerHTML" destroys and replaces every
// swatch on each pick; browsers don't carry focus to the replacement, so
// without this, focus falls back to <body>. Re-find the equivalent swatch by
// its stable data attribute and refocus it — the one thing HTMX can't do.
(function () {
  document.body.addEventListener("htmx:afterSettle", function (evt) {
    const trigger = evt.detail.elt;
    if (!trigger || typeof trigger.matches !== "function") return;

    let selector = null;
    if (trigger.matches(".table-look-mat")) {
      selector = '.table-look-mat[data-mat-path="' + CSS.escape(trigger.dataset.matPath) + '"]';
    } else if (trigger.matches(".table-look-sleeve")) {
      selector = '.table-look-sleeve[data-sleeve-color="' + CSS.escape(trigger.dataset.sleeveColor) + '"]';
    } else if (trigger.matches(".table-look-color-input")) {
      selector = ".table-look-color-input";
    }
    if (!selector) return;

    const replacement = document.querySelector(selector);
    if (replacement) replacement.focus();
  });
})();
