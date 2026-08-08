# Send-then-commit: playing a card to the Tabletop (JES-127)

This is the canonical statement of the protocol. The code comments at each station
point here; if the protocol changes, change this file and the stations together.

## The invariant

At a table, `/play-card` and `/discard-card` send the card to the Tabletop **first**;
the Shuffler mutates and persists its own game state **only after the send succeeds**.
A failed send blocks the whole action: the card stays in hand, the player sees an
error modal explaining exactly that.

Why this order: a play that silently missed the tabletop is worse than one that says
it failed. The other players' shared reality is the table — if the card isn't there,
it wasn't played.

Retry safety: a fresh event id is minted per send attempt, and the Tabletop dedups on
`cardInstanceId`, so re-sending after an ambiguous failure (sent but not acknowledged)
is a physical no-op on the table.

Contrast: `seat.joined` (JES-140) is the opposite discipline — **best-effort**, never
blocking, because the Tabletop self-heals a missing player area. Send-then-commit is
only for actions where the table's copy is the point.

## The stations, in the order a failure travels

1. **The send** — `src/port-tabletop/sendToTable.ts`, `sendCardToTableFirst()`.
   Throws on any failure (no table configured, no `TABLETOP_URL`, HTTP error).

2. **The abort** — `src/app.ts`, `sendCardBeforeMutate()`, the shared `beforeMutate`
   closure for both routes. Catches the send failure, records it (span error +
   `log.error`), renders the error modal HTML, and throws `TableSendFailedError`
   carrying that HTML.

3. **The protocol** — `src/apply-game-command.ts`. `beforeMutate` runs after the
   status/version checks and before `mutate`; `TableSendFailedError` is caught into
   the `{ kind: "send-failed", errorHtml }` `CommandOutcome`. Nothing was mutated,
   nothing persisted. Any other error still propagates uncaught.

4. **The response** — `src/app.ts`, `renderCommandOutcome()`'s `"send-failed"` case:
   status **502**, `HX-Retarget: #modal-container`, `HX-Reswap: innerHTML`, body =
   the error modal HTML. (502 because the upstream Tabletop failed us.)

5. **The browser's permission to render it** — `src/view/common/html-layout.ts`,
   `htmx.config.responseHandling`: `{code: "502", swap: true, error: true}`.
   `swap: true` lets the modal HTML land; `error: true` keeps
   `event.detail.successful` false, which station 6 relies on.

6. **The modal choreography** — `src/view/play-game/game-modals.ts`. The Play/Discard
   button's `hx-on::after-request` always closes the card modal, but closes
   `#modal-container` only `if (event.detail.successful)` — on failure the error
   modal (`formatTabletopSendErrorModal`, same file) must stay visible or the
   explanation vanishes.

## Testing the failure path

`FakeTabletopGateway` (`src/port-tabletop/FakeTabletopGateway.ts`) can be told to
fail — that's how the failure path is exercised without a broken network.
