import { describe, test, expect } from "@jest/globals";
import { GameEventLog, GameStartedEvent, StartGameEvent, MoveCardEvent, nameMoveCardEvent } from "../src/GameEvents.js";
import { CardLocation } from "../src/domain-types.js";

describe("GameEventLog", () => {
  const libraryLocation: CardLocation = { type: "Library", position: 0 };
  const handLocation: CardLocation = { type: "Hand", position: 0 };

  describe("hasBeenUndone", () => {
    test("returns false when event has not been undone", () => {
      const log = GameEventLog.newLog();
      const moveEvent = log.record({
        eventName: "move card",
        move: {
          gameCardIndex: 1,
          fromLocation: libraryLocation,
          toLocation: handLocation,
        },
      });

      expect(log.hasBeenUndone(moveEvent.gameEventIndex)).toBe(false);
    });

    test("returns true when event has been undone", () => {
      const log = GameEventLog.newLog();
      const moveEvent = log.record({
        eventName: "move card",
        move: {
          gameCardIndex: 1,
          fromLocation: libraryLocation,
          toLocation: handLocation,
        },
      });

      log.recordUndo(moveEvent);

      expect(log.hasBeenUndone(moveEvent.gameEventIndex)).toBe(true);
    });

    test("returns false when a different event has been undone", () => {
      const log = GameEventLog.newLog();
      const moveEvent1 = log.record({
        eventName: "move card",
        move: {
          gameCardIndex: 1,
          fromLocation: libraryLocation,
          toLocation: handLocation,
        },
      });
      const moveEvent2 = log.record({
        eventName: "move card",
        move: {
          gameCardIndex: 2,
          fromLocation: libraryLocation,
          toLocation: handLocation,
        },
      });

      log.recordUndo(moveEvent2);

      expect(log.hasBeenUndone(moveEvent1.gameEventIndex)).toBe(false);
    });

    test("returns true when shuffle event has been undone", () => {
      const log = GameEventLog.newLog();
      const shuffleEvent = log.record({
        eventName: "shuffle library",
        compactMoves: [[1, 0, 1]],
      });

      log.recordUndo(shuffleEvent);

      expect(log.hasBeenUndone(shuffleEvent.gameEventIndex)).toBe(true);
    });

    test("returns true when it was undone later", () => {
      const log = GameEventLog.newLog();
      const shuffleEvent = log.record({
        eventName: "shuffle library",
        compactMoves: [[1, 0, 1]],
      });
      const moveEvent = log.record({
        eventName: "move card",
        move: {
          gameCardIndex: 1,
          fromLocation: libraryLocation,
          toLocation: handLocation,
        },
      });

      log.recordUndo(moveEvent);
      log.recordUndo(shuffleEvent);

      expect(log.hasBeenUndone(shuffleEvent.gameEventIndex)).toBe(true);
    });
  });

  describe("canBeUndone", () => {
    test("returns true for move card events", () => {
      const log = GameEventLog.newLog();
      const moveEvent = log.record({
        eventName: "move card",
        move: {
          gameCardIndex: 1,
          fromLocation: libraryLocation,
          toLocation: handLocation,
        },
      });

      expect(log.canBeUndone(moveEvent.gameEventIndex)).toBe(true);
    });

    test("returns true for shuffle events", () => {
      const log = GameEventLog.newLog();
      const shuffleEvent = log.record({
        eventName: "shuffle library",
        compactMoves: [[1,0,1]],
      });

      expect(log.canBeUndone(shuffleEvent.gameEventIndex)).toBe(true);
    });


    test("returns false for start game events", () => {
      const log = GameEventLog.newLog();
      const startEvent = log.record(GameStartedEvent);

      expect(log.canBeUndone(startEvent.gameEventIndex)).toBe(false);
    });

    test("returns false for a move card event with verb 'returned' (a card returned from the table by the Spine)", () => {
      const log = GameEventLog.newLog();
      const returnedEvent = log.record({
        eventName: "move card",
        move: {
          gameCardIndex: 1,
          fromLocation: { type: "Table" },
          toLocation: { type: "Revealed", position: 0 },
        },
        verb: "returned",
        spineSeq: 3,
      });

      expect(log.canBeUndone(returnedEvent.gameEventIndex)).toBe(false);
    });

    test("returns false for undo events", () => {
      const log = GameEventLog.newLog();
      const moveEvent = log.record({
        eventName: "move card",
        move: {
          gameCardIndex: 1,
          fromLocation: libraryLocation,
          toLocation: handLocation,
        },
      });
      const undoEvent = log.recordUndo(moveEvent);

      expect(log.canBeUndone(undoEvent.gameEventIndex)).toBe(false);
    });

    test("returns false for events that have already been undone", () => {
      const log = GameEventLog.newLog();
      const moveEvent = log.record({
        eventName: "move card",
        move: {
          gameCardIndex: 1,
          fromLocation: libraryLocation,
          toLocation: handLocation,
        },
      });

      log.recordUndo(moveEvent);

      expect(log.canBeUndone(moveEvent.gameEventIndex)).toBe(false);
    });

    test("returns true for events that have not been undone", () => {
      const log = GameEventLog.newLog();
      const moveEvent1 = log.record({
        eventName: "move card",
        move: {
          gameCardIndex: 1,
          fromLocation: libraryLocation,
          toLocation: handLocation,
        },
      });
      const moveEvent2 = log.record({
        eventName: "move card",
        move: {
          gameCardIndex: 2,
          fromLocation: libraryLocation,
          toLocation: handLocation,
        },
      });

      log.recordUndo(moveEvent2);

      expect(log.canBeUndone(moveEvent1.gameEventIndex)).toBe(true);
    });
  });

  describe("reverse", () => {
  });

  describe("nameMoveCardEvent", () => {
    test("labels verb 'returned' as 'Return from table'", () => {
      const event: MoveCardEvent = {
        eventName: "move card",
        move: {
          gameCardIndex: 1,
          fromLocation: { type: "Table" },
          toLocation: { type: "Revealed", position: 0 },
        },
        verb: "returned",
      };

      expect(nameMoveCardEvent(event)).toBe("Return from table");
    });
  });
});
