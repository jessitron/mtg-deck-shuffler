# Journeys — Roadmap

Accepted changes not yet made. Each item states the decision, the reasoning that
settled it, and the concrete edits — enough to implement from cold, with nothing
left to guess. When an item lands, delete it from here; the ADRs, guide, and
glossary become the record.

---

## 1. A declared child owns its collaborators

**Decision.** `EmailRetrieval` should declare `email_store` as its own need, and
`TimeZoneResolution` its `geocoding_adapter`, rather than being handed one at the
call site. Both are collaborators a child reaches the world through, which is
ADR-0005's line, and the maker form is what let us skip it. Converting `excursion`
to a driver moved those from a maker's hidden argument to a visible one — an
improvement, and not the whole of it.

**What it costs, and why it is its own item.** Resolving a collaborator means
resolving it *for somebody*: `Briefasaurus.email_store(user_identity:)` needs an
identity the child does not currently carry. So the change is really "give each
child a `user_identity`", which reaches those children's constructors, their
specs, the purge and revocation paths that build them, and the fakes. That is a
different change from the excursion one and deserves its own pass rather than
riding along with it.

### Edits when it lands

- `EmailRetrieval` takes `user_identity:` and declares
  `need(:email_store) { Briefasaurus.email_store(user_identity:) }`
- `TimeZoneResolution` likewise, for `geocoding_adapter`
- `ExtractionRun`'s call sites drop the `email_store:` / `geocoding_adapter:`
  keywords they currently pass

---

## Landed

- **`excursion` declares a driver, not a maker.** The macro declares a named way
  to *drive* a child and defines the method that does it, so the call site never
  moves through the promotion ladder — a method, a promoted body, `journey { … }`,
  a file of its own. `journey { … }` is the new constructor for an anonymous
  journey class; generated and anonymous classes are `const_set` on the declaring
  class so a stored type resolves on the way back. Arity decides the slot,
  `stage excursion def` composes again, and `excurse(:name)`'s registered and
  bare-symbol paths are gone. A promoted body stays on the class it was written in
  — Ruby rehomes no `def` — so isolation from the parent arrives one rung later,
  at `journey { … }`, where the body is genuinely another class's.
- **`layover` → `wait`, and wakes resolve by name.** The outcome is spelled the
  same word everywhere — `wait on:`/`waiting?`/`waiting_on` — and an unclaimed
  keyword names a wake, so `for:` and `until:` stop being sugar over a general form
  and become registry entries like any other. `becalmed` had already become `stuck`;
  the internal mechanism names (`Concierge`, `Lobby`, `Guest`, the desk) stay, since
  they name machinery rather than an outcome and none is user-facing.
- **`docket` aliased to `options`**, with the author's spelling threaded through
  every error about that paperwork — otherwise reaching for the plainer word gets
  you an error about the stranger one, which makes the alias a trap.
- **A macro takes a block iff it captures a body.** Closed the four gaps —
  `receive`, `fail_on`, `stage`, `diversion` — so block and def forms are the same
  set everywhere. `snapshot`, `snapshot_version`, and `seal_*` capture no body and
  stay blockless by construction, which the ADR now says rather than leaving implied.
- **ADR-0007 leads with the invariant.** "A macro adds names; it never replaces one"
  is the decision; the bang is what that produces where a macro adds a sibling, and
  the excursion change is the same clause rather than an exception. The `def`-below-
  the-macro limit is stated as a deliberate one.
- **`sojourn` / `stumble` → `snag`.** Two roots for one outcome, one of them
  implying a pleasant pause and unfamiliar besides. `snagged?`, `:stage_snagged`,
  `Trouble#snagged`, `Muster` key `snagged:`.
- **ADR-0026 — every input and output is named.** The second foundational move,
  placed after ADR-0001 because a process must be an object before its boundary is
  worth naming. ADR-0001's Context gained the retention argument it was missing: what
  a call does not return is gone, and a result object holds only what somebody knew
  to ask for at design time.
- **Enactments are verbs, with no prefix.** The `enact_` prefix supplied a verb
  because enactments were named as nouns, and the noun naming existed to justify the
  prefix; naming them for what they do breaks the circle. `via:` went with it, so the
  method name is the ledger key — one name per enactment.
- **`consign` → `enact`.** Not accessible enough language for newcomers.
  `Consignee` → `Enactor`, the dual of `Provisioner`: one provides, one performs.
  `have_enacted`, `enacted?`, `enacted_at`, `UndeclaredEnactment`,
  `seal_enactments!`, and the `enacted` register column. `Manifest` kept its name.
- **`becalmed` → `stuck`.** Nautical, opaque, and it named the worst state
  (deadlock) with the gentlest word. `attend` answers
  `:proceed | :parked | :stuck`.
- **`need` collision guard.** `journey_define_need_accessor` was the one generation
  site that could silently clobber a hand-written method. A declaration does not look
  like a definition, so this was the least visible surprise of the lot; nothing
  legitimate was served, since the default rung is fixed at `key!` and a bare `key`
  is never consulted as one.
