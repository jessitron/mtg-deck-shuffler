import { describe, test, expect } from "@jest/globals";
import { readFileSync } from "fs";
import vm from "vm";

/**
 * public/modal-query-params.js is a plain browser <script> (not an ES module,
 * loaded via a bare <script src>), so it can't be `import`ed here. It's
 * evaluated instead with `vm`, in a sandbox that stubs the DOM APIs it
 * touches, and `planAutoOpenActions` is pulled out via top-level `this`
 * (a non-strict script's top-level `this` is the sandbox's global object).
 * This exercises the exact source served to the browser, not a copy.
 *
 * The path is relative to the cwd `npm test` runs from (apps/shuffler/), same
 * as every other relative path in this repo's tooling.
 */
function loadPlanAutoOpenActions(): (search: string, pathname: string) => any[] {
  const source = readFileSync("public/modal-query-params.js", "utf-8");
  const sandbox: any = {
    URLSearchParams,
    document: { addEventListener: () => {} },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${source}\nthis.__planAutoOpenActions = planAutoOpenActions;`, sandbox);
  return sandbox.__planAutoOpenActions;
}

const planAutoOpenActions = loadPlanAutoOpenActions();

describe("modal-query-params.js: planAutoOpenActions", () => {
  test("no query parameters on a page that isn't game or prep: no actions", () => {
    expect(planAutoOpenActions("", "/choose-any-deck")).toEqual([]);
  });

  test("no query parameters on the game page: no actions", () => {
    expect(planAutoOpenActions("", "/game/12")).toEqual([]);
  });

  test("no query parameters on the prep page: no actions", () => {
    expect(planAutoOpenActions("", "/prepare/12")).toEqual([]);
  });

  describe("game page", () => {
    test("?openCard=N opens the card modal, no delay", () => {
      expect(planAutoOpenActions("?openCard=5", "/game/12")).toEqual([
        { type: "ajax", method: "GET", path: "/card-modal/12/5", target: "#card-modal-container", delay: 0, withExpectedVersion: true },
      ]);
    });

    test("?openLibrary=true clicks the search button", () => {
      expect(planAutoOpenActions("?openLibrary=true", "/game/12")).toEqual([
        { type: "click", selector: ".search-button" },
      ]);
    });

    test("?openLibrary=true&groupBy=type requests the grouped library modal directly", () => {
      expect(planAutoOpenActions("?openLibrary=true&groupBy=type", "/game/12")).toEqual([
        { type: "ajax", method: "GET", path: "/library-modal/12?groupBy=type", target: "#modal-container", withExpectedVersion: true },
      ]);
    });

    test("?openTable=true clicks the table-cards button", () => {
      expect(planAutoOpenActions("?openTable=true", "/game/12")).toEqual([
        { type: "click", selector: ".table-cards-button" },
      ]);
    });

    test("?openHistory=true clicks the history button", () => {
      expect(planAutoOpenActions("?openHistory=true", "/game/12")).toEqual([
        { type: "click", selector: ".history-button" },
      ]);
    });

    test("?openDebug=true clicks the debug button", () => {
      expect(planAutoOpenActions("?openDebug=true", "/game/12")).toEqual([
        { type: "click", selector: ".debug-button" },
      ]);
    });

    test("?openLibrary=true&openCard=N: library click, then a delayed card-modal request (card overlays)", () => {
      expect(planAutoOpenActions("?openLibrary=true&openCard=5", "/game/12")).toEqual([
        { type: "click", selector: ".search-button" },
        { type: "ajax", method: "GET", path: "/card-modal/12/5", target: "#card-modal-container", delay: 300, withExpectedVersion: true },
      ]);
    });

    test("?openTable=true&openCard=N: table click, then a delayed card-modal request (card overlays)", () => {
      expect(planAutoOpenActions("?openTable=true&openCard=0", "/game/12")).toEqual([
        { type: "click", selector: ".table-cards-button" },
        { type: "ajax", method: "GET", path: "/card-modal/12/0", target: "#card-modal-container", delay: 300, withExpectedVersion: true },
      ]);
    });

    test("?openHistory=true&openCard=N: no delay — history isn't a modal the card needs to overlay onto in sequence", () => {
      expect(planAutoOpenActions("?openHistory=true&openCard=0", "/game/12")).toEqual([
        { type: "click", selector: ".history-button" },
        { type: "ajax", method: "GET", path: "/card-modal/12/0", target: "#card-modal-container", delay: 0, withExpectedVersion: true },
      ]);
    });
  });

  describe("prep page", () => {
    test("?openCard=N opens the card modal, no delay, no expected-version", () => {
      expect(planAutoOpenActions("?openCard=10", "/prepare/38")).toEqual([
        { type: "ajax", method: "GET", path: "/prep-card-modal/38/10", target: "#card-modal-container", delay: 0 },
      ]);
    });

    test("?openLibrary=true clicks the search button", () => {
      expect(planAutoOpenActions("?openLibrary=true", "/prepare/38")).toEqual([
        { type: "click", selector: ".search-button" },
      ]);
    });

    test("?openLibrary=true&groupBy=type requests the grouped prep-library modal directly", () => {
      expect(planAutoOpenActions("?openLibrary=true&groupBy=type", "/prepare/38")).toEqual([
        { type: "ajax", method: "GET", path: "/prep-library-modal/38?groupBy=type", target: "#modal-container" },
      ]);
    });

    test("?openLibrary=true&openCard=N: library click, then a delayed card-modal request (card overlays)", () => {
      expect(planAutoOpenActions("?openLibrary=true&openCard=10", "/prepare/38")).toEqual([
        { type: "click", selector: ".search-button" },
        { type: "ajax", method: "GET", path: "/prep-card-modal/38/10", target: "#card-modal-container", delay: 300 },
      ]);
    });
  });
});
