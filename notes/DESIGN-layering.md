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
