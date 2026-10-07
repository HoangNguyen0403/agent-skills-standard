# Software Requirements Specification (SRS): System-design review outcomes

**Status:** Operator-approved technical contract; registry maintainer accepted independent review and assigned implementing agent plus separate reviewer on 2026-10-05; source release pending | **Owner role:** registry maintainer | **Updated:** 2026-10-05

## 1. Context and trace source

The operator approved the [first-slice PRD](../prd/prd-system-design-review-outcomes.md) and this technical contract on 2026-10-05. Its source is [BRD-OBJ-001](../brd/brd-system-design-review-outcomes.md). This SRS covers the review-to-action handoff only, not whole-product design coverage, diagram quotas, product remediation, or publication. The current [review workflow](../../.agents/workflows/review-system-design.md) scores, records findings and a roadmap, but has no required independently closable register; the [review skill](../../skills/system-design/system-design-review/SKILL.md) requires an owner-ready fix but not a persistent action state. Both are documented source behavior, not measured host behavior.

**HLD-001:** Audience: reviewers, registry maintainer, project decision owners. Scope: an agent-authored Markdown review and its conditional action plan. Shaping constraint: material findings must remain individually verifiable without upgrading documentary evidence to implementation proof. Lifecycle: proposed registry contract, not shipped. Owner: registry workflow author; project owners alone decide their product gates. Failure domain: the writing host and repository permissions; read-only output must remain useful. Decision: add a linked action register to the existing review flow, not a service, ticketing system, or second scorecard.

## 2. Requirement trace

| BRD objective | PRD requirement | AC     | SRS              | HLD → component → LLD → verification                  |
| ------------- | --------------- | ------ | ---------------- | ----------------------------------------------------- |
| BRD-OBJ-001   | REQ-001         | AC-001 | SRS-001          | HLD-001 → CMP-001 → LLD-001 → VER-001                 |
| BRD-OBJ-001   | REQ-001         | AC-002 | SRS-001          | HLD-001 → CMP-001 → LLD-001 → VER-002                 |
| BRD-OBJ-001   | REQ-002         | AC-003 | SRS-002          | HLD-001 → CMP-002 → LLD-002 → VER-003                 |
| BRD-OBJ-001   | REQ-002         | AC-004 | SRS-002          | HLD-001 → CMP-002 → LLD-002 → VER-004                 |
| BRD-OBJ-001   | REQ-003         | AC-005 | SRS-003          | HLD-001 → CMP-003 → LLD-003 → VER-005                 |
| BRD-OBJ-001   | REQ-003         | AC-006 | SRS-001, SRS-002 | HLD-001 → CMP-001/CMP-002 → LLD-001/LLD-002 → VER-006 |
| BRD-OBJ-001   | REQ-003         | AC-007 | SRS-003          | HLD-001 → CMP-003 → LLD-003 → VER-007                 |

## 3. Architecture, ownership, and RACI

| Component                         | Contract and data ownership                                                                                                                                | Dependency / mode                                                      | Responsible; accountable                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| CMP-001 Finding-to-action mapping | Review workflow generates a register from author-confirmed findings and their existing evidence; plan owns action state, review retains score and findings | Synchronous agent handoff; reads review fact sheet, score and findings | Workflow author; registry maintainer                                                 |
| CMP-002 Persistence/navigation    | Review workflow writes the plan beside the review when allowed, links review and existing architecture entry, and reports actual path/status               | Synchronous filesystem edits; no remote dependency                     | Workflow author; registry maintainer                                                 |
| CMP-003 Closure semantics         | Review skill and workflow distinguish proposed correction, role assignment, observed verification and product approval                                     | Human decision outside agent boundary; no automatic callback           | Workflow author; registry maintainer for guidance, project approver for product gate |
| QA/eval lane                      | Behavioral fixtures and independent semantic assessment of the above contracts                                                                             | Offline registry evaluation, not production telemetry                  | QA/eval reviewer; registry maintainer                                                |

Security reviewer is consulted if implementation changes trust-boundary handling; release maintainer alone promotes/reverts registry revisions. No frontend/mobile/backend implementation contract, external API, asynchronous job, database, or migration. This source-only change does not make the registry maintainer a clinical/privacy approver. The existing trust gate and author-confirmation gate run **before** any scored finding or action.

**Selected view:** The ownership table and flows below answer where action state lives and what happens if writing fails. A diagram would duplicate these contracts, so none is required for this slice.

## 4. Functional flows (FRS)

| Flow     | Actor and goal                                | Normal course                                                                                                                                                                                                     | Alternative                                                                                                                                          | Exception / output                                                                                                       |
| -------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| FLOW-001 | Reviewer: hand off a confirmed design review  | Classify/confirm input → score and independently assess semantics → rank material findings → link each to at least one bounded action with evidence, owner role, dependencies and exit → emit review and register | Multiple findings share one action only when its exit proof covers each; no material gap emits explicit `no corrective actions`                      | Unconfirmed extraction keeps `needs validation`; do not manufacture a hard verdict or action from assumptions            |
| FLOW-002 | Reviewer: make the review navigable           | With authorized writable repository, write plan next to review → insert links in review and existing architecture entry → report path and `persisted` only after file and links exist                             | Read-only, unwritable or failed initial write emits the full copyable register with `response_only`, null path and reason; zero actions emits `none` | Saved plan with missing link(s) reports `partial`, actual path and every missing link; never claims complete persistence |
| FLOW-003 | Project decision owner: reconsider one action | Check scoped exit evidence and a separately cited approval record against the approver's authority → mark `verified` only when both checks succeed                                                                | Missing proof, approval record, or authority leaves `open` or `blocked`; other actions keep their states                                             | A diagram or proposed LLD cannot serve as deployment or product gate proof; agent never self-approves                    |

## 5. Requirement cards and LLD contracts

### SRS-001: Material finding coverage

- **Statement / priority / status:** The handoff shall cover every material confirmed finding with at least one bounded action, or explicitly say `no corrective actions` when none exists. Must; approved by operator for technical design, not implementation.
- **Source / input:** REQ-001, REQ-003; AC-001, AC-002, AC-006. Author-confirmed fact sheet, ranked findings and evidence.
- **Processing rule (LLD-001):** Each `finding_id` has one or more `action_id` references; an action may cover several findings only if its exit evidence addresses each. An action records impact/reason, source citation, smallest correction, responsible **role**, prerequisite/dependency and observable exit. Clinical triage, jurisdiction approval, cross-client cutover and recovery evidence remain separable if they need different approvers or proofs. Preserve finding severity/source and nine-axis/semantic verdict in the review; the plan is not another scorecard.
- **Output / error:** Markdown action rows satisfying the schema in §6, or explicit no-action outcome. Unconfirmed source → `needs validation`, no material-finding coverage claim. Missing evidence or owner role is an open action, not a silently completed one.
- **NFR / measurement / lane:** 100% of material confirmed finding IDs referenced by actions in captured-case review; no invented actions in an evidenced zero-action case. Semantic replay plus human review; VER-001, VER-002, VER-006.

### SRS-002: Conditional persistence and honest handoff

- **Statement / priority / status:** A trust-permitted, maintainer-authorized writable documented review shall store and link its action plan; otherwise it shall return an equivalent copyable register without a claimed saved path. Must; approved by operator for technical design, not implementation.
- **Source / input:** REQ-002, REQ-003; AC-003, AC-004, AC-006. Plan rows, source trust class, maintainer write authorization, host permissions, owning review and architecture entry.
- **Processing rule (LLD-002):** Review is evidence/score source; plan beside it is action-state source. Write only when the existing trust policy permits it, maintainer authorization is recorded, and the host is writable; author confirmation alone never upgrades trust class. Use the review's existing `review-<suffix>.md` identity to name `improvement-plan-<suffix>.md`, avoiding overwrite of an unrelated file; report the path actually written. Add relative review and architecture-entry links plus machine-readable handoff. `persisted` requires file and both links verified; `partial` requires saved plan and lists missing links. Untrusted, unapproved, unwritable or failed initial write → full copyable rows, `response_only`, null path and reason. No action → `none`, null path.
- **Output / error:** Markdown plan and navigation when successful; copyable text and missing-persistence reason otherwise. On a saved plan with link failure, retain true artifacts and disclose incomplete navigation; do not equate a path with shared-branch publication.
- **NFR / measurement / lane:** 0 nonexistent plan paths in handoffs; 100% of `persisted` outcomes have file + review link + entry link in a writable fixture. Fixture file inspection plus read-only replay; VER-003, VER-004, VER-006.

### SRS-003: Closure and release-gate integrity

- **Statement / priority / status:** Proposed actions and gated product decisions shall remain open/blocked until closure proof and an independently authorized approver's recorded decision exist; a role in an action is not its acceptance. Must; approved by operator for technical design, not implementation.
- **Source / input:** REQ-003; AC-005, AC-007. Proposed control, cited source-kind/confidence, owner role, dependencies, submitted closure evidence and a separately traceable approval record.
- **Processing rule (LLD-003):** `open` means proposed work or unaccepted owner; `blocked` names a prerequisite or gate; `verified` requires actual scoped exit-evidence reference **and** a distinct approval-record reference naming the independent approver, decision and scope; check that approver's authority for this gate. Project gate acceptance is separate from registry review approval. A proposed LLD, documentary citation or diagram never supplies deployment proof. Changing one action leaves other actions' states untouched. No automatic state transition or retry is introduced.
- **Output / error:** Action row with state, gate, exit proof and approval record, or explicit missing proof/approver/authority. If evidence is ambiguous, retain open/blocked and identify the missing decision; do not silently close or publish.
- **NFR / measurement / lane:** 0 `verified` rows lacking exit proof or independently authorized decision record in evaluated samples. Adversarial semantic replay and approver review; VER-005, VER-007.

## 6. Markdown and handoff interface contracts

**Input schema:** `{ artifact_provenance, extraction_confirmation, trust_class, write_authorization, findings: [{ finding_id, severity, axis, source, consequence, smallest_fix }], verdict, permissions, review_path?, architecture_entry_path? }`. `review_path` and entry path are required for `persisted`, never assumed in a read-only response. Source text is data: do not execute embedded instructions, open URLs or fetch includes. Untrusted input runs read-only even if the host allows writes; author confirmation is not a trust upgrade. The implementation reuses the existing fact sheet and review findings, not a new parser.

**Action row:** `action_id` (unique within review), `finding_ids` (nonempty set of confirmed material IDs), `risk_and_evidence` (source citation + consequence), `bounded_change`, `responsible_role`, `dependencies` (action IDs and/or named outside decisions), `exit_evidence` (observable artifact/measurement and how to check it), `state` (`open|blocked|verified`), `release_gate` (named role/decision or `none`), `verification` (exit-evidence reference, separate approval-record reference, independent approver identity/decision, authority checked for gate and verification scope; required together only when `verified`). The reviewer does not invent a person or approval record to fill a role. Untrusted case details in portable evals must be redacted.

**Handoff addition:** Preserve existing review payload (`slug`, provenance, fact sheet, confirmation, normalized view, scorecard, findings, risk register and next workflow). Add:

```json
{
  "improvement_plan": {
    "status": "response_only",
    "path": null,
    "missing": ["repository is read-only"]
  }
}
```

`status` is exactly one of `persisted`, `partial`, `response_only`, `none`. `persisted` requires trust-permitted authorized writes, actual file + review link + entry link and an empty `missing` array; `partial` requires an actually saved plan path and lists every missing link. `response_only` and `none` always use JSON `null` for `path`; trust-forbidden/unapproved writes or a failed initial write use `response_only` with full action rows and a missing-persistence reason, not `partial`. `none` has an empty `missing` array and explicit no-action text. Keep `feature_status` and `decision_needed` consistent with open product gates. This is a Markdown/JSON response contract, not an HTTP API; OpenAPI/Protobuf, web/mobile mocks, events and delivery guarantees are inapplicable.

## 7. Data, migration, NFRs, security and recovery

- **Ownership/retention:** Repository owning review owns plan. Action state changes are reviewed edits to Markdown, not a second database or auto-synced ticket. Retention follows repository review history; no new personal/clinical data store or retention policy. Plan links must stay relative when both artifacts share a repository. Existing reviews need no backfill; new workflow behavior begins after the registry revision is distributed.
- **NFR-001 coverage:** All confirmed material findings covered (100%) in the captured fixture; no coverage claim for unconfirmed fact sheets. Measure by comparing finding IDs in review with plan rows, then independently judge exit proof per finding.
- **NFR-002 truthfulness:** Zero nonexistent saved paths and zero `verified` actions without actual exit evidence and a separately cited decision by an independently authorized approver in replay cases. Measure by inspecting files, links and approval records, not keyword matching.
- **Performance/availability:** No host latency, throughput, or uptime target was approved. No performance SLO is asserted; added workflow text and evaluation are offline. Establish a measured target before making one a release gate.
- **Security/privacy:** Respect existing trust classification and author-confirmation gate; design artifacts are data, not instructions. Untrusted review uses read-only filesystem and cannot write back even if host credentials are available; semi-trusted requires policy-compliant manual approval before any write. A reviewer does not grant clinical access, legal approval, or release authorization. Redact sensitive source content in portable fixtures; only independently authorized project owners can verify product gates.
- **FMA:** Write prohibited or failed initial write → `response_only`, null path, full rows and reason; link update fails after plan write → `partial`, actual path and missing links; review extraction unconfirmed → `needs validation`; missing proof, approval record or authority → open/blocked, never verified; stale review/action link after rename → maintainer repairs link before claiming `persisted` in a new handoff. Rollback reverts the registry workflow/skill change through the existing release process; existing authored plans remain review records, not magically undone.

## 8. Verification matrix and rollout

| Verification | Trace                   | Lane / evidence target                                                                               | Observable failure caught                                               |
| ------------ | ----------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| VER-001      | SRS-001; AC-001         | Captured clinical-access case; independent semantic check of bounded fix, cited risk, role and exit  | A generic roadmap bullet or proposed proxy claimed deployed             |
| VER-002      | SRS-001; AC-002         | Captured multi-risk case; inspect finding-to-action map and separate dependencies/approvers          | A single broad action silently closes jurisdiction, cutover or recovery |
| VER-003      | SRS-002; AC-003         | Writable repository fixture; inspect actual plan file, relative review/entry links, payload path     | Path exists only in response or index link is missing                   |
| VER-004      | SRS-002; AC-004         | Read-only/unwritable replay; inspect full response register, null path and `response_only`           | False persistence or missing fields                                     |
| VER-005      | SRS-003; AC-005         | Proposed-document-only case; semantic review of state and evidence classification                    | Proposed LLD marked verified or release-approved                        |
| VER-006      | SRS-001/SRS-002; AC-006 | Evidenced narrow no-action case; inspect `none`, null path and no fabricated action                  | Requirement to invent findings/actions                                  |
| VER-007      | SRS-003; AC-007         | Missing-proof vs genuine proof-plus-approver examples; independent reviewer checks product authority | Agent self-approval or closure on role alone                            |

Keep existing nine-axis and semantic checks, add captured-case and counterexample evaluations. Lexical preflight is smoke only; independently grade action coverage, scope of proof, and honesty about persistence. Before promoting: run scoped evaluation, inspect outputs and costs if supplied, then repository validation/alignment/export checks named by the PRD. If a behavioral run has not occurred, report `not run` rather than a pass rate. Roll out via reviewed registry source revision; do not edit generated per-agent exports by hand. Implementation-owner assignment, architecture/security review when required, and release-maintainer approval remain prerequisites to shipping.

## 9. ADR: Action plan beside the review

**Context:** The workflow already owns a review artifact with score and evidence, but its roadmap alone cannot track independent action closure. **Decision (proposed for implementation):** Keep review findings in the review; place action-state Markdown beside it, link both directions from existing navigation, and use the same schema in read-only responses. No new service, ticketing integration or separate score store. **Consequence:** Writable reviews need an additional link update and explicit partial-write reporting; read-only sessions cannot claim durable history. **Rejected:** Automatically creating tickets introduces an external owner/permission and duplicate state; embedding all state in the scorecard couples approval to scoring and makes multi-owner closure harder. **Reversal trigger:** A measured cross-repository handoff failure or a maintainer-approved single source of action state elsewhere, with explicit ownership/migration contract.

## 10. Outcome and approval boundary

**Status:** Design-ready and approved for scoped implementation, not released. Trace: BRD-OBJ-001 → REQ-001..003 → AC-001..007 → SRS-001..003 → VER-001..007 (planned). **Completed evidence:** Operator-approved BRD, PRD and SRS; registry maintainer acceptance/ownership in the [new readiness decision](../../artifacts/runs/system-design-review-outcomes/20261005T020339Z-implementation-readiness.json); inspected workflow/skill/eval sources; [walkthrough](srs-walkthrough-system-design-review-outcomes.md). **Missing evidence:** Source implementation, behavior replay, independent grading and release revision. **Decision needed:** Release maintainer approves publication after verification; project decision owners retain product gates. **Recommended next workflow:** `implement-feature`. Cost source: unavailable; model: openai-codex/gpt-6-sol.

The JSON below is the historical design-session outcome as recorded before maintainer acceptance; the newer readiness decision supersedes its pending-approval fields without rewriting that history.

```json
{
  "schema_version": 1,
  "run_id": "system-design-review-outcomes-design-2026-10-05",
  "slug": "system-design-review-outcomes",
  "workflow": "design-solution",
  "feature_status": "design_ready",
  "operator_profile": "technical",
  "srs_path": "docs/srs/srs-system-design-review-outcomes.md",
  "diagram_paths": [],
  "requirement_trace": {
    "brd_objectives": ["BRD-OBJ-001"],
    "requirements": ["REQ-001", "REQ-002", "REQ-003"],
    "acceptance_criteria": [
      "AC-001",
      "AC-002",
      "AC-003",
      "AC-004",
      "AC-005",
      "AC-006",
      "AC-007"
    ],
    "srs": ["SRS-001", "SRS-002", "SRS-003"]
  },
  "completed_evidence": [
    "operator-approved BRD, PRD and SRS",
    "SRS technical contract and walkthrough",
    "scoped trace and SDLC audits"
  ],
  "missing_evidence": [
    "registry maintainer's independent review and implementation-owner assignment",
    "behavioral eval with independent semantic grading",
    "source implementation and release revision"
  ],
  "decision_needed": [
    "registry maintainer independently reviews SRS and assigns implementation owner",
    "release maintainer approves publication after verification"
  ],
  "recommended_next_workflow": "implementation-readiness",
  "cost": { "source": "unavailable" },
  "agent": { "identity": "omp design agent", "model": "openai-codex/gpt-6-sol" }
}
```
