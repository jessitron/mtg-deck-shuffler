# Keep/kill: game-screen-layout-and-finding-cards

Mountain: safe-harbor
Type: grilling
Status: needs-triage

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
