# Two-Faced Cards — Contract component

How faces appear in the fleet's published language (`notes/DESIGN-event-contract-v0.md`,
JES-128). **Landed** (JES-129, `9e3ca60`): the JSON Schema lives at
`contracts/payloads/card.played.v1.json` — `card: { scryfallId, instanceId }` (both
uuid-format) with a required sibling `face: enum ["front","back"]`. The Spine
(`services/spine/`, Ruby) validates generic ingested events and the `seat.joined` event
minted by its administered `/join` against these schemas via `lib/event_contract.rb`.
Invalid join decoration fails with 422 before persistence or delivery.

## The rule

- **Identity is `card: { scryfallId, instanceId }`.** `scryfallId` is the definition
  (the exact printing, all faces); `instanceId` is *this particular card* in *this
  game* (opaque GUID minted by the Shuffler).
- **`face` is a sibling field, not part of the card reference.** Events about
  playing/revealing a card carry `face: "front" | "back"` beside `card`, because
  MDFCs are played as a chosen face. Events that don't reveal a face don't carry one.
  Its **meaning** shifts once the Tabletop can flip (ticket 02, 2026-08-07): from "which
  face the sender baked into the image" to "**which face is up on arrival**." Same schema,
  same enum — no version bump, because the field was never the picture.
- **`face` ranges over printed sides only** (decided 2026-08-07). The enum is exactly the
  card's physical faces, so `face: "back"` is unreachable for a one-faced card. It is NOT a
  "which side is up" bit, and it does NOT express concealment.
- **Concealment (face-down) is a second, orthogonal axis, and it is not in the contract
  yet.** A card can be face down *while* having a chosen `face` (a two-faced card can be
  played face down). No schema in `contracts/` carries it. When one does, it is a sibling
  concept to `face`, not a third value of it. The Tabletop's own model calls it
  `faceDown: boolean` (ticket 02) — use that name if it ever reaches the contract.

## `card.returned.v1` — the faceless removal event's schema, built

`contracts/payloads/card.returned.v1.json` (shuffler-spine-sse-subscriber ticket 01,
2026-08-20) is the first payload schema to actually build the "faceless removal event"
rule that watch point 19 in [interactions.md](interactions.md) had only decided. Identity
here is `card: { scryfallId }` plus a top-level `gameCardIndex` (the Shuffler's own
decklist rank) and `seat` — not `instanceId`, because the table doesn't mint or track one
and `gameCardIndex` is what the Shuffler looks the card back up by. `fromZone` is an
optional hint.

**`face` is explicitly blacklisted, not merely absent**: `"face": false` in `properties`,
rather than just leaving `face` undeclared under the schema's own `additionalProperties:
true` policy (which passes through every other unknown property). A sender that copies
`card.played`'s shape by habit — the likely mistake, since `card.played` requires `face`
right next to `card` — would otherwise sail through silently; the blacklist turns that
into a validation failure instead. This is a stronger, schema-enforced version of the
"faceless by decision" rule; use the same `"face": false` pattern for any other removal
schema (`undo.card.played.v1`, `undo.card.discarded.v1`) when those get built.

Contract-only so far: `apps/shuffler/test/port-spine/cardReturnedContract.test.ts` proves
the schema (well-formed payload validates, missing `gameCardIndex` rejected, a `face`
field of any value rejected), and `apps/shuffler/test/port-spine/contractValidation.ts`
registers it as `"card.returned:1"`. No sender or subscriber is wired to this schema yet —
that's later tickets in the same series.

## `card.played-face-down.v1` — sibling to `card.played`, for concealed plays (card-played-face-down ticket 01, landed; ticket 02 landed on the Tabletop)

`contracts/payloads/card.played-face-down.v1.json` is a **field-for-field duplicate** of
`card.played.v1.json` — same required fields (`card`, `face`, `zoneHint`,
`frontImageUrl`, `backImageUrl`, `cardName`, `owner`, `isCommander`), same optional
`gameCardIndex`. Only the `name`/`title`/`description` differ. This is a deliberate
**separate event kind, not a `faceDown` flag on `card.played`** (Jess, 2026-08-12: "this
isn't a variant of 'play,' it's a different thing, game-wise"). The two schemas are
independent files by `contracts/README.md`'s "one schema per event kind" policy, free to
diverge later — don't refactor them into one shared schema with a discriminant.

The payload still carries `face` (which printed side is chosen) — concealment and face
stay orthogonal per this owner's two-axis model even for a concealed play: a morph is
played face down *with a chosen face underneath*. `backImageUrl` keeps the same
`twoFaced`-derived-null rule as `card.played` (watch point 17/interactions.md #18).

**Found and fixed a contract bug while landing this**: `envelope.v1.json`'s `name` field
pattern (`^[a-z]+(\.[a-z_]+)+$`) didn't allow hyphens, so the chosen event name
`card.played-face-down` itself failed **envelope** validation (not the payload schema —
the envelope's own `name` pattern). Widened to `^[a-z]+(\.[a-z_-]+)+$` (segment character
class gained `-`). This is a fleet-wide file — affects the Spine's Ruby validation and
both TS apps' ajv validation identically — and is backward compatible (every existing
`name` value, none of which use hyphens, still matches). **Watch point for future event
names**: a hyphenated segment is now legal fleet-wide; if you invent a new event kind
with a hyphen in its name, it will validate fine against the envelope, but you still need
a payload schema for it (the envelope pattern only gates the *name*, not the payload
lookup).

On the Tabletop side (ticket 02, landed): see
[tabletop.md](tabletop.md#card-played-face-down-mints-concealed-at-birth-card-played-face-down-ticket-02).
Ticket 03 (a Shuffler "Play Face Down" button that actually sends this event) has not
landed — today the schema and the Tabletop's receiving side exist, but nothing produces
this event yet.