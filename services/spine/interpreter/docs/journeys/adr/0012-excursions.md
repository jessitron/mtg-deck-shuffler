# ADR-0012 — Excursions: a sub-journey is driven through the parent's own seams

**Status:** accepted

## Context

Journeys nest: an extraction run drives an email retrieval, a prompt composition, an
interpretation. A bare `Klass.new(...).traverse!` inside a stage body drives the
child outside everything the parent was kitted out with — no conveyance threading, no
provisioner/enactor inheritance, no listener notification, no test addressability —
and every call site would re-solve those problems ad hoc.

## Decision

**`excurse` is how a journey drives another journey.** Every form routes through one
chokepoint that threads the parent's outfit into the child, notifies
`excursion_started`/`excursion_ended`, registers the child on the parent's live
`Children` register, and drives strictly — a child snag surfaces as this stage's
snag, a child failure as its own failure
([ADR-0014](0014-a-childs-trouble-is-the-owners-to-interpret.md)).

```ruby
excurse(ItemInterpretation, completion:)         # class form — construction deferred
excurse(EmailRetrieval.new(...))                 # bare form — already built
excurse(:selection) { candidate_selection_maker.call(items: @candidates) }  # named + deferred
```

- **Synthesized names.** Bare/class forms consult the provisioner first under the
  demodulized, underscored class name (`:item_interpretation`), so any excursion is
  provide-addressable in specs without explicit naming. Unprovided, a synthesized
  excursion **falls through and drives the child** — never raises — because the
  excursion itself is not a world reach; the child's own needs guard any actual one.
  A *named* excursion is an ordinary need (sugar for `need(:name) { excurse(...) }`)
  and raises when unprovided under test provisioning.
- **`excursion` declares a named way to drive a child, and defines the method that
  does it.** Noun declares, verb drives — pointed, this time, at the right product.
  Three forms, one call site:

  ```ruby
  excursion :interpret_items, ItemInterpretation, purpose: :dedup   # a class, plus fixed args
  excursion def interpret_item!(item) = …                           # a body, promoted
  excursion(:interpret_item) {|item| … }                            # the same, block form
  ```

  There is no symbol form standing for a declaration, because a declaration *is*
  the verb: `interpret_items(item)` is the call, and nothing has to be looked up by
  name to make it. The child's inputs travel in the open at the call site rather
  than sitting in a declaration at the bottom of the file
  ([ADR-0026](0026-every-input-and-output-is-named.md)), and the ivar travels with
  them: `@retrieval = retrieve_emails(email_references:, email_store:)`. The
  framework still registers the child under the declared name, so rejoin-on-re-entry
  survives.
- **The ladder, and why the call site has to survive it.** A one-stage journey is
  only a legitimate starting point ([ADR-0001](0001-a-process-is-a-journey.md)) if
  growing into one is cheap. Four rungs, strictly more structure each time, and
  `interpret_item(item)` reads identically through all of them:

  ```ruby
  def interpret_item(item) = …                        # 1. a method
  excursion def interpret_item!(item) = …             # 2. one stage, generated journey
  excursion :interpret_item, journey { … }            # 3. several stages, still inline
  excursion :interpret_item, ItemInterpretation       # 4. its own file
  ```

  Rung 1 returns what the method returned; rungs 2–4 return the child. That is one
  visible adjustment at rung 2 and none after — a stated limit rather than something
  to engineer around, since two drivers with different return types would buy
  obliviousness at the price of a permanent inconsistency.
- **`journey { … }` is a constructor, not a name**, so ADR-0001's "the word Journey
  never appears in a class name" holds. It needs no new declaration form because it
  slots where a class already goes. It earns its keep on the *inline* path:
  `excurse(journey { … })` hands `excurse` an anonymous class, whose synthesized name
  is useless and which therefore cannot be substituted in a spec at all;
  `excurse(journey(:item_interpretation) { … })` restores that seam.
- **A generated or anonymous child is named.** `excursion` `const_set`s it on the
  declaring class under the camelized declaration name (`ExtractionRun::InterpretItem`),
  because telemetry, backtraces, and snapshot round-tripping all need a stored type
  that resolves on the way back.
- **A promoted body's parameters are the generated journey's constructor keywords**,
  stored as ivars and declared as snapshot members — otherwise rung 2 silently loses
  resumability rung 4 has, which is a trap rather than a trade. Stages are
  zero-arity, so an argument could not have been a stage parameter. The sole stage
  takes the declaration name, so the child's own log, predicates, and telemetry read
  as the thing it does.
- **The body itself does not move.** A `def` belongs to the class it was written in
  and Ruby rehomes no method, so a promoted body runs on the journey that declared it
  — and the block form authors its raw sibling there for the same reason, which also
  keeps `interpret_item!` directly callable, which is what a unit spec wants. What
  rung 2 buys is the seam, not isolation: parent ivars and helpers are still in reach
  until rung 3, where the body is genuinely another class's and the promotion is
  exactly when a reader wants to notice.
- **The bang pair is the ordinary one** ([ADR-0007](0007-the-mediation-convention.md)),
  now that the macro declares a driver rather than a maker: `interpret_item!` is the
  body run inline here, `interpret_item` the same work driven as a child through the
  chokepoint — outfit threaded, listeners notified, registered on `Children`,
  condition strategy applied. Same operation, one with the seam.
- **Arity decides the slot.** A call that passes no arguments names one child: it
  fills `@name`, is addressed under the declaration name, **rejoins** rather than
  re-running, and short-circuits on `provide name:`. A call that passes arguments
  gets a fresh child each time, with `provide` applying per call — `flyer_check(a)`
  and `flyer_check(b)` are two children and one `provide` cannot stand for both. Same
  rule for a child left parked: an excursion resumes the child it left on wait
  instead of building a new one. N runs of one class use a detachment
  ([ADR-0017](0017-detachments.md)) — repeats deliberately have no stable name, and
  the framework refuses to mint ordinals for them.
- **`stage excursion def` needs no special rule**, because arity settles it: a
  zero-arity composition still leaves the child in `@name`, so one composition covers
  both the drive-for-completion case and the want-the-product case.
- **Fixed keywords are defaults and the call site wins**, the same shape `docket`'s
  "inline options win" already has.
- **Declare when the child is a fact about the class; excurse inline when it is a
  decision made at drive time.** A declaration is a class-level statement, so the
  second argument is always a literal class — declaring a name whose referent is not
  known until drive time is a category error. `DeduplicationRun`'s `selection` is the
  definitional inline case: the class comes from `candidate_selection_maker`, a need,
  so a host can swap the strategy. The named deferred form covers it exactly, and
  untangles two seams — `provide selection:` swaps the result,
  `provide candidate_selection_maker:` swaps the strategy.
- **Create-and-drive a durable child on opposite sides of a boundary** whenever the
  crash window matters: one stage creates and assigns (the child's id crossing as a
  snapshot member), the next excurses. Otherwise a crash between create and drive
  orphans a paid-for child, and the retry buys a second one.

## Consequences

- Specs satisfy a whole child with one `provide` — the child never runs — or let it
  run for real off its own needs, per example.
- Same-class inline excursions in one journey share a synthesized name; where two
  need different answers, `provide_once`/`when:` disambiguate.
- Three block meanings coexist, each unambiguous in place: `excursion(:name) { … }`
  at class level captures a **stage body**; `journey { … }` is an expression
  producing a **class**; `excurse(:name) { … }` inside a stage is a runtime call that
  **returns** a journey. Nobody chooses between them at a call site.
- The chokepoint is the interposition point everything else attaches to: guides
  ([ADR-0015](0015-guides.md)), condition strategies, courier deputization
  ([ADR-0019](0019-mail.md)), and the fiber outfit's linearization
  ([ADR-0021](0021-the-fiber-outfit.md)).
