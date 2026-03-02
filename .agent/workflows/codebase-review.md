---
description: Review an entire codebase against framework best practices and generate a prioritized improvement plan
---

# 🔍 Codebase Review Workflow

> **Token Efficiency**: Use `wc -l` / `awk` counts. Summarize internally. Never repeat skill rules verbatim.

---

## Step 1 — Project Context

```bash
ls -F
cat package.json 2>/dev/null || cat pubspec.yaml 2>/dev/null || cat go.mod 2>/dev/null
find . -maxdepth 2 -not -path '*/.*' -not -path '*/node_modules/*' -not -path '*/build/*'
```

---

## Step 2 — Framework Detection & Source Dirs

| Manifest        | Framework     | `$SRC` | `$TEST`      |
| --------------- | ------------- | ------ | ------------ |
| `pubspec.yaml`  | Flutter       | `lib/` | `test/`      |
| `nest-cli.json` | NestJS        | `src/` | `src/`       |
| `next` in deps  | Next.js       | `src/` | `__tests__/` |
| `react` in deps | React         | `src/` | `src/`       |
| `go.mod`        | Golang        | `.`    | `.`          |
| `package.json`  | TypeScript/JS | `src/` | `src/`       |

> [!IMPORTANT]
> **Record `$SRC` and `$TEST` now.** Every scan below MUST use the correct directories. For Flutter: `$SRC=lib/` and `$TEST=test/`. Running scans against a non-existent `src/` silently returns empty results.

Then: `cat .agent/skills/index.json 2>/dev/null || cat skills/index.json 2>/dev/null`

| Framework     | Skills to load                            |
| ------------- | ----------------------------------------- |
| Flutter       | `flutter`, `dart`, `common`               |
| NestJS        | `nestjs`, `typescript`, `common`          |
| Next.js       | `nextjs`, `react`, `typescript`, `common` |
| React         | `react`, `typescript`, `common`           |
| Golang        | `golang`, `common`                        |
| TypeScript/JS | `typescript`/`javascript`, `common`       |

---

## Step 3 — Read Skills

Read each discovered `SKILL.md`. Internally note P0/P1 patterns only.

---

## Step 4 — Breadth Scan (Run ALL — no skipping)

**File counts:**

```bash
# Source (Dart/Flutter — adjust extension for other stacks)
find $SRC -type f -name "*.dart" ! -name "*.g.dart" ! -name "*.freezed.dart" ! -name "*.gr.dart" ! -name "*_test.dart" | wc -l
# Tests
find $TEST -type f -name "*_test.dart" | wc -l    # Flutter
find . -type f -name "*.spec.ts" | wc -l            # TS
```

**TODO/FIXME — comment-only, production code only:**

```bash
# ✅ Correct (matches code comments, excludes generated files)
grep -rn "// TODO\|// FIXME\|//TODO\|//FIXME" $SRC --include="*.dart" \
  | grep -v "\.g\.dart\|\.freezed\.dart\|\.gr\.dart" | wc -l

# Also count integration_test separately if present
grep -rn "// TODO\|//TODO" integration_test/ --include="*.dart" 2>/dev/null | wc -l

# ❌ NEVER use: grep -riE "TODO|FIXME" .  — matches strings/docs, severely over-counts
```

**Fat Files — FULL ranked list (ALL files above threshold, sorted descending):**

```bash
# Logic files >600 LOC (Dart). Change -name and threshold for other stacks.
find $SRC -type f -name "*.dart" \
  ! -name "*.g.dart" ! -name "*.freezed.dart" ! -name "*.gr.dart" ! -name "*_test.dart" \
  | xargs wc -l 2>/dev/null \
  | awk '$1 > 600 && $2 != "total" {print $1, $2}' | sort -rn

# Utility/transformer files >400 LOC
find $SRC -type f \( -name "*utils*" -o -name "*helper*" -o -name "*transformer*" -o -name "*extension*" \) \
  ! -name "*.g.*" ! -name "*_test.*" \
  | xargs wc -l 2>/dev/null \
  | awk '$1 > 400 && $2 != "total" {print $1, $2}' | sort -rn

# Test files >1200 LOC
find $TEST -type f -name "*_test.dart" \
  | xargs wc -l 2>/dev/null \
  | awk '$1 > 1200 && $2 != "total" {print $1, $2}' | sort -rn

# Watch zone count (300–600 LOC, production files only)
find $SRC -type f -name "*.dart" ! -name "*.g.dart" ! -name "*.freezed.dart" ! -name "*_test.dart" \
  | xargs wc -l 2>/dev/null \
  | awk '$1 > 300 && $1 <= 600 && $2 != "total"' | wc -l
```

**Flutter/Dart specific signals:**

```bash
grep -rn "Colors\.\|Color(0x" $SRC --include="*.dart" | grep -v "\.g\.dart\|AppColors\|colorScheme" | wc -l
grep -rn "http\.\|Dio\|dio\." $SRC/presentation --include="*.dart" 2>/dev/null | grep -v "//\|service\|repository" | wc -l
grep -rn "^\s*print(\|^\s*debugPrint(" $SRC --include="*.dart" | grep -v "\.g\.dart\|_test\.dart\|//\s*print" | wc -l
```

---

## Step 5 — Security Stress Test

```bash
# 5a. Hardcoded secrets (exclude tests + generated + innocuous patterns)
grep -rnE "(password|apiKey|api_key|secret|private_key)\s*=\s*['\"][^'\"]{6,}" \
  $SRC --include="*.dart" \
  | grep -v "\.g\.dart\|_test\.dart\|//\|label\|hint\|error\|getPassword\|hashKey"

# 5b. Sensitive data in logs
grep -rnE "print\(|debugPrint\(" $SRC --include="*.dart" | grep -iE "password|token|secret" | wc -l

# 5c. Dependency audit
[ -f pubspec.yaml ] && dart pub outdated --json 2>/dev/null | head -60
[ -f package.json ] && npm audit --audit-level=high 2>/dev/null | head -40
[ -f go.mod ] && go list -m -u all 2>/dev/null | grep "\[" | head -20

# 5d. Infrastructure hardening
grep -rnE "^FROM .+:latest|^USER root" . --include="Dockerfile" --include="*.dockerfile"
```

| Signal                   | Threshold | Severity    |
| ------------------------ | --------- | ----------- |
| Hardcoded secrets        | Any match | 🔴 Critical |
| Secrets in logs          | > 0       | 🔴 Critical |
| Raw SQL concatenation    | Any match | 🟠 High     |
| `FROM :latest` in Docker | Any match | 🟠 High     |
| High-severity CVEs       | > 0       | 🟠 High     |

> [!IMPORTANT]
> Any 🔴 Critical finding **caps Security score at 40/100**.

---

## Step 6 — Deep Quality Check (3 Files, 3 Layers)

Pick the **largest non-generated file** from the fat-file scan results for each layer:

| Layer                     | File type to pick             | Verify                                                             |
| ------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| **Application / BLoC**    | Largest BLoC/Cubit/Service    | Event handler count, SRP, error handling pattern                   |
| **Infrastructure / Repo** | Largest repository/datasource | No analytics/UI code, dependency count, error wrapping             |
| **Presentation / Widget** | Largest page or widget        | BLoC listener count, no business logic in `build()`, decomposition |

---

## Step 7 — Scored Report

**Scoring (deduct from 100 per category):**

- 🔴 Critical: -15 | 🟠 High: -8 | 🟡 Medium: -3 | 🔵 Low: -1

**Report structure:**

```bash
╔══════════════════════════════════════════════╗
║  🔍 CODEBASE REVIEW REPORT                   ║
║  Project: [name]   Score: [X/100]            ║
║  Framework: [fw]   Date: [YYYY-MM-DD]        ║
╚══════════════════════════════════════════════╝
```

### 📊 Metric Dashboard

| Metric            | Value                  | Signal  |
| ----------------- | ---------------------- | ------- |
| Source Files      | [N] excl. generated    |         |
| Test Files        | [N]                    | [ratio] |
| Tech Debt (TODOs) | [N in $SRC], [N total] |         |
| Hardcoded Colors  | [N]                    |         |
| Secret Scan       | Safe / Vulnerable      |         |

### 🎯 Category Scores

| Category        | Score | Key Driver |
| --------------- | ----- | ---------- |
| 🛡️ Security     | /100  |            |
| 🏗️ Architecture | /100  |            |
| 🧪 Testing      | /100  |            |
| 💎 Code Quality | /100  |            |

### 🔴 CRITICAL / 🟠 HIGH / 🟡 MEDIUM Findings

For fat-file findings, always include the **complete ranked table** — do not abbreviate to a few examples:

| File   | LOC | Problem          |
| ------ | --- | ---------------- |
| [link] | [N] | [specific issue] |

### ✅ What's Working Well

List genuine strengths to preserve.

### 🗺️ Improvement Plan

> [!IMPORTANT]
> Every row MUST include a **"Why / Benefits"** column — the concrete outcome delivered. Never list actions without their value.

**Phase 1 — Quick Wins (2–4 weeks)**

| ID  | Action | File(s) | Why / Benefits |
| --- | ------ | ------- | -------------- |

**Phase 2 — Architecture Refactoring (1–2 months)**

| ID  | Action | File(s) | Why / Benefits |
| --- | ------ | ------- | -------------- |

**Phase 3 — Quality & Polish (ongoing)**

| ID  | Action | Why / Benefits |
| --- | ------ | -------------- |

---

## Step 8 — Interactive Follow-Up

Ask:

1. "Fix **[ID]** now?"
2. "Generate a `task.md` for Phase 1?"
3. "Create a deep-dive refactoring plan for **[component]**?"
