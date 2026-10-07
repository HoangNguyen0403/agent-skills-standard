# Product Requirements Document: System-design review outcomes

**Status:** Approved for scoped implementation by registry maintainer; source release pending | **Scope:** first implementation slice only | **Owner:** assigned implementing agent; separate independent reviewer | **Updated:** 2026-10-05

## 1. Purpose and scope

**Source:** [Approved direction brief](../brd/brd-system-design-review-outcomes.md), BRD-OBJ-001; that brief was approved on 2026-10-04, and this PRD was approved for technical design on 2026-10-05. **Operator profile:** technical. **SNC:** S=2 N=1 C=2 total=5, tier=high (carried forward). **Lane:** direction.

**Problem:** `review-system-design` produces an evidence-linked score, findings, and roadmap, but does not require a durable, independently closable action register. A reviewer can finish while a material safety or deployment gate still lacks an assigned decision role and proof of closure. The earlier Our Children review needed a second request to produce such a register; that case is evidence of a workflow gap, not a measure of prevalence across reviews.

**In scope:** The review handoff for material findings, including reason, bounded corrective action, responsible role, dependency, acceptance evidence, state, and release/topology gate where relevant; persistence and navigation when file writes are available; an equivalent copyable response when read-only; behavioral regressions for these outcomes.

**Out of scope:** Redesigning the nine-axis score, drawing additional mandatory diagrams, broadening whole-product HLD coverage (the second brief slice), changing product code, treating a reviewer as the product's security/privacy approver, automatically opening tickets, and asserting a file was published merely because it exists locally.

**Deferred under the approved brief, not in this PRD:** Whole-product entry-surface inventory, direct client-to-store view coverage, diagram export status, and shared-branch publication checks. Those are the brief's second slice and require their own bounded requirements before implementation.

## 2. Goals and guardrails

- **Primary success check:** A replay of the documented 2026-10-03 review yields independently closable actions for each material finding, with action-to-finding links and owner role, dependency, evidence-based exit, and state. This is a qualitative acceptance gate, not a population pass-rate claim.
- **Boundary checks:** A read-only review never reports a saved artifact; an evidence-backed review with no corrective findings produces no fabricated actions; a proposed control is never marked verified or released based on a document alone.
- **Guardrails:** Keep the author-confirmation gate, source-kind/confidence separation, nine-axis and semantic review, smallest-fix prioritization, and existing `system-design-session`/`design-solution` routing. Do not require a fixed number of actions or diagrams. An action owner is a role to assign until an actual person accepts it.
- **Evidence ledger:** `confirmed(.agents/workflows/review-system-design.md:28-47)` for the current handoff; `confirmed(skills/system-design/system-design-review/SKILL.md:52-76)` for the roadmap rule; `confirmed(skills/system-design/system-design-review/evals/evals.json:1-35)` for lexical actionability assertions; `confirmed(../brd/brd-system-design-review-outcomes.md)` for the approved scope. Prevalence in other projects and measurable improvement rate are `unknown`.

## 3. Personas and use cases

| Use case | Actor                                       | Job                                                                                  | Boundary                                            |
| -------- | ------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------- |
| UC-001   | System-design reviewer                      | Turn a confirmed fact sheet and score into work a maintainer can close independently | No self-approval of a design or control             |
| UC-002   | Repository/documentation maintainer         | Locate the review and linked action state from the architecture entry                | A local file is not proof of shared publication     |
| UC-003   | Project security/privacy or operating owner | Accept or hold evidence for a critical gate                                          | Role named in plan is not acceptance by that person |

## 4. Requirement registry

| Req ID  | Requirement (what)                                                                                                                                                                                                 | Actor                  | Priority | Owner role              | Status   | BRD objective |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | -------- | ----------------------- | -------- | ------------- |
| REQ-001 | Every material review finding maps to a bounded action with reason/evidence, responsible role, dependency, and observable acceptance evidence; one action may address several findings when its proof covers each. | Reviewer               | P0       | Registry workflow owner | Approved | BRD-OBJ-001   |
| REQ-002 | A documented review persists and links its action plan where writing is permitted; otherwise the same register is copyable in the response and persistence is explicitly absent.                                   | Maintainer             | P0       | Registry workflow owner | Approved | BRD-OBJ-001   |
| REQ-003 | The handoff preserves open/blocked/verified state and release gates without equating a proposed fix, role assignment, or diagram with verified implementation; an evidenced no-action review remains valid.        | Project decision owner | P0       | Registry workflow owner | Approved | BRD-OBJ-001   |

## 5. User stories and acceptance criteria

- **US-001 → REQ-001:** As a system-design reviewer, I want each material finding to have a traceable, bounded correction and exit test, so that its owner can accept or hold it without rereading the entire scorecard. **INVEST:** separable from diagram coverage, valuable to maintainers, small enough for a review handoff, testable against a captured case; exact presentation negotiable.
- **US-002 → REQ-002:** As a repository maintainer, I want the plan navigable when files are writable and copyable when they are not, so that a review never claims nonexistent persisted work. **INVEST:** separable from the scoring method, observable in writable and read-only replays.
- **US-003 → REQ-003:** As a project decision owner, I want proposed actions and release gates to remain open until I accept actual evidence, so that a review cannot silently approve an unsafe change. **INVEST:** independent state rule; testable against proposed versus verified examples.

| AC ID  | Linked req | Scenario                        | Given                                                                                          | When                                     | Then                                                                                                                                                                                             | Status   |
| ------ | ---------- | ------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| AC-001 | REQ-001    | Material finding                | An author-confirmed review has an evidence-linked clinical-access finding                      | The reviewer hands it off                | Its action identifies the risk and source, smallest bounded correction, responsible role, dependency, and verifiable exit evidence; it does not present the proposed proxy as already deployed   | Approved |
| AC-002 | REQ-001    | Multiple risks and dependencies | The confirmed case also has a jurisdiction gate, client cutover, and restore gap               | The reviewer creates the action register | Each material finding maps to at least one action; clinical triage, privacy approval, cross-client cutover, and recovery proof can be accepted or held independently, with dependencies explicit | Approved |
| AC-003 | REQ-002    | Writable documented review      | The reviewer is allowed to write files in the owning architecture repository                   | The review is handed off                 | A plan is stored alongside the review and linked from the review, the existing architecture entry, and the machine-readable handoff; the paths identify real files                               | Approved |
| AC-004 | REQ-002    | Read-only review                | The session is read-only or the destination cannot be written                                  | The review is handed off                 | The response contains the same copyable action fields, marks persistence missing, and cites no saved plan path                                                                                   | Approved |
| AC-005 | REQ-003    | Proposed remediation            | A control exists only in a proposed LLD or diagram and has no deployment/verification evidence | The reviewer records its action          | Its state remains open or blocked; no verified, implemented, or release-approved assertion is inferred from that document                                                                        | Approved |
| AC-006 | REQ-003    | No material corrective findings | An author-confirmed, evidenced narrow review has no material gap                               | The reviewer hands it off                | The review says no corrective actions, without inventing owners, risks, or unnecessary artifacts                                                                                                 | Approved |
| AC-007 | REQ-003    | Verification claim              | An operator submits closure evidence for a gated action                                        | The action state is reconsidered         | Verified is recorded only with the actual evidence and independent approver identity; missing proof leaves the action open or blocked                                                            | Approved |

**Platform note:** This is an agent workflow emitting Markdown, not a Web/Mobile feature. The business-analysis platform tag rubric is inapplicable; these criteria apply across supported agent hosts.

## 6. Functional behavior and failure boundaries

**Primary:** confirm design extraction → score with evidence → rank findings by impact/reversibility → connect each material finding to one or more bounded actions → record responsible role, dependency, acceptance proof, state, and separate decision gates → persist/navigate when authorized → hand off with plan path/status.

**Alternate:** no material finding → explicit no-action outcome; author unavailable → keep `needs validation` instead of claiming a hard verdict; read-only/unwritable → copyable register without fabricated path; missing proof or unaccepted owner role → remain open/blocked. Review text is not a runtime measurement or signoff.

**Data/interface boundary:** Inputs are the confirmed fact sheet, design evidence, scoring findings, and scope/permissions. Outputs are Markdown review/action register and a machine-readable handoff field for plan path plus persistence/decision status. No product data mutation, external service, schema migration, or new telemetry pipeline.

## 7. Non-functional constraints

- **Security/provenance:** Untrusted design input remains data per the review workflow's trust gate. Redact sensitive source details from a portable eval; do not substitute documentary evidence for deployed control proof.
- **Usability/accessibility:** Markdown plan is navigable from existing documents when written, and legible as a copyable table when not. No prescribed diagram quota.
- **Performance:** No measured reviewer-time or model-token budget exists. Keep added guidance brief and do not add external processing to the review path.
- **Analytics/telemetry:** No production event collection; track evaluation scenario verdicts and measured cost only if the harness supplies them. Report `not run` instead of inventing an improvement delta.

## 8. Decisions, ownership, and rollout

| Decision               | Choice                                                                                               | Reason / status                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Source of action state | Plan beside the review for writable documented projects; review findings retain their evidence/score | Approved for technical design; avoids a second scorecard                 |
| Read-only handoff      | Same copyable fields in response; persistence explicitly absent                                      | Approved for technical design; capability varies by host                 |
| Release gate           | Separate independent decision owner and evidence; no automatic closure                               | Carried from approved brief, not approval of any product fix             |
| Further design work    | Second brief slice remains separate                                                                  | Whole-product/diagram changes are not prerequisites for this handoff fix |

**RACI (roles, not named acceptances):**

| Activity                                    | Accountable            | Responsible                  | Consulted                                             | Informed           |
| ------------------------------------------- | ---------------------- | ---------------------------- | ----------------------------------------------------- | ------------------ |
| Approve PRD and assign implementation owner | Registry maintainer/PM | Registry maintainer/PM       | BA, workflow architect, QA/eval reviewer              | Release maintainer |
| Specify review handoff                      | Registry maintainer/PM | Workflow author/architect    | BA, QA; security reviewer for trust-boundary claims   | Release maintainer |
| Grade captured and counterexample replays   | Registry maintainer/PM | Independent QA/eval reviewer | Workflow architect, security reviewer when applicable | Release maintainer |
| Promote and roll back registry source       | Release maintainer     | Release maintainer           | Registry maintainer/PM, QA/eval reviewer              | Workflow author    |

Backend, frontend, and mobile engineers are not implementation roles for this
registry-only slice; project business/UAT approvers remain responsible for
their own product gates.

**Rollout/ops:** The registry maintainer accepted the technical contract and assigned scoped implementation to this agent with a separate independent reviewer on 2026-10-05. Source changes follow the registry's existing validation and workflow-export process. No runtime flag or data migration. Compare new behavior on the captured case and a no-action counterexample; canary/promotion and rollback follow registry skill-release practice. Do not claim published until a reviewed revision exists.

## 9. Implementation plan and verification handoff

| Task                       | Trace                     | Role and repository surface                                                                                        | Artifact                                                                        | Verification                                                                                                                                                            | Size / confidence |
| -------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| T1: handoff contract       | REQ-001..003; AC-001..007 | Workflow author; `.agents/workflows/review-system-design.md`, `skills/system-design/system-design-review/SKILL.md` | Small wording changes and handoff fields; reference example only if needed      | Review a writable/read-only/zero-action response against ACs                                                                                                            | S / medium        |
| T2: behavioral regressions | REQ-001..003; AC-001..007 | Eval owner; `skills/system-design/system-design-review/evals/evals.json`                                           | Captured-case and counterexample scenarios; independent semantic grading record | Lexical preflight plus blinded mechanism/exit-evidence review                                                                                                           | S / low until run |
| T3: release checks         | REQ-002..003; AC-003..007 | Registry maintainer and release owner; existing validation/export scripts                                          | Reviewed diff and actual run references                                         | `pnpm validate:all`, `pnpm audit:sdlc`, `pnpm check-alignment`, focused `pnpm evals:preflight`; run a fresh reviewed eval manifest before claiming behavior improvement | XS / medium       |

**Estimate:** 3–5 points across the three tasks, assumed planning size only; no calendar estimate or cost claim without team velocity and model-usage data. **Contracts/data:** Markdown workflow and skill-output contract plus eval JSON; no service API, database change, or migration. **Design-solution:** Needed to settle the exact action-register schema, conditional persistence fields, and verification contract before changing the workflow. High-tier implementation requires an independent architecture reviewer and security reviewer when a trust-boundary rule changes, then maintainer approval before merge.

## 10. Traceability and outcome

`BRD-OBJ-001 -> REQ-001..003 -> AC-001..007 -> [technical SRS](../srs/srs-system-design-review-outcomes.md) -> planned verification`. Operator approval of this PRD preceded registry-maintainer acceptance of the SRS and implementation ownership on 2026-10-05; neither approves publication.

```json
{
  "schema_version": 1,
  "run_id": "system-design-review-outcomes-plan-2026-10-04",
  "slug": "system-design-review-outcomes",
  "workflow": "plan-feature",
  "feature_status": "requirements_ready",
  "operator_profile": "technical",
  "lane": "direction",
  "snc_tier": "high",
  "approval": "approved(operator, 2026-10-05) for PRD technical design; implementation owner pending",
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
    "approved direction brief",
    "operator-approved PRD",
    "draft SRS contract"
  ],
  "missing_evidence": [
    "implementation-owner acceptance",
    "SRS independent approval",
    "behavioral eval and independent review",
    "shared release revision"
  ],
  "decision_needed": [
    "registry maintainer assigns implementation owner and reviews technical contract"
  ],
  "recommended_next_workflow": "implementation-readiness after SRS approval",
  "cost": { "source": "unavailable" },
  "agent": {
    "identity": "omp planning agent",
    "model": "openai-codex/gpt-6-sol"
  }
}
```

**Next workflow:** `implement-feature` after the [new readiness decision](../../artifacts/runs/system-design-review-outcomes/20261005T020339Z-implementation-readiness.json). **Change log:** 2026-10-04 — initial draft from approved direction brief; 2026-10-05 — operator approved PRD for technical design and SRS drafted; registry maintainer accepted SRS and assigned implementation with separate reviewer. **Open decision:** Release maintainer approval after independent verification.
