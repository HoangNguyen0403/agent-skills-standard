# Test Case Impact Analysis (Regression Management)

## Goal

Systematically identify and update existing Zephyr Test Cases affected by new requirements to prevent technical debt and outdated test suites.

## 0. Discovery Protocol (Finding Existing TCs)

Since new User Stories (US) are created for every change, direct issue-links won't exist for new US. Follow this discovery chain:

- **Keyword Search**: Query Zephyr using the `[Module]` and `[Screen]` identified in the Naming Convention (e.g., search "Order History Payment").
- **Folder Audit**: Navigate to the Zephyr folder corresponding to the feature area (e.g., `features/order_history`).
- **Sibling Analysis (Jira)**:
  - Find other Jira issues with the same **Component** or **Labels**.
  - Use `get_issue_link_test_cases` on those "sibling" issues to find linked TCs.
- **Traceability Check**: Use the `business-analysis` skill to identify the "System Area" and check all TCs tagged with that area.

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

## 3. Update Procedure (Seamless Versioning)

1. **Fetch**: Read the latest version of the existing TC using `get_test_case_steps`.
2. **Merge**: Apply the deltas to the steps while preserving unchanged valid steps.
3. **Verify**: Ensure the updated TC still follows [Granularity Standards](../../quality-assurance/references/test_case_standards.md).
4. **Publish**: Update the TC using `update_test_case` (this normally increments the version).

## 4. Documentation

- Add a comment to the TC: `Updated per [JIRA-ID]: {Summary of change}`.
- Ensure the Jira-Zephyr link is updated if necessary.
