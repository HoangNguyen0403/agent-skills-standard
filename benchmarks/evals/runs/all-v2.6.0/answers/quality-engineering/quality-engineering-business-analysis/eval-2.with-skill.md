Assumption: The same rule applies to the relevant Actor on Mobile (and Web, if applicable).

| Variable: Feature toggle | Variable: Order status | Reorder button |
|---|---|---|
| ON | Delivered | Visible |
| ON | Not Delivered | Hidden |
| OFF | Delivered | Hidden |
| OFF | Not Delivered | Hidden |

**Rule:** `Visible = (Toggle ON) AND (Status Delivered)`.
