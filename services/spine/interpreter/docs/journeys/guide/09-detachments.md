# 9. Detachments: splitting the party

`launch` is fire-and-forget; `excurse` blocks on one child. A **detachment** is the
third shape: N independent children in flight at once, all yours, all awaited
([ADR-0017](../adr/0017-detachments.md)).

```ruby
stage def start_fetches = @fetches = urls.map {|url| detach(FetchPage, url:) }
stage def collect       = @pages = rejoin(@fetches).map(&:page)
```

`detach` hands back a child built and kitted exactly as an excursion would — but
not driven. `rejoin` takes the outcome of the set. The **interval** between the two
verbs is the product:

- **Concurrency is the outfit's business.** The call site declares only that the
  children are independent. An inline conveyance resolves the party linearly and is
  still correct; the fiber outfit runs the round abreast, so five waits of five
  minutes take five ([chapter 11](11-outfits.md)); a thread outfit truly
  parallelizes.
- **A stage boundary may fall in the interval** — detach in one stage, rejoin in
  the next, the set crossing as a declared snapshot member (`snapshot :fetches`;
  journeys are snapshot members already). That is the whole durability story: no
  new mechanism.
- **Every child is attempted before anything is decided**, so one snag cannot
  strand the rest; a child that already arrived is rejoined, never re-driven —
  which is why a parked rejoin *resumes* instead of re-running.
- Detached children have stable addresses through the member that holds them
  (`[:run, :fetches, 0]`) — the escape hatch for "I want N addressable children of
  one class," which repeated inline excursions deliberately don't get.
- A detached child is never its owner's mail deputy
  ([chapter 12](12-mail.md)); with mail in play, `rejoin` resolves conversation in
  rounds, and a no-progress round is a deterministic deadlock report rather than a
  hang ([chapter 13](13-waiting.md)).

## Trouble at the rejoin

`on_error:` goes on **`rejoin`, never `detach`** — the outcome is taken where it is
taken. A clean rejoin hands back the children; with trouble, `:return` hands back a
`Journey::Muster(arrived:, troubled:)` whose `troubled` is made of the same
`Trouble`s a single excursion produces:

```ruby
stage def gather
  case rejoin(@fetches, on_error: :return)
  in Journey::Muster(troubled: [*, Journey::Trouble(failed: true) => fatal, *])
    fail!(fatal.reason)                       # this owner declines to absorb a failure
  in Journey::Muster(arrived:, troubled:)
    @pages = arrived.map(&:page)
    record_fetch_shortfall(count: troubled.size)
  in Array => fetches
    @pages = fetches.map(&:page)
  end
end
```

Guides stay `excurse`-only for now — a guide re-creates a child, and what that
means for one already detached and possibly in flight is a question nothing has
needed answered.

## How it's tested

Same harness, no concurrency in sight — the inline outfit resolves the party
deterministically:

```ruby
it "collects every page and reports the shortfall" do
  provide(:fetch_page, when: ->(j) { true }) { next_fetch_result }   # or provide each child

  run.traverse!

  expect(run.pages.length).to eq(4)
  expect(run).to have_enacted(:record_fetch_shortfall).with(count: 1)
end

it "rejoins arrived children rather than re-driving them after a park" do
  run.traverse            # parks: one member snagged
  fix_the_world
  run.traverse!           # only the unfinished member moves

  expect(run).to be_succeeded
end
```

## Pitfalls

| You wrote | Instead |
|---|---|
| A loop of `excurse` calls for independent children | `detach` each, `rejoin` the set — the interval is where an interleaving outfit works |
| `on_error:` on `detach` | It goes on `rejoin` |
| A detachment held in an undeclared ivar across a boundary | `snapshot :fetches` — the members are the durability story |
| Fan-out with no return wanted | That's `launch`, not a detachment |
| N addressable same-class children via repeated inline excursions | A detachment — the collection member is the stable address |
