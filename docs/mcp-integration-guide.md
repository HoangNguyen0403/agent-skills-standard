# Optional MCP Integration Guide

Agent Skills Standard workflows must work with or without external MCPs.

## Supported Integration Surfaces

| Surface | Used For | Fallback |
| --- | --- | --- |
| Jira | stories, bugs, ACs, comments, status | exported ticket text |
| GitHub | issues, PR metadata, review threads, changed files, comments | PR/issue URL, patch, copied thread summary |
| GitLab | issues, MR metadata, discussions, changed files, comments | MR/issue URL, patch, copied discussion summary |
| Azure DevOps | PR metadata, threads, changed files | PR URL, patch, copied thread summary |
| Zephyr | TC discovery, coverage, TC creation | exported TC table |
| Confluence | specs, decisions, test data | linked docs or pasted excerpts |
| Figma | UX states, designs, annotations | screenshots or design export |
| code-review-graph | callers, impact radius, patterns | `rg`, local file reads, git diff |
| Appium/LambdaTest | mobile verification evidence | emulator/local device notes and screenshots |
| Playwright/browser tools | web verification evidence | local test logs and screenshots |

## Workflow Rule

Every workflow that mentions external systems must follow this order:

1. Use the MCP if the runtime exposes it and credentials are configured.
2. If unavailable, ask for an exported artifact or local file.
3. If neither exists, mark that lane `BLOCKED` and continue other lanes.
4. Never invent ticket, PR, TC, design, or environment facts.

## Specialist Rule

Specialists keep raw tool responses out of parent context. They return compact structured summaries only, with tool failures reported as `BLOCKED`.

## Customization

Teams should customize:

- Project keys and issue fields.
- Repository provider defaults (GitHub, GitLab, Azure DevOps).
- Test-management schemas and folders.
- Release environments and credential sources.
- PR comment policy and approval gates.
- Device-cloud providers and supported markets.

Do this in local overrides or MCP runtime config, not by hardcoding team-specific values into the shared registry.
