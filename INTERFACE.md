# Working with the Trainer Agent

> **Interface version: 1.0** — this document IS the spec for that version. The
> running service advertises the same version on every response
> (`X-Trainer-Agent-Interface-Version`); this doc and the service are bumped
> together. See [Versioning](#versioning) and [Changelog](#changelog).

**This is the single file you copy into another repo to learn how to work with
the Trainer Agent.** It defines three interfaces at once:

1. **Conceptual** — what the Trainer Agent is *for*, so an agent on the other
   side can reason about what we're doing together. ([What this is](#what-this-is))
2. **Collaboration** — how to ask for *changes to the Trainer Agent itself*, by
   filing development requests in Linear. ([Requesting development](#requesting-development-the-collaboration-interface))
3. **Technical** — how to *call* the running agent over HTTP and render its
   replies. ([Calling the agent](#calling-the-agent-the-technical-interface))

These are not the same channel. You **call** the running service to get coding
work done on your app; you **file a Linear issue** when the service itself needs
to grow or change. Keep them straight and both stay healthy.

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

State (the conversation *and* the cloned working tree) lives **server-side**,
keyed by the `session_id` you send — so you never resend history. Sessions are
short-lived; it's acceptable for a session to expire between turns, and when that
happens the agent makes it visible in both the chat reply and telemetry rather
than failing silently.

**What "good" looks like** (so you can set expectations with your human):

- **Honest** — confusion or a timed-out session shows up as a distinct `status`
  (`asking` / `error`) in chat *and* as a marked span in Honeycomb. Never silent.
- **Responsive** — chatting turns return in seconds.
- **PRs land within ~15 minutes**, usually. A coding turn can take minutes.
- **PRs are merge-worthy** — good enough to accept, not just to open.

**Boundaries worth knowing:** one target repo, one PR per session,
request/response only (no streaming). Observability is first-class — the whole
call path is one trace (see [Trace propagation](#trace-propagation-recommended)).

---

## Requesting development (the collaboration interface)

When you want the **Trainer Agent itself** to change — a new capability, a bug
fix, a contract change in *this* repo (`small-coding-agent`), not in your app —
you don't open a PR here and you don't change this doc. You **file a development
request in Linear**, and the work gets picked up from there.

**Coordinates:**

| | |
| --- | --- |
| Workspace | `honeycombio` |
| Team | `jessitron` |
| Project | [`small-coding-agent`](https://linear.app/honeycombio/project/small-coding-agent-7218aea8c221) |

Both `mtg-deck-shuffler` and `small-coding-agent` track work in the same Linear
team, **so the two agents can file issues for each other.** This is the channel
for "I'm working in the app and I need the Trainer Agent to do X."

### How to file one

If you have the Linear MCP tools available (the server prefix varies by install —
`mcp__linear-server__…`, `mcp__claude_ai_Linear__…`, etc.; search the bare
operation name):

```
save_issue  team: "jessitron",
            project: "small-coding-agent",
            title: "<imperative summary>",
            description: "<the body — see below>",
            priority: <0-4 if known>
```

No MCP? File it by hand in the Linear web UI in the same team/project, or ask
Jessitron to. A clear issue is the deliverable either way.

### What makes a good request

This agent (or Jessitron) reads the issue cold and acts on it, so write it to be
acted on without a follow-up conversation:

- **Title** — an imperative one-liner (`"Return a structured error when the clone fails"`).
- **Why** — the user-facing reason. What are you trying to do in your app that
  the current Trainer Agent makes hard or impossible?
- **What you observed** — the concrete behavior today, with a `session_id` or a
  Honeycomb trace link if you have one. (Both ends share Honeycomb team
  `modernity` — a trace link is the strongest possible bug report.)
- **What you want instead** — the change to the contract or behavior. If it
  touches the technical interface below, say so explicitly — that's a
  [version](#versioning) bump and needs coordinating.
- **Search first.** Look for a near-duplicate open issue and add to it rather than
  filing a second one.

---

## Calling the agent (the technical interface)

Everything below is the wire contract. You need HTTPS + a bearer token to *call*
it; you need AWS access once, to *fetch* the token.

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

`Content-Type: application/json`. Body:

```json
{
  "message": "the user's chat message",
  "session_id": "a-stable-id-at-least-33-characters-long"
}
```

- **`message`** — the user's text for this turn.
- **`session_id`** — **required, ≥ 33 characters.** Generate one per chat session
  (e.g. `"mtg-deck-shuffler-" + uuid4()`) and **reuse it for every message in that
  conversation.** It keeps the agent's microVM warm and its cloned working tree
  intact across turns. A new id = a fresh conversation. Too short / missing →
  `400 {"error":"session_id required (>= 33 chars)"}`.

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
  `error` (something failed; `reply` explains).
- **`pr_url`** — present only once a PR exists. Link it in the UI.

### Errors

| HTTP | Body | Meaning |
|------|------|---------|
| 400 | `{"error":"invalid JSON body"}` | body wasn't valid JSON |
| 400 | `{"error":"session_id required (>= 33 chars)"}` | missing/short `session_id` |
| 401 | `{"error":"unauthorized"}` | missing/wrong bearer token |
| 502 | `{"error":"agent invoke failed","detail":"..."}` | the agent runtime failed |

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

1. On a new conversation, mint a `session_id` (≥33 chars) and keep it.
2. For each user message: `POST` with that `session_id`; render `reply`.
3. While `status` is `chatting`/`asking`/`coding`, keep letting the user reply.
4. When `pr_url` appears, surface the PR link. `status: done` ends the task.

### Examples

#### curl

```bash
curl -sS -XPOST "https://3zpl56dwi54putsdjtecwnyqim0sdjmh.lambda-url.us-west-2.on.aws/" \
  -H "Authorization: Bearer $TRAINER_AGENT_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'X-Trainer-Agent-Interface-Version: 1.0' \
  -d '{"message":"Add a shuffle-animation toggle to the deck view","session_id":"mtg-deck-shuffler-3f9c1e6a-2b7d-4a55-9e21-abc123def456"}'
```

#### Python (with OTel propagation)

```python
import os, urllib.request, json
from opentelemetry.propagate import inject  # if you use OTel

URL = "https://3zpl56dwi54putsdjtecwnyqim0sdjmh.lambda-url.us-west-2.on.aws/"

def ask_trainer(message: str, session_id: str) -> dict:
    headers = {
        "Authorization": f"Bearer {os.environ['TRAINER_AGENT_TOKEN']}",
        "Content-Type": "application/json",
        "X-Trainer-Agent-Interface-Version": "1.0",  # the version you built against
    }
    inject(headers)  # adds W3C `traceparent` so the trace continues into the agent
    body = json.dumps({"message": message, "session_id": session_id}).encode()
    req = urllib.request.Request(URL, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=300) as resp:   # long timeout!
        return json.loads(resp.read())
```

(A complete working reference client lives in the trainer-agent repo at
`scripts/propagation_test.py`.)

#### TypeScript / Node (fetch)

```ts
const URL = "https://3zpl56dwi54putsdjtecwnyqim0sdjmh.lambda-url.us-west-2.on.aws/";

async function askTrainer(message: string, sessionId: string) {
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.TRAINER_AGENT_TOKEN}`,
      "Content-Type": "application/json",
      "X-Trainer-Agent-Interface-Version": "1.0", // the version you built against
      // If you use OTel, inject `traceparent` here so the trace continues.
    },
    body: JSON.stringify({ message, session_id: sessionId }),
    signal: AbortSignal.timeout(300_000), // long timeout for coding turns
  });
  if (!res.ok) throw new Error(`trainer agent ${res.status}: ${await res.text()}`);
  return res.json(); // { reply, status, pr_url? }
}
```

### Local testing — the stub

For local and CI testing you don't want the real agent (its latency, AWS, or a PR
on every run). Run the **front-door stub**: a faithful stand-in that enforces the
*same* request contract as production (it shares the validation code, so it can't
drift) but returns **canned** replies. Point your integration tests at it.

The stub is a Docker image in private ECR. With AWS access to the account (the
same access you used to fetch the token), the ECR login + `docker run` commands
(repo URI included) are in the trainer-agent repo's
[`notes/infrastructure.md`](https://github.com/jessitron/small-coding-agent/blob/main/notes/infrastructure.md)
under "Front-door test stub". Run it with `-p 8080:8080 -e STUB_BEARER=test-token`.

Now hit `http://localhost:8080/` exactly as you would the real endpoint, using
`test-token` as the bearer. Health check: `GET /ping`. (Built from the
trainer-agent repo's `frontdoor/`; `latest` tracks the current interface version.)

**What it enforces (real) vs. fakes:**

- **Enforces — same rules as prod**: bearer auth → `401`; non-JSON body → `400`;
  `session_id` < 33 chars → `400`; sets the `X-Trainer-Agent-Interface-Version`
  response header. So your auth, request shape, and version handling get genuinely
  tested.
- **Fakes — the reply**: no real agent, no AWS, no PR. `status` is driven by the
  message text so you can exercise each branch of your UI:

  | message contains | canned response |
  | --- | --- |
  | `open the pr` / `pr please` | `{ "status": "done", "pr_url": "…/pull/0" }` |
  | `ask` | `{ "status": "asking" }` |
  | `error` / `fail` | `{ "status": "error" }` |
  | anything else | `{ "status": "chatting" }` |

- **Bearer**: set `STUB_BEARER` to whatever your tests use (default `stub-token`).
  This is a test token — **not** the real production secret.

---

## Versioning

This whole document is versioned `MAJOR.MINOR` (currently **1.0**) — **the version
covers expectations, not just the wire bytes.** A change to what a consumer should
*expect* — the conceptual framing, the collaboration convention, *or* the
technical contract — is a version bump. MAJOR when the change could confuse or
break someone who built against the old version; MINOR for an addition that
doesn't invalidate what they already understood. The doc and the running service
bump together — this doc is the spec for the version it names at the top.

(The runtime can only enforce the *technical* half — that's what the
`X-Trainer-Agent-Interface-Version` header below carries. The conceptual and
collaboration changes ride the same number so that one version describes one
coherent set of expectations.)

- **The service advertises its version** on every response:
  `X-Trainer-Agent-Interface-Version: 1.0`.
- **You should declare yours** by sending the same header on each **request**, set
  to the version you built against.
- **A mismatch is a warning, not an error.** The front door never rejects a
  request over version; it records *both* versions on its trace span
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

- **1.0** (2026-06-25) — initial interface. The conceptual, collaboration, and
  technical interfaces in one spec. Wire contract: `POST` `{message, session_id}` +
  bearer auth over the Function URL; response `{reply, status, pr_url?}`; optional
  `traceparent` for trace propagation; `X-Trainer-Agent-Interface-Version` on
  requests (client) and responses (service).
