---
description: Fast, continuous DevSecOps pipeline for Pull Requests and active branches. Runs SAST, SCA, and secrets detection to catch vulnerabilities before they merge.
---

# 🛡️ Continuous Security Test (Shift-Left)

> **Goal**: Execute a high-speed, lightweight security audit on a specific code branch or Pull Request. Prevent hardcoded secrets, vulnerable dependencies, and basic OWASP violations from merging into the main branch.
> 
> **Policy**: Fast execution (< 2 mins). Focuses on Static Analysis (SAST) and Software Composition Analysis (SCA). No dynamic exploitation or staging environments required.

---

## Phase 1 — Context & Diff Isolation

Define the exact scope of the code changes.

1. **Target Identification**: Identify the target branch / diff base branch (e.g., via `GITHUB_BASE_REF`, `CI_MERGE_REQUEST_TARGET_BRANCH_NAME`, git remote HEAD default branch, or local tracking/parent branch).
2. **Context Gathering**: Run `git diff <base>...HEAD` (substituting the detected base branch, such as `main`, `master`, or `develop`) to isolate only the code modified by the developer.
3. **Guardrail**: We do NOT scan the entire repository (unless explicitly requested). We only evaluate the delta to ensure high speed and low noise.

---

## Phase 2 — Automated Security Scans (SAST & SCA)

Delegate the raw scanning and triage to the **ASPM Correlator** (`specialist-aspm-correlator`).

1. **Secrets Detection**:
   - Scan the diff for newly introduced credentials, API keys, and PII (`grep -rE "(password|apiKey|secret)"`).
2. **Dependency Audit (SCA)**:
   - If `package.json`, `go.mod`, `pom.xml`, or `pubspec.yaml` was modified, run the native audit tool (e.g., `npm audit`, `cargo audit`, `dart pub outdated --json`).
3. **Static Analysis (SAST)**:
   - Identify dangerous sinks in the diff (e.g., `dangerouslySetInnerHTML`, raw SQL concatenation, `exec()`).
4. **Triage & Deduplication**:
   - `specialist-aspm-correlator` filters out false positives and maps valid findings directly to the offending line of code.

---

## Phase 3 — High-Density Code Review

Delegate the architectural and logic review of the diff to the **Security Reviewer** (`specialist-security-reviewer`).

1. **Auth Verification**: Ensure newly added routes have the correct authentication guards (`@UseGuards`, middleware).
2. **Input Validation**: Check if new user-facing inputs are properly sanitized before hitting the database.
3. **Business Logic Sanity**: Quickly review for obvious missing role checks (BOLA) in the changed files.

*Note: The Reviewer operates under strict token budgets (≤ 8 tool calls, ≤ 3 full file reads).*

---

## Phase 4 — Developer-Centric Remediation

Convert findings into immediate, actionable developer feedback.

1. **Blocker Assessment**:
   - Did we find a P0 (Hardcoded Secret, SQLi, Auth Bypass)? If yes, immediately reject the PR / fail the check.
2. **Targeted Patches**:
   - For every finding, provide the **exact code diff** required to fix it. Do not give generic advice (e.g., instead of "sanitize input", provide the exact parameterized query implementation).
3. **Final Output**:
   - Print a concise markdown summary suitable for a GitHub/GitLab PR comment.

### Output Template
```markdown
### 🛡️ Security Check: [PASS / FAIL]

**Scan Scope**: [Branch/Diff size]
**Execution Time**: Fast SAST/SCA

#### 🔴 Blockers (Must Fix)
- [File:Line] - [Vulnerability]
  ```diff
  - vulnerable_code()
  + secure_code()
  ```

#### 🟡 Warnings (Technical Debt)
- [Dependency/Config issue] - Run `[specific update command]`

#### ✅ Verified
- No exposed secrets in diff.
- Auth guards present on all new routes.
```
