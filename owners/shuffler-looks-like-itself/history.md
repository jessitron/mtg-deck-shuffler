# History

## How the typography got settled

The most consistent thing in the app was arrived at by subtraction, not decree.

- `38ffc70` **Game page fonts: drop Rampart One, use Ovo for body, Orbitron for fancy
  titles** — the decisive commit. The app had accumulated four or five faces; this cut it
  to two with clear jobs.
- `d1ba518` **Add Orbitron font to game page for card modal titles** — extends Orbitron
  into the play pages' chrome.
- `e41045d` **Make the buttons the body font** — an earlier pass in the other direction.
- Risque arrived with the marketing pages and stayed confined to them
  (`index.ejs` and `choose-any-deck.ejs` are the only views that request it).

The lesson encoded in the current rule — Orbitron for chrome, Ovo for content, Risque for
splash — is that it was *won*, and adding a fourth face reopens a settled question.

## How the tokens got started

- `5876f89` **Move mana colors to CSS custom properties** — the mana set was the first
  deliberate tokenisation, and it's the only *complete* one: five colors, closed set, all
  used through `var()`.
- `17c5931` **Extract shared button styles into button-base class** — the same instinct
  applied to buttons, and the origin of the signature `10px outset var(--light-pink)` CTA.

Both show the pattern working. What didn't happen was extending it to the rest of the
palette, which is why there are still 57 hex values.

## The abandoned prescriptive attempt — read this before writing design rules

There is an unmerged branch, **`attempt-to-bring-in-designers`** (4 commits, June 2026,
never merged to `main`), that tried to solve this problem the other way round: three
"design persona" skills channelling named designers.

- `1a53705` **Turn the three design-persona DESIGN docs into invokable skills** — added
  `rasmus-ui-design` (Rasmus Andersson, UI), `ilya-birman-typography` (Ilya Birman,
  typography), and `maxime-heckel-animation` (Maxime Heckel, animation) in
  `notes/design-personas/`, symlinked into `.claude/skills/`.
- `731d32d` **Reframe animation skill: HTMX+CSS today, Framer Motion as future tabletop**
- `7336d4e` **Add scope-reality banners to the UI and typography persona skills** — the
  tell. Both docs had to be prefaced with a warning that they described an app that
  doesn't exist:
  - `rasmus-ui-design` assumed a shared multiplayer god-view canvas with draggable cards,
    zones, life trackers, counters, tokens, and an AI suggestion layer — none of which the
    Shuffler has.
  - `ilya-birman-typography` prescribed Cinzel/Inter and "one sans-serif only", directly
    contradicting the shipped Orbitron/Ovo/Risque identity.

The branch was abandoned. **The failure was structural, not a matter of picking better
designers:** the docs were written from what a card-game UI *should* be, so they described
a different app, and the first honest maintenance pass on them was a banner saying "none
of this is true yet." Advice that contradicts the running app gets ignored, and advice
that gets ignored is worse than none — it costs a consult every time.

That's why this owner is **descriptive first**. The rules in
[README.md](README.md) are all read off the actual CSS, and the gallery at `/design`
renders specimens with the app's own stylesheets precisely so the knowledge base cannot
drift into that failure mode again.

Worth noting: the animation persona survived contact better than the other two (it was
reframed, not bannered), and its concerns are now covered by the **animations** owner.

## How the drift accumulated

No single commit is at fault, which is the point. The pattern visible in the log is a
feature landing with a button, the button needing a color, and a Material or Bootstrap
default going in because it was at hand. The card modal's seven action buttons — play,
put-in-hand, put-on-top, put-on-bottom, flip, recover, gatherer — are the clearest
sediment: seven unrelated Material hues, none of them brand colors, each added when its
action was added.

The "square corners" rule was written into `apps/shuffler/CLAUDE.md` at some point and is
honored by everything recent — the join-table panel (`JES-127`), the hamburger menu, the
at-table banner all carry explicit "square corners" comments. Everything older doesn't.
So the rule works when it's known; it just wasn't discoverable enough.

## 2026-08-01 — this owner, and the gallery

- `970b08d` **Add /design, a component gallery rendered by the app's own CSS** — the
  inventory made tangible. Renders every component with the app's real stylesheets, tags
  each section standard / choose-one / drift, and stages six open decisions with both (or
  three) options side by side. Includes both Josh Comeau 3D-button variants: the faithful
  three-span `.pushable` and the drop-in `.pushable-flat`, which reproduces the travel and
  spring easing from a hard `box-shadow` so no markup changes.
- Jess's standing decision, made when this owner was created: **new UI pulls toward the
  standard**, rather than matching whatever drift it sits next to. Accepts a temporarily
  mixed look in exchange for convergence.

## 2026-08-02 — choice 1 decided: canonical button press behaviour

First of the six open choices to converge (JES-155). Jess picked **option C,
`.pushable-flat`** — same travel and spring easing as Comeau's faithful three-span
`.pushable`, but built from a `box-shadow` bevel so it drops onto an existing `<button>`
with no markup change. The base rule moved from `design-candidates.css` into
`apps/shuffler/public/styles.css` rather than `playmat.css`/`site.css` as the
open-choices doc originally guessed — it turned out the press behaviour touches
`game.css`-only components too (`.table-cards-button`, `.card-action-button`,
`.menu-section button`), and `styles.css` is the one sheet every page loads. The losing
candidate (`.pushable`, the three-span version) and the adopted candidate were both
removed from `design-candidates.css`.

Colors were deliberately **not** touched — the seven modal-action hues (choice 3) and
the three secondary grays (choice 2) are still open, so each button site reproduces the
same shape (travel, easing, shadow structure) with its own fill color and a shadow color
computed at roughly 60% of it, rather than taking on `.pushable-flat`'s default
dark-pink. Caught in review: a leftover `.hero-button.active { background-color:
#f0f0f0 }` rule (a relic of the old outset/inset press system) was still overriding the
tab toggle's color after the press-physics rewrite — removed, since the "already
pressed" look now comes from the shared transform/shadow values, not a color swap.

## 2026-08-02 — choice 2 decided: secondary-button gray

Jess picked **option C: `var(--deep-space)` fill + `var(--light-pink)` text** —
on-brand, no new color enters the palette. Replaced `#6c757d` (Bootstrap) and `#607d8b`
(Material) across `game.css` `.end-game-actions button/a`, `game.css`
`.card-action-button.secondary`, and `playmat.css` `.modal-action-button.secondary`
(base, `:hover`, `:active` for each). All three now reuse `#0d0716` as their box-shadow
bevel color — the same darkened-`--deep-space` shade already established for
`.pushable-flat.pushable-dark` in `styles.css` — rather than computing a fresh shadow
shade per site.

Found in the process: three sites also darkened their fill *again* on `:hover`
(`#5a6268`, the Bootstrap `:hover`-darken riding along with `#6c757d`) —
`.table-cards-button`, `.end-game-actions`, `.card-action-button.secondary`. None of the
canonical `.pushable-flat`-shaped siblings (`.modal-action-button.play-button` and its
kin in `playmat.css`) touch `background-color` on `:hover`, only `box-shadow` +
`transform`. Read as drift rather than a deliberate secondary-button affordance, so the
override was dropped on all three rather than recolored — `.table-cards-button`'s base
fill is black and unrelated to the "secondary gray" family, but it carried the exact
same stray hex, so it got the same cleanup.

## 2026-08-02 — a concept choice 1 missed: the Big Fat CTA is not a primary button

Choice 1's first pass collapsed `.begin-button` into the same solid-fill look as every
other `.pushable-flat` user (dark-pink, like a primary button). Jess caught it: BEGIN
(home page) and Shuffle Up (prepare page) are a **distinct category** — the Big Fat CTA
— not a large instance of a generic primary button. She wanted its old look back
(white fill, the signature chunky `10px` light-pink border) with only the *press
physics* unified, not the fill/border.

`.begin-button` in `site.css` now overrides `.pushable-flat`'s background and border
back to white + `10px solid var(--light-pink)`, keeping the shared
`translateY`/box-shadow-bevel physics from choice 1. Same pattern as `.hero-button`:
own color, shared shape.

**Lesson for future choices:** "unify the press behaviour" is not license to unify
everything else that happens to differ between button sites. A component can be
genuinely distinct in kind (BFC vs. primary vs. secondary), not just drifted — and the
gallery caption is where that distinction should be stated explicitly (`option-where`
now reads "not just a scaled-up primary button") so it doesn't get re-collapsed by the
next agent that greps for "buttons".

`.event-undo` (`game.css`) and `.cancel-link` (`src/view/debug/load-state.ts`) still use
`#6c757d` — both are *text*, not buttons, so out of scope for this choice; they're
candidates for the "tokenize the orphan colors" mechanical cleanup in
[open-choices.md](open-choices.md).
