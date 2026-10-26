---
name: common-task-complexity-routing
description: Scores a task on Spread, Novelty, Centrality (0-6), routes the tier to autonomy, verification, review and model tier, and gives provider-neutral capability/effort guidance that preserves configured profiles. Use for sizing, model routing, LLM model selection, thinking level or model tier.
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
      - model routing
      - llm model selection
      - model selection
      - model capability
      - thinking level
      - reasoning effort
      - effort selection
      - premium model
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

`fast | standard | strong` is a capability hint only. Each host maps it to its model ladder and binds the named review roles to its own invocation mechanism; the hint is not authorization: premium spend, account selection and execution mode remain host/human decisions.

## Capability and Effort

Capability and thinking effort are independent dimensions. Recommend the least expensive **eligible** configuration adequate for the task and its verification burden; never simply the cheapest model. The host resolves eligibility, approved profiles, supported effort and authorized fallback.

- Deterministic operation uses an existing tool, script or CLI before any LLM call; bounded implementation uses tier-appropriate capability with focused tests.
- Ambiguous investigation: wider effort, because premature narrowing costs more than the extra reasoning.
- Consequential review: capable model plus an independent reviewer; a small diff never lowers a sensitivity floor.

Explicit configured model and effort settings are preserved, not silently replaced. Unsupported or unknown effort is recorded `unsupported`/`unknown`, never mapped across vendors. Resolved settings, receipt fields, cost semantics and recovery routes: [Capability and effort resolution](references/routing-table.md#capability-and-effort-resolution).

## Sensitive-Change Risk Floor

Sensitive changes touching authentication, authorization, payments/financial data, data integrity, secrets, or system trust boundaries have an explicit risk floor independent of arithmetic SNC totals:
- **Floor**: Minimum `tier=medium` (guided execution, deep review, human plan acknowledgment) even if arithmetic total is ≤2 (e.g. S=0, N=0, C=2).
- **High Sensitivity**: If spread or novelty is non-zero (S≥1 or N≥1 with C=2), enforce `tier=high` (plan-first HARD STOP, independent security review, human merge approval).
- **Irreversible Actions**: Actions involving data destruction, schema drops, credential rotation, privilege escalation, or production cutover strictly require explicit human authorization regardless of tier.

## Rules

- Score before planning; emit `snc_tier` and `model_tier` in every Handoff Payload.
- Record requested capability, observable actual configuration, selection reason, effort support and limitations in the existing receipt; unknown stays unknown.
- Label the score as inference when derived from ticket text alone; re-score after `specialist-codebase-scout` reports impact radius.
- Round up on doubt. Any auth, money, trust-boundary, or hot-path touch is C=2 and subject to the sensitive-change risk floor.
- Downward complexity reassessment is permitted ONLY with documented new evidence (e.g., scouted blast radius proves isolated scope with verified non-interference), NEVER to bypass unresolved risk, required approvals, or the sensitive-change risk floor.
- Re-score when scope grows mid-task; the tier must rise immediately when expansion is detected.
- Never downgrade a tier to skip a gate. Ticket type (bug vs feature) never sets the tier.
## Red Flags

Stop and re-score when hearing or thinking: "it's just a bug fix", "one-line change", "skip the plan, it's small", "we'll review it later", "mark it low so we can merge tonight". Each is a rationalization, not a score.

## Anti-Patterns

- **No tier by ticket type**: "bug" and "feature" say nothing about S, N, or C.
- **No averaging**: three 1s and one 2/0/1 both route differently only when summed.
- **No silent tier**: a plan or handoff without `snc_tier` is incomplete.
- **No high tier without named reviewers**: `tier=high` must list which specialists review before merge.
- **No premium by tier**: a `strong` hint never authorizes premium spend or a host account change.
- **No cheapest-model reflex or silent effort mapping**: adequacy includes verification burden and repair cost; vendor effort levels are not equivalent.

## References

- [SNC Rubric with Worked Examples](references/snc-rubric.md)
- [Routing Table Detail](references/routing-table.md)
