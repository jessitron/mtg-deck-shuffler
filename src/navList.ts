/**
 * NavList support for card modal navigation.
 *
 * When a card modal is opened from a grouped library search,
 * the navList param scopes prev/next navigation to that section's cards
 * instead of the full zone order.
 */

export interface NavListNavigation {
  prevCardIndex: number | null;
  nextCardIndex: number | null;
  currentPosition: number;
  totalCardsInZone: number;
}

/**
 * Parse a navList query param (comma-separated card indices) and resolve
 * prev/next navigation for the given card index within that list.
 *
 * Returns null if navList is not provided or the card isn't in the list.
 */
export function resolveNavListNavigation(
  navListParam: string | undefined,
  cardIndex: number
): NavListNavigation | null {
  if (!navListParam) {
    return null;
  }

  const navList = navListParam
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => !isNaN(n));

  if (navList.length === 0) {
    return null;
  }

  const pos = navList.indexOf(cardIndex);
  if (pos === -1) {
    return null;
  }

  return {
    prevCardIndex: pos > 0 ? navList[pos - 1] : null,
    nextCardIndex: pos < navList.length - 1 ? navList[pos + 1] : null,
    currentPosition: pos + 1,
    totalCardsInZone: navList.length,
  };
}

/**
 * Build a query string fragment for navList, preserving the list
 * across navigation clicks.
 */
export function navListQueryParam(navListParam: string | undefined): string {
  if (!navListParam) return "";
  return `&navList=${navListParam}`;
}
