Assumption: “Reorder” is visible only when both conditions are true.

| Toggle | Order status | Reorder visible |
|---|---|---|
| ON | Delivered | Yes |
| ON | Not Delivered | No |
| OFF | Delivered | No |
| OFF | Not Delivered | No |

Logic: `visible = toggle === ON && status === Delivered`.
