---
description: "Analyze Zephyr test case coverage for a Jira user story and produce a QE management report with metrics, risk scoring, and prioritized recommendations."
---

# Read-only audit — produces coverage_analysis_report.md, does NOT create or modify Zephyr test cases

// turbo-all

## 1. Gather Input

If the Jira Issue Key is not provided, ask for it.

Optional: **Scope** (single ticket default, or comma-separated epic/sprint keys) | **Depth** (`quick` = coverage table only, `full` = default with risk scoring + QE observations).

## 2. Fetch Jira + Discover Zephyr TCs (Parallel Sub-Agents)

Launch **two sub-agents in parallel** to keep raw API data out of main context:

### Sub-Agent A: Jira Analyst

> Use `Agent` tool with `subagent_type="jira-analyst"`.
> Prompt: "Fetch JIRA ticket {ISSUE_KEY} with `?expand=renderedFields`. Extract: Summary, Status, Components, Labels, Market, and the full AC table. For each AC row, read the Platform column from rendered HTML — color codes are authoritative: `#00B8D9` = Web, `#36B37E` = Mobile, `#FF991F` = Web+Mobile. Do NOT use ticket-level Platform — always read per-row from renderedFields. Return structured briefing."

### Sub-Agent B: Zephyr Scanner

> Use `Agent` tool with `subagent_type="zephyr-scanner"`.
> Prompt: "Find all Zephyr test cases related to {ISSUE_KEY}. Use direct issue link lookup first, then supplemental search only if needed. Return the filtered TC table with key, name, platform, labels, objective summary."

Both agents run concurrently. Wait for both to complete before proceeding.

### Merge Results

From Sub-Agent A: extract ACs with platform tags.
From Sub-Agent B: extract the discovered TC list.

## 3. Map ACs to Coverage Status

Per platform slot (Web and Mobile are independent — Mobile covered ≠ Web covered):

| Status          | Criteria                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| **Covered**     | TC directly references this AC (label, objective, or step) and scope matches (platform, role, market) |
| **Partial**     | TC exists but has generic objective, wrong role scope, different platform, or missing key assertions  |
| **Not Covered** | No TC found                                                                                           |

Risk-score each gap: **HIGH** = transaction/financial/order completion | **MEDIUM** = feature behavior/conditional display | **LOW** = UI/visual/cosmetic

## 4. Build the Coverage Analysis Report

Delete any existing `coverage_analysis_report.md` before creating a new one.

Load the **Report Template** from the coverage analysis skill's `references/coverage_report_template.md` and use it to produce `coverage_analysis_report.md` with: Executive Dashboard, AC Heatmap, Quality Observations on existing TCs, QE Debt backlog, Prioritized Action Plan (P1/P2/P3), QE Manager Recommendations.

Quality issues to flag on existing TCs: traceability mismatches (objective references wrong ticket), generic objectives (no business-logic assertions), combined TCs masking independent failures, missing data-correctness assertions.

QE Debt to surface beyond AC gaps: data correctness (values validated against DB?), negative flows (backend unavailable?), role differentiation, boundary conditions, regression risk on shared screens.

## 5. Present Report & Offer Next Steps

After writing the report, offer:

1. Proceed to create missing TCs (invoke zephyr-from-jira workflow for P1 gaps)
2. Export to Confluence or Jira comment
3. Run coverage analysis on a sibling ticket
4. Done

Only if the user selects option 1, invoke TC creation.
