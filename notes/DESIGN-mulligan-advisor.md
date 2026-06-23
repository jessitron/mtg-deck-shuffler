# DESIGN: Mulligan Advisor (and self-improvement loop)

## The big idea

Recommend whether to mulligan an opening hand — and **improve that recommender from
within the app**. Two layers:

1. **A deterministic recommender** — a pure function holding heuristics. Testable,
   reviewable, version-controlled. This is the thing that gets better over time.
2. **A self-improvement loop** (developer mode only) — an agent hosted on AWS
   AgentCore that sees a real hand + the recommendation, chats with the developer
   about whether it's any good, edits the heuristic code (possibly adding inputs),
   and **opens a PR**. Improving the app from within the app.

The recommender is plain code, not an LLM call, so the agent improves *code* that a
human reviews and merges. The LLM is in the improvement loop, never in the hot path.

## Phases

### Phase 1 — deterministic core + a place to see it  ✅ (this commit)
- `recommendMulligan({ hand, commanders, mulligansSoFar })` in `src/mulligan/`,
  returning `{ decision, confidence, commentary }`.
- **One real heuristic to start: land count.** Keep a 7-card hand with 2–5 lands;
  mulligan otherwise. Confidence higher for 3–4 lands and for extreme land counts.
- Unit tests as a table of **blessed cases** — the regression suite the improvement
  agent must keep green (`test/mulligan/recommendMulligan.test.ts`).
- Surfaced in the play-game hand section during the mulligan stage, **dev-mode only**.

### Phase 2 — chat window + transport
- Dev-mode chat panel on the play screen.
- App endpoint that relays `{ hand, commanders, mulligansSoFar, recommendation }` +
  the developer's messages to the AgentCore agent and streams replies back.
  Transport TBD; SSE is the natural fit for the existing server-rendered/HTMX stack.
  Low volume.

### Phase 3 — the AgentCore agent (PR-only)
- A coding agent with a checkout of this repo and a GitHub token, **scoped to edit
  `src/mulligan/` + its fixtures**, that opens PRs. Never pushes to `main`.
- The single guardrail is **PR-only** — humans review and merge. CI (build + test)
  must pass, which means the agent cannot regress a blessed case without it showing.
- Most valuable artifact from a chat: **new blessed cases**. When the developer
  disagrees with a recommendation, the agent should propose adding that hand +
  verdict to the fixtures, so every conversation ratchets the suite forward.

## Key design decisions

- **Land detection: `card.cardTypes.includes("Land")`.** `cardTypes` is the
  pre-unioned set of all faces'/parts' types (see `CardDefinition` in `src/types.ts`),
  so this also catches modal double-faced lands. No new card data required.
- **Don't bloat `CardDefinition`.** It's intentionally minimal (identity + `cardTypes`
  + image URLs). The two-faced-cards owner explicitly anticipated this feature:
  heuristics needing mana cost / cmc / curve should read **canonical data from
  MTGJSON/Scryfall**, not re-store per-card text. (See
  `notes/features/two-faced-cards/interactions.md` watch point #1.)
- **The function owns its inputs.** It starts with `{ hand, commanders, mulligansSoFar }`.
  The agent may grow this signature (e.g. add deck summary) as it improves heuristics —
  the input shape is not frozen.
- **Dev-mode surfacing via CSS, not route threading.** The recommendation fragment is
  always server-rendered in the hand section but hidden unless `<body class="dev-mode">`
  (set from the `devMode` cookie / `/dontdie`). `body` is never HTMX-swapped, so it
  survives every `#game-container` swap — and we avoid threading `devMode` through the
  ~13 routes that call `formatActiveGameHtmlSection`. Mirrors the existing `.menu-debug`
  gate (`public/game.css`).
- **Pure & decoupled.** The function takes `CardDefinition[]`, not `GameState`. The
  view adapts: `game.listHand().map(gc => gc.card)`, `game.listCommanders()...`,
  `game.getMulliganCount()`.

## The recommendation contract

```ts
type MulliganDecision = "keep" | "mulligan";

interface MulliganInput {
  hand: readonly CardDefinition[];       // the opening hand, post-draw
  commanders: readonly CardDefinition[]; // color identity / strategy (unused by v1 rule)
  mulligansSoFar: number;                // 0 = first hand
}

interface MulliganRecommendation {
  decision: MulliganDecision;
  confidence: number; // 0..1
  commentary: string; // shown to the player AND to the improvement agent
}
```

## Open questions / future

- v1 is keep/mulligan only. The London-mulligan "which cards to bottom" advice is a
  natural later step the agent can grow toward.
- Observability: log each recommendation to Honeycomb (hand summary, decision,
  confidence, mulligansSoFar) to later mine real games for surprising calls.
- A feature owner (`notes/features/mulligan-advisor/`) is worth creating once the
  feature has more surface area.
