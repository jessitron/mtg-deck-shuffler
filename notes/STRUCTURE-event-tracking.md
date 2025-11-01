# Track the course of the game as events

Status: partially implemented

There is a GameEventLog as part of each GameState. It's defined in @src/GameEvents.ts

## Implement Undo

Status: implemented

We have a log of events.

Undoing an event doesn't remove it from the log. Instead, it applies an UNDO event, referencing the undone one.

The undone event appears crossed out in the history, while the undo event appears in gray.

The most recent not-undone event gets an UNDO button.

If the most recent event is an undo, it gets a REDO button. A redo is a repeat of the undone event, nothing special about it.

## Notice if the event log is at an unexpected place.

Status: not implemented

The UI state should include (in addition to the Game ID) and ID of the last event recorded.

If we get an update, and the state on the server has advanced so that the the last event recorded is different, reject the update.

Present an error popup to the user and ask them to hit refresh.
