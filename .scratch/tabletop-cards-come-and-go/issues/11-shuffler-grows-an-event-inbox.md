# 11 — The Shuffler grows an event inbox

Mountain: tabletop-replaces-mural
Ship: fleet
Status: ready-for-agent

**Superseded.** This ticket planned an HTTP POST inbox on the Shuffler, addressed by an
`eventsUrl` minted per seat. That transport was replaced before implementation: the
Shuffler receives `card.returned` (and every other event kind it needs) by opening its
own Spine SSE subscription instead, mirroring the Tabletop's `spineSubscriber.ts` — see
`.scratch/shuffler-spine-sse-subscriber/`, which supersedes this ticket in full (same
outcome: `card.returned.v1` with `occurredIn: "tabletop"` maps `card.instanceId →
GameCard` and moves the card to Revealed). Implement that spec instead of this one.
