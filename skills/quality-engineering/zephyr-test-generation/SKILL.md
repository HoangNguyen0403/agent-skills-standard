---
name: Zephyr Test Generation
description: Workflow for generating or updating Zephyr Scale Test Cases from requirements.
metadata:
  labels: [zephyr, test-generation, jira, regression-analysis]
  triggers:
    files: ['**/*.feature', '**/user_story.md']
    keywords:
      [generate test cases, update zephyr, jira validation, impact analysis]
---

# Zephyr Test Generation Standards

## **Priority: P1 (HIGH)**

## Workflow: Jira → Zephyr

1.  **Analyze Requirements**:
    - Identify AC and verify [Actor/Permission Matrix](../business-analysis/references/analysis_patterns.md).
    - **Identify Platform**: Detect if requirement applies to `Web`, `Mobile`, or `Both`.
    - **Identify Market**: Extract Market context (e.g., `VN`, `MY`, `All`).
    - Use [Business Analysis](../business-analysis/SKILL.md) for logic investigation.
2.  **Impact Analysis**:
    - Search Zephyr for existing TCs related to the feature.
    - Perform [Impact Study](references/impact_analysis.md) to decide: **Update** or **New**.
3.  **Draft/Merge TCs**:
    - For **New**: Create following [Naming Convention](../quality-assurance/SKILL.md).
    - For **Traceability**: Call `create_test_case_issue_link` immediately after creation.
    - For **Update**: Fetch steps and apply deltas.
4.  **Review**: Ensure no "OR" logic and steps are atomic.

## Output Structure

- Refer to [Zephyr JSON Schema](references/zephyr_schema.json) for creation/updates.

## Metadata & Traceability Standards

1. **Preconditions**: Must be extracted from the requirement as a list of bullet points.
2. **Custom Fields**: Populate `Roles` (multi-select) and `Platform` exactly as shown in requirements.
3. **Traceability (CRITICAL)**: Always link the TC to the Jira Issue (e.g., `EZRX-39448`) using the `create_test_case_issue_link` tool.
4. **Naming**: Prefix with `[Platform]` ONLY if exclusive to one platform. Use the `[Module]_[Action]...` pattern. Omit platform if it supports **Both**.
5. **Filing**: Use the exact Folder Path specified in the Technical Impact or module standards.

## Anti-Patterns

- **Ghost Updates**: Changing code without updating the corresponding Zephyr TC.
- **Duplicate Creation**: Creating a new TC for a logic shift when an update was more appropriate.
- **Vague Steps**: `System works` -> `Expect Result: Banner 'Success' is visible`.
