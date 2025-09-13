# Model state changes as events

Every update to a game is an event in this domain. Retain them as part of game state.

- display a log to the user of all events in the game, so I can see what I did
- implement Undo
- eventually, this will allow multiple players to share a game and see what the other is doing.

Hmm, that last bit implies that the game events are separate from player state. Multiple players doing things is an ordered list. This app does support chaotic play (rules are not enforced), so people are allowed to do things at the same time. We could make a DAG out of it, athough I don't know why that would be necessary.

## Structure change in GameState

The existing GameState object is really a PlayerGameState. It needs wrapped with a GameState that contains a set of PlayerGameStates. The session needs to know the game and the player name... someday.

For now, does it make sense to add the event log to all the other stuff in the PlayerGameState? we only have this player's stuff. Yes, that does make sense.

Right now:

[] add an EventLog to GameState.

## Events

Game Started

Move Card (card index, from position, to position). Conceptually, many operations reduce to this.

Shuffle (for every card in the library: card index, from position, to position)
