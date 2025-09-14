import { CardLocation } from "./port-persist-state/types";

type GameEventIdentifier = {
  gameEventIndex: number;
};

export type CardMove = {
  gameCardIndex: number;
  fromLocation: CardLocation;
  toLocation: CardLocation;
};

export type ShuffleEvent = {
  eventName: "shuffle library";
  moves: CardMove[];
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
};

export type UndoEvent = {
  eventName: "undo";
  originalEventIndex: number;
};

export function nameMove(move: CardMove): string {
  // from library to hand is "Draw"
  // from anywhere to revealed is "Reveal"
  // from anywhere to Table is "Play"
  // from anywhere to Library(0) is "Put on Top"
  // from anywhere to Library(nonzero) is "Put in library(position)"
  // from one position to another in the same location is "Move around"
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

export type GameEventDefinition = ShuffleEvent | StartEvent | MoveCardEvent | UndoEvent;

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
    // this should be an atomic operation.
    // However, I don't think it's currently possible for this object to be shared among threads, since each request is synchronous,
    // and the server hydrates a new object for each request.
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

  public recordUndo(event: GameEvent): GameEvent {
    if (event.eventName === "undo") {
      throw new Error("Cannot undo an undo, use redo instead");
    }
    if (event.eventName === "start game") {
      throw new Error("Cannot undo start game");
    }

    const undoEvent: UndoEvent = {
      eventName: "undo",
      originalEventIndex: event.gameEventIndex,
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
        return {
          eventName: "shuffle library",
          moves: event.moves.map((move) => ({
            gameCardIndex: move.gameCardIndex,
            fromLocation: move.toLocation,
            toLocation: move.fromLocation,
          })),
        };
      case "start game":
        throw new Error("there isn't an event for reversing start game");
    }
  }

  /**
   * Is this event eligible for undo?
   *
   * It is eligible for undo if:
   * - it is not an undo event
   * - it is not Start Game
   * - Either:
   *   - it is the most recent event
   *   - The events after are paired: each non-undo has a later undo of it.
   *
   * @param gameEventIndex
   * @returns boolean
   */
  public canBeUndone(gameEventIndex: number): boolean {
    const event = this.events[gameEventIndex];
    if (!event) return false;

    // Cannot undo these event types
    if (event.eventName === "undo" || event.eventName === "start game") {
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

  /**
   * Should this one be crossed out, and ineligible for undo?
   * @param gameEventIndex
   * @returns True if there's a later event that is an undo of this one.
   */
  public hasBeenUndone(gameEventIndex: number): boolean {
    return this.events.slice(gameEventIndex + 1).some((event) => event.eventName === "undo" && event.originalEventIndex === gameEventIndex);
  }
}
