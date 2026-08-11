export const DOUBLE_SIDED_LAYOUTS = ["transform", "modal_dfc", "reversible_card", "double_faced_token"];

export function isDoubleSidedLayout(layout: string | undefined): boolean {
  return layout !== undefined && DOUBLE_SIDED_LAYOUTS.includes(layout);
}
