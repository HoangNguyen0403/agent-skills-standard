# Journey Maps — agent-skills-standard

Three representative journeys, all mapped to the approved criteria
`AC-01`–`AC-14` / `SRS VER-001`–`VER-007`. Canonical criteria are referenced,
never restated here; the doctor binds their exact digests.

| Journey | Surface | Entrypoint | Recipe | Map |
| --- | --- | --- | --- | --- |
| `JRN-TRACE-01` | repo CLI | `scripts/trace/index.ts` | `recipes/trace-audit.json` | [trace-audit-cli.md](trace-audit-cli.md) |
| `JRN-OUTCOME-01` | repo CLI | `scripts/outcome/index.ts` | `recipes/outcome-audit.json` | [outcome-audit-cli.md](outcome-audit-cli.md) |
| `JRN-CONSUMER-01` | production lib + repo CLI | `cli/src/{services,mcp}` + `cli/src/index.ts doctor` | `recipes/consumer-sync.json` | [consumer-sync-doctor.md](consumer-sync-doctor.md) |

## Coverage boundary

- Only local, offline surfaces are driven. No registry download, no network target, no
  credentials, no external consumer project.
- No native provider/model invocation is performed or claimed. MCP `WorkflowIndex`
  discovery proves local installed-canonical discovery (path + digest + native export
  parity), not that an agent or provider executed anything.
- Traces and outcome audits are document/schema checks only: they never assert that
  implementation, execution, or approval exists.

## Shared and journey-scoped inputs

Every journey declares the exact files it consumes. Two of the three journeys consume the
shared CLI policy recipe; the consumer journey does not. Freshness is exercised by mutating
fields the runner actually reads, never by adding unused probe keys:

- journey-scoped: the `trace-empty-scope` scenario argument in `recipes/trace-audit.json`;
- shared: `timeout_ms` in `recipes/cli-policy.json`, applied by `runCli` to trace and
  outcome only.

In both cases the prior proof is withheld, the affected journeys are re-driven live under
the mutated input, and the owned recipe is restored and re-driven again with the digest
verified. The independent consumer journey keeps its unmodified identity. The disposition
is recorded `pending-manual-owner`; the kit never grades its own freshness verdict.
