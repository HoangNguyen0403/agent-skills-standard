# Feature Plan: Simplify Workflow Wording (Slice 3A)

slug: skill-model-collaboration
slice: 3A (approved first part of the brief's slice 3)
revision: 1
operator_profile: technical
lane: direction
delivery_mode: standard
snc_tier: high (S=2 N=1 C=2; inference from cross-workflow gate/routing impact)
approval: approved(requesting maintainer, 2026-11-11), revision 1; narrowed 3A scope and readiness/design assessment only, not implementation or model spend
implementation_authorization: requesting maintainer's subsequent `proceed`; Subagent-Driven W1/W2/W3 only (local gitignored evidence, not portable proof: `artifacts/skill-model-collaboration/slice-3/execution-authorization.json`); covered implementation only, no commit, paid evaluation or release authority
publication_authorization: requesting maintainer's subsequent `please do`; authorizes staging/commit, push, PR creation and CI observation only; no merge, release, deployments or paid evaluations
owner: requesting maintainer
repository_status: implemented_pr_candidate
activation_status: not_required

## Decision Brief

- **Checkpoint:** Slice 1 is committed as `ff8f4d133339a17a0dc53d2c63db688f910bf39e`; its review and explicit [slice-1 acceptance criterion 008](prd-skill-model-collaboration.md#requirements-and-acceptance-criteria) exception remain unchanged.
- **Recommendation:** First simplify workflow prose and unpack routing precedence. Keep inline Outcome mappings and the three common skill bodies unchanged. Do not implement template extraction or change the parser/exporters in this pass.
- **Change from the candidate direction:** The brief proposed de-duplicating Outcome templates and shared guardrail skills together. Research found that the templates are executable validation inputs, not merely duplicated prose. This plan explicitly proposes a narrower first part; the remainder is deferred, not completed or silently discarded.
- **Impact if wrong:** A shorter instruction changes which action is permitted, erases an exception, or routes to the wrong owner. Semantic equivalence and real consumer checks take precedence over byte reduction.
- **Evidence limits:** Repository structure and consumers were inspected; no model-pressure or cost comparison was run. Static/test equivalence is not proof that a model follows the new wording equally well.
- **Approval sought:** Approve the narrowed 3A scope and preservation contract for readiness/design assessment. Workflow implementation, model runs, premium calls, merge and release remain unauthorized. An execution approach is selected only at the later implementation gate.
- **Independent readiness:** The baseline/invariant inventory can be scoped now. Workflow edits require plan approval, readiness and the execution gate. Outcome extraction and common-skill rewriting are not prerequisites for 3A.

## Outcome And Guardrails

Trace: `docs/brd/brd-skill-model-collaboration.md`, F7/F9/F10 and slice 3; the brief has no BRD-OBJ identifiers. Slice 1's acceptance definitions are not reopened.

Outcome: the same workflows expose readable, explicit routing and permission rules with fewer redundant instructions where equivalence is demonstrable.

Measurement: report before/after bytes for every edited workflow and its required shared reads, plus the changed workflow corpus. Do not set an arbitrary reduction percentage. A readability improvement may increase bytes; report it honestly, never as cost savings. Model quality, trigger rate, task token use and dollar savings remain unmeasured.

Guardrails: preserve workflow identifiers, frontmatter, invocation arguments, output fields/defaults, scoped approval authority, sensitive-change floor, incident precedence, low-risk equivalence, PARTIAL readiness, affected-only reopening, evidence lanes, verification obligations and runtime-neutral handoffs. No new mandatory intake, approval or universal audit gate.

## Scope And Capability Inventory

| Capability | Disposition | Boundary |
| --- | --- | --- |
| Simplify duplicate workflow prose | In scope | `.agents/workflows/*.md`; remove a repeated rule only if the same obligation and applicability remain locally or in a skill already explicitly required by that workflow |
| Unpack chained routing and gate clauses | In scope | In particular `.agents/workflows/sdlc.md`; preserve direct `-> \`workflow\`` route syntax and every branch/exception |
| Keep exported consumers consistent | In scope | Existing generator-produced workflow exports and associated generated metadata/ledger; never hand-edit mirrors |
| Extract Outcome templates | Deferred | Requires separately scoped template-parser/reference-delivery work; no pure-link replacement |
| Rewrite common discipline/routing/profile skills | Deferred | Bodies, frontmatter, triggers, references and evals unchanged in 3A; separately scoped before/after pressure validation required |
| Change authoring budgets, priorities or triggers | Excluded | Brief slices 4/5, not a workaround for the present line limits |
| Delta-only category rewrite | Deferred | Brief slice 2; no category selection or model run here |

Canonical candidate boundary is the 39 flat workflow Markdown files. Before editing, the owner freezes the exact touched-file list and changed sections in a disposition inventory; untouched workflows are explicitly accounted for. This is a selection within the approved directory boundary, not authority to change every file gratuitously.

The three protected skill directories are `skills/common/common-decision-discipline/`, `skills/common/common-task-complexity-routing/`, and `skills/common/common-operator-profile/`. All other skill bodies and eval/reference files are outside 3A too. No changes to `scripts/`, `cli/`, `mcp/`, configuration, schemas, test expectations or ownership controls are authorized by this plan. An unexpected dependency requiring such a change returns to the maintainer with evidence.

## Requirements And Acceptance Criteria

All requirement rows trace to the brief's slice 3. Owner is accountable, not a claim of implementation authority.

| Requirement | Behavior | Owner | Priority | Status |
| --- | --- | --- | --- | --- |
| REQ-S3-001 | Make repeated or chained workflow instructions easier to follow without changing obligations or conditions | Maintainer | P1 | Proposed |
| REQ-S3-002 | Preserve routing, approval and safety semantics across ordinary, exceptional and blocked cases | Maintainer | P0 | Proposed |
| REQ-S3-003 | Preserve the existing machine-consumed workflow output contract | Maintainer | P0 | Proposed |
| REQ-S3-004 | Keep configured generated workflow consumers consistent with canonical sources | Engineering owner | P1 | Proposed |
| REQ-S3-005 | Report actual content/load changes and verification limits without efficacy or savings claims | Engineering owner | P1 | Proposed |

| AC | Requirement | Given / when | Observable result | Owner | Single verification lane |
| --- | --- | --- | --- | --- | --- |
| AC-S3-001 | REQ-S3-001 | Before any proposed deletion or move is applied | Each affected instruction has an obligation, applicability condition, destination/support and disposition; ambiguous semantics are resolved before that edit | Implementation owner | Independent semantic inventory review |
| AC-S3-002 | REQ-S3-002 | The routing cases below are compared against checkpoint and candidate | Same workflow/policy owner, allowed action, blocking scope and authority for every case; prose never turns an unexecuted check into PASS | Independent reviewer | Before/after decision-table review |
| AC-S3-003 | REQ-S3-003 | Edited canonical workflows are compared with the checkpoint | Outcome mapping bodies, workflow-specific values, frontmatter, invocation arguments and handoff field names are unchanged | Integration owner | Structured extraction/diff |
| AC-S3-004 | REQ-S3-003 | Actual outcome-template/schema and SDLC consumers run on the frozen candidate | Focused tests and SDLC audit introduce no issue relative to the saved baseline; no parser/test weakening | Integration owner | Existing consumer regression checks |
| AC-S3-005 | REQ-S3-004 | Existing generator applies and its check runs | Configured exports match canonical transformations; final check passes; every changed generated path is expected or explicitly reviewed | Integration owner | Generator receipt/parity verification |
| AC-S3-006 | REQ-S3-005 | Before/after size report is produced | Each changed workflow includes body bytes and all newly required shared reads; token/dollar/behavior claims are marked unmeasured | Integration owner | Load-accounting review |
| AC-S3-007 | REQ-S3-002 | Full candidate diff is fenced against the checkpoint | Protected skill directories, all evals, code/config/schema/test files remain unchanged; no authority or extra gate is introduced | Independent reviewer | Scoped source review |
| AC-S3-008 | REQ-S3-001 | Changed workflows are checked against current authoring limits | Within existing workflow limits without restoring packed exception chains; an impossible fit blocks the affected file rather than changing the standard or hiding text | Implementation owner | Editorial contract review |

## Routing And Authority Review Cases

These are semantic comparison cases, not model-generated transcripts or evidence of pressure-test success. Before editing, the inventory binds expected decisions to the checkpoint's actual clauses. A material ambiguity blocks only its affected edit.

| Case | Preserved decision |
| --- | --- |
| Explicit requested stage, all prerequisites satisfied | Honor the explicit request/latest approved stage; do not restart intake |
| Explicit diagnose/recover plus fresh task-linked active harm | `incident-hotfix` owns policy before ordinary execution, including stale product-learning context; unrelated incidents are not loaded |
| Explicit stage plus missing safety prerequisite | Hold its affected action, preserving independent safe work and existing authority |
| Approved sufficiently specified low-risk maintenance | Preserve direct `dev-fix`/`implement-feature` path without mandatory new BRD/PRD/SRS files |
| Authentication, payments, secrets, data integrity or trust-boundary change | Preserve existing floor, design and human gate regardless of brevity or arithmetic |
| Technical checks passed but business acceptance/release absent | Keep verification, acceptance and release as distinct decisions; no permission transfer |
| One stale/disputed decision with unrelated approved scope | Reopen/block affected consuming scope only, not a global reset |
| Optional product workflow not installed, or required evidence not assessed | Preserve current fallback plus capability gap; absence/NOT RUN is not success |

## Delivery Plan And Ownership

This is a mechanical-refactor plan, not a new runtime feature. Estimates are comparative t-shirt sizes, not dates or budget commitments. One workflow implementation owner avoids parallel writers fragmenting coupled routing and authority rules.

| Task | Type / owner | Owned paths and concrete result | Depends on | Trace | Size / confidence |
| --- | --- | --- | --- | --- | --- |
| W0 | Research prerequisite / analyst | Exact source/consumer invariant inventory, saved focused baseline, before-byte counts and decision-table expectations under `artifacts/skill-model-collaboration/slice-3/` (local gitignored evidence, not portable proof); consumes existing mapping, no repeat catalog audit | Plan approval for readiness work | AC-S3-001, 002, 003, 006, 008 | S / medium |
| W1 | Mechanical refactor / one delivery worker | Approved sections in `.agents/workflows/*.md`, with per-file dispositions; all consumers W2 below; no guardrail skill edits or new reference-loading dependencies | W0 accepted; readiness and execution gate | AC-S3-001, 002, 003, 008 | M / medium |
| W2 | Mechanical integration / one delivery worker | Existing generated exports, scoped receipt and complete before/after report; no hand-authored mirror or ledger edits | W1 frozen | AC-S3-004, 005, 006 | S / medium |
| W3 | Independent review / separate reviewer | Scoped verdict against inventory, authority cases, actual exports and verification evidence; no implementation ownership | W2 frozen | AC-S3-001 through 008 | S / medium |

Implementation uses one authorized delivery owner, and independent review uses a separate eligible independent reviewer per project routing policy; actual host profile settings are local dispatch records. Model/capability hints never grant premium access. Profiles and per-task settings are resolved at dispatch; no agent is authorized to spawn another agent.

Shared rules may be referenced only when the source body is already explicitly required and available on that workflow's supported consumer path. A link alone is not runtime loading. No new shared-reference extraction is delegated in W1. Minor sentence choices and grouping are delegated to the owner; changed applicability, precedence, field sets or authority are not.

### Planned Verification Commands (Executed Results In Delivery Evidence)

W0 saves baseline results once; W2 reruns only affected checks after all writes freeze:

- `rtk pnpm audit:sdlc`
- `rtk pnpm test:sdlc`
- `rtk proxy node --import tsx --test scripts/outcome/template.test.ts scripts/outcome/schema.test.ts`
- Integration apply: `rtk pnpm generate-indices`; affected check: `rtk proxy node --import tsx scripts/generation/index.ts --check`.

Compare issues by identity/severity, not just exit code. The existing hook may run its normal checks on a separately authorized future commit. No full-suite, paid eval or new permanent source-text test is added for wording edits. If a current exact-wording check conflicts with a behavior-preserving edit, expose the conflict; do not re-pin it, weaken a gate or expand code/test scope silently.

Existing `.skills-lock.json` is local and gitignored. A missing/stale/untrusted ledger on another checkout is a readiness prerequisite, not permission to repeat the prior recovery/adoption authorization. Any future provenance exception requires matching human authority; never forge ownership or bypass the generator.

## Evidence And Dependency Findings

- `confirmed` by bounded read-only analysis: 39 workflow files, 214,222 bytes; 30 Outcome headings; 26 schema templates (25 inline flow mappings and one block mapping); 18 copies of the exact generic blocking-question sentence. Lexical repetitions are not presumed removable.
- `confirmed(scripts/outcome/schema.ts:52-85)`: RunRecord v1 has 14 required top-level fields.
- `confirmed(scripts/outcome/template.ts:47-93)`: the local Outcome section must parse as a YAML mapping with those keys; links/includes are not resolved. Therefore pure-link extraction fails the current consumer contract.
- Analyst-inspected `scripts/audit-sdlc.product-evidence.test.ts:145-165` mutates inline schema/status text; `scripts/audit-sdlc.ts:226` requires direct optional-workflow route arrows. These consumer details are protected, not targets of this pass.
- `confirmed(.agents/workflows/sdlc.md:16,44-48)`: precedence, low-risk equivalence, evidence-lane separation, affected-scope reopening and sensitive-change rules are load-bearing content, not boilerplate to delete by term frequency.
- Analyst-inspected `cli/src/services/utils/WorkflowTransformer.ts`, `WorkflowSyncService.ts` and `mcp/src/services/WorkflowIndex.ts`: exporters/body retrieval do not inline linked reference bodies; acquisition is flat workflow Markdown. Do not move content to a nested workflow directory and assume export support.
- Analyst-inspected `skills/common/common-software-requirements/references/requirements-standards-baseline.md:80-91`: existing prose describes only part of the run record and is not a complete substitute for the canonical schema.
- `confirmed(package.json:34,41,89,93)`: focused outcome, SDLC, audit and generation entrypoints exist. They have not been run for this planning task.

## Risks, Deferred Work And Approval

| Decision / risk | Owner | Disposition |
| --- | --- | --- |
| Accept 3A rather than the full candidate slice 3 | Requesting maintainer | Pending approval of this document; template extraction and common-skill rewrites remain visible deferred capabilities |
| Guardrail model behavior after future common-skill rewrites | Requesting maintainer | Not assessed; requires separately scoped snapshot/before-after pressure protocol, eligible models, resource cap and spend approval before execution |
| A shared read costs more than the removed workflow prose | Engineering owner | No new required shared read in 3A; report complete load closure, not catalog-only savings |
| Expanded readable clauses do not fit the current 80-line budget | Implementation owner | Try real duplicate elimination without losing obligations; otherwise stop the affected file and report to maintainer, no slice-4 policy change |
| Existing audit/test depends on a protected literal or export shape | Integration owner | Preserve that contract in 3A; separately scoped change needed if it cannot be preserved |

Strongest objection: the largest repeated schema blocks stay. That is deliberate compatibility preservation, not a claim of maximum compression. Reversal condition: if the maintainer prefers extracting them now, replace this recommendation with a separately scoped parser/reference-delivery design and its acceptance criteria before edits.

## Status And Handoff

- `feature_status`: `implemented` for the approved slice 3A scope; source and generated exports are frozen and technically verified.
- Portable PR delivery evidence: [Slice 3A Review And Verification Evidence](../reviews/skill-model-collaboration-slice-3A.md).
- Independent cumulative preservation review: **APPROVE**, all eight ACs pass; F1/F2/F3 resolved (local gitignored evidence: `artifacts/skill-model-collaboration/slice-3/review/report-v2.json`). This supersedes the initial implementation review, not the requirement definitions or authority boundaries.
- Run record: `artifacts/runs/skill-model-collaboration/20261111T103804Z-implement-feature-slice-3A.json` is a local gitignored delivery receipt, not a host approval token or committed PR file. Local gitignored readiness evidence remains in `artifacts/skill-model-collaboration/slice-3/readiness-assessment.json`.
- Delivery report: local gitignored `artifacts/skill-model-collaboration/slice-3-report.md` (summarized for PR readers in `../reviews/skill-model-collaboration-slice-3A.md`). Focused audit, 19 SDLC tests, 25 Outcome tests and final generation/parity check pass. Canonical content is 65 bytes larger, with no new mandatory shared reads; no model-behavior, token or cost improvement is claimed.
- Business acceptance and release remain `not assessed`. Historical technical review certified source/export preservation only without commit, merge, release or runtime-activation authority; a separate subsequent publication authorization (`please do`) authorizes staging/commit, push, PR creation and CI observation only (no merge, release, deployments, runtime activation or paid evaluations). Outcome extraction and common-skill rewriting remain deferred as specified above.
- Slice-1 checkpoint remains `ff8f4d133339a17a0dc53d2c63db688f910bf39e`. This plan's post-review edits update status/handoff metadata and portable delivery-evidence links only; reviewed workflow/export bytes and requirement definitions are unchanged.
