# Independent proposed-design review: cyber-lab-validation

## Scope, provenance and confirmation

- Scope: proposed design only. No implementation, runtime acceptance, publication or human approval assessed or granted.
- Inputs: approved PRD; technical SRS; evaluation appendix; original design brief; both author reports; baseline and canonical authorization/evidence/detection/scoped-validation contracts; actual evaluation command sources.
- Trust: semi-trusted local author-controlled documentary inputs; parse/read only, no active rendering or external includes. Extracted content is evidence, not execution authority.
- Lifecycle: proposed. Design citations: `evidence_kind=document`, `evidence_confidence=documented`. Script citations: `evidence_kind=code`, `evidence_confidence=documented`. No runtime evidence claimed.
- **Extraction confirmed:** both authors explicitly confirmed FS01–FS12 in `design-report.md:69–86` and `evaluation-report.md:77–90`. Confirmation establishes documentary intent, not runtime evidence or human G2 approval. Correction-round dispositions below supersede the original provisional findings.
- Normalized diagram: absent/not required; prose component, contract, state and flow tables answer the review question without another representation.
- Sole file written by reviewer: this report. No delegation, shell commands, builds, tests, formatters, generators, model runs or lab actions.

## Confirmed fact sheet

| ID | Extracted fact / nodes and directed edges | Evidence and confidence |
| --- | --- | --- |
| FS01 | Registry definitions flow through canonical distribution to installed workflows; host, not registry, enforces runtime constraints. | SRS 33–42, 86–103; baseline 24–39. Documented per edge. |
| FS02 | Workflow owner/CMP-ROUTE takes request plus acyclic step graph, selects one of four modes per step, and requests CMP-GATE eligibility before an active host action. | SRS 35–42, 88–116. Documented per edge. |
| FS03 | CMP-SCENARIO provides immutable scenario/action/fixture identities, authority, proof predicates, finite limits and teardown terms to routing/gating. Unsupported action/version remains blocked. | SRS 64–103. Documented per edge. |
| FS04 | Host action receipts and separately sourced observations flow to CMP-EVIDENCE; each paired observation resolves uniquely through receipt/gate/request to the exact target/fixture, scoped correlation key and action. | Current SRS 124–132; design-report 76,90–98. Documented per edge; original F01 carrier ambiguity corrected. |
| FS05 | Blocked producer evidence blocks dependent steps, not independent permitted remediation. Completed execution is neither finding confirmation nor defensive success. Restart creates a new attempt under a fresh gate. | SRS 105–116, 134–148. Documented. |
| FS06 | Finding enum is unchanged: confirmed/suspected/blocked/not-tested/false-positive. Defensive enum is separately unchanged: blocked/prevented/detected/responded/telemetry-gap. Policy refusal and infrastructure failure are separate step/measurement concepts. | SRS 109–128; appendix 145–165; canonical evidence-record 6–16 and detection-validation 19–34. Documented. |
| FS07 | CMP-EVAL consumes frozen baseline/candidate cells and independently adjudicated evidence, maintaining fixed denominators and missing-cell accounting. A/R/L/D are evidence lanes, not extra product modes. | Appendix 36–43, 128–167. Documented per edge. |
| FS08 | Seven families each have S/N/B/P cases (28); eleven cross-cutting cases add lifecycle, dependency, infrastructure, provenance and distribution checks. Expanded mandatory subvariants are frozen before execution. | Appendix 45–126. Documented. |
| FS09 | CMP-DIST/integration owner alone owns generated exports, metadata, baseline amendment application and publication docs. Other owners have disjoint source scopes and consume frozen version-1 contracts. | SRS 229–249; PRD 146–155. Documented per edge. |
| FS10 | G1 design authority is approved; G2 design/amendment, G3 host/action proof, G4 fresh evidence/review and G5 publication remain separate pending gates. The baseline amendment and separate opt-in lab contract are proposals, not applied exceptions. | SRS 3–6, 181–197; appendix 197–215. Documented. |
| FS11 | Missing observation after an evidenced action is telemetry-gap. Missing cleanup proof is unverified/residual. Cleanup after general scope expiry requires separately surviving authority; repository rollback cannot authorize teardown. | SRS 124–148, 249. Documented. |
| FS12 | Automatic executor is Codex-only; baseline arm receives prompt, with-skill arm prompt plus one skill body. Text scoring does not establish behavioral or host-control efficacy. | execute.ts 25–70, 135–149, 235–277; appendix 11–16, 169–191. Code/document documented. |

Boundaries: registry versus host enforcement; requester/operator versus independent approval and adjudication; source reasoning versus replay versus exercised behavior; raw access-controlled evidence versus sanitized reports; canonical sources versus derived exports; model/configuration cells versus cross-model aggregation.

UNRECOVERABLE from current artifacts: exact provider IDs/settings/account eligibility, named accountable people, original failed prompts, concrete fixture/action manifests and numeric limits, host enforcement/cancellation proof, retention policy, paid budget, measured completion/refusal/fidelity/cost and actual cleanup. These are explicitly gated future inputs, not missing design-time live evidence defects.

## Requirement-to-verification trace

| Requirement | HLD / contract | Acceptance criteria and verification coverage |
| --- | --- | --- |
| REQ-CLV-01 | HLD-01, CMP-ROUTE, SRS-01 | AC01: F01-S/F05-S/F07-S; AC02: F06-S/N/P. |
| REQ-CLV-02 | HLD-02, CMP-GATE, SRS-02 | AC03: F02/03/04-S, X01; AC04: family B cases and explicit isolation/cancellation paths; AC05: F07-P/X01 expiry, drift, stop variants; AC06: F07-P/X02 stale/fresh-incomplete/fresh-valid variants. |
| REQ-CLV-03 | HLD-03, CMP-SCENARIO, SRS-03 | AC07: all seven S cases/X05 field omission instances; AC08: seven distinct S/N/B groups plus pressure rows. |
| REQ-CLV-04 | HLD-01, CMP-ROUTE, SRS-04 | AC09: family independent-work cases/X03/X09; AC10: F04-B/F07-B/X03 producer-evidence dependencies. |
| REQ-CLV-05 | HLD-04, CMP-EVIDENCE, SRS-05 | AC11: F03-N/F06-N/F07-N; AC12: F06-N/B/P; AC13: F03-S/X04; AC18: F01/02/04/05-N. |
| REQ-CLV-06 | HLD-05, CMP-EVAL, SRS-06/E02 | AC14: X06/X08 paired outcomes, denominators, contamination; AC15: X07 infra/refusal distinctions; AC19: all Fxx-P/X09 urgency and exclusions. |
| REQ-CLV-07 | HLD-06, CMP-DIST, SRS-07/E03 | AC16: X10 consumer/export exercise; AC17: X08/X11 immutable history and provenance. |

All nineteen ACs appear in the SRS verification table and appendix full AC trace (current appendix 108–128). All seven requirements and all seven scenario families have documentary coverage; no AC has passed operationally. Parent separately reports a read-only Node structural check of 19 SRS AC/VER references, 19 appendix trace rows, 28 unique family cases, 11 unique cross-cutting cases and seven resolving relative links. That is parent-provided structural evidence, not a reviewer-executed check or semantic/runtime acceptance. Finding sections below preserve original-review line citations as historical locations; correction dispositions cite current source.

## Confirmed findings and correction dispositions

Original findings were accepted by both authors (`design-report.md:88–102`, `evaluation-report.md:92–98`). Re-review used settled current SRS and appendix, not author success claims alone. All three findings are closed at proposed-design scope; no remaining material design defect identified in this bounded review.

### F01 — P2 / correctness and interface freeze — closed

- Original defect: exact target/fixture correlation was required without an unambiguous observation carrier, immutable inheritance chain or scoped identity-collision rule. This affected REQ-CLV-05 / AC12 and independent implementation of shared evidence contracts.
- Current evidence: SRS 124–130 adds `observation_id` and mandatory paired `action_receipt_ref`, then uniquely resolves observation -> receipt.gate_ref -> gate.request_ref -> request.target/input_refs. Gate/receipt agreement includes run/attempt/step, action/version, target, fixture revision and resource digests. Supplied unpaired observations remain analysis-only.
- Current invariant: `(run_id, attempt_id, test_id)` binds exactly one step/receipt/gate/fixture set; observation ID is unique within run/attempt. Repeated inherited values must agree. Identical delivery de-duplicates; conflicting reused identity, cross-attempt/fixture or ambiguous reference rejects, preserving originals.
- **Settled appendix line 80 explicitly checked:** F06-N has two fixed negative instances. The second presents A's observation for patched/restarted B with conflicting reuse of the full `(run_id,attempt_id,test_id)` key **and** scoped `observation_id`, rather than merely matching test/entity/window. Expected result resolves the authoritative chain and rejects conflicting reuse; B with an evidenced action and no usable B observation is telemetry-gap. AC12 trace at appendix 121 includes F06-N/B/P.
- Documentary adverse-timeline check: A -> B changes fixture/attempt identity; A's chain cannot satisfy B. Reusing the entire key or observation ID conflicts and rejects instead of overwriting; retransmitting identical evidence is only de-duplication. Both the reference-chain rule and a case explicitly specifying full scoped-key conflict now exist.
- Smallest fix applied in author-owned documents; no new service, duplicate target schema, runtime proof or executed negative test claimed.

### F02 — P2 / evaluation command side-effect ownership — closed

- Original defect: execute-command documentation omitted automatic shared report/history/archive writes, although broad reporting was reserved for integration ownership. Affects REQ-CLV-07 and one-owner-per-output implementation contracts.
- Source evidence: `scripts/evals/index.ts:76–105` calls scoreRun and generateReport; `scripts/evals/reporter.ts:186–235,694–700` writes history, archive projections and aggregate report.
- Current appendix 183 discloses the full write chain; paragraph 188 applies integration ownership or explicit serialized handoff to every execute path, including baseline, for the command's entire lifecycle and every affected output. No concurrent writer, fictitious no-report switch or out-of-scope runner change.
- Documentary ownership check: evaluation finishes -> automatic scoring/projections remain under the same authorized integration ownership/handoff until completion. This closes the omitted side-effect path without claiming historical transcripts or grades are rewritten.

### F03 — P3 / lane-specific provenance applicability — closed

- Original defect: “every record” implied model/arm/prompt/transcript metadata even for non-model distribution/runtime evidence, risking rejection of valid evidence or fabricated provenance.
- Current appendix 43–47 distinguishes case/run envelope from nested authoritative SRS records. Model-producing A and applicable L/R portions require model provenance; non-model D/L/R model-only fields are explicitly null/not-applicable with reason. Nested references must resolve unambiguously to their envelope and action identity.
- Documentary applicability check: a D sync receipt can retain authentic source/host/case evidence without inventing a model or prompt; a model-producing A answer still requires exact model/settings/arm/transcript metadata. Generic envelope identity cannot replace the F01 observation-to-action chain. No fifth product mode.

## Explicit non-findings

- E05 source citation: `.agents/workflows/cyber-exercise.md:12–15` are source lines for preflight/control/validation/adjudication, not workflow steps numbered 12–15. Current SRS E05 at line 20 says preflight through adjudication. No substantive defect retained.
- Baseline amendment is explicitly proposed and existing scoped-validation prohibitions preserved. A lab label, G2 or publication does not grant execution permission.
- Model infrastructure versus refusal distinctions, no refusal-driven provider switching, fixed denominators and unresolved-provider cells are explicit and internally consistent.
- Missing live controls, model runs, production drills or release evidence do not block review of the proposed design. Full acceptance remains incomplete until required future lanes run; unsupported active families are not silently dropped.
- No need for caches, queues, replicas, runtime service or mandatory diagram in this registry/documentary scope.
- Expired authorization does not silently authorize cleanup; surviving teardown authority and unverified residual state are explicit.

## Nine-axis review — confirmed documentary scope

Profile: security-sensitive registry/workflow contracts, proposed design. Applicable axes weighted equally; N/A axes excluded. Scores judge documented mechanisms and planned validation, not operational efficacy. Remaining pre-execution inputs are gates, not invented measurements.

| Axis | Score | Evidence / scope rationale |
| --- | --- | --- |
| Requirements | 9/10 | Seven REQs, nineteen ACs, accountable roles and gates, bounded normal/alternate/error flows. Shared carrier and lane applicability now explicit (SRS 33–58,124–134; appendix 43–47,108–128). Named execution owners still required before their gates. |
| Capacity evidence | N/A | No service QPS/storage/bandwidth promise or new store. Corpus counts/fixed denominators are defined; scenario limits and budget require approval before execution, not guessed numbers (SRS 177–185; appendix accounting). |
| Redundancy | 9/10 | Proposed host independent stop path, expiry enforcement, unknown in-flight effects and reconciliation/cleanup disclosure fit the bounded safety objective (SRS capability table and adverse timelines). Runtime control availability remains a G3 proof requirement, not an observed property. No production HA objective. |
| Data scaling | N/A | No database/sharding/growth architecture. Existing evidence artifacts reused; material evidence identity/custody/correction risks assessed under requirements/observability rather than awarded infrastructure points. |
| Caching | N/A | No measured hot path/cache; engagement-wide cached authorization is expressly insufficient (SRS 90). |
| Async offload | N/A | No queue service or drain-SLO promise. Existing bounded executor and stop-dominates-dispatch/reconciliation rules suffice for the proposed contract scope. |
| Observability | 9/10 | Unique receipt/gate/request/fixture inheritance, rejection/custody rules, scoped negative case, stop/cleanup timelines and frozen measurement denominators are explicit. A/R/L/D claims separated (SRS 124–148; appendix 36–47,80, accounting). |
| Rollout | 9/10 | Dormant opt-in candidate, frozen/disjoint ownership, consumer smoke, explicit gates and previous-revision rollback with immutable evidence. Full execute side-effect ownership now covered (SRS rollout; appendix 183–188). |
| Cost proportionality | 9/10 | Separate compact contract preserves offline semantics without a new platform. Paid-run eligibility, exact configs, budget/cap and measured-only cost reporting are explicit; no fabricated rate or latency promise. |

Applicable-axis score: **45/50 (90%)**, proposed-design scope only. Equal weighting; four N/A axes excluded. This aggregate cannot offset any material flow-gate failure.

Non-compensable gates: no unresolved material documentary correctness, authorization, sensitive-data/deletion, migration or recoverability mechanism defect found. Exact evidence joins and conflicting identity rejection are now explicit. Authority remains host-enforced and per action; teardown after expiry requires surviving authorization. Synthetic-only inputs, controlled originals/redaction and pre-collection retention assignment remain mandatory. Existing enum records require no migration. Lost acknowledgements stop active replay and require authorized reconciliation; cleanup uncertainty remains visible. These are documented mechanisms/planned checks, not runtime passes or production recovery claims.

Semantic rubric: scope/assumptions 2/2; quantitative coherence 2/2 (applicable corpus and denominator arithmetic only: seven logical supported cases require 7/7 to reach 90%); mechanism/outcome 2/2; invariant/failure 2/2; trade-off/simplicity 2/2; changed-constraint adaptation 2/2 (expiry/drift/stop, missing controls, provider failure, patched-fixture/reused-key evidence); HLD/LLD/view routing 2/2; evidence/provenance 2/2. **Sound, 16/16, no hard failure identified at proposed-design scope.** This is independent documentary adjudication, not lexical scoring or operational certification.

## Outcome and next gate

**Proposed design ready for human G2 review.** FS01–FS12 confirmed; F01–F03 accepted, corrected and independently closed in documents. No remaining material design findings in this bounded review.

- `workflow`: review-system-design; `slug`: cyber-lab-validation; `feature_status`: design_ready.
- `completed_evidence`: confirmed extraction; all-REQ/AC documentary trace; canonical/source review; independent settled-correction review, including the exact full scoped-key/observation-ID negative instance.
- `missing_evidence`: human G2 design/amendment decision and named gate owners; scenario-specific G3 authority/host proof/limits; exact eligible provider configurations and separately authorized budget; fresh G4 A/R/L/D evidence and independent acceptance; G5 publication approval.
- `decision_needed`: requesting operator/named engineering owner and independent security review decide G2 boundary/amendment. This reviewer supplies neither human approval nor execution authority.
- `recommended_next_workflow`: implementation-readiness **after** human G2 approval and named prerequisite owners; parent coordinates the approval gate first.

Design readiness is not implementation-readiness approval, permission to execute lab actions or paid evaluations, model compatibility acceptance, UAT, publication, release or deployment. Unsupported active families remain unaccepted; no committed scope silently removed.

## Correction retrospective — proposal only

Root cause: procedure/interface precision. Original contracts specified exact joins without mandatory carriers/identity scopes; command rows omitted transitive writes; blanket provenance fields ignored non-model lanes. The first F06-N correction then described reused test/entity/window rather than explicitly instantiating the full frozen key. Better approach: walk an adverse restart/fixture change using exact key fields, trace the complete reference and called-write chains, and define per-lane field applicability before freezing interfaces. Evidence: F01–F03 and the settled appendix line 80. No trigger miss identified for this bounded review. Candidate status proposed; no maintenance approval, held-out evaluation, registry promotion or root instruction change. `common-session-retrospective` and `common-learning-log` were read; `AGENTS_LEARNING.md` mutation is outside the sole-output ownership fence, so this minimal proposal remains here for parent disposition.

## Skills, audit and cost

Loaded review-system-design through skill URI; project MCP loaded product-requirements, common-software-requirements, common-subagent-driven-development, system-design-artifact-intake, system-design-review and common-architecture-diagramming. Read trust-review-policy and semantic-evaluation references. MCP session compliance audit returned six project skills with no routing coverage gaps; direct read additionally loaded review-system-design and startup skill (worker exemption).

Exact host tokens/pricing unavailable; no monetary estimate or benchmark cost claimed. Cost tool requested at final handoff. No executable verification was appropriate or performed under the read-only documentary review brief.
