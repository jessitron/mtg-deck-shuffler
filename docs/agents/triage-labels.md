# Triage Labels

This repo's tracker uses five canonical triage roles. This file names the actual label strings
used in this repo's issue tracker.

This repo's tracker is local markdown (`docs/agents/issue-tracker.md`), so a "label" is the
value of the `Status:` line in the issue file — e.g. `Status: ready-for-agent`.

| Label             | Meaning                                  |
| ------------------ | ---------------------------------------- |
| `needs-triage`     | Maintainer needs to evaluate this issue  |
| `needs-info`       | Waiting on reporter for more information |
| `ready-for-agent`  | Fully specified, ready for an AFK agent  |
| `ready-for-human`  | Requires human implementation            |
| `wontfix`          | Will not be actioned                     |

Write the matching string into the issue's `Status:` line as a ticket moves through these roles.

### Terminal status: `resolved`

The five roles above are all pre-implementation — they describe a ticket on its way to being
worked, not what happens after. When an issue's work has landed, set `Status: resolved`.
`wontfix` remains the separate terminal state for tickets closed without being done.

Edit the table above to match whatever vocabulary you actually use.
