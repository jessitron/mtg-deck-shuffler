/**
 * The Shuffler has TWO heads, and they are separate code:
 *   - views/partials/head.ejs        → the site and pre-game pages
 *   - src/view/common/html-layout.ts → the play pages (/game) and error pages
 *
 * Both must link the fleet's shared palette (@fleet/design-tokens), because the
 * identity tokens no longer live in this ship's own :root — they MOVED, and are
 * deliberately not mirrored. Wiring one head and forgetting the other is the
 * obvious miss, and it fails silently: CSS just drops the unresolved var().
 *
 * head.ejs is covered in the browser by verify-fleet-tokens.spec.ts. This is the
 * cheap gate for the other head, which would otherwise need a whole game set up
 * to reach a page that uses it.
 */

import { formatHtmlHead } from "../src/view/common/html-layout.js";

describe("the play pages' head links the fleet palette", () => {
  it("includes the shared token stylesheet", () => {
    expect(formatHtmlHead("Any Title")).toContain('href="/fleet/tokens.css"');
  });

  it("loads the shared sheet before the ship's own, so the ship can override", () => {
    const head = formatHtmlHead("Any Title");
    expect(head.indexOf("/fleet/tokens.css")).toBeLessThan(head.indexOf("/styles.css"));
  });

  it("still loads Orbitron", () => {
    expect(formatHtmlHead("Any Title")).toContain("family=Orbitron");
  });
});
