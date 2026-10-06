---
name: common-skill-creator
description: "Standardizes the creation and evaluation of high-density Agent Skills (Claude, Cursor, Windsurf). Ensures skills achieve high Activation (specificity/completeness) and Implementation (conciseness/actionability) scores. Use when: writing or auditing SKILL.md, improving trigger accuracy, or refactoring skills to reduce redundancy and maximize token ROI."
metadata:
  triggers:
    files:
      - "SKILL.md"
      - "evals/evals.json"
    keywords:
      - create skill
      - audit skill
      - trigger rate
      - optimize description
---

# Agent Skill Creator Standard

## **Priority: P0 (CRITICAL)**

Applies to **every skill in this registry**. Maximize **Token ROI**. Every line in SKILL.md must provide specific procedural value. **Activation** (how it triggers) and **Implementation** (how it helps) primary quality metrics.

## Three-Level Loading System

- **Level 1** Frontmatter: `name` + `description` (Activation Anchor), ≤100 words.
- **Level 2** SKILL.md body: Core Rules + Workflows (Implementation Core), ≤100 lines.
- **Level 3** references/: Detailed examples, schemas, and "TESTS.md" (On-demand).

## Workflow (New or Existing Skill)
**New skill:**
1. **Research** — web-search domain best practices, checklists, and standards; extract key terms → triggers, workflows → guidelines, mistakes → anti-patterns. See [Web Search Research](references/web-search-research.md).
2. **Capture intent** — what it , when it trigger, expected output format?
3. **Draft the SKILL.md** — draft using [TEMPLATE.md](references/TEMPLATE.md)
4. **Test** — spawn parallel subagents: one with-skill, one without-skill (baseline)
5. **Evaluate** — grade assertions, review benchmark (pass rate, tokens, time)
6. **Iterate** — rewrite based on feedback, rerun into next iteration dir, repeat
7. **Optimize description** — run trigger eval queries, target ≥80% accuracy
8. **Pressure-test** — for discipline skills, capture agent excuses, red flags, and stop conditions
   **Existing skill:**
9. **Audit** — run Quality Checklist below; identify violations
10. **Snapshot** — `cp -r <skill-dir> <workspace>/skill-snapshot/` before any edits
11. **Improve SKILL.md** — fix violations, compress, move oversized content to `references/`
12. **Test** — spawn parallel subagents: one with-new-skill, one with-snapshot (baseline)
13. **Evaluate & iterate** — same as steps 4–5 above
14. **Optimize description** — re-run trigger eval if description changed
15. **Harden** — add rationalization counters where agents still fail under pressure
    See [Eval Workflow](references/eval-workflow.md) for full testing + iteration details.

## Description Quality (Activation)

- **Third-Person Voice**: Use `Standardizes...`, `Audits...`, `Encrypts...`. Avoid "I will" or "This skill helps to".
- **What + When Structure**:
- **What**: Define 5–8 specific capabilities (e.g., "Generates JWT tokens, rotates keys").
- **When**: Explicitly define triggers (e.g., "Use when user says 'rotate keys'").
- **Specificity**: Avoid vague verbs like "manage" or "handle". Use "Validate", "Inject", "Refactor", "Sanitize".
- **Trigger Hint**: Include `(triggers: *.ext, keyword)` suffix for technical skills.
## Content Quality (Implementation)

- **No Redundant Knowledge**: Do NOT explain concepts AI already knows (e.g., standard HTTP codes, common language syntax, basic SOLID definitions). Focus strictly on project-specific rules and constraints.
- **Readable Compact Style**: Size is an editorial budget, not a behavioral quality claim. Prefer readable, compact, imperative language over filler words, conversational phrasing, or speculative prose.
- **Actionability**: Examples must be copy-paste ready and executable.
- **Workflow Clarity**: Use sequential ordered lists for multi-step processes.
- **Progressive Disclosure**: Move code blocks >10 lines to `references/`.
- **Pressure Hardening**: Discipline skills must name red flags, common excuses, and exact stop/restart conditions.

## Evidence Tiers & Guardrails

- **Three Evidence Tiers**: Distinguish (1) structural checks (line counts, frontmatter schema), (2) textual transcript evidence (assertions, rationalization counters), and (3) executable outcomes (runnable verification, verifier pass/fail).
- **Rule Retirement & Ablation**: A rule is a candidate for retirement when repeated, representative, risk-appropriate evaluations (including adversarial cases) show zero regression without it. Candidate status does not authorize removing safety or approval controls; retain host and safety guardrails until verified deterministic runtime enforcement replaces them.
- **Pressure Scenarios**: For discipline skills, record rationalizations agents use to skip rules, define red flags that trigger immediate stop/restart, and score against observable evidence.

## Anti-Patterns

- **No "AI-splaining"**: Do not explain why a pattern is good unless it is a unique project constraint.
- **No Answer-Anchor Padding**: Do not insert arbitrary keywords or phrases solely to satisfy string-match tests.
- **No Vague Triggers**: Never use `src/**` or `**/*`. Keep triggers surgical.
- **No Description Bloat**: If description exceeds 100 words, move capabilities to body.
- **No Long Code Blocks**: Blocks >10 lines must be extracted to `references/`.
- **No Untested Guardrails**: Rules not validated against baseline failure are unverified speculation.

## Quality Checklist (Tessl-Aligned)

- [ ] **Activation ≥ 90%**: Description covers capabilities ("What") and triggers ("When").
- [ ] **Implementation ≥ 90%**: No general-purpose explanations; all examples executable.
- [ ] **Structural Compliance**: SKILL.md ≤ 100 lines; code blocks moved to `references/`.
- [ ] Trigger rate ≥80% on should-trigger queries.
- [ ] Guardrail skills include rationalizations, red flags, behavior eval fields, and should/should-not trigger cases.
## References

- [Skill Template](references/TEMPLATE.md) — load when starting new skill from scratch
- [Anti-Patterns Detail](references/anti-patterns.md) — load when fixing or reviewing anti-pattern format
- [Size & Limits](references/size-limits.md) — load when SKILL.md approaches 100 lines
- [Resource Organization](references/resource-organization.md) — load when deciding where to place content (scripts/, references/, assets/)
- [Testing & Trigger Rate](references/testing.md) — load when writing evals or measuring trigger rate
- [Eval Workflow](references/eval-workflow.md) — load when running parallel subagent tests
- [Full Lifecycle](references/lifecycle.md) — load for complete phase-by-phase creation guide
- [Web Search Research](references/web-search-research.md) — load when creating skill for unfamiliar or non-engineering domain
