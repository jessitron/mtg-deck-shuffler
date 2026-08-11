function swatchButton(hex) {
  return `<button type="button" class="swatch" style="background:${hex}" data-hex="${hex}" title="${hex}"></button>`;
}

function slotGroup({ id, label, hexes, saveLabel }) {
  const inputs = hexes
    .map(
      (hex, i) => `
      <label class="slot">
        <input type="color" id="${id}-${i}" value="${hex}" />
        <span class="hex-readout" id="${id}-${i}-readout">${hex}</span>
      </label>`
    )
    .join("");

  return `
    <section class="slot-group">
      <h2>${label}</h2>
      <div class="slots">${inputs}</div>
      <button type="button" class="save-button" data-group="${id}">${saveLabel}</button>
      <span class="status" id="${id}-status"></span>
    </section>`;
}

export function renderPage({ imageName, candidates, suggestedTwo, suggestedThree, chosenTwo, chosenThree }) {
  const twoHexes = chosenTwo && chosenTwo.length === 2 ? chosenTwo : suggestedTwo;
  const threeHexes = chosenThree && chosenThree.length === 3 ? chosenThree : suggestedThree;

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
  .slots { display: flex; gap: 1rem; margin-bottom: 0.75rem; }
  .slot { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; font-size: 0.8rem; }
  .slot input[type="color"] { width: 48px; height: 48px; border: none; border-radius: 6px; cursor: pointer; background: none; }
  .save-button { background: #4a7c59; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
  .save-button:hover { background: #5a9c69; }
  .status { margin-left: 0.75rem; font-size: 0.85rem; color: #8f8; }
  .hint { color: #999; font-size: 0.85rem; }
</style>
</head>
<body>
  <div class="image-pane">
    <img src="/image" alt="${imageName}" />
  </div>
  <div class="controls-pane">
    <h1>${imageName}</h1>
    <p class="hint">Click a swatch below to fill the last-focused color slot, or use the native picker on any slot directly.</p>
    <h2>Extracted candidates</h2>
    <div class="candidates">
      ${candidates.map((c) => swatchButton(c.hex)).join("")}
    </div>
    ${slotGroup({ id: "two", label: "2-color pick", hexes: twoHexes, saveLabel: "Save 2-color pick" })}
    ${slotGroup({ id: "three", label: "3-color pick", hexes: threeHexes, saveLabel: "Save 3-color pick" })}
  </div>

  <script>
    let lastFocused = document.getElementById("two-0");

    document.querySelectorAll('input[type="color"]').forEach((input) => {
      input.addEventListener("focus", () => { lastFocused = input; });
      input.addEventListener("input", () => {
        document.getElementById(input.id + "-readout").textContent = input.value;
      });
    });

    document.querySelectorAll(".swatch").forEach((btn) => {
      btn.addEventListener("click", () => {
        lastFocused.value = btn.dataset.hex;
        document.getElementById(lastFocused.id + "-readout").textContent = btn.dataset.hex;
      });
    });

    document.querySelectorAll(".save-button").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const group = btn.dataset.group;
        const inputs = [...document.querySelectorAll(\`input[id^="\${group}-"]\`)];
        const hexes = inputs.map((i) => i.value);
        const status = document.getElementById(group + "-status");
        status.textContent = "saving…";
        try {
          const res = await fetch("/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ which: group, hexes }),
          });
          if (!res.ok) throw new Error(await res.text());
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
