---
description: Review an entire codebase against framework best practices and generate a prioritized improvement plan.
---

# 🛸 Codebase Review Orchestrator

> **Goal**: Evaluate an entire codebase for health, security, and architecture. Deliver a quantified **Health Score (0-100)** and a phased improvement plan.

---

## Step 1 — Target Discovery & Tech Stack

Identify the core framework and source directories.

1. Run `ls -F` and read `package.json`, `pubspec.yaml`, or `go.mod`.
2. Map `$SRC`, `$TEST`, and `$EXT` using the framework table in:
   [common-architecture-audit/references/detection.md](../../skills/common/common-architecture-audit/references/detection.md)

---

## Step 2 — Breadth Scan (SAST & Security)

Identify P0 vulnerabilities and codebase metrics.

1. Load `common-security-audit` and `common-owasp` skills.
2. Execute the **SAST Commands** (Secrets, PII, Injection, Auth Coverage) documented in:
   [common-security-audit/references/signals.md](../../skills/common/common-security-audit/references/signals.md)

---

## Step 3 — Deep Audit: Multi-Layer Lenses

Pick the largest non-generated files (>600 LOC) and apply the following lenses:

1. **Architecture & Logic**: Follow [lenses.md](../../skills/common/common-code-review/references/lenses.md#lens-2-architecture--correctness).
2. **Silent Failures**: Follow [lenses.md](../../skills/common/common-code-review/references/lenses.md#lens-3-silent-failures--error-handling).
3. **Type Design**: Follow [lenses.md](../../skills/common/common-code-review/references/lenses.md#lens-4-type-design).
4. **AI Safety**: (If LLM code exists) Follow [lenses.md](../../skills/common/common-code-review/references/lenses.md#lens-5-ai--llm-security).

---

## Step 4 — Scored Report & Feedback Loop

**Scoring Calculation**: Start at 100. Apply deductions per finding:

- 🔴 Critical: -15 | 🟠 High: -8 | 🟡 Medium: -3 | 🔵 Low: -1
- **Cap**: Score is capped at 40 if any 🔴 P0 finding exists.

### 📊 Report Format

Output the report using the **Audit Dashboard** and **Phased Plan** templates in:
[common-code-review/references/report.md](../../skills/common/common-code-review/references/report.md)

### 🔄 Skill Feedback Loop (Mandatory)

For every **Critical** or **High** finding, if an active skill should have prevented it:

1. Update that skill's `SKILL.md` with an Anti-Pattern rule.
2. Update its `evals/evals.json` with a new assertion.
