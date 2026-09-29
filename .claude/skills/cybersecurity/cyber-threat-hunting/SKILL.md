---
name: cyber-threat-hunting
guardrail: true
description: Conducts hypothesis-driven, evidence-preserving threat hunts with bounded negative conclusions and telemetry-gap handling. Use for hunt hypotheses, scoped offline analysis, or analytic follow-up; not unscoped scanning, malware execution, or generic intelligence summaries.
metadata:
  triggers:
    files: []
    keywords:
      - threat hunting
      - hunt hypothesis
      - hunting query
      - negative conclusion
      - suspicious activity hunt
      - telemetry gap
---
# Cyber Threat Hunting

## **Priority: P0 (CRITICAL)**
Preserve provenance and bound every conclusion to authorized evidence.

## Structure
Input: falsifiable hypothesis, behavior, entities, scope, sources, window, expected signal, stop condition. Process: define positive/negative observations; normalize without overwriting originals; test narrowest evidence; correlate by entity/time; record gaps and alternatives. Output: status, cited evidence, bounded conclusion, limitations, owner.

## Rules
- Active collection or network operations require `cyber-authorization`, documented scope, and runtime-proven controls; unsupported or missing scope blocks execution.
- Use controlled synthetic/offline fixtures. Preserve query/version, fixture provenance, retention, clock, identity, and source limitations.
- Status is `confirmed`, `suspected`, `false-positive`, `blocked`, or `not-tested`; only cited evidence supports a status.
- “No evidence found in the examined dataset/time window” is bounded negative evidence, never proof of no compromise.
- Include engagement/scope reference; skill/version/source; observation time; status; evidence references; limitations; accountable owner. Reuse shared skill IDs.

## Anti-Patterns
- Never call an empty or incomplete dataset clean.
- Never treat one ambiguous hit as confirmed compromise.
- Never collect live telemetry before authorization or invent hunt metrics.

## References (lazy, primary)
- MITRE ATT&CK data sources: https://attack.mitre.org/datasources/
- NIST SP 800-86 evidence handling: https://doi.org/10.6028/NIST.SP.800-86
- Reuse `cyber-authorization`, `cyber-evidence`, `cyber-framework-mapping`.
