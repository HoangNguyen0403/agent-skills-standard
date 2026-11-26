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
Applies to **every skill in this registry**. Maximize **Token ROI**: every line must provide specific procedural value. **Activation** (how it triggers) and **Implementation** (how it helps) are the primary quality metrics. Host/core policy (permissions, privacy, evidence honesty, protected resources) outranks this skill: reference it, never duplicate or override it. Loading: **L1** frontmatter `name` + `description`, ≤100 words; **L2** SKILL.md body, ≤100 lines; **L3** `references/` on demand.

## Obligation Classes

Classify every normative instruction before writing, auditing, or rewriting it. If classification is ambiguous, retain the obligation and raise it for review; an example may illustrate a shape, never observed evidence.

- **Hard invariant** — authority, safety, privacy, evidence honesty, approval, and required review gates. Preserve; never waive without the owning policy's decision.
- **Method default** — a preferred technique. Adapt when evidence shows a better method inside the same scope.
- **Task constraint** — a requirement of the current brief (scope, output shape, environment). Bind that task only.
- **Reference** — detail loaded on demand. Move it to `references/` when discovery remains reliable.

## Workflow (New or Existing Skill)
**New skill:**
1. **Research** — web-search domain best practices; extract terms → triggers, workflows → guidelines, mistakes → anti-patterns. See [Web Search Research](references/web-search-research.md).
2. **Capture intent** — outcome, trigger, expected output, acceptance criteria, scope/authority, delegated choices, required evidence, stop condition.
3. **Classify obligations** — label hard invariants, method defaults, task constraints, references before drafting.
4. **Draft** — use [TEMPLATE.md](references/TEMPLATE.md).
5. **Test & evaluate** — parallel with-skill vs without-skill (baseline); grade assertions and benchmark (pass rate, tokens, time).
6. **Iterate** — rewrite from feedback; rerun into the next iteration dir; repeat.
7. **Optimize description** — trigger eval queries, target ≥90% accuracy (matching release readiness).
8. **Pressure-test** — discipline skills: capture excuses, red flags, stop conditions.
   **Existing skill:**
9. **Audit** — run Quality Checklist; identify violations and classify obligations.
10. **Snapshot** — `cp -r <skill-dir> <workspace>/skill-snapshot/` before edits.
11. **Improve** — fix violations, compress, move oversized content to `references/`.
12. **Test & evaluate** — parallel with-new-skill vs snapshot (baseline); grade and benchmark.
13. **Iterate & optimize** — repeat until stable; re-run trigger eval if description changed.
14. **Harden** — add rationalization counters where agents still fail under pressure.
    See [Eval Workflow](references/eval-workflow.md) for full testing + iteration details.

## Description Quality (Activation)

- **Third-Person What + When**: `Standardizes...`, never "I will"; define 5–8 capabilities and explicit triggers (`Use when user says 'rotate keys'`).
- **Specificity & Hint**: Avoid vague verbs ("manage", "handle"); use concrete verbs ("Validate", "Inject"); add `(triggers: *.ext, keyword)` for technical skills.

## Content Quality (Implementation)

- **No Redundant Knowledge**: Do NOT explain concepts AI already knows (standard HTTP codes, language syntax, basic SOLID). Focus on project-specific rules and constraints.
- **Readable Compact Style**: Size is an editorial budget, not a behavioral quality claim; prefer compact imperative language over filler or speculative prose. One clause of rationale for a non-obvious constraint is allowed when it improves generalization; delete ceremony and restatement.
- **Actionability**: Commands and snippets must be runnable; prose must state a concrete decision or check.
- **Labeled Illustrations**: When an ambiguous output shape needs an example, mark it `Illustrative` and keep it structurally distinct from reported results. Never fabricate result rows, verification output, or evidence.
- **Progressive Disclosure**: Move code blocks >10 lines to `references/`; prescribe sequence only where dependency, auditability, or safety requires it.
- **Pressure Hardening**: Discipline skills must name red flags, common excuses, and exact stop/restart conditions.

## Outcome Briefs & Correction

- **Brief & Delegation**: state outcome, relevant context, acceptance criteria, authorized scope, delegated method choices, required evidence, and stop condition; omit fields that add nothing. Let the agent choose method inside the boundaries; an unrelated improvement is a proposal, not scope permission.
- **Correction**: identify the mismatch, cite evidence, name the failed criterion, set the repair boundary, then verify only affected behavior. Without new evidence, stop and name the missing input instead of retrying or switching method.
- **Portability**: no model names, provider knobs, chat channels, containers, or mount paths in canonical guidance. See [Outcome-Driven Guidance](references/outcome-driven-guidance.md).

## Evidence Tiers & Guardrails

- **Three Evidence Tiers**: Distinguish (1) structural checks, (2) textual transcript evidence, and (3) executable outcomes.
- **Oracle & Pressure Hardening**: Pressure `behavior_assertions` are positive contains/token checks, not semantic safety guarantees. Regular typed assertions + finite decision-shape controls must reject keyword-stuffed refusal-plus-violation answers; do not claim keyword presence alone establishes compliance. Oracles must test valid paraphrases, quoted unsafe text in refusals, keyword stuffing, partial compliance, and routing negatives; never encode a decision as a bare substring ban on wording a compliant refusal may quote.
- **Digest Binding & Thresholds**: Bind scorer, evals, and generated metadata digests to candidate checkout; no engine-mismatch waiver. Target ≥90% trigger rate (recall & specificity per `readiness.ts`). Retain host guardrails until verified deterministic runtime enforcement replaces them.
- **Discovery & Publication Preflight**: Distinguish search failure/checkout absence from absent capability (search authorized refs/worktrees first). When publishing registry or native export packages, verify final canonical→host ID-set and resource parity and real consumer discovery; review private paths/links and one-way manifests; separate warnings/skips/NOT RUN. Keep publication separate from activation.

## Anti-Patterns

- **No "AI-splaining" or Answer-Anchor Padding**: Do not explain why a pattern is good unless it is a unique constraint; do not insert keywords solely to satisfy string-match tests or fake compliance.
- **No Fake Evidence or Blanket Bans**: Never present an illustration, placeholder, or expected value as an observed run; ban fabricated results, not labeled illustrations.
- **No Search-Absence Conflation**: Do not assume missing local search = absent capability; search authorized refs/worktrees.
- **No Vague or Bloated Guidance**: Never use `src/**` or `**/*`; if the description exceeds 100 words, move capabilities to the body; extract blocks >10 lines.
- **No Untested Guardrails**: Rules not validated against baseline failure are unverified speculation.

## Quality Checklist (Tessl-Aligned)

- [ ] **Activation & Implementation ≥ 90%**: Description covers capabilities ("What") and triggers ("When"); no general-purpose explanations; commands runnable; illustrations labeled; trigger rate ≥90% on should-trigger queries.
- [ ] **Structural Compliance**: SKILL.md ≤ 100 lines; code blocks moved to `references/`.
- [ ] **Obligation Disposition**: No hard invariant removed or downgraded to a method default; every change has a rationale.
- [ ] **Behavioral Evidence**: Guardrail skills include rationalizations, red flags, behavior eval fields, and should/should-not trigger cases.
## References

- [Skill Template](references/TEMPLATE.md) — load when starting new skill from scratch
- [Outcome-Driven Guidance](references/outcome-driven-guidance.md) — load when writing briefs, illustrations, or corrective guidance
- [Anti-Patterns Detail](references/anti-patterns.md) — load when fixing or reviewing anti-pattern format
- [Size & Limits](references/size-limits.md) — load when SKILL.md approaches 100 lines
- [Resource Organization](references/resource-organization.md) — load when deciding where to place content (scripts/, references/, assets/)
- [Testing & Trigger Rate](references/testing.md) — load when writing evals or measuring trigger rate
- [Eval Workflow](references/eval-workflow.md) — load when running parallel subagent tests
- [Full Lifecycle](references/lifecycle.md) — load for complete phase-by-phase creation guide
- [Web Search Research](references/web-search-research.md) — load when creating skill for unfamiliar or non-engineering domain
