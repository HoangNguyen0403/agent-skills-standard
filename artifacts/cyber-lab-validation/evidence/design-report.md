# Slice A — Technical contract design report

Status: authored proposed design; ready for independent G2 review. Implementation/activation remain blocked pending matching approvals and proof. No human approval is claimed.

## Owned artifacts

- `docs/srs/srs-cyber-lab-validation.md` — proposed SRS/FRS with embedded ADR-CLV-01, explicit proposed baseline amendment, seven requirement cards, HLD/component/selected LLD trace, nineteen AC verification obligations and canonical ownership map.
- `.agent/sdd/prd-cyber-lab-validation/design-report.md` — this bounded outcome/evidence report.

No other file was written by this worker. The approved PRD, baseline SRS, historical evidence, source skills/workflows and generated mirrors were not edited. No new walkthrough artifact was created because the delegated brief restricts ownership to these two outputs. Evaluation case details remain owned by Slice B at `docs/srs/srs-cyber-lab-validation-evaluation.md`.

## Acceptance accounting

| Brief obligation | Design evidence / outcome |
| --- | --- |
| Map all requirements | SRS section 3 has seven SRS-CLV cards, each linked to REQ-CLV, HLD, component, selected LLD/appendix and VER IDs. Goals and baseline Objectives 001–002 carried forward; no fabricated BRD IDs. |
| Map all nineteen ACs | SRS section 9 has exactly VER-CLV-01/AC-CLV-01 through VER-CLV-19/AC-CLV-19; tool search displayed all nineteen rows after authoring. These are verification plans, not passing tests. |
| Precise scenario/action/evidence interface | Section 4 defines ScenarioContract, ActionRequest, GateDecision, proof envelope, StepResult, ActionReceipt, ObservationRecord and CleanupResult with field semantics and validation. Contract v1 is proposed document-level schema, not an implemented API. |
| Mode and enum compatibility | Exact four modes; unchanged existing finding/purple enums; independent step_state/block_reason fields; required reason on stopped/failed/blocked/dependency-blocked states; planned/eligible/running explicitly never successes. |
| Continuation and dependency behavior | LLD-ROUTE defines acyclic declared dependencies, evidence predicates, independent branches, terminal attempt preservation and fresh restart attempt; no invented producer evidence or provider-switch retry. |
| Normal/alternate/error and adverse timelines | Section 5 flow table plus host gate/dispatch drift, expiry/stop/cancellation, lost acknowledgement, missing observation and teardown failure ordering. Section 6 failure matrix. |
| Host ownership/proof requirements | LLD-GATE identifies proof and enforcement owner for isolation/tools/filesystem/network/credentials/logging/cancellation/teardown; missing proof blocks active work, not offline analysis. |
| Explicit amendment, dormant activation | Section 8 quotes proposed exact allowed/excluded boundary and names separate opt-in lab contract. Existing scoped-validation prohibition remains intact; G2 alone never authorizes runtime action; G3/G4/G5 separately gated. |
| Source-grounded routing map | Section 10 maps concrete canonical skills/workflows; pentest gets bounded optional handoff only; security-test remains static/delta with no active expansion. |
| Rollout/rollback and history | Section 10 preserves opt-in/generator ownership, temporary-consumer exercise, prior reviewed rollback revision, immutable run artifacts and separate runtime teardown authority. |
| No compatibility/live success claim | SRS distinguishes answer/replay/runtime/distribution lanes, supplied/replayed/exercised fidelity, historical grades and unknown present-model compatibility. No run was performed. |

## Source paths consulted

- `AGENTS.md` skill index; `ARCHITECTURE.md` system overview, SDLC and registry/runtime boundaries.
- `.agent/sdd/prd-cyber-lab-validation/design-brief.md` and full `docs/prd/prd-cyber-lab-validation.md`.
- `docs/srs/srs-task-list-governed-cybersecurity.md` and `docs/srs/srs-walkthrough-governed-cybersecurity.md`.
- `skills/cybersecurity/cyber-authorization/SKILL.md` and `references/runtime-authorization-matrix.md`.
- `skills/cybersecurity/cyber-evidence/SKILL.md` and `references/evidence-record.md`.
- `skills/cybersecurity/cyber-scoped-validation/SKILL.md`, `cyber-detection-validation/SKILL.md`, `cyber-engagement-planning/SKILL.md`, `cyber-exercise-control/SKILL.md`, `cyber-incident-triage/SKILL.md`.
- `.agents/workflows/cyber-exercise.md`, `cyber-purple-validation.md`, `cyber-triage.md`, `pentest.md`, `security-test.md`.
- `skills/common/common-software-requirements/references/srs-template.md` and `skills/product-management/product-requirements/references/requirements-modeling.md`.
- Slice B finding relayed by coordinator: current `scripts/evals/execute.ts` auto executor is Codex-only and text-assertion based, not multi-provider/runtime proof. SRS E10 explicitly attributes this finding to evaluation worker; appendix owns detailed source verification.

## Skills and audit

Loaded `using-superpowers` (subagent exemption noted), `design-solution`, `common-software-requirements`, `common-decision-discipline`, `common-architecture-diagramming`, `common-subagent-driven-development` worker contract, and `verification-before-completion`; canonical design workflow also loaded through MCP. Keyword routing additionally returned architecture/global best-practice bodies; no Go/Python implementation scope was inferred from broad matches.

MCP audit and session-cost calls completed, but audit returned zero loaded skills/no calls despite the successful routing/workflow/get_skill tool outputs earlier in this worker session. Reported through `xd://report_issue`; the process-local ledger is not reliable evidence of the earlier loads. Direct tool outputs above are the evidence. Cost response lacked host token usage/pricing; exact tokens/cost unavailable, no estimate invented.

## Checks actually performed

- Read approved PRD fully and relevant canonical authority/evidence/workflow contracts before writing.
- After authoring, targeted tool search for requirement rows, verification rows and section headings displayed seven SRS requirement cards and all nineteen AC/VER rows, plus explicit proposed amendment and complete design sections.
- No builds, tests, lint, formatters, generators, paid evaluations, exploits, lab actions, staging or commits were run. No runtime behavior is claimed verified. The coordinator owns integrated document/link and independent-review checks after both slices settle.

## Decisions and remaining prerequisites

1. G2: requesting operator plus named engineering owner and independent security review must approve/reject ADR-CLV-01's exact boundary, separate opt-in package design and explicit baseline amendment. Current approval is pending.
2. G3: assigned lab host/control/evidence owners must supply exact action/version allowlists, finite limits including demonstrated stop latency, surviving cleanup authority, retention/access policy and independently reviewed host proof. No actual host availability is assumed.
3. G4: QA must resolve exact provider/model IDs/settings and eligible runner adapters, freeze corpus/denominators, obtain separate budget authority and collect fresh answer/runtime evidence with independent adjudication. Existing runner is not assumed multi-provider.
4. G5: named release approver authorizes publication only after required evidence; publication does not authorize live execution.

No design-authoring prerequisite remains unresolved. These are explicit approval/runtime/evaluation blockers for dependent implementation and activation, not reasons to drop broad family coverage or stop independent offline work. Model rejection root cause remains unknown without actual failure transcripts/configuration; no promised reduction or universal compatibility claim.

## Handoff

`slug`: cyber-lab-validation. `workflow`: design-solution. `design_status`: ready-for-G2-review. `feature_status`: blocked (implementation/activation gates). `repository_status`: proposed-design-artifacts. `activation_status`: dormant. Next: coordinator integrates Slice B appendix, obtains independent contract/security review and records the G2 human decision; then `implementation-readiness`. This worker does not approve or coordinate those gates.

## Independent review confirmation and bounded correction round

Read the complete independent `review-report.md`, FS01–FS12 and F01–F03. Loaded `receiving-code-review` and reloaded project rules for both owned artifacts before correcting. This section qualifies the earlier ready-for-review handoff: independent review has occurred; integrated finding closure and human G2 approval remain pending.

### Fact-sheet confirmation

| Fact | Author confirmation / qualification |
| --- | --- |
| FS01 | Confirmed: registry distribution is not host enforcement. |
| FS02 | Confirmed: acyclic per-step routing, four modes and pre-active-action gate. |
| FS03 | Confirmed as proposed contract requirements: immutable scenario/action/fixture identities and bounded proof/limits/teardown; not supplied runtime manifests. |
| FS04 | Confirmed intended dataflow; original carrier completeness was ambiguous as F01 states. Corrected mandatory transitive chain is now explicit in LLD-EVIDENCE. |
| FS05 | Confirmed: independent continuation, evidence-dependent blocking and new attempt/fresh gate for restart. |
| FS06 | Confirmed: finding, defensive outcome, step impediment and measurement disposition remain separate; enums unchanged. |
| FS07 | Confirmed from appendix lane and disposition/accounting sections: frozen comparison cells/denominators and A/R/L/D lanes, not extra product modes. |
| FS08 | Confirmed as documentary catalog coverage, not executed coverage: seven S/N/B/P families and eleven cross-cutting cases, expanded instances frozen before execution. |
| FS09 | Confirmed: disjoint canonical owners; integration alone owns generated/export/global publication changes and applying any approved baseline amendment. |
| FS10 | Confirmed: G1 approved; proposed G2 boundary and G3/G4/G5 remain distinct, pending and non-interchangeable. |
| FS11 | Confirmed: unmatched action observation -> telemetry-gap; residual/unverified cleanup disclosed; post-expiry teardown needs surviving authority. |
| FS12 | Confirmed as evaluation author's source-backed finding repeated by reviewer and consistent with appendix source table: Codex-only auto executor, prompt/single-skill arms and textual assertions. This worker did not independently execute the runner. |

No fact-sheet correction changes approved scope. All statements describe proposed documentary contracts unless explicitly attributed to existing source; none supplies runtime proof or human approval.

### Finding dispositions

- **F01 accepted and corrected in owned SRS section 4, LLD-EVIDENCE.** Original prose demanded fixture identity but did not specify how ObservationRecord inherited it; this was a substantive interface-freeze ambiguity, not merely wording. Added mandatory observation_id/action_receipt_ref and resolvable immutable observation -> receipt -> gate -> exact request target/fixture chain; defined unique `(run_id, attempt_id, test_id)` correlation binding and observation ID scope; required mismatch, cross-run/attempt, cross-fixture and conflicting reused-ID rejection. Unpaired supplied observations remain useful for analysis but cannot establish paired execution proof. Added fixed mismatch/reused-key negative obligation under VER-CLV-12 for evaluation owner to incorporate. Existing finding/purple/step enums, gates and E05 unchanged.
- **F02 accepted as source-ownership ambiguity; correction owned by Slice B/integration, not this worker.** Reviewer's cited execute/index/reporter side effects conflict with any reading that reserves aggregate writes for a separate report invocation alone. Confirm integration execution or explicit serialized ownership handoff; do not invent a no-report switch. This worker read the full finding but did not independently inspect or modify runner source.
- **F03 accepted as lane-applicability ambiguity; correction owned by Slice B.** Direct appendix inspection confirmed “Every record” required model/arm/prompt/transcript fields while D and non-model L records may have no model. Case/run envelope versus nested receipt applicability must be explicit, with null/not-applicable rationale for non-model provenance, never invented metadata. No fifth mode or new runtime is needed.

### Exact binding contract frozen for evaluation-owner consumption

ObservationRecord adds `observation_id` and `action_receipt_ref`. For every paired claim the latter resolves uniquely to immutable ActionReceipt, whose gate_ref resolves uniquely to immutable GateDecision, whose request_ref resolves uniquely to immutable ActionRequest. Inherit run/attempt/step, action/version, target identity, fixture revision and resource digests through that chain and gate bindings. Any explicitly repeated inherited values must match. Correlation key `(run_id, attempt_id, test_id)` binds exactly one step/receipt/gate/target-fixture set; restart/retry uses a new attempt/key. Observation IDs are unique within run/attempt. Multiple distinct observations may share one receipt; byte-identical repeat delivery de-duplicates; conflicting key/ref/ID reuse rejects. Validate entity/time-window/source after resolving the chain. Missing/ambiguous links, cross-run/attempt, cross-fixture, out-of-window and conflicting reused IDs cannot support prevented/detected/responded. An evidenced action without usable matched observation remains telemetry-gap. A supplied unpaired observation is analysis-only proof of its own content, not evidence that the action occurred.

Planned fixed negative instance: fixture A observation must not join patched/restarted fixture B even with matching entity/window/test label; conflicting reused full correlation key must also reject. Appendix owner should instantiate under CLV-F06-N or another fixed named case and retain AC-CLV-12/VER-CLV-12 trace.

### Correction verification and limits

Surgical edit output confirms the new LLD-EVIDENCE carrier and binding/rejection clauses were written. Manual documentary adverse-timeline check: A -> restart/patch B changes attempt/fixture binding; A receipt chain cannot satisfy B gate/request even if label/entity/window match. Reuse of the full key for B conflicts and rejects; replaying identical delivery only de-duplicates. This is a design walkthrough, not an executed runtime test. Only the SRS and this report were changed; no code/tests/builds/generators/formatters/model/lab actions. Parent must verify integrated appendix consumption and obtain review closure before claiming F01–F03 jointly resolved.

Correction retrospective (proposal-only): F01 root cause is procedure/interface precision, not missing runtime authority or a trigger miss. A rule demanded target/fixture correlation without specifying the mandatory carrier and uniqueness scope. Better approach: for every proposed join, walk one adverse restart/fixture-change timeline and name the immutable reference chain plus collision/rejection rule before freezing interfaces. Evidence: independent review F01 and corrected LLD-EVIDENCE. No registry skill amendment is authorized or promoted. `common-session-retrospective` and `common-learning-log` were consulted; root `AGENTS_LEARNING.md` writes are excluded by this worker's explicit two-file ownership, so the proposal stays here for parent disposition. Correction audit now records the two reloaded project file-rule skills; other direct skill reads and previous workflow loads are not represented in its process-local ledger. Cost remains unavailable.
