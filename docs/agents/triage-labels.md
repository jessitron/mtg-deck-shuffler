# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the
actual label strings used in this repo's issue tracker.

This repo's tracker is local markdown (`docs/agents/issue-tracker.md`), so a "label" is the
value of the `Status:` line in the issue file — e.g. `Status: ready-for-agent`. There is no
tracker vocabulary to match, so the canonical names are used unchanged.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), write the corresponding
string from this table into the issue's `Status:` line.

### Terminal status: `resolved`

The five roles above are all pre-implementation — they describe a ticket on its way to being
worked, not what happens after. Neither `/to-tickets` nor `/implement` sets a `Status:` value on
completion; `/wayfinder`'s map/child tickets are the only place a terminal status is documented
(`claimed` → `resolved`, see `issue-tracker.md`'s "Wayfinding operations"). This repo extends that
same `resolved` label to every ticket, not just wayfinder's: when an issue's work has landed, set
`Status: resolved`. `wontfix` remains the separate terminal state for tickets closed without being
done.

Edit the right-hand column to match whatever vocabulary you actually use.
