import { RetrieveDeckPort, DeckRetrievalRequest, isArchidektDeckRetrievalRequest } from "../types.js";
import { ArchidektGatewayInterface } from "./ArchidektGatewayInterface.js";
import { Deck, CardDefinition, PERSISTED_DECK_VERSION } from "../../types.js";
import { ArchidektCard, ArchidektDeck } from "./archidektTypes.js";

export class ArchidektDeckToDeckAdapter implements RetrieveDeckPort {
  constructor(private gateway: ArchidektGatewayInterface, private retrievedDate?: Date) {}

  listAvailableDecks() {
    return [];
  }
  canHandle(request: DeckRetrievalRequest): boolean {
    return isArchidektDeckRetrievalRequest(request);
  }

  async retrieveDeck(request: DeckRetrievalRequest): Promise<Deck> {
    if (!isArchidektDeckRetrievalRequest(request)) {
      throw new Error("Cannot handle this request type");
    }

    // TypeScript now knows request is ArchidektDeckRetrievalRequest
    const archidektDeck = await this.gateway.fetchDeck(request.archidektDeckId);
    return this.convertArchidektToDeck(archidektDeck, request.archidektDeckId);
  }

  private convertArchidektToDeck(archidektDeck: ArchidektDeck, archidektDeckId: string): Deck {
    const categoryInclusionMap = new Map((archidektDeck.categories || []).map((cat) => [cat.name, cat.includedInDeck]));

    const isCardIncluded = (card: ArchidektCard) => {
      const primaryCategory = (card.categories || [])[0];

      if (primaryCategory === "Sideboard") {
        return false;
      }

      return categoryInclusionMap.get(primaryCategory) ?? true;
    };

    const includedCards: CardDefinition[] = [];
    for (const archidektCard of archidektDeck.cards) {
      if (isCardIncluded(archidektCard) && !(archidektCard.categories || []).includes("Commander")) {
        const card = this.convertArchidektToCard(archidektCard);
        if (card) {
          for (let i = 0; i < archidektCard.quantity; i++) {
            includedCards.push(card);
          }
        }
      }
    }

    const commanderCards = archidektDeck.cards
      .filter((card) => (card.categories || []).includes("Commander"))
      .map((card) => this.convertArchidektToCard(card))
      .filter((card): card is CardDefinition => card !== undefined);

    const now = this.retrievedDate ?? new Date();
    return {
      version: PERSISTED_DECK_VERSION,
      id: archidektDeck.id,
      name: archidektDeck.name,
      totalCards: includedCards.length + commanderCards.length,
      commanders: commanderCards,
      cards: includedCards,
      provenance: {
        retrievedDate: now,
        sourceUrl: `https://archidekt.com/decks/${archidektDeckId}`,
        deckSource: "archidekt",
        createdAt: new Date(archidektDeck.createdAt),
      },
    };
  }

  private convertArchidektToCard(archidektCard: ArchidektCard): CardDefinition | undefined {
    /* A few cards, such as "Miku, the Renowned" have a display name that's different from the oracle name.
     * The Oracle Card is the canonical card, like you can't have two of the same in a Commander deck,
     * while certain fancy cards get a vanity name. On the printed card, the Oracle Name shows up as a subtitle */
    const cardName = archidektCard.card.displayName || archidektCard.card.oracleCard.name;
    const oracleCardName = archidektCard.card.oracleCard.name;
    const twoFaced = (archidektCard.card.oracleCard.faces || []).length === 2;

    const cardDefinition: CardDefinition = {
      name: cardName,
      scryfallId: archidektCard.card.uid,
      multiverseid: archidektCard.card.multiverseid,
      twoFaced,
      colorIdentity: archidektCard.card.oracleCard.colorIdentity,
      set: archidektCard.card.edition.editionname
    };

    if (cardName !== oracleCardName) {
      cardDefinition.oracleCardName = oracleCardName;
    }

    return cardDefinition;
  }
}
