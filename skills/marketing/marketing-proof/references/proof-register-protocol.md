# Proof Register Protocol

## Overview

This protocol governs the verification, lifecycle, and qualification of marketing claims in `agent-skills-standard`. It establishes an immutable audit trail between marketing statements and reproducible technical artifacts.

## 1. Claim Lifecycle

Every marketing claim progresses through defined lifecycle states:
1. `unsubstantiated_proposal`: Newly proposed statement lacking verified backing evidence.
2. `under_review`: Associated with candidate benchmarks, tests, or sources, currently undergoing verification.
3. `verified`: Substantiated by reproducible evidence without unhandled contradictions; limited to tested scope.
4. `qualified`: Substantiated within narrow boundaries, accompanied by explicit operational caveats (e.g. "saves 60-90% tokens on stdout commands; interactive TUIs not supported").
5. `rejected`: Prohibited due to contradiction with test evidence, unevidenced superlatives, or missing source verification.

## 2. Universal Claim Rejection & NOT READY Reports (AC-19)

Marketing claims often drift toward universal assertions:
- **Prohibited**: "Seamless compatibility with all AI coding agents", "Guaranteed zero hallucination", "Universal token compression".
- **Rule (AC-19)**: If any underlying test run, readiness gate, or verification report indicates `not_ready`, `partial_failure`, or `untested_ecosystem`:
  1. The universal claim must be rejected immediately.
  2. The specific limitation (e.g. "tested only on Node >= 20 and Darwin arm64") must be incorporated into the qualified claim statement.
  3. The NOT READY finding must be recorded in the claim's `scope_limitations`.

## 3. Contradictory Evidence & Negative Results (AC-01)

When product evidence contains conflicting data:
- **Rule (AC-01)**: The claim record must retain the source, scope, and specific contradiction.
- It is strictly forbidden to discard contradictory test runs or average them out.
- Example: If a tool reduces token usage on standard `git status` by 80%, but increases tokens on small 2-line files by 5% due to header overhead, both facts must be recorded in the proof register.

## 4. Context Revision Integrity (AC-03)

- All claims intended for a specific marketing campaign, landing page revision, or demo video must bind to the identical `context_revision`.
- Mixing claims from different git revisions (e.g. performance numbers from v1.2 combined with feature lists from v1.4) is prohibited.

## 5. Banned Proof Equivalencies

1. **GitHub Stars $\ne$ Cohort Retention**: Stars represent transient curiosity or social bookmarks; they provide zero evidence of repeat use, retention, or customer satisfaction.
2. **Developer Hours $\ne$ Cash Benefit**: Saved maintainer or developer hours represent capacity preservation. They cannot be converted into cash savings or financial ROI without audited payroll reduction.
