# 11. Outfits: the execution bundle — and the fiber outfit

Every seam a journey runs through — conveyance, provisioner, enactor, launch
strategy, condition strategy, listeners, courier, concierge — lives on an
**outfit**: a frozen value, always present, **derived rather than manufactured**
([ADR-0013](../adr/0013-outfits-are-derived-never-manufactured.md)).

## The everyday moves

You rarely touch an outfit object. Name what you want changed on the verb, and the
verb derives:

```ruby
run.traverse(provisioner: fakes, enactor: recorder)   # this drive's kit
excurse(DeduplicationRun, conveyance: :inline)          # a Symbol names a registered conveyance
```

Reaching for the object is the rare, deliberate case — a program top, or a
request/job boundary kitting out a whole subtree:

```ruby
outfit = Briefasaurus::Journey.ambient_outfit.with(on_error: :return, enactor: recorder)
Briefasaurus::Journey.outfitted(outfit) { run.traverse }
```

## The three rules

- **Derive, never manufacture.** `Outfit.new` from nothing silently answers
  "nothing" to every decision the app already made — condition strategy, listeners,
  quarantine — and reads as a deliberate answer. `with` on the outfit in hand is
  the move, and the verbs do it for you. There is always an outfit in effect:
  `journey_outfit` bottoms out at the ambient one (a process-wide null-kitted seed
  the host configures at boot, plus a fiber-local layer `Journey.outfitted`
  scopes), so a bare `Journey.new.traverse` inherits ambient decisions.
- **Choices are fixed, scopes are shared.** Conveyance, provisioner, enactor,
  launch, and condition strategy fix at derivation. The listener list, the courier,
  and the concierge are live tree-spanning state shared by reference — appending a
  listener above reaches every descendant; replacing the courier at a derivation
  draws a postal boundary; replacing the concierge gives a subtree its own clock.
- **Nothing is cached.** Every read goes through the outfit at the moment of use.

Resolution ladder, most specific first: per-drive keyword → the journey's own
explicit setting → an outfit installed here → the class's declaration → ambient.
An app-wide policy is the *top-level outfit's* setting, inherited by descent — a
global's reach without a global's ambience.

## The fiber outfit

`Journey.fiber_outfit` derives an outfit whose drives run as fibers of one reactor
concierge — handed out as a pair, because it only works as one
([ADR-0021](../adr/0021-the-fiber-outfit.md)):

```ruby
Briefasaurus::Journey.outfitted(Briefasaurus::Journey.fiber_outfit) { run.traverse }
```

What changes is only *how the tree waits*: one clock and one `select` cover every
parked journey, so a party of five each waiting five minutes waits five, not
twenty-five; an owner blocked on a waiting child stays blocked instead of unwinding
and re-entering; a member parked on mail is freed by the sibling that posts it
inside the same rejoin round. Everything else — stages, registers, events, claims —
is identical to the inline loop by construction and by test: a guest suspends only
at a **stage boundary**, where the wait is already on the registers, so nothing
observable ever lives in a fiber; and when the desk can make no further progress it
**unwinds** to exactly the resting state the inline outfit would have produced.

**Write journeys the same way under either outfit.** That is the lockstep promise,
and it is checked rather than asserted.

## How it's tested

The `type: :journey` harness *is* outfit derivation: it layers a
`TestProvisioner`, `TestEnactor`, and `TestConcierge` over the ambient outfit
around each example — the same `with`/`outfitted` moves production uses, which is
why nothing needs stubbing. Framework equivalence between inline and fiber outfits
is pinned by the fiber specs; application journeys don't re-prove it.

```ruby
it "records effects without running them, via a derived outfit" do
  recorder = RecordingEnactor.new
  run.traverse(enactor: recorder)
  expect(recorder.manifest.map(&:name)).to include(:publish_feed)
end
```

## Pitfalls

| You wrote | Instead |
|---|---|
| `Journey::Outfit.null.with(...)` inside a running program | Derive from `Journey.ambient_outfit`, or name the change on the verb |
| A fiber-local global for an app-wide policy | The top-level outfit's slot, inherited by derivation |
| Passing a constructor kwarg named like a reserved outfit keyword through the class form | Reserved keywords win; build the child with the bare form |
| Journey code special-cased for the fiber outfit | Same stage bodies under every outfit — if they differ, that's a framework bug to report |
