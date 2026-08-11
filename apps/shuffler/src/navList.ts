
export interface NavListNavigation {
  prevCardIndex: number | null;
  nextCardIndex: number | null;
  currentPosition: number;
  totalCardsInZone: number;
}

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

export function navListQueryParam(navListParam: string | undefined): string {
  if (!navListParam) return "";
  return `&navList=${navListParam}`;
}
