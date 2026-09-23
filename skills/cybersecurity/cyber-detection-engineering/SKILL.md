---
name: cyber-detection-engineering
guardrail: true
description: Designs and reviews detections from telemetry prerequisites, correlation logic, Sigma metadata, severity, status, and benign cases. Use for detection rules, Sigma review, analytic coverage, or tuning; not generic logging advice or live deployment.
metadata:
  triggers:
    files: []
    keywords:
      - detection engineering
      - detection rule
      - Sigma rule
      - analytic coverage
      - telemetry prerequisite
      - false positive tuning
---
# Cyber Detection Engineering

## **Priority: P0 (CRITICAL)**
Do not claim analytic coverage without required telemetry and executable support.

## Structure
Input: analytic question, behavior hypothesis, data source/fields, retention, clock quality, scope. Process: define predicates, entity keys, window, cardinality, ordered correlation, suppression, benign cases. Output: rule/spec, prerequisites, severity, lifecycle status, fixtures, limitations, evidence record.

## Rules
- A missing source, field, retention, clock, or collection path makes coverage `blocked` or `not-tested`.
- Multi-step behavior requires ordered sequence correlation over related entities/events; never substitute Boolean OR across unrelated single events.
- Sigma `level` expresses impact/priority (`informational`, `low`, `medium`, `high`, `critical`). Sigma `status` expresses lifecycle (`stable`, `test`, `experimental`, `deprecated`). A valid portable rule does not prove backend execution or telemetry.
- Record expected matches, exclusions and benign/false-positive cases with rationale.
- Include scope reference; skill/version/source; observation time; status; evidence references; limitations; owner. Reuse shared skill IDs.
- Production queries or modifications require documented authorization and runtime-proven controls; offline fixtures only.

## Anti-Patterns
- Never write `severity: high` as Sigma metadata; use `level: high`.
- Never equate `level` with `status`, rule validity with execution, or synthetic matches with efficacy.
- Never hide missing telemetry by lowering priority or widening OR logic.

## References (lazy, primary)
- Sigma specification: https://sigmahq.io/sigma-specification/specification/sigma-rules-specification.html
- MITRE ATT&CK detection strategies: https://attack.mitre.org/detectionstrategies/
- Reuse `cyber-authorization`, `cyber-evidence`, `cyber-framework-mapping`.
