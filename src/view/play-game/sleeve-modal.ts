import { formatModalHtmlFragment } from "./game-modals.js";
import { SLEEVE_COLOR_OPTIONS } from "../../types/SleeveConfig.js";
import { PersistedGamePrep } from "../../port-persist-prep/types.js";
import { CARD_BACK } from "../common/shared-components.js";

export function formatSleeveCustomizationModalHtml(prep: PersistedGamePrep): string {
  const currentColor = prep.sleeveConfig?.type === "solid-color" ? prep.sleeveConfig.color : null;

  const colorOptions = SLEEVE_COLOR_OPTIONS.map((option) => {
    const isSelected = currentColor === option.value;
    return `
      <button class="sleeve-color-option ${isSelected ? "selected" : ""}"
              data-color="${option.value}"
              hx-post="/update-sleeve-config/${prep.prepId}"
              hx-vals='{"type": "solid-color", "color": "${option.value}", "expected-version": ${prep.version}}'
              hx-target="#library-section"
              hx-swap="outerHTML"
              style="background-color: ${option.value};">
        <span class="color-option-name">${option.name}</span>
        ${isSelected ? '<span class="checkmark">✓</span>' : ""}
      </button>
    `;
  }).join("");

  const defaultButton = `
    <button class="sleeve-color-option default-option ${!currentColor ? "selected" : ""}"
            hx-post="/update-sleeve-config/${prep.prepId}"
            hx-vals='{"type": "default", "expected-version": ${prep.version}}'
            hx-target="#library-section"
            hx-swap="outerHTML">
      <img src="${CARD_BACK}" alt="Default" class="default-sleeve-preview"/>
      <span class="color-option-name">Default</span>
      ${!currentColor ? '<span class="checkmark">✓</span>' : ""}
    </button>
  `;

  const bodyContent = `
    <div class="sleeve-customization-container">
      <p class="modal-subtitle">Choose your card sleeve appearance:</p>
      <div class="sleeve-color-grid">
        ${defaultButton}
        ${colorOptions}
      </div>
    </div>
  `;

  return formatModalHtmlFragment("Customize Card Sleeves", bodyContent);
}
