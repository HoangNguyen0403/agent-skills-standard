# Design Walkthrough: Agent Harness Assurance Baseline

Status: technical design approved for readiness assessment; assurance execution and final baseline acceptance remain unassessed.

## Scope And Authority

The operator approved the delivery plan and technical design on 2026-11-06, including progression to implementation-readiness. Execution approach, live probes, data extraction and spending remain separately gated. This walkthrough records design-stage verification, not a completed runtime walkthrough.

## Design Decisions And Source Evidence

- Existing qualifier validates registered native host/surface pairs; Paseo/OMP are not registered. Keep their evidence in existing task/review/baseline reports without aliases or registry changes. confirmed(scripts/harness-smoke/qualification.ts; cli/src/constants/enums.ts).
- Qualifier exit zero can include not_verified. Inspect returned support/provenance/missing-evidence status. The lighter capability resolver is not the retained-artifact qualifier. confirmed(scripts/harness-smoke/checks.ts; scripts/harness-smoke/qualification.ts).
- Existing task packets/progress receipts bind declared scope/revision/evidence but do not dispatch, authenticate human grants or prove writers stopped. confirmed(skills/common/common-subagent-driven-development/references/progress-receipts.md).
- SessionJournal accepts explicit OMP/codex sources and actor inventory, but has no general attemptId contract or automatic Paseo/native correlation. Eval taskUsage is a different interface; no new converter is proposed. confirmed(mcp/src/services/SessionJournal.ts; scripts/evals/types.ts).
- Safe-denial interface and complete cross-owner authority remain unverified. No runtime probe, cancel/recovery attempt or paid dispatch was performed during design.

## Acceptance Status

SRS-001–006 specify the technical realization of the PRD's existing AC-HAR-01–06. Their actual verification evidence belongs at the prospective run paths defined in the SRS. None is marked technically passed by document existence, helper validation or this walkthrough.

| Delivery area | Current result |
| --- | --- |
| Capability/boundary contracts | Specified; actual A/B baseline artifacts not produced |
| Enforcement | NOT RUN; safe ingress/authority prerequisite not yet established |
| Lifecycle task | NOT RUN; no bounded authorized task executed |
| Accounting | NOT RUN; private native sessions not read; full-task cost unavailable |
| Independent design review | Completed; cancellation-acknowledgement overclaim corrected in SRS-004 |
| Human disposition | Pending; no agent can provide operator acceptance |

## Artifact Validation

PASS: the unchanged repository Outcome RunRecord validator accepted the exact design scope; six unique SRS cards and six verification mappings matched the trace; local document links resolved; approved PRD/BRD digests matched current files. Executed via Node 26 native TypeScript with already installed MCP fs-extra dependency resolution; no dependencies installed. Node emitted a module-type inference warning; checks completed successfully. These checks establish artifact consistency only, not live controls, full runtime source parity, implementation readiness or business ROI.

No runtime/public API/schema change or source implementation is made. No dependency installation, account/credential access, premium call or policy activation is authorized by this document.

Independent runtime/design review identified one consequential overclaim: timeout or cancellation acknowledgement was described as stopped state. SRS-004 now preserves running/stop-requested/unknown until supported cessation evidence exists; conflicting resources cannot be reused before owned writers cease. No other consequential finding was reported in that bounded review. This is independent design review, not implementation acceptance.

## Next Gate

The operator approved progression to `implementation-readiness`; see [scoped readiness assessment](../validation/readiness-agent-harness-improvement.md). Execution approach is unselected; A/B remain technically preparable and C/D retain their authority/data/tool prerequisites. Pre-execution `validate-product` must establish the approved empirical bounds; actual host permission remains separate.
