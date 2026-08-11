import { CardRepositoryPort } from "./types.js";
import { CardDefinition } from "../types.js";

export class InMemoryCardRepositoryAdapter implements CardRepositoryPort {
  private cards: Map<string, CardDefinition> = new Map();

  async saveCards(cards: CardDefinition[]): Promise<void> {
    for (const card of cards) {
      this.cards.set(card.scryfallId, card);
    }
  }

  async getCard(scryfallId: string): Promise<CardDefinition | null> {
    return this.cards.get(scryfallId) ?? null;
  }

  async getCards(scryfallIds: string[]): Promise<CardDefinition[]> {
    const result: CardDefinition[] = [];
    for (const scryfallId of scryfallIds) {
      const card = this.cards.get(scryfallId);
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

