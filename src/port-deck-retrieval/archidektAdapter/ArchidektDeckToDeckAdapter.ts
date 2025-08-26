import { RetrieveDeckPort, DeckRetrievalRequest, isArchidektDeckRetrievalRequest, SearchUrl } from "../types.js";
import { ArchidektGateway } from "./ArchidektGateway.js";
import { Deck, Card } from "../../types.js";
import { ArchidektCard, ArchidektDeck } from "./archidektTypes.js";

export class ArchidektDeckToDeckAdapter implements RetrieveDeckPort {
  constructor(private gateway: ArchidektGateway) {}

  listAvailableDecks(): SearchUrl[] {
    return [{ description: "Search Decks", url: "https://archidekt.com/" }];
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
    const categoryInclusionMap = new Map(archidektDeck.categories.map((cat) => [cat.name, cat.includedInDeck]));

    const isCardIncluded = (card: ArchidektCard) => {
      const primaryCategory = card.categories[0];

      if (primaryCategory === "Sideboard") {
        return false;
      }

      return categoryInclusionMap.get(primaryCategory) ?? true;
    };

    const includedCards: Card[] = [];
    for (const archidektCard of archidektDeck.cards) {
      if (isCardIncluded(archidektCard) && !archidektCard.categories.includes("Commander")) {
        const card = this.convertArchidektToCard(archidektCard);
        if (card) {
          for (let i = 0; i < archidektCard.quantity; i++) {
            includedCards.push(card);
          }
        }
      }
    }

    const commanderCard = archidektDeck.cards.find((card) => card.categories.includes("Commander"));

    const now = new Date();
    return {
      id: archidektDeck.id,
      name: archidektDeck.name,
      totalCards: includedCards.length,
      commander: commanderCard ? this.convertArchidektToCard(commanderCard) : undefined,
      cards: includedCards,
      provenance: {
        retrievedDate: now,
        sourceUrl: `https://archidekt.com/decks/${archidektDeckId}`,
      },
    };
  }

  private convertArchidektToCard(archidektCard: ArchidektCard): Card | undefined {
    /* A few cards, such as "Miku, the Renowned" have a display name that's different from the oracle name.
     * The Oracle Card is the canonical card, like you can't have two of the same in a Commander deck,
     * while certain fancy cards get a vanity name. On the printed card, the Oracle Name shows up as a subtitle */
    const cardName = archidektCard.card.displayName || archidektCard.card.oracleCard.name;
    return { name: cardName, uid: archidektCard.card.uid, multiverseid: archidektCard.card.multiverseid };
  }
}
