# Test Case Creation Standards

## 1. Granularity Guidelines

- **Split by Screen**: Even if features align, separate TCs for "Order Details" vs "Item Details".
  - _Reasoning_: UI implementation differs; bugs are often screen-specific.
- **Split by Condition**: Separate TCs for each configuration path (e.g., "Config A" vs "Config B").
  - _Reasoning_: Traceability; failures point to specific configs.
- **No "OR" Logic**: Each TC must test a single, distinct path.

## 2. Naming Convention

**Pattern**: `[Platform_]Module_Action on Screen when Condition`

| Component     | Description        | Example                       |
| :------------ | :----------------- | :---------------------------- |
| **Platform**  | Optional prefix    | `Web_`, `Mobile_`             |
| **Module**    | High-level feature | `Order`, `Login`, `Payment`   |
| **Action**    | What is verified   | `Verify payment term`         |
| **Screen**    | Specific UI screen | `item details screen`         |
| **Condition** | State/Role/Config  | `Enable Payment Terms is OFF` |

### Platform Prefix Rules

- **Include** `Web_` or `Mobile_` ONLY if the requirement is exclusive to one platform.
- **Omit** the prefix if the test case applies to both Web and Mobile.

### Examples

✅ **Good**:

- `Order_Verify payment term on item details screen when Enable Payment Terms is OFF` (Applies to both)
- `Web_Order_Verify pagination on item list screen when more than 50 items` (Web exclusive)
- `Mobile_Order_Verify pull-to-refresh on item list screen` (Mobile exclusive)

❌ **Bad**:

- `Verify Payment Terms Visibility (Disabled)` (Ambiguous screen)
- `Check Payment Terms` (Vague action)
- `Web_Login_Verify login on login screen` (Omit prefix if behavior is identical on both)

## 3. Priority Levels

- **High**: Critical paths, blockers, core logic.
- **Normal**: Standard validation, edge cases.
- **Low**: Cosmetic, minor improvements.
