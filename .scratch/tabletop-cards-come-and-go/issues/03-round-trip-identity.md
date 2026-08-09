# Round-trip identity and today's actual boundary behavior

Mountain: tabletop-replaces-mural
Ship: fleet
Type: research
Status: needs-triage

## Question

Facts the other tickets' decisions want, all answerable by reading this repo:

1. **Re-play after return.** The Tabletop dedups card arrivals on `meta.instanceId`
   (`GameState.ts:192`: "stable across requests once assigned (the Tabletop dedups on
   it)"). When a card returns to the Shuffler (Reveal zone) and is later played again:
   does it keep the same instanceId, and would the Tabletop's dedup silently swallow the
   second arrival? Trace `cardArrival.ts` and the Shuffler's instanceId assignment.
2. **Restart today.** The decision is "restart/new game clears the table entirely, same
   table name." What actually happens now — does the Tabletop clear old cards and
   furniture on the Shuffler's start/restart push, or do they linger? Trace the
   start/restart path end to end.
3. **The boundary inventory.** Sweep `GameState.ts` for every transition into or out of
   the `Table` location. Charting believes the complete list is: play and discard (in),
   undo-of-play and undo-of-discard (out, currently pushed nowhere). Confirm or extend —
   any other action that moves a card to or from `Table`?

## Answer

_(research pending)_
