# Routing Table — What Each Tier Changes

| Concern | `tier=low` (0-2) | `tier=medium` (3-4) | `tier=high` (5-6) |
| --- | --- | --- | --- |
| Autonomy | Autonomous; proceed without plan approval in autonomous mode | Guided; plan shared, self-review before handoff | Plan-first; **HARD STOP** for plan approval before any code |
| Verification | Focused tests + lint on changed files | Full TDD loop per `common-tdd`, self-review of diff | Full TDD loop + independent verification via `verify-work` |
| Review mode (`code-review`) | `fast`: changed files + direct call graph | `deep`: related flows, boundaries, prior incidents | `deep` plus specialist fanout |
| Reviewer specialists | none required | `specialist-test-gap-finder` when tests changed | `specialist-architecture-guard`; `specialist-security-reviewer` when auth/trust/money touched; `specialist-test-gap-finder` |
| Human approval | none | plan acknowledged | plan approved before code, merge approved by a human |
| `model_tier` | `fast` | `standard` | `strong` |
| Monitoring | none | watch first CI run | watch CI and first production window |

## Workflow Gates by Tier

| Workflow | Effect |
| --- | --- |
| `sdlc` | Records `snc_tier`/`model_tier` in Handoff Payload; tier drives autonomy in Step 4. |
| `dev-fix` | HARD STOP mandatory at `tier=high`; `tier=low` may skip plan approval in autonomous mode. |
| `implement-feature` | `tier=high` adds architecture-guard and security-reviewer before `verify-work`. |
| `code-review` | Default `fast` at `tier=low`, `deep` otherwise, when the user has not chosen a mode. |

## `model_tier` Semantics

Runtime-neutral hint. Adapters map `fast` / `standard` / `strong` to whatever model ladder the runtime exposes; never hardcode a vendor model name in a workflow.
