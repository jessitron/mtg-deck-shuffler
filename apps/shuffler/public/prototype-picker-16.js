// PROTOTYPE — ticket 16 (prep-screen picker v1). THROWAWAY CODE.
// Client-side selection + live playmat preview + the floating variant
// switcher. Nothing here persists or submits anything.

(function () {
  const VARIANTS = [
    { key: "A", name: "Setup panel" },
    { key: "B", name: "Summary drawer" },
    { key: "C", name: "Gallery strip" },
  ];

  const state = {
    matName: "Cascading Cataracts",
    sleeveName: "none",
    sleeveHex: null,
  };

  function currentVariant() {
    const key = new URLSearchParams(location.search).get("variant") || "A";
    return VARIANTS.some((v) => v.key === key) ? key : "A";
  }

  function gotoVariant(key) {
    const params = new URLSearchParams(location.search);
    params.set("variant", key);
    location.search = params.toString();
  }

  function cycle(delta) {
    const idx = VARIANTS.findIndex((v) => v.key === currentVariant());
    const next = (idx + delta + VARIANTS.length) % VARIANTS.length;
    gotoVariant(VARIANTS[next].key);
  }

  function renderState() {
    const el = document.querySelector(".proto16-state");
    if (!el) return;
    const sleeve = state.sleeveHex ? state.sleeveName + " " + state.sleeveHex : "none";
    el.textContent = "mat: " + state.matName + " · sleeve: " + sleeve;
  }

  function select(el, groupSelector) {
    document.querySelectorAll(groupSelector).forEach(function (b) {
      b.classList.remove("proto16-selected");
    });
    el.classList.add("proto16-selected");
  }

  function updateDrawerSummary() {
    // Variant B only: keep the collapsed summary honest.
    const matChip = document.querySelector(".proto16-summary-mat");
    const matName = document.querySelector(".proto16-summary-mat-name");
    const sleeveChip = document.querySelector(".proto16-summary-sleeve");
    const sleeveName = document.querySelector(".proto16-summary-sleeve-name");
    if (!matChip) return;
    const selectedMat = document.querySelector(".proto16-mat-swatch.proto16-selected");
    if (selectedMat) {
      matChip.style.backgroundImage = "url('" + selectedMat.dataset.matUrl + "')";
      matName.textContent = selectedMat.dataset.matName;
    }
    if (state.sleeveHex) {
      sleeveChip.classList.remove("proto16-none-chip");
      sleeveChip.style.backgroundColor = state.sleeveHex;
      sleeveChip.style.backgroundImage = "none";
      sleeveName.textContent = state.sleeveName;
    } else {
      sleeveChip.classList.add("proto16-none-chip");
      sleeveChip.style.backgroundColor = "";
      sleeveChip.style.backgroundImage = "";
      sleeveName.textContent = "no sleeves";
    }
  }

  function applySleevePreview() {
    // Live preview: the sleeve color tints the command zone and the deck-title
    // plaque. (Later it will also dress the library — separate task.)
    document.querySelectorAll(".cool-command-zone-surround, .game-title").forEach(function (el) {
      el.style.background = state.sleeveHex || "";
    });
  }

  function wirePickers() {
    document.querySelectorAll(".proto16-mat-swatch").forEach(function (btn) {
      btn.addEventListener("click", function () {
        select(btn, ".proto16-mat-swatch");
        state.matName = btn.dataset.matName;
        // Live preview: this IS the mat you're standing on.
        const mat = document.querySelector(".playmat");
        if (mat) mat.style.backgroundImage = "url('" + btn.dataset.matUrl + "')";
        renderState();
        updateDrawerSummary();
      });
    });

    document.querySelectorAll(".proto16-sleeve-swatch").forEach(function (btn) {
      btn.addEventListener("click", function () {
        select(btn, ".proto16-sleeve-swatch");
        state.sleeveHex = btn.dataset.sleeve || null;
        state.sleeveName = btn.dataset.sleeveName;
        applySleevePreview();
        renderState();
        updateDrawerSummary();
      });
    });

    const colorInput = document.querySelector(".proto16-color-input");
    if (colorInput) {
      colorInput.addEventListener("input", function () {
        document.querySelectorAll(".proto16-sleeve-swatch").forEach(function (b) {
          b.classList.remove("proto16-selected");
        });
        state.sleeveHex = colorInput.value;
        state.sleeveName = "custom";
        applySleevePreview();
        renderState();
        updateDrawerSummary();
      });
    }
  }

  function buildSwitcher() {
    const v = currentVariant();
    const name = VARIANTS.find(function (x) { return x.key === v; }).name;
    const bar = document.createElement("div");
    bar.className = "proto16-switcher";
    bar.innerHTML =
      '<button type="button" class="proto16-prev" title="previous variant">◀</button>' +
      "<span>" + v + " — " + name + "</span>" +
      '<span class="proto16-state"></span>' +
      '<button type="button" class="proto16-next" title="next variant">▶</button>';
    document.body.appendChild(bar);
    bar.querySelector(".proto16-prev").addEventListener("click", function () { cycle(-1); });
    bar.querySelector(".proto16-next").addEventListener("click", function () { cycle(1); });

    document.addEventListener("keydown", function (e) {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowLeft") cycle(-1);
      if (e.key === "ArrowRight") cycle(1);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildSwitcher();
    wirePickers();
    renderState();
  });
})();
