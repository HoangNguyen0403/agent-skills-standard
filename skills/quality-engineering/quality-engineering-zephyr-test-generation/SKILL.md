---
name: quality-engineering-zephyr-test-generation
description: 'Generate Zephyr test cases from Jira stories: parse AC, identify platform and market, impact-analyze existing TCs (update vs create new), draft test cases with correct naming/metadata/preconditions, and link back via create_test_case_issue_link. Use when converting a Jira story into Zephyr TCs, or when requirement changes require updating existing TCs rather than creating duplicates. (triggers: **/user_story.md, generate test cases, zephyr, impact analysis, create test case)'
---

# Zephyr Test Generation Standards

## **Priority: P1 (HIGH)**

## Workflow: Jira → Zephyr

1. **Analyze Requirements**:
   - Extract: Summary, ACs, Platform per AC row, Market, Components.
   - Fetch Jira with `?expand=renderedFields` — HTML is authoritative for platform colors:
     `#00B8D9` = Web · `#36B37E` = Mobile · `#FF991F` = Web+Mobile
   - See [Actor/Permission Matrix](../quality-engineering-business-analysis/references/analysis_patterns.md) for role/market logic.

2. **Impact Analysis** (run before any TC creation)
   - **Step A — Direct Lookup**: Call `get_issue_link_test_cases` with the Jira issue key (e.g., `EZRX-42302`).
   - **Step B — Supplemental**: If Step A is 0, search by `[Module]` and `[Screen]` keywords + check sibling issue links.
   - See [Discovery Protocol](references/impact_analysis.md) for full chain.
   - Map each AC to coverage status:
     - **Covered** → ask user: skip or update to current format?
     - **Partial** → always propose a NEW TC.
     - **Not Covered** → always create a NEW TC.

3. **Draft Artifact**:
   - Delete any existing `zephyr_test_plan.md` before writing.
   - Follow the 4-section format in [TC Format Reference](references/tc_format.md) exactly.
   - After writing: read back the file and print full content in the chat so the user can review without opening it.
   - Ask for: review approval, handling of Covered ACs, and the Zephyr Folder ID.

4. **Create in Zephyr** (after explicit user approval)
   - `create_test_case` → `update_test_case` (add custom fields) → `create_test_case_steps` → `create_test_case_issue_link`
   - For **updates**: fetch current steps, show before/after diff, wait for explicit approval.
   - See [Zephyr Schema](references/zephyr_schema.json) for full API payload structure.

## Platform Rules

| AC row                                      | Action                                                          |
| ------------------------------------------- | --------------------------------------------------------------- |
| Single row `[ WEB + MOBILE ]`               | ONE TC, Platform = "Web and Mobile", no platform prefix in name |
| Two rows same behavior, different platforms | TWO TCs with `(Web)` / `(Mobile)` prefix — never merge          |

## Naming & Filing

- **Name**: Prefix `(Web)` / `(Mobile)` only when platform-exclusive; omit for Web and Mobile.
- **Folder**: Use the exact Folder ID provided by the user or specified in Technical Impact.

## API Critical Notes

- PUT requires ID objects: `"status": {"id": N}`, `"priority": {"id": N}`, `"project": {"id": N}` — strings cause 400.
- PUT folder: `"folder": {"id": N}` (nested) — flat `folderId` is silently ignored and wipes the folder.
- After every PUT: fetch TC and assert `folder.id` is non-null; re-issue if null.
- Jira link: `POST /testcases/{key}/links/issues` with `{"issueId": <numeric>}` — not `/issuelinks`.

## Anti-Patterns

- **No prefix omission**: TC name sent to Zephyr API must include `(Web)` or `(Mobile)` prefix for platform-exclusive TCs — copy verbatim from the artifact draft; omit only when Platform = "Web and Mobile".
- **No Draft skip**: Always set status = Draft; never auto-approve.
- **No flat folderId**: Use `"folder": {"id": X}` in all PUT payloads.
- **No WEB+MOBILE split**: One AC row = one TC with Platform "Web and Mobile".
- **No platform merge**: Two AC rows, different platforms = two separate TCs.
- **No silent update**: Show before/after diff; wait for explicit approval.
- **No lookup skip**: Always run Step A direct link lookup before supplemental search.
- **No stale artifact**: Delete existing `zephyr_test_plan.md` before each run.
- **No coverage skip**: Coverage Analysis table must open every artifact.
- **No ghost update**: Update the Zephyr TC whenever matching code changes.
- **No vague steps**: Use specific observable outcomes — e.g., `"System works"` → `"Banner 'Success' is visible"`.
