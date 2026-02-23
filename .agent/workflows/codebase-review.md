---
description: Review an entire codebase against framework best practices and generate a prioritized improvement plan
---

# 🔍 Codebase Review Workflow

> **Goal**: Auto-detect framework(s) or core language, dynamically load matching skills, review the codebase with **extreme token efficiency**, and output a UX-friendly report with a weighted score and improvement roadmap.

> [!IMPORTANT]
> **Token Efficiency First**:
>
> - Use `grep -c` or `wc -l` for metrics to avoid dumping logs.
> - Summarize findings internally; do not repeat skill rules verbatim in the report.
> - Read only the most critical files for deep quality assessment.

---

## Step 1 — Gather Project Context (High Efficiency)

Gather just enough info to identify the project and its architecture:

```bash
# 1a. Show top-level files
ls -F

# 1b. Read primary manifest only
cat package.json 2>/dev/null || cat pubspec.yaml 2>/dev/null || cat go.mod 2>/dev/null || cat pom.xml 2>/dev/null || cat composer.json 2>/dev/null

# 1c. Quick structure check (depth 2)
find . -maxdepth 2 -not -path '*/.*' -not -path '*/node_modules/*' -not -path '*/build/*'
```

---

## Step 2 — Framework/Language Detection & Skill Discovery

1.  **Identify Framework or Core Language**:
    | If found... | Then category is... |
    |---|---|
    | `pubspec.yaml` | **Flutter** |
    | `nest-cli.json` or `@nestjs/core` in deps | **NestJS** |
    | `next` in deps | **Next.js** |
    | `react` in deps | **React** |
    | `angular.json` | **Angular** |
    | `go.mod` | **Golang** |
    | `typescript` in deps | **Core TypeScript** |
    | `package.json` | **Core JavaScript** |

2.  **Read Registry**: `cat skills/index.json`
3.  **Match Keys**: Map discovery to registry keys:

| Detected Category | Registry Keys to Load                     |
| ----------------- | ----------------------------------------- |
| Flutter           | `flutter`, `dart`, `common`               |
| NestJS            | `nestjs`, `typescript`, `common`          |
| Next.js           | `nextjs`, `react`, `typescript`, `common` |
| React             | `react`, `typescript`, `common`           |
| Golang            | `golang`, `common`                        |
| Core TypeScript   | `typescript`, `common`                    |
| Core JavaScript   | `javascript`, `common`                    |

4.  **List Skills**: Collect all skill IDs from those categories.

---

## Step 3 — Internalize Review Rules

Read each `SKILL.md` discovered.

> [!TIP]
> **Constraint Summary**: Internally summarize the P0 (Critical) and P1 (High) patterns. You don't need to quote the skill text back in the report.

---

## Step 4 — Breadth Scan (Metrics & Pattern Violations)

Run commands that return **counts** or **boolean signals** to minimize token usage.

**Universal Health Metrics:**

- **Source Count**: `find . -type f \( -name "*.ts" -o -name "*.dart" -o -name "*.go" \) ! -name "*.g.dart" ! -name "*.freezed.dart" ! -name "*.gr.dart" ! -name "*.config.dart" | wc -l`
- **Test Count**: `find . -name "*_test.*" -o -name "*.spec.*" | wc -l`
- **TODO/FIXME Count**: `grep -riE "TODO|FIXME" . | wc -l`
- **Secret Leak Signal**: `grep -riE "password|apiKey|secret|token" . --exclude-dir={node_modules,build,dist} | wc -l` (Count > 0 is 🔴 Critical)

**Framework/Language Specific Greps (Samples):**

- **NestJS**: `@Controller` vs `@UseGuards` count mismatch = 🟠 High
- **Flutter**: `Colors.` or `Color(0x` count outside of theme = 🟡 Medium
- **Golang**: `_ = ` error suppression count = 🟠 High
- **TypeScript**: `any` usage count: `grep -r ": any" . --include="*.ts" | wc -l` (High count = 🟡 Medium)

---

## Step 5 — Targeted Deep Quality Check

Pick **one** representative file from the core logic layer (e.g., one controller, one service, or one main function).
Verify:

1.  **Typing**: Is it strongly typed or using `any`?
2.  **Error Handling**: Is it following the skill's recommended pattern?
3.  **Doc Quality**: Are exported symbols documented?

---

## Step 6 — Generate Scored Report

### ⚖️ Weighted Scoring Algorithm (Base: 100)

Instead of just one global score, break the report down into **Primary Criteria Categories** to provide clear visibility into where the issues lie. Assume 100 points per category, then deduct based on findings:

**Categories:**

1. 🛡️ **Security & Data Privacy** (Hardcoded secrets, auth flow, PII protection)
2. 🏗️ **Architecture & Design** (Layer separation, DTO handling, state management)
3. 🧪 **Testing & Reliability** (Test coverage, proper error/failure handling)
4. 💎 **Code Quality & Maintainability** (Type safety, tech debt, documentation)

**Deductions per finding:**

- 🔴 **Critical (-15)**: Security leaks, missing auth guards, system crash potential.
- 🟠 **High (-8)**: Missing tests, architectural leakage, memory leak risks.
- 🟡 **Medium (-3)**: High technical debt, inconsistent naming, no DTOs into Controllers.
- 🔵 **Low (-1)**: Style inconsistencies, missing documentation.

---

```
╔══════════════════════════════════════════════════════════╗
║              🔍 CODEBASE REVIEW REPORT                   ║
║  Project: [name]         Overall Score: [X / 100]        ║
║  Framework: [detected]   Date: [YYYY-MM-DD]              ║
╚══════════════════════════════════════════════════════════╝

### 📊 Metric Dashboard

- **Overall Score**: [Score]/100
- **Test Coverage**: [Ratio]% ([Sources] vs [Tests]) - *Note: Exclude generated files from total.*
- **Secret Scan**: [Safe/Vulnerable]
- **Tech Debt**: [Count] unresolved TODOs

### 🎯 Primary Category Breakdown

- 🛡️ **Security**: [Score]/100
- 🏗️ **Architecture**: [Score]/100
- 🧪 **Testing**: [Score]/100
- 💎 **Code Quality**: [Score]/100

### 🔴 CRITICAL FINDINGS (P0)

> _Fix immediately to ensure security and stability._

- **[C-001] Security**: [X] hardcoded secrets detected.
- **[C-002] Auth**: [X] controllers lack guards (if applicable).

### 🟠 HIGH FINDINGS (P1)

- **[H-001] Architecture**: Pattern violation found in [Layer].
- **[H-002] Testing**: Critical path lacks coverage.

### 🗺️ Continuous Improvement Plan

| Target      | Milestone              | Key Actions                                              |
| ----------- | ---------------------- | -------------------------------------------------------- |
| **Phase 1** | Security & Stability   | Remediate 🔴 Critical and 🟠 High findings.              |
| **Phase 2** | Architecture Alignment | Refactor [Layer] to match [Language/Framework] patterns. |
| **Phase 3** | Quality & Debt         | Address 🟡 Medium items and TODOs.                       |

---

## Step 7 — Interactive Implementation

Ask:

1.  "Fix **[ID]** now? I'll re-read the specific skill and apply the fix."
2.  "Generate a `task.md` for **Phase 1**?"
3.  "Create a deep-dive refactoring plan for [Category]?"
```
