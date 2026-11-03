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

- **Per-slice routing**: Assess delegated slices independently on their own SNC, risk floor, and verification adequacy. Deterministic lookup and bounded edits use tier-appropriate tools/models; do not inherit an expensive parent model tier. Reuse existing discovery evidence where sufficient.
- **Profiles vs roles**: Host profiles (provider, model, mode, features) are explicit execution settings. Prompt role labels or capability hints are not configuration; never launch unchecked workers.
- **Recovery & quota**: Tool argument rejections or unsupported parameters are schema errors, not provider exhaustion; never fall back unchecked. Factual quota exhaustion (429) advances only to authorized eligible fallbacks with recorded evidence.

Explicit configured model and effort settings are preserved, not silently replaced. Unsupported or unknown effort is recorded `unsupported`/`unknown`, never mapped across vendors. Resolved settings, receipt fields, cost semantics and recovery routes: [Capability and effort resolution](references/routing-table.md#capability-and-effort-resolution).

## Sensitive-Change Risk Floor

Auth, payments, data integrity, secrets, or trust boundaries enforce a minimum of `tier=medium` (guided, deep review, human plan acknowledgment) even if arithmetic total is ≤2. Non-zero spread/novelty (S≥1 or N≥1 with C=2) enforces `tier=high` (plan-first HARD STOP, independent security review, human merge approval). Irreversible actions (data destruction, schema drops, cutover) strictly require explicit human authorization.

## Rules

- Score before planning; emit `snc_tier` and `model_tier` in every Handoff Payload.
- Assess delegated slices independently; reuse verified context and avoid inheriting parent model tier for bounded slices.
- Record requested capability, observable actual configuration, selection reason, effort support and limitations in the existing receipt; unknown stays unknown.
- Label the score as inference when derived from ticket text alone; re-score after `specialist-codebase-scout` reports impact radius.
- Round up on doubt. Any auth, money, trust-boundary, or hot-path touch is C=2 and subject to the sensitive-change risk floor.
- Downward complexity reassessment is permitted ONLY with documented new evidence (e.g., scouted blast radius proves isolated scope with verified non-interference), NEVER to bypass unresolved risk, required approvals, or the sensitive-change risk floor.
- Re-score when scope grows mid-task; the tier must rise immediately when expansion is detected.
- Never downgrade a tier to skip a gate. Ticket type (bug vs feature) never sets the tier.
- Do not treat tool parameter rejections as quota exhaustion; report resolution gaps or use authorized routes.

## Red Flags

Stop and re-score when hearing or thinking: "it's just a bug fix", "one-line change", "skip the plan, it's small", "we'll review it later", "mark it low so we can merge tonight", "the tool rejected the model arg so fall back unchecked". Each is a rationalization, not a score.

## Anti-Patterns

- **No tier by ticket type or averaging**: sum S, N, C; ticket type never sets the tier.
- **No silent tier or missing reviewers**: plans carry `snc_tier`; `tier=high` lists specialist reviewers.
- **No premium by tier**: a `strong` hint never authorizes premium spend or host account changes.
- **No cheapest-model reflex or silent effort mapping**: adequacy includes verification burden.
- **No parent-tier inheritance**: bounded/deterministic slices do not inherit expensive parent tiers.
- **No invalid-argument exhaustion**: tool rejections are not quota errors; never fall back unchecked.

## References

- [SNC Rubric with Worked Examples](references/snc-rubric.md)
- [Routing Table Detail](references/routing-table.md)
