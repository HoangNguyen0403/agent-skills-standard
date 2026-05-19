---
name: quality-engineering-zephyr-coverage-analysis
description: Audit test coverage health, gaps, and QE debt for Jira stories or epics. Produces coverage_analysis_report.md with AC-to-TC heatmap, risk scores, and prioritized action plan. Use when assessing coverage percentage, pre-release readiness, sprint readiness, or identifying missing test cases. Do NOT use for TC creation — use zephyr-test-generation instead.
metadata:
  triggers:
    files:
    - 'coverage_analysis_report.md'
    keywords:
    - coverage analysis
    - test coverage
    - coverage gaps
    - QE debt
    - QE audit
    - pre-release readiness
    - sprint readiness
    - zephyr coverage
    - test gap
    - AC coverage
    - test-ready
---
# Zephyr Coverage Analysis

## **Priority: P1 (HIGH)**

## Workflow

> **CRITICAL — Read and follow workflow file exactly. NOT implement from memory or from this description.**
> Implementing inline bypasses `jira-analyst` and `zephyr-scanner` sub-agents.

Read and execute `.agents/workflows/zephyr-coverage-analysis.md`.

## Anti-Patterns

- **No TC creation**: Analysis read-only — call quality-engineering-zephyr-test-generation to create TCs.
- **No pagination-first**: Always use `Get Issue Link Test Cases` (direct lookup) before falling back to pagination.
- **No ticket-level platform**: Read Platform from each AC table row HTML, not ticket header section.
- **No merged WEB+MOBILE slots**: Treat each platform as independent coverage slot — Mobile covered ≠ Web covered.
- **No skipping QE debt**: Scan beyond AC rows — always include data correctness, negative flows, role differentiation, and regression risk in Section 4.

## References

- [Report Template](references/coverage_report_template.md) — load when building coverage_analysis_report.md (Step 5 of workflow)
- [Impact Analysis Protocol](../quality-engineering-zephyr-test-generation/references/impact_analysis.md) — TC discovery protocol
- [Zephyr Test Generation](../quality-engineering-zephyr-test-generation/SKILL.md) — invoke after analysis to create missing TCs