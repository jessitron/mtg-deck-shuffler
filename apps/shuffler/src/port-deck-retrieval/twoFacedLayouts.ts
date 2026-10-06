export const DOUBLE_SIDED_LAYOUTS = ["transform", "modal_dfc", "reversible_card", "double_faced_token"];

export function isDoubleSidedCustomCard(hasBack: boolean, backImageUrl: string | null | undefined): boolean {
  return hasBack && !!backImageUrl;
}

export function isDoubleSidedLayout(layout: string | undefined): boolean {
  return layout !== undefined && DOUBLE_SIDED_LAYOUTS.includes(layout);
}
