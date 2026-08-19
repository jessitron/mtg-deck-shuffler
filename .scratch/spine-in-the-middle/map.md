# The Spine sits in the middle

Mountain: spine-gathers-data
Type: wayfinder:map

status: DONE, for what's documented here and not canceled.
However, this is only a start at the mountain. Both tabletop and Shuffler need SSE streams.

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

## Not yet specified

- ~~**The Tabletop's Spine SSE subscriber.**~~ Specced:
  `.scratch/tabletop-spine-sse-subscriber/spec.md` (2026-08-16, `ready-for-agent`) — one
  subscription per room, opened on the first `seat.joined`'s `tableId`, replacing the
  direct `card.played` POST in the same atomic swap. Ready for `/to-tickets`.
- ~~**The Shuffler's own Spine SSE subscriber.**~~ Grilled:
  `.scratch/shuffler-spine-sse-subscriber/answer.md` (2026-08-18, `Status: resolved`) —
  turned out the card-return channel is entirely unbuilt, not a reroute of a live one, so
  the answer covers the whole wiring: the Tabletop's send to the Spine, the Shuffler's new
  per-game subscriber, and a new browser-facing per-game SSE push reusing the existing
  `HX-Trigger: game-state-updated` plumbing. Ready for `/to-spec`. Also settled in this
  session, fleet-wide, fixed in place across every affected doc (not just here): the
  `gameCardIndex`- and `gameId`-may-not-cross-the-boundary rules are both gone for good —
  `gameCardIndex` is now this design's actual wire identity, which is also what resolves
  the "no instanceId→GameCard lookup exists" gap the research pass turned up.

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
- any sort of async join call from shuffler. No, it's synchronous.
