# Split the card-modal buttons by kind

Mountain: safe-harbor
Status: ready-for-agent

Resolves **choice 3**. Third, because it restructures `playmat.css` and shifts every line
number below it.

## The decision

Two families, not seven hues. The color carries meaning: *this moves the card* vs *this is a
tool*.

**This was neither staged option** — `/design` offered "keep the seven colors" and "one
primary, rest secondary". Jess chose a third. Record it that way when marking the choice
DECIDED, so a future reader doesn't hunt for it on the old page.

## Steps

Collapse seven rules into two classes in `playmat.css`:

- **`.modal-action-button.destination`** — `--dark-pink` fill. Replaces `.play-button`
  (`:596`), `.put-in-hand-button` (`:610`), `.put-on-top-button` (`:624`),
  `.put-on-bottom-button` (`:638`).
- **`.modal-action-button.utility`** — `--deep-space` fill, `--light-pink` text, shadow
  `#0d0716`. Replaces `.recover-button, .copy-button` (`:475`), `.gatherer-button` (`:492`),
  `.flip-button` (`:506`).

Reuse `#0d0716` exactly — it's the darkened-`--deep-space` shade choice 2 already
established for `.pushable-flat.pushable-dark` in `styles.css`, not a fresh computation. Same
for the destination shadow: take `.pushable-flat`'s existing dark-pink shadow rather than
computing a new one.

`.secondary` (`:652`) is already `--deep-space` from choice 2 — **reconcile it with
`.utility`** rather than leaving a third near-identical class behind.

Update the call sites: `views/partials/card-modal.ejs` and
`src/view/play-game/game-modals.ts`.

Remove the seven Material swatches from `design.ejs` (the `#ff9800` one is at `:162`).

## The one judgment call

**Is Recover a utility or a destination?** It currently shares a rule with Copy, which is why
it landed in the utility list above — but "recover" arguably moves a card rather than being a
tool. Read the actual markup and behaviour before assigning it. If it's genuinely a zone
move, it's a destination.

## Known side effect — don't fix it here

This converts the playmat's flip button to deep-space while `prepare.css:252`'s copy stays
Material orange. Those two already diverged (choice 1 gave the playmat copy the
`.pushable-flat` bevel; the prepare copy is still the pre-choice-1 flat control), and this
widens the gap temporarily.

Leave it. It belongs to the de-duplication work item in `open-choices.md`, which also carries
Jess's stated want for that button — *"a circle of two arrows, centered under the card"*.
Note the widening in the commit message so it isn't discovered as a surprise.

## Verify

`/game` → open a card modal. Destinations pink, utilities dark, one consistent press
behaviour across both. Check the modal on `/prepare` too — it loads `playmat.css`.

## Then

Run the "When a choice is resolved" checklist in
`owners/shuffler-looks-like-itself/open-choices.md`. **The citation re-verification matters
most after this issue** — collapsing seven rules into two moves everything below them in
`playmat.css`, and choices' `file:line` references have already rotted twice for exactly this
reason.
