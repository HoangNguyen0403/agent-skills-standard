---
name: Jira Integration
description: Standards for retrieving Jira issue details and linking Zephyr test cases back to Jira.
metadata:
  labels: [jira, zephyr, integration, traceability]
  triggers:
    files: ['**/jira_*.xml', '**/test_case.json']
    keywords: [jira issue, link zephyr, jira details, jira mcp]
---

# Jira Integration Standards

## **Priority: P1 (HIGH)**

## 1. Retrieving Issue Details

- **Fetch Core Info**: Retrieve Summary, Description, Acceptance Criteria, and Labels.
- **Sibling Analysis**: Identify other Jira issues with the same **Component** or **Labels** to find potentially impacted Zephyr TCs.
- **Identify Links**: Check for existing links to Zephyr test cases to avoid duplication.
- **Actor Mapping**: Extract reporter and assignee for context.

## 2. Linking Zephyr Test Cases

- **Traceability**: After creating a Zephyr Test Case, link it back to the corresponding Jira Issue.
- **Format**: Use the Zephyr Scale key (e.g., `PROJ-T123`) in the Jira link or comment.
- **Labels**: Add `has-zephyr-tests` label to the Jira issue once test cases are linked.

## 3. Jira-Zephyr Workflow

1. **Fetch**: Get Jira User Story details via [Jira MCP](../../common/security-standards/SKILL.md).
2. **Generate**: Create Zephyr Test Case using [Zephyr Generation Skill](../zephyr-test-generation/SKILL.md).
3. **Link**: Use Zephyr MCP tool `create_test_case_issue_link` to bridge the two.
4. **Notify**: Add a comment to Jira: `Linked Zephyr Test Case: {test_case_key}`.

## 4. Best Practices

- **Concise Summaries**: Keep Jira comments professional and brief.
- **Traceability Matrix**: Ensure every AC in Jira has at least one linked Zephyr Test Case.
- **Cleanup**: Remove unused labels or outdated links during refactors.

## 5. Anti-Patterns

- **No Ghosting**: Create tests then link to Jira (Traceability).
- **No Spam**: Post single comment per link.
- **No Missing Labels**: Update Jira labels after linking.
