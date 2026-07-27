import { CardRepositoryPort } from "./types.js";
import { CardDefinition } from "../types.js";

/**
 * In-memory implementation of CardRepositoryPort for testing.
 * Stores cards in a Map keyed by scryfallId.
 */
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

  /**
   * Clear all cards from the repository (useful for testing).
   */
  clear(): void {
    this.cards.clear();
  }

  /**
   * Get the number of cards in the repository (useful for testing).
   */
  size(): number {
    return this.cards.size;
  }
}

