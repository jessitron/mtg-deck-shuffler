import { describe, expect, it } from "vitest";
import { chooseLicenseKey } from "../src/client/chooseLicenseKey";

describe("chooseLicenseKey", () => {
  const key = "tldraw-key-for-table.jessitron.honeydemo.io";

  it("hands the key to an https non-loopback origin (the gate fires there)", () => {
    expect(chooseLicenseKey("https:", "table.jessitron.honeydemo.io", key)).toBe(key);
  });

  it("withholds the key on http non-loopback — prod is http now, exempt from the gate", () => {
    expect(chooseLicenseKey("http:", "table.jessitron.honeydemo.io", key)).toBe("");
  });

  it("withholds the key on loopback hosts, whatever the protocol", () => {
    expect(chooseLicenseKey("http:", "localhost", key)).toBe("");
    expect(chooseLicenseKey("https:", "localhost", key)).toBe("");
    expect(chooseLicenseKey("http:", "127.0.0.1", key)).toBe("");
    expect(chooseLicenseKey("http:", "[::1]", key)).toBe("");
  });

  it("passes undefined through where the gate fires (tldraw's own no-key path)", () => {
    expect(chooseLicenseKey("https:", "table.jessitron.honeydemo.io", undefined)).toBeUndefined();
  });

  it("withholds as empty string, not undefined, where the gate cannot fire", () => {
    expect(chooseLicenseKey("http:", "localhost", undefined)).toBe("");
  });
});
