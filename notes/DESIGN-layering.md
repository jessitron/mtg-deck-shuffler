# Architecture of dataflow

status: current

# External interfaces are behind ports, adapters, and gateways.

See notes/PATTERN-port-adapter-gateway.md

For a good example of this in the code, see @src/deck-retrieval/index.ts and the files it references.

The port is an interface, RetrieveDeckPort.

There are two adapters, ArchidektDeckToDeckAdapter and LocalDeckAdapter, plus a compositional adapter, CascadingDeckRetrievalAdapter.

There is one gateway, ArchidektGateway. LocalDeckAdapter is too simple to need a gateway.

The adapter is initialized in @src/server.ts
