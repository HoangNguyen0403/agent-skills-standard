# Launch Governance Record: Core Standards Campaign

## Metadata
- **Launch ID**: `LNCH-2026-10-25-STANDARDS-01`
- **Initiative**: `evidence-led-marketing`
- **Target Campaign**: `standards-demo-01`
- **Target Version**: `agent-skills-standard v1.0.0 candidate`
- **Shared Context Revision**: `ctx-rev-20261025-capture-ee18d7f5`
- **Source Baseline**: Git Commit `a2228857e4cf5b8ee2d71d96630c586618ec2edd` (working tree dirty: `true`), captured snapshot tree `ee18d7f5e57ac88d2621ba46316ce0e71262ef7ba686f04e0548e04fb60e5620` (1,412 files); see `capture-manifest.json`
- **Evaluation Date**: 2026-10-25

---

## 1. Governance Gate Evaluation (AC-26)

In accordance with PRD `REQ-MKT-014` (AC-26), launch assets remain in a prepared proposal state until two mandatory human governance gates are satisfied:

```text
┌────────────────────────┐      ┌───────────────────────────┐      ┌─────────────────────────┐
│ Clean Build & Verif    │      │ Gate 1: Response Owner    │      │ Gate 2: Publication     │
│ Code, tests, and proof ├─────►│ Designated maintainer     ├─────►│ Formal written approval │
│ PASS (Local candidate) │      │ PROPOSED (Hoang Nguyen)   │      │ PENDING (Not Signed)    │
└────────────────────────┘      └─────────────┬─────────────┘      └────────────┬────────────┘
                                              │                                 │ PENDING
                                              ▼                                 ▼
                                ┌────────────────────────────────────────────────────────────┐
                                │ LAUNCH STATUS: not_authorized                              │
                                │ Collateral Status: prepared                                │
                                │ Missing: Human Publication Sign-Off & Remote Release       │
                                └────────────────────────────────────────────────────────────┘
```

### Pre-Launch Readiness Record

```json
{
  "launch_id": "LNCH-2026-10-25-STANDARDS-01",
  "target_version": "v1.0.0-candidate",
  "context_revision": "ctx-rev-20261025-capture-ee18d7f5",
  "technical_readiness": {
    "capture_executed": true,
    "proof_refs_bound_to_capture": true,
    "collateral_prepared": true,
    "demo_video_rendered": true,
    "independent_media_review": "pending",
    "web_landing_review": "pending (T10, not owned by this record)"
  },
  "governance_gates": {
    "response_owner": {
      "status": "proposed",
      "assigned_to": "HoangNguyen0403",
      "triage_window": "72_hours_post_announcement",
      "channels": ["GitHub Issues", "GitHub Discussions", "Show HN Thread"]
    },
    "publication_authority": {
      "status": "pending_approval",
      "authorized_by": null,
      "authorization_ref": null
    }
  },
  "launch_status": "not_authorized",
  "collateral_status": "prepared"
}
```

---

## 2. Explicit Missing Prerequisites

Because `governance_gates.publication_authority.status !== "approved"`, the launch package is formally marked **`not_authorized`**:

1. **Human Publication Sign-Off**: Requires formal written approval from repository lead (`HoangNguyen0403`) authorizing public distribution. No automated agent can approve this gate.
2. **Independent Review of Campaign Media (Gate G4)**: Terminal frames, transcript/caption synchronization, and the 390 px legibility crops were produced and self-checked by the campaign owner. Independent web/media review is still pending; this record does not self-certify a PASS.
3. **Remote Release Publication (`AC-16`)**: The candidate changes must be tagged and pushed to the remote GitHub repository before public links or install instructions are accurate.
4. **Provider Telemetry Sign-Off (`T08`)**: If web analytics are enabled in the future, provider selection and privacy consent must be formally approved. Current campaign materials operate with zero telemetry (`AGS_TELEMETRY=false`).

---

## 3. RACI Responsibility Assignment

| Responsibility Area | Accountable | Responsible | Consulted | Informed |
|---|---|---|---|---|
| **CLI & Package Quality** | Hoang Nguyen | Integration Owner | QA / Security | Community |
| **Proof & Claim Verification** | Hoang Nguyen | Evidence Owner | Technical Lead | Maintainers |
| **Response Triage (72h Window)** | Hoang Nguyen (Proposed) | On-call Maintainer | Campaign Owner | Community |
| **Publication Sign-Off** | Hoang Nguyen | Campaign Owner | All Maintainers | Community |

---

## 4. Rollback & Remediation Protocol

In the event of an unexpected regression or defect post-publication:
1. **Repository Notice**: Post an immediate advisory pinned in GitHub Discussions detailing the issue and temporary mitigation.
2. **CLI Rollback**: If an erroneous npm package is published, deprecate via `npm deprecate agent-skills-standard@<ver> "Deprecated due to issue #..."` and publish a patch release.
3. **Escalation Trigger**: If issue reports exceed 5 unhandled triage tickets within the 72-hour window, the designated Response Owner halts further promotion and escalates to immediate bugfix triage.
