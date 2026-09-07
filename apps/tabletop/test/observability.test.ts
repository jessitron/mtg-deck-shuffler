import { describe, expect, it } from "vitest";
import { buildExportDestinationIgnoreUrls } from "../src/client/observability";

describe("buildExportDestinationIgnoreUrls", () => {
  const origin = "http://table.jessitron.honeydemo.io/t/some-table";

  it("matches a same-origin relative collector path resolved against the page origin", () => {
    const [pattern] = buildExportDestinationIgnoreUrls({ tracesUrl: "/v1/traces" }, origin);
    expect(pattern.test("http://table.jessitron.honeydemo.io/v1/traces")).toBe(true);
    // must not match some unrelated same-origin API path
    expect(pattern.test("http://table.jessitron.honeydemo.io/api/tables/some-table/diagnostic")).toBe(false);
  });

  it("matches an absolute cross-origin destination (the ALLOW_BROWSER_DIRECT_HONEYCOMB fallback)", () => {
    const [pattern] = buildExportDestinationIgnoreUrls({ tracesUrl: "https://api.honeycomb.io/v1/traces" }, origin);
    expect(pattern.test("https://api.honeycomb.io/v1/traces")).toBe(true);
    // a different absolute host must not match
    expect(pattern.test("https://not-honeycomb.example/v1/traces")).toBe(false);
  });

  it("covers both traces and logs destinations when both are configured", () => {
    const patterns = buildExportDestinationIgnoreUrls(
      { tracesUrl: "/v1/traces", logsUrl: "/v1/logs" },
      origin
    );
    expect(patterns).toHaveLength(2);
    expect(patterns.some((p) => p.test("http://table.jessitron.honeydemo.io/v1/traces"))).toBe(true);
    expect(patterns.some((p) => p.test("http://table.jessitron.honeydemo.io/v1/logs"))).toBe(true);
  });

  it("omits a destination that isn't configured", () => {
    const patterns = buildExportDestinationIgnoreUrls({ tracesUrl: "/v1/traces", logsUrl: null }, origin);
    expect(patterns).toHaveLength(1);
  });
});
