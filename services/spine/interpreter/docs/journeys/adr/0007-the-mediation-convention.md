# ADR-0007 — A macro adds names; it never replaces one

**Status:** accepted

## Context

Two surprises, one answer.

The first is a macro that quietly redefines the method the author just wrote. A
reader who sees `enact def confirm_items(items:)` reasonably expects `confirm_items`
to be that method; if the declaration replaced it with a wrapper, the def line lies,
and it lies invisibly — nothing about `def` suggests that something else will claim
the name.

The second is a seam whose bypass looks like ordinary code. Before this was settled,
`enact(:confirm_items, items:)` and a bare `confirm_items(items)` read as equally
innocent inside a stage body, and the audit round found unmediated effects only
because a human read every line.

## Decision

**A macro adds names; it never replaces one. The bang appears exactly where an
authored def would otherwise collide with the name the macro adds.**

Every spelling in the DSL falls out of that sentence, with no cases to enumerate:

```ruby
enact def confirm_items!(items:)   # adds `confirm_items` → collides → bang
enact(:confirm_items) {|items:| }  # authors no name → no collision → no bang
need :email_store                  # authors no name → no bang
need def clock! = Time             # adds `clock` → bang
need(:x) { default }               # inline: adds nothing → no bang
excursion def interpret_item!(item)  # adds `interpret_item` → collides → bang
excursion :interpret_item, Klass     # authors no def → no collision → no bang
receive def confirmed!(mail)       # adds `confirmed` → bang
```

Block and bare forms are bangless **by construction** rather than by exception, and
the newcomer's "why the bang?" has a mechanical answer — *because the bangless name
is taken* — instead of a convention to memorize.

**The invariant is enforced, not merely observed.** Every generated name is guarded
and a collision raises at declaration time, naming which name is contested: the
`at_<name>?`/`past_<name>?` stage predicates, an enactment's mediated entry point, a
declared receive's wrapper, an excursion's driver, and a macro need's lazy accessor.
A silent skip would be
as bad as a silent clobber — it would hide the bug of a hand-written method and a
declaration disagreeing about what runs.

**The bang's meaning is a consequence of the invariant, and a useful one.** Where the
pair exists:

- **`foo`** — the **mediated** form. Runs through its seam: the enactor or
  provisioner, the ledger, listener notification, elision.
- **`foo!`** — the **raw** form the author wrote. Does the thing with no journey
  machinery: unrecorded, uninterceptable, invisible to a test enactor or provisioner.
  **Off-manifest.**

Write the implementation as the bang; call the bangless one. One hop only: a bang
method calling another bang method is itself off-manifest. What this buys is
**mechanical detectability** — any call to a `!` method from outside its own wrapper
is a grep, a cop, and a diagnostic that can say *off-manifest call to
`confirm_items!` in stage `:apply_results`*, converting a category of finding from an
audit into a lint.

**Where the two forms are different operations, there is no pair and no bang.** Verbs
that *are* their seam take no bang at all (`post`, `wait`, `journey_accept`): a bang
pair marks a bypass of a seam on the same operation, and those operations without
their seam are nothing. `excursion` reads as the ordinary clause rather than an
exception to it, because the macro declares a **driver**, not a maker — `interpret_item!`
is the body run inline, `interpret_item` the same work driven as a child through the
excursion chokepoint ([ADR-0012](0012-excursions.md)).

Details per construct: `need`'s private-default rung is fixed at `name!` (which
deleted a visibility-sniffing probe); needs keep bodyless declarations (`need :x`
with no default is a stated hard dependency — `UnmetNeed` is the intended outcome)
while enactments reject them (a bodyless effect is inert nonsense); an enactment's
declared name **is** its mediated method and its ledger key, one name per effect.

**The limit, stated deliberately.** The guards fire when the macro runs second. A
hand-written `def` placed *below* a declaration still wins, because that is what Ruby
method redefinition does and because a `def` line visibly looks like a definition —
the reader can see the conflict in source order. The invariant protects against the
declaration that does not look like one, which is the surprise worth engineering
against.

**`docket`** carries the paperwork a def-capture line can't:

```ruby
docket unique_by: ->(item:) { item.id }, as: { item: BriefingItem }
enact def record_item_sources!(item:) = item.sources.each { … }
```

One-shot (consumed by the next declaration, never sticky — this must not become a
mode); double-docket raises immediately; a leftover raises at first drive; inline
options win; an option no declaration knows raises; a *queued* docket in front of
`stage`/`diversion`/`excursion` — macros that carry no declaration options, an
excursion's keywords being arguments fixed for the child rather than options about
the declaration — raises and names the
fix (mediating macro innermost: `stage enact def`, never `enact stage def`), while
the scoped block form (`docket guaranteed: true do … end`) passes through.
`stage`/`diversion` strip a trailing bang, so the itinerary reads the same in either
declaration order and resolution — not spelling — decides what runs.

**`options` is an alias for `docket`**, for readers who meet the stranger word first
and would rather not. Whichever spelling is written is the one every error about that
paperwork uses — being told "leftover docket" after writing `options` would make the
alias a trap rather than the kindness it is. `docket` stays canonical in the prose.

**A macro takes a block iff it captures a body.** `stage`, `diversion`, `need`,
`enact`, `excursion`, `receive`, `fail_on`, and `snapshot_upcast` all capture one, so
all take one. `snapshot` (a member list), `snapshot_version` (a number), and the
`seal_*` switches capture no body and take no block — blockless by construction, not
by omission.

**Declaration order** is fixed by the stepdown rule — level of abstraction, one order
in every journey:

1. **Class-wide facts** — AR setup, `snapshot`, `snapshot_version`, `fail_on`
2. **Stages** — the itinerary is the table of contents, so it reads as one
3. **Needs** — the inputs those stages read
4. **Enacts** — the effects they hand over
5. **Excursions** — last, because the far side of that seam is a whole other journey

## Consequences

- **A def line always defines exactly the method it appears to define.** Nothing a
  macro does can take that away, so reading a journey class never requires knowing
  which declarations rewrite what.
- "Which of these two calls is the audited one?" has a one-word answer.
- A reader who knows where to look in one journey knows where to look in all of them,
  and adding a need or effect is a local diff, not a scatter.
- The honest cost: `docket` is the DSL's first order-dependent class-body state.
  Adjacency (the Sorbet-`sig` precedent), the single slot, and the immediate errors
  bound it.
