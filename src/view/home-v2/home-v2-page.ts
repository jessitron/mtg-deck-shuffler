import { formatPageWrapper } from "../common/html-layout.js";

export function formatHomeV2HtmlPage(): string {
  const content = `
  <div id="home-v2-content" class="home-container">
    <div class="hero">
      <div class="hero-title"><h1>MTG<br>Deck<br>Shuffler</h1></div>
      <div class="hero-playmat-container">
        <div class="hero-playmat"></div>
      </div>
    </div>
    <div class="deck-selection">
      <h2>Choose a Deck</h2>
      <p>Select a preconstructed deck or enter an Archidekt deck number</p>
    </div>
    <div class="how-to">
      <h2>How to Play</h2>
      <p>Play Magic, The Gathering remotely with friends -- using any deck!</p>
    </div>
  </div>`;

  return formatPageWrapper("MTG Deck Shuffler - Home v2", content, "", ["/home-v2.css"], false);
}
