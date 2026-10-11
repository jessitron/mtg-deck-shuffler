# ADR-0021 — The fiber outfit: suspension only at stage boundaries

**Status:** accepted

## Context

Under the inline outfit, waiting is honest but serial: a party of five children each
waiting five minutes waits twenty-five, an owner blocked on a waiting child unwinds
and re-enters, and a member parked on mail is freed only in a later round. What was
wanted is one reactor over the tree — without a second concurrency model leaking
into stage bodies, and without anything observable ever living inside a fiber.

## Decision

**`Journey.fiber_outfit` derives an outfit whose drives run as fibers of one reactor
concierge — a pair handed out together** (the conveyance reads the desk off the
outfit and refuses to drive without one).

- Each drive is a **guest** in the desk's **lobby**: running, parked on a wait, or
  waiting on guests it sent ahead. One clock and one `select` cover every parked
  journey — five waits of five minutes take five minutes; an owner blocked on a
  waiting child stays blocked instead of unwinding; a member parked on mail is freed
  by the sibling that posts it inside the same rejoin round (`RollCall` asks a
  multi-drive conveyance to run rounds **abreast** — offered as a capability, never
  required).
- **A guest suspends only at a stage boundary**, where the wait is already on the
  registers — so nothing observable ever lives in a fiber, and this is the
  *ephemeral* suspension tier ([ADR-0004](0004-a-boundary-is-a-consistency-point.md))
  in its intended home. Restarts (resuming a child mid-stage) remain deliberately
  out until something can suspend *inside* a stage.
- **When the desk can make no progress it unwinds**: every parked guest resumed with
  the verdict the base concierge would have given, every drive returned, the tree at
  rest exactly where the inline outfit would have left it. Suspension is an
  optimization over re-entry — never a fifth outcome, never a new state.
- Everything else — stages, registers, listener events, mail claims — is identical
  to the inline loop by construction and by test.

## Consequences

- **Write journeys the same way under either outfit.** The lockstep promise is
  checked, not asserted: the inline drive parks where the fiber outfit suspends, and
  a spec green under the inline courier and test concierge is evidence about
  production behavior.
- `traverse(wait: false)` travels into excursed children and rejoined parties — they
  are part of the same drive.
- The lobby is the first concrete form of "the journey stack as an outfit element,"
  which tree walks ([ADR-0018](0018-the-tree-walk-belongs-to-the-outfit.md)) ask.
