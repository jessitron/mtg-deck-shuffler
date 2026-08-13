
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

  it("passes dev mode to the browser tracing init as an unquoted boolean", () => {
    expect(formatHtmlHead({ title: "Any Title", devMode: true })).toMatch(/initHoneycombTracing\(".*", true\)/);
    expect(formatHtmlHead({ title: "Any Title", devMode: false })).toMatch(/initHoneycombTracing\(".*", false\)/);
    // defaults to false when not supplied
    expect(formatHtmlHead({ title: "Any Title" })).toMatch(/initHoneycombTracing\(".*", false\)/);
  });
});
