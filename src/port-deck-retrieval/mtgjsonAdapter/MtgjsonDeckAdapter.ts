import { CardDefinition, CardFace, Deck, PERSISTED_DECK_VERSION } from "../../types.js";
import { MtgjsonCard, MtgjsonDeck } from "./mtgjsonTypes.js";

export class MtgjsonDeckAdapter {
  /**
   * Converts a MTGJSON preconstructed deck format to our internal Deck format
   *
   * ⚠️ IMPORTANT: If you change the conversion logic in this adapter (especially in convertMtgjsonToCard),
   * you MUST regenerate all precon files by running:
   *   npm run precons:fetch-mtgjson -- --convert
   *
   * The precon JSON files in decks/ are generated once and read directly by LocalFileAdapter,
   * so they won't pick up changes to this adapter until regenerated.
   */
  convertMtgjsonToDeck(mtgjsonDeck: MtgjsonDeck, sourceFilePath: string, cardDatabase?: Map<string, MtgjsonCard>): Deck {
    const data = mtgjsonDeck.data;

    // Build UUID map from deck cards + optional external database for back-face lookup
    const cardsByUuid = new Map<string, MtgjsonCard>();
    if (cardDatabase) {
      for (const [uuid, card] of cardDatabase) {
        cardsByUuid.set(uuid, card);
      }
    }
    // Deck cards override external database (they're more specific to this printing)
    const allCards = [...data.commander, ...data.mainBoard, ...(data.sideBoard || [])];
    for (const card of allCards) {
      cardsByUuid.set(card.uuid, card);
    }

    // Convert commanders (skip side "b" entries)
    const commanders: CardDefinition[] = data.commander
      .filter(card => card.side !== "b")
      .map(card => this.convertMtgjsonToCard(card, cardsByUuid));

    // Convert mainboard cards (respecting count for each card, skip side "b")
    const mainboardCards: CardDefinition[] = [];
    for (const card of data.mainBoard) {
      if (card.side === "b") continue;
      const cardDef = this.convertMtgjsonToCard(card, cardsByUuid);
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

  private convertMtgjsonToCard(mtgjsonCard: MtgjsonCard, cardsByUuid: Map<string, MtgjsonCard>): CardDefinition {
    // Determine if card is two-faced based on layout
    const twoFacedLayouts = ["transform", "modal_dfc", "reversible_card", "double_faced_token"];
    const twoFaced = twoFacedLayouts.includes(mtgjsonCard.layout);

    // Look up back face via otherFaceIds
    let backFace: CardFace | undefined;
    if (twoFaced && mtgjsonCard.otherFaceIds?.length) {
      const backFaceCard = mtgjsonCard.otherFaceIds
        .map(id => cardsByUuid.get(id))
        .find(c => c && c.side === "b");
      if (backFaceCard) {
        backFace = {
          name: backFaceCard.faceName || backFaceCard.name,
          types: backFaceCard.types || [],
          manaCost: backFaceCard.manaCost,
          cmc: backFaceCard.manaValue ?? 0,
          oracleText: backFaceCard.text,
        };
      } else {
        throw new Error(
          `Two-faced card "${mtgjsonCard.name}" (uuid: ${mtgjsonCard.uuid}) has otherFaceIds ${JSON.stringify(mtgjsonCard.otherFaceIds)} but back face not found. Provide a cardDatabase with the missing UUIDs.`
        );
      }
    }

    const cardDefinition: CardDefinition = {
      name: mtgjsonCard.name,
      scryfallId: mtgjsonCard.identifiers.scryfallId || "",
      multiverseid: mtgjsonCard.identifiers.multiverseId
        ? parseInt(mtgjsonCard.identifiers.multiverseId, 10)
        : undefined,
      twoFaced,
      oracleCardName: mtgjsonCard.name,
      colorIdentity: mtgjsonCard.colorIdentity || [],
      set: mtgjsonCard.setCode,
      types: mtgjsonCard.types || [],
      manaCost: mtgjsonCard.manaCost,
      cmc: mtgjsonCard.manaValue ?? 0,
      oracleText: mtgjsonCard.text,
      backFace,
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
