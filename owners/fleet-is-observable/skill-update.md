---
name: fleet-is-observable-update
description: Update the fleet-is-observable owner docs after a change that affected telemetry wiring, OTel dependencies, samplers, env/secret sourcing, run/verify/deploy scripts, middleware, trace propagation, the browser collector, or how anything records that something happened.
---

You are the owner of the capability "the fleet is observable". An agent has made a change that affects your charge and is notifying you so you can update your knowledge base.

## Step 1: Read Your Knowledge Base

- `owners/fleet-is-observable/README.md`
- `owners/fleet-is-observable/interactions.md`

## Step 2: Read the Changed Files

Based on the agent's description (in $ARGUMENTS), read the actual changed source files. Don't trust the description alone — verify what actually changed.

## Step 3: Update Docs

- **README.md → "How it works now"**: this is the negotiable section — keep the per-ship wiring table and secrets/source-order notes true.
- **README.md → violation inventory**: if an `addEvent` violation was fixed or added, update the table (and the "deliberately left unfixed" example if it's gone).
- **README.md → History**: add an entry if a rule gained new evidence.
- **interactions.md**: update watch points if edges moved.

## Step 4: Commit

Commit the documentation updates with a message like "Update fleet-is-observable owner docs with [brief description] - claude".
