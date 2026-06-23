/* Card layouts that have two genuinely separate physical faces, each with its
 * own image (front + back). These are the only layouts that should be marked
 * `twoFaced` and get a flip button.
 *
 * Single-image multi-face layouts -- split, adventure, aftermath, flip, and the
 * Strixhaven "prepare" mechanic -- print both halves on one front face. They
 * have two entries in the source data's `faces` array but no back image, so a
 * flip button would request a non-existent image. They must NOT be twoFaced.
 *
 * Both the MTGJSON and Archidekt adapters use this list so they agree.
 */
export const DOUBLE_SIDED_LAYOUTS = ["transform", "modal_dfc", "reversible_card", "double_faced_token"];

export function isDoubleSidedLayout(layout: string | undefined): boolean {
  return layout !== undefined && DOUBLE_SIDED_LAYOUTS.includes(layout);
}
