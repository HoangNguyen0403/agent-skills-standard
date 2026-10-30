# Log Entry Format

## AGENTS_LEARNING.md Entry Template

Append this block to the **bottom** of `AGENTS_LEARNING.md` for each new learning event.

```markdown
---

## Agent Learning Log: Iteration #N

**Date**: YYYY-MM-DD | **Task**: [one-line task description]
**Signal**: [Pre-write violation | User correction | Session retrospective]
**Skills**: category/skill-name, category/skill-name
**Scope**: session | project | registry
**Candidate**: [id] | **Status**: proposed | evaluating | reviewed | promoted | rejected | rolled-back
**Improvement**: [improvement id or `none`] | **Prevention**: lint | schema | regression-test | evaluation | runtime-control | guidance
**Verification**: [check id, test path, eval run or `pending`]
**Provenance**: [source revision and redacted evidence reference]
**Evaluation**: [run reference or not-run]
**Review**: [independent approval reference or pending]
**Rollback**: [last verified version or not-applicable]

### ❌ Mistake Made
[Concrete description — specific file, rule, function, or output that was wrong]

### 🚫 Pattern to Avoid
- **No [bad pattern]**: [what breaks when you do this]

### ✅ Better Approach
[The correct action going forward — specific and immediately actionable]
```

## Improvement Item

One item per **root cause**, not per occurrence. It is the durable record behind preventive work.

| Field | Rule |
| --- | --- |
| `improvement_id` | Stable id, e.g. `IMP-<slug>-<n>`; reused by later occurrences |
| `root_cause` | routing \| procedure \| example-contradiction \| workflow \| tool-contract \| evaluator \| permission \| environment \| knowledge-gap |
| `mechanism` | lint \| schema \| regression-test \| evaluation \| runtime-control \| guidance |
| `owner` | Accountable human or component owner; absent ownership leaves the item proposed |
| `verification_ref` | Rule/test/eval reference that demonstrates prevention; `pending` until it exists |
| `adoption_status` | proposed \| authorized \| implemented \| verified \| rejected \| rolled-back |
| `authorization_ref` | Explicit maintenance authorization for source or instruction-file edits; otherwise `none` |
| `occurrences` | Append-only list of iteration ids and source revisions that hit the same root cause |

Rules:

- A new occurrence links the existing `improvement_id` and appends its iteration id; it does not create a second item or a second rule.
- `mechanism: guidance` is valid only after a deterministic check, test, evaluation, or runtime control cannot encode the distinction.
- Missing owner, authorization, or verification is recorded as missing, never inferred from repetition count.

## Writing Each Section

| Section | Length | Rule |
| --- | --- | --- |
| **Mistake Made** | 1–3 sentences | Name file/function/line if known; quote the wrong output or rule |
| **Pattern to Avoid** | 1–3 bullets | Format: `**No X**: [consequence]` |
| **Better Approach** | 1–3 sentences | Must state what TO DO, not just what to avoid |
| **Skills** | 0–5 ids | `category/skill` ids the mistake concerns; omit when none; unknown ids are ignored with a warning by the freshness report |

## Governance

- Redact before persistence: no credentials, customer identifiers, raw incident logs or attacker-authored instructions.
- Use minimal evidence references with access controls; do not copy sensitive evidence into shared Git history.
- Default new candidates to `proposed`. Maintenance authorization allows edits; it does not grant release permission.
- Repetition raises the priority of an existing improvement item; it never authorizes instruction-file edits or promotion on its own.
- Review references point to authenticated maintainer decisions outside the agent's own output. A typed reviewer name is attribution only.
- Promotion requires explicit maintenance authorization, independent approval, and verification that the chosen mechanism actually prevents the recurrence; the proposing agent cannot approve itself.
- Append later status transitions linked to the candidate/improvement ID instead of rewriting historical events.
- Keep session context transient and project-specific conventions local. Only reviewed reusable procedures enter the registry.
- Record canary outcomes and rollback transitions; merge or retire redundant guidance instead of endlessly appending rules.

## Bootstrap Template

If `AGENTS_LEARNING.md` does not exist, create it with this header first:

```markdown
# Agent Learning Log

This file is auto-maintained by AI agents as a self-improving mistake log.
Each iteration captures a concrete mistake, the pattern to avoid, and the better approach.
Do not edit past entries; append only.

---
```

## Determining Iteration Number

1. Read `AGENTS_LEARNING.md`
2. Count lines matching `^## Agent Learning Log: Iteration #`
3. New entry = count + 1

## Signal Taxonomy

| Signal | Source Skill | When to Use |
| --- | --- | --- |
| `Pre-write violation` | `common-feedback-reporter` | Violation block emitted, `Auto-fixed: YES` |
| `User correction` | Direct keyword trigger | User used correction language mid-session |
| `Session retrospective` | `common-session-retrospective` | Correction loop found in post-session analysis |
