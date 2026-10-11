# Domain Docs

How the engineering skills should consume this repo's domain documentation.

Read **`notes/fleet-domain-map.html`** first: the bounded contexts, what crosses each border,
the translations between ships, and the invariants. `notes/GLOSSARY.md` holds card-identity and
naming terms the map doesn't.

`contracts/` is the fleet's **published language**. Where a term appears there, the contract is
authoritative over any prose.

When your output names a domain concept (an issue title, a refactor, a test name), use the map's
or the glossary's word. If the concept isn't there, either you're inventing language the project
doesn't use (reconsider) or there's a real gap (add it). When a term means different things in two
ships, add a row to the map's "Translations at the borders" table.
