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
translates itself into "seat" at the boundary (`seat.joined`, `seatId`). See `notes/GLOSSARY.md`'s
"Game (MTG Deck Shuffler)" and "Seat" entries.

### Flip / Face-down

Two independent axes — see `notes/GLOSSARY.md`'s "Face-down" entry for the full model:

- **`face`** — which *printed* side of a card is up (`front`/`back`). Ranges only over sides that
  actually exist on the card; unreachable/meaningless on a one-faced card.
- **face-down / concealment** — showing the shared card back instead of either printed face. An
  independent axis that composes with `face`: Flip and Turn-face-down/up are two separate
  gestures — Flip swaps the printed face (gated on having a second printed side), while
  Turn-face-down/up toggles concealment uniformly with no such gate. So a two-faced card
  *cannot* turn face down as part of its Flip action, but it absolutely **can** be turned
  face down (or played face down) via the generic gesture — and once face-down, its `face`
  is irrelevant to what's rendered.

**"Flip" does not mean the same thing on the two ships — deliberately, not a bug to reconcile:**

| | Shuffler | Tabletop |
|---|---|---|
| What "flip" is | **inspection** of a two-faced card | **turning over** a physical object |
| One-faced card | **cannot** flip — nothing to flip to, no flip affordance rendered (`formatCardContainer()` branches on `card.twoFaced`; `GameState.flipCard()` throws on a single-faced card) | **can** be turned over — every card on a table has two sides |
| Turning over a one-faced card | not a thing | shows the card back → **the card is now face down**, a real domain event in game terms |
| Turning over a two-faced card | swaps `currentFace`; not persisted on prep, persisted in game; **not** an event | a **transform** to the other printed face — NOT face-down |
| Face-down modeled at all? | **no** — nothing in `CardDefinition`, `GameCard`, or the event contract expresses concealment | **yes** — `faceDown: boolean` on the `mtg-card` shape's `props`, toggled via the card's context menu |
| Recorded as an event? | no — flip is a UI concern | yes, intended: turning over on the table is physical, so the Spine can hear it |

The Shuffler's behavior is unchanged by this decision; the asymmetry is the point. A Tabletop
gesture that "flips" a card has to decide *which* axis it moves — for a one-faced card only the
face-down axis exists.

Source of record for the Tabletop side of this table: `owners/two-faced-cards/tabletop.md` § "Face
and face-down are two axes" and § "The two ships mean different things by 'flip'". Consult the
`two-faced-cards` owner before changing card-face/face-down behavior on either ship.

A "Play Face-Down" button for the Shuffler was considered and dropped as out of scope (tracked
separately, not part of this translation) — the Shuffler's lack of a face-down concept is a
real, decided gap, not an oversight waiting to be filled by this file.
