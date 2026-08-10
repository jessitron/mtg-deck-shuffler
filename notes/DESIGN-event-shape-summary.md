# The Spine's Event Shape (v0) — summary for discussion with Eric

Status: **snapshot, 2026-08-10** — a presentation-oriented summary of the current event
contract, distilled for a whiteboard/Mural conversation. The decision log with full
reasoning (why each field is shaped the way it is, the numbered decisions, the rounds of
commentary) lives in `DESIGN-event-contract-v0.md` — this doc restates the *current state*
without the history, so it's easy to paste somewhere and talk through. If the two ever
disagree, the decision log is the source of truth; update this snapshot to match.

## 1. The envelope — every event wears this

One append-only log per Table. Every event is a JSON envelope; `name` determines which
payload schema applies.

| field | who writes it | purpose |
|---|---|---|
| `id` | sender (GUID) | idempotency key — a retried duplicate is elided, not re-appended |
| `tableId` | sender (after learning it) | which table's log — a GUID the Spine mints at table creation |
| `seq` | **Spine**, on append | authoritative order within the log; senders cannot claim a position |
| `name` | sender | namespaced kind (`card.played`) — determines the payload schema |
| `acceptedAt` | **Spine**, on append | the Spine's clock: when the log accepted it |
| `occurredAt` | sender, optional | the sending app's clock, when physics preceded ingestion |
| `initiator` | sender | who made this happen: `{ seatId?, playerName }` — a seated player or a named spectator |
| `occurredIn` | sender | which app recorded it: `shuffler` \| `tabletop` \| `spine` (later: `interpreter`) |
| `visibility` | sender | `public` — the only legal value in v0 |
| `traceparent` | sender | W3C trace context — **observability only**, never durable causality; expires in ~60 days |
| `schemaVersion` | sender | integer version of this `name`'s payload schema |
| `payload` | sender | the kind-specific body |

**The split in one line:** uniqueness travels with the event (sender-minted `id`);
truth-of-order and truth-of-time stay with the log (Spine-assigned `seq`, `acceptedAt`).

## 2. Card identity — two levels, used in every card-carrying payload

- **Definition** — `scryfallId`: the exact printing (oracle identity, all faces/names, all
  images derivable). Two players' Forests share one `scryfallId`.
- **Instance** — `instanceId`: *this particular* Forest — a GUID minted per card, per game,
  at game start. Game-mechanically interchangeable; log-wise a distinct individual,
  trackable through played → tapped → graveyard.
- **Face** rides alongside as its own field (`front`/`back`) — card *state*, not identity
  (MDFCs are played as a chosen face).

`card: { scryfallId, instanceId }` + sibling `face` wherever the event needs it.

## 3. The v0 event catalog — 4 kinds

### `table.created` — a table came into being

Sent by: the Spine itself (in response to `POST /tables`), never ingested through the
events endpoint.

```json
{
  "id": "3f9a...", "tableId": "98503952-...", "name": "table.created",
  "seq": 1, "acceptedAt": "2026-08-10T20:22:53.7Z",
  "initiator": { "playerName": "Jess" },
  "occurredIn": "spine", "visibility": "public",
  "traceparent": "00-1680bb.....-01", "schemaVersion": 1,
  "payload": { "name": "Friday Night", "creator": "Jess" }
}
```

### `seat.taken` — someone sat down (Spine-minted seat identity)

Sent by: the Spine itself, in response to `POST /tables/:id/seats`. As of today, **the
Spine assigns the seat number** — the caller only supplies who's sitting down; the Spine
picks the next open slot, 1–4.

```json
{
  "id": "8c21...", "tableId": "98503952-...", "name": "seat.taken",
  "seq": 2, "acceptedAt": "2026-08-10T20:23:01.1Z",
  "initiator": { "playerName": "Jess" },
  "occurredIn": "spine", "visibility": "public",
  "traceparent": "00-1680bb...-01", "schemaVersion": 1,
  "payload": { "seatId": "d303142a-...", "seat": 1, "playerName": "Jess" }
}
```

### `seat.joined` — a seat's *look* arrives at the table (Tabletop-facing, richer)

Sent by: the Shuffler, at Shuffle Up — before any card, so the Tabletop can draw the
whole player area first.

```json
{
  "id": "a771...", "tableId": "98503952-...", "name": "seat.joined",
  "initiator": { "seatId": "abc12345", "playerName": "Jess" },
  "occurredIn": "shuffler", "visibility": "public",
  "traceparent": "00-1680bb...-01", "schemaVersion": 1,
  "payload": {
    "deckName": "Blame Game",
    "playmatImageUrl": "https://mtg.jessitron.honeydemo.io/images/aeoe-6-seam-rip.png",
    "sleeveColor": "#8b2f5c",
    "commanders": [
      { "card": { "scryfallId": "11111111-...", "instanceId": "22222222-..." },
        "cardName": "The Tenth Doctor", "frontImageUrl": "https://...", "backImageUrl": null }
    ]
  }
}
```

### `card.played` — a game event, from the Shuffler's own deterministic model

Sent by: the Shuffler, on `/play-card`/`/discard-card`. The Shuffler *knows* the meaning
of what happened (it's not observed/inferred), so it says so directly.

```json
{
  "id": "1f87...", "tableId": "98503952-...", "name": "card.played",
  "initiator": { "seatId": "d303142a-...", "playerName": "Jess" },
  "occurredIn": "shuffler", "visibility": "public",
  "traceparent": "00-1680bb...-01", "schemaVersion": 1,
  "payload": {
    "card": { "scryfallId": "11111111-...", "instanceId": "22222222-..." },
    "face": "front", "zoneHint": "stack",
    "frontImageUrl": "https://cards.scryfall.io/normal/front/1/1/11111111-....jpg",
    "backImageUrl": null, "cardName": "Lightning Bolt",
    "owner": "d303142a-...", "isCommander": false, "gameCardIndex": 0
  }
}
```

## 4. Key design decisions (worth flagging as decisions, not accidents)

- **Game event vs. physical event.** The Shuffler is deterministic and knows meaning →
  `card.played` directly. Physical/observed happenings (the Tabletop's world, and later
  the Interpreter's readings) are a *separate* category — reserved for genuinely ambiguous
  stuff, not yet built in v0.
- **The shadow.** A private fact (which card was drawn) may never reach the Spine at all —
  only its public shadow ("seat 2 drew a card"). v0 ships zero seat-private events; the
  mechanism is reserved, not exercised yet.
- **`scope` deliberately deferred.** A "what does this affect / who perceives it"
  dimension is real but not modeled until we have enough instances to know its shape.
  `name` alone (namespaced: `card.played`) carries v0.
- **Versioning: fail loud, no upcasting.** Unknown `name`/`schemaVersion` is rejected
  outright — a deploy can invalidate an in-flight table. Deliberate tradeoff, not an
  oversight.

## 5. What's actually live today (as of 2026-08-10)

- **Real, running, verified end-to-end**: `table.created`, `seat.taken` (auto-assigned
  number), `card.played` — all flowing from the Shuffler into a real Spine, visible on
  `/admin/tables`.
- **Not yet flowing to the Spine**: `seat.joined` still only goes Shuffler → Tabletop
  directly (pre-Spine scaffolding); Tabletop's physical events (tap/flip/move) exist as
  OTel spans only, never persisted or sent anywhere; the Interpreter, voice events, and
  chat events don't exist yet.
