# Journeys — Architecture Decision Records

Each ADR records one architectural decision the Journey framework rests on: the
context that forced it, the decision itself, and its consequences. Together they are
the framework's constitution — the invariants a change is checked against, and the
explanation of why every seam is shaped the way it is rather than some other way.

Read [ADR-0001](0001-a-process-is-a-journey.md) and then
[ADR-0026](0026-every-input-and-output-is-named.md) first: reifying the process and
naming its boundary are the two moves the rest build on, in that order. The
[guide](../guide/README.md) shows each decision in working code.

## Index

| ADR | Decision |
|---|---|
| [0001](0001-a-process-is-a-journey.md) | A process is a Journey — a noun-ified process object that is its own record |
| [0002](0002-registers-itinerary-transactional-step.md) | Registers, itinerary, and the transactional step |
| [0003](0003-terminality-is-declared.md) | Terminality is declared, never inferred — from either side |
| [0004](0004-a-boundary-is-a-consistency-point.md) | A stage boundary is a consistency point |
| [0005](0005-needs-substitute-collaborators-never-authority.md) | Needs: every world input crosses a seam — and seams substitute collaborators, never authority |
| [0006](0006-enactments.md) | Enactments: every outbound effect is declared, mediated, and recorded |
| [0007](0007-the-mediation-convention.md) | A macro adds names; it never replaces one |
| [0008](0008-snapshots.md) | Snapshots: state round-trips, control re-derives — and content lives in flight |
| [0009](0009-snapshot-schema-versioning.md) | Snapshot schema versioning: restore never guesses |
| [0010](0010-persistence-is-an-observation.md) | Persistence is an observation |
| [0011](0011-listeners-describe-never-decide.md) | Listeners describe; they never decide |
| [0012](0012-excursions.md) | Excursions: a sub-journey is driven through the parent's own seams |
| [0013](0013-outfits-are-derived-never-manufactured.md) | Outfits are derived, never manufactured |
| [0014](0014-a-childs-trouble-is-the-owners-to-interpret.md) | A child's trouble is the owner's to interpret |
| [0015](0015-guides.md) | Guides: middleware is a journey wrapping a journey |
| [0016](0016-succession.md) | Succession: `exec` hands work on and does not return |
| [0017](0017-detachments.md) | Detachments: `detach` returns a handle, `rejoin` takes the outcome |
| [0018](0018-the-tree-walk-belongs-to-the-outfit.md) | The tree walk belongs to the outfit |
| [0019](0019-mail.md) | Mail: journeys talk to each other through a courier |
| [0020](0020-waits.md) | Waits: waiting is a fourth outcome |
| [0021](0021-the-fiber-outfit.md) | The fiber outfit: suspension only at stage boundaries |
| [0022](0022-durable-journeys-need-durable-authority.md) | A durable journey may act only on authority that is itself durable |
| [0023](0023-the-framework-host-boundary.md) | The framework/host boundary: Journey owns its own tree |
| [0024](0024-archetypes.md) | Archetypes: `===` is the floor for slot appropriateness |
| [0025](0025-delegation-over-module-extraction.md) | Break up big classes by delegation, not module extraction |
| [0026](0026-every-input-and-output-is-named.md) | Every input and output is named |

## Historical decision codes

The framework was designed through a living spec whose decisions carried short codes
(`B19`, `S17`, `K.14`, `L.6`, `I.27`, `J.24`) and section numbers (`§11.6`, `§16.4`).
Those documents are retired; the decisions live here. When an old code turns up — in
a commit message, an old branch, a conversation — this table finds its ADR.

| Old code(s) | ADR |
|---|---|
| B1, B2, §3.1 (disposability) | 0001, 0002 |
| B3–B8, B11–B14, B19, §4, §3.4 | 0002 |
| B9, B10, B15, B22 (`abandon!`), B23 (`fail_on`), K.5, K.6, K.13, §16.3 | 0003 |
| §16.4, K.14, K.16, #85 (suspension tiers) | 0004 |
| S2, §10, K.12, K.17, K.18, §16.1 | 0005 |
| S13, B20, B20a, §11, I.21–I.32 | 0006 |
| B21, §15 (incl. `docket` §15.5, declaration order §15.6), §16.6 | 0007 |
| B16–B18, §8.1–§8.6, K.3, §16.5 | 0008 |
| S17, §8.7 | 0009 |
| S18, §8.4, K.14, K.15, K.16 | 0010 |
| S14, §14, K.1, K.4, B24, S21 (diagnostics) | 0011 |
| S12 (excurse + `excursion` macro), J.25, #93, #94, L.10, B25, K.2 | 0012 |
| S12 (Outfit), §9 (outfit API), B26 (ambient collapse), K.21 | 0013 |
| B28, L.11, L.12 | 0014 |
| S25, §17 | 0015 |
| S22, L.7 | 0016 |
| S23, L.8 | 0017 |
| S15, §8.8, L.1–L.6, L.9 | 0018 |
| S26, §18 | 0019 |
| S27, §19 | 0020 |
| S3, J.24 (fiber outfit) | 0021 |
| §16.7, K.20 | 0022 |
| B26, S16 | 0023 |
| S11, F.18 | 0024 |
| B27, #139 | 0025 |

Codes not listed (A.*, C.*, D.*, F.*, G.*, H.*, question-round numbers) were design
questions whose ratified answers fold into the ADRs above; the nearest topical ADR is
the right citation.
