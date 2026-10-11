# ADR-0017 — Detachments: `detach` returns a handle, `rejoin` takes the outcome

**Status:** accepted

## Context

Two shapes existed and neither covered a common case: `launch` is fire-and-forget
with no return; `excurse` blocks on one child. Nothing could say *put these five
fetches in flight and let me have all five results*. A single fan-out-and-block verb
was rejected — that would be `excurse` with a loop inside it, and it would buy an
interleaving outfit nothing.

## Decision

**Splitting the party is its own verb pair, and the interval between the verbs is
the product.**

```ruby
stage def start_fetches = @fetches = urls.map {|url| detach(FetchPage, url:) }
stage def collect       = @pages = rejoin(@fetches).map(&:page)
```

- `detach` hands back a child built and kitted exactly as an excursion would but
  **not driven**; `rejoin` takes the outcome of the set. Everything between them is
  where an interleaving outfit works.
- **Concurrency is the outfit's business, not the call site's.** A loop conveyance
  resolves a detachment linearly and is still correct; a fiber outfit interleaves;
  a thread outfit parallelizes. The call site declares only independence.
- **A stage boundary may fall in the interval** — detach in one stage, rejoin in the
  next, children crossing as declared snapshot members. That is the durable-child
  rule applied to a set, with no new mechanism.
- **Every child is attempted before anything is decided**, so one snag cannot
  strand the rest; a child that already arrived is rejoined, never re-driven. A
  parked rejoin resumes rather than re-runs.
- Trouble is taken **at `rejoin`, never `detach`** — the outcome is taken where it
  is taken. With `on_error: :return`, a troubled rejoin hands back a
  `Journey::Muster(arrived:, troubled:)` whose `troubled` is made of the same
  `Trouble`s a single excursion produces, so one handler shape covers one child and a
  whole party ([ADR-0014](0014-a-childs-trouble-is-the-owners-to-interpret.md)).
- Detachment members are **addressed through the member that holds them**
  (`[:run, :fetches, 1]`): the declared collection is restored in order, which is
  what gives N same-class children stable addresses that repeated inline excursions
  deliberately lack ([ADR-0018](0018-the-tree-walk-belongs-to-the-outfit.md)).
- A detached child is **never its owner's mail deputy** — N deputies racing for one
  letter is framework-introduced nondeterminism ([ADR-0019](0019-mail.md)).
- With mail in play, `rejoin` resolves conversation in **rounds**; a no-progress pass
  over an inline outfit yields a deterministic stuck report instead of a
  hang ([ADR-0020](0020-waits.md)).

## Consequences

- "Wait for submitted work to finish" has a first-class spelling, which is also why
  the waiting layer refuses completion-shaped wakes.
- Guides stay `excurse`-only for now: a guide re-creates a child, and what that means
  for one already detached and possibly in flight is a question nobody has needed
  answered.
