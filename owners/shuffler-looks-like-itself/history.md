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

First of the six open choices to converge (`shuffler-design-choices`). Jess picked **option C,
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

## 2026-08-02 — a standalone decision: the Precon/Archidekt tab pair needs a selection signal

Jess noticed the Precon/Archidekt control on `/choose-any-deck` had stopped reading as a
radio choice — both tabs looked identical apart from a 2px elevation difference (the
"already pressed" look from choice 1), which was too subtle to say "this one, not the
other." Explicitly **not** folded into `shuffler-design-choices` — it's a distinct kind of component (a
mutually-exclusive tab/radio pair), not another button-fill decision.

Given three options (fill inversion, unselected-recedes, underline accent), she picked
**the underline**: both tabs keep the same light-pink fill; `.hero-button.active` gets a
`4px` solid dark-pink bar via `::after`, layered on top of the shared press physics
rather than replacing it. Added a specimen for it in the Buttons section of `/design`
(tagged as its own standalone decision, not a `shuffler-design-choices` choice) so it doesn't get
mistaken for one of the six and re-litigated.

## 2026-08-06 — choice 5 decided: one global focus ring

`8b23d21` **Choice 5: one global focus ring, and bring the design KB with it**

Jess picked **option B: `3px solid var(--light-pink)` at `outline-offset: 3px`**, declared
**once** in `styles.css` as a `:focus-visible` rule on `a, button, input, select, textarea,
summary, [tabindex]`. Reasoning in `.scratch/shuffler-design-choices/spec.md` §5; executed by
`issues/01-global-focus-ring.md`.

Why not the others: option A (`--dark-pink`, flush) matched the one focus rule that already
existed, but dark-pink vanishes against the playmat's dark card art — the surface most of the
app's buttons sit on. Option C (light-pink ring + `--deep-space` halo) was the most visible
and turned out to be **structurally expensive**, for a reason nobody had noticed while
staging the candidates: a halo can only be drawn with `box-shadow`, `box-shadow` does not
accumulate across rules, and `.pushable-flat`'s press bevel from choice 1 *is* a two-layer
`box-shadow` — so option C would have erased the press bevel on every focused button.
`::after` is no escape hatch either, since inputs can't carry pseudo-elements. Option B's
offset does the same legibility work for free: the gap shows the *page* behind the control
rather than the control's own fill, which is what keeps the ring readable against
`.begin-button`'s 10px light-pink border.

**This was the accessibility item, and the app was worse than "missing".** It had exactly one
focus outline (`.button-base:focus` in `site.css` — a plain `:focus`, so it fired on mouse
clicks) and **three** rules that actively set `outline: none`. The KB had recorded two; the
third was `.json-summary` in the inline `<style>` of `src/view/debug/state-copy.ts`, on the
app's only `<summary>` element. That one was already dead code by specificity
(`summary:focus-visible` (0,1,1) beats `.json-summary` (0,1,0)) but it was still a written
instruction to hide focus, and finding it is why the global selector list carries a `summary`
clause. The two `deck-selection.css` rules were deleted whole, taking two off-palette colors
with them: `rgba(219,39,119,.3)` (Tailwind's pink, never `--dark-pink` `#bb5277`) and
`rgba(76,175,80,.3)` (**Material green**, on an input, for no reason anyone chose).

**Deliberate behaviour change worth knowing:** those two deleted input rules were plain
`:focus`, so they responded to mouse clicks. The global rule is `:focus-visible` only — so
clicking into the precon search or the Archidekt deck-number field now produces no border
change at all, just the native caret. Intended, not a regression.

**One companion rule was needed, and it came from the markup, not the design.** `tabindex="0"`
appears in exactly four places in the app and **all four are the modal overlay**
(grep `tabindex="0"`: `views/partials/card-modal.ejs`, `views/partials/library-modal.ejs`,
`src/view/play-game/game-modals.ts`, `src/view/play-game/history-components.ts`). Those
overlays are `position: fixed` and full-viewport, so the standard `+3px` offset draws the ring
*outside* the viewport, where it clips to nothing — producing a keyboard stop that looks
unfocused, which is the precise deficit this choice existed to close. `playmat.css` →
`.modal-overlay:focus-visible, .card-modal-overlay:focus-visible` turns the offset inward to `-3px` so it reads as a frame. It lives in `playmat.css` alone
because prepare loads playmat, and the modal block is already duplicated across the two files.

**Lesson: a global rule meets markup you didn't design for.** The choice was staged and
argued as a pure appearance decision — three swatches on `/design`. What actually decided the
shape of the implementation was two structural facts discovered only by writing it: that
`box-shadow` is already load-bearing for choice 1's press bevel (killing option C), and that
the only `[tabindex]` elements in the app are full-viewport overlays where a positive offset
is invisible. Staging candidates on the gallery shows you what a treatment *looks* like; it
doesn't show you what it *collides* with.

**Gotcha, cost a debug cycle:** the gallery test must **poll** the computed outline
(`expect(...).toPass`), not read it once. `.group-by-type-toggle` (`playmat.css`) carries
`transition: all 0.2s ease` and `outline-width` is animatable, so an immediate read catches
the ring mid-transition at `1px` — indistinguishable from a missing CSS rule.

**Two risks recorded rather than resolved** (details in
[open-choices.md](open-choices.md#5-focus-ring--decided-2026-08-06-shipped)): `--light-pink`
measures ~1.35:1 on white, under WCAG 1.4.11's 3:1 floor, and the flat-white `.modal-dialog`
interior is a likelier failure than the card art that `spec.md` worried about; and the
sanctioned fallback (a `--deep-space` companion) collides with the press bevel as described
above, so it goes back to Jess rather than being absorbed. Also outstanding: the **manual
keyboard tab-through**, which is the real test of this ticket. Build, 224 unit tests and the
5-test gallery spec all pass, but no human has tabbed the pages yet.

## 2026-08-07 — the deck-title plaque moved onto the playmat

The deck name used to be a slab *inside* `.cool-command-zone-surround`, the metal frame that
holds the commander(s). It now rests on the playmat itself: centered in the mat's top grid
row on `/prepare`, and left of the hamburger in a new `.game-header-row` on `/game`. The
surround is back to exactly one child, `.multiple-cards`.

**Why it's an owner-relevant change and not just a move.** Three things came out of it that
outlive the change itself:

**1. Appearance and placement got separated, and that's now the pattern.** The plaque's looks
had been written as `.cool-command-zone-surround .game-title` — a descendant selector. Moving
the element out of that parent would have silently unstyled it. The rule was promoted to a
bare `.game-title` in `playmat.css` (fill, `3px groove black`, `padding: 8px 16px`, Orbitron,
centered, `overflow-wrap: break-word`), and each page sheet now contributes *only* placement.
General lesson recorded in [architecture.md](architecture.md): don't name an ancestor in an
appearance rule for a component that could move.

**2. A layout token died of the move.** `--min-title-slab-height` existed so the library stack
could be padded down past the title slab's height (`padding-top: calc(32px + var(--min-title-slab-height))`).
With the title gone from the surround, the library stack should align with the commander
*card*, which is a fixed offset: `22px` = 5px surround border + 10px surround padding + 7px
`.multiple-cards` inset border. Flat value, comment explaining the arithmetic, token deleted —
zero references remain. Likewise `prepare.css`'s subgrid on `.cool-command-zone-surround`,
which only existed to give the title its own row inside the frame, collapsed to a plain
`grid-row: 3`. **A variable that exists to make one thing dodge another thing dies when they
stop overlapping** — worth checking for, because it stays in the codebase looking meaningful.

**3. The `/game` top strip has a structural rule now.** The title is a **sibling** of
`#game-menu`, never a child, wrapped together in `.game-header-row` (flex,
`justify-content: space-between`, `gap: 20px`). Two independent reasons, both discovered
rather than designed: `game.js` dismisses the open menu on `!closest("#game-menu")`, so a
nested title would swallow the dismiss click; and `#game-menu` is the dropdown panel's
positioning ancestor, so nesting would push the panel down by the plaque's height. The `gap`
is the animations owner's contribution — it doesn't offset the panel, and without it a long
deck name butts into the hamburger. `verify-deck-title-placement.spec.ts` pins all of this,
including "clicking the title dismisses an open menu."

**What was fixed in passing.** Both renderers interpolated the deck name **raw**, and
Archidekt deck names are user-supplied. `escapeHtml` moved from module-private in
`active-game-page.ts` to exported from `shared-components.ts`, and the new
`formatDeckTitleHtmlFragment(deckName)` uses it. A real XSS fix, found by reading the code
being moved. Also: the plaque now renders for **commander-less decks**, which previously got
no title at all because the title lived on the `commanders.length > 0` branch. And the
gallery's old command-zone specimen carried a fictitious second line — "Precon · Warhammer
40,000" — that the app has never rendered; it was deleted, not reproduced.

**Left open on purpose, then closed the same day — see the next entry.** The `groove` border
was arguably the plaque's *join* to the metal frame; alone on the mat it joins nothing. The
design owner's review flagged this and Jess asked for **both** treatments staged on `/design`
rather than a decision — so it became
[choice 7](open-choices.md#7-deck-title-plaque-border--decided-2026-08-07-shipped), with
`.candidate-game-title-flat` in `design-candidates.css` as option B. The groove shipped
unchanged in the meantime. Two other things Jess looked at and deferred — converging the
`.join-table-fields` panel (now the only pale untokenized slab on `/prepare`, and more
conspicuous for this change) and removing the metal surround altogether — are recorded under
"Deferred by Jess" in open-choices.md.

**Lesson, and it's the same one as choice 5.** What decided the implementation wasn't the
appearance question everyone was arguing about; it was structure discovered by writing the
thing — a descendant selector that would have unstyled the element, a click-dismiss handler
that a wrapper would have broken, a fixed grid track that would have clipped a long name.
Stage the look on `/design`; find the collisions in the code.

## 2026-08-07 — citations in this KB stopped being line numbers

During the `-context` and `-review` passes on the change above, the owner spent a substantial
section enumerating ~20 `file:NNN` citations across `open-choices.md`, `interactions.md` and
`architecture.md` that the edit was about to invalidate. That was the **fourth** time (after
choices 1, 2 and 5) that a single change stranded most of this KB's citations, and the
`open-choices.md` resolve-checklist had a whole step — "re-verify every `file:line`" — that
existed only to service the problem.

**Jess's call: cite selectors and symbol names, not lines.** `playmat.css:122-128` becomes
`playmat.css` → `.game-title`. A selector is greppable, survives every edit above it, and
fails *honestly* — a grep returning nothing tells you the rule is gone, where a stale line
number confidently points at an innocent neighbour. Converted in the same commit as the
plaque move; the convention is written up in [README.md](README.md), and checklist step 8
now says "cite by selector" instead of "re-verify the lines."

## 2026-08-07 — choice 7 decided: the deck-title plaque goes flat

`20b83aa` **Adopt the flat border on the deck title plaque (choice 7)**

Jess picked **option B, `3px solid black`**, after seeing both staged on `/design`: *"go with
your option B, the black border. That looks great in /design."* `playmat.css` → `.game-title`
carries the flat border (with the decision and its reasoning in the comment above the rule);
`.candidate-game-title-flat` is gone from `design-candidates.css`; the `.choice` block in
`design.ejs` collapsed to the plain specimen it already had, now with a `section-note`
recording the outcome.

**Why flat won.** The `groove` was the plaque's **join** to the metal command-zone surround.
When the plaque moved onto the mat (entry above) the join survived as decoration of a
connection that no longer existed. The counter-argument was real and was put to Jess plainly:
`groove`/`outset`/`inset` survived in only two places, so choosing flat halves the app's
chunky-3D vocabulary. **It is now down to one** — `.cool-command-zone-surround`'s `5px outset
black`, the last of them. That raises the stakes on the separately-deferred "remove the
surround entirely" idea, which would end the language rather than thin it; recorded under
"Deferred by Jess" in [open-choices.md](open-choices.md).

**Method, stated as a practice: stage it, don't argue it.** This is the second time (choice 5
was the first) that a question nobody could settle in prose was settled in one sentence once
Jess could see both options rendered by the app's own CSS. The gallery isn't only
documentation — it's the **decision instrument**. When a choice comes up, the cheapest next
move is usually to build the candidate and put it on `/design`, not to write a better essay
about it. Corollary from choice 5, still true: the gallery shows what a treatment *looks*
like, not what it *collides* with — find that in the code.

**And a note on how this owner should read its own blocks.** The `-review` pass on the plaque
move had **blocked** exactly this flat border, on the grounds that Jess approved a *placement*
change and an appearance change was riding along unapproved. The block was honoured: the
groove shipped, both options were staged, Jess was asked. She then chose the thing that had
been blocked. That is the process working, not reversing: **the job is to stop unapproved
changes riding along, not to defend the status quo.** A block that ends in "so stage it as a
choice and ask" is a success even when the blocked option wins — it lands decided instead of
smuggled. Written into [README.md](README.md)'s design philosophy so the next review doesn't
soften itself to avoid looking overruled.

## 2026-08-07 — the game screen's surface got its domain name back

`7487393` **Call the game screen's surface what it is: the playmat**

`/game`'s big art-backed surface — the one the library stack, command zone and hand sit on
— was `.page-container`. In the domain it IS the playmat, the same object `/prepare` calls
`.playmat`. Zero visual change: `/prepare` renders byte-identical and `/game`'s computed
geometry is unchanged (80px radius, `5px solid black`, `5px 5px` shadow, 2rem child
margins).

**Why it mattered enough to rename.** An agent read the class names and concluded "the
`/game` screen has no playmat" — true of the CSS, false of the app — and built a question
to Jess on that false premise. **This KB was part of the problem**: its own "square corners
on chrome" rule listed "the playmat, the `.page-container`" as two round objects, and the
`/design` radius table listed `20px .playmat` and `80px .page-container` as two different
things. The naming didn't just fail to describe the app; it taught readers something false,
in three places at once, and the owner was one of them. **A class name is documentation, and
this KB inherits whatever it says.**

**The shape, and why not a straight rename.** Both play pages now carry the bare `playmat`
class plus a page modifier — `playmat-prepare` / `playmat-game` — with appearance behind the
modifier in each page sheet. Collapsing both to a bare `.playmat` was the obvious move and
is wrong: `/design` co-loads `game.css` and `prepare.css`, so two bare `.playmat` rules would
have made it **structurally impossible for the gallery to show both mats truthfully** — load
order would silently pick a winner. The gallery being unable to lie about the app is a
constraint on how the app's selectors are allowed to be organised, not just a property of the
gallery. `playmat.css` keeps an empty, commented slot for the bare rule against convergence.

**Placement stays on the bare class.** `prepare.css`'s three descendant rules
(`.playmat > .game-title`, `.playmat .cool-command-zone-surround`,
`.playmat .commander-placeholder`) are keyed on `.playmat`, deliberately: placement is
relative to the mat *as a domain object* — the grid parent — not to one page's dressing of
it. The first draft of the reasoning said these stayed because a Playwright spec pins
`.playmat > .game-title`; the `-review` corrected it. **A Playwright locator matches the DOM
regardless of CSS**, so a spec never pins a *stylesheet* selector. Don't reach for that
argument again.

**What it left behind.** The rename removed the last justification for the two mats looking
different — "the game one is a giant Magic card, a different thing" only worked while they
had different names. They still differ (20px radius / `outline: 10px solid black` / no shadow
/ local Cascading Cataracts vs 80px / `border: 5px solid black` / `box-shadow: 5px 5px black`
/ hotlinked Scryfall art). Deliberately **not** converged in this change and deliberately not
promoted to an open choice; it sits as `playmat-two-visual-metaphors` in the repo-root
`TODO.md`.

**Also corrected while in here:** this KB had said `docs.css` holds the only second `:root`
and "don't add a third." There are **four** — `styles.css`, `docs.css`, `game.css`
(`--playmat-*`) and `playmat.css` (`--mana-*`). The rule was right, the count was two years
of drift out of date.

## 2026-08-07 — the Mulligan button stopped being an unstyled browser button

The Mulligan button (`hand-components.ts` → `formatMulliganButtonHtmlFragment`,
`.mulligan-button`) had no fill, no font, no press physics — plain browser-button drift, the
same failure mode this owner exists to name and stop. Jess's call: it's secondary, not a CTA
— a routine, repeated in-game action, not the one thing that matters most on the screen.

Implemented by adding `pushable-flat pushable-dark pushable-small` alongside the existing
`.mulligan-button` class (kept only as a test hook), reusing the **exact** classes already on
`active-game-page.ts`'s `.table-cards-button` ("3 Cards on table") rather than writing any
bespoke CSS. `game.css`'s now-redundant `.mulligan-button` rule (`padding`, `font-weight`,
`cursor`) was deleted — fully subsumed by `.pushable-flat`/`.pushable-small`. A specimen went
onto `/design` right next to the table-cards-button specimen it copies.

**Why this didn't need a choice or a new candidate.** Choice 2 (secondary-button gray) and
choice 1 (press physics) are both already decided and both already have a live precedent
(`.table-cards-button`) doing exactly this job. Applying a settled pattern to a newly-noticed
unstyled button is convergence, not a new decision — nothing to stage, nothing to ask. No
border-radius or focus CSS was added; neither exists on the reused classes, and that's
consistent, not an oversight.

## 2026-08-07 — the playmat converged: one appearance, two scales

`a4991f3` **Harden the playmat: one appearance, two scales**

The sequel to `7487393`, which gave both play screens the domain word but deliberately left
the two mats dressed differently behind page modifiers and dropped a buoy
(`playmat-two-visual-metaphors`) asking whether they should converge. Jess answered:
*"The playmat is a concept we haven't hardened yet. The inconsistencies are historical
reasons, they're not good."* She named exactly three convergences — local art rather than
Scryfall's, both frames 10px, and **radius stays per-page because it is a matter of scale**,
`/prepare` simply draws the mat smaller.

So the reserved empty slot in `playmat.css` got filled: a bare `.playmat` rule carrying art,
`background-size: cover`, `background-position: center`, `border: 10px solid black`.
`.playmat-game` and `.playmat-prepare` kept only layout and their own radius, each now
commented with Jess's ruling and its date so the two numbers don't read as drift to the next
reader.

**Radius stayed different on purpose, and that's now recorded where people look.** The
`/design` radius table had been saying "Open question, not a settled distinction"; it now
says settled, with the reason. The contrast table's "Playmat art" row went from naming two
stylesheets to one.

**The outline→border swap was not geometry-neutral, and the plan said it was.** The `-review`
caught it. `outline` paints outside the border box and consumes no space, so swapping
`.playmat-prepare`'s `outline: 10px solid black` for the shared `border` shrank the *visible*
mat 20px in each dimension, and because `min-height: 500px` now includes the frame the top
inset went 40px → 50px, dropping the title plaque 10px. `box-sizing: border-box` does not
help — it governs `border` vs `padding`, never `outline`. The correction went into the commit
message so the shift doesn't read as unexplained later, and into
[interactions.md](interactions.md) so the next person doesn't make the same claim. It also
took the app's decorative-`outline` sites from three to two.

**A cascade tie that resolves in opposite directions per page.** `.playmat`, `.playmat-game`
and `.playmat-prepare` are all one class of specificity, and `/game` loads `game.css` then
`playmat.css` while `/prepare` loads `playmat.css` then `prepare.css`. A property added to
the bare rule therefore *overrides* the game modifier and *loses* to the prepare modifier —
same declaration, opposite outcome, silent either way. Written as a `CAREFUL` comment on the
rule and recorded in [architecture.md](architecture.md). The animations owner found it
independently in the same review round, which is why it's flagged twice rather than trusted
to one comment.

**What was deliberately not converged.** `.playmat-game`'s `box-shadow: 5px 5px black` is now
the only difference between the mats with no stated reason. Jess named three changes and this
wasn't one, so converging it would have been an appearance change riding along on an approved
one — the scope-of-approval rule, same one that produced choice 7. It's buoyed as
`playmat-drop-shadow`, explicitly `blocked-by: design-playmat-specimen`: the owner **declined
to stage it as a `/design` `.choice`** because the gallery cannot render a real playmat yet,
and staging a choice Jess can't look at defeats the point of staging. That's a new wrinkle on
"stage it, don't argue it" — *staging presupposes the gallery can show the thing*.

The shadow's argument both ways is worth keeping: `/game`'s art used to be a literal Magic
card face (Scryfall `/png/front/…`, portrait, cover-cropped), so 80px radius + drop shadow +
an actual card face read as **one giant Magic card**. Landscape art half-retires that reading.
The shadow is either the last thread of a metaphor worth keeping or the leftover of a dead
one — and it landed *decided to defer*, not silently swapped.

**The bug that prompted this is NOT confirmed fixed.** Jess reported the game mat's art not
loading. The Scryfall URL returned 200 and the art rendered fine in headless Chromium; the
symptom was never reproduced. Hotlinking `cards.scryfall.io` is a *plausible* cause (an
extension or Scryfall's own hotlink protection could block it) and dropping the third-party
dependency is right regardless — but do not record this as a fix. The falsifying question was
put to Jess: did `/prepare`'s mat art fail for her too? If it did, the hotlink was never the
cause.

**Also learned, and now in [README.md](README.md):** `black` as a bare CSS keyword is the play
pages' frame color — the mats, `.game-title`, and `.cool-command-zone-surround` all use it,
and no black token exists in `styles.css` `:root`. And the mat art URL is down to two sites
from three (`playmat.css`, `design-gallery.css`); `design-playmat-specimen` would make it one.

## 2026-08-07 — the design language reached the canvas, and hit four tldraw walls

No CSS changed. `.scratch/tabletop-physics/issues/03-what-furniture-is.md` decided that Tabletop
furniture becomes one custom tldraw shape type, `mtg-zone` (playmat, library, graveyard, exile,
Stack, future command zone), rendering itself in React instead of being a stock locked `geo` shape
tagged `meta.zone`. This owner was consulted **mid-interview**, before a recommendation had formed
— which is the pattern the README asks for, and it paid twice.

**What it bought, and this is the reusable lesson: consulting early moved a decision, not just a
review comment.** The owner's answer that the `geo` `font` prop enum has no Orbitron in it — so a
stock label can *never* be on-brand — became "the single strongest design argument for the custom
shape." A design fact, arriving before the architecture was fixed, changed the architecture.

**Appearance was deliberately split out into a new ticket** rather than decided inside the
architecture ticket, on this owner's advice. The reasoning is the same one the README states:
today's dashed-grey-serif zone look is **stock tldraw** — scaffolding nobody chose, appearing in
no history entry and no open choice — and "new UI pulls toward the standard, not toward what it
sits next to" bites hardest when what it sits next to is a framework default.

**Four tldraw limits got recorded** (now in [README.md](README.md) → tldraw limits): the `font`
enum; the global `:focus-visible` rule cannot reach a canvas shape, so that's a genuine exemption
rather than an oversight; `getDraggingOverShape` filters `!s.isLocked` **before** checking for drag
hooks and there is no `canMove` on `ShapeUtil`, so locked furniture can never be a drop target and
any "reacts to what's over it" treatment must be a derived render; and an opaque picture layered
over a zone box hides its interior, which kills the interior-tint pattern for the playmat and
library specifically.

**Three review findings worth keeping, because each is a failure mode this owner will meet again:**

- **"Reproduce it verbatim" was unimplementable and therefore dangerous.** The stock look comes
  from tldraw's prop *enums* rendered through its own hand-drawn stroke geometry and theme. A
  `component()` drawing `border: 1px dashed grey` is an approximation, and an implementer told
  "verbatim" will approximate *while believing they copied* — after which the next agent cites it
  as precedent. Fix: approximate on purpose, and mark the literals a **knowingly-untokenized
  placeholder, exempt from the Layer-1 token rule**, so a lint sweep can't promote the placeholder
  into a decision.
- **"Pending" in this KB meant *unshipped* and was read as *undecided*.** Choice 4 (chrome radius)
  was answered by Jess on 2026-08-06, but this KB's tables still said pending because the commits
  hadn't landed — so the Tabletop ticket derived `border-radius: 0` from first principles, missing
  that the decided rule splits (`0` on flat surfaces, `--radius-soft: 4px` on pressables, *"the
  line falls at 'do you touch it'"*). Fix: choices 3, 4 and 6 now state Jess's actual answer inline
  in [open-choices.md](open-choices.md) and in the README table, with "shipped?" as a separate
  column. **Decided-but-unshipped is a state this KB has to name explicitly.**
- **An audience question was hiding inside a mechanism paragraph.** "The armed highlight is derived
  locally, not written to the store" reads as implementation — but *who sees the library light up*
  is player-visible behaviour and therefore Jess's. Pulled out and asked: *"honestly, whichever is
  easier"* → local to the dragging player only. The door stays open at no cost (tldraw sync already
  carries cursors and selections outside the undoable document, so a presence lane would make
  shared arming cheap), recorded in the map's fog. **When a mechanism sentence implies who can see
  something, that's a design decision wearing a mechanism's clothes.**

**Two gaps got a permanent home** in [open-choices.md](open-choices.md) → "Fleet gaps — the
Tabletop side": `apps/tabletop` has no CSS source file and no font link at all (so Layer 1 applies
with nothing to apply it *with*, and both halves fail silently), and `LandingPage.tsx`'s off-brand
green/cream inline palette (`#1a2a1f`, `#f5f1e8`, `#3d5a45`) is a live Layer-1 violation. The
second had been recorded only inside a Tabletop ticket as "not a precedent to match" — the wrong
home, because it outlives the ticket. Also stated up front: **the tokens gap must not be solved by
copying `styles.css`'s `:root`.**

## 2026-08-07 — a card keeps all its handles, and this owner lost the argument

`3f14d02` **Resolve tabletop-physics 04: tap is a boolean, rotation is a delta**

No CSS changed; nothing was built. `.scratch/tabletop-physics/issues/04-tap-is-state.md`
decided that a Tabletop card stores `props.tapped` as a boolean and writes rotation as a
**delta** (+90° from the card's own current angle), rather than reading tap back out of an
absolute angle. The design consequences outlive the ticket.

**This owner argued resize should be suppressed on cards, and was overruled — deliberately,
with reasons, and that's why it's written down.** The argument was that `CARD_W = 170` fixes
the canvas coordinate system at 68 units/inch, every other dimension derives from it, and a
player-resized card falsifies the sentence "the playmat is 9.6 cards wide." Jess's counter:
the playmat is 9.6 **default** cards wide, one scaled creature doesn't falsify that, and she
resizes cards in Mural on purpose — *"I like to make creatures bigger than lands."* The
rejection is recorded in the ticket *and* in [README.md](README.md) so the next agent doesn't
re-run it from scratch and arrive at the same overruled place.

**The half that was adopted is the half that mattered.** The constraint this owner correctly
identified — the board's premise is *physical proportion*, so a card may change size but never
shape — landed as `isAspectRatioLocked = () => true`. Worth noting as a pattern: a design
objection that gets refused wholesale can still be right about the invariant underneath it.
**State the invariant separately from the remedy**, or it goes down with the remedy.

**Free-rotate stays too**, which is the opposite of where the `-context` brief was leaning:
*"people might want to angle a card a little bit to indicate that it's attacking (even if
vigilant)."* It costs nothing precisely *because* tap became a delta — tap composes on top of
any player-chosen angle with neither mechanism knowing about the other. So **no handles are
suppressed on a card at all**, and the earlier "I would not object to fewer handles" is moot.
Recorded as decided so nobody suppresses them later thinking it's an obvious cleanup.

**The board is now deliberately non-uniform on handles.** All furniture is `isLocked`, so most
shapes already have none; cards keep the full set. That asymmetry is a decision, not drift —
this owner had flagged the uniformity gap and this is its answer.

**Crop dies for free, and it was never the same objection as resize.** `DefaultImageToolbar`
gates on `shape.type !== 'image'`, so the crop button exists only while a card is an
`ImageShapeUtil` subclass; becoming `mtg-card` removes it with no work. Jess's *"I don't want
the weird cropping thing"* was about crop, not resize — a useful reminder to hear the specific
complaint rather than the category it seems to fall in.

**The ride-along warning was honoured.** Nothing in 04 decides a custom `indicator()`, and the
ticket says out loud that an indicator differing from tldraw's default is a separate design
decision needing its own sign-off. Likewise no duration, easing, colour or literal: the tap
**motion** is [ticket 05](../../.scratch/tabletop-physics/issues/05-rotate-to-tap.md), to be
decided *with* this owner, carrying forward the calibration that the Shuffler's vocabulary is
0.8s (flip) and 0.5s (card motion) and that a tap is a flip-like reorientation rather than a
translation — match one, don't invent a third tempo.

**Decided but unbuilt**, in the state this KB now names explicitly (see the choice-4 lesson
above). The Tabletop still has no CSS source file and no font link (`tabletop-css-tokens`);
04 needed no styling so it wasn't blocked, but 05 will be.

## 2026-08-07 — the fleet got one dictionary

`4396aea` **Give the fleet one dictionary: @fleet/design-tokens**, then `db79bf8` (CLAUDE.md
truth-up) and `a8e2427` (delete `docs.css`'s duplicated tokens).

The Tabletop had no CSS source file and no font link at all, so a `var(--…)` resolved to
nothing and Orbitron fell back to a system serif — **both silently** — which blocked every
Tabletop implementation ticket. The fix was a new workspace, `packages/design-tokens`
(`@fleet/design-tokens`, with `packages/*` added to the root `workspaces` glob), holding the
identity palette, `--narrow-border` and Magic's colour pie. The Shuffler serves it at
`/fleet/tokens.css`; the Tabletop imports it so Vite inlines it.

**The tokens MOVED; they are not mirrored, and that was the load-bearing constraint.**
`styles.css` `:root` now holds only `--background-color`, `playmat.css`'s `--mana-*` `:root` is
gone, and a Playwright assertion fails if any shared token reappears in `styles.css`. A
"fallback" copy is a second dictionary, and it would turn a broken load — loud and obvious —
into a silent near-miss.

**Why not the deliberate `log.ts` duplicate, which someone will cite.** That duplication is
*forced* (incompatible OTel version lines) and drifts **loudly**: the build breaks. A palette
drifts silently — the app just quietly stops looking like itself on one face. And the fleet had
already run the experiment: `docs.css` re-declared three of these tokens, **never diverged in
what it copied**, and diverged **by addition** anyway, growing three link tokens that exist
nowhere else. *That's* the failure mode — a chosen duplicate doesn't rot by drifting apart, it
rots by growing.

**Ordering as a design decision.** `docs.css`'s three re-declarations came out in a **separate,
later commit**, after the plumbing was verified — because while they existed, `/docs`, `/about`
and `/history` would have kept their colours even if the shared sheet failed to load, masking
the failure on exactly three pages. Deleting a duplicate *before* you trust the original is how
you keep a false negative.

**Two container traps, both prod-only, and one of them this owner had flagged.** Every workspace
in the glob needs its `package.json` COPYed before `npm ci` (missed → build fails outright), and
npm links workspaces as **relative** symlinks, so the Shuffler's runtime stage — which flattens
`/repo/apps/shuffler` to `/app` — must copy `packages/` or the link dangles and every page loses
its colours in the container only. **`verify-container-boot.sh` would not have caught the
dangling link**: `import.meta.resolve` doesn't check the file exists, so the server boots fine
and only the route 404s. It was closed by building the image and curling it. A boot check is not
a link check — worth remembering the next time "it starts" is offered as evidence.

**A test finding that generalises.** `document.fonts.check('16px Orbitron')` returns **false** on
the Tabletop even with a correct `<link>`, because browsers fetch a webfont **lazily** — only
when something on the page actually uses the family — and nothing on the Tabletop does yet (its
only styled surface is the off-brand landing page). The test became `await
document.fonts.load(...)` then `check(...)`, asserting **fetchability** rather than loadedness.
The Shuffler's equivalent needs no `load()` because plenty there is set in Orbitron. Any future
"is our font working" test on a ship with no on-brand surface hits this.

**What deliberately did NOT ride along**, each buoyed instead of decided:

- **`LandingPage.tsx` was left byte for byte.** It is the Tabletop's only styled surface and the
  largest possible ride-along on a token change — restyling it *is* the Tabletop's design pass in
  miniature, and it needs Jess's sign-off. `tabletop-landing-page-palette`.
- **`--playmat-one`/`--playmat-two` stayed in `game.css`.** "The playmat is one object, one
  appearance" was decided about the Shuffler's two *pages*; extending it across the ship boundary
  to a tldraw-rendered seat mat is an unratified Layer-2 claim, and moving the tokens would have
  answered it silently. `playmat-colours-fleet-or-shuffler`.
- **Font tokens** (`--font-chrome`/`--font-content`/`--font-display`) were **asked about rather
  than slipped in**, and Jess hasn't answered — so they are *unresolved*, not rejected. Colours
  shipped alone.

**What this closes and what it doesn't.** The Tabletop can now write on-brand CSS; it still has
**no stylesheet of its own**, so the first Tabletop-only rule has nowhere to live and inline
styles remain the default by inertia. Loading Orbitron also does **not** put it on tldraw canvas
text — the `geo` `font` enum still has no Orbitron in it, so on-brand canvas text still needs a
self-rendering shape. Necessary, not sufficient.

## 2026-08-07 — library and command zone swapped sides

No commit sha yet (working-tree change). Jess wanted the library on the right and the
command zone on the left, on both `/prepare` and `/game` — a pure placement swap, no
appearance change on either component.

**Two different layout mechanisms, two different levers.** `/game`'s `.game-top-row` is a
flex row with no `order` property, so visual order is DOM order — `active-game-page.ts`
now emits `commandZoneHtml`, `revealedCardsHtml`, `librarySectionHtml` in that sequence,
where it used to emit library first. `/prepare`'s mat is a CSS grid, so the swap is
`grid-column` on two rules in `prepare.css`: `.playmat .cool-command-zone-surround` (4→2)
and `.section-that-is-horizontally-aligned-with-command-zone` — the library-side rule —
(2→4), with the library's `justify-self` flipped `end`→`start` so it still hugs the side
nearer the command zone. Verified with a new spec,
`test/verification/verify-library-command-zone-swap.spec.ts`, which reads actual
`boundingBox()` left edges rather than trusting DOM/markup order, precisely because the two
pages use opposite ordering mechanisms and either could regress independently.

**`.playmat .commander-placeholder` moved too, and it's the part worth remembering.** It's
the "no commander" alt-render of the exact same grid slot the surround occupies
(`commanders.length === 0 ? placeholder : surround`), so when the surround's column changed
the placeholder's had to mirror it — `grid-column` 5→1, keeping `justify-self: start`, so it
overflows right into column 2. That's only safe because the two never render at the same
time. A comment above the placeholder rule in `prepare.css` says so. If a future change to
this grid moves the surround again without also checking the placeholder, the col4/col5 (now
col2/col1) offset between them will look like an unexplained accident instead of the mirrored
pair it actually is.

**Also incidentally became true, not newly written:** the library rule's existing comment
— `justify-self: end; /* left-align, overflow right */` — had been describing the *opposite*
of what the code did (an `end` justify-self right-aligns, it doesn't left-align). Flipping
`justify-self` to `start` for this swap made the comment's claim match the code for the
first time; it was stale before this change, not fixed by it, and stayed stale until it did.

## 2026-08-07 — the swap exposed a 15px vertical-alignment bug it didn't cause

`5c69aa3` **Fix /prepare card-art vertical alignment: 7px undershot the real 22px inset**

Jess reported, right after the library/command-zone swap above, that the library card and
the commander card had lost vertical alignment on `/prepare`. The swap itself couldn't be
the cause -- `grid-column` and `justify-self` are horizontal, and flex/grid reordering
doesn't touch cross-axis alignment. Confirmed by walking the actual DOM to the `<img>`
elements on both `/prepare` and `/game` (using Jess's own live game, prep 1707, on her
running dev server): on `/game` the two card images landed on the identical y-coordinate;
on `/prepare` they were 15px apart.

**Root cause:** `.section-that-is-horizontally-aligned-with-command-zone`'s
`margin-top: 7px` in `prepare.css` only accounted for the `.card-container` inset inside
`.cool-command-zone-surround`, missing the outer `.multiple-cards` inset (15px). The real
total is 22px -- which `game.css`'s `padding-top: 22px` on the same class already had
right, comment and all. `prepare.css`'s 7px was wrong before the swap too; the swap just
put the two elements close enough together, side by side, that the 15px gap became visible
for the first time. Fixed by changing `margin-top` to `22px`, with a comment cross-referencing
game.css's number. See [interactions.md](interactions.md) for the durable lesson (the
numeric coupling between the two files' copies of this class).

## 2026-08-07 — the typefaces got role names, and 39 literals went with them

`f79bc7d` **Name the typefaces by role, and sweep the 39 literals onto the tokens**

The sequel to `4396aea`, which shipped the colour tokens alone because Jess hadn't answered the
font question. She answered: *"yeah, go for it! I'm all for more tokens."* So
`--font-chrome` (Orbitron), `--font-content` (Ovo) and `--font-display` (Risque) joined the
package, along with `--radius-soft: 4px`.

**Named by ROLE, not by typeface, and that's the part worth keeping.** Not `--orbitron`. Three
faces with fixed, long-settled jobs is exactly the situation where the role is the stable name and
the face is the detail — if Ovo were ever replaced, "content" would still be true. The type
sections of this KB and of `/design` had been describing the jobs in prose for months; the tokens
just made the prose enforceable.

**Swept, not merely added — deliberately, and this is now the standing rule.** All 39
`font-family` literals across nine stylesheets were converted in the same commit, because *a token
nobody uses is just a second way to say the same thing*, which was the main argument **against**
adding one. The substitutions ran through a kept script (`scripts/sweep-font-literals.sh`) rather
than a shell one-liner so they stay reviewable and a stray variant surfaces as a leftover instead
of being silently missed. Only `monospace` and `inherit` survive as literals, both genuine
one-offs.

**The literals had already drifted, which is the evidence that justified the whole exercise.**
`styles.css`'s `body` said `"Ovo", Arial, sans-serif` while all **nine** other Ovo sites said
`"Ovo", serif`, and quoting was split between single and double quotes. The token settles it as
`"Ovo", serif` — **a real behaviour change**, observable only if Ovo fails to load, made by the
agent rather than by Jess, and recorded as a decision rather than left to look like a typo fix.
Same rot as `docs.css`'s duplicated colours: a copy doesn't announce itself when it diverges.

**The real reason, though, was the canvas.** A self-rendering tldraw shape passes a font *string*
from TypeScript — there is no class to hang a rule on — so without a name in the shared
dictionary, ticket 11 would have retyped `"Orbitron", sans-serif` into a `.tsx` file where none of
the stylesheet-level conventions can reach it. **A convention that only exists in CSS stops at the
canvas boundary; a token crosses it.** That argument is what also settled where `--radius-soft`
lives.

**`--radius-soft` got a home, answering a question the last `-update` had opened.** Choice 4's
value was decided by Jess on 2026-08-06; `4396aea` left *where it lives* genuinely open, since the
rule is stated fleet-wide including canvas shapes (argues shared) but nothing on the Tabletop uses
it (argues ship-local). **Decided: shared**, on the canvas argument above. Naming an
already-decided value is not a new appearance decision, which is why it was allowed to ride along
with the fonts — **and the ~13 hand-written radius values were pointedly NOT swept**, because
*that* is 13 visible component changes and belongs to its own ticket. A comment in `tokens.css`
says so out loud, so the next agent can't read the token's existence as evidence the sweep
happened.

**A gallery-honesty gap closed in passing.** `/design`'s four type specimens were inline
`font-family: 'Risque', cursive` literals — *describing* the palette exactly the way the
`.swatch-chip` hexes do. They now use the tokens and each names its own, so the section fails
visibly if `/fleet/tokens.css` doesn't load. **That's the template for finishing the colour
swatches:** swapping a literal for a `var()` whose value *is* that literal is not an appearance
change and needs no sign-off.

**Also settled, since it looks wrong at a glance:** `design-gallery.css` and
`design-candidates.css` were swept too. The "gallery chrome must never be copied into the app"
rule is about *components* — it runs one direction. Consuming the fleet's shared dictionary runs
the other, and a museum set in a foreign typeface would look unlike the fleet it exhibits.
**Take tokens from the fleet; don't give selectors to the app.**

Both ships' `verify-fleet-tokens.spec.ts` assert the four new tokens resolve. The Tabletop's copy
matters most: nothing there sets a font yet, so a broken import would otherwise be invisible until
ticket 11.

## 2026-08-07 — Jess shipped two appearance commits directly, outside `/design`

`f42a99a` **Jess does some CSS updates to get the prep screen looking like she wants it**, then
`63d4c08` **Jess updates appearance**. Neither went through the `/design` → stage → decide →
implement process this owner normally mediates. Recorded here as facts that happened, brought back
into sync by this `-update` pass — not as resolved choices, because nothing was staged or asked.

**The last chunky 3D border is gone.** `.cool-command-zone-surround` (`playmat.css`) went from
`5px outset black` with a diagonal black/gray gradient fill to `3px solid black` +
`var(--light-pink)` — the exact border and fill `.game-title` already used. Jess: *"I simplified
the command zone and made it match the deck title."* This is the site [choice 7](open-choices.md#7-deck-title-plaque-border--decided-2026-08-07-shipped)'s
writeup had explicitly flagged as load-bearing — "the surround keeps its `outset`, so the chunky
3D-border language still has a home... it is the only one left" — and had deferred removing as
Jess's call, not a cleanup (see open-choices.md → "Deferred by Jess"). She made that call herself,
by direct edit, the same day choice 7 shipped. Grepping `outset`/`inset`/`groove` (as a border
style) across `playmat.css`, `game.css` and `prepare.css` now returns nothing but stale comments —
the vocabulary this owner had been protecting for months is retired.

**The commander card lost its own frame inside the surround.** `.cool-command-zone-surround
.multiple-cards` went from a bordered, backgrounded, fixed-height box (`border-width: 7px;
border-style: inset; background-color: var(--light-pink); height: calc(278px + 7px*2)`) to bare
flex layout with none of that — the card floats directly in the surround now, sized by its own
content. A new companion rule, `.cool-command-zone-surround .mtg-card-image { box-shadow: none;
}`, suppresses the card's usual drop shadow specifically inside the surround, so it doesn't
compete with the frame's own edge.

**The load-order hazard this owner and the animations owner had both flagged twice is resolved —
as a side effect, not the point.** `html-layout.ts`'s `formatHtmlHead()` swapped from `game.css`
then `playmat.css` to `playmat.css` then `game.css`, matching `/prepare`'s order. Neither commit
message mentions load order; the diff is adjacent to the command-zone/plaque styling and reads
like an incidental reorder. Effect: both play pages now resolve a `.playmat`/`.playmat-*` cascade
tie the same way (the page modifier wins), where they used to resolve it in opposite directions.
The `CAREFUL` comment that used to sit above the bare `.playmat` rule explaining the old hazard
was deleted in the same edit — correctly, since the hazard it warned about no longer exists. Full
detail in [architecture.md](architecture.md) and [interactions.md](interactions.md).

**A numeric coupling this owner had documented broke again, and only half of it was caught.**
`f42a99a` renamed `prepare.css`'s `.section-that-is-horizontally-aligned-with-command-zone` to
`.prepare-container .library-section` and deleted its `margin-top: 22px` outright, with no
replacement — `/prepare`'s library stack now has no vertical-alignment offset against the
commander card at all. `game.css`'s copy (`padding-top: 22px`, with a comment computing 22px from
5px surround border + 10px surround padding + 7px `.multiple-cards` inset) was not touched by
either commit — but `63d4c08`, right after, changed every number that 22px depends on (surround
border 5px → 3px, `.multiple-cards`'s border/inset removed entirely). `game.css`'s comment and
value are now stale, describing arithmetic that doesn't match any real dimension on the page
anymore. **Not fixed as part of this KB sync** — flagged as a likely visual regression on `/game`
worth Jess's attention; it's a CSS/behavior question, not a documentation one.

**Other placement changes in `f42a99a` (prepare only, pure layout, no appearance rule changed):**
the deck-title plaque moved from centered spanning the full grid row (`grid-column: 1 / -1;
justify-self: center`) to starting in column 2 with `justify-self: start` and a new
`margin-bottom: 20px`; the command-zone surround's `justify-self` went `center` → `start`
(matching the plaque); and `.shuffle-up-section`'s `justify-content` flipped `start` → `end`.
Several explanatory comments in `prepare.css` — the column-swap and row-choice reasoning, the
22px derivation — were deleted along with the rules they annotated rather than being preserved
elsewhere; the "why" for those choices no longer lives anywhere in the codebase, only in this
entry now.

**Deliberately not treated as choices, and not retroactively staged.** This owner's usual practice
is "stage it, don't argue it" — build the candidate, put both options on `/design`, ask Jess. That
didn't happen here; Jess decided and shipped directly. The KB records the outcome as fact rather
than inventing a `.choice` block after the fact for a decision that's already made and shipped.

## 2026-08-07 — the hand's growth was jumping the playmat's background crop

`e930da8` **Reserve 2 rows of hand height so drawing to 8 cards doesn't shift the playmat
background**

Not an appearance change and not one of `/design`'s open choices — a stability fix inside
`.playmat-game`'s own box. `.playmat-game` sizes itself off its children, and the bare
`.playmat` rule's `background-size: cover` recomputes its crop every time that height
changes. `#hand-section` only reserved one row of height (the shared `278px` on
`#command-zone, #library-section, #revealed-cards-section, #hand-section`), so a hand
drawing up through its normal maximum — 8 cards, opening 7 plus a draw — wrapped from 1 row
to 2, grew the mat, and re-cropped the art. Visible as the playmat background "jumping"
mid-game with no color or layout change to explain it.

**Fix scope was deliberately narrow.** The obvious-looking fix — pin the art with
`background-attachment` or move something into the bare `.playmat` rule in `playmat.css` —
was raised and rejected in the same session: `.playmat` is the one appearance shared by both
`/game` and `/prepare` at two scales (`a4991f3`), and touching it to solve a `/game`-only
hand-layout problem would have re-opened that boundary. Instead a dedicated `#hand-section`
rule landed in `game.css` — page-specific, right where the siblings' shared `278px` already
lives — giving `#hand-section` its own `min-height: 579px` after the shared block, and
leaving the other three siblings' `278px` untouched.

**The number is measured, not derived.** 579px is the 2-row hand height at both 1440px and
1900px viewport widths — the mat's height stays flat from an empty hand through 8 cards
(verified via a throwaway, uncommitted Playwright script: `.playmat-game`'s height held at
1189px from 8 through 11 cards). **A hand past 8 still grows the mat** — the 3rd row shift
happens at 12 cards — and that residual jump was explicitly accepted as fine rather than
chased further. If the hand's row height, gap, or the 7-card assumption ever changes, this
number needs re-measuring; nothing else in the CSS derives it. Full reasoning in
[interactions.md](interactions.md) → "Styling either play page's mat."

## 2026-08-07 — a Tabletop zone got its first design decisions, and a canvas-geometry lesson worth generalising

`a304c52` **wayfinder tabletop-physics: resolve ticket 11 (what a zone looks like)**

`.scratch/tabletop-physics/issues/11-what-a-zone-looks-like.md` — the last open ticket on the
tabletop-physics map — decided what the self-rendering `mtg-zone` shape looks like at rest and
armed, plus the playmat's border and corner radius, and whether the Stack is its own thing. All
five were staged as `.choice` blocks on `/design` (§ Tabletop zones, between `#cards` and
`#rules` — the gallery's first Tabletop specimens) and picked live. Nothing was implemented in
the real Tabletop app: it still has no CSS source file and no Orbitron `<link>`
(`tabletop-css-tokens` in the repo-root `TODO.md`), so the real `mtg-zone`/playmat shape doesn't
exist yet to receive these decisions. New mock classes in `design-candidates.css`
(`.zone-mock` family, `.playmat-mock` family) and one new fleet token,
`packages/design-tokens/tokens.css` → `--armed-glow: #e6a33d` (amber — deliberately distinct
from `--light-pink`, the global focus-ring colour, and from the `--dark-pink`/`--deep-space`
identity pair).

**The five decisions:**

1. **At rest**: ports `.commander-placeholder`'s dashed-border "empty receptacle" pattern,
   retokenized (`2px dashed var(--dark-pink)`, was `#ccc`/`#f9f9f9`), radius `0`.
2. **Armed**: glow ring + background tint via `--armed-glow`, applied **uniformly to every zone
   type** — even though the tint half is invisible on the library/playmat, since those two sit
   under an opaque picture (ticket 03). Jess's read on staging: the tint is what actually sells
   the effect, but told that the tint is unavailable on the pictured zones, she chose to accept
   the degradation rather than fork the treatment by zone kind. One rule everywhere, not two.
3. **Playmat border**: black, matching the Shuffler's own playmat exactly (`10px solid black`,
   untokenized — one identity across ships). `--dark-pink` was staged and rejected.
4. **Playmat corner radius: 5%, and the *how* is the durable lesson — see below.**
5. **The Stack**: same zone family as graveyard/exile/command, no distinct treatment, no
   invented "blue" token (`DESIGN.md`'s "shared blue strip" language doesn't get a literal).

**The corner-radius decision is a canvas-geometry lesson worth generalising to any future
self-rendering tldraw shape.** Three drafts, two corrections, both substantive:

- **Draft 1 staged the Shuffler's literal `20px`/`80px` values.** Jess: *"the playmat's border
  should be stable on the table when I zoom in and out... the border-radius in pixels would key
  it to my viewport, instead of the canvas."* A fixed pixel radius drifts out of proportion to
  the object as it's resized/zoomed on a continuously-zoomable tldraw canvas — a concern that
  doesn't exist on the Shuffler's fixed-scale DOM pages, where `20px`/`80px` are two literal
  values at two *fixed* page scales.
- **Draft 2 restaged as a bare CSS percentage** (`border-radius: 5%`/`12%`). Jess caught a
  *second* problem: *"the border-radius should be round. The percentage doesn't work because the
  height and width are different."* CSS percentage border-radius uses **width** for the
  horizontal radius and **height** for the vertical radius, separately — so on a non-square box
  it draws an ellipse, not a round corner.
- **The actual answer: one radius value, computed from the shape's own height at render time,
  applied equally to both axes.** Not expressible as a static CSS class at all — for a
  self-rendering tldraw shape this means computing the value in TypeScript from `props.h` when
  the real shape is built, never a CSS percentage. The two candidates staged on `/design`
  (`.playmat-mock--radius-a`/`-b`, `8px`/`18px`) exist only so the gallery could show an
  *already-computed*, actually-round corner to pick between — they bake in what 5%/12% of the
  mock's fixed 150px height comes out to as px. **Picked: 5%** (the subtler, closer-to-square
  option). **Any future canvas-shape geometry decision** — radius, stroke width, anything meant
  to look consistent across zoom/resize — should expect this same two-step trap: a literal
  pixel value assumes a fixed scale the canvas doesn't have, and the seemingly-obvious fix (a
  CSS percentage) silently assumes a square box.

**A second, smaller correction: staged on the wrong stage.** All five specimens were first put
on `/design`'s usual `.stage-dark` — the Shuffler's own play-page convention. Jess caught it
immediately: *"the tabletop is white so why is the background in these examples dark?"* Restaged
on `.stage-white`. **`.stage-white` is correct for any future Tabletop specimen** — copying
`.stage-dark` because that's what the Shuffler's own components use is exactly the kind of
default a future agent would reach for and get wrong; the Tabletop's canvas is white, full stop.

**What this owner's `-review` flagged and how it resolved.** The armed state's uniform
treatment (no fork by zone kind) and the radius's render-time computation were both flagged as
needing Jess's explicit sign-off rather than an agent's default — both got it, live on `/design`,
consistent with "stage it, don't argue it."

## 2026-08-07 — the last numeric coupling on the library-alignment class is gone

`c19f49c` **Manual: Jess tweaks to game page. section-that-aligns-with-command-zone is no
more**

The sequel to the entry above (`f42a99a` then `63d4c08`), which had left `game.css`'s
`.section-that-is-horizontally-aligned-with-command-zone { padding-top: 22px; }` computing
an offset from numbers that no longer existed — the surround's border had gone 5px → 3px and
`.multiple-cards` had lost its border and inset entirely, so the comment's arithmetic matched
nothing on the page. Flagged in the prior `-update` pass as a likely visual regression on
`/game`, not fixed at the time.

Jess closed it herself, directly, the same way she'd already closed the `/prepare` side in
`f42a99a`: delete the rule rather than recompute a new number for it. She deleted the whole
`padding-top: 22px` rule and its explanatory comment from `game.css`, and dropped the
`section-that-is-horizontally-aligned-with-command-zone` class from both places it still
named — `library-components.ts`'s `#library-section` and
`revealed-cards-components.ts`'s `#revealed-cards-section`. Grepping the selector across the
app now returns nothing outside this KB's own history.

**The class is fully retired, not fixed.** `/game`'s library stack and command zone now sit
at their natural position, with no vertical-alignment offset between them at all — consistent
with the surround having shrunk (no more `.multiple-cards` inset/border to align past). This
closes the numeric-coupling watch point in [interactions.md](interactions.md) for good: there
is no replacement number on either page to keep in sync, so a future surround change starts
from zero rather than from a stale 22px.

## 2026-08-08 — the square: a pure placement decision, and a tldraw limit made explicit

`.scratch/tabletop-table-layout/issues/10-the-square.md`, resolved as part of the Table-layout
map. No CSS changed and nothing was implemented — `src/server/cardLayout.ts` and
`tableFurniture.ts` are untouched — this was a design decision recorded in
`apps/tabletop/DESIGN.md`'s new "The square" section: player areas move from a row into
compass slots (N/E/S/W) around a fixed-size, centered Stack, by join order.

**Worth this owner's attention for one reason: "no per-viewer rotation" is a hard tldraw
platform limit, not a deferred wish, and it now has a fifth entry in
[README.md](README.md) → "tldraw limits."** Jess re-raised the want — a physical table where
each player's mat faces them — and it was reconfirmed still impossible on a shared tldraw
board without an iframe-level trick, same posture as Mural ("Mural doesn't rotate either").
That's the same category as the `font` enum and the locked-shape drop-target limit already in
that list: something to design *around*, permanently, not a gap to keep re-litigating. The
consequence is concrete: every player area, including the two E/W compass slots, stays upright
in world space, so a wide-short rectangle parked at an E/W slot reads "sideways" — an accepted
cosmetic quirk, explicitly not worth a second internal layout to fix for a purely cosmetic
payoff.

**A clean instance of placement-without-appearance, this time on the canvas rather than in
CSS.** The pattern this owner has been enforcing in stylesheets since the deck-title plaque
move (2026-08-07) — a placement change is not a license for an appearance change to ride
along — held here too, on different terrain: only the *position* of the player-area rectangle
changes; its internal layout (playmat, library, Command Zone, Graveyard, Exile, same
footprint from ticket 01) is untouched, and no color, radius, or token question rode along
with the reposition. The geometry-computed-in-TypeScript guidance this owner gave ticket 01
(bake the widened player-area rectangle's dimensions in `cardLayout.ts` at render time, not as
hardcoded pixels) was consulted again and held without needing to be re-argued — this ticket
arranges already-parametrized rectangles in space, it doesn't introduce a new static value.

**Explicitly provisional, and said so out loud.** Jess: *"this is all gonna be tweaked after
play experience."* Recorded as a first build to react to, not a layout to defend — worth
remembering before anyone treats the N/E/S/W assignment as more settled than it is.

## 2026-08-08 — a fleet token resolved inside a canvas shape for the first time

`.scratch/tabletop-physics/issues/13-*.md`, `f66b0a5` (**Replace furniture with the mtg-zone
custom shape**) then `d35c090` (label-size follow-up), then a same-day working-tree fix. The
`mtg-zone` custom shape (`MtgZoneShapeUtil.tsx`) landed with its zone labels ("Graveyard",
"Exile", "Library", "The Stack") in `d35c090` set to `var(--tl-font-serif)` — a deliberate
placeholder, tldraw's own token, chosen for size/legibility parity with the stock `geo` label
it replaced, with a comment saying the retokenized look was ticket 14's job. That placeholder
was then swapped for `fontFamily: "var(--font-chrome)"` the same day, because — unlike the
*border* colour, which really is ticket 14's undecided territory — the label's typeface was
never actually open: Orbitron-for-chrome is the settled fleet rule, and nothing about a canvas
region label is different from a UI heading.

**This is the first time a fleet token has been asked to resolve inside a genuine
self-rendering canvas shape, and it worked, which retires two years-old open questions at
once.** `f79bc7d` (2026-08-07) named `--font-chrome` partly *for* this future case but nobody
had tried it; this owner's own [interactions.md](interactions.md) said flatly "a `.tsx` shape
can't `var()`, but it can read them off the computed root style" — wrong, and now corrected.
`MtgZoneShapeUtil`'s `component()` sets `fontFamily: "var(--font-chrome)"` as a plain inline
style on a `<div>` inside tldraw's `HTMLContainer`, and it resolves to Orbitron.

**Why it works, mechanically, worth remembering because it generalizes beyond fonts.**
`HTMLContainer` (`node_modules/@tldraw/editor`) is an ordinary unshadowed `div` — tldraw does
not put shape content behind a Shadow DOM boundary or an iframe. `main.tsx` imports
`@fleet/design-tokens/tokens.css` at module scope, which defines the tokens on `:root` before
`<App/>` ever renders. A custom property defined on `:root` cascades into any descendant DOM
node exactly the way it would on a normal page, and an inline `style={{ fontFamily: "var(...)"
}}` is resolved by the browser's ordinary CSS engine at computed-style time — inline styles
are not special-cased out of custom-property resolution. So **any DOM-rendering custom
shape** — not just `mtg-zone` — can consume `--font-chrome`/`--font-content`/`--font-display`/
`--radius-soft` (or any future shared token) the same way, with no per-shape plumbing. The
caveat that *does* still hold: this is the live DOM only. `toSvg()` canvas export still has to
hand-write the resolved value into the exported SVG, since an exported SVG has no live `:root`
to inherit from — that cost (flagged in [interactions.md](interactions.md) → "designing
anything inside the tldraw canvas") is unaffected by this finding.

**Verified two ways**, not just asserted: (1) DOM inspection in a live browser — the label
`div`'s computed `font-family` is `Orbitron, sans-serif`, and the inline style literally reads
`var(--font-chrome)`; (2) a screenshot showing the labels rendering in Orbitron's geometric
look, not a system serif/sans fallback.

**Corrected as stale by this finding:** [README.md](README.md) → "tldraw limits" used to imply
the font-token mechanism was theoretical ("should reach the canvas"); it now says confirmed,
with the verification method. `apps/tabletop/CLAUDE.md` → "UI Style" had a line reading
"Orbitron still doesn't reach tldraw canvas text... loading it was necessary, not sufficient" —
true when only stock `geo` shapes existed (the `font` enum still has no Orbitron in it, so that
half is unchanged), but stated as if no canvas text could ever be on-brand, which `mtg-zone`
now disproves for self-rendering shapes. Needs its own fix in that file, tracked separately
since it isn't part of this owner's KB.

**What's still open, unchanged by this:** the zone's *border* — dashed-grey at rest, playmat's
plain black — remains today's placeholder look, explicitly deferred to ticket 14, which also
owns the armed-glow retokenization. Only the label typeface was settled territory; nothing
about the border question moved.

## 2026-08-08 — ticket 11's zone decision got built, not just decided

`.scratch/tabletop-physics/issues/14-zone-appearance.md`. Sequel to the entry above (ticket 13)
and, further back, to [choice 11's decision](open-choices.md#the-tabletop-side-fleet-gaps)
(`a304c52`, 2026-08-07, § Tabletop zones on `/design`). Ticket 13 shipped the placeholder
border with the label typeface fixed; ticket 14 replaced the placeholder with the picked
options themselves in `MtgZoneShapeUtil.tsx`.

**Verified against the literal candidate rules, not the ticket's prose "Answer," and that
distinction mattered.** An earlier `-review` pass on the implementation plan caught that
ticket 11's written summary of its own decision didn't match the actual staged pixel values in
`apps/shuffler/public/design-candidates.css` — the KB is right to insist citations point at
selectors, not remembered prose, and this is a second instance of the same lesson landing one
level up (a decision's *summary* can drift from the decision's *artifact* too). What shipped
was checked against `.zone-mock--rest` / `.zone-mock--armed-glow` directly:

- **At rest:** `border: 2px dashed var(--dark-pink)`, `color: var(--dark-pink)`,
  `background: rgba(187, 82, 119, 0.03)` — verbatim from `.zone-mock--rest`.
- **Armed:** option **A, the glow ring** (not option B, "armed-border," which this owner's
  candidate CSS also staged) — `color: var(--deep-space)`,
  `background: rgba(230, 163, 61, 0.1)`,
  `box-shadow: 0 0 0 3px var(--armed-glow), 0 0 16px 5px rgba(230, 163, 61, 0.65)` — verbatim
  from `.zone-mock--armed-glow`.
- **The playmat kept its own identity, untouched by the zone family.** `border: 10px solid
  black`, untokenized, exactly as decided; `borderRadius: h * 0.05`, computed fresh from
  `props.h` every render — not a CSS percent (draws an ellipse on a non-square box) and not a
  fixed px (drifts out of proportion as the canvas zooms). This is ticket 11's twice-corrected
  geometry lesson (see the entry above, "a canvas-geometry lesson worth generalising") landing
  in real code rather than a `/design` mock's baked-in px.
- **The armed glow is additive, not a replacement, and that's why it survives the picture
  overlay.** `box-shadow` spreads *outward* from the border edge, unlike `border-box`'s
  inward-drawn border — so on the playmat and library, where an opaque `image` shape sits on
  top and hides any interior tint (README.md → tldraw limits), the glow ring still shows around
  the outside. Confirmed by screenshot, not just argued from the CSS box model.
- **The Stack got no distinct treatment** — same dashed-pink/armed-glow family as
  graveyard/exile, per the ticket's own instruction not to invent a fifth look.

**The armed state is derived, not stored, and a new test proves the two halves of that claim
separately.** `useIsZoneArmed` (`zoneHitTest.ts`) computes arming reactively inside the zone's
own `component()` — never written to the tldraw document, so no sync write and no undo entry.
`test/verification/verify-zone-armed.spec.ts` checks this isn't just an implementation detail
but a player-visible fact: one test polls `getComputedStyle(...).boxShadow` on a zone mid-drag
and confirms it reverts to `none` on drop; a second test drives two separate browser contexts
against the same table and confirms client B's copy of the zone shows nothing while client A is
mid-drag over it — the local-only promise ticket 14 made, checked cross-client rather than
trusted.

**A card-side helper got a name and a shared home in the process.** `MtgCardShapeUtil`'s
`zoneAt()` (the topmost-zone-at-a-point scan used to detect drop zones) and the new arming
check both need "which zone is under this point," so the scan moved into
`apps/tabletop/src/client/shapes/zoneHitTest.ts` as `topmostZoneAt`, and `zoneAt()` became a
one-line caller. Not a design decision — noted because the tabletop-shape-mechanics owner
records the mechanism side of this same change.

**This is the third time "stage it, don't argue it" cashed out as literally true — the built
code matches pixels that were already decided and already visible on `/design`,** with the one
new wrinkle that *verifying* the port also meant re-reading the candidate CSS rather than
trusting the ticket's own recap of it. `/design`'s § Tabletop zones section still reads "Mock,
not the real component" and needs its own pass to say the real component now exists (tracked as
a gap, not fixed in this pass — see [open-choices.md](open-choices.md)).

## 2026-08-08 — life totals and commander damage: a new player-visible surface is coming, placement decided, appearance deliberately not

`.scratch/tabletop-table-layout/issues/12-life-totals-and-commander-damage.md`, grilled and
resolved with Jess 2026-08-08. No CSS changed, nothing built — a design decision, and this
owner's job is to know exactly which half of it was decided.

**What was decided: kind, content, and placement.** Life totals and commander damage become
a new **locked custom tldraw shape**, working name **`mtg-counter`** — a number with +/-
buttons, also directly typeable, synced through the room like any shape. Layout of the name
row (above the command zone/library, per ticket 01's geometry), **dictated by Jess
verbatim**: player name, large font, left-justified; then right-justified, all the
commander-damage counters, followed by the life counter (bigger) on the far right. Life
starts at 40; commander-damage counters start at 0, always visible, **one per commander**
(a partner-deck opponent gets two). Everyone can change everything — no ownership
enforcement, per the fleet's "players own the game experience" principle.

**What was NOT decided, and must not ride along: the counter's appearance.** Font, exact
sizes, colors beyond the sleeve swatch — all open. This was placement + content only, the
same seam this owner has enforced since the deck-title plaque move. The `mtg-counter`
implementation ticket is where an unapproved appearance will try to hitch a ride (exactly
like the `mtg-card` `indicator()` warning): it needs this owner's `-context` before design
forms and `-review` on the plan. "Large font" and "bigger" are **relative placement-scale
facts from Jess's dictation, not typography decisions** — which face (presumably
`--font-chrome`, but presume out loud, don't assume silently), what px/em, what weight are
all still to decide. And it's a canvas shape, so the whole tldraw-limits list applies:
self-rendering for any fleet typeface, no `:focus-visible` reach, geometry computed in
TypeScript at render time rather than static CSS values.

**A fleet-wide identity fact fell out: sleeve color is now a player-identity signal.** Each
commander-damage counter is identified by the opponent's **name + sleeve color** — leaning
on ticket 09's decision that v1 sleeves are solid colors, and on ticket 11
(`11-sleeve-color-to-card-back.md`, the map's next open ticket) for how the color travels
per seat. **No separate player-color concept was created**, and playmats (images) were
explicitly rejected as the identity carrier. So sleeve color now does double duty — card
backs *and* counter identification — which raises the stakes on whatever palette ticket 09's
picker offers: two players with near-identical sleeves now confuse damage tracking, not just
card backs. Recorded in [README.md](README.md)'s design language.

**Mechanically grounded before deciding** (via `tabletop-shape-mechanics-context`): locking
gates tldraw's gesture state machine but not DOM events, so a locked shape's `component()`
can host working buttons (`pointer-events: all` + `editor.markEventAsHandled()`, the
`HyperlinkButton` pattern). That's why "locked furniture with live +/- buttons" is a
coherent object and not a contradiction — the same early-consult pattern that moved the
`mtg-zone` architecture decision on 2026-08-07.

## 2026-08-08 — dev-only chrome gets no visual dev-marker (the "yo!" link)

Branch `worktree-yo-fast-start`. A dev-mode-only fast-start link — a bare
`<a href="/yo">yo!</a>` at the front of `.right-nav` in `views/partials/header.ejs`,
server-side-conditional on `locals.showYo` (only `index.ejs` passes it, from the `devMode`
cookie), landing on a new `GET /yo` route that 404s without the cookie. **Zero new CSS**:
the anchor is styled by the existing `site.css` → `.right-nav a` rule, exactly like its
siblings, and as an `<a>` it inherits the global `:focus-visible` ring for free.

**The precedent, set by this owner's own `-context` and honoured by the implementation:
a dev-only affordance carries no invented visual marker.** No dashed border, no debug
color, no badge saying "dev". Its dev-ness is expressed by *when it renders*
(server-side conditional), not by *how it looks* — when present, it adopts the rule for
its slot verbatim. That parallels `/dontdie` (undocumented, invisible) rather than the
`monospace` debug blocks (a genuine one-off treatment for a genuinely different kind of
surface). No `/design` specimen was added, correctly: the gallery documents visual
treatments, and this link introduces none — a specimen would exhibit `.right-nav a`,
which is not a new component.

Nothing in the KB's rules, tokens, files, or open choices moved. Recorded so the next
dev-only affordance doesn't invent a "dev look" that would then need naming, staging,
and defending.

## 2026-08-08 — sleeve color travels as data, and the sleeve got a rendering model

`7585bf1` **Resolve table-layout ticket 11: sleeve color travels as data, baked per-card at
mint** (`.scratch/tabletop-table-layout/issues/11-sleeve-color-to-card-back.md`, grilled with
Jess). No CSS changed, nothing built — a transport-and-rendering-model decision, and this
owner's stake in it is a category question it settles plus an appearance decision it
explicitly reserves.

**The category question: is a player's sleeve hex "a raw hex value"?** No. `sleeveColor`
travels as an optional raw hex string on `seat.joined`'s player data — not as a URL, not as a
generated image — because ticket 12 already made sleeve color *player identity*, and the
commander-damage counters need the raw value, which a URL would lock away. This owner's
raw-hex ban governs values **agents pick for chrome**; a sleeve hex is **domain data the
player picked**, same category as card art. The ban was never in tension with this, but the
question had not been stated before, and an agent grepping "no raw hex ever" could have
blocked the field. Now it's stated: data-hexes are exempt; what an agent must not do is
*choose* one (no default color exists — unsleeved seats keep the standard Magic card back).

**The rendering model is decided; the treatment is not — the seam this owner keeps.** A
sleeve is a solid-color rectangle slightly larger than the card (a few px per side, mirroring
real sleeves). Face-down card and library pile render as the bare sleeve rectangle; a face-up
sleeved card renders as its image centered inside the sleeve rectangle — so every face-up
sleeved card wears a sleeve-color border, the IRL look. **Reserved for implementation time,
with this owner:** exact margin, corner radius (a sleeve is a physical object, so the
physical-rounding rule applies — and it's canvas geometry, so it's computed in TypeScript at
render time, the ticket-11-radius lesson), any border/sheen/texture, and the picker's swatch
palette (ticket 09's artifact, now carrying identity weight per ticket 12). Nothing rode
along.

**A KB gap this owner had flagged got confirmed and became decision-relevant.** The
`-context` consult had noted the library furniture is a *second consumer* of the card back;
the decision leans on exactly that — a sleeved seat's library pile becomes the solid sleeve
rectangle, so the library now has two looks keyed on sleeve presence.

**Why baking per-card is legal, worth keeping because it retires an old rule.** Sleeve color
is a **game constant** — chosen before the game, never changed mid-game. That immutability
dissolves tabletop-physics ticket 02's "never bake per-card" rule, whose whole rationale was
mid-game sleeve changes rewriting every shape. A someday-maybe stays deferred: distinct
front/back sleeve colors, or an image sleeve — v1 is one color doing both jobs.

**Also landed:** `notes/GLOSSARY.md` now carries a **Sleeve** definition stating the same
model, so the vocabulary outlives the ticket.

## 2026-08-08 — the Shuffler's two heads became one page shell

`b268414` **Unify the Shuffler's two page-shell builders (arch ticket 06)**. Every page's
`<head>` now comes from one place: `formatHtmlHead(options)` in
`src/view/common/html-layout.ts` — `{title, stylesheets?, additionalFonts?, scriptsHtml?}`.
The EJS pages reach it through `views/partials/head.ejs`, now a thin adapter over
`app.locals.formatHtmlHead` (wired in `src/app.ts`) that prepends `/site.css` and converts
`locals.script` to a deferred tag; `/game` and the error pages reach it through
`formatPageWrapper`, which passes `["/playmat.css", "/game.css", ...]` (with an inline
comment saying the order is the deliberate cascade-tie resolution), `additionalFonts:
["Ovo"]`, and a `GAME_HEAD_SCRIPTS_HTML` constant (htmx.js, the 409/502 `responseHandling`
config, game.js, modal-query-params.js). The skeleton — tokens.css **first**, fonts,
browser-tab-id, guarded tracing bootstrap — can no longer diverge between page families.
No page's stylesheet *set* changed; `APP_STYLESHEETS` untouched.

**Three visible fixes rode along, and all three were flagged by this owner's `-review`
rather than smuggled:** the EJS pages gained meta charset + viewport (a real phone-rendering
change — 375px screenshots of `/` and `/prepare` were taken for Jess and render sensibly);
`/game`'s tracing init gained the `window.Hny && window.browserTabId` guard the EJS head
already had; and `/game`'s duplicate `htmx:configRequest` listener was deleted. The review's
other catch became code: **the title is now `escapeHtml`'d inside the shell** — the TS path
had interpolated it raw, and deck names come from Archidekt. That's the second
user-supplied-text escape fix in this KB (the first was the deck-title plaque move).

**The jest seam survived, deliberately.** `test/html-layout-fleet-tokens.test.ts` kept its
file and its job (the cheap gate on the `/game` path), retitled "the one page shell links the
fleet palette", with the new options signature and new assertions: tokens before styles, page
sheets after both in the given order, Orbitron always, `additionalFonts`, title escaping.
Full `./verify.sh` (50 specs) and `npm test` (305) green.

**A premise correction worth keeping: the ticket said this KB was "awaiting a sweep," and
that was a misreading — the note itself was accurate and unchanged.** The open-choices note
about typeface names in the heads was correct as written; the ticket inferred pending work
from it that the note never claimed. Same failure family as "pending read as undecided"
(choice 4, 2026-08-07): a reader inferring a work item from a description. The KB's defense
is the same — state what is decided, what is shipped, and what is merely *described*,
explicitly.

**KB consequences, all landed with this entry:** architecture.md's "two heads" section is
now "two page-body systems, ONE page shell"; interactions.md's dependency and
adding-a-stylesheet watch points name the real doors (`additionalStyles` for EJS views,
`additionalStylesheets` on `formatPageWrapper`, `stylesheets` only on the shell itself);
the README's Fonts row and the font-token notes say **two** `<head>` sources, not three.
`apps/shuffler/CLAUDE.md`'s Templating and fonts bullets were updated in the commit itself.

## 2026-08-08 — the Command Zone arrived on the canvas wearing the standard zone look

`1046b93` (**Command-zone redraw of the player area, table-layout ticket 13**) +
`b18bd16` (code-review fixes). The Table-layout map's first *implementation* ticket to
land. The player area got a Command Zone (two cards wide, for partner commanders) beside
the Library; Exile dropped to the bottom third under Graveyard; the right-hand column
widened 425 → 550 and every seat re-derived. All of that is geometry, recorded with exact
numbers in `apps/tabletop/DESIGN.md`'s table — not this owner's territory.

**What is this owner's territory is what *didn't* happen, and it went exactly as the
`-context` consult advised.** The new furniture is a plain `mtg-zone` — dashed dark-pink
at rest, armed glow, `--font-chrome` Orbitron label — with **no new CSS, no new tokens,
no stock-`geo` regression, and no invented "commander lives here" treatment**. The label
is "Command Zone": Title Case, the two-word glossary term, matching "Library" /
"Graveyard" / "Exile" / "The Stack". Verified by reading the diff: the only client-side
surface touched is `tableFurniture.ts` calling the existing `zoneShape` helper;
`MtgZoneShapeUtil.tsx` is untouched.

**A distinct commander-zone look remains a future decision, not a gap.** If tickets
08/18/19 (or anyone) ever want the Command Zone to look different from its siblings,
that's a new appearance decision for this owner to stage — don't read the current
sameness as an oversight to fix in passing.

**A stale-comment debt this KB was owed got paid.** `src/shared/mtgZoneShape.ts`'s doc
comment said "`command` is included even though no server code places a command zone
yet" — true when written (tabletop-physics ticket 13), false the moment this landed. The
same change that falsified it deleted it. That's the pattern to copy: a comment describing
"not yet" state should die in the commit that changes the state, not wait for a sweep.

## 2026-08-08 — the counter disc: first canvas component to arrive pre-staged, and the `.hand-count` recipe went fleet

`4c64ef2` **Counters ride along on a card (tabletop-physics ticket 18)**

A new player-visible canvas component: `mtg-counter`, the disc a player drops onto a card —
free editable text, blank by default, 44px, riding the card via tldraw parenting
(`MtgCounterShapeUtil.tsx`; the attach/detach mechanics belong to the tabletop-shape-mechanics
owner and are recorded there).

**The treatment is the `.hand-count` recipe, and staging rode in the same commit.** This owner's
`-context` recommended porting `game.css` → `.hand-count` — the app's one existing count disc,
fully tokenized — rather than inventing a chip: `--deep-space` fill, `var(--narrow-border)`
solid `--dark-pink` ring, `--light-pink` text in `--font-chrome`, `border-radius: 50%` (count
discs are a sanctioned round category). The implementation staged it on `/design`
(§ `#counter-disc`, badge `candidate`, `.counter-mock` in `design-candidates.css`, on
`.stage-white` per the ticket-11 precedent) **in the same commit that built the shape** — so
the component shipped visible and marked pending rather than fully-formed and smuggled.
**Appearance is staged-not-decided**; Jess's sign-off converts the badge and names the chip
pattern in the README. If she signs off, "small count disc: deep-space fill / narrow dark-pink
ring / light-pink text" becomes the de-facto chip pattern with two consumers.

**Proportional geometry, third exercise of the playmat-radius rule.** Border width is
`h * (3/44)` px (commented `--narrow-border, proportional`) and font-size `h * 0.32`, computed
from `props.h` at render time — resize stays enabled (aspect-ratio locked, which is also what
makes `border-radius: 50%` safe; on a non-square box a percentage radius draws an ellipse) and
the disc keeps its proportions. A fixed `3px`/`14px` would have drifted as the disc scales.

**The fleet's one sanctioned `outline: none` shipped.** The in-place editing input is
invisible chrome — transparent, inherits the disc, native focus outline suppressed with a
comment naming the canvas exemption (tldraw owns focus/selection indication; the Shuffler's
global ring doesn't exist on the Tabletop, and the "never write `outline: none`" ban governs
DOM stylesheets). Recorded in README → tldraw limits so a lint sweep doesn't "fix" it and
nobody cites it as DOM precedent.

**An empirical canvas fact worth keeping:** tldraw's own end-of-gesture focus handling beats
`autoFocus`, ref-callback focus, and a bare-effect focus on a custom editing input — all three
end with `document.activeElement === body`. The working pattern is `setTimeout(0)` inside a
`useEffect` keyed on `isEditing`. Mechanics detail, but it's the kind that gets re-debugged.

**What stayed stock, per "record the limit, don't fight it":** the toolbar got one
`TldrawUiMenuItem` with the stock `geo-ellipse` icon before `DefaultToolbarContent`
(`TablePage.tsx`) — tldraw chrome, unstyled. The tool's *existence* is an assumption flagged
for Jess (the spec never said how a player obtains a counter). The indicator is tldraw's
default box. `toSvg` was skipped, consistent with `mtg-card`/`mtg-zone` — buoyed as
`custom-shapes-lack-toSvg`, a three-shape gap for one pass, with Orbitron hand-carried into
the SVG per this KB's standing rule.

**A name collision resolved in ticket 18's favor.** This KB's "coming to this owner" entry
had been calling the *life counter* (table-layout ticket 12) `mtg-counter`. The type string
belongs to this shape per the tabletop-physics spec; the life counter needs a new name
(buoyed as `life-counter-needs-own-name`). README, open-choices and interactions all
corrected in this `-update` pass — the life counter's appearance is still deliberately
undecided and still owes this owner a `-context`/`-review`.

## 2026-08-08 — the deck name joined the seat label: the fleet's first name/deck pairing

`4263ef8` **Deck name travels to the table's name label (ticket 15)** (+ `a291020`,
a parameter-clump refactor with no design content).

The Tabletop's seat name label — the locked stock tldraw `text` shape `ensurePlayerArea`
draws in `apps/tabletop/src/server/tableFurniture.ts` — now shows **two lines: player name
first, deck name second**, via ``toRichText(`${playerName}\n${deckName}`)``. Decided *with*
this owner's `-context` mid-implementation (the early-consult pattern again), and it is the
fleet's first player-name + deck-name pairing, so the composition is now precedent, recorded
in [README.md](README.md)'s design language.

**Why each piece, kept because the next label will ask:** player first because **line
position is the only hierarchy a stock text shape offers** — no per-line size or face exists
on stock props; two lines rather than one so a long deck name grows the autoSized label
*downward* instead of toward the neighboring seat; no prefix, no separator glyph; deck name
**verbatim** (player-chosen content, card-art category, no truncation). A missing deck name —
the defensive redraw at card arrival — degrades to exactly the old one-line label, never a
dangling blank line. All of this is in a comment above the props in `tableFurniture.ts`, so
the code carries its own reasoning.

**Stock props otherwise untouched, and a limit got its second confirmation.** `font: "serif"`
and `color: "green"` stay — the stock `text` shape's `font` prop is the same
Orbitron-less enum as `geo`'s (README → tldraw limits, now saying so explicitly). So the
label is off-brand by platform, not by choice. When it someday becomes a self-rendering
shape, the two-line *structure* carries forward and per-line hierarchy becomes possible —
that will be a **new** appearance decision for this owner, not a port.

**The data side: `seat.joined` got its contract, and the sleeve field got its home.**
`contracts/payloads/seat.joined.v1.json` is new — `seatId`, `playerName`, `deckName`
**required**; `playmatImageUrl`, `cardBackImageUrl`, and `sleeveColor` (ticket 11's
optional raw hex, `^#[0-9a-fA-F]{6}$`, winning over `cardBackImageUrl` when both arrive)
optional. Ticket 11's transport decision is now schema, ahead of ticket 17's rendering —
where the reserved sleeve-appearance choices (margin, radius, sheen, swatch palette) come
due with this owner.

**A KB gap the `-context` consult flagged got closed in this pass:** the README had never
mentioned the seat name label at all — the Tabletop's oldest piece of player-visible text,
invisible to this KB. Now recorded, so the next agent styling a label finds the composition
instead of inventing one.

**No `/design` specimen, deliberately** — same reasoning as the "yo!" link (2026-08-08,
above): the gallery renders components with the app's own stylesheets, and this label has
none; it's stock tldraw chrome whose only decided property is *text composition*, which a
CSS specimen can't exhibit honestly. If the label becomes self-rendering, it stages then.

## 2026-08-08 — the sleeve got its look, and a padded wrapper lost to `.tl-image`

`0a768e6` **Ticket 17: sleeve color travels in seat.joined and renders on the cards**, then
`bfdc877` **Ticket 17 fix: sleeve ring actually shows on a face-up card**.

The treatment this owner had reserved since ticket 11 ("exact margin, corner radius, any
border/sheen") came due and was decided with the `-context` consult mid-implementation, not
smuggled: **corner radius `w * 0.05`, margin `w * 0.03` per side, both proportions of
`shape.props.w`** — cards are aspect-locked resizable, so a fixed px would drift out of
proportion; this is the playmat-radius lesson (ticket 11) applied for the third time, now to
`mtg-card` itself. `0.05` is the Shuffler card's own corner ratio (10/200); `0.03` mirrors a
real sleeve's ~1–2mm overhang. The sleeve is the flat solid player-picked hex — **no border,
sheen, or texture** — and the face image keeps its own rendering inside the ring, no second
radius (Scryfall art carries its own printed corners). Face-down (sleeved) renders as the
bare sleeve rectangle. `indicator()` untouched — the standing ride-along warning held.

**The library pile became `MtgZoneShapeUtil`'s own render**, via a new `sleeveColor` prop on
`mtg-zone`: an inner solid rect inset by `LIBRARY_PILE_INSET = 12` — a constant **moved to
`src/shared/mtgZoneShape.ts`** so the server's card-back-image geometry and the client's
sleeve geometry share one number — radius 5% of the inset width. A composition subtlety worth
keeping: the sleeved zone's shape-level opacity is 1 (set in `tableFurniture.ts`) and the
component fades **just the box chrome** to 0.5, so the pile stays as vivid as the cards while
the furniture keeps the same composite look its plain siblings get. The pile div is a
*sibling* of the box div, not a child, precisely so it doesn't inherit the fade.

**The bug that earned a tldraw-limits entry.** The first commit wrapped the face image in the
padded sleeve div and reused `className="tl-image"` on the img — deliberately, "rather than
reinventing it." But tldraw's `.tl-image` rule is `position: absolute; inset: 0`, anchored to
`.tl-image-container` — the img escaped the wrapper's padding entirely and the ring never
rendered. **The DOM read fine and the build passed; only a live-browser screenshot caught it**
(`.scratch/tabletop-table-layout/verify-17-sleeved-card.png`). `bfdc877` drops the class in
the sleeved branch and styles the img directly (`display: block; width/height: 100%`).
Recorded in [README.md](README.md) → tldraw limits: reuse `.tl-image-container` for its
`pointer-events: all`; never reuse `.tl-image` on an img you intend to frame. The general
lesson is the choice-5 one again — a treatment collides with structure you only find by
rendering the thing — plus a new wrinkle: *pattern reuse walked the bug in*. A borrowed class
carries its whole rule, not just the part you borrowed it for.

**What's still open:** the picker's default/swatch palette (ticket 16 — no default sleeve
color exists; `null` ⇔ unsleeved), and the `/design` specimen, buoyed as
`design-sleeve-specimen` rather than skipped silently — a mock would follow the ticket-11
precedents (labelled a mock, staged on `.stage-white`).

## 2026-08-08 — the counter's text learned the shape of its own disc

**⚠️ REVERTED the same day — see the next entry.** The circle-aware fit this entry
describes (chord widths, explicit line divs, canvas `measureText`) shipped in `2f5bfb4`
and Jess pulled it back out hours later (worktree `counter-fit-simplify`). What survives
is the *shrink-to-fit* behaviour itself, in a deliberately minimal form. This entry keeps
its reasoning — some of its facts remain true and worth having (marked in the next entry)
— but nothing below describes what the app does now.

No commit sha yet (worktree `counter-text-fit`, merging to main). A small follow-up Jess
asked for directly: typing "lifelink" into the counter disc produced *invisible* text — the
fixed `h * 0.32` font overflowed the 44px circle and `overflow: hidden` clipped it all. The
fix, `apps/tabletop/src/client/shapes/counterTextFit.ts`: font starts at the 0.32 × height
base and shrinks until the text fits, wrapping onto more lines where that helps. The recipe
detail "font-size 0.32 × height" is now "**up to** 0.32 × height, shrinking to fit"; the rest
of the recipe (deep-space fill, narrow dark-pink ring, light-pink `--font-chrome` text,
proportional border) is unchanged. The disc's `line-height` went 1 → 1.1 to give the wrapped
lines breathing room — a real if tiny appearance change, riding with the feature it exists
for.

**The reusable fact — a round clip does not change where CSS puts the text.** The browser
lays text out against the **square** content box; `border-radius` only clips the paint. So
CSS-wrapped text in any round-clipped element loses the corners of its top and bottom lines
(observed live with "first strike"). The fix that keeps the common short-label case big:
compute the line breaks yourself against each line's actual circle **chord** width and render
them as explicit line divs (`whiteSpace: pre` so the browser doesn't re-wrap). This is a
general fact about round-clipped elements — the Shuffler's own `.hand-count` never hits it
only because its content is always a short number.

**Second reusable fact — measure with the real font, not an estimate.** The fit is only as
good as its measurements, and it measures with a canvas `measureText` on the resolved
`--font-chrome` (one shared measurer, resolved once). Orbitron's glyph widths run far
narrower than a generic ~0.8em/char estimate: "lifelink" fits UNBROKEN on one line at ~8px
where the estimate says two lines. An estimate-driven fit would look correct and still break
words it didn't need to. The estimate survives only as the injectable test fallback.

**Layout preferences encoded, not emergent:** whole-words layouts beat character-split ones
unless keeping words whole costs >30% of font size — so "first strike" wraps as two whole
words a touch smaller, while the single long word "lifelink" still splits rather than going
tiny. At the 4px floor, overflow beats disappearing: pack what fits and let the disc clip
the cram — the failure mode this whole fix exists for is text that vanishes.

**Editing approximates display.** The in-place editor became a `<textarea>` (was `<input>`)
so long labels wrap while editing: side padding narrows the wrap toward the chords, estimated
top padding centers the block. Still invisible chrome, still the one sanctioned
`outline: none` (README → tldraw limits updated to say textarea). Enter commits — no
newlines in a counter label.

**Verified** by eye at 4× zoom ("3" full size, "+1/+1" one line, "lifelink" one whole line,
"first strike" two whole words, all inside the circle), 8 pure-geometry unit tests
(`test/counterTextFit.test.ts`), and a Playwright assertion that the rendered content is no
bigger than the visible box (`scrollWidth/Height ≤ clientWidth/Height` in
`verify-counter.spec.ts`).

## 2026-08-08 — the circle-aware fit was reverted: shrink to the square, tolerate the nibble

No commit sha yet (worktree `counter-fit-simplify`, merging to main). Jess reverted the
chord-wrapping approach the entry above describes, hours after it merged (`2f5bfb4`):
*"too much code and not core to this app. If that was a thing I was gonna do, I'd put it
in a library... Not something I wanna spend time testing properly. The square behind it
is close enough."* This is a **scope ruling, not an appearance reversal** — the visible
behaviour Jess asked for (long labels shrink instead of vanishing) stays; the
infrastructure built to perfect it goes. It's now a fleet-level working-with-Jess gotcha
in `notes/AGENT-NOTES.md`: don't build library-grade infrastructure inside the app;
simplest close-enough behaviour wins; and **needing real testing rigor is the signal the
mechanism belongs in a library**, not this repo.

**What's true now.** `counterTextFit.ts` is ~40 lines: `fitCounterFont(text, w, h)`
shrinks the font from the `0.32 × h` base until an **estimated** wrapped block
(0.8em/char, 0.85 wrap slack) fits the **square** content box. The browser does the
actual wrapping (`overflowWrap: anywhere` on the disc); the display div renders plain
`{text}` again — no custom line-breaking, no per-line chord widths, no explicit line
divs. The round clip nibbling the corners of long labels is **accepted** as close enough.
The editing textarea keeps the same shrinking font and a `paddingTop` from the fit's
estimated `lineCount`; the side padding it used to carry (narrowing the wrap toward the
chords) went with the chords.

**The previous entry's first fact survives the revert and is still worth keeping:** a
`border-radius` clip doesn't change where CSS lays out text — true, general, and now the
*accepted cost* rather than the problem statement. If a future request wants the corners
back, the chord-wrapping code is in git at `2f5bfb4`; the answer per Jess is a library,
not a rebuild in place.

**The previous entry's second fact ("measure with the real font") inverted, and the
inversion is the keeper.** Canvas `measureText` **lies when the webfont hasn't loaded** —
and an **empty table renders no Orbitron at all**, so the browser (which fetches webfonts
lazily) never even fetches the font; the measurer silently returns fallback-sans metrics.
Verified concretely: "lifelink" at 14px measured 44.6px vs real Orbitron's ~90px — off by
2× in the direction that under-shrinks. So the "more accurate" measurement was the *less*
accurate one exactly when a fresh table's first counter needed it. This is the same
lazy-fetch mechanism the fleet-tokens spec hit (`4396aea`'s `document.fonts.load` finding)
biting a **runtime** consumer instead of a test. **Any future canvas-measurement of
`--font-chrome` must handle font loading** (`document.fonts.load` + re-render, or accept
an estimate). The estimate that survived is conservative for wide bold Orbitron, which is
the safe direction: over-shrinking slightly beats overflowing.

**Verified**: 5 unit tests on the fit (`test/counterTextFit.test.ts` — down from 8; the
chord/word-packing assertions died with the code they tested), the Playwright lifelink
test (shrinks below base, nothing overflows the visible box, a short label renders
larger), and a 4× eyeball — "3" full size, "+1/+1" one line, "lifelink" two readable
lines, "first strike" two words, all inside the disc. The `.counter-mock` comment in
`design-candidates.css` ("long labels shrink to fit") never mentioned chords, so it's
still accurate unchanged.

## 2026-08-09 — the nav-link idiom crossed to the Tabletop, and got named on the way

`6b6b927` (merged as `847661d`) **Tabletop landing page links back to the Shuffler**

Fourteen lines: a plain `<a href="https://mtg.jessitron.honeydemo.io">` ("Manage your decks
in the Shuffler", `data-testid="shuffler-link"`) below the landing page's cream card, and
the page container going flex-row → flex-column with a `1.5rem` gap to seat it. Decided
with this owner's `-context` before implementation, and the prescription held exactly:
white `var(--font-chrome)` on the dark `#1a2a1f` page background, outside the cream card;
no radius, no new tokens, no ship-local stylesheet started, no outline rules; the buoyed
green/cream palette (`tabletop-landing-page-palette`) untouched.

**What the consult surfaced, now recorded in [README.md](README.md)'s design language:
the fleet had a text-link treatment in use but never written down.** The Shuffler's header
(`site.css` → `.right-nav a` — white chrome type on dark, no underline at rest, opacity
hover, underline on `.active`) was the only tokenized link styling anywhere; `docs.css`'s
content links are its own docs-only tokens plus raw-hex drift. This change is the idiom's
second live instance and the first on the Tabletop, which is what earned it a name.

**The always-underline variant is the accepted degradation, not a divergence.** React
inline styles can't express `:hover`, and a standalone link in body position (unlike a
header, where position says "nav") needs the underline to read as a link at all. Recorded
so the next inline-style link doesn't get "fixed" toward the header's `none`, and so a
future stylesheet-context link knows hover behaviour reopens as a small decision.

**One structural nuance worth keeping:** the link sits deliberately *outside* the cream
card, on the page background — so the page's one Layer-1 violation (the green/cream card)
stays exactly the same size, and the on-brand element doesn't ratify the off-brand one by
nesting inside it. An agent grepping `LandingPage.tsx` for precedent now finds both; the
open-choices bullet says which one to pull toward.

## 2026-08-09 — the zone label band: every card-holding zone fits a card AND its title

`0d61890` **Zone label band: every card-holding zone fits a card AND its title**

Pure Tabletop geometry — no CSS, no token, no label-rendering change, and the geometry
itself lives in `apps/tabletop/DESIGN.md`'s table per the standing division (this KB keeps
the reasoning, DESIGN.md keeps the numbers). What happened: the Library and Command Zone
were exactly one card tall, so a card covered the zone's title; Exile was 225 — shorter
than a card outright. Every card-holding zone now reserves `ZONE_LABEL_BAND` (40) of
headroom at its top: library and command zone grew to 278, exile to 278, and the graveyard
fills the column's remainder (356 — still the bigger box, preserving DESIGN.md's "exile is
smaller" ordering, though less dramatically; the owner's `-review` was asked exactly that
and said the ordering surviving is what matters). The library's card-back image, the
sleeve pile, and the graveyard card cascade all start below the band.

**The band is headroom, not chrome — deliberately.** Nothing draws it: no rule, no tint,
no visible boundary. The label's own rendering (`MtgZoneShapeUtil`, fontSize 24, top-left)
did not move; the content moved down instead. So there is no `/design` specimen to add and
no appearance decision was made — the zone's at-rest/armed treatment (ticket 14) is
untouched.

**Why taller zones and not smaller cards — worth keeping, because Jess floated the
alternative.** The card is the layout unit: `CARD_W/CARD_H = 170×238` fixes the table's
physical scale (2.5″×3.5″ at 68 units/inch) and every zone in `cardLayout.ts` *derives*
from it. Shrinking cards shrinks the zones proportionally and leaves the titles exactly as
covered — the missing element was headroom for the label, so it was added explicitly. Same
shape of argument as the resize debate (README → "the card is the layout unit"): the card
anchors the coordinate system; fix the thing that's wrong, don't move the anchor.

**Two coincidences named so they don't get read as references:**

- **40 matches `NAME_LABEL_HEIGHT` on purpose** — one label-headroom rhythm across the
  player area (the seat name label above the mat, the zone labels inside their boxes).
  That's stated in the constant's comment in `src/shared/mtgZoneShape.ts`.
- **278 equals the Shuffler's CSS card height by accident** — 238 + 40 happens to land on
  the Shuffler's 200×278 card. A comment in `cardLayout.ts` says derived, not a reference;
  the two ships' card units remain deliberately different numbers (the "don't cross them"
  rule in the canvas watch points).

**`ZONE_LABEL_BAND` is shared server/client for the same reason as `LIBRARY_PILE_INSET`**
— it sits next to it in `src/shared/mtgZoneShape.ts`, and both the server's geometry
(`cardLayout.ts`, `tableFurniture.ts`) and the client's sleeve pile (`MtgZoneShapeUtil`)
must agree on where content starts. The sleeve-pile watch point in
[interactions.md](interactions.md) carries the updated geometry.

**Card placement in the command zone and exile needed no insetting** — verified, not
assumed: `cardArrival.ts` server-places only into battlefield/graveyard/stack; cards reach
the command zone and exile by human drag alone and sit where dropped, so the band buys
headroom there without any placement code to move. The graveyard cascade was the one
server-placed pile inside a labelled box, and it moved (`graveyardCardPosition` starts at
`box.y + ZONE_LABEL_BAND + 10`).

Verified in a live browser: all four labels (Orbitron, dark pink) fully visible above the
card-back pile and a graveyard card. Unit assertions in `test/cardLayout.test.ts` pin the
new invariants: every card-holding zone ≥ `CARD_H + ZONE_LABEL_BAND`, library and command
zone equal heights (the graveyard's gap from the command zone exists only while they
match), graveyard pile below the band.
