# 16 — Prep-screen picker v1: playmat swatches and sleeve color

Mountain: tabletop-replaces-mural
Ship: shuffler
Type: task
Status: ready-for-agent
Blocked by: None — can start immediately

**What to build:** On the Shuffler's prep screen, one surface with two fields. **Playmat:**
curated image swatches seeded from the `aeoe-*` art-card images already used as home-page
hero backgrounds, presented in the precon-tile style with the hero-button underline as the
selection signal, defaulting to today's hardcoded mat; the choice flows to the table
through the existing `playmatImageUrl` plumbing, end to end. **Sleeves:** a color picker
plus quick color swatches; the chosen color is captured in the seat's prep state, ready
for ticket 17 to send (picking no sleeve is valid — cards keep the standard Magic back).

No modal, no free-text URL in v1. Phase-2 pickers (image sleeves, custom URLs, two-color
sleeves) are out of scope.

Design source of truth: [09 — sleeve and playmat picker](09-sleeve-and-playmat-picker.md).

User-visible Shuffler work → Playwright verification (pick a playmat, see it on the
table; pick a sleeve color, see it captured).

Consult owners: `shuffler-looks-like-itself` (picker appearance — swatch tiles, selection
signal, color picker styling).

- [ ] Prep screen offers curated playmat swatches, defaulting to the current hardcoded mat
- [ ] A picked playmat renders on that seat's player area on the Tabletop (existing plumbing)
- [ ] Prep screen offers a sleeve color picker plus quick swatches; choosing nothing is valid
- [ ] Chosen sleeve color is held in the seat's prep state where the seat-joined send can reach it
- [ ] Playwright covers the playmat pick end-to-end and the sleeve pick's capture
