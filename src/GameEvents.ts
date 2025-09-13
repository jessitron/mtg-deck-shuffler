import { CardLocation } from "./types";

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

export type MoveCardEvent = {
  eventName: "move card";
  move: CardMove;
};

export type GameEvent = ShuffleEvent | StartEvent | MoveCardEvent;

export class GameEventLog {
  private readonly events: GameEvent[] = [];

  public report(event: GameEvent) {
    this.events.push(event);
  }

  public getEvents() {
    return [...this.events];
  }
}
