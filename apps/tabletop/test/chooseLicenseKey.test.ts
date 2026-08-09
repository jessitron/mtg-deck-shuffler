import { describe, expect, it } from "vitest";
import { chooseLicenseKey } from "../src/client/chooseLicenseKey";

// tldraw's license gate only fires on HTTPS non-loopback origins. Everywhere
// else, handing tldraw a key is at best pointless and at worst blanks the
// canvas (a parseable-but-expired key trips the gate regardless of origin).
// So: pass the baked key ONLY where the gate can fire; withhold it — as empty
// string, never undefined — everywhere else.
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
    // undefined would let LicenseProvider read the baked key back out of the
    // env that vite's `define` rewrote inside tldraw's own bundle.
    expect(chooseLicenseKey("http:", "localhost", undefined)).toBe("");
  });
});
