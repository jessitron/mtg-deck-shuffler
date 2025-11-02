import { formatPageWrapper } from "../common/html-layout.js";

export function formatHomeV2HtmlPage(): string {
  const content = `
  <div id="home-v2-content" class="page-with-title-container">
    <h1>Welcome to MTG Deck Shuffler</h1>
    <p>This is the new homepage design - coming soon!</p>
  </div>`;

  return formatPageWrapper("MTG Deck Shuffler - Home v2", content, "", ["/home-v2.css"]);
}
