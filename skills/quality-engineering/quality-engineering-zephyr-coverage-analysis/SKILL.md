---
name: quality-engineering-zephyr-coverage-analysis
description: 'QE audit skill — invoke whenever someone asks about test coverage health, coverage gaps, coverage percentage, pre-release readiness, or QE debt for a Jira story or epic. Examples: "are we covered enough to ship EZRX-42302?", "what ACs are missing test cases?", "show me coverage gaps for this sprint", "run a coverage audit on this ticket", "which existing TCs have quality issues?", "is this user story test-ready?". Produces a read-only coverage_analysis_report.md with an Executive Dashboard (covered/partial/not-covered %), AC-to-TC heatmap with risk scores, quality observations on existing TCs, and a Prioritized Action Plan. Do NOT invoke for creating or updating test cases — use quality-engineering-zephyr-test-generation for TC creation.'
---

# Zephyr Coverage Analysis

## **Priority: P1 (HIGH)**

## Workflow

Load and follow `.agent/workflows/zephyr-coverage-analysis.md`.

Key steps:

1. Fetch Jira issue with `?expand=renderedFields` for HTML-accurate platform detection from AC table rows
2. Search Zephyr (last 300 TCs, paginated) — filter client-side on `labels[]` and `objective` for the issue key
3. Map each AC to coverage status: **Covered** / **Partial** / **Not Covered**, per platform slot
4. Risk-score each gap: HIGH (transaction/financial) / MEDIUM (feature behavior) / LOW (UI/visual)
5. Flag TC quality issues: traceability mismatches, combined TCs masking failures, generic objectives
6. Surface QE debt beyond the AC table: data correctness, negative flows, role-specific paths
7. Output `coverage_analysis_report.md` — Executive Dashboard, AC Heatmap, QE Debt, Action Plan

## Anti-Patterns

- **No TC creation**: Analysis is read-only — call quality-engineering-zephyr-test-generation to create TCs.
- **No server-side label filter**: Zephyr `label=` param ignores the filter — always paginate and filter client-side.
- **No ticket-level platform**: Read Platform from each AC table row HTML, not the ticket header section.
- **No merged WEB+MOBILE slots**: Treat each platform as an independent coverage slot — Mobile covered ≠ Web covered.
- **No skipping QE debt**: Always surface systemic gaps (data correctness, negative flows) beyond the AC table rows.

## References

- [Workflow](../../../../.agent/workflows/zephyr-coverage-analysis.md) — load for full execution steps
- [Report Template](references/coverage_report_template.md) — load when building coverage_analysis_report.md (Step 5 of workflow)
- [Impact Analysis Protocol](../quality-engineering-zephyr-test-generation/references/impact_analysis.md) — TC discovery protocol
- [Zephyr Test Generation](../quality-engineering-zephyr-test-generation/SKILL.md) — invoke after analysis to create the missing TCs
