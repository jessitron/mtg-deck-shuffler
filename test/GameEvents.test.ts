import { describe, test, expect } from "@jest/globals";
import { GameEventLog, GameStartedEvent, StartGameEvent, FlipCardEvent } from "../src/GameEvents.js";
import { CardLocation } from "../src/port-persist-state/types.js";

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

    test("returns true for flip card events", () => {
      const log = GameEventLog.newLog();
      const flipEvent = log.record({
        eventName: "flip card",
        gameCardIndex: 1,
        newFace: "back",
      });

      expect(log.canBeUndone(flipEvent.gameEventIndex)).toBe(true);
    });

    test("returns false for start game events", () => {
      const log = GameEventLog.newLog();
      const startEvent = log.record(GameStartedEvent);

      expect(log.canBeUndone(startEvent.gameEventIndex)).toBe(false);
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
    test("reverses flip card events", () => {
      const log = GameEventLog.newLog();
      const flipEvent: FlipCardEvent = {
        eventName: "flip card",
        gameCardIndex: 1,
        newFace: "back",
      };

      const reversed = log.reverse(flipEvent);

      expect(reversed).toEqual({
        eventName: "flip card",
        gameCardIndex: 1,
        newFace: "front",
      });
    });

    test("reverses flip card events from back to front", () => {
      const log = GameEventLog.newLog();
      const flipEvent: FlipCardEvent = {
        eventName: "flip card",
        gameCardIndex: 1,
        newFace: "front",
      };

      const reversed = log.reverse(flipEvent);

      expect(reversed).toEqual({
        eventName: "flip card",
        gameCardIndex: 1,
        newFace: "back",
      });
    });
  });
});
