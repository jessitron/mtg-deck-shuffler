import { CardDefinition } from "../types.js";

/**
 * Port for persisting and retrieving card definitions.
 * 
 * Cards are identified by their scryfallId, which is unique across all cards.
 * This repository stores the canonical card data that can be referenced from
 * game state and other parts of the application.
 */
export interface CardRepositoryPort {
  /**
   * Save or update multiple cards in the repository.
   * Uses upsert semantics: if a card with the same scryfallId exists, it will be updated.
   * 
   * @param cards - Array of card definitions to save
   * @returns Promise that resolves when all cards are saved
   */
  saveCards(cards: CardDefinition[]): Promise<void>;

  /**
   * Retrieve a single card by its Scryfall ID.
   * 
   * @param scryfallId - The unique Scryfall identifier for the card
   * @returns Promise that resolves to the card definition, or null if not found
   */
  getCard(scryfallId: string): Promise<CardDefinition | null>;

  /**
   * Retrieve multiple cards by their Scryfall IDs.
   * 
   * @param scryfallIds - Array of Scryfall IDs to retrieve
   * @returns Promise that resolves to an array of card definitions (may be shorter than input if some cards not found)
   */
  getCards(scryfallIds: string[]): Promise<CardDefinition[]>;
}

