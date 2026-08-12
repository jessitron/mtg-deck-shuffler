# DESIGN — Schema Evolution Policy (why the envelope and payloads are strict differently)

Status: **decided, 2026-08-12**

Companion to `notes/DESIGN-event-contract-v0.md` (Decision 5: versioning mechanics) and
`contracts/README.md` (which states the resulting rule). This doc is the reasoning —
read it when the rule alone ("payloads ignore unknown properties, the envelope doesn't")
isn't enough, or before changing either policy.

## What triggered this

Ticket 02 of `colors-from-playmat-to-life-counter` added two optional fields to
`seat.joined.v1`. Every payload schema had `additionalProperties: false` at the time.
That's harmless in the direction we tested (an old Shuffler sending `sleeveColor` alone
still validates against the new schema — the new fields are optional). It's **not**
harmless in the other direction: a newer Shuffler sending the new fields to a Tabletop
that hasn't redeployed yet would get its whole `seat.joined` event rejected — the old
schema doesn't know `primaryColor`/`secondaryColor`, and `additionalProperties: false`
treats them as invalid. That asymmetry is what this doc resolves.

## Persisted data and live events are not the same problem

This repo already had a strictness stance, for persisted data:
`apps/shuffler/notes/DESIGN-persistence-versioning.md` — any change to a persisted
shape, additive or not, bumps a version constant, and old data fails loudly rather than
being silently coerced. That stance is right for its problem: a save file has exactly
one reader (this app, this version) and no deploy-ordering question — either the code
reading it matches the version stamped on it, or it doesn't.

Events crossing the wire between three **independently deployed** services are a
different problem. The Shuffler, the Tabletop, and the Spine don't deploy in lockstep,
so at any moment one of them can be running older code than the other two. A policy
that treats every unrecognized field as fatal makes that ordinary, temporary skew into
an outage. The persisted-data stance doesn't transfer unmodified — which is exactly
where the original contract work went too far: it applied one uniform
`additionalProperties: false` to the envelope *and* every payload, without asking
whether both layers have the same deploy-ordering problem. They don't.

## The decision, in two parts

**Envelope schemas (`envelope.v1/v2/v3.json`) stay `additionalProperties: false`,
permanently.** The envelope has no per-field version dial — `schemaVersion` belongs to
the *payload*, and the envelope's only version signal is which file it's validated
against (`envelope.vN.json`). If an old reader silently accepted an envelope field it
didn't recognize, there would be no mechanism by which it could ever notice the
envelope's shape had grown — no version number to check, nothing. Strictness here isn't
about distrust of senders; it's the only thing that makes "a new envelope field requires
a version bump" actually true. This was already the repo's practice (decided while
drafting the `visibility` and `scope` decisions, see History below) — this doc examines
it for the first time and confirms it holds up.

**Payload schemas (`contracts/payloads/*.json`) are `additionalProperties: true`**
(changed 2026-08-11, commit `a7acb08`). A payload *does* have a version dial
(`schemaVersion`), but this repo's actual practice — including the change that surfaced
this whole question — edits a payload schema file in place for additive, optional
changes rather than minting a new version. Given that practice, `additionalProperties:
false` was enforcing a promise the repo wasn't keeping. Making payloads permissive
matches what we actually do, and buys the one thing that matters operationally: a
receiver one deploy behind a sender degrades gracefully (ignores what it doesn't
recognize yet) instead of rejecting the whole event.

## What makes payload permissiveness safe: deprecate, don't mutate

Permissiveness is only safe under a discipline, and it's worth stating explicitly rather
than leaving it implicit: **a field's name never changes meaning or type.** Evolution of
a payload looks like:

1. Add a new, optional field alongside the old one.
2. Both old and new senders/receivers coexist for a while (that's the whole point —
   the three ships don't deploy together).
3. Once every sender has moved to the new field, stop requiring the old one; once every
   receiver has moved, stop sending it.
4. Delete the old field from the schema once nothing sends it.

Under this discipline, "unrecognized field" can only ever mean "a newer sender added
something I don't understand yet" — never "a field I already understood just changed
shape under me." That second case is the one `additionalProperties: false` would be
protecting against, and it's ruled out by convention instead, the same way Protobuf and
Avro do it (never reuse a field number/name for a new meaning; add and deprecate
instead of mutating).

## Why this doesn't need production-side typo protection

The obvious worry about permissiveness: what stops a typo (`primarycolor` for
`primaryColor`) from silently vanishing instead of loudly failing? Answer: that's a
**test** problem, not a production policy problem. `additionalProperties: false` in
production would catch it, but at the cost of turning routine deploy skew into a hard
failure for every real user — a bad trade for catching a bug that a contract test finds
just as well, before it ships. (`apps/shuffler/test/verification/verify-tabletop-integration.spec.ts`
already builds a real Shuffler event and posts it through a real Tabletop's real ajv
validation — that's the seam that catches this class of typo today.) If seat coloring
silently stops working and nobody notices for weeks, that's information too: it says
the feature wasn't as load-bearing as its schema entry suggests.

## The compensating signal: warn, don't reject

Permissive validation gives up the *hard failure* on an unrecognized field, but not the
*visibility* into one showing up. **Not yet implemented** (follow-up work): after a
payload validates successfully, diff its actual keys against the schema's declared
`properties` and `log.warn` any that aren't declared — table, event name, schemaVersion,
which keys. This turns "a newer sender is ahead of an older receiver" into a Honeycomb
signal you can watch during a rollout, without anyone's game breaking over it. Lands in
`apps/tabletop/src/server/contractValidation.ts` (ajv) and
`services/spine/lib/event_contract.rb` (json_schemer) — same idea, two languages.

## One thing this doesn't structurally guarantee

`name` + `schemaVersion` together identify exactly which payload schema applies —
both are required envelope fields, and `payload`'s own description says as much
("validated against `payloads/<name>.v<schemaVersion>.json>`"). But the envelope
schema doesn't express that link structurally (no `$ref`/`if`-`then`/`oneOf` keyed off
`name`); `payload` is typed as a bare `{"type": "object"}`. Both receivers
(`contractValidation.ts`, `event_contract.rb`) enforce the pairing by hand, the same
way, as a two-step lookup — by convention, not by a shared mechanism. Worth knowing if
either implementation ever drifts from the other.

## History: where the original strictness came from

Useful context for reading `notes/DESIGN-event-contract-v0.md`'s Decision 5 generously
rather than assuming more deliberation went into it than actually did: the *principle*
("fail loudly on an unknown kind or version") is Jess's, reaffirmed explicitly in her
round-1 commentary. The *mechanism* — `additionalProperties: false` applied uniformly to
the envelope **and** every payload, with no distinction between "unknown event
name/version" and "unknown field inside an otherwise-valid, known-version payload" —
was the implementing agent's generalization, introduced in the first commit that wrote
the schemas (`9e3ca60`) and never revisited until this doc. The "a new envelope field is
a version bump old readers reject loudly" framing specifically (independently correct,
per the reasoning above) was also the agent's, drafted while resolving the `visibility`
and `scope` decisions (`524fd9a`, `352201f`) — Jess reviewed and accepted the resulting
doc, but hadn't examined that specific reasoning until asking about it directly, which
is what produced this doc.

## Follow-up work

- [ ] Implement warn-on-unknown-properties logging in `contractValidation.ts` (Tabletop)
  and `event_contract.rb` (Spine).
- [ ] Create an owner for the contract schemas (`owners/`) to hold these principles and
  review future changes to `contracts/` against them.
