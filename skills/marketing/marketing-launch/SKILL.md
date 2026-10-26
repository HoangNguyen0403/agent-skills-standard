---
name: marketing-launch
description: 'Coordinates staged release announcements, launch readiness checklists, and milestone distribution with strict maintainer authorization and assigned response ownership. Use when preparing launch plans, conducting pre-launch readiness checks, or coordinating product releases. (triggers: `launch checklist`, `campaign launch coordination`, `release readiness gate`)'
guardrail: true
metadata:
  triggers:
    keywords:
      - 'launch checklist'
      - 'campaign launch coordination'
      - 'release readiness gate'
      - 'release communication plan'
---

# Marketing Launch Coordination Standard

## **Priority: P1 (HIGH)**

Coordinate product and feature release milestones through disciplined pre-flight readiness checks, immutable proof binding, and explicit maintainer governance. A product cannot be launched into public distribution without authorized response ownership and explicit publication approval.

## Core Rules

1. **Strict Launch Authorization Gates (AC-26, AC-04)**:
   - Every launch candidate requires two explicit prerequisites:
     a. **Assigned Response Owner**: A named maintainer designated to triage incoming issues, monitor community channels, and manage escalations across an owner-approved response window.
     b. **Explicit Publication Authority**: Written, verifiable publication sign-off from the repository or campaign owner.
2. **Missing Prerequisite Blocks Launch**:
   - If either the response owner or publication authority is unresolved, mark the launch `status: "not_authorized"`.
   - Launch packages are prepared drafts by default (`status: "prepared"`) and cannot authorize or perform action. Skills provide procedural guidance for agents and do not enforce host-level runtime gates. Explicitly name the missing prerequisite in the prepared report.
3. **Immutable Proof & Context Binding**:
   - All launch collateral, changelogs, and announcements must bind to the same frozen `context_revision` and cite verified claims (`proof_ref`).
   - Never include fabricated performance metrics, exaggerated capabilities, or unverified claims.
4. **Staged Rollout & Abort Criteria**:
   - Structure release roadmaps into discrete phases: Internal Verification $\to$ Staged Community Preview $\to$ General Availability.
   - Every phase must specify concrete abort and rollback thresholds (e.g. build failure, critical security issue, broken core CLI command).
5. **Measurement Alignment**:
   - Launch milestones define the acquisition window start ($T_{\text{acq\_start}}$) for `marketing-measurement`.
   - Never celebrate vanity traffic spikes or GitHub star counts as successful launch adoption without 14-day cohort repeat retention.

## Launch Coordination Workflow

1. **Pre-Flight Readiness Check**: Confirm clean CI build, complete documentation, verified proof citations, and closed security gates.
2. **Resolve Governance Roles**: Verify that a Response Owner is assigned and Publication Authority is documented. If either is missing, report the block and halt.
3. **Assemble Collateral**: Compile release notes, announcement copy, and distribution channel targets in `status: "prepared"`.
4. **Define Rollback Plan**: Document rollback procedures, notification channels, and on-call escalation paths.
5. **Awaited Execution**: Hand off prepared launch package to the authorized human maintainer for manual execution.

## Anti-Patterns

- **No Unauthorized Launches**: Never launch because "the code works" if the maintainer hasn't signed off.
- **No Unowned Releases**: Never publish announcements if nobody is assigned to monitor responses.
- **No Unsubstantiated Claims**: Never promise capabilities that lack test verification.

## References

- [Launch Governance](references/launch-governance.md) — Pre-flight checklists, RACI matrices, and authorization templates.
