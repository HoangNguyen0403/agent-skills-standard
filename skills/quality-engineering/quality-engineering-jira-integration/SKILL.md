---
name: quality-engineering-jira-integration
description: "Jira ↔ Zephyr traceability: fetch story AC and components, detect existing TC links, link new Zephyr TCs back to Jira, and apply has-zephyr-tests labels. Use after creating Zephyr test cases that need linking, when fetching a Jira story's details for test generation, or when auditing and cleaning up stale TC links. (triggers: jira issue, zephyr link, has-zephyr-tests, traceability, link test case, EZRX-)"
---

# Jira Integration Standards

## **Priority: P1 (HIGH)**

## 1. Retrieving Issue Details

- **Fetch Core Info**: Retrieve **Summary**, **Description**, **Acceptance Criteria (AC)**, and **Components**.
- **Jira Key**: ALWAYS reference the issue by its unique **Jira Ticket ID** (e.g., `EZRX-123`).
- **Sibling Analysis**: Identify other Jira issues with the same **Component** or **Market Variants** (VN/MY/SG) to find potentially impacted Zephyr TCs.
- **Identify Links**: Check for existing links to **Zephyr Test Cases (TC)** to avoid duplication.
- **Actor Mapping**: Extract reporter, assignee, and **Story Points** for context.

## 2. Linking Zephyr Test Cases

- **Traceability**: After creating a Zephyr Test Case, link it back to the corresponding Jira Issue using the **Remote Link** or **Zephyr Issue Link**.
- **Format**: Use the Zephyr Scale key (e.g., `PROJ-T123`) in the Jira link or comment.
- **Labels**: Apply the **`has-zephyr-tests`** label to the Jira issue once test cases are successfully linked.

## 3. Jira-Zephyr Workflow

1. **Fetch**: Get Jira User Story details.
2. **Generate**: Create Zephyr Test Case using the generation skill.
3. **Link**: Use the tool **`create_test_case_issue_link`** to bridge the two.
4. **Notify**: Add a comment to Jira: `Linked Zephyr Test Case: {test_case_key}`.

## 4. Best Practices

- **Concise Summaries**: Keep Jira comments professional and brief.
- **Traceability Matrix**: Ensure every AC in Jira has at least one linked Zephyr Test Case.
- **Cleanup**: Remove unused labels or outdated links during refactors.

## 5. Anti-Patterns

- **No Ghosting**: Create tests then link to Jira (Traceability).
- **No Spam**: Post single comment per link.
- **No Missing Labels**: Update Jira labels after linking.
