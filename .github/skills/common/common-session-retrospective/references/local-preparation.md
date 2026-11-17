# Local Session Retrospective Preparation

Host-independent contract for offering, triggering and reading a locally prepared retrospective. Host-specific examples load on demand; nothing here requires a particular runtime.

The diagnostic-signals and native secure-ingress packaging changes described below are unreleased
source work; the released MCP 0.8.1 behavior remains the existing manual retrospective tools and
CLI. The planned native targets are Darwin arm64/x64 and GNU/Linux glibc arm64/x64; no artifact
availability or runtime support is implied.

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

Deterministic local rules over an allowlisted structured projection. Supported signals include file
and delegation-tree coverage, user-role row counts and attribution/steering, assistant stop reasons,
same-tool failure streaks, durations and timed permission latency, usage counters, and validated
decision records.

| Evidence state | Meaning |
| --- | --- |
| measured | structured evidence supports a value; a measured zero is distinct from missing |
| not measured | the source or required field is unavailable, including legacy ledgers and missing timestamps |
| partial | a declared bound or source gap limits the projection |
| not assessable | the evidence cannot support a semantic judgment |

User-role rows are not inferred human turns. Failure runs count consecutive failed results of the
same tool by the same agent; a different tool does not interrupt the streak, while success of that
tool does. A choice needs a validated `record_decision` event to be counted; these totals and labels
are agent-declared and unverified. Labels appear only in local ledger/report, never in the tool
receipt. A decision record does not grant authority or approval.

Not collected: typed completion/check outcomes, retry codes, or verification-result codes. The
projection cannot establish root cause, intent, semantic quality, approval validity, or why an
agent chose an action. Missing measurement is never zero.

## Outputs and boundaries

- The preparer publishes private owner-local `summary.md`, `ledger.json`, and `report.html` artifacts. Tool receipts contain fixed status/count fields and paths only; never report content, decision labels, or agent-record paths.
- Never load the full report back into model context or carry report text through a hosted tool channel. A human deliberately opens local artifacts.
- Processing is local and deterministic: zero model calls, zero outbound requests, zero automatic retries, and one concurrent run per session.
- Preparation never appends to `AGENTS_LEARNING.md`, personal memory, skill loaders, routing configuration or adoption state. Those are separate authorized steps.
- A decision record is evidence, not approval or permission. Its count and optional label are agent-declared and unverified.
- The preparer never executes transcript commands, follows embedded URLs or paths, loads includes, invokes agents or mutates skills.

## Triggering preparation

Preparation supports two explicit triggers:

1. **Designed completion trigger (unreleased)**: an orchestrator or unassigned caller declares completion and settled task counts through `get_session_cost`. The declaration is not host-authenticated. The proposed path requires local stdio, enabled human consent, a bound main session and zero active/pending tasks. It is distinct from the released manual preparation flow.

2. **Standalone direct request**: the released manual flow allows an orchestrator or user to invoke `prepare_retrospective(title="optional title")` over local stdio. Workers holding assignment packets must not invoke it. It requires human consent and publishes private artifacts; it does not require completion counts.

`record_decision` is part of the unreleased diagnostic-signals source change. It is designed to validate a structured decision and return a fixed receipt without persisting it; proposed durable evidence comes from the recording agent's session transcript, not server-side storage.
CLI and host commands:

```text
ags retrospective enable [--store-root <abs>] [--source-root <abs>]...
ags retrospective disable
ags retrospective status
ags retrospective index [--since <YYYY-MM-DD>] [--until <YYYY-MM-DD>]
```

> **Capabilities & release status**: The MCP server in `agent-skills-standard-mcp` 0.8.1 includes the three manual retrospective tools (`prepare_retrospective`, `get_retrospective_status`, `prepare_retrospective_index`) and CLI management commands over local stdio. The extended automatic preparation schema (`completion` object on `get_session_cost`) is an unreleased source-only capability pending subsequent release.

- One-time consent is strictly human-managed via interactive CLI (`ags retrospective enable`). Agents cannot grant consent.
- Output artifacts (`summary.md`, `ledger.json`, `report.html`) are written to the configured local store root (default `~/ags/diagnostics`) with owner-only permissions.
- Reports and raw session text are never loaded back into model context or returned over the tool wire.
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
