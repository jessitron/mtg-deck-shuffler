function swatchButton(hex) {
  return `<button type="button" class="swatch" style="background:${hex}" data-hex="${hex}" title="${hex}"></button>`;
}

function slotGroup({ id, label, hexes, saveLabel }) {
  const slots = hexes
    .map(
      (hex, i) => `
      <div class="slot" data-group="${id}" data-index="${i}">
        <button
          type="button"
          class="slot-color"
          id="${id}-${i}"
          data-hex="${hex}"
          style="background:${hex}"
          title="Click to select this slot, then click a candidate to fill it"
        ></button>
        <span class="hex-readout" id="${id}-${i}-readout">${hex}</span>
        <button type="button" class="custom-picker-button" data-target="${id}-${i}" title="Pick a custom color">🎨</button>
        <input type="color" class="native-picker" id="${id}-${i}-native" value="${hex}" tabindex="-1" />
      </div>`
    )
    .join("");

  return `
    <section class="slot-group">
      <h2>${label}</h2>
      <div class="slots">${slots}</div>
      <button type="button" class="save-button" data-group="${id}">${saveLabel}</button>
      <span class="unsaved-indicator" id="${id}-unsaved">● unsaved changes</span>
      <span class="status" id="${id}-status"></span>
    </section>`;
}

export function renderPage({
  imageName,
  candidates,
  suggestedTwo,
  suggestedThree,
  suggestedFive,
  chosenTwo,
  chosenThree,
  chosenFive,
}) {
  const twoHexes = chosenTwo && chosenTwo.length === 2 ? chosenTwo : suggestedTwo;
  const threeHexes = chosenThree && chosenThree.length === 3 ? chosenThree : suggestedThree;
  const fiveHexes = chosenFive && chosenFive.length === 5 ? chosenFive : suggestedFive;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Playmat colors — ${imageName}</title>
<style>
  body { font-family: system-ui, sans-serif; background: #1a1a1a; color: #eee; margin: 0; display: flex; }
  .image-pane { flex: 1 1 55%; padding: 1.5rem; display: flex; align-items: flex-start; justify-content: center; }
  .image-pane img { max-width: 100%; max-height: 90vh; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.6); }
  .controls-pane { flex: 1 1 45%; padding: 1.5rem; overflow-y: auto; }
  h1 { font-size: 1.1rem; margin-top: 0; }
  h2 { font-size: 0.95rem; margin-bottom: 0.5rem; color: #ccc; }
  .candidates { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1.5rem; }
  .swatch { width: 36px; height: 36px; border-radius: 6px; border: 2px solid #444; cursor: pointer; padding: 0; }
  .swatch:hover { border-color: #fff; }
  .slot-group { margin-bottom: 1.5rem; padding: 1rem; background: #242424; border-radius: 8px; }
  .slots { display: flex; gap: 1.25rem; margin-bottom: 0.75rem; }
  .slot { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; font-size: 0.8rem; }
  .slot-color { width: 48px; height: 48px; border: 3px solid #555; border-radius: 6px; cursor: pointer; padding: 0; }
  .slot-color:hover { border-color: #999; }
  .slot-color.selected { border-color: #fff; box-shadow: 0 0 0 2px #4a7c59; }
  .custom-picker-button { background: none; border: 1px solid #444; border-radius: 4px; cursor: pointer; font-size: 0.9rem; padding: 0.1rem 0.3rem; }
  .native-picker { position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none; }
  .save-button { background: #4a7c59; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
  .save-button:hover { background: #5a9c69; }
  .status { margin-left: 0.75rem; font-size: 0.85rem; color: #8f8; }
  .unsaved-indicator { margin-left: 0.75rem; font-size: 0.85rem; color: #e0a030; display: none; }
  .unsaved-indicator.visible { display: inline; }
  .hint { color: #999; font-size: 0.85rem; }
</style>
</head>
<body>
  <div class="image-pane">
    <img src="/image" alt="${imageName}" />
  </div>
  <div class="controls-pane">
    <h1>${imageName}</h1>
    <p class="hint">Click a slot below to select it (highlighted), then click a candidate swatch to fill it — or click 🎨 for a custom color.</p>
    <h2>Extracted candidates</h2>
    <div class="candidates">
      ${candidates.map((c) => swatchButton(c.hex)).join("")}
    </div>
    ${slotGroup({ id: "two", label: "2-color pick", hexes: twoHexes, saveLabel: "Save 2-color pick" })}
    ${slotGroup({ id: "three", label: "3-color pick", hexes: threeHexes, saveLabel: "Save 3-color pick" })}
    ${slotGroup({ id: "five", label: "5-color pick (sleeves)", hexes: fiveHexes, saveLabel: "Save 5-color pick" })}
  </div>

  <script>
    let selected = document.getElementById("two-0");
    selected.classList.add("selected");

    function groupHexes(group) {
      return [...document.querySelectorAll(\`.slot-color[id^="\${group}-"]\`)].map((b) => b.dataset.hex);
    }

    const savedHexes = {};
    ["two", "three", "five"].forEach((group) => {
      savedHexes[group] = groupHexes(group);
    });

    function refreshUnsavedIndicator(group) {
      const dirty = JSON.stringify(groupHexes(group)) !== JSON.stringify(savedHexes[group]);
      document.getElementById(group + "-unsaved").classList.toggle("visible", dirty);
    }

    function setSlotColor(slotButton, hex) {
      slotButton.dataset.hex = hex;
      slotButton.style.background = hex;
      document.getElementById(slotButton.id + "-readout").textContent = hex;
      document.getElementById(slotButton.id + "-native").value = hex;
      refreshUnsavedIndicator(slotButton.id.split("-")[0]);
    }

    function selectSlot(slotButton) {
      selected.classList.remove("selected");
      selected = slotButton;
      selected.classList.add("selected");
    }

    document.querySelectorAll(".slot-color").forEach((btn) => {
      btn.addEventListener("click", () => selectSlot(btn));
    });

    document.querySelectorAll(".swatch").forEach((btn) => {
      btn.addEventListener("click", () => setSlotColor(selected, btn.dataset.hex));
    });

    document.querySelectorAll(".custom-picker-button").forEach((btn) => {
      const targetId = btn.dataset.target;
      const slotButton = document.getElementById(targetId);
      const nativeInput = document.getElementById(targetId + "-native");
      btn.addEventListener("click", () => {
        selectSlot(slotButton);
        nativeInput.click();
      });
      nativeInput.addEventListener("input", () => setSlotColor(slotButton, nativeInput.value));
    });

    document.querySelectorAll(".save-button").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const group = btn.dataset.group;
        const hexes = groupHexes(group);
        const status = document.getElementById(group + "-status");
        status.textContent = "saving…";
        try {
          const res = await fetch("/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ which: group, hexes }),
          });
          if (!res.ok) throw new Error(await res.text());
          savedHexes[group] = hexes;
          refreshUnsavedIndicator(group);
          status.textContent = "saved!";
          setTimeout(() => (status.textContent = ""), 2000);
        } catch (err) {
          status.textContent = "error: " + err.message;
        }
      });
    });
  </script>
</body>
</html>`;
}
