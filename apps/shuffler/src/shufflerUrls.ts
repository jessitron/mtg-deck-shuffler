import { CARD_BACK } from "./view/common/shared-components.js";
import { DEFAULT_PLAYMAT_PATH } from "./table-look.js";

export function shufflerPublicUrl(): string {
  return process.env.SHUFFLER_PUBLIC_URL || "https://mtg.jessitron.honeydemo.io";
}

/** The standard Magic card back (an unsleeved seat's look), as an absolute URL. Omitted from the join request when the seat has a sleeve. */
export function cardBackImageUrl(): string {
  return `${shufflerPublicUrl()}${CARD_BACK}`;
}

export function defaultPlaymatImageUrl(): string {
  return playmatImageUrlFromPath(DEFAULT_PLAYMAT_PATH);
}

export function playmatImageUrlFromPath(path: string): string {
  return `${shufflerPublicUrl()}${path}`;
}
