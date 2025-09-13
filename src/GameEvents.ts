import { CardLocation } from "./port-persist-state/types";

export type CardMove = {
  gameCardIndex: number;
  fromLocation: CardLocation;
  toLocation: CardLocation;
};

export type ShuffleEvent = {
  eventName: "shuffle library";
  rearrangement: CardMove[];
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

export type GameEvent = ShuffleEvent | StartEvent | MoveCardEvent;

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

  public record(event: GameEvent) {
    console.log("recording: " + event.eventName);
    this.events.push(event);
  }

  public getEvents() {
    return [...this.events];
  }
}
