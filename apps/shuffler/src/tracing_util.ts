import { Attributes, Span, SpanStatusCode, trace } from "@opentelemetry/api";

const SPAN_ATTRIBUTE_ARCHIDEKT_DECK_NUMBER = "deck.archidektId";
const SPAN_ATTRIBUTE_DECK_SOURCE = "deck.source";
const SPAN_ATTRIBUTE_BROWSER_TAB_ID = "game.browser_tab_id";

export type CommonAttributes = Partial<{
  archidektDeckId: string; // TODO: should be sourceUrl from DeckProvenance
  deckSource: string;
  browserTabId: string;
}>;

function commonAttributesToSpanAttributes(attributes: CommonAttributes): Attributes {
  // these won't all be populated, and that's fine
  return {
    [SPAN_ATTRIBUTE_ARCHIDEKT_DECK_NUMBER]: attributes.archidektDeckId,
    [SPAN_ATTRIBUTE_DECK_SOURCE]: attributes.deckSource,
    [SPAN_ATTRIBUTE_BROWSER_TAB_ID]: attributes.browserTabId,
  };
}

export function setCommonSpanAttributes(commonAttributes: CommonAttributes): void {
  const span = trace.getActiveSpan();
  span?.setAttributes(commonAttributesToSpanAttributes(commonAttributes));
}

export function stampRouteParamsOnSpan(span: Span | undefined, params: Record<string, string> | undefined): void {
  if (!span) return;
  for (const [key, value] of Object.entries(params ?? {})) {
    span.setAttribute(`http.route.param.${key}`, String(value));
  }
}

// Should this one accept an exception as well?
export function markCurrentSpanAsError(errorMessage: string, customAttributes?: Attributes): void {
  const span = trace.getActiveSpan();
  span?.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
  span?.setAttribute("error", true);
  if (customAttributes) {
    span?.setAttributes(customAttributes);
  }
}
