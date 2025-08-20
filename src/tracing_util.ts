import { Attributes, SpanStatusCode, trace } from "@opentelemetry/api";

/** Common Span Attributes **
 *
 * CommonAttributes field | span attribute name   | description
 * ---------------------- | --------------------- | -----------
 * archidektDeckNumber    | archidekt.deck_number | deck number from Archidekt
 *
 */
const SPAN_ATTRIBUTE_ARCHIDEKT_DECK_NUMBER = "archidekt.deck_number";

export type CommonAttributes = Partial<{
  archidektDeckNumber: string;
}>;

function commonAttributesToSpanAttributes(attributes: CommonAttributes): Attributes {
  // these won't all be populated, and that's fine
  return {
    [SPAN_ATTRIBUTE_ARCHIDEKT_DECK_NUMBER]: attributes.archidektDeckNumber,
  };
}

export function setCommonSpanAttributes(commonAttributes: CommonAttributes): void {
  const span = trace.getActiveSpan();
  span?.setAttributes(commonAttributesToSpanAttributes(commonAttributes));
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
