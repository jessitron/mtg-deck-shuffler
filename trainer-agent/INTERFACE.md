# Working with the Trainer Agent

> **Interface version: 2.0** — this document IS the spec for that version. The
> running service advertises the same version on every response
> (`X-Trainer-Agent-Interface-Version`); this doc and the service are bumped
> together. See [Versioning](#versioning) and [Changelog](#changelog).

**This is the single file you copy into another repo to learn how to work with
the Trainer Agent.** It defines three interfaces at once:

1. **Conceptual** — what the Trainer Agent is _for_, so an agent on the other
   side can reason about what we're doing together. ([What this is](#what-this-is))
2. **Collaboration** — how to ask for _changes to the Trainer Agent itself_, by
   filing development requests in Linear. ([Requesting development](#requesting-development-the-collaboration-interface))
3. **Technical** — how to _call_ the running agent over HTTP and render its
   replies. ([Calling the agent](#calling-the-agent-the-technical-interface)), and how to test your integration.

> **This doc is meant for Jessitron's projects.** The collaboration interface
> assumes you track work in the shared Linear workspace (`honeycombio`) and can
> file into the `jessitron` team. The technical interface works for anyone with
> the endpoint and a token, but the "request development" half is a convention
> between sibling projects, not a public API.

---

## What this is

**The North Star: apps that improve themselves from within.** From inside an app,
a person chats with a coding agent about how they want the app to change — and the
agent opens PRs against that very app. The Trainer Agent is the agent that grants
one app (`jessitron/mtg-deck-shuffler`) that superpower.

Concretely, the Trainer Agent is a **single-purpose coding agent**. You chat with
it on behalf of a human; it gathers a coding task, implements it on a branch of
**one** repo (`jessitron/mtg-deck-shuffler`), and opens a PR. You call it **once
per user message** (synchronous request/response) and show its `reply` in your
chat UI. There is **one agent loop** — no separate chat vs. code modes. If it
needs information at any point, even mid-coding, it returns a question instead of
finishing; the next call resumes with its working tree intact.

State (the conversation _and_ the cloned working tree) lives **server-side**,
keyed by the `session_id` you send — so you never resend history. Sessions are
short-lived; it's acceptable for a session to expire between turns, and when that
happens the agent makes it visible in both the chat reply and telemetry rather
than failing silently.

**What "good" looks like** (so you can set expectations with your human):

- **Honest** — confusion or a timed-out session shows up as a distinct `status`
  (`asking` / `error`) in chat _and_ as a marked span in Honeycomb. Never silent.
- **Responsive** — chatting turns return in seconds.
- **PRs land within ~15 minutes**, usually. A coding turn can take minutes.
- **PRs are merge-worthy** — good enough to accept, not just to open.

**Boundaries worth knowing:** one target repo, one PR per session,
request/response only (no streaming). Observability is first-class — the whole
call path is one trace.

### What your repo provides: the agent's brief

The Trainer Agent learns **what you want of it** from a file **in your repo**, not
from this spec. On the first message of a session it clones your repo and reads:

```
trainer-agent/instructions.md
```

That file is your standing brief — what the agent should do each turn, your
conventions, and any helper scripts it should run (put those alongside it in
`trainer-agent/`, e.g. `trainer-agent/cards.sh`, and point at them from the
instructions). You own it and change it on your own schedule, in your own PRs — no
Trainer-Agent deploy required. **If it's missing or empty, the agent returns
`status: error` rather than guessing.** This is the division of labor: _this_ doc
defines how to **call** the agent and use its tools; **your** `instructions.md`
defines the **work**.

The agent can also push back on its own inputs: when it needs something it can't
get (say, the deck's strategy in the request), it may **open a GitHub issue on
your repo** describing what it needs. Treat those as requests to improve the brief
or the `state` you send.

---

## Requesting development (the collaboration interface)

When you want the **Trainer Agent itself** to change — a new capability, a bug
fix, a contract change in _this_ repo (`small-coding-agent`), not in your app —
you don't open a PR here and you don't change this doc. You **file a development
request in Linear**, and the work gets picked up from there.

**Coordinates:**

|           |                                                                                                |
| --------- | ---------------------------------------------------------------------------------------------- |
| Workspace | `honeycombio`                                                                                  |
| Team      | `jessitron`                                                                                    |
| Project   | [`small-coding-agent`](https://linear.app/honeycombio/project/small-coding-agent-7218aea8c221) |

Both `mtg-deck-shuffler` and `small-coding-agent` track work in the same Linear
team, **so the two agents can file issues for each other.** This is the channel
for "I'm working in the app and I need the Trainer Agent to do X."

---

## Calling the agent (the technical interface)

Everything below is the wire contract. You need HTTPS + a bearer token to _call_
it; you need AWS access once, to _fetch_ the token.

### Endpoint

```
POST https://3zpl56dwi54putsdjtecwnyqim0sdjmh.lambda-url.us-west-2.on.aws/
```

Public HTTPS endpoint (a Lambda Function URL). Auth is a **shared bearer token** —
nothing else gates it, so keep the token secret.

### Authentication

Send the shared secret as a bearer token:

```
Authorization: Bearer <TRAINER_AGENT_TOKEN>
```

A missing/wrong token gets `401 {"error":"unauthorized"}`.

**Fetching the token.** It lives in AWS Secrets Manager in the trainer-agent's
sandbox account. If you have AWS access, the exact `aws secretsmanager
get-secret-value` command (account, profile, region, secret id) is in the
trainer-agent repo's
[`notes/infrastructure.md`](https://github.com/jessitron/small-coding-agent/blob/main/notes/infrastructure.md);
otherwise ask Jessitron. Put the result in your app's config as a **secret / env
var** (e.g. `TRAINER_AGENT_TOKEN`) — **do not commit it**. Re-run if the secret is
rotated.

### Request

Headers:

`Content-Type: application/json`
`X-Trainer-Agent-Interface-Version: 2.0`
`traceparent: ...`

Body:

```json
{
  "message": "the user's chat message",
  "session_id": "a-stable-id-at-least-33-characters-long",
  "seq": 1,
  "state": { "...your app-defined game state..." }
}
```

- **`message`** — the user's text for this turn.
- **`session_id`** — **required, ≥ 33 characters.** Generate one per chat session
  (e.g. `"mtg-deck-shuffler-" + uuid4()`) and **reuse it for every message in that
  conversation.** It keeps the agent's microVM warm and its cloned working tree
  intact across turns. A new id = a fresh conversation. Too short / missing →
  `400 {"error":"session_id required (>= 33 chars)"}`.
- **`seq`** — the **1-based number of this user message in the session** (`1` for
  the first message, `2` for the second, …). The agent checks it against the turns
  it has actually handled; a mismatch means the session expired and the game state
  is gone, so the agent returns `status: error` asking the user to start a new
  conversation (see [Response](#response)). **Send it** so lost context is caught
  honestly instead of the agent acting on a deck it can no longer see.
- **`state`** — the **current game state**, an object **you define**. The agent
  passes it into its reasoning each turn; its shape is described by _your_
  `trainer-agent/instructions.md`, not by this spec. Send it fresh each turn — the
  agent persists only its own conversation, not your game. Omit it only if your
  `instructions.md` says the agent doesn't need it.

### Response

`200` with the agent's JSON:

```json
{
  "reply": "text to show the user in chat",
  "status": "chatting | coding | asking | done | error",
  "pr_url": "https://github.com/jessitron/mtg-deck-shuffler/pull/123"
}
```

- **`reply`** — show this in the chat UI.
- **`status`** — `chatting`/`asking` (talking or wants info — keep the
  conversation going), `coding` (working), `done` (finished this task),
  `error` (something failed; `reply` explains). A **lost session** (the `seq`
  didn't line up, or the microVM expired and the game state is gone) comes back as
  `error` with a `reply` telling the user to start a new conversation — mint a new
  `session_id` and reset `seq` to `1`.
- **`pr_url`** — present only once a PR exists. Link it in the UI.

### Errors

| HTTP | Body                                             | Meaning                    |
| ---- | ------------------------------------------------ | -------------------------- |
| 400  | `{"error":"invalid JSON body"}`                  | body wasn't valid JSON     |
| 400  | `{"error":"session_id required (>= 33 chars)"}`  | missing/short `session_id` |
| 401  | `{"error":"unauthorized"}`                       | missing/wrong bearer token |
| 502  | `{"error":"agent invoke failed","detail":"..."}` | the agent runtime failed   |

### Timeouts — set a long read timeout

This is **synchronous**: the HTTP call stays open until the agent finishes the
turn. Chat turns return in seconds, but a **coding turn can take minutes**. Set
your HTTP client's read timeout to **at least 300 seconds** (the agent's current
cap). If a call times out, retry with the **same `session_id`** — the conversation
and working tree are intact, so you resume rather than restart.

### Trace propagation (recommended)

The agent is fully traced in Honeycomb (team `modernity`). If your app uses
OpenTelemetry, **inject W3C trace context** so your app, the front door, and the
agent appear as **one trace**. Inject your current context into the outgoing
request headers — standard `traceparent` over HTTP is all the front door needs:

- The front door reads `traceparent` from the request headers.
- It forwards context onward; the agent's spans join your trace automatically.

No extra body fields are required — the `traceparent` **header** is enough.

### A minimal chat loop

1. On a new conversation, mint a `session_id` (≥33 chars), keep it, and start a
   `seq` counter at `1`.
2. For each user message: `POST` with that `session_id`, the current `seq`, and
   the current `state`; render `reply`; increment `seq` for the next message.
3. While `status` is `chatting`/`asking`/`coding`, keep letting the user reply.
4. When `pr_url` appears, surface the PR link. `status: done` ends the task.
5. On `status: error` for a lost session, start over at step 1 (new `session_id`,
   `seq` back to `1`).

### Examples

#### curl

```bash
curl -sS -XPOST "https://3zpl56dwi54putsdjtecwnyqim0sdjmh.lambda-url.us-west-2.on.aws/" \
  -H "Authorization: Bearer $TRAINER_AGENT_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'X-Trainer-Agent-Interface-Version: 2.0' \
  -d '{"message":"Add a shuffle-animation toggle to the deck view","session_id":"mtg-deck-shuffler-3f9c1e6a-2b7d-4a55-9e21-abc123def456","seq":1,"state":{"deck_id":"boros-aggro","hand":["Mountain","Boros Charm"]}}'
```

### Local testing — the stub

For local and CI testing you don't want the real agent (its latency, AWS, or a PR
on every run). Run the **front-door stub**: a stand-in that enforces the
same request contract as production (as much as it can) but returns **canned** replies. Point your integration tests at it.

The stub is a multi-arch (amd64+arm64) Docker image in **private ECR**:

```
414852377253.dkr.ecr.us-west-2.amazonaws.com/trainer-agent-frontdoor-stub:latest
```

(`latest` tracks the current interface version; images are also tagged by git
sha. Built from the trainer-agent repo's `frontdoor/`.)

**Pull + run it** (needs AWS access to the same account you used to fetch the
token):

```bash
aws ecr get-login-password --profile sandbox --region us-west-2 \
  | docker login --username AWS --password-stdin 414852377253.dkr.ecr.us-west-2.amazonaws.com

docker run -p 8080:8080 -e STUB_BEARER=test-token \
  414852377253.dkr.ecr.us-west-2.amazonaws.com/trainer-agent-frontdoor-stub:latest
```

Now hit `http://localhost:8080/` exactly as you would the real endpoint, using
`test-token` as the bearer. Health check: `GET /ping`.

#### Getting traces out of the stub (optional)

The stub is **OpenTelemetry-instrumented**, just like the real front door: each
request emits a `frontdoor-stub.invocation` span carrying `stub.faking=true` (so
it's unmistakable in Honeycomb that this is the fake, not the real agent), plus
`agent.message`/`agent.status`/`agent.reply`/`pr.url`, and it **joins your trace**
via the `traceparent` header — so your app, the stub, and your handling of the
reply land in one trace, mirroring the prod call path.

It uses the **standard `OTEL_*` env vars** for export. **With none set the tracer
is a no-op** (the stub still runs and `/ping` still works — you don't need a
collector). To send spans somewhere, pass them through `-e` on `docker run`:

```bash
docker run -p 8080:8080 -e STUB_BEARER=test-token \
  -e OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf \
  -e OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://api.honeycomb.io/v1/traces \
  -e 'OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=<YOUR_INGEST_KEY>' \
  -e OTEL_SERVICE_NAME=trainer-agent-frontdoor-stub \
  414852377253.dkr.ecr.us-west-2.amazonaws.com/trainer-agent-frontdoor-stub:latest
```

- **`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`** (or the broader
  `OTEL_EXPORTER_OTLP_ENDPOINT`) — where to send spans. Point it at your own OTel
  collector, or straight at Honeycomb as above. **Setting one of these is what
  turns the tracer on.**
- **`OTEL_EXPORTER_OTLP_PROTOCOL`** — the stub exports OTLP over **HTTP**, so use
  `http/protobuf` (and an HTTP `/v1/traces` endpoint).
- **`OTEL_EXPORTER_OTLP_HEADERS`** — auth for your backend (e.g. a Honeycomb
  ingest key). **Secret — don't commit it.**
- **`OTEL_SERVICE_NAME`** — defaults to `trainer-agent-frontdoor-stub` (its own
  dataset); override if you want the stub's spans under your app's service.

**What it enforces (real) vs. fakes:**

- **Enforces — same rules as prod**: bearer auth → `401`; non-JSON body → `400`;
  `session_id` < 33 chars → `400`; sets the `X-Trainer-Agent-Interface-Version`
  response header. So your auth, request shape, and version handling get genuinely
  tested.
- **Fakes — the reply**: no real agent, no AWS, no PR. `status` is driven by the
  message text so you can exercise each branch of your UI:

  | message contains            | canned response                              |
  | --------------------------- | -------------------------------------------- |
  | `open the pr` / `pr please` | `{ "status": "done", "pr_url": "…/pull/0" }` |
  | `ask`                       | `{ "status": "asking" }`                     |
  | `error` / `fail`            | `{ "status": "error" }`                      |
  | anything else               | `{ "status": "chatting" }`                   |

- **Bearer**: set `STUB_BEARER` to whatever your tests use (default `stub-token`).
  This is a test token — **not** the real production secret.

---

## Versioning

This whole document is versioned `MAJOR.MINOR` (currently **2.0**) — **the version
covers expectations, not just the wire bytes.** A change to what a consumer should
_expect_ — the conceptual framing, the collaboration convention, _or_ the
technical contract — is a version bump. MAJOR when the change could confuse or
break someone who built against the old version; MINOR for an addition that
doesn't invalidate what they already understood. The doc and the running service
bump together — this doc is the spec for the version it names at the top.

(The runtime can only enforce the _technical_ half — that's what the
`X-Trainer-Agent-Interface-Version` header below carries. The conceptual and
collaboration changes ride the same number so that one version describes one
coherent set of expectations.)

- **The service advertises its version** on every response:
  `X-Trainer-Agent-Interface-Version: 2.0`.
- **You should declare yours** by sending the same header on each **request**, set
  to the version you built against.
- **A mismatch is a warning, not an error.** The front door never rejects a
  request over version; it records _both_ versions on its trace span
  (`frontdoor.interface_version` = the service's,
  `frontdoor.client_interface_version` = yours). Drift is caught in Honeycomb, not
  at runtime. Sending the header is how you make that signal useful — if you omit
  it, the client version logs as `unset`.

**Consumers pin by copying this doc.** Copy `INTERFACE.md` into your repo; its git
history then records the version you integrate against, and the spec travels with
you. When you want the contract to change, that's a
[development request](#requesting-development-the-collaboration-interface), not a
local edit.

## Changelog

- **2.0** (2026-06-25) — the agent grew up from the "hi" stub into a real coding
  agent (the chat→PR loop). Breaking, hence MAJOR:
  - **Request gains `seq`** (1-based per-message counter) — the agent rejects a
    mismatched `seq` as a lost session (`status: error`), so expired context is
    caught honestly instead of acted on.
  - **Request gains `state`** — your app-defined game state, passed into the
    agent's reasoning each turn (shape defined by your `trainer-agent/instructions.md`).
  - **New consumer obligation:** your repo must contain
    `trainer-agent/instructions.md` (the agent's brief); missing/empty → `error`.
  - **New:** the agent may open a **GitHub issue on your repo** to request better
    inputs.
  - Unchanged: bearer auth, the Function URL, `{reply, status, pr_url?}`,
    `traceparent` propagation, and the version header.
- **1.0** (2026-06-25) — initial interface. The conceptual, collaboration, and
  technical interfaces in one spec. Wire contract: `POST` `{message, session_id}` +
  bearer auth over the Function URL; response `{reply, status, pr_url?}`; optional
  `traceparent` for trace propagation; `X-Trainer-Agent-Interface-Version` on
  requests (client) and responses (service).
