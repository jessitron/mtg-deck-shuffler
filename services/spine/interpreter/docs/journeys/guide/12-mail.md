# 12. Mail: journeys talking to each other

Needs ask the world; enactments tell it; **mail** is journeys in flight talking
to each other — addressed, matched, and freight ([ADR-0019](../adr/0019-mail.md)).
Not a message bus: reaching a journey requires a handle it (or its owner) handed
out, and couriers scope to an outfit tree.

## Posting

```ruby
stage def open_pipeline
  @parser = detach(ParseFeed, source: @source)
  @writer = detach(WriteItems, upstream: @parser.journey_handle)
end
```

- A `Journey::Handle` is opaque and grants exactly one right: **to post**. Never to
  read another journey's mail. Handles are flight-only.
- A piece of mail is **the payload itself — no envelope**, and no automatic
  `from:`: a sender wanting a reply puts its own handle *in* the message (a
  transport stamping sender handles would leak a capability nobody granted). Define
  mail as frozen `Data` classes.
- `post(mail, to: handle)` returns `nil` always, never blocks, never raises on
  delivery grounds — the sender holds a handle, not a promise. **The freight
  gate**: mail must be `Ractor.shareable?` at post, under every outfit — a live
  record, lazy relation, or open IO raises `UnpostableMail` (identifiers cross;
  content doesn't). No auto-copy, deliberately: a transparent copy would turn an
  aliasing bug into a difference between outfits.
- Outside a journey: `outfit.courier.post(mail, to: handle)` — no facade sugar.

## Receiving

Inline, with `need`'s `:@ivar` sugar available:

```ruby
INBOUND = ->(mail) { mail in OrderMail | DrawdownMail }   # === floor; Ruby's own alternation

stage def work_orders
  case receive(matching: INBOUND)
  in DrawdownMail then nil                    # fall through to :arrive
  in OrderMail => order
    fulfill(order_id: order.id)
    stage :work_orders                        # loop until told otherwise
  end
end
```

Declared, composing with `stage` — the raw body stays unit-testable off-manifest
(`apply_reply!(some_mail)`), which is what the bang announces
([ADR-0007](../adr/0007-the-mediation-convention.md)):

```ruby
docket matching: ReplyMail
stage receive def apply_reply!(reply)
  @summary = reply.summary
end
```

Or as a block, which captures the handler instead of naming it — so it authors no
method name, needs no bang, and carries its options inline:

```ruby
stage receive(:apply_reply, matching: ReplyMail) {|reply| @summary = reply.summary }
```

`matching:` takes any `===`-responder; omitted, it matches any mail. An unfulfilled
receive **parks** the run on a mail-shaped wake — an ordinary wait, retried by
stage re-entrancy, `awaiting_mail?` as sugar ([chapter 13](13-waiting.md)).

**Claims are transactional with the stage**: mail claimed by a stage that then
snags (or parks, or fails) goes back to the queue, and re-entry re-claims. So
`post` is at-least-once under retry, `receive` exactly-once per commit — a stage
that must not double-post splits, or guards with a declared receive so re-entry
parks *before* the post.

## Who claims what, and the dead

- **Deputization follows the excursion chain**: an excursed child claims its
  blocked ancestors' mail (own queue first, then nearest ancestor; arrival order
  within a queue), so processing can move into a sub-journey without senders
  noticing. A **detached child never deputizes** — N deputies racing for one letter
  would be framework-introduced nondeterminism.
- **A dead journey's mail is held and announced, never rerouted**: `:mail_unclaimed`
  notifies (handle and mail class, never content). No parent pickup — flow decided
  by death rather than declaration is the thing the outcome model forbids.
- **No framework shutdown mail.** Out-of-band ending is `abandon!`; in-band
  wind-down is the journey's own declared mail class, matched in its own loop
  (`DrawdownMail` above).

## How it's tested

Specs post **real mail through the real courier** — nothing substituted, so a green
spec is evidence about matching, ordering, claims, and freight:

```ruby
it "fulfills orders until drawn down" do
  run.traverse
  expect(run).to be_awaiting_mail

  post OrderMail.new(item_id: 7), to: run.journey_handle
  run.traverse
  expect(run).to have_enacted(:fulfill).with(order_id: 7)

  post DrawdownMail.new, to: run.journey_handle
  run.traverse
  expect(run).to be_succeeded
end
```

`post` in a `type: :journey` spec is harness sugar over the ambient outfit's
courier — and unlike `provide` it is not a substitution: there is only mail that
arrived or didn't, which is the domain talking. The **step cap** (default 100 stage
attempts per example, overridable) turns an accidental mail loop into
`StepCapExceeded` carrying the log's tail instead of a hung spec. And under the
inline outfit, a party that deadlocks on mail produces a deterministic report
naming who waits for what — lockstep as the debugging case.

## Pitfalls

| You wrote | Instead |
|---|---|
| Mailing an AR record or an open IO | Identifiers; the freight gate will raise either way |
| A `from:` convention stamped on every mail class | Put a reply handle in messages that want replies, and only those |
| Broadcast via shared handles | A journey that receives and re-posts — fan-out stated in the open |
| `receive` with a timeout kwarg | Compose a deadline wake: `wait on: Wake.mail(matching:) | Wake.at(give_up_at)` ([chapter 13](13-waiting.md)) |
| A framework-known shutdown message | Declare your own wind-down mail class; `abandon!` from outside |
| Snapshotting a handle | Flight-only; a resumed run re-derives handles from the children it re-excurses or is provided |
