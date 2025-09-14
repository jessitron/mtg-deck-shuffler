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

export type GameEventDefinition = ShuffleEvent | StartEvent | MoveCardEvent;

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
}
