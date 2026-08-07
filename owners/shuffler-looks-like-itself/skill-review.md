---
name: shuffler-looks-like-itself-review
description: >
  Review a plan or proposed change for interactions with the fleet's visual design
  language. Use before implementing anything that adds or changes UI on ANY ship —
  Shuffler or Tabletop — new buttons, panels, modals, inputs, banners, badges, states,
  or layout; edits to any Shuffler stylesheet (styles.css, site.css, playmat.css,
  game.css, prepare.css, deck-selection.css, docs.css) or any Tabletop CSS or
  tldraw-adjacent UI; new CSS custom properties; changes to the /design gallery; new
  stylesheets or fonts; or edits to views/partials/head.ejs or
  src/view/common/html-layout.ts.
context: fork
background: false
---

# Review: the Shuffler looks like itself

An agent has a plan. Your job is to catch the ways it would make the fleet's UI look
less like itself — before it's written, when it's cheap.

**Load first:** `owners/shuffler-looks-like-itself/interactions.md` and `README.md`
(especially its "Two layers" section — Layer 1 craft is fleet-wide; Layer 2 identity is
shared across ships but described from the Shuffler). Pull in `architecture.md` if the
plan touches file organisation or the `<head>`s.

## Layer 1 — craft (EVERY ship, including the Tabletop, no exceptions)

These are ship-agnostic. A plan on the Tabletop doesn't escape them just because the
Tabletop has no settled identity yet.

- [ ] **Breathing room:** does text have space beneath it? Cramped line-height,
      zero-margin headings, and labels touching their borders are all rejections.
- [ ] **Alignment:** do things that should line up actually line up (labels with
      fields, buttons in a row, edges of stacked panels)? "Roughly" is a no.
- [ ] **Tokens:** every color and (where tokens exist) spacing value comes from a
      `var(--…)`, not a literal. On the Tabletop, use the Shuffler's tokens from
      `styles.css :root` as the palette of record — copy the *token*, not a hex.
- [ ] **Focus:** every new interactive element has a visible `:focus-visible` state.
- [ ] **Show me, don't tell me:** if the change is visual, the review wants a rendered
      screenshot (Playwright) — CSS text can't prove that text breathes or aligns.
- [ ] **tldraw limits:** if tldraw genuinely prevents a rule (canvas-internal fonts,
      its own chrome), say so explicitly and note it for the KB — don't silently drop
      the rule, and don't fight the library.

## Layer 2 — identity checklist

Work through these against the actual plan. Skip what genuinely doesn't apply; say what
you skipped. These are written from the Shuffler's files; on the Tabletop, apply the
*rule* (tokens, typefaces, square chrome) even where the named file doesn't.

**Color**

- [ ] Does the plan name any hex value? If so, is there a token in `styles.css` `:root`
      that fits? (`--deep-space`, `--dark-pink`, `--light-pink`, `--background-color`,
      `--playmat-one`, `--playmat-two`, `--mana-W/U/B/R/G`.)
- [ ] Is it a Material or Bootstrap default (`#4caf50`, `#2196f3`, `#ff9800`, `#e91e63`,
      `#9c27b0`, `#3f51b5`, `#673ab7`, `#607d8b`, `#f44336`, `#007bff`, `#28a745`,
      `#6c757d`, `#007acc`)? **That's the drift, not precedent.** Reject it even if the
      neighbouring code uses one.
- [ ] Is the plan copying a color from an adjacent element? Check whether that element is
      itself drifted before allowing it.
- [ ] Does it add a token? Then it must go in `styles.css` `:root` (not a new `:root`),
      and get a swatch in the "Named tokens" grid in `design.ejs`.

**Geometry**

- [ ] Any `border-radius` on chrome? Chrome is square. Round is for cards, the playmat
      (`.playmat-prepare` / `.playmat-game` — one domain object, two dressings; **there is
      no `.page-container` any more**), and count discs.
- [ ] Any `groove` / `outset` / `inset` border? Reject — borders are flat `solid`. Since
      choice 7 (2026-08-07) exactly **one** survives app-wide,
      `playmat.css` → `.cool-command-zone-surround`. Equally, a plan that *removes* that
      one as cleanup is a blocker: it ends a design language, and that's Jess's call.
- [ ] Does it size things off the 200px card unit where it sits next to cards?

**Typography**

- [ ] Button labels, headings, nav, form labels/fields → Orbitron. Prose and **card
      names** → Ovo. Risque only on site pages.
- [ ] Any fourth typeface? Reject.
- [ ] Does a new page need a font it doesn't request? EJS views must list it in
      `additionalFonts`; the TS head hard-codes Ovo + Orbitron.

**Interaction & accessibility**

- [ ] Does every new interactive element have a visible `:focus-visible` state? **This is
      already written** (choice 5, shipped 2026-08-06): one global `:focus-visible` rule in
      `styles.css` covers `a, button, input, select, textarea, summary, [tabindex]`. So
      **reject any per-component focus rule**, reject any `outline: none`, and check that a
      new focusable element is one of those tags (or carries a `tabindex`) so the global
      rule reaches it. Decorative `outline` on a focusable element is also a reject — it
      gets clobbered on focus; use `border` or `box-shadow`.
- [ ] Is hover the *only* affordance for anything? It shouldn't be.
- [ ] Does the hover/press behaviour match the nearest existing family, or invent a new
      one?

**File placement**

- [ ] Is the rule going in the file that owns the component? Both game and prepare →
      `playmat.css`. One play page → that page's file. Site → `site.css`.
- [ ] Is it editing one of the **duplicated blocks** — modal styles (`playmat.css` +
      `prepare.css`), flip styles (`game.css` + `prepare.css`), library-list styles
      (`playmat.css` + `prepare.css`)? Both copies must change, or the duplicate must go.
- [ ] New stylesheet? It must be added to the right `<head>` (`head.ejs`
      `additionalStyles` for EJS, `additionalStylesheets` for TS pages — separate lists),
      **and** to `design.ejs`, **and** to `APP_STYLESHEETS` in
      `test/verification/verify-design-gallery.spec.ts`.

**HTMX**

- [ ] If the change adds classes to an HTMX fragment, does the *host page* already load a
      stylesheet defining them? Fragments can't bring their own CSS.

**The gallery**

- [ ] Does the plan add a component? Then it adds a specimen to `/design` in the same
      commit.
- [ ] Does it introduce a *second* way to do something that already exists? Then it
      belongs on `/design` as a `.choice` block with both options — surfaced for Jess, not
      silently resolved.
- [ ] Does it change something the gallery test asserts (card 200×278, `.begin-button`
      border-style `solid`, playmat buttons black, the focus ring's 3px/`rgb(221, 199, 221)`
      /3px offset)? Update the spec in the same commit.

**Open choices**

- [ ] Does the plan land on one of the still-undecided questions (card-modal action
      buttons, chrome radius, input style — choices 3, 4 and 6; the rest are DECIDED, see
      `open-choices.md`)? Don't let it pick unilaterally. Follow the nearest existing
      treatment and flag the choice.
- [ ] **Is an appearance change riding along with an approved change of something else?**
      Placement, structure, markup and behaviour changes love to carry an unapproved
      restyle with them. That's a blocker regardless of whether the restyle is an
      improvement — say "ship the approved part unchanged, stage both treatments on
      `/design`, ask Jess." See choice 7 in `open-choices.md` for the worked example.

**Neighbours**

- [ ] Touching `game.css`, transitions, or card containers? The **animations** owner
      shares that ground — recommend consulting `animations-review` too.
- [ ] Flip buttons or `.flip-container-*`? **two-faced-cards** owner.
- [ ] Modal or library list styling? **library-search** owner.

## How to respond

**No interactions found:** say so, and list what you checked, so the asker knows the
review was real.

**Interactions found:** for each one, give
1. what the plan does,
2. the concrete risk (name the file and rule it collides with),
3. an actionable alternative — the token to use, the file to put it in, the class to
   reuse.

Distinguish **blockers** (raw Material hex, round corners on chrome, a fourth typeface, a
new 3D border, unilaterally resolving an open choice, an unapproved restyle riding along
with an approved change) from **notes** (nice-to-haves, follow-ups worth a buoy).

**Block freely — you are not defending the status quo.** The point of a block is that the
change lands *decided* rather than smuggled, so the right ending is almost always "stage
both treatments on `/design` and ask Jess," not "keep what's there." It is a **success** if
Jess then picks the thing you blocked; that happened with choice 7 on 2026-08-07 and the
process worked exactly as intended. Don't soften a review to avoid being overruled, and
don't argue an aesthetic in prose when you could build the candidate and let her look at it.

End with:

> After you implement this, run `/shuffler-looks-like-itself-update` with a summary of
> what changed.
