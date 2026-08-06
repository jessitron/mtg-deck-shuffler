# Agent Notes

Gotchas learned the hard way while working in this repo. Append as you learn; delete
entries that stop being true or that are just pointless. Things that belong in `CLAUDE.md` (standing instructions,
commands, layout) go there instead — this file is for the "oh, _that's_ why" findings.

## Tabletop gotchas (apps/tabletop)

- **tldraw is pinned exactly** (5.2.5 line, no caret): `room.updateStore` (server-side
  shape injection) is a young API, verified in `test/updateStore.test.ts`. Don't let a
  routine dependency bump float it.
- **Ports**: dev/prod server 5180, `verify.sh` runs its own on 5183. The Shuffler's
  tests use 3344/3001, the Spine 4600 — keep them distinct.
- **Rooms are in-memory**: restarting the server (or redeploying — `Recreate`, one
  replica) wipes every board. Not a bug in v0; durable reconstruction is a tracked buoy.
