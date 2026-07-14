---
name: quality-engineering-quality-assurance
description: Write or review manual Zephyr test cases with 1-condition-per-TC granularity, Module_Action on Screen when Condition naming, platform prefix rules, and High/Normal/Low priority classification. Use for test-case authoring and review; defer Jira traceability, linking, and pushing cases to Zephyr.
metadata:
  triggers:
    keywords:
    - test case
    - manual test
    - zephyr
    - test scenario
    - naming convention
    - acceptance criteria
---
# Quality Assurance Standards

## **Priority: P1 (HIGH)**

## 1. Test Case Granularity

- **1 Test Case = 1 Condition on 1 Screen**.
 - **Split Screens**: "Order Details" & "Item Details" separate.
 - **Split Conditions**: "Config " & "Config B" separate.
- **No "OR" Logic**: Each TC must test single, distinct path.

## 2. Naming Convention

- **Pattern**: `Platform_Module_Action on Screen when Condition` (e.g., `Web_Order_Verify...` or `Mobile_Order_Verify...`)
- **Rule**: Only include `Web_` or `Mobile_` prefix if requirement exclusive to one platform. Omit prefix if it supports **Both**.
- **Example**: `Order_Verify payment term on Item Details when Toggle is OFF` (Supports Both)

## 3. Priority Levels

Use priority rationale to justify each classification:

- High: Critical path, blocker bug.
- Normal: Standard validation, edge case.
- Low: Cosmetic, minor improvement.

## 4. References

- [Detailed Examples](references/test_case_standards.md)

## Anti-Patterns

- **No Broad TCs**: `"Verify order flow works"` — too broad; every TC must cover exactly 1 condition on 1 screen
- **No Shared TCs (Divergent)**: Testing Web and Mobile behavior in single TC when behavior diverges — split into separate TCs per platform
- **No Incomplete Naming**: `Order_Verify page` — name must follow full pattern: `Module_Action on Screen when Condition`
- **No Priority Inflation**: Marking cosmetic spacing bug as High priority — reserve High for critical path blockers only

## Review wording

- Call out naming violations explicitly when a test case breaks the naming convention, then split it into separate TCs with one condition on one screen.

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
-  naming violations
- 1 Test Case = 1 Condition
- High: Critical path
- Low: Cosmetic
- Module_Action on Screen when Condition
- No "OR" Logic
- Split into separate TCs
- priority rationale
