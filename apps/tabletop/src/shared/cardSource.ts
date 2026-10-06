/** Where a card definition comes from. Absent on the wire means "scryfall". */
export type CardSource = "scryfall" | "archidekt-custom";

export function cardSourceOf(card: { cardSource?: CardSource | null }): CardSource {
  return card.cardSource ?? "scryfall";
}

/** The card-identity span attributes every span naming a card definition carries. */
export function cardSpanAttributes(card: { cardDefinitionId?: string | null; cardSource?: CardSource | null }): {
  "card.definition_id": string;
  "card.source": CardSource;
} {
  return {
    "card.definition_id": card.cardDefinitionId ?? "",
    "card.source": cardSourceOf(card),
  };
}
