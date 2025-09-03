import { GameState } from "../GameState.js";
import { WhatHappened } from "../types.js";
import { formatDeckReviewHtml, formatGamePageHtml as formatDeckReviewPageHtml } from "./review-deck-view.js";
import { formatActiveGameHtml, formatGamePageHtml as formatActiveGamePageHtml } from "./active-game-view.js";

export function formatGameHtml(game: GameState, whatHappened: WhatHappened = {}): string {
  if (game.status === "NotStarted") {
    return formatDeckReviewHtml(game);
  } else {
    return formatActiveGameHtml(game, whatHappened);
  }
}

export function formatGamePageHtml(game: GameState, whatHappened: WhatHappened = {}): string {
  if (game.status === "NotStarted") {
    return formatDeckReviewPageHtml(game);
  } else {
    return formatActiveGamePageHtml(game, whatHappened);
  }
}