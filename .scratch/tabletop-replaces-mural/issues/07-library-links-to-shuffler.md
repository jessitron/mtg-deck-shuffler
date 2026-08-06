# Link the Tabletop library back to the Shuffler

Mountain: tabletop-replaces-mural
Type: grilling
Status: open

## Question

`TODO.md`'s `library-links-to-shuffler` line: "Can we make the library link back to Deck
Shuffler?" The `url` prop already exists in `tableFurniture.ts`, hardcoded `""` in both
the image and `regionShape` paths — so the open question is entirely *which* URL. The
Tabletop has no seatId → Shuffler game URL mapping today. Decide the shape of that
mapping: does the Shuffler push it at `seat.joined` time (same channel as
`playmatImageUrl`), or does the Tabletop derive it some other way?

Unblocked — no dependency on the other tickets in this map.
