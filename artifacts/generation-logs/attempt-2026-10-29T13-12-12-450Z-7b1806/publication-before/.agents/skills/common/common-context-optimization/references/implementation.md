# Implementation and Cost Measurement

## Handoff Packet

Carry goal, deliverable, active slice, scope, authority, decisions, blockers, evidence links, and next action. Keep revision IDs and ownership explicit.

## Cost

Measure separately, where the host exposes them:

- Cache-read tokens/cost.
- Replayed or uncached input.
- Output and retry/replay cost.
- Total actor/task cost across workers and handoffs.

Report source, revision, measurement window, and limits. Mark missing telemetry as unknown; estimates are not invoice data or demonstrated savings.
