import { Deck, Card } from "../deck.js";
import { ArchidektDeck, ArchidektCard } from "./archidekt-types.js";

export function convertArchidektToCard(archidektCard: ArchidektCard): Card | undefined {
  const cardName = archidektCard.card.displayName || archidektCard.card.oracleCard.name;
  return { 
    name: cardName, 
    uid: archidektCard.card.uid, 
    multiverseid: archidektCard.card.multiverseid 
  };
}

export class ArchidektDeckToDeckAdapter {
  convertToDeck(archidektDeck: ArchidektDeck): Deck {
    const totalCards = archidektDeck.cards.reduce((sum, card) => sum + card.quantity, 0);

    const categoryInclusionMap = new Map(
      archidektDeck.categories.map((cat) => [cat.name, cat.includedInDeck])
    );

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

    const includedCards = archidektDeck.cards
      .filter(isCardIncluded)
      .reduce((sum, card) => sum + card.quantity, 0);

    const excludedCards = archidektDeck.cards
      .filter((card) => !isCardIncluded(card))
      .reduce((sum, card) => sum + card.quantity, 0);

    const commanderCard = archidektDeck.cards.find((card) => 
      card.categories.includes("Commander")
    );

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