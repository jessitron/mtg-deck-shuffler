# Show the deck name with the player name above the playmat

Mountain: tabletop-replaces-mural
Type: grilling
Status: open

## Question

`TODO.md`'s `seat-label-deck-name` line: "have the player name include the deck name,
above the playmat on the Tabletop." Does `seat.joined` already carry a deck name
end-to-end the way it carries `playmatImageUrl`/`cardBackImageUrl` (per
`linear-wind-down` cluster 07's finding that transport), or does this need a new field
threaded from the Shuffler's prep screen through to `seatJoined.ts`? That's the open
question — the label rendering itself, once the data exists, is small.

Unblocked — no dependency on the other tickets in this map.
