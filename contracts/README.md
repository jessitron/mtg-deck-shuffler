# contracts/ — the fleet's published language

This documents events flowing between the Spine and each other ship.

Events are published to the Spine with a POST. Events are received from the Spine by SSE (server-sent events) subscription.

Constraints:

1. Components (ships) are deployed at different times. Events need to be backwards-compatible at a scale of hours.
2. Games might be interrupted and finished later. Logs need to be readable on a scale of days.

These are short time-frames, so we're not looking at infinite backwards-compatibility here. We can be nice.

## Versioning

The envelope is versioned, and expected to advance very rarely.

Each event name-payload combination is versioned separately, and expected to advance whenever useful.

Add optional field: no version bump

Add or remove a required field: version bump

Change the type of a field (eg, one commander to an array of commanders): version bump

Semantic change: at least a version bump, consider a new event type.

## Files

envelope: ...

payloads: ...

Related validation code:

- apps/tabletop/src/server/contractValidation.ts
- services/spine/lib/event_contract.rb

## Examples of events

These are sent from Spine to the other ships over the event stream. Most of these are planned, and not fleshed out yet. This is not a complete list!

- seat.joined (this one might be an API call the first time a seat is joined, but it'll be reproduced if we use the Spine for tabletop persistence, which is my current plan)
- card.played. Initiator: shuffler
- card.discarded Initiator: shuffler
- card.returned Initiator: tabletop or shuffler

### Events not covered by these contracts

Events that the Spine records but doesn't send over the wire, it can do what it wants. Table creation belongs in the event log, but re-enacting it is an API call to the tabletop, not an event.

## Common payload components worth documenting

### Card Identity

How a card is serialized in any event payload, ever:

- **Face is card state, not identity** — but it matters at play time (MDFCs are
  played as a chosen face), so events about playing/revealing a card carry
  `face` alongside identity. The Shuffler already tracks `currentFace`; it must
  send it.
- Names and image URLs are _derivable conveniences_, not identity. The first version of this will carry from Shuffler to Tabletop everything the tabletop needs to display the card, eg `imageUrl`, for rendering without a Scryfall lookup. Someday we'll get the Tabletop to look up the definitions based on the ID, but this is not that day.

**Identity of cards has two levels** : the _definition_ and the _instance_.

- **The Scryfall ID identifies the card definition.** It captures the exact printing: oracle identity,
  all faces, all names (oracle name and the vanity/flavor name), all image URIs.
- **Instance** — `cardInstanceId`: _this particular Forest_, the way a physical deck
  has one. This is currently a GUID minted by the Shuffler, but actually, I'd rather it were gameCardIndexGame-mechanically two Forests are equivalent; log-wise they are
  distinct individuals, so a single card can be followed through played → tapped →
  sacrificed → graveyard
