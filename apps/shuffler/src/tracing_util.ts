import { Attributes, Span, SpanStatusCode, trace } from "@opentelemetry/api";

const SPAN_ATTRIBUTE_ARCHIDEKT_DECK_NUMBER = "deck.archidektId";
const SPAN_ATTRIBUTE_DECK_SOURCE = "deck.source";
const SPAN_ATTRIBUTE_BROWSER_TAB_ID = "game.browser_tab_id";
const SPAN_ATTRIBUTE_DEV_MODE = "app.dev_mode";
const SPAN_ATTRIBUTE_TABLE_NAME = "table.name";
const SPAN_ATTRIBUTE_PLAYER_NAME = "player.name";

export type CommonAttributes = Partial<{
  archidektDeckId: string; // TODO: should be sourceUrl from DeckProvenance
  deckSource: string;
  browserTabId: string;
  devMode: boolean;
  tableName: string;
  playerName: string;
}>;

function commonAttributesToSpanAttributes(attributes: CommonAttributes): Attributes {
  // these won't all be populated, and that's fine (undefined values are ignored;
  // a real `false` for devMode still gets stamped, so dev_mode=false is filterable.
  // tableName/playerName are absent for solo games, so they simply don't get stamped)
  return {
    [SPAN_ATTRIBUTE_ARCHIDEKT_DECK_NUMBER]: attributes.archidektDeckId,
    [SPAN_ATTRIBUTE_DECK_SOURCE]: attributes.deckSource,
    [SPAN_ATTRIBUTE_BROWSER_TAB_ID]: attributes.browserTabId,
    [SPAN_ATTRIBUTE_DEV_MODE]: attributes.devMode,
    [SPAN_ATTRIBUTE_TABLE_NAME]: attributes.tableName,
    [SPAN_ATTRIBUTE_PLAYER_NAME]: attributes.playerName,
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
