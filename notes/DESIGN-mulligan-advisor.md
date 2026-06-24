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
- `POST /mulligan-advisor/chat/:gameId` calls `askMulliganAdvisorAgent(context, message)`
  (`src/mulligan/advisorChat.ts`) — **the seam** where the Trainer plugs in. Returns
  the placeholder `"Well isn't that special"`.
- **Transport decided:** plain HTMX request/response (not SSE). Trainer turns are
  naturally request→response (do work, return a summary), and it's low-volume. If
  the Trainer later streams tokens, revisit (see "next" below).
- **Session model — one session = one frozen hand.** The hand snapshot
  (`{ hand, commanders, mulligansSoFar, recommendation }`) is sent to the Trainer
  **only with the first message** of a conversation, and is **never re-read from
  game state after that**. First-message detection is **derived from the backend
  store** (no client-supplied flag — see Phase 2.5): the route starts a session
  (snapshotting the hand) only when one doesn't already exist, and `MulliganTrainer`
  sends the snapshot to the agent only on the conversation's first turn (Phase 2.6). The
  AgentCore session/VM stays alive for the conversation and holds the snapshot, so
  continuation messages carry only the developer's text. This is deliberate: you
  discuss *this* hand, not whatever the board shows later (so mulliganing
  mid-conversation does NOT change the hand under discussion).
  `askMulliganAdvisorAgent`'s `context` is therefore `null` on every message after
  the first.
- Verified: `test/verification/verify-mulligan-advisor.spec.ts`.

### Phase 2.5 — conversation lives on the backend (persistence, session id, evaluation, trace)  ✅ DONE
All Trainer chat state moved to the backend, consistent with the rest of the app
(but in-memory only — these are short-lived dev chats and this is a single-instance
server, so no SQLite/versioning).

- **In-memory store** (`src/mulligan/trainerConversationStore.ts`):
  `Map<gameId, { sessionId, messages: [{ role, text, receivedAt }] }>`. Created in
  `server.ts`, injected into `createApp` (defaulted, so tests/callers are unaffected).
- **Survives page reload.** `GET /game/:gameId` reads the conversation from the
  store and passes it to `formatGamePageHtmlPage` → `formatAdvisorChatPanel`, which
  rehydrates the bubbles. When a conversation exists the drawer **auto-opens** via a
  server-rendered `body.advisor-chat-open` class (same swap-proof pattern as
  `dev-mode`; no `afterSwap` JS).
- **Session id.** Generated (`crypto.randomUUID()`) when the conversation is created
  on the first message. Sent with every agent invocation, and set on the current
  span as `trainer.session_id` on every chat/eval request.
- **"Minutes ago" label.** Each bubble carries `data-received-at` (epoch ms, stamped
  server-side). `public/trainer-chat.js` reformats the most-recent message's age
  into `#advisor-chat-last-seen` every 60s (relative time is a view concern; the
  timestamp is the backend's).
- **Close vs End Chat.** "Close window" (`×`) is a client-side hide only — the
  conversation lives on. **"End Chat"** opens an evaluation modal
  (`src/view/play-game/trainer-eval-modal.ts`, reusing the shared `.modal-*` shell in
  `#modal-container`): optional free-text feedback + a required rating (1–5 stars or
  N/A). *Cancel* (`/close-modal`) is a no-op; *We're done here*
  (`POST /mulligan-advisor/end-chat/:gameId`) emits a `trainer.evaluation` span
  (attributes: `trainer.session_id`, `trainer.evaluation.rating` / `…rating_na`,
  `trainer.evaluation.feedback`, `trainer.conversation` (full convo JSON),
  `trainer.message_count`), **then** wipes the store (wipe is last, so nothing is
  lost). The response resets the chat to its intro, OOB-clears the modal, and closes
  the drawer via an `HX-Trigger: trainer-chat-ended` header (a global listener in
  `trainer-chat.js` removes the body class — the form can't do it itself because its
  OOB swap detaches it first).
- **Trace context propagation.** `askMulliganAdvisorAgent(context, message, sessionId)`
  injects the active W3C trace context (`propagation.inject`) into the request
  headers and POSTs to `TRAINER_AGENT_URL` (when set), so the Trainer's HTTP
  instrumentation continues the same trace. Unset URL → the placeholder reply, so
  the UI/transport still works before the Trainer exists.

### Phase 2.6 — clean module boundary for a future chat service  ✅ DONE
Drew the seam now (while it's cheap) so the Trainer chat can later move to its own
single-instance service without a redesign. **No behavior change** — pure refactor.

- **`MulliganTrainer` (`src/mulligan/mulliganTrainer.ts`)** is the single facade the
  app talks to. It owns the conversation lifecycle, the agent relay, and the
  `trainer.evaluation` span. It **knows nothing about game state, persistence, or the
  DB** — that import restriction *is* the boundary.
- **Three doors, mapped to the future network split:**
  - `startSession(gameId, context)` — **game-server side**. Only the game server can
    build `context`, so this is the one stateful call. Lazily triggered by the route
    on the first message (no UX change).
  - `sendMessage(gameId, message)` — **chat-server side**. In-memory only; sends the
    snapshot to the agent on the first turn, `null` after. Throws with no session.
  - `endSession(gameId, evaluation)` + `hasSession` / `getConversation`.
- **`buildAdvisorChatContext(gameId)` (in `app.ts`)** is the *only* code that reads
  game state for the Trainer. In the future split it stays on the game server and its
  result (`AdvisorChatContext`, made of `CardDefinition`s — already serialization-
  friendly) is what crosses the wire.
- **Why this cut:** the game server does the one stateful thing (start); the chat
  server holds the in-memory `Map` and handles every turn. So the game server can
  scale out while the chat server stays single-instance. Async chat (planned, for
  agent-cost reasons) lands on `sendMessage` without touching the game side.
- The relay is injected as an `AskTrainerAgent` port, so `MulliganTrainer` is tested
  with a **fake** agent (`test/mulligan/mulliganTrainer.test.ts`), no network/mocks.

### Phase 3 — the Trainer (AgentCore, PR-only)  ⬜ NEXT — built in a separate repo
- A coding agent with a checkout of this repo and a GitHub token, **scoped to edit
  `src/mulligan/` + its fixtures**, that opens PRs. Never pushes to `main`.
- The single guardrail is **PR-only** — humans review and merge. CI (build + test)
  must pass, which means the Trainer cannot regress a blessed case without it showing.
- Most valuable artifact from a chat: **new blessed cases**. When the developer
  disagrees with a recommendation, the Trainer should propose adding that hand +
  verdict to the fixtures, so every conversation ratchets the suite forward.
- **Init prompt for the Trainer: [`agentcore-advisor-agent-prompt.md`](agentcore-advisor-agent-prompt.md).**
- When wiring it in: most of the relay already exists in
  `askMulliganAdvisorAgent(context, message, sessionId)` — it POSTs to
  `TRAINER_AGENT_URL` with `{ sessionId, message, context }` and injects W3C trace
  context. Just stand up the AgentCore endpoint and set the env var. `context != null`
  means "first message — start a new AgentCore session seeded with this hand
  snapshot"; `context == null` means "send this message to the already-running
  session" (correlate by `sessionId`). The VM persists for the conversation, so the
  snapshot is sent exactly once.
- Likely UI follow-ups (not yet built): a "working…" state and a clickable PR link
  in the Trainer's reply (today the reply is a plain string).

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
