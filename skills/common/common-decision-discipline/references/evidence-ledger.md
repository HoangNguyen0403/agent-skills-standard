# Evidence Ledger

| Claim | Status | Source |
| --- | --- | --- |
| Checkout retries failed payments twice | confirmed(src/payments/retry.ts) | code read |
| Most users are on mobile | assumed | no analytics access |
| Provider rate limit under burst load | unknown | needs load test |

Rules:

- `confirmed(<path>)` needs a file path, test name, doc link, or command output you actually inspected.
- `assumed` is allowed only for non-critical facts; list it in Assumptions.
- `unknown` that blocks the recommendation must shape it: recommend the option cheapest to abandon.
- Never upgrade `assumed` to `confirmed` without new evidence.
