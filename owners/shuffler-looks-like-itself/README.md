---
name: shuffler-looks-like-itself
kind: capability
scope: shuffler
---

# The Shuffler looks like itself

**The charge:** when someone adds UI to the Shuffler, the result looks like it was
always there. New buttons, panels, fields and states adopt the app's existing design
language instead of importing a foreign one.

This is a **capability**, not a feature. No single screen breaks when it lapses — the
app just gets a little less like itself, one button at a time, until it reads as a pile
of widgets from four different design systems. That's the failure mode this owner exists
to prevent, and it's a slow one: every individual violation looks reasonable in
isolation.

## Why this owner exists

The Shuffler has a real, specific, coherent aesthetic — and it is almost entirely
**unwritten**. It lives in Jess's head and in the CSS, and nowhere else.

That's a problem for agents specifically. An agent adding a button does what looks
reasonable: it greps the CSS for a precedent. What it finds is **57 distinct hex
values** across 2,772 lines, of which only a handful are named tokens. The rest is
Material Design and Bootstrap defaults that arrived one feature at a time — so the
statistically obvious "precedent" is exactly the thing that's wrong. Each new agent
samples the drift and adds to it. That's how the app got seven rainbow Material buttons
in the card modal.

So the job isn't to invent a design system. It's to **name the coherent thing that's
already there**, and stop the drift from replicating.

## The design language

The things that are genuinely consistent today, and that new UI must match:

**Three typefaces, with distinct jobs.** Orbitron (geometric sans) for chrome — nav,
buttons, headings, form labels and fields, the game title slab. Ovo (serif) for content
— prose and **card names specifically**; a card name is content, not chrome. Risque
(display cursive) only for the big splashy words on the site pages, never on the play
pages. There is no fourth typeface.

**Purple and pink, from tokens.** `--deep-space` (#221534) for bars and dark surfaces,
`--dark-pink` (#bb5277) for borders/rules/accents, `--light-pink` (#ddc7dd) for bevels
and slabs. Plus `--playmat-one`/`--playmat-two` on the game page and the closed
`--mana-W/U/B/R/G` set.

**Chunky physical controls.** `outset` / `inset` / `groove` borders, pressed states that
switch `outset → inset`. This is the app's most distinctive texture — it reads as
1990s tabletop hardware, and it's deliberate.

**Lift on hover, press on click.** `translateY(-1px…-2px)` plus a shadow on hover;
`translateY(+1px…+2px)` plus an inset shadow on active. The *idea* is consistent; the
numbers and easings are not (see "open choices").

**Square corners on chrome.** Round corners belong only to physical objects: cards, the
playmat, the `.page-container` (which is itself a giant Magic card), count discs.

**The card is the layout unit.** 200 × 278, radius 10px. Column widths, button grids and
drop zones are sized off that 200.

**Two style worlds.** Site pages (`/`, `/choose-any-deck`, `/docs`, `/about`) use the
purple gradient, AEOE card art backgrounds, and `--deep-space` bars. Play pages
(`/prepare`, `/game`) use the `.page-container` — a Magic card blown up to page size,
5px black border, hard `5px 5px` offset shadow. Don't mix them.

## Design philosophy

**Descriptive before prescriptive.** This owner starts from what the app *is*, not from
what a design authority says a card game should look like. There's a specific reason:
an earlier attempt went the other way and had to be abandoned — see [history](history.md).
A design doc written from imagination contradicts the shipped app and gets ignored.

**Pull toward the standard.** Jess's explicit call (2026-08-01): when new UI sits next to
drifted code, it uses the tokenized palette and square corners anyway. The app converges
gradually and looks briefly mixed, rather than the drift replicating forever. So
"the button next to it is Material orange" is *not* a reason to make yours Material
orange.

**The gallery is the source of truth for appearance.** [`/design`](../../apps/shuffler/views/design.ejs)
renders every component using the app's own stylesheets, so it cannot drift from the app.
Look at it before designing; add to it when you add a component.

**Some things are Jess's to decide.** Where more than one treatment is in use, this owner
does not pick — it surfaces both on `/design` and waits. Inventing a resolution is worse
than leaving the choice visible.

## Open choices — staged on `/design`, not yet decided

These are live. Until Jess picks, don't hard-code an answer; follow the existing
treatment nearest the component and flag the choice.

| Choice | Options on the page |
| --- | --- |
| Canonical button press behaviour | A: today's lift-and-shadow, unified · B: Comeau `.pushable` (faithful, needs 3 nested spans) · C: `.pushable-flat` (same feel, drop-in, no markup change) |
| Secondary-button gray | Bootstrap #6c757d · Material #607d8b · `--deep-space` (recommended) |
| Card-modal action buttons | Keep seven color-coded hues · collapse to primary/secondary |
| Corner radius on chrome | truly 0 · a single 4px |
| Focus ring | dark-pink flush · light-pink offset · light ring on dark halo |
| Text input | precon-search · join-table · tokenized proposal (recommended) |

Candidate CSS for the unadopted options lives in
`apps/shuffler/public/design-candidates.css`, loaded by nothing but the gallery.

## Quick reference

| | |
| --- | --- |
| Gallery route | `/design` → `apps/shuffler/views/design.ejs` (`src/app.ts`, near `/about`) |
| Tokens | `apps/shuffler/public/styles.css` `:root` |
| Site pages | `apps/shuffler/public/site.css` |
| Shared playmat chrome | `apps/shuffler/public/playmat.css` (game **and** prepare) |
| Page-specific | `game.css`, `prepare.css`, `deck-selection.css`, `docs.css` |
| Candidates (not adopted) | `apps/shuffler/public/design-candidates.css` |
| Gallery chrome only | `apps/shuffler/public/design-gallery.css` |
| Gallery test | `apps/shuffler/test/verification/verify-design-gallery.spec.ts` |
| Stated UI rule | `apps/shuffler/CLAUDE.md` → "UI Style" |

## The other files

- [interactions.md](interactions.md) — what this leans on, who breaks it, and the concrete
  watch points. **The review skill's fuel.**
- [architecture.md](architecture.md) — how the stylesheets are organised, which file owns
  which component, load order, and the known duplication traps.
- [history.md](history.md) — how the language got here, and the abandoned attempt at
  prescriptive design docs.
