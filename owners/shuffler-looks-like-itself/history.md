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
