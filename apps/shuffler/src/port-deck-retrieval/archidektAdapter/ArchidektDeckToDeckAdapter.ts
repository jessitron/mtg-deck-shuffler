import { trace } from "@opentelemetry/api";
import { RetrieveDeckPort, DeckRetrievalRequest, isArchidektDeckRetrievalRequest } from "../types.js";
import { ArchidektGatewayInterface } from "./ArchidektGatewayInterface.js";
import { Deck, CardDefinition, PERSISTED_DECK_VERSION } from "../../types.js";
import { ArchidektCard, ArchidektDeck } from "./archidektTypes.js";
import { isDoubleSidedLayout } from "../twoFacedLayouts.js";
import { CardImagesPort } from "../../port-card-images/types.js";
import { enrichDeckWithImages } from "../../port-card-images/enrichDeckWithImages.js";
import { log } from "../../log.js";

export class ArchidektDeckToDeckAdapter implements RetrieveDeckPort {
  constructor(private gateway: ArchidektGatewayInterface, private retrievedDate?: Date, private imagesPort?: CardImagesPort) {}

  listAvailableDecks() {
    return [];
  }

  private convertColorNameToCode(colorName: string): string {
    const colorMap: Record<string, string> = {
      'White': 'W',
      'Blue': 'U',
      'Black': 'B',
      'Red': 'R',
      'Green': 'G'
    };
    return colorMap[colorName] || colorName;
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
    const deck = this.convertArchidektToDeck(archidektDeck, request.archidektDeckId);
    if (this.imagesPort) {
      try {
        await enrichDeckWithImages(deck, this.imagesPort);
      } catch (error) {
        const attrs = { "deck.archidektId": request.archidektDeckId };
        trace.getActiveSpan()?.setAttributes(attrs);
        log.warn("Failed to enrich Archidekt deck with Scryfall images; falling back to constructed URLs", attrs, error);
      }
    }
    return deck;
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
    const cardName = archidektCard.card.displayName || archidektCard.card.oracleCard.name;
    const oracleCardName = archidektCard.card.oracleCard.name;
    const faces = archidektCard.card.oracleCard.faces || [];
    const multiFace = faces.length === 2;
    const twoFaced = multiFace && isDoubleSidedLayout(archidektCard.card.oracleCard.layout);

    const cardTypes = multiFace
      ? [...new Set(faces.flatMap(face => face.types || []))]
      : archidektCard.card.oracleCard.types || [];

    const cardDefinition: CardDefinition = {
      name: cardName,
      scryfallId: archidektCard.card.uid,
      multiverseid: archidektCard.card.multiverseid || undefined,
      twoFaced,
      oracleCardName,
      colorIdentity: archidektCard.card.oracleCard.colorIdentity.map(color => this.convertColorNameToCode(color)),
      set: archidektCard.card.edition.editionname,
      cardTypes,
    };

    return cardDefinition;
  }
}
