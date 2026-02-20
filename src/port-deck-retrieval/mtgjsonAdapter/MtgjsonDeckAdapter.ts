import { CardDefinition, Deck, PERSISTED_DECK_VERSION } from "../../types.js";
import { MtgjsonCard, MtgjsonDeck } from "./mtgjsonTypes.js";

export class MtgjsonDeckAdapter {
  /**
   * Converts a MTGJSON preconstructed deck format to our internal Deck format
   */
  convertMtgjsonToDeck(mtgjsonDeck: MtgjsonDeck, sourceFilePath: string): Deck {
    const data = mtgjsonDeck.data;

    // Convert commanders
    const commanders: CardDefinition[] = data.commander.map(card =>
      this.convertMtgjsonToCard(card)
    );

    // Convert mainboard cards (respecting count for each card)
    const mainboardCards: CardDefinition[] = [];
    for (const card of data.mainBoard) {
      const cardDef = this.convertMtgjsonToCard(card);
      for (let i = 0; i < card.count; i++) {
        mainboardCards.push(cardDef);
      }
    }

    // Generate a numeric ID from deck name (simple hash)
    const deckId = this.generateDeckId(data.name);

    return {
      version: PERSISTED_DECK_VERSION,
      id: deckId,
      name: data.name,
      totalCards: commanders.length + mainboardCards.length,
      commanders,
      cards: mainboardCards,
      provenance: {
        retrievedDate: new Date(),
        sourceUrl: sourceFilePath,
        deckSource: "precon",
        createdAt: data.releaseDate ? new Date(data.releaseDate) : undefined,
      },
    };
  }

  private convertMtgjsonToCard(mtgjsonCard: MtgjsonCard): CardDefinition {
    // Determine if card is two-faced based on layout
    const twoFacedLayouts = ["transform", "modal_dfc", "reversible_card", "double_faced_token"];
    const twoFaced = twoFacedLayouts.includes(mtgjsonCard.layout);

    const cardDefinition: CardDefinition = {
      name: mtgjsonCard.name,
      scryfallId: mtgjsonCard.identifiers.scryfallId || "",
      multiverseid: mtgjsonCard.identifiers.multiverseId
        ? parseInt(mtgjsonCard.identifiers.multiverseId, 10)
        : 0,
      twoFaced,
      oracleCardName: mtgjsonCard.name,
      colorIdentity: mtgjsonCard.colorIdentity || [],
      set: mtgjsonCard.setCode,
      types: mtgjsonCard.types || [],
      manaCost: mtgjsonCard.manaCost,
      cmc: mtgjsonCard.manaValue ?? 0,
      oracleText: mtgjsonCard.text,
    };

    return cardDefinition;
  }

  /**
   * Generate a numeric ID from deck name using a simple hash function
   */
  private generateDeckId(deckName: string): number {
    let hash = 0;
    for (let i = 0; i < deckName.length; i++) {
      const char = deckName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Ensure positive integer
    return Math.abs(hash);
  }
}
