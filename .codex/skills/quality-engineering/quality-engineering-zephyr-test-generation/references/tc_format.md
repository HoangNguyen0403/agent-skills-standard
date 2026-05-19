# TC Artifact Format Reference

## zephyr_test_plan.md — 4-section structure

### Section 1 — Existing TCs

`TC Key | Platform | Objective` (3-column table)

### Section 2 — AC Coverage Map

`AC | Platform | Status | Risk | Existing TC | Gap | New TC` (7-column table)

- Status: `Covered` / `Partial` / `Not Covered`
- Risk: `HIGH` / `MEDIUM` / `LOW` / `—`

### Section 3 — QE Debt (if any)

`ID | Item | Priority | Rationale` (4-column table)

### Section 4 — Proposed Test Cases

Open with an Index table, then one `###` block per TC:

```bash
### Index
| TC  | Name              | Platform | Priority | AC  |
|-----|-------------------|----------|----------|-----|
| TC1 | Web_Module Name | Web      | High     | AC1 |

---

### TC1 · Web_Module Name · AC1

- **Platform**: Web
- **Priority**: High
- **Status**: Draft
- **Labels**: VNS-Market, {PROJECT_KEY}-{ID}
- **Roles**: Client user, Client admin, Internal sales rep, External sales rep (or any other exact role from Confluence like Zp admin, Root admin)
- **Objective**: Verify [behavior]. Covers AC1.

**Preconditions**:
- [bullet list — NOT inside a table cell]

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to {APP_NAME} as a VN {APP_NAME}+ user | {APP_NAME} homepage is displayed |
| 2 | Add data to cart → navigate to target screen | User is on [screen] |
| 3 | Verify [element or behavior] | [Observable outcome] |
```

## Step Writing Rules

- **Split Step 1**: Login = its own step. Step 2 = data setup + navigate.
- **Short cells**: ≤80 chars. Use `→` for navigation chains.
- **No verbatim quotes**: Describe intent, not full quoted text.
- **Combine trivials**: `price reads "FREE" and "Bonus" tag visible` = one step.
- **Expand options**: Each screen/config variant in Given/When = separate step.

## After Writing the File

Read back `zephyr_test_plan.md` and print its full content in the chat response — user reviews rendered markdown in-conversation, no file opening needed.
