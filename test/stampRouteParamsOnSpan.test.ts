import { describe, test, expect } from "@jest/globals";
import { Span } from "@opentelemetry/api";
import { stampRouteParamsOnSpan } from "../src/tracing_util.js";

// A minimal fake Span that records setAttribute calls. We only implement the
// surface stampRouteParamsOnSpan touches.
function fakeSpan(): { span: Span; attributes: Record<string, unknown> } {
  const attributes: Record<string, unknown> = {};
  const span = {
    setAttribute(key: string, value: unknown) {
      attributes[key] = value;
      return this;
    },
  } as unknown as Span;
  return { span, attributes };
}

describe("stampRouteParamsOnSpan", () => {
  test("does not throw when params is undefined (the /end-game 404 crash)", () => {
    const { span } = fakeSpan();
    expect(() => stampRouteParamsOnSpan(span, undefined)).not.toThrow();
  });

  test("does nothing when there is no active span", () => {
    expect(() => stampRouteParamsOnSpan(undefined, { gameId: "7" })).not.toThrow();
  });

  test("stamps each param onto the span as http.route.param.<key>", () => {
    const { span, attributes } = fakeSpan();
    stampRouteParamsOnSpan(span, { gameId: "42", cardIndex: "3" });
    expect(attributes).toEqual({
      "http.route.param.gameId": "42",
      "http.route.param.cardIndex": "3",
    });
  });
});
