import { CardRepositoryPort } from "./types.js";
import { CardDefinition } from "../types.js";

export class InMemoryCardRepositoryAdapter implements CardRepositoryPort {
  private cards: Map<string, CardDefinition> = new Map();

  async saveCards(cards: CardDefinition[]): Promise<void> {
    for (const card of cards) {
      this.cards.set(card.cardDefinitionId, card);
    }
  }

  async getCard(cardDefinitionId: string): Promise<CardDefinition | null> {
    return this.cards.get(cardDefinitionId) ?? null;
  }

  async getCards(cardDefinitionIds: string[]): Promise<CardDefinition[]> {
    const result: CardDefinition[] = [];
    for (const cardDefinitionId of cardDefinitionIds) {
      const card = this.cards.get(cardDefinitionId);
      if (card) {
        result.push(card);
      }
    }
    return result;
  }

  clear(): void {
    this.cards.clear();
  }

  size(): number {
    return this.cards.size;
  }
}

