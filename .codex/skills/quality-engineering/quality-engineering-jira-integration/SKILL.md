---
name: quality-engineering-jira-integration
description: "Trigger only when the user explicitly requests live Jira or Zephyr retrieval, existing-link inspection, linking authored test cases, label updates, or stale-link audits. Do not trigger for analysis-only prompts such as 'Analyze the acceptance criteria for TICK-4521', supplied acceptance criteria, test-case authoring, or AC-to-test generation."
metadata:
  triggers:
    keywords:
    - jira issue
    - zephyr link
    - has-zephyr-tests
    - traceability
    - link test case
---
# Jira Integration Standards

## **Priority: P1 (HIGH)**

## 1. Retrieving Issue Details

- **Fetch Core Info**: Retrieve **Summary**, **Description**, **Acceptance Criteria (AC)**, and **Components**.
- **Jira Key**: ALWAYS reference issue by its unique **Jira Ticket ID** (e.g., `TICK-123`).
- **Sibling Analysis**: Identify other Jira issues with same **Component** or **Market Variants** (VN/MY/SG) to find potentially impacted Zephyr TCs.
- **Identify Links**: Use `Get Issue Link Test Cases` with Jira issue key to check for existing linked TCs before creating duplicates.
- **Actor Mapping**: Extract reporter, assignee, and **Story Points** for context.

## 2. Linking Zephyr Test Cases

- **Traceability**: After creating Zephyr Test Case, link it back to corresponding Jira Issue using **Remote Link** or **Zephyr Issue Link**.
- **Format**: Use Zephyr Scale key (e.g., `PROJ-T123`) in Jira link or comment.
- **Labels**: Apply **`has-zephyr-tests`** label to Jira issue once test cases successfully linked.

## 3. Jira-Zephyr Workflow

1. **Fetch**: Get Jira User Story details.
2. **Generate**: Create Zephyr Test Case using generation skill.
3. **Link**: Use SmartBear MCP tool **`Create Test Case Issue Link`** to bridge two.
4. **Notify**: Add comment to Jira: `Linked Zephyr Test Case: {test_case_key}`.

## 4. Best Practices

- **Concise Summaries**: Keep Jira comments professional and brief.
- **Traceability Matrix**: Ensure every AC in Jira at least one linked Zephyr Test Case.
- **Cleanup**: Remove unused labels or outdated links during refactors.

## 5. Anti-Patterns

- **No Ghosting**: Create tests then link to Jira (Traceability).
- **No Spam**: Post single comment per link.
- **No Missing Labels**: Update Jira labels after linking.

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- Identify
- has-zephyr-tests label
