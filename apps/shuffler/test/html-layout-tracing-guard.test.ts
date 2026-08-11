
import { HONEYCOMB_TRACING_INIT_SCRIPT } from "../src/view/common/html-layout.js";

function runGuard(apiKey: string) {
  const initializeTracing = jest.fn();
  const warn = jest.fn();
  const sandbox = {
    window: { Hny: { initializeTracing }, browserTabId: "tab-123" },
    console: { warn },
  };

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
