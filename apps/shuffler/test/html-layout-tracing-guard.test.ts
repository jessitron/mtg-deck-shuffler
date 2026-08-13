
import { HONEYCOMB_TRACING_INIT_SCRIPT } from "../src/view/common/html-layout.js";

function runGuard(apiKey: string, devMode = false, tableName?: string, playerName?: string) {
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
  initHoneycombTracing(apiKey, devMode, tableName, playerName);

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

  it("forwards dev mode as the boolean resource attribute app.dev_mode", () => {
    const { initializeTracing } = runGuard("hcaik_real_key", true);
    expect(initializeTracing.mock.calls[0][0].resourceAttributes["app.dev_mode"]).toBe(true);

    const off = runGuard("hcaik_real_key", false);
    expect(off.initializeTracing.mock.calls[0][0].resourceAttributes["app.dev_mode"]).toBe(false);
  });

  it("stamps table.name and player.name as string resource attributes when supplied", () => {
    const { initializeTracing } = runGuard("hcaik_real_key", false, "Kitchen Table", "Jess");
    const attrs = initializeTracing.mock.calls[0][0].resourceAttributes;
    expect(attrs["table.name"]).toBe("Kitchen Table");
    expect(attrs["player.name"]).toBe("Jess");
  });

  it("omits table.name and player.name for solo games (no table info)", () => {
    const { initializeTracing } = runGuard("hcaik_real_key", false, undefined, undefined);
    const attrs = initializeTracing.mock.calls[0][0].resourceAttributes;
    expect("table.name" in attrs).toBe(false);
    expect("player.name" in attrs).toBe(false);
  });
});
