# The Spine sits in the middle

Mountain: spine-tells-the-story
Type: wayfinder:map

## Destination

**A spec, ready for `/to-tickets`.** Every event either the Shuffler or the Tabletop
sends or receives crosses the Spine — no direct HTTP between the two apps survives.
Done when the decisions are made and written, not when the wiring is built.

**Absorbs [tabletop-table-reports](../tabletop-table-reports/map.md)** (map 5 of the
`tabletop-replaces-mural` mountain, closed 2026-08-11 with a pointer here) — that map's
job was "decide what the Tabletop tells the Spine, and how"; this map generalizes the
same question to both directions and both ships, so its remaining fog moved here rather
than living in two places.

## Notes

- Skills every session should consult: `/grilling`, `/domain-modeling`. Read
  `docs/agents/issue-tracker.md` before writing into the tracker.
- **Ship: fleet.** Cross-ship by nature — Shuffler, Tabletop, and Spine all change.
  Each ticket names the ships it actually reaches into.
- **The Spine itself is already built** (`.scratch/spine-roda-rewrite/`, all tickets
  done/resolved): `POST /join` (creates table + seat), `POST /tables/:id/events`
  (contract-validated ingestion, dedup, `seq`/`acceptedAt`), `GET
  /tables/:id/events/stream` (SSE, live outbound, one stream per table). That spec
  explicitly scoped out "wiring the other ships to it" — this map is that wiring.
- **Today's actual traffic** (investigated 2026-08-11): the Shuffler POSTs
  `card.played` and `seat.joined` straight to the Tabletop
  (`apps/shuffler/src/port-tabletop/sendToTable.ts`, both marked `// JES-128
  SCAFFOLDING — the seam the Spine absorbs`); the Tabletop POSTs card-return events
  straight back to a per-game inbox URL the Shuffler hands out
  (`.scratch/tabletop-cards-come-and-go/issues/01-return-channel.md`'s `eventsUrl`,
  explicitly built with "later, re-point at the Spine" in mind). The Shuffler
  separately best-effort-joins the Spine (`joinSpineTableBestEffort`) but that call is
  thin (`{name, playerName}` → `{tableId, seatNumber}`) and unrelated today to the
  richer direct `seat.joined` POST. **Nothing subscribes to the Spine's SSE stream**
  except its own admin screen.
- **Envelope version mismatch to reconcile somewhere in this map's tickets**: the
  Tabletop still validates against `envelope.v2.json` (expects `traceparent` in the
  body); the Spine's own gateway code already assumes `v3` (header-only inbound,
  `meta.traceparent` outbound over SSE).
- Owners likely relevant: `fleet-is-observable` (trace-context propagation on any new
  outbound path — already consulted once by the absorbed map), `two-faced-cards`
  (card/face fields in any payload), `tabletop-shape-mechanics` (if the sender ends up
  reading shape state).

## Decisions so far

- [The join flow: one administered, idempotent Spine call, async from the player's screen](issues/01-the-join-flow.md)
  (2026-08-11) — `seat.taken` and `seat.joined` stop being two independently-sent
  facts. The Shuffler makes one `join` call to the Spine carrying everything the table
  needs (deck name, playmat, sleeve, commanders, its own `gameUrl`); the Spine
  administers the whole thing (create table if absent, check room, assign seat, notify
  the Tabletop itself over its existing SSE pipe, return a table URL) and hands back
  success or failure. The `/game` screen renders immediately without waiting on this;
  the join happens after, and a successful join becomes an event in the **Shuffler's
  own** domain log (narration-visible), not just a silent state update. The call is
  idempotent, keyed by the Shuffler's own `gameId` + table name, so a retry or restart
  gets back the same table URL instead of a second seat.

## Not yet specified

- **The Tabletop's Spine SSE subscriber.** Killing the direct `card.played`
  POST (one atomic swap, decided 2026-08-11 — no side-by-side transition period) needs
  something on the Tabletop that doesn't exist yet: a live subscriber to the Spine's
  per-table SSE stream, dispatching received events into the same handling
  `cardArrival.ts` does today. Design not started.
- **The Shuffler's own Spine SSE subscriber**, symmetric to the above — the card-return
  channel (library portal drag) is in scope for rerouting through the Spine (decided
  2026-08-11), which means the Shuffler needs the same kind of subscriber the Tabletop
  needs, feeding into whatever replaces today's `eventsUrl` inbox handler. Design not
  started.
- **What a failed async join looks like**, beyond "a message" — is failure itself worth
  a Shuffler-log event (symmetric with the success case), or purely a UI-only warning
  that isn't part of the game's narrated history? Not decided.
- **The envelope v2/v3 reconciliation** — which ticket owns bumping the Tabletop off
  `v2`, and whether that's its own ticket or rides along with building its SSE
  subscriber (which will need to read `meta.traceparent` off the wire either way).
- **(Carried from tabletop-table-reports) The Tabletop→Spine sender for its own
  physics events** — `card.moved`, `card.repositioned`, taps, flips, counters. A
  data-flow direction that doesn't exist in code yet at all. The vocabulary/contract
  decisions for `card.moved`/`card.repositioned` are already made
  (`tabletop-table-reports` issues 01/02); what's missing is the actual sender, plus:
  - **The `gameId`/`playerName` identity gap** — whatever sends these needs both
    stamped on session/room state to read at fire time; `gameId` has never crossed
    into `apps/tabletop/src` today.
  - **Remaining physics payload schemas** — `card.tapped`/`untapped`, `card.flipped`,
    `card.turnedFaceDown`, `counter.attached` each need their own
    `payloads/<name>.v1.json`, following the pattern `card.moved`/`card.repositioned`
    already set.
  - **Whether other gestures need their own physical-layer event** — only card
    movement got one; whether e.g. a dragged counter needs `counter.repositioned` is
    undecided.

## Out of scope

- **Reconnect/catch-up on a dropped SSE connection** — for both the Tabletop's
  subscriber and the Shuffler's. Considered and ruled out by Jess (2026-08-11): the
  connection being replaced is plain HTTP POSTs with nothing to "miss" while
  disconnected, so parity with today's actual behavior doesn't require a subscriber
  to catch up on what it missed. She noted the Shuffler side looks more achievable
  than the Tabletop's if this is ever wanted later, but neither is needed now.
- **A freeform-doodle snapshot store** — considered and rejected by the absorbed map
  (2026-08-10): the fleet's persistence is event-sourced, not snapshotted; a snapshot
  store would quietly contradict that.
- **Sampling a physical event's full path/route, per-point timing, or a drag-duration
  field** — rejected by the absorbed map: only start/end position carries signal worth
  the complexity.
- **Computing which shapes are near a card at landing, inside the physical event
  itself** — a cross-shape join, fully reconstructable later from position data; not
  designed preemptively.
- **The replay-on-boot mechanism** — this map's events are what a replay would
  consume; building the replay logic is separate, later work.
