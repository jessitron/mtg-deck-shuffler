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

## `card.played-face-down.v1` — concealment as its own event kind, built (ticket 03, 2026-08-21)

`contracts/payloads/card.played-face-down.v1.json` (landed by card-played-face-down
ticket 01, built against by ticket 03) is field-for-field identical to
`card.played.v1.json` — same `card`/`face`/`zoneHint`/`frontImageUrl`/`backImageUrl`/
`cardName`/`owner`/`isCommander`/`gameCardIndex` — but is a **separate event kind**
(`name: "card.played-face-down"`), not a `faceDown` boolean bolted onto `card.played`.
Rationale (per spec.md): concealment changes what a receiver should *do* with the
payload ("mint this concealed" vs "mint this revealed"), which reads better as a
different event name than a field a naive consumer could ignore. The two schemas are
deliberately free to diverge later without a retroactive version bump on either.

On the Shuffler side: `CardPlayedFaceDownPayload`/`buildCardPlayedFaceDownEvent` in
`apps/shuffler/src/port-tabletop/types.ts` are a **deliberate duplicate** of
`CardPlayedPayload`/`buildCardPlayedEvent`, except for `name` (`card.played-face-down`)
and `origin` (`shuffler.playCardFaceDownSubmit`). The face/image computation
(`face`/`frontImageUrl`/`backImageUrl`, including the `twoFaced`-gate on `backImageUrl`
— the sharp edge tabletop.md's watch points already document) is factored into one
shared private helper, `cardFaceFields(gameCard)`, called by both builders — so that
invariant lives in one place even though the two builders themselves stay separate,
divergeable functions. `sendCardPlayedToSpineBestEffort`
(`apps/shuffler/src/port-spine/sendToSpine.ts`) picks the builder via a trailing
`faceDown = false` parameter, threaded from `POST /play-card`'s
`req.body["face-down"] === "true"` (`apps/shuffler/src/app.ts`).

**No consumer on the Tabletop/Spine side yet** — this ticket is Shuffler-only. A future
ticket that makes the Tabletop or Spine *do* something with `card.played-face-down`
should apply the same `cardFaceFields`-equivalent question this schema's description
already answers: it's the same facts as `card.played`, meaning "mint concealed."