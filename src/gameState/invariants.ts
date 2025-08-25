import { GameState } from "./GameState.js";

export function validateInvariants(gameState: GameState): void {
  validateCommanderCount(gameState);
  validateNoDuplicatePositions(gameState);
  validateCardOrderByName(gameState);
}

function validateCommanderCount(gameState: GameState): void {
  const commanderCards = gameState.cards.filter(card => card.location.type === "CommandZone");
  
  if (commanderCards.length > 2) {
    throw new Error(`Invalid game state: Found ${commanderCards.length} commanders, expected 0-2`);
  }
}

function validateNoDuplicatePositions(gameState: GameState): void {
  const locationPositions = new Map<string, Set<number>>();

  for (const card of gameState.cards) {
    const { location } = card;
    
    if (location.type === "Table" || location.type === "CommandZone") {
      continue; // These don't have positions to validate
    }

    const locationKey = location.type;
    if (!locationPositions.has(locationKey)) {
      locationPositions.set(locationKey, new Set());
    }

    const positions = locationPositions.get(locationKey)!;
    const position = location.position;

    if (positions.has(position)) {
      throw new Error(`Invalid game state: Duplicate position ${position} found in ${locationKey}`);
    }

    positions.add(position);
  }
}

function validateCardOrderByName(gameState: GameState): void {
  for (let i = 1; i < gameState.cards.length; i++) {
    const prevCard = gameState.cards[i - 1];
    const currentCard = gameState.cards[i];
    
    const comparison = prevCard.cardDefinition.name.localeCompare(currentCard.cardDefinition.name);
    
    if (comparison > 0) {
      throw new Error(
        `Invalid game state: Cards not ordered by display name. ` +
        `"${prevCard.cardDefinition.name}" should come after "${currentCard.cardDefinition.name}"`
      );
    }
  }
}