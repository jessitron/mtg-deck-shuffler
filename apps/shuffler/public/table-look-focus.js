// The table-look picker's hx-swap="outerHTML" destroys and replaces every
// swatch on each pick; browsers don't carry focus to the replacement, so
// without this, focus falls back to <body>. Re-find the equivalent swatch by
// its stable data attribute and refocus it — the one thing HTMX can't do.
//
// Why this doesn't read evt.detail.elt on htmx:afterSettle: htmx's internal
// triggerEvent(elt, name, detail) always overwrites detail.elt = elt (the
// element the event is being dispatched ON) before dispatching. afterSettle
// fires once per element in the swapped fragment that carries a
// class/style/width/height attribute (its settle pass) — so detail.elt is
// whichever of those elements is being settled *at that moment*, not the
// button that was actually clicked. Capturing at htmx:configRequest instead
// works because that event fires exactly once per request, directly on the
// real triggering element, before any swap/settle happens.
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
