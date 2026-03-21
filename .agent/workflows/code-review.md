---
description: Run an AI-assisted PR code review using multi-layer lenses with confidence scoring
---

# AI Code Review Workflow

## Pre-Flight

Skip if PR is: closed, draft, automated (bot/dependency bump), config-only, or trivially safe (whitespace, docs rename, version bump with no logic).

Check scope: `git fetch origin <base> && git diff origin/<base>...HEAD --name-only` — state file count and lines changed.

## Step 1 — Scope & Skills

- **(A) Diff** (default): `git diff origin/<base>...HEAD`
- **(B) Specific Files**: Read provided paths (skip `.gitignore` entries)
- **(C) Full Project**: List source files in batches

Load:

- `../skills/common/common-code-review/SKILL.md` — BLOCKER/MAJOR/NIT format
- `../skills/common/common-security-audit/SKILL.md` — secrets, PII logs, CVE, infra
- `../skills/common/common-owasp/SKILL.md` — OWASP Web App (2021) + API (2023) checklists
- If LLM/agent code in diff: `../skills/common/common-llm-security/SKILL.md` — OWASP LLM Top 10
- Framework skills from `AGENTS.md` — P0/P1 rules only

## Step 2 — Multi-Layer Review

Run all applicable layers. Keep each lens focused — don't mix concerns.

### Layer 1: Security (Mandatory — always first)

Follow `common-security-audit` + `common-owasp` skills.

Scan sequence (run against diff files):

1. **Secrets** — `password|apiKey|secret|private_key|token` assigned to string literals
2. **PII in logs** — log statements containing `password|token|secret|private`
3. **Injection** — string concatenation in SQL queries; user input to template engines
4. **Auth coverage** — route decorators vs guard decorators; flag unguarded routes
5. **CVE** — `npm audit --audit-level=high` / `dart pub outdated` / `go list -m -u all`
6. **Infra** — Dockerfiles: `:latest` tags, root user

Apply `common-owasp` OWASP Web App (A01–A10) + API (API1–API10) checklists to the diff.

**P0 = score cap at 40/100.** Flag immediately — do not continue past this layer.

### Layer 2: Logic & Correctness

Focus strictly on changed lines:

- Logic errors, wrong conditions, off-by-one
- Null/undefined/nil handling, boundary conditions
- Async misuse, race conditions, unclosed resources

**Do not report:** pre-existing issues outside the diff; linter/CI-caught issues; pedantic style not in skills; clearly intentional changes; lint-suppressed lines.

### Layer 3: Silent Failures

For every `try/catch`, `.catch()`, fallback, or optional-chaining chain:

- Error logged with context (operation, IDs)?
- User gets actionable feedback (not generic message)?
- Catch block specific — not swallowing unrelated errors?
- **Empty catch blocks** → BLOCKER
- **Fallback to mock/stub in production** → BLOCKER
- Silent retry exhaustion → MAJOR

### Layer 4: Test Coverage (if test files changed or new code added)

- New logic paths without tests → flag
- Error paths and edge cases covered?
- Tests verify behavior (contracts), not implementation?
- Tests resilient to refactoring?

Skip: trivial getters/setters, tests for auto-generated code.

### Layer 5: Type Design (if new types/interfaces/classes added)

For each new type:

- Invariants enforced at construction time?
- Internal state violatable from outside?
- Illegal states representable? → MAJOR
- Anemic model with no behavior? → NIT/MAJOR

### Layer 6: Comment Accuracy (if significant comments or docstrings added)

- Comments match what the code actually does?
- TODOs/FIXMEs tracked or already resolved?
- Restating-obvious comments → flag for removal
- Missing "why" for non-obvious logic → flag

### Layer 7: AI / LLM Security (only if diff touches LLM client, prompt, agent tools, or RAG)

Trigger: imports of `openai`, `anthropic`, `langchain`, `genai`, `VertexAI`, `llamaindex`, or any LLM SDK.

Apply `common-llm-security` (OWASP LLM Top 10 — 2025). P0 items to verify directly:

- **LLM01**: User input as separate `user` role — never interpolated into system prompt?
- **LLM05**: LLM output sanitized before DOM, queries, or shell?
- **LLM06**: Write/delete/network agent tools have human confirmation step?
- **LLM10**: `max_tokens` set on every call? Agent loop has `maxIterations` cap?

## Step 3 — Confidence Filter

**Only report findings ≥76/100 confidence** (certain or highly confirmed). Discard ≤75 — likely false positives or low-impact nitpicks.

## Step 4 — Report

```text
[BLOCKER|MAJOR|NIT] [file:line] Issue Description
Why:   Risk or impact on correctness/security/maintainability.
Fix:   1–2 line action or code suggestion.
Score: XX/100
Layer: Security | Logic | Silent Failures | Tests | Types | Comments
```

Group by severity (BLOCKER first). Always include `file:line`. List strengths at the end.

## Step 5 — Implementation Planning

Ask: "Implement fixes for any of these now?"

If YES: parse findings into a checklist, add/update `task.md`, apply `common-tdd` for code changes.

## Step 6 — Skill Feedback Loop (Mandatory)

For every BLOCKER or MAJOR, answer: _"Was there an active skill that should have prevented this?"_

**YES** — fix the skill directly:
cklist, add/update `task.md`, apply `common-tdd` for code changes.

## Step 6 — Skill Feedback Loop (Mandatory)

For every BLOCKER or MAJOR, answer: _"Was there an active skill that should have prevented this?"_

**YES** — fix the skill directly:

1. Open `skills/<category>/<skill-name>/SKILL.md`
2. Add `**No X**: Do Y.` under `## Anti-Patterns`
3. Add/update eval in `evals/evals.json` capturing the violation
4. Note in summary: `SKILL GAP: <category/skill> — added rule for <issue>`

**NO** — note it. If recurring, create a skill via `common-skill-creator`.

Not optional: a BLOCKER tracing to a known skill means it didn't trigger, had the wrong rule, or is missing from `.skillsrc`. Fix at source — not just in the code.
