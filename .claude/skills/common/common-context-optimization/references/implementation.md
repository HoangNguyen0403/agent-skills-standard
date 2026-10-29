# Implementation and Cost Measurement

## Handoff Packet

Carry goal, deliverable, active slice, scope, authority, decisions, blockers, evidence links, and next action. Keep revision IDs and ownership explicit.

## Cost & Accounting Boundaries

Measure separately, where the host exposes them:

- Cache-read tokens/cost.
- Replayed or uncached input.
- Output and retry/replay cost.
- Total actor/task cost across workers and handoffs.

### Accounting Invariants & Semantics

- **Missing ≠ Zero**: When metric fields or token counts are absent from runtime logs or tool receipts, mark them as `unknown` or `unavailable`. Never coerce missing values to 0 or derive false $0.00 estimates.
- **Partial Lineage**: If pricing rates (prompt, completion, cache, reasoning) or subagent token traces are incomplete, total cost remains `partial` or `unknown`. Do not assert exact dollar amounts.
- **Shared vs Worker-Only Slices**: A worker subagent's token usage represents only its local slice, excluding shared parent orchestration and sibling runs. Do not claim subagent metrics as whole-task totals or assert net token savings without a measured full-system baseline.
- **Lifecycle Distinctness**: Distinct lifecycle stages must not be conflated in reporting:
  1. *Catalog discovery*: Skill metadata or list returned.
  2. *Body fetch*: Skill markdown retrieved.
  3. *Delivery*: Injected into caller prompt/context.
  4. *Active usage*: Skill instructions applied in model generation.
  Listing or loading a skill does not establish model adherence or usage.
- **No Efficacy or Savings Claims**: Never assert model quality uplift or token savings without qualified, independently reproducible measurement evidence against an authoritative baseline.
