---
name: cyber-incident-triage
guardrail: true
description: NIST SP 800-61r3-aligned incident triage that preserves evidence, separates analysis from authorization, and records status. Use for incident intake, severity assessment, containment readiness, or evidence preservation; not generic debugging or unscoped response.
metadata:
  triggers:
    files: []
    keywords:
      - incident triage
      - security incident
      - incident intake
      - preserve evidence
      - containment readiness
      - NIST 800-61
---
# Cyber Incident Triage

## **Priority: P0 (CRITICAL)**
Preserve evidence and prevent unauthorized response.

## Structure
Input: claim, time, asset/context, source, scope, owner. Process: preserve originals; assess hypothesis; separate analysis, containment, eradication, recovery; cite gaps. Output: status, evidence references, limitations, owner, next approved action.

## Rules
- Active collection, isolation, eradication, or production changes require engagement/scope reference, approved operation, owner, and runtime-proven controls.
- Missing, expired, or unsupported scope blocks operations; continue safe offline analysis.
- Status: `confirmed`, `suspected`, `blocked`, `not-tested`, or `false-positive`. Severity is urgency/impact, never proof.
- Preserve acquisition method, timestamps, hashes where available, custodian, and original references. Missing evidence is not clean.
- Always record `accountable_owner`. If no owner is supplied, use `unassigned` and require the incident-response lead to assign an incident owner before handoff or closure; never invent a person, approval, or completed assignment.
- Require independent approval for disruptive containment. Runtime—not Markdown—enforces permissions, credentials, network scope, and cancellation.

## Anti-Patterns
- Never delete, isolate, reset, scan, or modify production from prose alone.
- Never convert high severity, an empty dashboard, or a missing artifact into confirmation.
- Never fabricate indicators, confidence, chain of custody, recovery, or efficacy.

## References (lazy, primary)
- NIST SP 800-61r3: https://doi.org/10.6028/NIST.SP.800-61r3
- NIST SP 800-86 evidence handling: https://doi.org/10.6028/NIST.SP.800-86
- Reuse `cyber-authorization`, `cyber-evidence`, `cyber-framework-mapping`.
