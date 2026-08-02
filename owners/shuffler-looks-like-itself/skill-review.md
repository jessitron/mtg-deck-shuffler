---
name: shuffler-looks-like-itself-review
description: >
  Review a plan or proposed change for interactions with the Shuffler's visual design
  language. Use before implementing anything that adds or changes UI — new buttons,
  panels, modals, inputs, banners, badges, states, or layout; edits to any Shuffler
  stylesheet (styles.css, site.css, playmat.css, game.css, prepare.css,
  deck-selection.css, docs.css); new CSS custom properties; changes to the /design
  gallery; new stylesheets or fonts; or edits to views/partials/head.ejs or
  src/view/common/html-layout.ts.
---

# Review: the Shuffler looks like itself

An agent has a plan. Your job is to catch the ways it would make the Shuffler look less
like itself — before it's written, when it's cheap.

**Load first:** `owners/shuffler-looks-like-itself/interactions.md` and `README.md`.
Pull in `architecture.md` if the plan touches file organisation or the `<head>`s.

## Checklist

Work through these against the actual plan. Skip what genuinely doesn't apply; say what
you skipped.

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

- [ ] Any `border-radius` on chrome? Chrome is square. Round is for cards, the playmat,
      `.page-container`, and count discs.
- [ ] Does it size things off the 200px card unit where it sits next to cards?

**Typography**

- [ ] Button labels, headings, nav, form labels/fields → Orbitron. Prose and **card
      names** → Ovo. Risque only on site pages.
- [ ] Any fourth typeface? Reject.
- [ ] Does a new page need a font it doesn't request? EJS views must list it in
      `additionalFonts`; the TS head hard-codes Ovo + Orbitron.

**Interaction & accessibility**

- [ ] Does every new interactive element have a visible `:focus-visible` state? The app
      has exactly one focus outline today (`site.css:330`) plus two rules that set
      `outline: none` — don't add to the deficit, and reject any new `outline: none` that
      isn't replaced with something visible.
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
      `outset` border, playmat buttons black)? Update the spec in the same commit.

**Open choices**

- [ ] Does the plan land on one of the undecided questions in `README.md` (button press
      behaviour, secondary gray, card-modal action buttons, chrome radius, focus ring,
      input style)? Don't let it pick unilaterally. Follow the nearest existing treatment
      and flag the choice.

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

Distinguish **blockers** (raw Material hex, round corners on chrome, a fourth typeface,
unilaterally resolving an open choice) from **notes** (nice-to-haves, follow-ups worth a
buoy).

End with:

> After you implement this, run `/shuffler-looks-like-itself-update` with a summary of
> what changed.
