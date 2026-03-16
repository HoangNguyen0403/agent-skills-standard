# Deep Analysis Patterns & Examples

## 1. Actor Permissions Mapping

_Goal: Identify behavior variance across user roles._

| Actor         | Access               | Constraints                                    |
| :------------ | :------------------- | :--------------------------------------------- |
| **Customer**  | View Order, Pay      | Cannot see "Sales Rep Notes"                   |
| **Sales Rep** | View All, Sync, Edit | Can see all Payment Terms regardless of toggle |
| **Admin**     | Full Access          | Can override toggles                           |

## 2. Logic Conflict Detection (Example)

_Scenario: Order History Payment Display_

- **Declared AC**: "Customers cannot see Payment Terms if `Toggle X` is OFF."
- **Existing System Rule**: "All users in VN Market must see Payment Terms for Legal Compliance."
- **Investigation Result**: 🛑 **P0 Conflict**. Technical toggle conflicts with Regulatory Compliance. Request clarification: "Does Toggle X override Legal requirements?"

## 3. Edge Case Matrix

| Category        | Specific Scenario                 | Expected Behavior (Implicit)                         |
| :-------------- | :-------------------------------- | :--------------------------------------------------- |
| **Network**     | Sync button clicked while offline | Show "No Internet" toast; queue action for retry     |
| **Empty State** | User has 0 orders                 | Display "No Orders Found" with CTA to Store          |
| **Boundary**    | Payment Term > 365 days           | Flag as "Invalid Data" or confirm UI can handle wrap |

## 4. State Investigation

_Example: Order Status vs visibility_

- **State: Pending**: Show Pay button.
- **State: Shipped**: Hide Pay button; show Tracking.
- **State: Cancelled**: Hide all Payment info; show "Refund Processed" if applicable.
