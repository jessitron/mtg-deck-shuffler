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
}
