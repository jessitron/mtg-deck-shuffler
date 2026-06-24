# Architecture of dataflow

status: current

# External interfaces are behind ports, adapters, and gateways.

See notes/PATTERN-port-adapter-gateway.md

For a good example of this in the code, see @src/port-deck-retrieval/index.ts and the files it references.

The port is an interface, RetrieveDeckPort.

There are two adapters, ArchidektDeckToDeckAdapter and LocalFileAdapter, plus a compositional adapter, CascadingDeckRetrievalAdapter.

There is one gateway, ArchidektGateway. LocalFileAdapter is too simple to need a gateway.

The LocalFileAdapter deals with the storage mechanism (local files), while the domain uses "precon" to describe what the deck represents.

The adapter is initialized in @src/server.ts

The tests in @test/port-deck-retrieval/ test each of the adapters. Gateways do not get automated tests.

# The Trainer chat is a service-split seam (one process today, two processes later)

The Trainer chat is built so it can later move to its own single-instance service
without a redesign. The seam already exists in the code, even though everything runs
in one process today.

`MulliganTrainer` (@src/mulligan/mulliganTrainer.ts) is the facade for the chat. It
owns the conversation lifecycle, the agent relay, and the evaluation span, and it
imports **nothing** about game state, persistence, or the database — that import
restriction *is* the boundary. Its three doors map to the future network split:

- `startSession(gameId, context)` — **game-server side.** Only the game server can
  build `context` (the hand snapshot), so this is the one stateful call. The single
  place that reads game state for the Trainer is `buildAdvisorChatContext` in
  @src/app.ts; in the split it stays on the game server and `AdvisorChatContext`
  (plain `CardDefinition`s) is what crosses the wire.
- `sendMessage(gameId, message)` — **chat-server side.** In-memory only.
- `endSession(gameId, evaluation)` — **chat-server side.** In-memory only.

The point of the cut: the game server does the one stateful thing (start) and can
scale out; the chat server holds the in-memory conversation `Map` and stays
single-instance. Planned async chat lands on `sendMessage` with no game-side change.

Full detail and rationale: notes/DESIGN-mulligan-advisor.md (Phase 2.6).
