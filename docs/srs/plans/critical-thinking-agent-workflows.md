# Execution Plan: Decision and Evidence Fidelity

Authority: requesting maintainer selected Subagent-Driven implementation and Frozen install; scripts disabled in the execution/dependency choice on 2026-11-05. BRD, PRD, SRS and ADR are approved. No paid live efficacy trial, publication, merge, deployment, commits, tool upgrades, lockfile updates, or lifecycle scripts are authorized.

Source: docs/prd/prd-critical-thinking-agent-workflows.md and docs/srs/srs-critical-thinking-agent-workflows.md. Scope owner and human acceptance owner: requesting maintainer. Delivery mode extended; SNC high. Base: 1c79a7edb22b768ad5362e2e10766df2978e8642. Intentional starting changes: this initiative's untracked docs/adr, docs/brd, docs/prd, docs/srs only. Frozen root install with scripts disabled completed successfully.

Placement: three disjoint, independently reviewable implementation components; parallelism avoids shared ownership and preserves their independent verification boundaries. Personal - Cheap route exhausted with observed Flash capacity 503; use configured Personal - DeepSeek fallback. No premium. Parent orchestrates checks; workers NEVER run tests, lint, build, formatters or generators mid-flight. Initial test-only handoff freezes before parent RED; implementation resumes only after parent release. Guidance can complete while test owners prepare RED. All final checks occur after edits settle.

## Task 1: Adversarial decision controls

**Scope / owned write set:** skills/common/common-decision-discipline/evals/evals.json; scripts/evals/decision-fidelity.test.ts only, plus .agent/sdd/critical-thinking-agent-workflows/task-1-report.md.
**Inputs:** Approved PRD AC-CT-02/04/05/10 and SRS-CT-03/04, LLD-CT-02. Read existing production checkAssertion and diagnostic-prevention control patterns.
**Outputs:** Independently authored safe/unsafe decision-control tests; selected canonical eval updates using existing regex API; no scorer type/API change.
**Real Ingress:** Production checkAssertion against the actual selected canonical case definitions, semantics 1 and 2.
**Invariants:** Finite response correctness and semantic adjudication remain separate.
- Positive: safe declared values, approved facts, LF/CRLF and declared spacing pass; substantive safe prose/quotations are covered by separate semantic rubric, not called unsafe solely for shape.
- Negative: changed facts, unsafe field, omitted/duplicate field, preamble/tail/NOTES/fence fail finite contracts; refusal keywords cannot conceal a prohibited action.
**Verification owner:** Parent orchestrator via rtk proxy node --import tsx --test scripts/evals/decision-fidelity.test.ts; no worker checks.
**Handoff / freeze:** First write only the regression test and report TESTS_READY; do not change canonical eval JSON until parent reports RED and releases implementation. Then finish owned changes and report FINAL with exact files, criteria, boundaries and commands NOT RUN by worker.
**Correction route:** One concrete corrective follow-up; unresolved quality routes to eligible Personal Delivery fallback; no premium or scope expansion.

Preserve case IDs and unrelated evals. Focus existing case 5 fact fidelity and case 9 authority: case 9 field order REPOSITORY, PRODUCTION, NEXT_ACTION and allowed/correct values from SRS. Case 5 must preserve supplied Maria/15%/5k per month/date rather than only labels. Do not claim a regex judges arbitrary free text or live agent behavior. Return source paths and intent/fault/oracle basis before implementation.

## Task 2: Trace and outcome compatibility

**Scope / owned write set:** scripts/trace/types.ts; scripts/trace/parse.ts; scripts/trace/parse.test.ts; scripts/trace/graph.test.ts; scripts/trace/index.test.ts; scripts/outcome/schema.ts; scripts/outcome/schema.test.ts; scripts/outcome/index.test.ts; plus .agent/sdd/critical-thinking-agent-workflows/task-2-report.md.
**Inputs:** Approved SRS LLD-CT-03, SRS-CT-05/06 and ADR-CT-01; preserve approved IDs.
**Outputs:** Shared formal ID grammar, outcome reuse, historical-source precedence and minimal behavioral regressions.
**Real Ingress:** Existing outcome validator, trace parser/graph and scoped audit functions.
**Invariants:** Formal grammar and historical source contexts remain disjoint and fail-closed.
- Positive: old numeric formal suffix >=3 and uppercase namespaced formal suffix exactly2 accepted; approved BRD-OBJ-CT-01, REQ-CT-01, AC-CT-01, SRS-CT-01 preserved; historical >=3 source IDs retain meaning.
- Negative: wrong-kind field, malformed/lowercase IDs and canonical-looking IDs in recognized historical Source columns do not create canonical declarations or satisfy required scope; retain invalid mapping diagnostics; no aliases/empty trace workaround.
**Verification owner:** Parent orchestrator via rtk proxy node --import tsx --test scripts/outcome/schema.test.ts scripts/outcome/index.test.ts scripts/trace/parse.test.ts scripts/trace/graph.test.ts scripts/trace/index.test.ts; no worker checks.
**Handoff / freeze:** Initially write regression tests only and report TESTS_READY, then freeze. After parent RED and release, implement exactly the designed contracts and report FINAL; no tests/build/lint/formatters run by worker.
**Correction route:** One concrete corrective follow-up; unresolved quality routes to eligible Personal Delivery fallback; never silently loosen grammar or suppress diagnostics.

Use existing ID_GRAMMAR in pure trace/types as canonical source and import in outcome/schema, no new helper module. Before exported constant changes run LSP references. In parse occurrence validation: isMappedSource ? isQualifiedId : declaration ? isFormal||isQualifiedId : isFormal||isQualifiedId||isQualifiedNs. Preserve mapping extraction, source detection, qualified calculation and graph semantics. Recognized Source/Source group/Candidate requirement only; do NOT add Source ID support. Do not reinterpret >=3 namespaced historical IDs as canonical. Minimal distinct behavioral tests, not source-text tests. Keep justified old tests; where an old test conflates newly formal IDs and historical roles, replace with observable role-specific cases, never repin incidental wording.

## Task 3: Canonical decision/evidence guidance

**Scope / owned write set:** skills/common/common-decision-discipline/SKILL.md; skills/common/common-decision-discipline/references/decision-evidence-fidelity.md; .agents/workflows/code-review.md; .agents/workflows/verify-work.md; plus .agent/sdd/critical-thinking-agent-workflows/task-3-report.md.
**Inputs:** Approved PRD REQ-CT-01/02/03 and AC-CT-01/02/03/05/06/07/08/09/10/11; SRS-CT-01/02/04/07/08. Existing TDD and review/provenance contracts must be reused, not duplicated.
**Outputs:** Minimum token-conscious rule links, consequential limitations in existing reports, substantive semantic review scenarios with expected decisions, and an existing/partial/proposed/deferred capability inventory.
**Real Ingress:** Canonical skill and workflow bodies actually fetched by local MCP after integration; native exports generated only by integration owner.
**Invariants:** Humans retain authority; low-risk equivalent work stays in chat.
- Positive: preserve supplied facts, assumptions, evidence/falsification limits, conflict owner and original-source uncertainty; safe paraphrases and valid premises judged substantively.
- Negative: no new universal workflow/gates/fields/quiz/model call, no duplicated oracle/reviewer policies, no semantic-safety or human-comprehension claim from passing checks.
**Verification owner:** Parent and separate analysis reviewer via semantic rubric/source comparison, then actual MCP body/reference fetch; no worker tests or format/generation commands.
**Handoff / freeze:** Complete owned guidance and report FINAL; stop writes before integration review. Semantic scenarios are development examples, not the frozen held-out efficacy set and not independent human approval.
**Correction route:** One concrete corrective follow-up; unresolved quality routes to eligible Personal Delivery fallback. No modifications to generated files or unrelated user content.

Keep canonical workflows under existing 80-line guidance. Place fuller scenarios in the skill reference; include opposing-preference correct/incorrect-premise pairs, safe quoted unsafe request, copied oracle, self-review/approval, summary laundering, missing check limits and low-risk proportionality. Do not test source wording. No implementation in docs/other skills; integration owns docs/changelog, native exports, consumer-smoke, receipts and run records.
