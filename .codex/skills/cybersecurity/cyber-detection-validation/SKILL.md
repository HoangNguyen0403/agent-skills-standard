---
name: cyber-detection-validation
guardrail: true
description: Validates defensive controls with paired authorized action and observation evidence, distinguishing blocked, prevented, detected, responded, and telemetry-gap outcomes. Use for purple-team validation design or offline fixture review; not unsanctioned testing or production efficacy claims.
metadata:
  triggers:
    files: []
    keywords:
      - purple team
      - detection validation
      - paired evidence
      - defensive validation
      - telemetry gap
      - control outcome
---
# Cyber Detection Validation

## **Priority: P0 (CRITICAL)**
No defensive outcome without linked action and observation evidence.

## Structure
Input: control hypothesis, permitted action, scope/approval, entity, window, expected observation, stop condition. Process: verify runtime; capture action and observation records; link by test ID/entity/time/source; classify only from evidence. Output: outcome, evidence references, limitations, owner, framework edge.

## Rules
- Active/modifying operations require engagement/scope, approved action, owner, and runtime-proven controls; independent approval is required for disruptive containment.
- Controlled synthetic/offline fixtures only. No real credentials, malware, live targets, or production modifications.
- `blocked`: action denied or could not run; `prevented`: control stopped action; `detected`: observation identified behavior; `responded`: independently evidenced approved response; `telemetry-gap`: action exists but required observation is absent/unusable.
- Detection is not response. A single log line or Markdown assertion cannot establish an outcome.
- Include scope reference; skill/version/source; observation time; finding status; action/observation evidence; limitations; owner; framework/version/ID/relation/rationale/source/review status. Reuse shared skill IDs.

## Anti-Patterns
- Never label blocked as prevented or observation-only as detected.
- Never infer response from detection or claim efficacy/compliance from documentation.
- Never simulate a successful action when runtime or approval is absent.

## References (lazy, primary)
- NIST SP 800-115 technical testing: https://doi.org/10.6028/NIST.SP.800-115
- MITRE ATT&CK evaluations methodology: https://attackevals.mitre-engenuity.org/
- Reuse `cyber-authorization`, `cyber-evidence`, `cyber-framework-mapping`.
