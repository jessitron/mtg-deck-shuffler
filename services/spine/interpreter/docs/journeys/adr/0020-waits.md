# ADR-0020 — Waits: waiting is a fourth outcome

**Status:** accepted

## Context

Every layer kept rediscovering the same missing thing in its own corner: **nothing
went wrong, and nothing has happened yet.** A retry guide slept with `Kernel.sleep`
inside a stage body — holding a worker for the whole backoff; the mail layer minted a
bespoke awaiting-mail value; an IO wait or a rate-limit window would each have minted
another. And modeling the park as an *error* broke the strict drive: `traverse!`
raises on `error?`, and `excurse` drives children strictly, so a politely waiting
child would have raised a fault into its parent — telemetry paging somebody because a
run is waiting for 3:48 PM.

## Decision

**A journey parks declaring a wake, and the outfit decides how to wait.**

- **The outcome set gains a fourth member**: completed, errored, failed, and
  **waiting** — carrying a `Journey::Wait`. `error?`/`failed?`/`snagged?` are
  false; `waiting?` is true; `halted?` gains its third reason; `over?` is
  untouched. Snagged and on-wait are siblings — *snagged because something
  went wrong, on wait because something has not happened yet* — not one state
  wearing two labels. `traverse!` does not raise on a wait: there is no error.
- **`wait` is a gate**: it passes when the wake is due and parks (by **throw**,
  [ADR-0019](0019-mail.md)'s rule generalized) when it is not — so retry is stage
  re-entrancy with no ceremony. **Every form spells its condition with a
  preposition**, and the reader is the same word: `waiting_on` answers what
  `wait on:` was told.
- **An unclaimed keyword names a wake and its value is that wake's one argument**,
  resolved the way every named thing here resolves ([ADR-0015](0015-guides.md)):
  the registry first, then the framework's own naming convention.

  ```ruby
  wait for: 5.minutes                        # AfterWake
  wait until: @window_resets_at              # AtWake
  wait mail: Confirmation                    # MailWake, courier and handle its own
  wait quota: user                           # whatever the application registered
  wait on: Wake.mail(...) | Wake.after(30)   # composition drops to objects
  ```

  `for:` and `until:` are registry entries like any other rather than sugar over a
  general form, which is what leaves `wait` with no special cases — and what lets an
  application register `QuotaWake` and say `wait quota: user`, instead of reaching
  for a constant from inside a stage body. Wakes are an open set, the way
  conveyances, guides, and condition strategies already are. A keyword supplies one
  argument; a multi-argument wake uses the object form and `on:`, the same line
  `retries: 3` draws against a hand-built guide. A wake class owning its own
  construction answers `for_journey`, which is how `wait mail:` reaches a courier
  and a handle no call site named. **Exactly one condition, or raise** — two would
  read as "or", and a timeout is a wake composed in, never a modifier.
- **A `Wake` is a readiness condition** — `Wake.at`, `Wake.after`,
  `Wake.readable`/`writable`, `Wake.mail`, composed with `|`. `due?(now:)` is the
  poll floor (a peek, never a take — a wake that fetched data would be a need in a
  wake's coat); `offer(desk)` calls back what an outfit could block on (deadline, io,
  cadence, mail) — node offers, outfit chooses. **Readiness, never completion**: a
  completion wake would carry an operation, and operations are already mediated —
  "wait for submitted work" is `detach`/`rejoin`. **There is no `Wake.all`**:
  readiness is momentary, so a conjunction is a codified race; a sequence is
  sequential waits, a rendezvous is a detachment. **A timeout is a wake composed
  with `|`, never a modifier** — no wake ever ends a run; a deadline's only power is
  handing control back to business logic ([ADR-0003](0003-terminality-is-declared.md)).
- **The anchor rule**: a relative wake resolves against the clock at its *first*
  park and the standing outcome remembers `wake_at` by `wake_key`, so re-entry never
  re-anchors and a backoff means what it says — across process boundaries, because
  the outcome persists. One relative wake per stage is the guidance. The wake object
  is flight-only; the persisted face is scalars (`wake_key`, `wake_at`,
  `description`) in columns of their own.
- **The Concierge is the outfit's waiting component**, on the scopes side (a timer
  wheel and select set are live tree-spanning state): `now` is the tree's one clock;
  `attend(wait, blocking:)` answers `:proceed` / `:parked` / `:stuck` — three
  answers, because "will not" (test concierge declining by design) and "cannot"
  (nothing this outfit has can ever make the wake due) must not read alike. The
  concierge can cause a step to be attempted and can never write a register. Inline
  blocks honestly *between* steps (`sleep`'s sin was never waiting, it was *where* —
  mid-stage, invisible, holding uncommitted state); a job outfit **books**
  `wait_until: wake_at` and frees the worker; the fiber concierge is the reactor
  ([ADR-0021](0021-the-fiber-outfit.md)).
- **`traverse(wait: false)`** is a stopping condition, not a mode — the family
  `to:`/`through:` belong to: *stop when you would otherwise have to wait*. It
  suppresses sleeping, never arranging (a job concierge still books), and travels
  into excursed children and rejoined parties.
- **A waiting child makes its owner wait** — the excursion boundary parks the owner
  on the child's own wake; a rejoin round keeps a waiting member rather than
  reporting it arrived. A wait never reaches a condition strategy: a waiting
  child is not troubled.
- **`stuck`** names a park nothing present can satisfy or wait out — the deadlock
  report generalized past mail: a no-progress rejoin round yields a deterministic
  report naming who waits for what, which makes the inline outfit the *debugging*
  case rather than the degenerate one.

## Consequences

- `Kernel.sleep` anywhere in journey-adjacent code is wrong by definition —
  lint-grade.
- Time-dependent flakiness leaves journey specs: the test concierge is a frozen
  virtual clock, `advance` is the only sugar (a wake is a question about the world,
  and specs answer it by making it true — write the pipe, post the mail, change what
  the domain wake polls). A 300-second backoff tests deterministically in
  microseconds, with `due?` under test rather than stubbed.
- `retries: { wait: 300 }` stops holding a worker and becomes a row with a `wake_at`
  and a job scheduled for it.
- A run whose wake never comes is a parked run nobody retried; `RetentionSweep`
  already owns those.
