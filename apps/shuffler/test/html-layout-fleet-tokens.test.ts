/**
 * The Shuffler has ONE page shell: formatHtmlHead in
 * src/view/common/html-layout.ts. The EJS pages reach it through
 * views/partials/head.ejs (via app.locals); /game and the error pages call it
 * through formatPageWrapper. Everything here guards the shell's skeleton:
 *
 * It must link the fleet's shared palette (@fleet/design-tokens), because the
 * identity tokens no longer live in this ship's own :root — they MOVED, and are
 * deliberately not mirrored. If the link vanished, CSS would just drop the
 * unresolved var() silently.
 *
 * head.ejs is covered in the browser by verify-fleet-tokens.spec.ts. This is
 * the cheap gate for the /game path, which would otherwise need a whole game
 * set up to reach a page that uses it.
 */

import { formatHtmlHead } from "../src/view/common/html-layout.js";

describe("the one page shell links the fleet palette", () => {
  it("includes the shared token stylesheet", () => {
    expect(formatHtmlHead({ title: "Any Title" })).toContain('href="/fleet/tokens.css"');
  });

  it("loads the shared sheet before the ship's own, so the ship can override", () => {
    const head = formatHtmlHead({ title: "Any Title" });
    expect(head.indexOf("/fleet/tokens.css")).toBeLessThan(head.indexOf("/styles.css"));
  });

  it("loads page stylesheets after both shared sheets, in the order given", () => {
    const head = formatHtmlHead({ title: "Any Title", stylesheets: ["/playmat.css", "/game.css"] });
    expect(head.indexOf("/styles.css")).toBeLessThan(head.indexOf("/playmat.css"));
    expect(head.indexOf("/playmat.css")).toBeLessThan(head.indexOf("/game.css"));
  });

  it("still loads Orbitron", () => {
    expect(formatHtmlHead({ title: "Any Title" })).toContain("family=Orbitron");
  });

  it("fetches additional fonts when asked", () => {
    expect(formatHtmlHead({ title: "Any Title", additionalFonts: ["Ovo"] })).toContain("family=Ovo");
  });

  it("escapes the title (deck names come from Archidekt)", () => {
    const head = formatHtmlHead({ title: 'Sneaky </title> & "Deck"' });
    expect(head).not.toContain("Sneaky </title>");
    expect(head).toContain("Sneaky &lt;/title&gt; &amp; &quot;Deck&quot;");
  });
});
