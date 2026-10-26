# Launch Governance Reference

## 1. Scope & Purpose

This governance reference establishes pre-flight authorization checks, RACI responsibilities, and rollback protocols for product and feature launches in the supplied product or initiative context. It operationalizes requirements from PRD REQ-MKT-014 (AC-26) and REQ-MKT-002 (AC-03, AC-04).

Launch packages and distribution plans are prepared drafts by default (`status: "prepared"`) and cannot authorize or perform action. Skills provide procedural guidance for agents and do not enforce host-level runtime gates.

## 2. Launch Authorization Gates (AC-26)

A launch package is evaluated against two mandatory, non-bypassable governance gates:

```text
┌────────────────────────┐      ┌───────────────────────────┐      ┌─────────────────────────┐
│ Clean Build & Verif    │      │ Gate 1: Response Owner    │      │ Gate 2: Publication     │
│ Code, tests, and proof ├─────►│ Designated maintainer     ├─────►│ Formal written approval │
│ pass all local gates   │      │ assigned for triage       │      │ from release authority  │
└────────────────────────┘      └─────────────┬─────────────┘      └────────────┬────────────┘
                                              │ Unresolved                      │ Unresolved
                                              ▼                                 ▼
                                ┌────────────────────────────────────────────────────────────┐
                                │ Launch BLOCKED (status: "not_authorized")                  │
                                │ All collateral retained in status: "prepared"              │
                                │ Explicitly name missing prerequisite in report             │
                                └────────────────────────────────────────────────────────────┘
```

### Gate 1: Response Owner Assignment
- A named engineer/maintainer must be formally assigned to monitor communication channels (e.g. GitHub issues, discussions, community channels) across an agreed, owner-approved response window tailored to release scope.
- If no individual is named and available for the response window, the launch cannot proceed.
### Gate 2: Publication Authority Sign-Off
- Formal authorization from the authorized repository maintainer or project lead.
- The approval must specify the exact version, release notes digest, and target channels.

## 3. RACI Responsibility Matrix

| Responsibility Area | Accountable | Responsible | Consulted | Informed |
|---|---|---|---|---|
| **Technical Quality & CI** | Core Maintainer | Release Engineer | QA / Security | Community |
| **Proof & Claim Verification** | Research Owner | Content Lead | Core Maintainer | Community |
| **Response Triage (Agreed Window)** | Response Owner | On-call Engineer | Core Maintainer | Community |
| **Publication Sign-Off** | Repository Lead | Campaign Owner | Security Lead | All Maintainers |

## 4. Staged Rollout Stages & Abort Criteria

To minimize blast radius, launches must follow a staged sequence:

1. **Stage 1: Internal Dogfooding (24–48 hours)**
   - Maintainers use the release in real workflows.
   - Abort Trigger: Critical regression in core skill execution or unhandled CLI crash.
2. **Stage 2: Staged Preview / Community Canary (48–72 hours)**
   - Opt-in testing by community members in staging or preview channels.
   - Abort Trigger: Security vulnerability report, major data corruption, or recurring onboarding failure.
3. **Stage 3: General Availability (GA)**
   - Official release tag, public docs update, and prepared announcement publishing by authorized human.

## 5. Rollback & Remediation Protocol

Every launch package must include a pre-scripted rollback procedure:
- **CLI/Package Rollback**: Publish deprecation tag or patch release (`npm deprecate` or immediate patch version).
- **Communication Rollback**: Pre-drafted advisory template explaining known issue and mitigation.
- **Incident Escalation**: Named escalation chain if the assigned Response Owner is overwhelmed.

## 6. Pre-Launch Readiness Record Schema

```json
{
  "launch_id": "LNCH-2026-10-25-01",
  "target_version": "v1.2.0",
  "context_revision": "ctx-rev-2026-10-25-01",
  "technical_readiness": {
    "clean_build": true,
    "proof_refs_verified": true,
    "documentation_ready": true
  },
  "governance_gates": {
    "response_owner": {
      "status": "assigned",
      "assigned_to": "maintainer-alice",
      "triage_window": "owner_approved_window"
    },
    "publication_authority": {
      "status": "approved",
      "authorized_by": "lead-maintainer-bob",
      "authorization_ref": "AUTH-REL-2026-10-25"
    }
  },
  "launch_status": "authorized",
  "collateral_status": "prepared"
}
```

If either `governance_gates.response_owner.status !== "assigned"` or `governance_gates.publication_authority.status !== "approved"`, `launch_status` MUST be `"not_authorized"`.
