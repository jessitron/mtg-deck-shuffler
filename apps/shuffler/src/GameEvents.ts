import { CardLocation } from "./domain-types.js";

type GameEventIdentifier = {
  gameEventIndex: number;
};

type EventProvenance = {
  browserTabId?: string;
};

export type CardMove = {
  gameCardIndex: number;
  fromLocation: CardLocation;
  toLocation: CardLocation;
};

export type ShuffleEvent = {
  eventName: "shuffle library";
  // Compact representation: [cardIndex, fromPosition, toPosition] for cards that actually moved
  compactMoves: [number, number, number][];
};

export type StartEvent = {
  eventName: "start game";
};

export const GameStartedEvent: StartEvent = {
  eventName: "start game",
};
export const StartGameEvent: StartEvent = {
  eventName: "start game",
};

export type MoveCardEvent = {
  eventName: "move card";
  move: CardMove;
  verb?: "discard" | "play-face-down";
};


export type UndoEvent = {
  eventName: "undo";
  originalEventIndex: number;
};

export type DealOpeningHandEvent = {
  eventName: "deal opening hand";
  moves: CardMove[];
};

export type MulliganEvent = {
  eventName: "mulligan";
  moves: CardMove[];
};

export function expandCompactShuffleMoves(compactMoves: [number, number, number][]): CardMove[] {
  return compactMoves.map(([gameCardIndex, fromPosition, toPosition]) => ({
    gameCardIndex,
    fromLocation: { type: "Library" as const, position: fromPosition },
    toLocation: { type: "Library" as const, position: toPosition },
  }));
}

export function compactShuffleMoves(moves: CardMove[]): [number, number, number][] {
  return moves.map((move) => [
    move.gameCardIndex,
    (move.fromLocation as { type: "Library"; position: number }).position,
    (move.toLocation as { type: "Library"; position: number }).position,
  ]);
}

export function nameMoveCardEvent(event: MoveCardEvent): string {
  if (event.verb === "discard") {
    return "Discard";
  }
  if (event.verb === "play-face-down") {
    return "Play Face Down";
  }
  return nameMove(event.move);
}

export function nameMove(move: CardMove): string {
  if (move.fromLocation.type === "Library" && move.toLocation.type === "Hand") {
    return "Draw";
  }
  if (move.toLocation.type === "Revealed") {
    return "Reveal";
  }
  if (move.toLocation.type === "Table") {
    return "Play";
  }
  if (move.toLocation.type === "Library" && move.toLocation.position === 0) {
    return "Put on top";
  }
  if (move.toLocation.type === "Library") {
    return `Put in library(${move.toLocation.position})`;
  }
  if (move.fromLocation.type === move.toLocation.type) {
    return `Move around in ${move.toLocation.type}`;
  }
  return `Move from ${move.fromLocation.type} to ${move.toLocation.type}`;
}

export type GameEventDefinition = (ShuffleEvent | StartEvent | MoveCardEvent | UndoEvent | DealOpeningHandEvent | MulliganEvent) & EventProvenance;

export type GameEvent = GameEventDefinition & GameEventIdentifier;

export class GameEventLog {
  private readonly events: GameEvent[] = [];

  static newLog() {
    return new GameEventLog([]);
  }

  static fromPersisted(events: GameEvent[]) {
    return new GameEventLog(events);
  }

  private constructor(events: GameEvent[]) {
    this.events = events;
  }

  public record(event: GameEventDefinition): GameEvent {
    const gameEvent: GameEvent = {
      ...event,
      gameEventIndex: this.events.length,
    };
    this.events.push(gameEvent);
    return gameEvent;
  }

  public getEvents() {
    return [...this.events];
  }

  public recordUndo(event: GameEvent, browserTabId?: string): GameEvent {
    if (event.eventName === "undo") {
      throw new Error("Cannot undo an undo, use redo instead");
    }
    if (event.eventName === "start game") {
      throw new Error("Cannot undo start game");
    }
    if (event.eventName === "deal opening hand") {
      throw new Error("Cannot undo deal opening hand");
    }
    // A "mulligan" event IS undoable — see GameState.undo, which reverses its moves.

    const undoEvent: UndoEvent & EventProvenance = {
      eventName: "undo",
      originalEventIndex: event.gameEventIndex,
      browserTabId,
    };
    return this.record(undoEvent);
  }

  public reverse(event: GameEventDefinition): MoveCardEvent | ShuffleEvent {
    switch (event.eventName) {
      case "undo":
        return this.events[event.originalEventIndex] as MoveCardEvent | ShuffleEvent;
      case "move card":
        return {
          eventName: "move card",
          move: {
            gameCardIndex: event.move.gameCardIndex,
            fromLocation: event.move.toLocation,
            toLocation: event.move.fromLocation,
          },
        };
      case "shuffle library":
        // Use compact moves if available, otherwise fall back to full moves
        const movesToReverse = expandCompactShuffleMoves(event.compactMoves);

        return {
          eventName: "shuffle library",
          compactMoves: compactShuffleMoves(
            movesToReverse.map((move) => ({
              gameCardIndex: move.gameCardIndex,
              fromLocation: move.toLocation,
              toLocation: move.fromLocation,
            }))
          ),
        };
      case "start game":
        throw new Error("there isn't an event for reversing start game");
      case "deal opening hand":
      case "mulligan":
        throw new Error(`there isn't an event for reversing ${event.eventName}`);
    }
  }

  public canBeUndone(gameEventIndex: number): boolean {
    const event = this.events[gameEventIndex];
    if (!event) return false;

    // Cannot undo these event types ("mulligan" IS undoable)
    if (event.eventName === "undo" || event.eventName === "start game" || event.eventName === "deal opening hand") {
      return false;
    }

    // Cannot undo if already undone
    if (this.hasBeenUndone(gameEventIndex)) {
      return false;
    }

    // If it's the most recent event, it can be undone
    const mostRecentIndex = this.events.length - 1;
    if (gameEventIndex === mostRecentIndex) {
      return true;
    }

    const moreRecentEvents = this.events.slice(gameEventIndex + 1);
    const aMoreRecentUndoableEvent = moreRecentEvents.find((event) => event.eventName !== "undo" && !this.hasBeenUndone(event.gameEventIndex));
    return !aMoreRecentUndoableEvent;
  }

  public hasBeenUndone(gameEventIndex: number): boolean {
    return this.events.slice(gameEventIndex + 1).some((event) => event.eventName === "undo" && event.originalEventIndex === gameEventIndex);
  }

  public isInHandAcceptanceStage(): boolean {
    for (let i = this.events.length - 1; i >= 0; i--) {
      const event = this.events[i];
      if (event.eventName === "undo" || this.hasBeenUndone(i)) {
        continue;
      }
      if (event.eventName === "move card" && event.move.fromLocation.type === "Hand" && event.move.toLocation.type === "Hand") {
        continue; // rearranging the hand is transparent
      }
      return event.eventName === "deal opening hand" || event.eventName === "mulligan";
    }
    return false;
  }

  /** How many mulligans have been taken (number of live "mulligan" events). */
  public mulliganCount(): number {
    return this.events.filter((event, i) => event.eventName === "mulligan" && !this.hasBeenUndone(i)).length;
  }
}
