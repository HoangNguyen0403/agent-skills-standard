# Logic Truth Tables (Requirement Simplification)

## Goal

Convert complex `AND/OR` requirements into a binary matrix to eliminate logic gaps before coding.

## Pattern: Boolean Permutation Matrix

When a feature is controlled by multiple independent variables (e.g., Toggles, Market, Role), create a truth table:

### Example: Payment Terms Visibility

Variables:

- **A**: `Enable Payment Terms` (Toggle)
- **B**: `Disable for Customer` (Toggle)
- **C**: `User Role` (Sales Rep = 1, Customer = 0)

| A (Enable) | B (DisableCus) | C (IsSalesRep) | **Result (Visible?)**       |
| :--------: | :------------: | :------------: | :-------------------------- |
|     1      |       0        |       0        | **YES** (Standard)          |
|     1      |       1        |       0        | **NO** (Override Disable)   |
|     0      |       X        |       0        | **NO** (Master Kill Switch) |
|     0      |       X        |       1        | **YES** (Sales Rep Bypass)  |
|     1      |       1        |       1        | **YES** (Sales Rep Bypass)  |

## Implementation Strategy

1. **Identify Variables**: Extract all "If", "When", and "Unless" conditions.
2. **Assign Values**: (1 = Enabled/True, 0 = Disabled/False, X = Don't Care).
3. **Map Results**: Fill row behavior based on Acceptance Criteria.
4. **Identify Gaps**: If a row is missing in the Jira AC, flag it as an **Undefined State**.

## Benefits

- Prevents "Side-Effect" bugs when one toggle accidentally overrides another.
- Direct input for unit test case generation.
