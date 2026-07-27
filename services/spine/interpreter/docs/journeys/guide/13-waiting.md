# 13. Waiting: waits, wakes, and the concierge

The fourth thing that can become of a stage: **nothing went wrong, and nothing has
happened yet.** A journey parks declaring a *wake* — what would let it continue —
and the outfit decides how to wait ([ADR-0020](../adr/0020-waits.md)).
*Snagged because something went wrong; on wait because something has not
happened yet.*

## The gate

```ruby
stage def call_llm
  wait until: @window_resets_at if @window_resets_at   # rate-limit window, solved
  @completion = need(:completion) { llm_adapter.complete(@messages) }
end

diversion def pause
  wait for: @schedule.interval(@attempts)               # a backoff that holds no worker
  stage :attempt
end
```

`wait` **passes when the wake is due and parks when it is not** — so retry is stage
re-entrancy with no ceremony: the parked stage re-runs from the top, reaches the
same gate, and falls through if the world has moved.

A parked run is `waiting?` — not `error?`, not `failed?`; `traverse!` does not
raise on it (there is no error); telemetry reports it at `:info`. `waiting_on`
answers what it is waiting for, in the same word the call site used. An owner
blocked on a waiting child waits on the child's wake; a rejoin round keeps a
waiting member rather than reporting it arrived.

## Naming a wake

Every form spells its condition with a preposition. An **unclaimed keyword names a
wake** and its value is that wake's one argument:

```ruby
wait for: 5.minutes                # AfterWake — a backoff that holds no worker
wait until: @window_resets_at      # AtWake — a rate-limit window
wait mail: ReplyMail               # MailWake — courier and handle are its own
wait readable: socket              # ReadableWake
wait quota: user                   # whatever your application registered
```

Names resolve through the registry first, then by convention (`quota:` finds
`QuotaWake`), so **wakes are an open set**: register your own and stages say
`wait quota: user` instead of reaching for a constant from inside a stage body.
A typo is a registry miss, so `wait untl: t` raises `UnknownWake` and lists what it
knows.

`on:` takes a wake already built, which in practice means a composite — a keyword
supplies one argument, and anything wanting more uses the object form:

```ruby
wait on: Wake.mail(matching: OrderMail) | Wake.at(@give_up_at)   # Erlang's receive…after
```

**Exactly one condition, or it raises.** Two would read as "or", and a timeout is a
wake composed in with `|`, never a modifier.

## Wakes

```ruby
Wake.after(300)                    # relative deadline
Wake.at(window_resets_at)          # absolute deadline
Wake.readable(io)                  # IO readiness
Wake.mail(matching: ReplyMail)     # a claim would succeed
```

A wake is a **readiness** condition — `due?(now:)` is a peek, never a take (a wake
that fetched data would be a need in a wake's coat; the woken stage re-derives its
inputs through needs). It *offers* what an outfit could block on — deadline, IO,
cadence, mail — and the outfit chooses. Anything answering `due?(now:)` and
`description` is a wake, so a domain wake is a small honest object polling a real
predicate.

Deliberately absent: **`Wake.all`** (readiness is momentary; a conjunction is a
codified race — a sequence is sequential waits, a rendezvous is a detachment),
and **timeout modifiers** (a timeout is a deadline wake composed with `|`; no wake
ever ends a run — the deadline's only power is handing control back to business
logic, which then declares what it declares).

**The anchor rule:** a relative wake resolves against the clock at its *first*
park; re-entry restating the same wake reuses the resolved `wake_at` — so backoffs
never slide, across process boundaries, because the parked outcome persists. One
relative wake per stage; a stage needing two timed pauses splits.

## The concierge

The outfit's waiting component: one clock (`now`) and
`attend(wait) → :proceed | :parked | :stuck`. It may cause a step to be
attempted and can never write a register.

- **Inline** (null kit): blocks honestly *between* steps — `IO.select` over offered
  handles, sleep to the earliest deadline. (`sleep`'s sin was never waiting; it was
  *where* — mid-stage, invisible, holding uncommitted state.)
- **Job-backed**: *books* — a deadline becomes `JourneyJob.set(wait_until:)` and the
  worker goes free; `retries: { wait: 300 }` becomes a row with a `wake_at`.
- **Fiber** ([chapter 11](11-outfits.md)): the concierge *is* the reactor —
  suspends the parked guest, resumes the one whose wake came due.
- **Test**: a frozen virtual clock; declines every park as `:parked` (not
  `:stuck` — "will not" and "cannot" must never read alike).

**Stuck** names a park nothing present can satisfy or wait out — a diagnosis,
not a failure; a no-progress rejoin round over stuck members is a deterministic
deadlock report naming who waits for what. `traverse(wait: false)` is the stopping
condition for callers that must not block: it suppresses sleeping, never arranging.

The wake object is flight-only; the persisted face is scalars (`wake_key`,
`wake_at`, `description`) in their own columns — so a job backend books straight
off the row, and no lambda ever reaches a column.

## How it's tested

**Time only moves when the spec says so** — the lockstep promise extended to time.
`advance` is the whole of the sugar; every other wake is made due by making it
true (write the pipe, post the mail, change what the domain wake polls), so `due?`
is under test rather than stubbed. The three beats: *assert it is on wait, make
the world move, drive again.*

```ruby
it "backs off exponentially, anchored at the first park" do
  run.traverse
  expect(run).to be_waiting
  expect(run.wait.wake_at).to eq(journey_now + 300)

  advance 299
  run.traverse                                            # re-entry re-states the wake…
  expect(run.wait.wake_at).to eq(journey_now + 1)      # …and does NOT re-anchor

  advance 1
  run.traverse!
  expect(run).to be_succeeded
end

it "waits for the handle, then reads it" do
  reader, writer = IO.pipe
  run = FeedReader.new(io: reader)

  run.traverse
  expect(run).to be_waiting

  writer.write("chunk")                                   # the world moves — nothing stubbed
  run.traverse!
  expect(run.chunk).to eq("chunk")
end
```

Which branch of a composite woke a stage is asserted through the stage's own
behavior (the enactment it made, the diversion it took) — the wait clears on
commit, and the stage that cared has already turned the answer into behavior.

## Pitfalls

| You wrote | Instead |
|---|---|
| `sleep` anywhere in journey-adjacent code | `wait` — wrong by definition, lint-grade |
| A `timeout:` kwarg on a wait | Compose a deadline wake with `\|`; the woken stage decides |
| Two relative wakes in one stage | Split the stage — the standing outcome anchors one |
| A wake that fetches or claims in `due?` | Peek only; the stage re-derives through needs after waking |
| Stubbing `Time` in a journey spec | `advance` the test concierge's clock |
| Treating a parked wait as an error state | `waiting?` is health; `snagged?` is trouble |
