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

**Vocabulary (keep these distinct):**
- **Advisor** = the deterministic function (`recommendMulligan`). It is what says
  "Keep, 60%". It is NOT an LLM.
- **Trainer** = the AgentCore-hosted agent that improves the Advisor. You chat with
  the Trainer (dev-mode chat window); it edits the Advisor's code and opens PRs.
  The Trainer is not the Advisor.

## Phases

### Phase 1 — deterministic core + a place to see it  ✅ DONE (`1034189`)
- `recommendMulligan({ hand, commanders, mulligansSoFar })` in
  `src/mulligan/recommendMulligan.ts`, returning `{ decision, confidence, commentary }`.
- **One real heuristic: land count.** Keep a 7-card hand with 2–5 lands; mulligan
  otherwise. Confidence higher for 3–4 lands and for extreme land counts. Land
  detection: `isLand(card) = card.cardTypes.includes("Land")` (catches MDFC lands).
- Unit tests as a table of **blessed cases** — the regression suite the Trainer
  must keep green (`test/mulligan/recommendMulligan.test.ts`).
- Surfaced in the play-game hand section during the mulligan stage, **dev-mode only**
  (rendered always, CSS-gated by `body.dev-mode` — survives HTMX swaps).

### Phase 2 — chat window + transport  ✅ DONE (`d0fa14d`, `0375723`)
- "Improve this" button in the recommendation toggles `body.advisor-chat-open`.
- Dev-mode chat **drawer** (`#advisor-chat`, `src/view/play-game/advisor-chat.ts`)
  slides in from the right of the playmat. Rendered once in `formatGamePageHtmlPage`
  **outside `#game-container`**, so the conversation survives game-state swaps.
- `POST /mulligan-advisor/chat/:gameId` rebuilds the recommendation context and
  calls `askMulliganAdvisorAgent()` (`src/mulligan/advisorChat.ts`) — **the seam**
  where the Trainer plugs in. Returns the placeholder `"Well isn't that special"`.
- **Transport decided:** plain HTMX request/response (not SSE). Trainer turns are
  naturally request→response (do work, return a summary), and it's low-volume. If
  the Trainer later streams tokens, revisit (see "next" below).
- Verified: `test/verification/verify-mulligan-advisor.spec.ts`.

### Phase 3 — the Trainer (AgentCore, PR-only)  ⬜ NEXT — built in a separate repo
- A coding agent with a checkout of this repo and a GitHub token, **scoped to edit
  `src/mulligan/` + its fixtures**, that opens PRs. Never pushes to `main`.
- The single guardrail is **PR-only** — humans review and merge. CI (build + test)
  must pass, which means the Trainer cannot regress a blessed case without it showing.
- Most valuable artifact from a chat: **new blessed cases**. When the developer
  disagrees with a recommendation, the Trainer should propose adding that hand +
  verdict to the fixtures, so every conversation ratchets the suite forward.
- **Init prompt for the Trainer: [`agentcore-advisor-agent-prompt.md`](agentcore-advisor-agent-prompt.md).**
- When wiring it in: replace the body of `askMulliganAdvisorAgent()` with the relay
  to AgentCore. Likely UI follow-ups (not yet built): a "working…" state and a
  clickable PR link in the Trainer's reply (today the reply is a plain string).

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

- **Card database (deferred, planned).** Richer heuristics (mana curve, color
  sources vs. the commander's identity, ramp/draw counts) need canonical card data
  — mana cost, CMC, full type line, oracle text. Per the two-faced-cards directive,
  that data must NOT be re-stored on `CardDefinition`; instead the app + the agent
  should read it from a **downloadable card database** (e.g. MTGJSON/Scryfall bulk
  data). Deferred for now — land detection works off `cardTypes` and needs no DB.
  When we add it, expose it to `recommendMulligan` via a port (keep the function
  pure/deterministic — inject the lookup, don't do I/O inside).
- v1 is keep/mulligan only. The London-mulligan "which cards to bottom" advice is a
  natural later step the agent can grow toward.
- Observability: log each recommendation to Honeycomb (hand summary, decision,
  confidence, mulligansSoFar) to later mine real games for surprising calls.
- A feature owner (`notes/features/mulligan-advisor/`) is worth creating once the
  feature has more surface area.
