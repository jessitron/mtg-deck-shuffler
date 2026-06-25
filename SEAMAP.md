# SEAMAP — MTG Deck Shuffler

## North Star

Shuffle up and play any deck. The app manages the deck; you adjudicate the game; and along the way, learn more about playing MTG.

## The Mountains

Three directions, each with a next peak. Currently sailing toward **The Trainer**.

1. **Good play experience** — the table feels real and fun to play on.
   _Next peak: table fidelity — animations of cards moving, library on the right, discard/exile tracking, playmats, sleeves._
2. **Multiplayer-aware** — more than one person shares the game.
   _Next peak: spectator mode (watch a game without touching its state)._
3. **The Trainer** ← _active_ — the AI learns, helps you learn MTG, and helps the code learn.
   _Next peak: a mulligan advisor with real heuristics, backed by the AgentCore Trainer agent; closing the loop so you can ask the Trainer for improvements and get a PR back to this repo._

## Safe Harbor

A change is home when:
- it's deployed to the EKS cluster at https://mtg.jessitron.honeydemo.io and observable in Honeycomb (prod environment `mtg-deck-shuffler`);
- tests are green;
- documentation is consistent with the code;
- and nothing in the repo is wrong, deceptive, or extraneous.

## Success looks like

- Playing a real game with your sister feels natural, not fiddly.
- The code stays expressive of the domain — reading it teaches you the game, and that legibility is part of the learning.
- Each session you, the AI, and the code come away having learned something.
- When something breaks, Honeycomb shows you why.

## How will we know it's working?

- Tests are green and cover the domain logic.
- Clicking through the app, the change does what it should — and it's pleasant enough that you actually do it.
- Honeycomb traces show what happened in a session, so you can answer "what did the app do?" without ad-hoc logging. (Traces come from your own clicking — there aren't enough users to generate them otherwise.)
- The Trainer closes the loop on "helps the code learn": you can ask it for improvements and get a PR back to this repo.

## Enabling Constraints

- HTMX for interactivity; custom JS only when HTMX can't do it (OTel, animations). _(This will shift once we track cards on the tabletop.)_
- EJS templates for pre-game pages and any new pages. The TypeScript view functions on the gameplay pages are historical, not an intention to preserve.
- Ports, adapters, and gateways for external data and side effects (`notes/PATTERN-port-adapter-gateway.md`). Fakes, never mocks, in tests.
- Square corners (border-radius ≤ 4px) except on physically round things (cards, playmats). A me thing.
- Games are tracked as a series of events — an event-sourcing architecture. Later this supports synchronization across players.
- Everything persisted is versioned (`notes/DESIGN-persistence-versioning.md`).
- Feature owners hold deep context for tricky features and watch for cross-feature interactions.

## Non-goals

- Not a rules engine — the human adjudicates; the app won't enforce MTG rules or legality.
- Not a deck builder — decks come from Archidekt/MTGJSON.
- Tablet support matters; **mobile does not** (except the home page).
- No user accounts / user tracking yet — someday, but not until we must.
- No backwards-compatibility for persisted data — failing loudly on old versions is enough.
- Not a public, multi-tenant product at scale; no native app (web only).
