# Decide what a zone looks like, armed and at rest

Mountain: tabletop-replaces-mural
Type: prototype
Status: claimed
Blocked by: 03

## Question

[Ticket 03](03-what-furniture-is.md) decided furniture is a custom `mtg-zone` shape that renders
itself, and deliberately **left appearance out** — the implementer reproduces today's stock tldraw
`geo` look verbatim, marked provisional. This ticket decides the real treatment.

Two states to design:

- **At rest.** The box and its label ("Library", "Graveyard", "Exile", "The Stack"; the playmat is
  unlabelled). Today: dashed grey, `fill: none`, `size: s`, `font: serif`, opacity 0.5 — which the
  `shuffler-looks-like-itself` owner confirms is **scaffolding, not a decision**. It appears in no
  design-history entry and no open choice.
- **Armed** — the parity item at `notes/DESIGN-tabletop-replaces-mural.md:87`: *"drag a card over
  the library → the library changes appearance to show it's about to take the card."* Ticket 03
  settled the *mechanism* (derived reactively in the zone's `component()`, never written to the
  store); this is purely what it looks like.

Constraints already established by the owner — treat these as given, not as things to re-decide:

- **The label wants Orbitron.** A zone name is chrome, and chrome is Orbitron. `serif` today isn't
  a choice, it's tldraw's `font` prop enum, which has no Orbitron in it. Getting Orbitron on a
  zone label is the strongest design argument for the custom shape in the first place.
- **`--dark-pink` is the token whose stated job is borders/rules/accents.** But see the open
  question below: pink may be wrong for the *playmat* specifically.
- **Radius is already decided — cite the rule, don't re-derive it.** Design choice 4 was answered
  2026-08-06 (`.scratch/shuffler-design-choices/spec.md:26-40`): **`--radius-soft: 4px` on
  pressables, `0` on flat surfaces, physical objects keep their real radii** — and *"the line falls
  at 'do you touch it', not at 'is it small'."* A zone boundary is a flat surface you don't press,
  so it's `0`. (`open-choices.md` still shows choice 4 as pending because the *commits* haven't
  landed; the decision exists.)
- Flat `solid`, never `groove`/`outset`/`inset`.
- **Dashed has a precedent in this app, and it's the right family.**
  `.commander-placeholder` — duplicated in `game.css` *and* `prepare.css` — is `2px dashed #ccc` on
  a card-sized box. So dashed already means **"empty receptacle where a card goes,"** at exactly the
  card unit. That's a far better starting point than a blank page for a zone at rest. Its literal
  values are drift (`#ccc`, `#f9f9f9`): **port the pattern, retokenize the values.**
- **The armed state has no token and no sanctioned pattern** — it is a genuinely new design
  decision. Two hard limits: **don't build it from `--light-pink`** (that's the global focus-ring
  colour, so a light-pink glow reads as "focused", not "armed"), and decorate with
  `border`/`box-shadow`, **never `outline`** (globally spoken for as the focus channel).
- **Do not port `.hand-drop-zone.drag-over`** from `apps/shuffler/public/game.css` — it violates
  **three** rules, not one: `rgba(76, 175, 80, 0.2)` is the last surviving raw Material green in
  the app and already on the "tokenize the orphan colors" deletion list; `border-radius: 20px` is
  soft corners on chrome; and `outline: 2px solid gray` is one of only two surviving decorative
  outlines. Porting it would give all three a second life in a second ship. Its **shape** is still
  instructive, though — the app's one existing armed treatment is *"restate the boundary + tint the
  interior."*
- **The interior-tint half of that shape is unavailable for the playmat and library.** Ticket 03
  keeps their pictures as separate opaque `image` shapes layered *over* the zone box, so an
  interior tint or inset shadow is hidden. For those two zones the armed treatment has to read as
  an **outward** effect — and they're exactly the two zones the parity item names.
- **`box-shadow` does not accumulate across rules** (design choice 5's discovery). If at-rest and
  armed both use it, declare them together or the armed rule erases the at-rest bevel.
- **A new token needs a home and a swatch, in the same commit.** An armed state almost certainly
  mints one. It goes in `styles.css`'s `:root` — **not a fifth `:root`**, there are already four —
  plus a swatch in `design.ejs`'s "Named tokens" grid.
- **Layer-1's focus rule can't reach a canvas shape.** tldraw owns selection indication for shapes,
  and the global `:focus-visible` rule is DOM-only. Say that out loud rather than silently dropping
  the rule, and record it in the design KB as a tldraw limit.
- **Size the zone in card widths, not raw page units**, or the relationship drifts the first time
  card size changes. Note the Tabletop's card is `170 × 238` (`DESIGN.md`'s 68 units/inch), *not*
  the Shuffler's CSS card — don't cross the two.
- **Budget `toSvg` inside the option comparison.** A self-rendering zone needs its own, and the cost
  scales with the treatment: gradients, shadows and a webfont all have to be hand-written into the
  SVG or the zone vanishes from canvas exports.
- **The Tabletop's current look is not a precedent to match.** `src/client/LandingPage.tsx`
  carries an off-brand green/cream palette in inline styles (`#1a2a1f`, `#f5f1e8`, `#3d5a45`) with
  no relationship to purple-and-pink — a live Layer-1 violation, not a house style.

Open, and part of this decision:

- **Does the playmat get a corner treatment?** Don't invent a third value: `.playmat-prepare` is
  20px and `.playmat-game` is 80px, and the `playmat-two-visual-metaphors` buoy in the repo-root
  `TODO.md` records that nothing justifies the difference.
- **Should the playmat's border be `--dark-pink` at all?** The design KB is explicit that plain
  `black` is the play pages' mat frame colour (the Shuffler's mats are `10px solid black`,
  untokenized *on purpose* — "don't substitute `--deep-space`"). A Tabletop playmat with a pink
  border makes the Shuffler's mat and the Tabletop's mat read as two different objects, which cuts
  against Layer 2's "one identity across ships." **Stage both for the playmat specifically.**
- **Is the Stack visually a zone like the others**, or its own thing? DESIGN.md calls it "a shared
  blue strip"; the design KB says nothing. If it reads as a zone, it's a new component and wants
  its own specimen.
- **Is the armed highlight shared?** No, decided in ticket 03: local to the dragging player only.
  Treat it as a given here — you're designing something only one person sees at a time.

## How to resolve this

**Stage it, don't argue it** — the owner's explicit instruction, and it has worked twice (design
choices 5 and 7 were each settled in one sentence once Jess could see both options rendered).
Build the zone box + Orbitron label + one or two armed-state candidates as a `.choice` block on
`/design` (`apps/shuffler/views/design.ejs`, candidate CSS in
`apps/shuffler/public/design-candidates.css`), then let Jess pick.

Two mechanics to honour:

- The gallery's credibility rests on rendering **the app's own stylesheets**, so it can't drift.
  A Tabletop specimen only keeps that property if the zone's CSS is a real stylesheet the gallery
  can load — **cross-app, which is unresolved**. If you mock it with candidate CSS, label it a
  mock. This is a genuine architectural question, not something to settle quietly.
- If you add a stylesheet, add it to `APP_STYLESHEETS` in
  `apps/shuffler/test/verification/verify-design-gallery.spec.ts`, or the gallery silently stops
  representing the app.

- **A pure-CSS mock will hide the layering problem.** The specimen will show one coherent box while
  the real playmat and library have an opaque picture sitting on top of that box. So either include
  a stand-in image layer in the specimen, or scope the specimen to the **unpictured** zones
  (graveyard, exile, Stack, command) and say so out loud.

**The gallery has zero Tabletop specimens today** — this would be the first.

## Deciding is unblocked; implementing is not

Two dependencies exist, and neither blocks the decision. **Staging happens on `/design`, in the
Shuffler, which already has the tokens and the fonts** — nothing about the plumbing below changes
which treatment Jess prefers by eye. So: **decide and stage as soon as ticket 03 ships**, and let
the Tabletop implementation carry these two.

1. **Where Tabletop CSS tokens live.** `apps/tabletop` has **no CSS source file at all** (only a
   built `dist/client/assets/*.css`), while the Layer-1 craft rule says "use `var(--…)`, not a
   literal" applies to the Tabletop today — so there is nowhere to declare them.
2. **How the Tabletop loads Orbitron.** `apps/tabletop/index.html` has no `<link>` and no
   `@font-face`; the only CSS import anywhere in the client is `import "tldraw/tldraw.css"`. **A
   missing font link fails silently** — it falls back to a system serif, which is precisely the
   scaffolding look this ticket exists to leave, with no error to notice. Sibling of the tokens gap;
   same `tabletop-css-tokens` line in the repo-root `TODO.md`.

⚠️ **One warning about how the tokens decision gets made, from the owner:** do **not** resolve it by
copying `styles.css`'s `:root` into a Tabletop stylesheet. Everything downstream assumes those token
names exist and mean what they mean, and a renamed or diverged copy fails silently — CSS just drops
the declaration. A second source of truth for the palette is the failure mode that owner exists to
prevent, and it's already fighting four separate `:root` blocks.
