# 11 — The Shuffler grows an event inbox

Mountain: tabletop-replaces-mural
Ship: fleet
Status: ready-for-agent

**What to build:** A generic, contracts-enveloped event inbox on the Shuffler, addressed by
the `eventsUrl` delivered per seat. It dispatches on the envelope's `name`, validates
against `contracts/`, and rejects unknown name/version loudly. No guard on the inbox — the
app has no logins, and a capability-URL scheme was considered and rejected. Today it hears
exactly one kind: `card.returned.v1` with `occurredIn: "tabletop"` — on receipt, the Shuffler
maps `card.instanceId → GameCard` itself (there is no existing inbound path addressed by
instanceId) and moves the card to **Revealed**.

This is deliberately generic, not a card-return endpoint: future event kinds arrive without
new plumbing, and the Spine can interpose later by handing out a different `eventsUrl`.

**Blocked by:** 06 (needs `eventsUrl` delivered per seat), 07 (needs `card.returned.v1` to
exist).

- [ ] The Shuffler exposes a POST inbox route at the URL it minted as `eventsUrl`
- [ ] The inbox validates every incoming envelope/payload against `contracts/`; unknown
      name/version rejected loudly
- [ ] The inbox dispatches on `name`; today only `card.returned.v1` is handled
- [ ] On `card.returned.v1` with `occurredIn: "tabletop"`, the Shuffler maps
      `card.instanceId → GameCard` and moves the card to Revealed
- [ ] Handler-seam test: enveloped `card.returned.v1` posted in, card lands in Revealed,
      fed against a fake store (mirrors `cardArrival.test.ts` prior art)
- [ ] Handler-seam test: unknown name/version posted in is rejected loudly
