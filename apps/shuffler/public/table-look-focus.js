(function () {
  let pendingSelector = null;

  function selectorFor(elt) {
    if (elt.matches(".table-look-mat")) {
      return '.table-look-mat[data-mat-path="' + CSS.escape(elt.dataset.matPath) + '"]';
    }
    if (elt.matches(".table-look-sleeve")) {
      return '.table-look-sleeve[data-sleeve-color="' + CSS.escape(elt.dataset.sleeveColor) + '"]';
    }
    if (elt.matches(".table-look-color-input")) {
      return ".table-look-color-input";
    }
    return null;
  }

  document.body.addEventListener("htmx:configRequest", function (evt) {
    const elt = evt.detail.elt;
    pendingSelector = elt && typeof elt.matches === "function" ? selectorFor(elt) : null;
  });

  document.body.addEventListener("htmx:afterSettle", function () {
    if (!pendingSelector) return;
    const replacement = document.querySelector(pendingSelector);
    if (replacement) replacement.focus();
  });
})();
