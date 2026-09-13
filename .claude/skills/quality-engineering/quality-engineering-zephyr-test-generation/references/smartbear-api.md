# SmartBear MCP API Notes (`@smartbear/smartbear-mcp`)

- **`Create Test Case`** requires `projectKey="{PROJECT}"` and supports `customFields` directly (no separate Update needed for Roles/Platform).
- **`Create Test Case Steps`** uses `testCaseKey` + `mode` (APPEND/OVERWRITE) + `items[]`.
- **`Create Test Case Issue Link`** uses `testCaseKey` + `issueId` (numeric Jira issue ID — get from ticket's `id` field, not key string).
- **`Get Issue Link Test Cases`** uses `issueKey` (e.g., `{PROJECT}-{ID}`) — returns linked TC keys directly.
- **`Update Test Case`** uses `testCaseKey` — only needed when modifying existing TCs, not for new creation.
