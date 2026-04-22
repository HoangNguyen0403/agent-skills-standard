# Skill Testing, Trigger Rate & Regression Guide

## 1. Eval Set Schema

Save test cases to `evals/evals.json` next to `SKILL.md`:

```json
{
  "skill_name": "my-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "Realistic user task that should invoke this skill",
      "expected_output": "Description of what a correct response looks like",
      "assertions": [
        {
          "id": "a1",
          "description": "Output contains X",
          "type": "contains",
          "value": "X"
        }
      ]
    }
  ],
  "should_not_trigger": [
    "Near-miss prompt — shares keywords but needs a different skill",
    "Another near-miss prompt"
  ]
}
```

**Assertion types**: `contains`, `not_contains`, `matches_regex`, `file_exists`.

- Write 2–3 `evals` (should-trigger) per skill. Use prompts a real user would type — specific, with context, not abstract.
- Write 8–10 `should_not_trigger` entries. Focus on near-misses that share keywords but belong to a different skill.

## 2. Trigger Rate Queries

Trigger rate = % of should-trigger queries that correctly activate the skill.

### Should-Trigger (8–10 queries)

- Cover different phrasings: formal, casual, abbreviated, misspelled.
- Include cases where the skill name is never mentioned but context clearly requires it.
- Include uncommon but valid use cases.
- Add competition cases: queries where this skill must win over an adjacent one.

**Good**: `"ok so my boss gave me this ts file and it has like 5 different things going on in one class"`
**Bad**: `"Create a skill"` (too obvious, doesn't test anything)

### Should-Not-Trigger (8–10 queries)

- Focus on near-misses: share keywords but need a different skill.
- Adjacent domains, ambiguous phrasing, context where another tool wins.
- Do NOT use obviously unrelated queries — they don't test anything.

**Good**: `"review this PR and check if the architecture looks right"` (code-review skill, not skill-creator)
**Bad**: `"Write a fibonacci function"` (too far away, trivially fails)

### Scoring

Run each query, record `triggered: true/false`. Target ≥ 80% accuracy across both sets.

## 3. Optimizing the Description for Triggering

The description field is the **primary trigger mechanism**. Agents decide whether to use a skill based solely on name + description.

### Rules

1. **Be "pushy"**: Explicitly list the contexts that should trigger, not just what the skill does.
2. **Include "when to use"**: Put all trigger context in the description, not in the body.
3. **Cover edge cases**: Add contexts the agent might miss (e.g., "even if the user doesn't say X explicitly").
4. **Use active verbs**: "Use this skill when..." > "This skill covers..."

### Before / After Example

```yaml
# Before (passive — undertriggers)
description: Standards for creating new High-Density Agent Skills.

# After (pushy — triggers reliably)
description: >
  Standards for creating, testing, and optimizing High-Density Agent Skills.
  Use this skill whenever creating a skill from scratch, improving an existing skill,
  measuring trigger accuracy, catching regressions, or optimizing a description
  so it triggers more reliably.
```

### Iteration Loop

1. Write 20 trigger queries (half should-trigger, half should-not-trigger).
2. Run each query and record results.
3. Identify which query types fail and why.
4. Rewrite the description to address the failures.
5. Re-run; repeat until ≥ 80% accuracy on held-out queries.

## 4. Catching Regressions

When editing an existing skill, always compare before-and-after:

1. **Snapshot before editing**: `cp -r skills/common/my-skill /tmp/my-skill-snapshot`
2. **Edit the skill**.
3. **Re-run all existing evals** against the new version.
4. **Compare outputs**: Did any previously-passing assertions now fail?
5. **Fix regressions** before shipping.

### Regression Checklist

- [ ] All previously-passing eval assertions still pass.
- [ ] Trigger rate did not drop (re-run should-trigger set, verify ≥ previous score).
- [ ] SKILL.md still within size limits (< 100 lines).
- [ ] No new anti-patterns introduced (check `references/anti-patterns.md`).
