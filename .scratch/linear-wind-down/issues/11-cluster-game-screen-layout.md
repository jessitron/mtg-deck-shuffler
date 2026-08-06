# Keep/kill: game-screen-layout-and-finding-cards

Mountain: safe-harbor
Type: grilling
Status: resolved

## Question

Which of these 7 survive into `TODO.md`?

*Theme: how the Shuffler's game page is arranged and rendered, and how you find a card in it.*

Consult the `library-search` owner (JES-152, JES-142) and `shuffler-looks-like-itself` (JES-89,
JES-88) before deciding.

- **JES-78** — migrate the active game page to EJS templates. ✅ Not done: still renders from
  `src/view/play-game/*.ts` (7 files), no game view in `views/`. ⚠️ **This is the rendering
  substrate every other item here edits** — its order relative to them matters more than its own
  priority does.
- **JES-89** — move the library to the right. ✅ Not done: `active-game-page.ts` renders the
  library section first in `.game-top-row`.
- **JES-88** — remove the deck title section from the game page. ⚠️ **Superseded** by `TODO.md`'s
  `deck-title-placement`, which asks to *move* the title, not remove it. Premise has also drifted:
  there's no separate "deck title section" any more — the name lives in the command zone
  (`src/view/common/shared-components.ts:118`) and the page `<title>`.
- **JES-87** — sort the opening hand by card type then mana value. ✅ Not done: no hand sorting in
  `GameState.ts`.
- **JES-152** — offer library-position order in the game's library search (for debugging).
  **Now unblocked and coherent** — its premise (search flipped to alphabetical) shipped as JES-153
  on 2026-08-03. This is the deliberate counterweight to that change.
- **JES-142** — improve library search. ⚠️ **Too vague to act on**: self-marked "blocked, needs
  more detail from reporters," and the one concrete complaint behind it (search wasn't
  alphabetical) was already fixed by JES-153. What's left is an unrepeated feeling, ten months
  stale.
- **JES-96** — English translations for other-language editions. Thin but concrete — names a
  reproducing example (Adventurous Impulse, Archidekt 23735063). ✅ Not done: no language handling
  in the deck-retrieval adapters.

## Answer

**Seven issues become four `TODO.md` § Backlog lines. Five keep, two kill, none defer.** No
`← mountain:` markers — this cluster is safe-harbor. Keep/kill was the agent's call under Jess's
delegation (2026-08-06): *"dude I don't care, what will help you get it done?"*

Every headline claim was re-checked against `main` today. One of them was wrong, and it is the
most important thing this ticket found.

### The finding: JES-153 never landed on `main`

The ticket above says JES-152's premise "shipped as JES-153 on 2026-08-03." Linear agrees — it's
marked Done, completed. **It is not on `main`.** Commit `9a3c1b5` "Sort game Library Search and
Cards on Table alphabetically (JES-153)" lives on branch `library-alphabet`, checked out in a
second worktree (`../mtg-deck-shuffler-worktree1`), now 19 commits behind. On `main` the game
library modal still renders `game.listLibrary()` straight through in position order — no sort at
the route (`src/app.ts` ~663–700) and none in `views/partials/library-modal.ejs`. The
`library-search` owner docs still say "sorted by position", correctly.

So the branch carries the shipped-looking work *and* the owner-doc updates that describe it as
done. This is exactly the class of thing this wind-down exists to catch, and it reshapes JES-152
from "add a way back to the old default" into "the game library needs a sort toggle, and half of
it is sitting on a branch."

### JES-78 — **keep**, as `game-page-to-ejs`

Verified not done: seven files under `src/view/play-game/` build the page as template strings and
nothing in `views/` covers it. Kept because it's the **substrate** — the other three lines in this
cluster all edit the game page's rendering, and its cost is concrete rather than aesthetic: there
are two `<head>` implementations, `views/partials/head.ejs` and `formatHtmlHead()` in
`src/view/common/html-layout.ts`, and the `shuffler-looks-like-itself` owner records that they
have already drifted (different stylesheets; conflicting `body` font rules, Ovo vs Orbitron).

Its sub-task is **dropped as moot**: `head.ejs` already takes an optional `script` plus an
`additionalStyles` list, and no EJS page loads `game.js` — only the TS-rendered game page hardcodes
it. The stated goal ("don't load `game.js` on pages that don't need it") is already met; the "list
of extra .js files" was a means, not an end, and no page needs two.

### JES-89 + JES-87 — **keep, merged** into one line, `game-screen-table-layout`

Both verified not done (`active-game-page.ts:84` renders the library first in `.game-top-row`;
`listHand()` sorts by position only). Alone each is a one-sentence line, which ticket 02 calls
thin. Together they're one coherent ask with one justification — *arrange the game screen the way
a real table is arranged* — which is JES-89's own argument ("that's where it sits in a real game")
and equally the argument for lands-first hand sorting. One line, two sub-bullets, two `← was:` ids.

### JES-88 — **killed as superseded, premise drifted**

`TODO.md`'s `deck-title-placement` asks to *move* the deck title; JES-88 asks to *remove* it. Jess's
newer ask wins. The premise is also stale: there is no "deck title section" to remove — the name is
a `<span class="game-name">` inside the command zone (`src/view/common/shared-components.ts:118`),
which is precisely what `deck-title-placement` is about. Nothing merges, so no `← was:` label is
appended; the existing line already says everything JES-88 said, better.

### JES-142 — **killed as too vague; provenance preserved**

Self-marked "blocked, needs more detail from reporters," never unblocked, ten months stale. Its one
concrete complaint (search wasn't alphabetical) is what the `library-alphabet` branch addresses.
What was worth keeping is the **real-user provenance** — Jess's college kid and their friends,
2026-08-01, the only outside users this app has — and that moves onto the surviving library line as
an argument for the work, the same move ticket 06 made with JES-143.

### JES-152 — **keep, reframed** as `library-sort-toggle`

Not "add position order back" (its premise, which turns out to be false on `main`) but "the game
library search needs a sort toggle, alphabetical vs. library position." That framing is true
whatever happens to the branch, and it absorbs the branch as a sub-bullet rather than needing a
line of its own — landing `library-alphabet` is JES-153's leftover, and JES-153 is a Done issue
this effort gives no record. The load-bearing warning rides along: sort for **display only**;
`GameState.listLibrary()` returns position order and draw / Put on Top / Put on Bottom depend on it.

Consulted the `library-search` owner, which supplied the position-order invariant and confirmed its
own docs describe `main` accurately.

### JES-96 — **keep**, as `english-card-faces`

Verified not done — no language handling anywhere in `port-deck-retrieval/` or
`port-card-repository/`. Reading the adapter turned a thin one-liner into a line worth having:
`ArchidektDeckToDeckAdapter.ts:101` takes `card.displayName || oracleCard.name`, and `displayName`
is the *printed* name, so a foreign printing brings its foreign name; `scryfallId: card.uid`
(line 118) is that same localized printing, so the **image** is foreign too. Two halves, one cause.
`oracleCardName` is already carried on `CardDefinition`, so the name half is nearly free.

### No cross-cluster deferrals

JES-78's only relation is JES-124, which is Done. Nothing here pairs with another cluster.
