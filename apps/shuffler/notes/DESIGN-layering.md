# Architecture of dataflow

status: current

# External interfaces are behind ports, adapters, and gateways.

See the fleet's `notes/PATTERN-port-adapter-gateway.md`

For a good example of this in the code, see @src/port-deck-retrieval/index.ts and the files it references.

The port is an interface, RetrieveDeckPort.

There are two adapters, ArchidektDeckToDeckAdapter and LocalFileAdapter, plus a compositional adapter, CascadingDeckRetrievalAdapter.

There is one gateway, ArchidektGateway. LocalFileAdapter is too simple to need a gateway.

The LocalFileAdapter deals with the storage mechanism (local files), while the domain uses "precon" to describe what the deck represents.

The adapter is initialized in @src/server.ts

The tests in @test/port-deck-retrieval/ test each of the adapters. Gateways do not get automated tests.

# A richer example: @src/port-spine/

`port-spine` shows the same pattern with every part exercised. It is split by **capability**,
not by direction — `join/` (table administration) and `events/` (the table's event bus).

Each port is domain-language: `JoinTablePort.join(JoinTableRequest): SeatAtTable`, and
`SpineEventsPort`, which covers **both directions of one capability** —
`announceCardPlayed`/`announceCardReturned`/`announceCardDiscarded` going out, and
`followTable(tableId, applyEvent, appliedThrough)` coming in.

Each capability has an **abstract adapter** — `SpineJoinAdapter`, `SpineEventsAdapter` —
holding all the translation (and, for events, the reconnect orchestration), with `Http*` and
`Fake*` subclasses supplying only transport. Because both subclasses inherit the identical
translation, a test watching the fake sees exactly the bytes the Spine would have seen.

There are fakes at **two levels**, and the difference is the point. `FakeSpineJoinAdapter` and
`FakeSpineEventsAdapter` are port-level: they stand in for the Spine in application tests.
`FakeSpineStreamGateway` is gateway-level: it fakes the *transport* (emit a frame, end the
stream, drop the connection), so the adapter's own reconnect logic can be tested for real.

`events/` has **two gateways**, because a stream shares nothing with a POST:
`HttpSpineEventsGateway` (`POST /tables/:id/events`) and `HttpSpineStreamGateway` (the SSE
read loop, the undici `Agent`, the frame parsing). All three gateways wrap their failures in
one shared `SpineGatewayError` — one service, one error type.

# Carry an identifier you didn't mint; don't learn to construct it

`tableUrl` stays on `SeatAtTable` in the join port, deliberately. It looks like transport
vocabulary surviving in a port, but it isn't: the Spine *mints* the table's URL, and the
Shuffler persists it and renders it as the "Go to Table" link.

Absorbing it into the adapter would force the Shuffler to **reconstruct** the URL, which means
learning the Spine's URL scheme — duplicating knowledge that belongs to another service, and
silently breaking the day the Spine changes its routes.

The general rule: when another service mints an identifier, address, or URL, **carry the value
through**. Do not teach this ship how to build it. A port hiding such a value is doing harm,
not encapsulation — the leak to avoid is the *construction rule*, not the string.

Applied to `seq`: the reconnect *cursor protocol* stops inside `SpineEventsAdapter`, but the
`seq` value itself is carried through — it is on the published envelope contract, and the
Shuffler durably records it as `GameEvent.spineSeq` so a torn-down subscription can resume.
