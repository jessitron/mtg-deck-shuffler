import {
  RetrieveDeckPort,
  DeckRetrievalRequest,
  ArchidektDeckRetrievalRequest,
  ArchidektDeck,
  ArchidektCard,
  isArchidektDeckRetrievalRequest,
} from "./types.js";
import { ArchidektGateway } from "./ArchidektGateway.js";
import { Deck, Card, convertArchidektToCard } from "../deck.js";

export class ArchidektDeckToDeckAdapter implements RetrieveDeckPort {
  constructor(private gateway: ArchidektGateway) {}

  canHandle(request: DeckRetrievalRequest): boolean {
    return isArchidektDeckRetrievalRequest(request);
  }

  async retrieveDeck(request: DeckRetrievalRequest): Promise<Deck> {
    if (!isArchidektDeckRetrievalRequest(request)) {
      throw new Error("Cannot handle this request type");
    }

    // TypeScript now knows request is ArchidektDeckRetrievalRequest
    const archidektDeck = await this.gateway.fetchDeck(request.archidektDeckId);
    return this.convertArchidektToDeck(archidektDeck);
  }

  private convertArchidektToDeck(archidektDeck: ArchidektDeck): Deck {
    const totalCards = archidektDeck.cards.reduce((sum, card) => sum + card.quantity, 0);

    const categoryInclusionMap = new Map(archidektDeck.categories.map((cat) => [cat.name, cat.includedInDeck]));

    const isCardIncluded = (card: ArchidektCard) => {
      const primaryCategory = card.categories[0];

      if (primaryCategory === "Sideboard") {
        return false;
      }

      return categoryInclusionMap.get(primaryCategory) ?? true;
    };

    const allCards: Card[] = [];
    for (const archidektCard of archidektDeck.cards) {
      if (isCardIncluded(archidektCard) && !archidektCard.categories.includes("Commander")) {
        const card = convertArchidektToCard(archidektCard);
        if (card) {
          for (let i = 0; i < archidektCard.quantity; i++) {
            allCards.push(card);
          }
        }
      }
    }

    const includedCards = archidektDeck.cards.filter(isCardIncluded).reduce((sum, card) => sum + card.quantity, 0);
    const excludedCards = archidektDeck.cards.filter((card) => !isCardIncluded(card)).reduce((sum, card) => sum + card.quantity, 0);
    const commanderCard = archidektDeck.cards.find((card) => card.categories.includes("Commander"));

    return {
      id: archidektDeck.id,
      name: archidektDeck.name,
      totalCards,
      includedCards,
      excludedCards,
      commander: commanderCard ? convertArchidektToCard(commanderCard) : undefined,
      cards: allCards,
      retrievedDate: new Date(),
    };
  }
}
