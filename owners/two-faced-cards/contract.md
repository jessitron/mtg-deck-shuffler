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

Contract-only at first: `apps/shuffler/test/port-spine/cardReturnedContract.test.ts` proves
the schema (well-formed payload validates, missing `gameCardIndex` rejected, a `face`
field of any value rejected), and `apps/shuffler/test/port-spine/contractValidation.ts`
registers it as `"card.returned:1"`.

**Now bidirectional (shuffler-side-exits ticket 07):** `card.returned.v1` is sent
tabletop→shuffler (ticket 12's library portal drag) and, as of this ticket, also
shuffler→tabletop — any transition out of the Shuffler's own Table location (the Return
button, or a future put-in-hand/top/bottom), via `buildCardReturnedEvent` +
`sendCardReturnedToSpineBestEffort` in `apps/shuffler/src/port-tabletop/types.ts` /
`apps/shuffler/src/port-spine/sendToSpine.ts`. Direction is distinguished by the envelope's
`occurredIn`, not by any payload field — a consumer must branch on that, not assume a
direction. The face blacklist (`"face": false`) is unchanged, and the new send carries no
face fields, consistent with the faceless-removal rule. The schema gained one field for
this: `card.instanceId` (optional) — the Shuffler always has it for a Table card and now
sends it so the Tabletop can find the matching shape to remove by its `instanceId` prop; a
tabletop-initiated send may still omit it. No `CardDefinition`/`CardFace`/persistence
changes.

## `card.discarded.v1` — the graveyard event's own schema, built (cards-come-and-go ticket 08, 2026-08-23)

`contracts/payloads/card.discarded.v1.json` is `card.played.v1`'s shape **minus
`zoneHint`** — graveyard *is* this event's meaning, so there's nothing left to hint at.
Required: `card`, `face`, `frontImageUrl`, `backImageUrl`, `cardName`, `owner`,
`isCommander`; optional `gameCardIndex` — same fields, same rules, as `card.played.v1`
(watch point 17/interactions.md #18 for the `backImageUrl`-derived-from-`twoFaced` rule).
It **keeps `face`**, unlike `card.returned.v1`: this owner's watch point 19 sorts card
events into face-carrying and faceless by asking "does this event reveal or choose a
face?" — a discard shows the card publicly (to the graveyard, face up), so `face` rides
along the same way it does on `card.played`.

Sender: `buildCardDiscardedEvent` in `apps/shuffler/src/port-tabletop/types.ts`, using the
same `cardFaceFields(gameCard)` private helper `card.played`/`card.played-face-down`
already used (see [interactions.md](interactions.md#watch-points) watch point 25) —
so the face/image computation is not a third copy-paste of the `twoFaced`-gate.
`sendCardDiscardedToSpineBestEffort` (`apps/shuffler/src/port-spine/sendToSpine.ts`)
sends it best-effort, mirroring `sendCardPlayedToSpineBestEffort`. Two call sites in
`apps/shuffler/src/app.ts` switched to it: `POST /discard-card/:gameId/:gameCardIndex`
(discard from hand) and `POST /mill/:gameId` (mill the top library card) — both
previously called `sendCardBeforeMutate(...,"graveyard",...)`, i.e. `card.played` with a
`graveyard` zoneHint.

**Corollary: `card.played.v1.json`'s `zoneHint` enum narrowed** from
`stack | battlefield | graveyard` to `stack | battlefield` — graveyard traffic now only
ever travels as `card.discarded`, never as a `card.played` with a graveyard hint.
`card.played-face-down.v1.json`'s `zoneHint` was narrowed the same way for consistency (a
face-down play was never a discard anyway, so this is cosmetic there, not a behavior
change). No schemaVersion bump on either — zero real consumers of the removed enum value
existed (the same "zero conforming producers/consumers yet" exception used elsewhere in
this file), and narrowing an enum a sender never actually emitted isn't a breaking change
for anyone who validated against it.

Tests: `apps/shuffler/test/port-tabletop/cardDiscardedEvent.test.ts` (envelope shape —
asserts `payload` has **no** `zoneHint` property at all, not just a narrowed one) and
`apps/shuffler/test/port-spine/cardDiscardedContract.test.ts` (schema conformance for
both a directly-built event and the real `sendCardDiscardedToSpineBestEffort` send,
through a joined seat) — mirroring the `card.played` equivalents.

No Tabletop-side receiver yet: nothing in `apps/tabletop/` consumes `card.discarded`
today — this ticket is Shuffler + contract only, same posture `card.played-face-down`
was in after its ticket 02 before ticket 03 landed the sender.

## `card.played-face-down.v1` — concealment as its own event kind, built end to end (card-played-face-down tickets 01–03, all landed 2026-08-21)

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

**Found and fixed a contract bug while landing ticket 02**: `envelope.v1.json`'s `name`
field pattern (`^[a-z]+(\.[a-z_]+)+$`) didn't allow hyphens, so the chosen event name
`card.played-face-down` itself failed **envelope** validation (not the payload schema —
the envelope's own `name` pattern). Widened to `^[a-z]+(\.[a-z_-]+)+$` (segment character
class gained `-`). This is a fleet-wide file — affects the Spine's Ruby validation and
both TS apps' ajv validation identically — and is backward compatible (every existing
`name` value, none of which use hyphens, still matches). **Watch point for future event
names**: a hyphenated segment is now legal fleet-wide; if you invent a new event kind
with a hyphen in its name, it will validate fine against the envelope, but you still need
a payload schema for it (the envelope pattern only gates the *name*, not the payload
lookup).

On the Tabletop side (ticket 02): see
[tabletop.md](tabletop.md#card-played-face-down-mints-concealed-at-birth-card-played-face-down-ticket-02)
— `dispatchSpineEvent`/`applyCardArrival` accept the new name and mint `faceDown: true`.

On the Shuffler side (ticket 03): `CardPlayedFaceDownPayload`/
`buildCardPlayedFaceDownEvent` in `apps/shuffler/src/port-tabletop/types.ts` are a
**deliberate duplicate** of `CardPlayedPayload`/`buildCardPlayedEvent`, except for `name`
(`card.played-face-down`) and `origin` (`shuffler.playCardFaceDownSubmit`). The
face/image computation (`face`/`frontImageUrl`/`backImageUrl`, including the
`twoFaced`-gate on `backImageUrl`) is factored into one shared private helper,
`cardFaceFields(gameCard)`, called by both builders — so that invariant lives in one
place even though the two builders themselves stay separate, divergeable functions.
`sendCardPlayedToSpineBestEffort` (`apps/shuffler/src/port-spine/sendToSpine.ts`) picks
the builder via a trailing `faceDown = false` parameter, threaded from `POST
/play-card`'s `req.body["face-down"] === "true"` (`apps/shuffler/src/app.ts`).

All three tickets landed the same day, in the order 01 → {02, 03 in parallel} — the
"Blocked by: 02" on ticket 03 turned out to be a runtime-delivery concern (an emitted
event the Tabletop couldn't yet parse would silently vanish at the table), not a code
dependency: ticket 03 only builds and sends the envelope, it never validates or consumes
Tabletop code. The full loop (Shuffler button → Spine → Tabletop mint) is live end to
end.
