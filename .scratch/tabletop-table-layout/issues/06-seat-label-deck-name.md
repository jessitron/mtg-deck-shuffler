# Show the deck name with the player name above the playmat

Mountain: tabletop-replaces-mural
Type: grilling
Status: resolved

## Question

`TODO.md`'s `seat-label-deck-name` line: "have the player name include the deck name,
above the playmat on the Tabletop." Does `seat.joined` already carry a deck name
end-to-end the way it carries `playmatImageUrl`/`cardBackImageUrl` (per
`linear-wind-down` cluster 07's finding that transport), or does this need a new field
threaded from the Shuffler's prep screen through to `seatJoined.ts`? That's the open
question — the label rendering itself, once the data exists, is small.

Unblocked — no dependency on the other tickets in this map.

## Answer

Deck name does **not** flow end-to-end today — it stops at the Shuffler. Needs a new field
threaded through five spots:

1. **Shuffler construction** — `Deck.name: string` exists (`apps/shuffler/src/types.ts:43`)
   and `prep.deck` is in scope right at the `sendSeatJoinedBestEffort` call site
   (`apps/shuffler/src/app.ts:531,538`), but that call's signature
   (`apps/shuffler/src/port-tabletop/sendToTable.ts:58-65`) only takes
   `tabletopPort, tableName, seatId, playerName` — no deck name passed. Also called at
   `app.ts:656`.
2. **Event type** — `buildSeatJoinedEvent()` and `SeatJoinedEvent`
   (`apps/shuffler/src/port-tabletop/types.ts:136-159`) carry only
   `id, name, occurredAt, initiator{seatId,playerName}, playmatImageUrl?, cardBackImageUrl?`.
   No deck-name field.
3. **Contract** — there is no `seat.joined` JSON Schema in `contracts/payloads/` at all;
   only `seat.taken.v1.json` exists (`seatId, seat, playerName`,
   `additionalProperties: false`), also without a deck-name field. A new field needs a new
   or extended schema.
4. **Tabletop consumption** — `SeatJoined` interface and `validationError()`
   (`apps/tabletop/src/server/seatJoined.ts:16-37`) only recognize the same fields as (2);
   anything extra is currently silently ignored, not rejected. `handleSeatJoined` forwards
   only `playerName` and the two image URLs into `ensurePlayerArea` (lines 80-83).
5. **Tabletop rendering** — the name label on the table uses `playerName` only
   (`apps/tabletop/src/server/tableFurniture.ts:250`, `toRichText(playerName)`); no
   deck-name label exists there yet.

**Spine** has no `seat.joined` handling at all yet (per comments in `seatJoined.ts:7-14`),
so no change needed there for this ticket.

The label-rendering itself (once the data exists) is small, as suspected — the real work is
threading the field through (1)-(5). Not resolved here: whether to add it to the existing
`SeatJoinedEvent`/`seatJoined.ts` shape or design a fresh contract-backed `seat.joined`
schema first (there currently is none, unlike `seat.taken.v1.json`). That's implementation
work, not a further decision this ticket needs to make — the open question ("does it already
flow?") is answered: no.
