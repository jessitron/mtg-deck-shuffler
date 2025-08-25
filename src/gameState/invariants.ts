import { GameCard, CardLocation } from "./types.js";

// Step 1.4: Add invariant validation functions

export interface InvariantViolation {
  type: string;
  message: string;
  details?: any;
}

export function validateInvariants(cards: ReadonlyArray<Readonly<GameCard>>): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // Invariant: there are zero, one, or two commander cards
  const commanderCount = cards.filter(card => card.location.type === "CommandZone").length;
  if (commanderCount > 2) {
    violations.push({
      type: "TOO_MANY_COMMANDERS",
      message: `Found ${commanderCount} commanders, but maximum allowed is 2`,
      details: { commanderCount }
    });
  }

  // Invariant: there are no duplicate positions except Table
  const positionsByLocation = new Map<string, Set<number>>();
  
  for (const card of cards) {
    if (card.location.type !== "Table" && "position" in card.location) {
      const locationType = card.location.type;
      const position = card.location.position;
      
      if (!positionsByLocation.has(locationType)) {
        positionsByLocation.set(locationType, new Set());
      }
      
      const positions = positionsByLocation.get(locationType)!;
      if (positions.has(position)) {
        violations.push({
          type: "DUPLICATE_POSITION",
          message: `Duplicate position ${position} found in ${locationType}`,
          details: { locationType, position }
        });
      } else {
        positions.add(position);
      }
    }
  }

  // Invariant: the order of cards in the game state never changes (ordered by Display Name)
  const cardNames = cards.map(card => card.definition.name);
  const sortedCardNames = [...cardNames].sort();
  
  for (let i = 0; i < cardNames.length; i++) {
    if (cardNames[i] !== sortedCardNames[i]) {
      violations.push({
        type: "INCORRECT_SORT_ORDER",
        message: "Cards are not sorted by display name",
        details: { 
          expectedOrder: sortedCardNames,
          actualOrder: cardNames
        }
      });
      break; // Only report this once
    }
  }

  // Invariant: positions should be non-negative
  for (const card of cards) {
    if ("position" in card.location && card.location.position < 0) {
      violations.push({
        type: "NEGATIVE_POSITION",
        message: `Negative position ${card.location.position} found for card ${card.definition.name} in ${card.location.type}`,
        details: { 
          cardName: card.definition.name,
          location: card.location
        }
      });
    }
  }

  return violations;
}

export function assertInvariants(cards: ReadonlyArray<Readonly<GameCard>>): void {
  const violations = validateInvariants(cards);
  if (violations.length > 0) {
    const messages = violations.map(v => `${v.type}: ${v.message}`);
    throw new Error(`Invariant violations detected:\n${messages.join("\n")}`);
  }
}