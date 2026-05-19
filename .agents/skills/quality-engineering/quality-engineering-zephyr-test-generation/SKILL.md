---
name: quality-engineering-zephyr-test-generation
description: 'Generate Zephyr test cases from Jira stories: parse AC, identify platform and market, impact-analyze existing TCs (update vs create new), draft test cases with correct naming/metadata/preconditions, and link back via Create Test Case Issue Link. Use when converting a Jira story into Zephyr TCs, or when requirement changes require updating existing TCs rather than creating duplicates.'
metadata:
  triggers:
    files:
    - '**/user_story.md'
    keywords:
    - generate test cases
    - zephyr
    - impact analysis
    - create test case
---
# Zephyr Test Generation Standards

## **Priority: P1 (HIGH)**

## Workflow: Jira → Zephyr

1. **Analyze Requirements**:
 - Extract: Summary, ACs, Platform per AC row, Market, Components.
 - Fetch Jira with `?expand=renderedFields` — HTML authoritative for platform colors:
 `#00B8D9` = Web · `#36B37E` = Mobile · `#FF991F` = Web+Mobile
 - See [Actor/Permission Matrix](../quality-engineering-business-analysis/references/analysis_patterns.md) for role/market logic.

2. **Impact Analysis** (run before any TC creation)
 - **Step — Direct Lookup**: Call `Get Issue Link Test Cases` with Jira issue key (e.g., `{PROJECT}-{ID}`).
 - **Step B — Supplemental**: If Step 0, search by `[Module]` and `[Screen]` keywords + check sibling issue links.
 - See [Discovery Protocol](references/impact_analysis.md) for full chain.
 - Map each AC to coverage status:
 - **Covered** → ask user: skip or update to current format?
 - **Partial** → always propose NEW TC.
 - **Not Covered** → always create NEW TC.

3. **Draft Artifact**:
 - Delete any existing `zephyr_test_plan.md` before writing.
 - Follow 4-section format in [TC Format Reference](references/tc_format.md) exactly.
 - After writing: read back file and print full content in chat so user can review without opening it.
 - Ask for: review approval, handling of Covered ACs, and Zephyr Folder ID.

4. **Create in Zephyr** (after explicit user approval)
 - `Create Test Case` (with `customFields` included — no separate Update needed) → `Create Test Case Steps` → `Create Test Case Issue Link`
 - For **updates** to existing TCs: fetch current steps via `Get Test Case Steps`, show before/after diff, wait for explicit approval, then `Update Test Case`.

## Platform Rules

| AC row | Action |
| ------------------------------------------- | --------------------------------------------------------------- |
| Single row `[ WEB + MOBILE ]` | ONE TC, Platform = "Web and Mobile", no platform prefix in name |
| Two rows same behavior, different platforms | TWO TCs with `Web_` / `Mobile_` prefix — never merge |

## Naming & Filing

- **Name**: Prefix `Web_` / `Mobile_` only when platform-exclusive; omit prefix for Web and Mobile.
- **Folder**: Use exact Folder ID provided by user or specified in Technical Impact.

### Role Mapping Rule

- **CRITICAL**: If Acceptance Criteria uses generic terms like "user", "buyer", or "customer" in ordering/checkout context, it MUST mapped to ALL purchasing roles: `["Client user", "Client admin", "Internal sales rep", "External sales rep"]`. not default to `Client user`.

## API Critical Notes (SmartBear MCP — `@smartbear/smartbear-mcp`)

- **`Create Test Case`** requires `projectKey="{PROJECT}"` and supports `customFields` directly (no separate Update needed for Roles/Platform).
- **`Create Test Case Steps`** uses `testCaseKey` + `mode` (APPEND/OVERWRITE) + `items[]`.
- **`Create Test Case Issue Link`** uses `testCaseKey` + `issueId` (numeric Jira issue ID — get from ticket's `id` field, not key string).
- **`Get Issue Link Test Cases`** uses `issueKey` (e.g., `{PROJECT}-{ID}`) — returns linked TC keys directly.
- **`Update Test Case`** uses `testCaseKey` — only needed when modifying existing TCs, not for new creation.

## Anti-Patterns

- **No prefix omission**: TC name sent to Zephyr API must include `Web_` or `Mobile_` prefix for platform-exclusive TCs — copy verbatim from artifact draft; omit prefix only when Platform = "Web and Mobile".
- **No Draft skip**: Always set status = Draft; never auto-approve.
- **No flat folderId**: Use `"folder": {"id": X}` in all PUT payloads.
- **No WEB+MOBILE split**: One AC row = one TC with Platform "Web and Mobile".
- **No platform merge**: Two AC rows, different platforms = two separate TCs.
- **No silent update**: Show before/after diff; wait for explicit approval.
- **No lookup skip**: Always run Step direct link lookup before supplemental search.
- **No stale artifact**: Delete existing `zephyr_test_plan.md` before each run.
- **No coverage skip**: Coverage Analysis table must open every artifact.
- **No ghost update**: Update Zephyr TC whenever matching code changes.
- **No vague steps**: Use specific observable outcomes — e.g., `"System works"` → `"Banner 'Success' is visible"`.