import { trace } from "@opentelemetry/api";
import { RetrieveDeckPort, DeckRetrievalRequest, isArchidektDeckRetrievalRequest } from "../types.js";
import { ArchidektGatewayInterface } from "./ArchidektGatewayInterface.js";
import { Deck, CardDefinition, CardImageUris, IMAGE_FORMATS, PERSISTED_DECK_VERSION } from "../../types.js";
import { ArchidektCard, ArchidektCustomCard, ArchidektDeck } from "./archidektTypes.js";
import { isDoubleSidedCustomCard, isDoubleSidedLayout } from "../twoFacedLayouts.js";
import { uuidv5 } from "../../uuidv5.js";
import { CardImagesPort } from "../../port-card-images/types.js";
import { enrichDeckWithImages } from "../../port-card-images/enrichDeckWithImages.js";
import { log } from "../../log.js";

const ARCHIDEKT_CUSTOM_CARD_NAMESPACE = "c7098215-3654-4327-9f21-28953b7f6d07";
const MANA_COLOR_CODES = ["W", "U", "B", "R", "G"];

type DeckEntry = { quantity: number; categories: string[] };

export function customCardDefinitionId(archidektCustomCardId: number): string {
  return uuidv5(`archidekt-custom:${archidektCustomCardId}`, ARCHIDEKT_CUSTOM_CARD_NAMESPACE);
}

function sameUrlInEveryFormat(url: string): CardImageUris {
  return Object.fromEntries(IMAGE_FORMATS.map((format) => [format, url]));
}

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

    const isCardIncluded = (card: DeckEntry) => {
      const primaryCategory = (card.categories || [])[0];

      if (primaryCategory === "Sideboard") {
        return false;
      }

      return categoryInclusionMap.get(primaryCategory) ?? true;
    };
    const isCommander = (card: DeckEntry) => (card.categories || []).includes("Commander");

    const entries: Array<{ entry: DeckEntry; card: CardDefinition }> = [
      ...archidektDeck.cards.map((entry) => ({ entry, card: this.convertArchidektToCard(entry) })),
      ...(archidektDeck.customCards || []).map((entry) => ({ entry, card: this.convertCustomCard(entry) })),
    ];

    const includedCards: CardDefinition[] = [];
    for (const { entry, card } of entries) {
      if (isCardIncluded(entry) && !isCommander(entry)) {
        for (let i = 0; i < entry.quantity; i++) {
          includedCards.push(card);
        }
      }
    }

    const commanderCards = entries.filter(({ entry }) => isCommander(entry)).map(({ card }) => card);

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

  private convertCustomCard(customCard: ArchidektCustomCard): CardDefinition {
    const c = customCard.card;
    const twoFaced = isDoubleSidedCustomCard(c.hasBack, c.backImageUrl);
    const typeWords = (types: string | null | undefined) => (types || "").split(/\s+/).filter((t) => t.length > 0);
    const colorSymbols = [c.frontManaCost, c.frontText, c.backManaCost, c.backText].join(" ").match(/\{[^}]*\}/g) || [];
    const colorIdentity = MANA_COLOR_CODES.filter((code) => colorSymbols.some((symbol) => symbol.includes(code)));

    return {
      name: c.frontName,
      cardDefinitionId: customCardDefinitionId(c.id),
      cardSource: "archidekt-custom",
      twoFaced,
      oracleCardName: c.frontName,
      colorIdentity,
      set: c.setCode || "Custom",
      cardTypes: [...new Set([...typeWords(c.frontTypes), ...typeWords(c.backTypes)])],
      imageUris: sameUrlInEveryFormat(c.frontImageUrl),
      ...(twoFaced ? { backImageUris: sameUrlInEveryFormat(c.backImageUrl!) } : {}),
    };
  }

  private convertArchidektToCard(archidektCard: ArchidektCard): CardDefinition {
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
      cardDefinitionId: archidektCard.card.uid,
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
