# 6. Excursions: driving sub-journeys

`excurse` is how a journey drives another journey: the child runs on the parent's
own outfit, listeners see `excursion_started`/`excursion_ended`, the child registers
on the parent's live `Children` tree, and the drive is strict — a child snag
surfaces as this stage's snag, a child failure as its own failure
([ADR-0012](../adr/0012-excursions.md); what the owner may do about trouble is
[chapter 7](07-condition-handling.md)).

## The call forms

```ruby
excurse(ItemInterpretation, completion: @completion)   # class form — preferred when the child takes args
excurse(EmailRetrieval.new(refs:, email_store:))       # bare form — a journey already built
excurse(:selection) { candidate_selection_maker.call(items: @candidates) }   # named + deferred
```

- **Class and bare forms get a synthesized name** — the demodulized, underscored
  class (`:item_interpretation`) — consulted on the provisioner *first*, so any
  excursion is provide-addressable in specs without explicit naming. The class form
  defers construction past that consult: when provided, `Klass.new` never runs.
- **Unprovided synthesized excursions fall through and drive the child** — never
  raise, even under the raise-on-unprovided test provisioner. The excursion is not
  itself a world reach; the child's own needs guard any actual one.
- **A named excursion is an ordinary need** (sugar for
  `need(:name) { excurse(…) }`): unprovided under test provisioning, it raises. It is
  what you reach for when the child's *class* is chosen at drive time, since the
  block defers construction past the provisioner consult — `provide selection:` swaps
  the result, `provide candidate_selection_maker:` swaps the strategy.
- Same-class excursions in one journey share a synthesized name — accepted;
  `provide_once`/`when:` disambiguate the rare sites needing different answers.

## The `excursion` class macro: declaring a driver

`excursion` declares a **named way to drive a child** and defines the method that
does it. Three forms, and all three define `interpret_item(…)`:

```ruby
excursion :interpret_items, ItemInterpretation, purpose: :dedup   # a class, plus fixed args
excursion def interpret_item!(item) = …                           # a body, promoted
excursion(:interpret_item) {|item| … }                            # the same, block form
```

```ruby
excursion :retrieve_emails, EmailRetrieval

stage def retrieve
  @retrieval = retrieve_emails(email_references: deserialized_references, email_store:)
  self.emails_fetched = @retrieval.retrieved_emails.length
end
```

The call site says what the child receives, and the driver hands back the child.
There is no `excurse(:name)` symbol form: a declaration *is* the verb.

**The ladder is the point.** A method grows until it deserves its own journey, and
the conversion should cost a declaration, not a rewrite of every call site:

```ruby
def interpret_item(item) = …                        # 1. a method
excursion def interpret_item!(item) = …             # 2. one stage, generated journey
excursion :interpret_item, journey { … }            # 3. several stages, still inline
excursion :interpret_item, ItemInterpretation       # 4. its own file
```

`interpret_item(item)` reads identically at every rung. Rung 1 returns what the
method returned and rungs 2–4 return the child, so there is exactly one adjustment,
at rung 2, and none after.

`journey { … }` yields an anonymous journey class, and slots wherever a class goes.
Name it when the receiver can't (`excurse(journey(:item_interpretation) { … })`) —
an anonymous class has no useful synthesized name, so an unnamed inline journey
cannot be substituted in a spec at all. `excursion` fills the name in from its own
declaration when you leave it off.

**The bang pair is the ordinary one** ([ADR-0007](../adr/0007-the-mediation-convention.md)):
`interpret_item!` is the body run inline in the parent — raw, directly callable,
which is what a unit spec wants — and `interpret_item` is the same work driven as a
child through the seam. A promoted body stays on the class it was written in, so the
parent's ivars and helpers are still in reach at rung 2; they go away at rung 3,
where the body is genuinely another class's.

A promoted body's parameters become the generated journey's constructor keywords and
its declared snapshot members, and its sole stage takes the declaration name — so
`ExtractionRun::InterpretItem` reads as itself in a log, a backtrace, and a stored
type.

**Arity decides the slot.** A call that passes nothing names one child: it fills
`@name` (declare it with `snapshot` to survive a boundary), is addressed under the
declaration name, and **rejoins** the existing child rather than starting a second.
The same resumability holds for a child left parked on a wait. A call that passes
arguments gets a fresh child each time, because `flyer_check(a)` and `flyer_check(b)`
are two children and one ivar cannot hold both. Want N runs of one class? A
detachment ([chapter 9](09-detachments.md)).

**A stage that is one drive declares itself as one**, the way `stage enact def` does
— and arity settles what it leaves behind:

```ruby
stage excursion def interpret_items! = …    # walks as :interpret_items, leaves @interpret_items
```

**Declare when the child is a fact about the class; excurse inline when it is a
decision made at drive time.** The second argument to `excursion` is always a literal
class, so there is no dynamic-target case to design for.

## Durable children: create, then drive

When a child is persisted and paid for, creating and driving it in one stage leaves
a crash window in which the child is orphaned — created, charged, unreachable by
resume — and retry buys a second one. Split across a boundary, with the id crossing
as a snapshot member:

```ruby
stage def open_deduplication
  @deduplication_run ||= reopened_deduplication_run || deduplication_run_maker.call
  @deduplication_run_id = @deduplication_run.id     # snapshot member
end

stage def deduplicate = excurse(@deduplication_run)
```

For most children the one-stage window is acceptable; for paid ones it is not.

## How it's tested

Provide the whole child under its (synthesized or declared) name — it never runs —
or let it run for real off its own provided needs:

```ruby
it "uses the interpretation's items" do
  provide item_interpretation: instance_double(ItemInterpretation, items: [item], vision_escalations: [])
  # …
end

it "drives the real child off provided needs" do
  provide(:completion) { canned_completion }   # the child's own need
  run.traverse!
  expect(run.interpretation).to be_succeeded
end
```

`Klass.new(...).traverse!` inside a stage body is the anti-pattern: it drives the
child outside the outfit, invisible to listeners and un-provide-addressable.

## Pitfalls

| You wrote | Instead |
|---|---|
| `Klass.new(...).traverse!` in a stage | `excurse(Klass, ...)` |
| `excurse(EmailRetrieval.new(refs:))` when the child takes args | Class form — `excurse(EmailRetrieval, refs:)` — so a provide skips construction |
| A hand-rolled retry loop around a child | `excurse(Child, retries: n)` — a guide re-creates what a loop can only illegally re-drive ([chapter 8](08-guides.md)) |
| Creating a persisted child and excursing it in one stage | Create-and-assign, then excurse; snapshot the id ([ADR-0012](../adr/0012-excursions.md)) |
| One argument-free declared excursion expected to yield two children | An argument-free call is a single-occupant slot and rejoins; pass arguments, or use a detachment |
| `excursion :name, some_maker.call` — a target chosen at drive time | The second argument is always a literal class; that is the inline `excurse(:name) { … }` case |
| `excurse(journey { … })` | Name it — `excurse(journey(:name) { … })` — or the inline child cannot be provided over in a spec |
| A child whose constructor takes `conveyance:` via the class form | Reserved outfit keywords shadow it; build with the bare form |
