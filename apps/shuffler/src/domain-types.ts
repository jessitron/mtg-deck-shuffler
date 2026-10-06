import { CardDefinition, ImageFormat } from "./types.js";


export type GameId = number | string;

export function parseGameId(raw: string | undefined): GameId {
  const trimmed = (raw ?? "").trim();
  if (trimmed !== "" && /^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

export enum GameStatus {
  Active = "Active",
  Ended = "Ended",
}

export interface LibraryLocation {
  type: "Library";
  position: number;
}

export interface HandLocation {
  type: "Hand";
  position: number;
}

export interface RevealedLocation {
  type: "Revealed";
  position: number;
}

export interface TableLocation {
  type: "Table";
}

export interface CommandZoneLocation {
  type: "CommandZone";
  position: number;
}

export type CardLocation = LibraryLocation | HandLocation | RevealedLocation | TableLocation | CommandZoneLocation;

export function printLocation(l: CardLocation) {
  switch (l.type) {
    case "Hand":
    case "Revealed":
    case "Library":
    case "CommandZone":
      return `${l.type}(${l.position})`;
    case "Table":
      return l.type;
  }
}

export interface GameCard {
  card: CardDefinition;
  location: CardLocation;
  gameCardIndex: number;
  isCommander: boolean;
  currentFace: "front" | "back";
  cardInstanceId?: string;
}

/** Construct a Scryfall CDN URL from a scryfallId. This is the fallback used when
 * a card has no stored `imageUris` — it works for most cards, but the bare
 * (version-less) URL can 404 for very recently released cards, which is why we
 * prefer the stored URLs from `getCardImageUrl`. */
export function constructCardImageUrl(scryfallId: string, format: ImageFormat = "png", face: "front" | "back" = "front"): string {
  const extension = format === "png" ? "png" : "jpg";
  const firstTwo = scryfallId.substring(0, 1);
  const nextTwo = scryfallId.substring(1, 2);
  return `https://cards.scryfall.io/${format}/${face}/${firstTwo}/${nextTwo}/${scryfallId}.${extension}`;
}

export function getCardImageUrl(card: CardDefinition, format: ImageFormat = "png", face: "front" | "back" = "front"): string {
  const stored = face === "back" ? card.backImageUris : card.imageUris;
  return stored?.[format] ?? constructCardImageUrl(card.cardDefinitionId, format, face);
}
