# Context Map

The index of this fleet's bounded contexts, plus the **translations table**: terms that mean
different things — deliberately, not by accident — in different ships. Read `docs/agents/domain.md`
for how this file fits with `notes/GLOSSARY.md` and each ship's own `CONTEXT.md`.

**When you notice a term diverging across a ship boundary, add it here.** Silently assuming one
ship's meaning holds in another is the failure this file exists to prevent.

## Contexts

- **Shuffler** (`apps/shuffler/`) — the original app: deck manager and game screen, hidden zones
  (library, hand). Its vocabulary is presented to players (UI subdomain) and optimized to make
  invalid state unrepresentable (Game State subdomain).
- **Tabletop** (`apps/tabletop/`) — the tldraw-based shared canvas. Its language is the *physics*
  of Magic — card identity, zone geography, gestures — never card meaning.
- **Spine** (`services/spine/`) — the central bounded context: Tables, Seats, one append-only
  event log per table. Its language is the published language the other contexts translate
  themselves into.
- **Interpreter** — the translation layer from Tabletop physics to Spine meaning (planned; lives
  inside the Spine app for now).
- **Archidekt** — external domain, an API we call.
- **Scryfall** — external, industry-standard domain (the card database), standardized by Wizards.

Full descriptions of each context are in `notes/GLOSSARY.md` § Bounded Contexts. Ship-local terms
that don't cross a boundary belong in that ship's own `CONTEXT.md` (none exist yet — created
lazily as terms get resolved).

## Translations

### Game (Shuffler) ↔ Seat (Spine, Tabletop)

A **Game** in the Shuffler is the active gameplay session tracking one player's card positions.
It corresponds to a **Seat** at a **Table** in the Spine and Tabletop's vocabulary — a player's
place at the shared table. "Game" keeps its Shuffler meaning inside that context; the Shuffler
translates itself into "seat" at the boundary (`seat.joined`, `seatId`). The Spine never sees the word Game: the Shuffler sends its game id as `/join`'s opaque `joinRequestId`, an idempotency key meaning "this join attempt" (`contracts/requests/join.v1.json`). See `notes/GLOSSARY.md`'s
"Game (MTG Deck Shuffler)" and "Seat" entries.

### Flip / Transform / Face-down

Two independent axes on the Tabletop — see `notes/GLOSSARY.md`'s "Transform" and "Face-down" entries:

- **`face`** — which *printed* side of a card is up (`front`/`back`). Ranges only over sides that
  actually exist on the card; unreachable/meaningless on a one-faced card. The gesture that moves
  it is **Transform**, offered only on two-faced cards.
- **face-down / concealment** — showing the shared card back instead of either printed face. An
  independent axis that composes with `face`: **Turn Face Down / Turn Face Up** works on every card,
  with no second-side gate. A two-faced card can be turned face down (or played face down), and
  once face-down its `face` is irrelevant to what's rendered.

**"Flip" is a Shuffler-only word.** The Tabletop never says it — deliberately, not a bug to reconcile:

| | Shuffler | Tabletop |
|---|---|---|
| Word | "flip" | **Transform**, and separately **Turn Face Down / Up** |
| What it is | private **inspection** of the other printed face of a two-faced card; never leaves the Shuffler | Transform: swap the printed face of a two-faced card, a **physical event** (`card.transformed`). Turn Face Down/Up: **concealment** |
| One-faced card | **cannot** flip — nothing to flip to, no affordance rendered (`formatCardContainer()` branches on `card.twoFaced`; `GameState.flipCard()` throws on a single-faced card) | **cannot** Transform; it can only Turn Face Down — every card on a table has a back |
| Two-faced card | swaps `currentFace`; not persisted on prep, persisted in game; **not** an event | Transform swaps `face` — NOT face-down; Turn Face Down is separate |
| Face-down modeled at all? | **no** — nothing in `CardDefinition`, `GameCard`, or the event contract expresses concealment | **yes** — `faceDown: boolean` on the `mtg-card` shape's `props`, toggled via the card's context menu |
| Recorded as an event? | no — flip is a UI concern | yes, intended: both gestures are physical, so the Spine can hear them |

The Shuffler's behavior is unchanged by this decision; the asymmetry is the point. Face-down is
concealment and exists only on the Tabletop; Transform is the Tabletop's physical counterpart of
what the Shuffler calls flip.

Source of record for the Tabletop side of this table: `owners/two-faced-cards/tabletop.md` § "Face
and face-down are two axes". Consult the `two-faced-cards` owner before changing
card-face/face-down behavior on either ship.

A "Play Face-Down" button for the Shuffler was considered and dropped as out of scope (tracked
separately, not part of this translation) — the Shuffler's lack of a face-down concept is a
real, decided gap, not an oversight waiting to be filled by this file.

### Initiator (Shuffler, Spine, Tabletop) — decided 2026-08-19, not yet built

`initiator` isn't one payload reused verbatim across contexts. Each context's own `initiator`
concept carries exactly the identifiers *that context* needs to anchor identity locally; only
the fields meaningful to the recipient cross a boundary onto the wire.

| | Shuffler | Spine | Tabletop |
|---|---|---|---|
| `initiator` shape | `{ gameId, seatId, sessionId }` | receives/validates the wire shape; doesn't hold its own | `{ seatId?, sessionId }` (when it originates events itself, planned) |
| Durable anchor | `gameId` — never leaves the Shuffler, survives a refresh already | — | none — hence `sessionId`/its anonymous form must itself survive a refresh |
| `sessionId` lifetime | free to reset every page load, since `gameId` already anchors identity | passthrough | must persist across a refresh (client-side storage) |
| Unseated case | n/a — every Shuffler game has a `gameId` | n/a | **Anonymous Session** — no `seatId`, a client-generated pseudonym (`anonymous-hippo-234134tr`) serves as both `sessionId` and display label |

- **`initiator` conveys attribution, never authority.** This fleet has no permission system —
  a seated player, an anonymous Tabletop visitor, or a stranger with a stale link can all act
  freely. `seatId`/`sessionId` exist so later interpretation can say who did what, not to
  decide who's allowed to.

### Owner (Tabletop payload) ≠ Initiator (envelope)

`owner` on the `card.played` payload answers "whose deck is this card in". `initiator` answers "who caused this event."
