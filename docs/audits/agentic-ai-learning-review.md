# agentic-ai Learning Review

Date: 2026-05-14

## Baseline

| Signal | Current |
| --- | --- |
| Skill files | 259 |
| Eval files | 259 |
| Workflow files | 22 |
| Specialist sub-agents | 13 |

## Reviewed Inputs

- `_bmad/bmm/agents`: role menus for PM, architect, dev, QA, analyst, SM, UX, quick solo flow.
- `_bmad/core/tasks`: workflow runner, adversarial review, edge-case review, PRD creation.
- `_bmad/core/workflows`: brainstorming, advanced elicitation, party mode.
- `.claude/agents`: focused sub-agents for Jira, ADO, Zephyr, Confluence, architecture, security, tests, ACs, PR comments.
- `agentic-ezrx-guide-for-new-em.md`: role-based SDLC map, permanent artifacts, traceability, MCP-driven automation.

## Adopted Patterns

| Pattern | Implementation |
| --- | --- |
| Role-specific ownership | Added role quick reference and specialist pack |
| Strict sub-agent budgets | Every new specialist has tool/file cap and no nested sub-agents |
| MCP-aware handoffs | Workflows use MCP when configured, local/exported artifacts otherwise |
| Traceability | Added `traceability-audit` workflow |
| Permanent evidence | Added `session-report` workflow |
| Readiness gate | Added `implementation-readiness` before code |
| PR fanout review | Added `review-ticket` specialist orchestration |

## Not Copied

- BMAD menu/runtime model.
- Company-specific project keys, spaces, markets, repo names, or release cascade rules.
- Verbose step-file architecture as default workflow style.
- Party-mode roleplay as a core SDLC primitive.
- Mandatory external MCP dependency.

## Remaining Gaps

- Strict 90% alignment gate currently fails on 71 older framework skills; current 70% repository gate passes.
- Need real-world sample runs for `review-ticket`, `traceability-audit`, and `session-report`.
- Need future optional standards pack for support/IT workflows if the team wants L1/L2 lifecycle coverage.
