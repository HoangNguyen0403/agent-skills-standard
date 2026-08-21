# Test Case Impact Analysis (Regression Management)

## Goal

Systematically identify and update existing Zephyr Test Cases affected by new requirements to prevent technical debt and outdated test suites.

## 0. Discovery Protocol (Finding Existing TCs)

Use a multi-pass discovery strategy, starting with the fastest direct lookup.

### Pass 0 — Direct Issue Link Lookup (Primary — always run first)

Use `Get Issue Link Test Cases` MCP tool with the Jira issue key (e.g., `{PROJECT}-{ID}`).
Returns all TCs formally linked to the issue in a single call. This is the fastest and most reliable method.

For each returned TC key, use `Get Test Case` to fetch full details.

### Pass 1 — Supplemental Search (only if Pass 0 yields < 3 TCs)

Use `Get Test Cases` with `projectKey={PROJECT}` and `limit=100` to fetch recent TCs. Filter **client-side**:

- **Objective match:** TCs where `objective` text contains the issue key string

Deduplicate against Pass 0 results.

### Pass 2 — Keyword Fallback (only if Pass 0+1 yield < 3 TCs)

- **Keyword Search**: Search `name` for `[Module]` and `[Screen]` keywords (e.g., "Order History Payment").
- **Link Check**: Use `Get Test Case Links` on candidates to check COVERAGE links to related issues.
- **Folder Audit**: Navigate to the Zephyr folder for the feature area (e.g., `features/order_history`).
- **Sibling Analysis (Jira)**: Find issues sharing the same **Component** or **Labels**; search their linked TCs.

## 1. Identification (Delta Analysis)

- **Step 1**: Search Zephyr for existing TCs mapped to the feature/module in the Jira US.
- **Step 2**: Compare current TC steps with the new Acceptance Criteria (AC).
- **Step 3**: Identify the **Delta** (What changed? What was added? What was removed?).

## 2. Decision Matrix: Update vs. Create New

| Condition        | Action                 | Rationale                                                    |
| :--------------- | :--------------------- | :----------------------------------------------------------- |
| **Logic Shift**  | **Update Existing**    | intent same, behavior evolved (e.g., modified pricing).      |
| **New Platform** | **Create New**         | Requirement expands from Web to Mobile with unique behavior. |
| **New Market**   | **Create New**         | Adding unique Market rule (e.g., VN-only pricing).           |
| **New Branch**   | **Create New**         | Adds parallel condition (e.g., new Sales Org).               |
| **Deprecation**  | **Deactivate/Archive** | Logic no longer valid or completely replaced.                |

## 3. Update Procedure (Requires User Approval)

1. **Fetch**: Read the latest version of the existing TC using `Get Test Case Steps`.
2. **Merge**: Apply the deltas to the steps while preserving unchanged valid steps.
3. **Verify**: Ensure the updated TC still follows [Granularity Standards](../../quality-engineering-quality-assurance/references/test_case_standards.md).
4. **Present Diff (MANDATORY)**: Show the user a clear before/after comparison of every field and step that will change. Wait for explicit user approval ("yes", "approve", "proceed", or equivalent) before continuing.
5. **Publish**: Only after approval, update the TC using `Update Test Case` (this normally increments the version).

## 4. Documentation

- Add a comment to the TC: `Updated per [JIRA-ID]: {Summary of change}`.
- Ensure the Jira-Zephyr link is updated if necessary.
