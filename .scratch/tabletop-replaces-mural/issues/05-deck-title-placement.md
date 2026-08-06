# Move the deck title out of the command zone on the game screen

Mountain: tabletop-replaces-mural
Type: task
Status: open

## Question

`TODO.md`'s `deck-title-placement` line: "on the game screen, let's move the title of
the deck out of the command zone; put it above the table button(s), top-aligned with
the hamburger menu." This is the **Shuffler's** game screen
(`formatCommandZoneHtmlFragment`, `src/view/common/shared-components.ts`), not the
Tabletop canvas — despite sharing this Mountain's tag, it doesn't depend on
[Design command-zone geometry](01-command-zone-and-player-area.md), which is the
Tabletop's command zone. Consult `shuffler-looks-like-itself` before moving it, since
this is a layout change on a page that owner watches.

Unblocked — no dependency on the other tickets in this map.
