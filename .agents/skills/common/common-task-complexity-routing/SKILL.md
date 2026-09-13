---
name: common-task-complexity-routing
description: Scores a coding task on Spread, Novelty, and Centrality (SNC 0-6) and maps the tier to autonomy, verification depth, review mode, reviewers, model tier. Use when sizing a fix or feature before planning, choosing fast vs deep review, or deciding whether HARD STOP approval is required.
guardrail: true
metadata:
  triggers:
    keywords:
      - task complexity
      - snc score
      - complexity tier
      - difficulty tier
      - autonomy level
      - review depth
      - model tier
      - how big is this change
---
# Task Complexity Routing (SNC)

## **Priority: P1 (HIGH)**

Same ticket label, different engineering difficulty. Score the task, not the label, then route by tier.

## Score

| Dimension | 0 | 1 | 2 |
| --- | --- | --- | --- |
| **Spread** (how far the change reaches) | one file, one module | several files, one module | cross-module or cross-service |
| **Novelty** (new vs existing behavior) | small edit or removal of existing behavior | modify existing logic | new behavior or rewrite |
| **Centrality** (how core the touched code is) | peripheral code | shared but non-core | core domain, hot path, auth, money, trust boundary |

Sum the three, never average. Output line: `SNC: S=[0-2] N=[0-2] C=[0-2] total=[n] tier=[low|medium|high]`.

## Tiers

- `tier=low`: total 0-2
- `tier=medium`: total 3-4
- `tier=high`: total 5-6

## Routing

| Tier | Autonomy | Verification | Review | Approval | `model_tier` |
| --- | --- | --- | --- | --- | --- |
| `tier=low` | autonomous | basic: focused tests + lint | `fast` code-review | none required | `fast` |
| `tier=medium` | guided | TDD + self-review | `deep` code-review | plan reviewed, no HARD STOP | `standard` |
| `tier=high` | plan-first | TDD + independent reviewers (`specialist-architecture-guard`, `specialist-security-reviewer` when relevant) | `deep` code-review | **HARD STOP** before code, human approval before merge | `strong` |

## Rules

- Score before planning; emit `snc_tier` and `model_tier` in every Handoff Payload.
- Label the score as inference when derived from ticket text alone; re-score after `specialist-codebase-scout` reports impact radius.
- Round up on doubt. Any auth, money, trust-boundary, or hot-path touch is C=2.
- Re-score when scope grows mid-task; the tier may only rise, never fall, once work has started.
- Never downgrade a tier to skip a gate. Ticket type (bug vs feature) never sets the tier.

## Red Flags

Stop and re-score when hearing or thinking: "it's just a bug fix", "one-line change", "skip the plan, it's small", "we'll review it later", "mark it low so we can merge tonight". Each is a rationalization, not a score.

## Anti-Patterns

- **No tier by ticket type**: "bug" and "feature" say nothing about S, N, or C.
- **No averaging**: three 1s and one 2/0/1 both route differently only when summed.
- **No silent tier**: a plan or handoff without `snc_tier` is incomplete.
- **No high tier without named reviewers**: `tier=high` must list which specialists review before merge.

## References

- [SNC Rubric with Worked Examples](references/snc-rubric.md)
- [Routing Table Detail](references/routing-table.md)
