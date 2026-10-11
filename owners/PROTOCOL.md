# Consulting an owner

An owner is a knowledge base in `owners/<slug>/` plus three instruction files —
`context.md`, `review.md`, `update.md` — that a subagent follows. Owners are not skills:
you consult one by spawning a fresh subagent with the Agent tool and pointing it at the
right instruction file. The Task Implementation Process in `CLAUDE.md` says when.

## The rules for every consult

- **Spawn a fresh agent, never a fork.** `subagent_type: "general-purpose"`. A fork inherits
  your conversation and can only agree with the plan it watched you form; a fresh agent
  starts from the KB and your brief, so it can disagree. That independence is the point.
- **The brief is self-contained.** The owner has none of your conversation. Give it the
  actual plan, the actual `file:line` list, the actual question.
- **Point at a plan file instead of re-typing the plan.** For anything over a one-liner,
  write `.scratch/<feature>/plan.md` and brief each owner with "read `<path>`, here's my
  question for you." Every owner reads the same words, and `update` gets the same file.
- **Don't pre-argue your conclusion.** Ask the question; don't hand over the answer you want.
- **Wait for the verdict.** A review gates implementation. Don't start building while the
  owner is still reading.
- **Several owners in one message.** Independent consults go out in parallel.

## The prompts

Replace `<slug>` and the brief. Keep the first line as written — it's what makes the agent
act as the owner rather than as a helper.

**Context** — research, before or during planning:

```
You are the <slug> owner. Follow owners/<slug>/context.md.
Your brief: <the task, and the specific question you need answered>
```

**Review** — on the plan, before implementing. Choose the owners with the router below.

```
You are the <slug> owner. Follow owners/<slug>/review.md.
Your brief: read <plan path>. <the router's question for this owner>
```

**Update** — after the change lands, for each owner that reviewed it or whose files it touched.
The update agent commits its own KB edits, so run it from the tree the change landed in.

```
You are the <slug> owner. Follow owners/<slug>/update.md.
Your brief: <plan path, the commit sha(s), and what actually landed — including where it
differed from the plan>
```

**Router** — the owner-owner. Run it once per plan, before the reviews:

```
You are the owner router. Follow owners/router.md.
Your brief: read <plan path>. <which ship(s) the change touches>
```

Spawn every owner it names with that owner's question. Read its "skipped" list: if you know
something it didn't, overrule it and consult that owner too.

## Creating an owner

`seamapping:create-owner` judges whether one is warranted and writes the KB. An owner needs
`README.md`, `context.md`, `review.md`, `update.md`, and a line in `INDEX.md`.
