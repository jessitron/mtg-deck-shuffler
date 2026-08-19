import { trace } from "@opentelemetry/api";
import { setCommonSpanAttributes } from "../src/tracing_util.js";

describe("setCommonSpanAttributes", () => {
  function captureAttributes(fn: () => void): Record<string, unknown> {
    const setAttributes = jest.fn();
    jest.spyOn(trace, "getActiveSpan").mockReturnValue({ setAttributes } as unknown as ReturnType<typeof trace.getActiveSpan>);
    fn();
    return setAttributes.mock.calls[0][0];
  }

  afterEach(() => jest.restoreAllMocks());

  it("lowercases table.name so the same table doesn't fragment by casing", () => {
    const attrs = captureAttributes(() => setCommonSpanAttributes({ tableName: "Kitchen Table" }));
    expect(attrs["table.name"]).toBe("kitchen table");
  });

  it("does not alter player.name casing", () => {
    const attrs = captureAttributes(() => setCommonSpanAttributes({ tableName: "muegge", playerName: "Jess" }));
    expect(attrs["player.name"]).toBe("Jess");
  });

  it("leaves table.name undefined when not supplied", () => {
    const attrs = captureAttributes(() => setCommonSpanAttributes({ playerName: "Jess" }));
    expect(attrs["table.name"]).toBeUndefined();
  });
});
