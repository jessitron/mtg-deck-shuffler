# The Spine sits in the middle

Mountain: spine-gathers-data
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
- **Envelope version mismatch — resolved** (`schema-schemes`, 2026-08-16): all three
  ships now validate/build against one `contracts/envelope.v1.json`. `traceparent` is a
  real, optional envelope field again (not header-only) — it rides on the envelope
  itself specifically so it survives the outbound SSE stream this map's subscribers
  will need, where there's no header to carry it. The Spine's `broadcast` attaches a
  live one at send time; it's never persisted to the log.
- Owners likely relevant: `fleet-is-observable` (trace-context propagation on any new
  outbound path — already consulted once by the absorbed map), `two-faced-cards`
  (card/face fields in any payload), `tabletop-shape-mechanics` (if the sender ends up
  reading shape state).

## Decisions so far

- [`spec.md`](spec.md) (2026-08-11) — the join-flow decision below, turned into a
  buildable spec (`Status: ready-for-agent`), ready for `/to-tickets`. It covers only
  the join-flow slice: it does **not** reach this map's other open fog (the Tabletop's
  Spine SSE subscriber, the Shuffler's own subscriber, or the Tabletop→Spine physics
  sender) — those stay open below. One judgment call the spec makes beyond the
  grilling answer: the Spine notifies the
  Tabletop with a direct HTTP call to its existing endpoint rather than building the
  general SSE subscriber now, to avoid throwing that design away when the real
  subscriber ticket lands.
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
  - **Sketch (2026-08-14, not yet a spec):** the Shuffler is HTMX, so it has no live
    connection of its own — a Spine subscription on the Node server doesn't reach an
    already-open browser tab by itself. Today the only place staleness is discovered
    is optimistic-concurrency-on-write: a tab's own POST comes back `409
    version-conflict` (`src/app.ts`'s `renderCommandOutcome`) if the server's version
    moved past what that tab expected. A card returned by the Tabletop isn't a write
    from this tab, so that path never fires — the browser needs an actual push. Shape
    discussed: Shuffler server subscribes to the Spine per-table SSE stream (or
    receives a direct call from it — mechanism TBD, doesn't matter for this sketch);
    on a relevant event it re-derives that game's state and pushes over a **per-game**
    SSE stream to browser tabs watching that `gameId` (not one global stream filtered
    client-side — keeps the server from fanning every event to every open tab). The
    browser tab subscribes via the htmx SSE extension and can reuse plumbing that
    already exists for the same-response case: applying a command today sets `HX-
    Trigger: game-state-updated` on the response, and `active-game-page.ts` has an
    element listening with `hx-trigger="game-state-updated from:body"` that re-fetches
    itself. An SSE-delivered `game-state-updated` event would drive that same
    listener, just triggered externally instead of by this tab's own response —
    same event name, same re-fetch, new trigger source. Touches the `animations`
    owner (changes when/how the game area re-renders) — consult `-context` before
    this becomes a spec.
- **What a failed async join looks like**, beyond "a message" — is failure itself worth
  a Shuffler-log event (symmetric with the success case), or purely a UI-only warning
  that isn't part of the game's narrated history? Not decided.
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
