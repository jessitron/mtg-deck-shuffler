# Round-trip identity and today's actual boundary behavior

Mountain: tabletop-replaces-mural
Ship: fleet
Type: research
Status: resolved

## Question

Facts the other tickets' decisions want, all answerable by reading this repo:

1. **Re-play after return.** The Tabletop dedups card arrivals on `meta.instanceId`
   (`GameState.ts:192`: "stable across requests once assigned (the Tabletop dedups on
   it)"). When a card returns to the Shuffler (Reveal zone) and is later played again:
   does it keep the same instanceId, and would the Tabletop's dedup silently swallow the
   second arrival? Trace `cardArrival.ts` and the Shuffler's instanceId assignment.
2. **Restart today.** The decision is "restart/new game clears the table entirely, same
   table name." What actually happens now — does the Tabletop clear old cards and
   furniture on the Shuffler's start/restart push, or do they linger? Trace the
   start/restart path end to end.
3. **The boundary inventory.** Sweep `GameState.ts` for every transition into or out of
   the `Table` location. Charting believes the complete list is: play and discard (in),
   undo-of-play and undo-of-discard (out, currently pushed nowhere). Confirm or extend —
   any other action that moves a card to or from `Table`?

## Answer

Researched 2026-08-08 by reading code only. All paths repo-relative.

### 1. Re-play after return: same instanceId, and yes — the dedup swallows it

**How instanceId is assigned.** `cardInstanceId` is minted once per card per game in
`GameState.newGame` (`apps/shuffler/src/GameState.ts:124`, `randomUUID()`), with
mint-on-load for pre-JES-128 saves (`GameState.ts:193-197`). It survives persistence
round-trips — `dehydrateGameCards`/`hydrateGameCards` both carry it
(`apps/shuffler/src/port-card-repository/hydration.ts:105` and `:123`) — and **nothing in
`GameState.ts` ever re-mints it during a game**. Moving a card between locations only
writes `gameCard.location` (`GameState.ts:446`); identity is untouched. So a card that
left the Table for the Revealed zone and is played again sends the **same instanceId**.

**What the Tabletop's dedup does.** `handleCardArrival`
(`apps/tabletop/src/server/cardArrival.ts:100-115`) has two dedup layers:
1. *Event id* (`cardArrival.ts:103`) — catches a retried request. Irrelevant to re-play:
   `buildCardPlayedEvent` mints a fresh event id per attempt
   (`apps/shuffler/src/port-tabletop/types.ts:79`).
2. *Instance on table* (`cardArrival.ts:110`, via `instanceAlreadyOnTable`,
   `cardArrival.ts:65-69`) — scans the room's **live tldraw snapshot** for any shape with
   `props.instanceId === arrival.card.instanceId`. If found: `200 {deduped:true}` and no
   shape is placed.

**The verdict.** The dedup keys on *shape presence on the board*, not on history. Two cases:
- If the card's shape is **still on the board** (which is today's reality: the Shuffler-side
  "Return" pushes nothing to the Tabletop, and Shuffler undo pushes nothing either — see
  question 3), a re-play is swallowed: the Tabletop returns 200, `HttpTabletopGateway`
  treats any 2xx as success (`apps/shuffler/src/port-tabletop/HttpTabletopGateway.ts:22`),
  send-then-commit proceeds, and the Shuffler moves the card to `Table` while the board
  shows nothing new. **This failure mode is reachable today**: card modal → Return
  (Table→Revealed) → Play again.
- If the shape was **removed from the board** (a player deleted it, or a future "card left
  the table" event removes it), the second arrival passes dedup and lands as a fresh shape
  with the same instanceId. So a real return channel that deletes the shape makes re-play
  work with no identity change needed — the dedup is exactly "one instance exists once,
  physically" (`cardArrival.ts:108-109`).

### 2. Restart today: old cards and furniture linger; nothing clears

**Shuffler side.** `POST /restart-game` (`apps/shuffler/src/app.ts:585-652`) loads the old
game, carries `tableName`/`playerName`/`seatId` forward (`app.ts:619-626` — same seatId,
from the old game or the prep), builds a **brand-new** `GameState` via `newGame`
(`app.ts:630`) — which mints **fresh cardInstanceIds for every card** (`GameState.ts:124`)
— and sends exactly one thing to the Tabletop: `sendSeatJoinedBestEffort` (`app.ts:637`;
same at `/start-game`, `app.ts:519`, and dev fast-start, `app.ts:1615`). There is no
"clear table", "game restarted", or any card-removal message anywhere in
`src/port-tabletop/` — the port has only `sendCardToTable` and `sendSeatJoined`.

**Tabletop side.** `handleSeatJoined` (`apps/tabletop/src/server/seatJoined.ts:72-77`)
sees the seatId already in `entry.seats` and returns `200 {deduped:true,
"seat-already-seated"}` — a deliberate physical no-op. `ensurePlayerArea`
(`apps/tabletop/src/server/tableFurniture.ts:140-141`) is idempotent on seatId and returns
the existing area untouched. **No code path anywhere deletes shapes**: `cardArrival.ts`
only `store.put`s; `rooms.ts` deliberately never evicts an emptied room
(`apps/tabletop/src/server/rooms.ts:84-87`).

So on restart today: the furniture stays (fine — same seat, same geometry), and **every
card from the previous game lingers on the board**. The new game's plays arrive with fresh
instanceIds, so they are *not* deduped — they stack alongside the old ones, and the layout
counters keep incrementing from where the old game left them (`PlayerArea.landCount`/
`graveyardCount` in `rooms.ts:39-40`, `stackCountByRoom` in `cardArrival.ts:63`), so new
cards cascade after the old ones' positions. The only thing that clears a table is a
Tabletop **process restart** — rooms are in-memory only (`rooms.ts:28-30`).

**Gap vs. the decision**: the charted decision "restart/new game clears the table
entirely, same table name" is *not* today's behavior. It needs a new message (a clear/
table-reset event) and Tabletop-side shape deletion — neither exists yet.

### 3. Boundary inventory: charting's list is incomplete — Return is live today

Every transition touching `location.type === "Table"` in `apps/shuffler/src/GameState.ts`:

**Into Table (2, as charted):**
- **Play** — `playCard`, `GameState.ts:533`: `moveCard(cardToPlay, { type: "Table" })`,
  from Hand or Revealed (guard at `:523`).
- **Discard** — `discardCard`, `GameState.ts:563`: same move with verb `"discard"`, from
  Hand only (guard at `:555`).

**Out of Table (2 charted + 1 missed, and the missed one is live UI):**
- **Undo of play / undo of discard** — `undo`, `GameState.ts:806-834`: reversing a
  `"move card"` event replays it backwards via `executeMove` (`GameState.ts:826-827`),
  so a play/discard undo moves the card Table→Hand (or Table→Revealed). Pushed nowhere,
  as charted.
- **MISSED BY CHARTING — "Return" (Table→Revealed), in the UI today.**
  `moveByGameCardIndex` (`GameState.ts:586-611`) has **no location guard** — it moves any
  card from wherever it is. The card modal for a Table-located card offers exactly one
  action, **Return**, which POSTs `/reveal-card`
  (`apps/shuffler/src/view/play-game/game-modals.ts:187-199`, wired via the location
  switch at `:210-211`); the route calls `moveByGameCardIndex(index, "Revealed")`
  (`apps/shuffler/src/app.ts:1165`). So Table→Revealed is a shipping feature, not a
  hypothetical — and it sends nothing to the Tabletop, which is what arms the
  question-1 dedup trap.
  - The sibling routes `/put-in-hand`, `/put-on-top`, `/put-on-bottom`
    (`app.ts:1176-1230`) would equally move a Table card out (same unguarded
    `moveByGameCardIndex`) if handed a Table card's index, but the UI only offers them
    for Hand/Revealed/Library cards — reachable by crafted request only.

Nothing else touches Table: `shuffle`/`mulligan` operate on Library/Hand only, `reveal`
guards on Library position (`GameState.ts:572-584`), `draw` takes library top, and
`flipCard` changes face without moving. `validateInvariants` exempts Table from position
uniqueness (`GameState.ts:233`) — Table is the one positionless zone (`GameState.ts:741`,
`:778`).
