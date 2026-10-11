# The Table

A polyglot monorepo for playing Magic together, remotely, at a table the system can see.

The fleet map — North Star, Mountains, Safe Harbor — is in [SEAMAP.md](SEAMAP.md).
Architecture, context boundaries and invariants are in [notes/fleet-domain-map.html](notes/fleet-domain-map.html).
The full vision is in [notes/DESIGN-the-table-vision.md](notes/DESIGN-the-table-vision.md).

## The ships

- [Shuffler](apps/shuffler/): your library and hand
- [Tabletop](apps/tabletop/): the shared tldraw canvas where play happens
- [Spine](services/spine/): tables, seats, the event log

All three are deployed. Each has its own `README.md` and `SEAMAP.md`.

**Play: https://mtg.jessitron.honeydemo.io**

## Working in here

npm workspaces, so `npm install` at the root installs everything and
`package-lock.json` lives at the root.

```bash
npm install          # from the root
npm run build        # pass-through to the Shuffler
npm test             # pass-through to the Shuffler
```

```bash
./run                # the whole fleet: Tabletop :5180, Shuffler :3344, Spine :4600
./deploy.sh          # deploy all three ships
```

Running, verifying or deploying one ship happens from its own directory; see its README.
[notes/](notes/) holds fleet-wide design docs and vocabulary; [owners/](owners/) holds the
feature-owner knowledge bases.
