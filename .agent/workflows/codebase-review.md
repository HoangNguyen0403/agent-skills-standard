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

1. **Identify Framework or Core Language**:

   | If found...                               | Then category is... |
   | ----------------------------------------- | ------------------- |
   | `pubspec.yaml`                            | **Flutter**         |
   | `nest-cli.json` or `@nestjs/core` in deps | **NestJS**          |
   | `next` in deps                            | **Next.js**         |
   | `react` in deps                           | **React**           |
   | `angular.json`                            | **Angular**         |
   | `go.mod`                                  | **Golang**          |
   | `typescript` in deps                      | **Core TypeScript** |
   | `package.json`                            | **Core JavaScript** |

2. **Read Registry**: `cat skills/index.json`
3. **Match Keys**: Map discovery to registry keys:

| Detected Category | Registry Keys to Load                     |
| ----------------- | ----------------------------------------- |
| Flutter           | `flutter`, `dart`, `common`               |
| NestJS            | `nestjs`, `typescript`, `common`          |
| Next.js           | `nextjs`, `react`, `typescript`, `common` |
| React             | `react`, `typescript`, `common`           |
| Golang            | `golang`, `common`                        |
| Core TypeScript   | `typescript`, `common`                    |
| Core JavaScript   | `javascript`, `common`                    |

1. **List Skills**: Collect all skill IDs from those categories.

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
- **Fat File Scan (Logic)**: `find src -type f \( -name "*.ts" -o -name "*.dart" -o -name "*.go" \) ! -name "*.g.*" ! -name "*.spec.*" ! -name "*_test.*" ! -name "*utils*" ! -name "*helper*" | xargs wc -l | awk '$1 > 600'`
- **Fat File Scan (Utils)**: `find src -type f \( -name "*utils*" -o -name "*helper*" \) ! -name "*.g.*" | xargs wc -l | awk '$1 > 400'`
- **Fat File Scan (Tests)**: `find . -type f \( -name "*.spec.*" -o -name "*_test.*" \) ! -name "*.g.*" | xargs wc -l | awk '$1 > 1200'`

**Framework/Language Specific Greps (run only if ecosystem matches):**

| Ecosystem    | Signal                                               | Command                                                                                     | Severity if High |
| ------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------- |
| NestJS       | `@Controller` without matching `@UseGuards`          | `grep -rE "@Controller" --include="*.ts" \| wc -l` vs guards                                | 🟠 High          |
| Flutter/Dart | Hardcoded colors outside theme                       | `grep -rE "Colors\.\|Color(0x" --include="*.dart" \| wc -l`                                 | 🟡 Medium        |
| Flutter/Dart | Direct API calls in Widget build()                   | `grep -rE "http\.\|dio\." --include="*.dart" \| grep -v service \| wc -l`                   | 🟠 High          |
| Go           | Suppressed errors (`_ = err`)                        | `grep -rE "_ = " --include="*.go" \| wc -l`                                                 | 🟠 High          |
| Go           | Goroutine leaks (`go func` without WaitGroup/cancel) | `grep -rE "^\\s+go func" --include="*.go" \| wc -l`                                         | 🟡 Medium        |
| TypeScript   | Unsafe `any` usage                                   | `grep -r ": any" . --include="*.ts" \| wc -l`                                               | 🟡 Medium        |
| Java/Spring  | `@Transactional` on Controller (wrong layer)         | `grep -rn "@Transactional" --include="*.java" \| grep -i controller`                        | 🟠 High          |
| Android      | Network on Main Thread risk                          | `grep -rn "runOnUiThread\|Dispatchers.Main" --include="*.kt" \| grep -i "http\|api\|fetch"` | 🟠 High          |
| Python       | Bare `except:` catching all exceptions               | `grep -rn "except:" --include="*.py" \| wc -l`                                              | 🟡 Medium        |

---

## Step 5 — 🔴 Security Stress Test (Adversarial)

> **Mindset shift**: Think like an attacker, not a reviewer. You are probing for failure modes, not pattern violations. This step is tech-stack agnostic.

**Surface the Attack Surface:**

```bash
# 5a. Hardcoded secrets / credentials (Critical if count > 0)
grep -riE "(password|apiKey|api_key|secret|private_key|token)\s*=\s*['\"][^'\"]{6,}" \
  . --include="*.ts" --include="*.js" --include="*.py" --include="*.go" --include="*.java" \
  --exclude-dir={node_modules,dist,build,.git} -l

# 5b. Sensitive data in logs (PII/secrets printed to logs)
# Node / TS
grep -rE "console\.(log|error|warn)" . --include="*.ts" --include="*.js" \
  | grep -iE "password|token|secret|private" | wc -l
# Go
grep -rE "log\.(Print|Printf|Println|Fatal)" . --include="*.go" \
  | grep -iE "password|token|secret" | wc -l
# Dart / Flutter
grep -rE "print\(|debugPrint\(" . --include="*.dart" \
  | grep -iE "password|token|secret" | wc -l
# Java / Spring
grep -rE "log(ger)?\.(info|debug|warn|error)" . --include="*.java" \
  | grep -iE "password|token|secret" | wc -l

# 5c. Injection surface (raw SQL / query string concatenation)
grep -rE "\+.*SELECT|\+.*INSERT|\+.*UPDATE|\+.*DELETE|query\(.*\+|fmt\.Sprintf.*SELECT" \
  . --include="*.ts" --include="*.js" --include="*.go" --include="*.java" --include="*.py" | wc -l

# 5d. Unprotected endpoints — auth guard coverage vs total routes
# NestJS / Express (TypeScript)
[ -f tsconfig.json ] && {
  total=$(grep -rE "@(Get|Post|Put|Delete|Patch)\(" . --include="*.ts" | wc -l)
  guarded=$(grep -rE "@(UseGuards|Auth)\(" . --include="*.ts" | wc -l)
  echo "NestJS routes: ${total} total, ${guarded} guarded"
}
# Spring Boot (Java)
if [ -f pom.xml ] || [ -f build.gradle.kts ]; then
  total=$(grep -rE "@(GetMapping|PostMapping|PutMapping|DeleteMapping|RequestMapping)" . --include="*.java" | wc -l)
  guarded=$(grep -rE "@(PreAuthorize|Secured|WithMockUser)" . --include="*.java" | wc -l)
  echo "Spring routes: ${total} total, ${guarded} guarded"
fi
# Go (gin/chi/echo/stdlib)
[ -f go.mod ] && {
  total=$(grep -rE "(GET|POST|PUT|DELETE|PATCH)|router\.(GET|POST)" . --include="*.go" | wc -l)
  guarded=$(grep -rE "(middleware|auth|jwt|guard)" . --include="*.go" | wc -l)
  echo "Go routes: ~${total} total, ~${guarded} middleware calls"
}
# Dart / Flutter (no server-side HTTP by default; skip)
[ -f pubspec.yaml ] && echo "Dart/Flutter: route auth review requires manual inspection of app router."

# 5e. Dependency audit (known CVEs) — auto-detect ecosystem
# Node / Bun
[ -f package.json ] && (npm audit --audit-level=high 2>/dev/null || bun audit 2>/dev/null)
# Dart / Flutter
[ -f pubspec.yaml ] && dart pub outdated --json 2>/dev/null | head -40
# Go
[ -f go.mod ] && go list -m -u all 2>/dev/null | grep "\[" | head -20
# Java / Maven
[ -f pom.xml ] && mvn dependency:list 2>/dev/null | grep "WARN\|ERROR" | head -20
# Java / Gradle
if [ -f build.gradle ]; then
  # Prefer Groovy build.gradle when both files exist; Gradle uses this by default.
  ./gradlew dependencies --configuration runtimeClasspath 2>/dev/null | grep "FAILED\|->.*" | head -20
elif [ -f build.gradle.kts ]; then
  ./gradlew dependencies --configuration runtimeClasspath 2>/dev/null | grep "FAILED\|->.*" | head -20
fi
# Python
[ -f requirements.txt ] && pip-audit 2>/dev/null || \
  [ -f pyproject.toml ] && pip-audit 2>/dev/null
# Rust
[ -f Cargo.toml ] && cargo audit 2>/dev/null

# 5f. Dockerfile / infrastructure hardening
grep -rE "^FROM .+:latest|^USER root|curl.*sh.*|ADD http" \
  . --include="Dockerfile" --include="*.dockerfile"

# 5g. Error response leakage (stack traces / raw errors sent to clients)
# Node / TS (Express / NestJS)
grep -rE "res\.(send|json)\(.*error|send\(.*stack|message.*stack" \
  . --include="*.ts" --include="*.js" | wc -l
# Go (net/http / gin / echo)
grep -rE "c\.(JSON|String)\(.*err|http\.Error\(.*err\.Error" \
  . --include="*.go" | wc -l
# Java / Spring
grep -rE "e\.printStackTrace|getMessage\(\).*response|getStackTrace" \
  . --include="*.java" | wc -l
```

**Evaluate each signal against this rubric:**

| Signal                      | Threshold                       | Severity    |
| --------------------------- | ------------------------------- | ----------- |
| Hardcoded secrets           | Any match                       | 🔴 Critical |
| Secrets in logs             | > 0                             | 🔴 Critical |
| Unguarded routes > 20%      | (total - guarded) / total > 0.2 | 🔴 Critical |
| Raw SQL concatenation       | Any match                       | 🟠 High     |
| `FROM :latest` in Docker    | Any match                       | 🟠 High     |
| Stack traces in responses   | > 0                             | 🟠 High     |
| Outdated dependencies (CVE) | High severity vulns > 0         | 🟠 High     |

> [!IMPORTANT]
> A **🔴 Critical finding here immediately caps the Security category score at 40/100** regardless of other scores. No release gates should pass with a 🔴 open.

---

## Step 6 — Targeted Deep Quality Check

Pick **one** representative file from the core logic layer (e.g., one controller, one service, or one main function).
Verify:

1. **Typing**: Is it strongly typed or using `any`?
2. **Error Handling**: Is it following the skill's recommended pattern?
3. **Doc Quality**: Are exported symbols documented?

---

## Step 7 — Generate Scored Report

### ⚖️ Weighted Scoring Algorithm (Base: 100)

Instead of just one global score, break the report down into **Primary Criteria Categories** to provide clear visibility into where the issues lie. Assume 100 points per category, then deduct based on findings:

**Categories:**

1. 🛡️ **Security & Data Privacy** (Hardcoded secrets, auth flow, PII protection)
2. 🏗️ **Architecture & Design** (Layer separation, DTO handling, state management)
3. 🧪 **Testing & Reliability** (Test coverage, proper error/failure handling)
4. 💎 **Code Quality & Maintainability** (Type safety, tech debt, documentation)

**Deductions per finding:**

- 🔴 **Critical (-15)**: Security leaks, missing auth guards, system crash potential.
- 🟠 **High (-8)**: Logic > 800, Utils > 600, or Tests > 2000 LOC.
- 🟡 **Medium (-3)**: Logic > 600, Utils > 400, or Tests > 1200 LOC.
- 🔵 **Low (-1)**: Style inconsistencies, missing documentation.

---

```bash
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

## Step 8 — Interactive Implementation

Ask:

1.  "Fix **[ID]** now? I'll re-read the specific skill and apply the fix."
2.  "Generate a `task.md` for **Phase 1**?"
3.  "Create a deep-dive refactoring plan for [Category]?"
```
