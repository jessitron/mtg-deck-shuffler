// The table-look picker on /prepare (ticket 16). Each pick live-previews on
// the page and persists into the prep with a fire-and-forget POST, so a
// reload — and the seat.joined send at Shuffle Up — sees it.
(function () {
  const panel = document.querySelector(".table-look-panel");
  if (!panel) return;
  const prepId = panel.dataset.prepId;

  function persist(fields) {
    fetch("/prep-table-look/" + prepId, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields).toString(),
    }).catch(function () {
      // Fire-and-forget: the preview already happened; a lost pick just
      // falls back to the previous saved state on reload.
    });
  }

  function selectAmong(el, selector) {
    panel.querySelectorAll(selector).forEach(function (b) {
      b.classList.remove("table-look-selected");
    });
    el.classList.add("table-look-selected");
  }

  // Live preview: this IS the mat you're standing on. background-image
  // longhand only — the shorthand would wipe the cover/center the shared
  // .playmat rule declares.
  function applyMatPreview(path) {
    document.querySelectorAll(".playmat").forEach(function (mat) {
      mat.style.backgroundImage = "url('" + path + "')";
    });
  }

  // Live preview: the sleeve color is the player-identity signal — it tints
  // the command-zone surround and the deck-title plaque. A saved pick is
  // already server-rendered with this same tint (formatDeckTitleHtmlFragment/
  // formatCommandZoneHtmlFragment, shared-components.ts) — this only reapplies
  // it live while picking, before the value persists. Inline style on
  // purpose: sleeve hex is domain data, and a page-sheet rule on these shared
  // components would leak onto /design.
  function applySleeveTint(hex) {
    document.querySelectorAll(".cool-command-zone-surround, .game-title").forEach(function (el) {
      el.style.backgroundColor = hex || "";
    });
    // A dark sleeve needs light lettering on the plaque (the .game-name span
    // inherits its color from .game-title).
    var title = document.querySelector(".game-title");
    if (title) title.style.color = hex && isDark(hex) ? "white" : "";
  }

  // Perceived luminance (ITU-R BT.601) below the midpoint reads as dark.
  function isDark(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b < 128;
  }

  panel.querySelectorAll(".table-look-mat").forEach(function (btn) {
    btn.addEventListener("click", function () {
      selectAmong(btn, ".table-look-mat");
      applyMatPreview(btn.dataset.matPath);
      persist({ "playmat-path": btn.dataset.matPath });
    });
  });

  panel.querySelectorAll(".table-look-sleeve").forEach(function (btn) {
    btn.addEventListener("click", function () {
      selectAmong(btn, ".table-look-sleeve, .table-look-custom");
      applySleeveTint(btn.dataset.sleeveColor);
      persist({ "sleeve-color": btn.dataset.sleeveColor });
    });
  });

  const custom = panel.querySelector(".table-look-custom");
  const colorInput = panel.querySelector(".table-look-color-input");
  if (custom && colorInput) {
    // Tint on every drag of the native picker; persist only on commit.
    colorInput.addEventListener("input", function () {
      selectAmong(custom, ".table-look-sleeve, .table-look-custom");
      applySleeveTint(colorInput.value);
    });
    colorInput.addEventListener("change", function () {
      persist({ "sleeve-color": colorInput.value });
    });
  }
})();
