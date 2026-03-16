# Test Case Creation Standards

## 1. Granularity Guidelines

- **Split by Screen**: Even if features align, separate TCs for "Order Details" vs "Item Details".
  - *Reasoning*: UI implementation differs; bugs are often screen-specific.
- **Split by Condition**: Separate TCs for each configuration path (e.g., "Config A" vs "Config B").
  - *Reasoning*: Traceability; failures point to specific configs.
- **No "OR" Logic**: Each TC must test a single, distinct path.

## 2. Naming Convention

**Pattern**: `[Module]_[Action] on [Screen] when [Condition]`

| Component | Description | Example |
| :--- | :--- | :--- |
| **Module** | High-level feature | `Order`, `Login`, `Payment` |
| **Action** | What is verified | `Verify payment term` |
| **Screen** | Specific UI screen | `item details screen` |
| **Condition** | State/Role/Config | `Enable Payment Terms is OFF` |

### Examples

✅ **Good**:
- `Order_Verify payment term on item details screen when Enable Payment Terms is OFF`
- `Order_Verify payment term on order details screen when Enable Payment Terms is OFF`

❌ **Bad**:
- `Verify Payment Terms Visibility (Disabled)` (Ambiguous screen)
- `Check Payment Terms` (Vague action)

## 3. Priority Levels

- **High**: Critical paths, blockers, core logic.
- **Normal**: Standard validation, edge cases.
- **Low**: Cosmetic, minor improvements.
