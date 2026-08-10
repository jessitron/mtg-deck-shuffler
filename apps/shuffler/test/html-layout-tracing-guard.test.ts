/**
 * The one page shell (formatHtmlHead in src/view/common/html-layout.ts)
 * inlines a <script> that guards Hny.initializeTracing on
 * `window.Hny && window.browserTabId`. That guard didn't cover the apiKey
 * value: when neither HONEYCOMB_INGEST_API_KEY nor HONEYCOMB_API_KEY is set
 * server-side, string interpolation bakes the literal 4-character string
 * "undefined" into the key, the guard passes anyway, and OTLP export 401s
 * silently (browser-tracing-key-guard).
 *
 * HONEYCOMB_TRACING_INIT_SCRIPT is the exact literal source shipped inside
 * that <script> tag. This test evals that same string (not a
 * reimplementation of it) with a mocked window/Hny/console, so it exercises
 * real browser behavior.
 */

import { HONEYCOMB_TRACING_INIT_SCRIPT } from "../src/view/common/html-layout.js";

function runGuard(apiKey: string) {
  const initializeTracing = jest.fn();
  const warn = jest.fn();
  const sandbox = {
    window: { Hny: { initializeTracing }, browserTabId: "tab-123" },
    console: { warn },
  };

  // Evaluate the exact source string the browser receives, in a scope where
  // `window`/`console` resolve to our mocks and `Hny` resolves via `window.Hny`
  // (the inline script relies on `Hny` being a bare global set by hny.js).
  const fn = new Function(
    "window",
    "console",
    `${HONEYCOMB_TRACING_INIT_SCRIPT}\nconst Hny = window.Hny;\nreturn initHoneycombTracing;`
  );
  const initHoneycombTracing = fn(sandbox.window, sandbox.console);
  initHoneycombTracing(apiKey);

  return { initializeTracing, warn };
}

describe("browser Honeycomb tracing init guard", () => {
  it("skips init and warns when the apiKey is empty", () => {
    const { initializeTracing, warn } = runGuard("");
    expect(initializeTracing).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/honeycomb/i);
  });

  it('skips init and warns when the apiKey is the literal string "undefined"', () => {
    const { initializeTracing, warn } = runGuard("undefined");
    expect(initializeTracing).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("initializes tracing with a real apiKey and does not warn", () => {
    const { initializeTracing, warn } = runGuard("hcaik_real_key");
    expect(initializeTracing).toHaveBeenCalledTimes(1);
    expect(initializeTracing.mock.calls[0][0]).toMatchObject({ apiKey: "hcaik_real_key" });
    expect(warn).not.toHaveBeenCalled();
  });
});
