---
description: Review an entire codebase against framework best practices and generate a prioritized improvement plan.
---

# 🛸 Codebase Review Orchestrator

> **Goal**: Evaluate an entire codebase for health, security, and architecture. Deliver a quantified **Health Score (0-100)** and a phased improvement plan.

---

## Step 1 — Target Discovery & Tech Stack

Identify the core framework and source directories.

1. Run `ls -F` and read `package.json`, `pubspec.yaml`, or `go.mod`.
2. Load `common-architecture-audit`; if synced references are available, map `$SRC`, `$TEST`, and `$EXT` with `<SKILLS>/common/common-architecture-audit/references/detection.md`.

---

## Step 2 — Breadth Scan (SAST & Security)

Identify P0 vulnerabilities and codebase metrics.

1. Load `common-security-audit` and `common-owasp` skills.
2. Execute the SAST commands documented in `<SKILLS>/common/common-security-audit/references/signals.md` when available.
3. Apply `<SKILLS>/common/common-security-audit/references/vibe-security-scan.md` to prioritize common AI-generated security gaps.

---

## Step 3 — Deep Audit: Multi-Layer Lenses

Pick the largest non-generated files (>600 LOC) and apply the following lenses:

1. **Architecture & Logic** from `common-code-review`.
2. **Silent Failures** from `common-code-review`.
3. **Type Design** from `common-code-review`.
4. **AI Safety** from `common-llm-security` if LLM code exists.
5. **Vibe Security**: Trace any Vibe Scan hit from source to reachable route before scoring.

---

## Step 4 — Scored Report & Feedback Loop

**Scoring Calculation**: Start at 100. Apply deductions per finding:

- 🔴 Critical: -15 | 🟠 High: -8 | 🟡 Medium: -3 | 🔵 Low: -1
- **Cap**: Score is capped at 40 if any 🔴 P0 finding exists.

### 📊 Report Format

Output the report using `<SKILLS>/common/common-code-review/references/report.md` when synced; otherwise include Audit Dashboard and Phased Plan sections.

### 🔄 Skill Feedback Loop (Mandatory)

For every **Critical** or **High** finding, if an active skill should have prevented it:

1. Update that skill's `SKILL.md` with an Anti-Pattern rule.
2. Update its `evals/evals.json` with a new assertion.
