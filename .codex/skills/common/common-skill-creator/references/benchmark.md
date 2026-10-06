# Skill Benchmark Rubric

Use this scorecard to quantify how much active skills improve implementation quality.

## 1. Eval-Driven Scorecard

**Source your scorecard from `evals/evals.json`, not from hardcoded patterns.**
For each active P0/P1 skill relevant to the selected file:

| Skill          | P-Level | Failure Pattern (from `not_contains` assertions / Anti-Patterns) | Success Pattern (from `contains` assertions) |
| :------------- | :------ | :--------------------------------------------------------------- | :------------------------------------------- |
| _[skill name]_ | P0/P1   | _[anti-pattern or not_contains value]_                           | _[expected assertion value]_                 |

## 2. Iteration Table (Root Cause Analysis)

For every `❌ FAIL` in the benchmark, identify the root cause:

| Failure            | Root Cause                 | Fix                                         |
| :----------------- | :------------------------- | :------------------------------------------ |
| Skill ignored      | Trigger not matching file  | Refine `packages`/`files` in registry       |
| Rule too vague     | Anti-pattern unclear       | Add `**No X**: Do Y.` line to SKILL.md      |
| Pattern missing    | No reference code          | Add to `references/` folder                 |
| Skills conflict    | Two skills contradict      | Ensure P0 overrides P1                      |
| Missing evals      | No `evals/evals.json`      | Create evals with ≥3 prompts, ≥2 assertions |
| Low eval alignment | Rule ineffective or ambiguous | Clarify procedural logic; do not pad canned keywords |

## 3. Compliance Score Calculation

- **Before Score**: `(Matches / Total Assertions) * 100` = **X%**
- **After Score**: `(Matches / Total Assertions) * 100` = **Y%**
- **Δ Delta**: **+Z%** 🚀

## 4. Evidence Classification & Ablation

Distinguish three types of benchmark evidence:
1. **Structural checks**: Line limits, schema validity, trigger patterns.
2. **Textual transcript evidence**: Assertions scored on model text generation. Never pad canned keywords to game these scores.
3. **Executable outcomes**: Verifier checks, exit codes, and deterministic behavior in fixture workspaces.

### Rule Retirement & Ablation
- **Candidate Identification**: A rule becomes a candidate for retirement when repeated, representative, risk-appropriate evaluations (including adversarial edge cases) show no regression when omitted.
- **Safety Control Invariance**: Sparse or text-only evals never justify retiring safety boundaries, authorization gates, or sensitive-change risk floors. Retain host and safety controls until a verified deterministic runtime enforcement mechanism replaces them.
- **Runtime Replacement**: Retire procedural rules only when deterministic runtime tooling (linters, static analysis, MCP enforcement) demonstrably takes over enforcement.
## 5. Behavior Guardrail Coverage

Use this only for guardrail-oriented skills such as TDD, debugging, verification, protocol, review, and workflow enforcement.

| Signal | Pass Condition |
| :----- | :------------- |
| Pressure scenarios | `pressure_scenarios` has at least 2 realistic shortcut prompts |
| Rationalizations | `rationalizations` lists concrete excuses seen in baseline runs |
| Red flags | `red_flags` lists short stop/restart phrases |
| Behavior assertions | `behavior_assertions` proves the agent follows the protocol |

Report behavior coverage separately from structural quality and token savings.
