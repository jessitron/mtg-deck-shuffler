---
name: two-faced-cards
kind: feature
---

# Two-Faced Cards — a fleet-scoped feature owner

## The Charge

**A card has faces; face is state, not identity.**

Identity is the Scryfall ID — it captures the exact printing, all faces, all names,
all image URIs. Which face is showing is *state* that travels with the card instance,
matters at play time (MDFCs are played as a chosen face), and is never part of the
card's identity.

**And face is two axes, not one** (decided 2026-08-07): **`face`** (`front`|`back` — which
*printed side* is chosen) is orthogonal to **face-down** (concealment — the identity is
hidden, and it looks like a card back or sleeve *even on a two-faced card*). A one-bit
"which side is up" model was proposed and rejected. So `face: "back"` is unreachable on a
one-faced card; a one-faced card turned over is **face-down**, not `face: back`.

**"Flip" does not mean the same thing on the two ships.** On the Shuffler, flip is
*inspection of a two-faced card* — a one-faced card cannot be flipped and shows no flip
affordance. On the Tabletop, *any* card can be turned over, because a card on a table is a
physical object with two sides; turning over a one-faced card puts it **face down**, which
is a real domain event. Full table in `CONTEXT-MAP.md`'s "Flip / Face-down" translation (root
of the repo); this owner's own copy of it lives in [tabletop.md](tabletop.md).

Every component of the fleet that touches cards must hold this:

- **Shuffler** — tracks `currentFace` on each GameCard, renders flip buttons, sends
  the current face when a card leaves its boundary. The bulk of this knowledge base
  (architecture, interactions, files, history) is Shuffler-component knowledge.
- **Tabletop** — renders the *played* face on arrival. **Ticket 12 landed
  (2026-08-08)**: the card is now a genuine custom `mtg-card` tldraw shape (`BaseBoxShapeUtil`)
  carrying `frontImageUrl`, `backImageUrl | null`, `face`, and `faceDown` in validated,
  migratable `props`, and it renders its own `<img>` — no per-instance tldraw image asset is
  minted anymore. The arrival payload was unbaked to match: `card.played`'s scaffolding
  `imageUrl` field is gone, replaced by `frontImageUrl` + `backImageUrl: string | null`
  (`buildCardPlayedEvent` in `apps/shuffler/src/port-tabletop/types.ts`). **Physics ticket 06
  resolved (2026-08-08)** the two questions that were open here: the trigger is two separate
  context-menu items ("Flip" / "Turn face down"), and `currentFace` authority stays with the
  Shuffler — flip-on-table is table-local, the divergence knowingly accepted. **Physics
  ticket 17 built both gestures (2026-08-09, `eb24a4f`/`ff5d58a`)**: the Tabletop's first
  custom tldraw `ContextMenu` (`CardContextMenu.tsx`) offers "Flip" (per-card `props.face`
  swap, shown only when `backImageUrl !== null`) and "Turn face down"/"Turn face up" (a
  convergent toggle of `props.faceDown` across the selection). A card entering the library
  resets both axes to `face:'front', faceDown:false` in `MtgCardShapeUtil.onTranslateEnd`.
  See [tabletop.md](tabletop.md).
- **Contract** — every event that *reveals or chooses* a face carries `face` beside
  `card: { scryfallId, instanceId }` (`card.played`, and `card.discarded` once built —
  a discard shows the card publicly). Events that remove a card from view carry **no**
  face: `card.returned`, the `undo.*` kinds, and commanders riding `seat.joined` are all
  faceless by decision (cards-come-and-go ticket 02, 2026-08-08 — Jess: "cards removed
  from play no longer have a face up"). Names and image URLs are derivable
  conveniences, not identity. See [contract.md](contract.md).

The sections below are the Shuffler-component view (the feature's birthplace).

## Why This Feature Exists

Many Magic: The Gathering cards have two faces (transform, modal double-faced, reversible). In remote play via Mural/Discord, players need to see both sides of these cards. This feature flags such cards (`twoFaced`), shows a flip button backed by a flip animation, and tracks which face is currently showing. The back image is fetched from Scryfall on demand (same `scryfallId`, `face=back`) — no back-face data is stored.

## Who Uses It and How

Players encounter two-faced cards throughout the app:
- **Prep page**: Flip the commander in place on the prepare screen, and flip any two-faced card in the card modal to inspect both sides. Flip state is not persisted here (yet) — both surfaces carry the face in the URL.
- **Game page**: Two-faced cards display with a flip button both inline (command zone, hand, etc.) and in the card modal. Flip state persists across page reloads.
- **Library search**: Multi-face cards appear in type groups for every face's/part's types, so a Creature//Planeswalker card shows up under both "Creature" and "Planeswalker." This is driven by `CardDefinition.cardTypes` (the union of all faces' types), not by a flip flag.

## Design Philosophy

- **Flip is a UI concern, not a game event.** The app tracks where cards are (Library, Hand, Table, etc.) but doesn't model battlefield state. Flipping doesn't change where a card is, so it's not recorded in the event log. (An earlier attempt to record `FlipCardEvent` was added and removed.)
- **Same Scryfall ID, both faces' URLs stored.** Both faces of a two-faced card share one Scryfall ID. Image URLs are now **fetched from Scryfall at ingestion and stored** on the card (`imageUris` front, `backImageUris` back) — because bare constructed URLs 404 for freshly-released cards. `getCardImageUrl` prefers the stored URL and falls back to constructing `face=front`/`face=back` paths when absent.
- **The card image is the source of truth; we store almost no card text.** `CardDefinition` carries only identity/grouping data (`name`, `scryfallId`, `twoFaced`, `cardTypes`, `colorIdentity`, `set`, …). The old `backFace`/`CardFace` and `manaCost`/`cmc`/`oracleText` fields were removed (commit `f76b49c`) — they were never displayed. The only face data any feature consumes is `cardTypes`, the union of all faces' types, used by library-search grouping. A future "is this hand worth keeping?" feature should read canonical card data from MTGJSON/Scryfall rather than re-storing it.
- **Prep page flip may gain persistence.** Currently prep page flip uses a query parameter (`?face=back`) and doesn't persist. When we need it to persist, we'll save flip state in the prep.

## Quick Reference

| Aspect | Details |
|---|---|
| Data type | `CardDefinition.twoFaced` flag, `CardDefinition.cardTypes` (union of all faces' types), `GameCard.currentFace` |
| Face-down (concealment) | Tabletop-only: `faceDown: boolean` in the `mtg-card` shape's `props` (ticket 02, `c956949`). **Both the gesture and both renderings are now built** (tabletop-physics ticket 17, 2026-08-09, `eb24a4f`/`ff5d58a`): a right-click/long-press "Turn face down"/"Turn face up" context-menu item toggles `faceDown` across the selection (convergent, skips no-ops). A sleeved seat's face-down card renders as a solid `sleeveColor` rectangle (table-layout ticket 17, still baked at mint); an unsleeved seat's face-down card renders the seat's `cardBackImageUrl` (also baked into `mtg-card` props at mint time, same "game constant" argument as `sleeveColor`), falling back to a flat `#3a3a3a` rectangle when no card back was baked in (e.g. a seat that predates the prop, or redeploy-wiped seat memory). **A card can also arrive already concealed**: `card.played-face-down` (contract + Tabletop receiving side landed, card-played-face-down tickets 01+02) is a sibling event kind to `card.played`, identical payload shape, that mints the `mtg-card` shape with `faceDown: true` from birth — no Shuffler sender yet (ticket 03). See [tabletop.md](tabletop.md) and [contract.md](contract.md). Nothing on `CardDefinition`/`GameCard` — a Shuffler "Play Face-Down" button (the sender) is ticket 03, not yet built. The Shuffler's `CARD_BACK` image is library-stack decoration, not modeled state |
| Flip (which printed side) | Tabletop: a "Flip" context-menu item swaps `props.face`, shown only when at least one selected card has `backImageUrl !== null` (built ticket 17, 2026-08-09) |
| Concealment is depicted, not enforced | A face-down card keeps its identity in synced tldraw `props`; no permission model, and **no gesture may be gated on who controls a card** (`notes/DESIGN-the-table-vision.md` § Principles, 2026-08-07) |
| Shuffler "Play Face Down" button | **Built** (card-played-face-down ticket 03, 2026-08-21): a `Play Face Down` action on the **hand card modal only** (`formatModalCardActionsForHand` in `apps/shuffler/src/view/play-game/game-modals.ts`) sends `card.played-face-down` instead of `card.played` — a distinct event kind, not a `faceDown` flag on `card.played`. `GameState`/`GameCard` are untouched; concealment is not domain state on the Shuffler side, the card just moves to Table as always. Solo mode copies the generic card back image to the clipboard instead of the card's own image. Not on Revealed, per spec.md. |
| Type definitions | `src/types.ts` (CardDefinition), `src/port-persist-state/types.ts` (GameCard) |
| State mutation | `GameState.flipCard()` in `src/GameState.ts` |
| Game routes | `POST /flip-card/:gameId/:gameCardIndex`, `POST /flip-card-modal/:gameId/:gameCardIndex` |
| Prep routes | `GET /prep-card-modal/:prepId/:cardIndex?face=back` (modal), `GET /prep-flip-card/:prepId/:cardIndex?face=back` (inline commander) — both stateless |
| View rendering | `formatFlippingContainer(gameCard, flipRequest)` in `src/view/common/shared-components.ts`; `FlipRequest` says which page is asking (game POST vs prep GET) |
| CSS (game) | `public/game.css` lines 104-143 |
| CSS (prep) | `public/prepare.css` lines 221-276 |
| Image URLs | `getCardImageUrl(card, format, face)` (prefers stored) + `constructCardImageUrl(scryfallId, format, face)` (fallback) in `src/types.ts`; stored in `CardDefinition.imageUris`/`backImageUris` |
| Image fetch | `src/port-card-images/` (`ScryfallCardImagesGateway`, `enrichDeckWithImages`) — fetches Scryfall image URLs at ingestion |
| Adapters | `src/port-deck-retrieval/archidektAdapter/`, `src/port-deck-retrieval/mtgjsonAdapter/` |
| Persistence | `SqliteCardRepositoryAdapter` stores `card_types`, `image_uris`, `back_image_uris` as JSON (no back_face column); `PersistedGameCard.currentFace` |

## Other Docs

- [Architecture](architecture.md) - Data flow and technical details (Shuffler)
- [History](history.md) - How the feature evolved (Shuffler)
- [Interactions](interactions.md) - Dependencies and watch points (Shuffler)
- [Files](files.md) - Every file involved (Shuffler)
- [Tabletop](tabletop.md) - The Tabletop component's face knowledge
- [Contract](contract.md) - How face appears in the event contract
