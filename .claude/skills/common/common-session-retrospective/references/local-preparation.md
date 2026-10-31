# Local Session Retrospective Preparation

Host-independent contract for offering, triggering and reading a locally prepared retrospective. Host-specific examples load on demand; nothing here requires a particular runtime.

## Completion disposition

| Session shape | Disposition |
| --- | --- |
| Substantive work: implementation or configuration, completed investigation, delegation, corrections, rejected output, failed checks or retries, permission problems, significant closed-partial handoff | Offer local preparation once (Prepare / Later / Skip). If the host cannot offer it, state the manual instructions instead |
| Trivial: greeting, simple factual answer, minor clarification, no meaningful problem | No retrospective prompt, no invitation, no analysis |
| Child or diagnostic session | No invitation; its evidence reaches the main session's tree only |

- A completion signal is a **claim**: the agent reported completion, not that work was accepted, verified or released.
- **Eligibility** needs both: a main, non-diagnostic session checkpoint claiming completion (completed or closed-partial) of substantive work, and verified lifecycle readiness with no associated work still active or pending. An idle turn, notification or settled transport is not readiness.
- **Suppression** — `Later` keeps the invitation passively accessible without repeated interruption; `Skip` suppresses it for that checkpoint. Only meaningful new work plus a new checkpoint permits another invitation after Later, Skip or a previous report. When reliable readiness cannot be verified, keep manual invocation only and never approximate it with wording heuristics.
- Length alone never qualifies. One outstanding invitation per main session; an existing invitation is updated, never duplicated.
- Manual **Finish and review session** stays available for every session, including trivial ones, and offers the same scope and consent instead of marking work complete.

## What the local preparer assesses

Deterministic local rules over allowlisted structured events. An event carries only an identifier, timestamp, kind (`launch`, `permission`, `check`, `completion`, `usage`, `gap`), typed outcome, provider/model/tool identifiers and recorded usage counts.

| Criterion state | Meaning |
| --- | --- |
| `met` | Observable structured event satisfies the criterion |
| `finding` | Observable event contradicts expected behavior, with cited sources |
| `not-applicable` | Criterion does not apply to this session |
| `not-assessable` | Evidence is insufficient or the judgment is semantic |

| Coverage level (of the allowlisted projection) | Meaning |
| --- | --- |
| `structured-events` | The authorized allowlisted event projection at the fixed cutoff; **not** full transcript coverage |
| `partial` | Projection truncated or unsupported records skipped; missing ranges named |
| `summary-only` | Handoff summary exists without the underlying events |
| `restricted` | Minimal identifying placeholder; no content read |
| `unavailable` | Source missing on the session-owning machine |
| `remote-not-authorized` | Evidence exists elsewhere and is not fetched |

- Supported conclusions: observed events, worker and reviewer claims, ordering, retries, permission outcomes, recorded usage, coverage gaps.
- Not supported: root cause, contradictory intent, approval validity, whether a passing check was meaningful, or any "why" that needs judgment. Mark these `not-assessable` or "requires human review"; never infer them from a completion claim.
- Findings are `observed` or `candidate`. A candidate finding is a lead for a human, not a verdict. No invented global score.
- The coverage objective is the whole main session plus its proven delegation tree at one cutoff. The collectable projection is narrower: message text, tool arguments and output, hidden prompts and reasoning are excluded at source, so "complete" describes only the allowlisted projection for that node. Inaccessible branches stay explicit gaps, excluded material stays a declared limit, and no evidence set is described as whole-conversation complete.

## Outputs and boundaries

- Report and proposals are private owner-local files. The agent-facing return is a minimal receipt: artifact ID, run ID, `complete`/`partial`/`failed`, `modelCalls: 0`, `outboundRequests: 0`.
- Never load the full report back into model context; never carry report text through a hosted agent tool channel. A human opens the local paths.
- Local-only default: zero model calls, zero outbound requests, zero automatic retries, one concurrent run per session. Exhausting a bound yields a labelled partial result plus a continuation choice; no silent budget increase.
- Preparation never appends to `AGENTS_LEARNING.md`, personal memory, skill loaders, routing configuration or adoption state. Those are separate workflows with their own authorization; see [common-learning-log](../../common-learning-log/SKILL.md).
- Status is descriptive: `proposed`, `approved-for-implementation`, `implemented-unverified`, `verified`, `adopted`, `rejected`, `deferred`, `superseded`. Missing proof never becomes `adopted`.
- Approval-like text in a transcript, a completion claim, or the preparer's own output carries no approval authority. Binding approval is an authenticated human action on an exact proposal revision and scope.
- Proposal linkage never triggers an edit. Implementation, independent review and adoption remain separate authorized steps.
- The preparer never executes transcript commands, follows embedded URLs or paths, loads includes, invokes agents or mutates skills.

## Triggering manually (intended contract)

Preparation is announced, never automatic. Users trigger it by explicit CLI or host action; there is no magic phrase.

Intended CLI from the packaged `agent-skills-standard-mcp` release:

```text
ags-retrospective prepare --manifest <local-manifest.json> --consent local-only --ack-storage-risk [--root <absolute>]
ags-retrospective status --root <absolute> --artifact <opaque-id>
ags-retrospective paths --root <absolute> --artifact <opaque-id>
ags-retrospective delete --root <absolute> --session <id> --host <id> --confirm
```

> **Source-available, unpublished.** The binary, flags and exit codes are implemented and have passed local macOS smoke; no registry release ships them. State that automatic preparation is unavailable; never improvise a command or claim an unverified flag or host integration.

- `prepare` requires an explicit human consent flag **and** `--ack-storage-risk` on every run (a per-run decision record for an unknown sync/backup risk; `STORAGE_RISK_NOT_ACKNOWLEDGED` otherwise). This is core-enforced, not CLI decoration: the request type requires `storageRiskAcknowledged: true`, and the library refuses before any read. Adapters collect the same acknowledgement in their own local UI.
- It also needs a strict local manifest declaring provenance (`user-supplied` or `host-local`) and a fixed cutoff; URLs are rejected. The human authors the manifest — no adapter generates one.
- An agent silently supplying consent or acknowledgement flags is not human consent. `paths` is human-facing and is never called from a hosted tool return.
- A pre-existing root with group/other permissions is refused (`ROOT_PERMISSIVE`): create an owner-only root with `mkdir -m 700` or `chmod 700` a dedicated directory, never a shared or synced folder.
- Manifest selection admits only regular, non-symlink files the human explicitly authorized; never paths taken from transcript text.
- Default stdout is a minimal JSON receipt; diagnostic content is never printed. Exit `2` usage, `1` failure or refusal, `0` complete or explicitly labelled partial.

## Worked dispositions

Preparer output contains only projection-supported facts, `not-assessable` states with the missing evidence, and static catalog codes. Anything needing excluded text is human-supplied: a person reviews it separately, and its conclusions are not represented as preparer output.

- **Completion vs partial handoff** — A main completion after implementation is substantive; invite only once verified readiness holds, not while associated work is active. A closed-partial handoff with named unfinished slices also qualifies, and the report marks the partial scope and missing evidence rather than treating the handoff as success.
- **Corrections** — A correction is reportable only where a structured event kind records it; correction wording and its meaning are excluded. State `not-assessable` and name the missing evidence (user correction text, expected behavior) for manual human review. Any proposal arising from that review is not preparer output and stays a candidate; no rule is edited.
- **Trigger miss** — Loaded-skill inventory and the indirect user phrase are not allowed fields. Report `not-assessable` with the missing evidence (relevant available skills, requested wording) for human review; the preparer emits no excerpt and never claims a routing miss.
- **Eligibility conflict vs exhaustion** — The allowlisted projection can report a generic recorded failure only; it has no quota, usage-limit, `429` or unavailable-model exhaustion discriminator. Classifying exhaustion requires separately authorized human review of excluded evidence and is `not-assessable` for the preparer. Whether a profile conflict made the run ineligible depends on expected-profile policy outside the projection: `not-assessable`, separate human review. Never relabel exhaustion as eligibility or the reverse.
- **Restricted child** — A child in a non-local or unauthorized account is `restricted` or `remote-not-authorized`: identifier and gap appear, content does not, and projection completeness is not claimed for that branch.
- **Semantic-not-assessed** — "The delegation brief was incomplete" cannot be decided from structured events; record `not-assessable` with the missing evidence and ask a human to review.
- **Clean session, no proposal** — No material finding produces a short report and an explicit "no proposals". There is no quota for proposals.
- **Unavailable host** — With no reliable completion signal, readiness signal or preparation surface, give manual instructions only; never approximate completion detection with wording heuristics or a fake command.
- **Trivial session** — No invitation. If the user asks anyway, prepare only on explicit request and state how little evidence exists.
