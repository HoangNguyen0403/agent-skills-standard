---
name: quality-engineering-zephyr-test-generation
description: "Generate Zephyr test cases from Jira stories: parse AC, identify platform and market, impact-analyze existing TCs (update vs create new), draft test cases with correct naming/metadata/preconditions, and link back via create_test_case_issue_link. Use when converting a Jira story into Zephyr TCs, or when requirement changes require updating existing TCs rather than creating duplicates. (triggers: **/user_story.md, generate test cases, zephyr, impact analysis, create test case)"
---

# Zephyr Test Generation Standards

## **Priority: P1 (HIGH)**

## Workflow: Jira → Zephyr

1.  **Analyze Requirements**:
    - Identify **Acceptance Criteria (AC)** and verify **Actor/Permission Matrix**.
    - Perform **Atomic AC Decomposition**: Break down complex ACs into individual testable units (1 statement = 1 TC).
    - **Identify Platform**: Detect if requirement applies to **`Web`**, **`Mobile`**, or **`Both`**.
    - **Identify Market**: Extract Market context (e.g., **`VN`**, `MY`, `SG`, `All`).
2.  **Impact Analysis**:
    - **Search Zephyr** for **Existing TCs** related to the feature before creating new ones.
    - Perform **Impact Analysis** to decide: **Update those TCs** (change logic) existing TCs or create **New** (new feature) TCs. Ensure you don't create **duplicates** by updating existing ones first. Document delta changes in TC description.
3.  **Draft/Merge TCs**:
    - Create/Update TCs with correct **Zephyr Key** (e.g., `EZRX-T123`).
    - **Traceability**: **Link TC to the Jira Ticket ID** (e.g., **`EZRX-3892`**) immediately via **`create_test_case_issue_link`**.
4.  **Review**: Ensure no "OR" logic and steps are **Atomic**. Use **separate TCs per actor** (no OR logic) when different roles see different data. Use **Truth Table Verification** for multi-condition ACs.

## Metadata & Traceability Standards

1. **Preconditions**: Must be extracted from the requirement as a list of **bullet points**.
2. **Priority**: Classify as **High**, **Normal**, or **Low** based on business impact.
3. **Traceability (CRITICAL)**: Always link the TC to the **Jira Ticket ID** using the **`create_test_case_issue_link`** tool.
4. **Naming**: Prefix with **`[Web]`** or **`[Mobile]`** ONLY if exclusive. **No [Platform] prefix** if it applies to Both. Pattern: **`Module_Action on Screen when user is {Actor} ({Market})`**. Example: **`[Web] Invoice_Download invoice on Order Detail when user is Customer (VN)`**.

## Anti-Patterns

- **Ghost Updates**: Changing code without updating the corresponding Zephyr TC.
- **Duplicate Creation**: Creating a new TC for a logic shift when an update was more appropriate.
- **Vague Steps**: `System works` -> `Expect Result: Banner 'Success' is visible`.
