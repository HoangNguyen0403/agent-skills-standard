The visibility rule is `toggle = ON AND order status = Delivered`.

| Toggle | Status | Reorder visible? |
|---|---|---|
| OFF | Delivered | No |
| OFF | Not Delivered | No |
| ON | Delivered | Yes |
| ON | Not Delivered | No |

Clarify whether status comparison is exact, whether it is case-sensitive, and whether any other permission, market, platform, or order eligibility rule also gates the button. Also specify what happens when the toggle or order status is loading or unavailable.
