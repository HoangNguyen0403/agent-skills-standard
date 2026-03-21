---
description: Review an entire codebase against framework best practices and generate a prioritized improvement plan
---

# Codebase Review Workflow

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

| Manifest                         | Framework     | `$SRC`                | `$TEST`         | `$EXT`    |
| -------------------------------- | ------------- | --------------------- | --------------- | --------- |
| `pubspec.yaml`                   | Flutter       | `lib/`                | `test/`         | `dart`    |
| `nest-cli.json`                  | NestJS        | `src/`                | `src/`          | `ts`      |
| `next` in deps                   | Next.js       | `src/`                | `__tests__/`    | `ts,tsx`  |
| `react-native` in deps           | React Native  | `src/` or `app/`      | `__tests__/`    | `ts,tsx`  |
| `react` in deps                  | React         | `src/`                | `src/`          | `ts,tsx`  |
| `angular.json`                   | Angular       | `src/app/`            | `src/`          | `ts`      |
| `go.mod`                         | Golang        | `.`                   | `.`             | `go`      |
| `pom.xml` + `spring-boot` dep    | Spring Boot   | `src/main/java`       | `src/test/java` | `java`    |
| `build.gradle.kts` + android app | Android       | `app/src/main`        | `app/src/test`  | `kt,java` |
| `Podfile` or `.xcodeproj`        | iOS           | `Sources/` or app dir | `Tests/`        | `swift`   |
| `artisan` file                   | Laravel       | `app/`                | `tests/`        | `php`     |
| `composer.json` (no artisan)     | PHP           | `src/`                | `tests/`        | `php`     |
| `package.json`                   | TypeScript/JS | `src/`                | `src/`          | `ts,js`   |

> [!IMPORTANT]
> **Record `$SRC`, `$TEST`, and `$EXT` now.** Every scan below uses these. Running against a wrong or non-existent dir silently returns empty results.

Then: `cat .agent/skills/index.json 2>/dev/null || cat skills/index.json 2>/dev/null`

| Framework     | Skills to load                                  |
| ------------- | ----------------------------------------------- |
| Flutter       | `flutter`, `dart`, `common`                     |
| NestJS        | `nestjs`, `typescript`, `common`                |
| Next.js       | `nextjs`, `react`, `typescript`, `common`       |
| React Native  | `react-native`, `react`, `typescript`, `common` |
| React         | `react`, `typescript`, `common`                 |
| Angular       | `angular`, `typescript`, `common`               |
| Golang        | `golang`, `common`                              |
| Spring Boot   | `spring-boot`, `java`, `kotlin`, `common`       |
| Android       | `android`, `kotlin`, `java`, `common`           |
| iOS           | `ios`, `swift`, `common`                        |
| Laravel       | `laravel`, `php`, `common`                      |
| PHP           | `php`, `common`                                 |
| TypeScript/JS | `typescript`, `common`                          |

---

## Step 3 — Read Skills

Read each discovered `SKILL.md`. Internally note P0/P1 patterns only.

Always load:

- `../skills/common/common-code-review/SKILL.md` — review persona and severity levels
- `../skills/common/common-security-audit/SKILL.md` — secrets, PII logs, CVE, infra hardening
- `../skills/common/common-owasp/SKILL.md` — OWASP Web App (2021) + API (2023) checklists (P0)
- If LLM SDK imports detected: `../skills/common/common-llm-security/SKILL.md` — OWASP LLM Top 10

---

## Step 4 — Breadth Scan (Run ALL — no skipping)

**File counts** (substitute `$EXT` and generated-file exclusions per stack):

```bash
# Source files (exclude generated, exclude tests)
find $SRC -type f -name "*.$EXT" \
  ! -name "*.g.dart" ! -name "*.freezed.dart" ! -name "*.gr.dart" ! -name "*_test.*" ! -name "*.spec.*" \
  | wc -l

# Test files
find $TEST -type f \( -name "*_test.$EXT" -o -name "*.spec.$EXT" \) | wc -l
```

**TODO/FIXME — production code only:**

```bash
grep -rn "// TODO\|// FIXME\|//TODO\|//FIXME" $SRC \
  | grep -v "\.g\.dart\|\.freezed\.dart\|\.gr\.dart\|\.spec\.\|_test\." | wc -l
```

**Fat Files — full ranked list (all files above threshold):**

```bash
# Logic files >600 LOC
find $SRC -type f -name "*.$EXT" \
  ! -name "*.g.dart" ! -name "*.freezed.dart" ! -name "*.spec.*" ! -name "*_test.*" \
  | xargs wc -l 2>/dev/null \
  | awk '$1 > 600 && $2 != "total" {print $1, $2}' | sort -rn

# Utility/helper/transformer files >400 LOC
find $SRC -type f \( -name "*utils*" -o -name "*helper*" -o -name "*transformer*" -o -name "*extension*" \) \
  ! -name "*.g.*" ! -name "*_test.*" ! -name "*.spec.*" \
  | xargs wc -l 2>/dev/null \
  | awk '$1 > 400 && $2 != "total" {print $1, $2}' | sort -rn

# Test files >1500 LOC
find $TEST -type f \( -name "*_test.*" -o -name "*.spec.*" \) \
  | xargs wc -l 2>/dev/null \
  | awk '$1 > 1500 && $2 != "total" {print $1, $2}' | sort -rn

# Watch zone (300–600 LOC, production only)
find $SRC -type f -name "*.$EXT" ! -name "*.g.*" ! -name "*_test.*" ! -name "*.spec.*" \
  | xargs wc -l 2>/dev/null \
  | awk '$1 > 300 && $1 <= 600 && $2 != "total"' | wc -l
```

**N+1 Query Signals** (run regardless of framework — flag any match for deep review in Step 6):

```bash
grep -rn "for\|forEach\|map" $SRC --include="*.ts" -A3 | grep -E "\.find\(|\.findOne\(|\.findBy\(|\.query\(|repository\." | wc -l
grep -rn "foreach\s*(\\\$" $SRC --include="*.php" -A5 | grep -E "->[a-zA-Z_]+\b" | grep -vE "with\(|load\(|->get\(\)" | wc -l
grep -rn "->get()\|->first()\|->all()" $SRC --include="*.php" | grep -v "->with\|->load" | wc -l
grep -rn "@OneToMany\|@ManyToOne\|@OneToOne" $SRC --include="*.java" --include="*.kt" | grep -v "fetch = FetchType.EAGER\|@EntityGraph" | wc -l
grep -rn "for .*{" $SRC --include="*.go" -A5 | grep -E "\.Find\(|\.First\(|\.Where\(|db\.|sqlx\." | wc -l
grep -rn "for .*{" $SRC --include="*.go" -A5 | grep -E "\.Query\(|\.Exec\(|\.Get\(|\.Select\(" | wc -l
grep -rn "dao\.\|\.query\(" $SRC --include="*.kt" --include="*.java" | grep -v "viewModelScope\|IO\|Dispatchers\|subscribe\|async" | wc -l
```

> Any match > 0 in the above — **flag for deep inspection in Step 6 Lens 2 (N+1)**.

---

**Framework-specific signals** (run the block matching detected framework):

```bash
# Flutter/Dart
grep -rn "Colors\.\|Color(0x" $SRC --include="*.dart" | grep -v "\.g\.dart\|AppColors\|colorScheme" | wc -l
grep -rn "http\.\|Dio\|dio\." $SRC/presentation --include="*.dart" 2>/dev/null | grep -v "//\|service\|repository" | wc -l
grep -rn "^\s*print(\|^\s*debugPrint(" $SRC --include="*.dart" | grep -v "\.g\.dart\|_test\.dart\|//\s*print" | wc -l
# TS/Node (NestJS, Next.js, React, Angular, RN)
grep -rn "console\.log\|console\.error" $SRC --include="*.ts" --include="*.tsx" | wc -l
grep -rn "\bany\b" $SRC --include="*.ts" --include="*.tsx" | grep -v "//\|\.d\.ts" | wc -l
grep -rn "useSelector\|useDispatch" $SRC --include="*.ts" --include="*.tsx" | grep -v "//\|hooks\/" | wc -l
grep -rn "px\b" $SRC --include="*.ts" --include="*.tsx" --include="*.js" | grep -v "//\|\.snap\|regex\|\.md" | wc -l
grep -rn "ChangeDetectionStrategy\.Default" $SRC --include="*.ts" | wc -l
grep -rn "subscribe(" $SRC --include="*.ts" | grep -v "//\|\.spec\.\|unsubscribe" | wc -l
# Android/Kotlin/Java
grep -rn "Log\.d\|Log\.e\|Log\.v\|println(" $SRC --include="*.kt" --include="*.java" | grep -v "//\|test" | wc -l
grep -rn "runOnUiThread\|runBlocking" $SRC --include="*.kt" | grep -v "//\|test" | wc -l
grep -rn "System\.out\.print\|e\.printStackTrace" $SRC --include="*.java" | grep -v "//\|test\|Test" | wc -l
grep -rn "@Transactional" $SRC --include="*.java" | wc -l
# iOS/Swift
grep -rn "print(\|NSLog(" $SRC --include="*.swift" | grep -v "//\|test\|Test" | wc -l
grep -rn "force unwrap\|!\." $SRC --include="*.swift" | grep -v "//\|test\|IBOutlet\|IBAction" | wc -l
# Go
grep -rn "fmt\.Print\|log\.Print" $SRC --include="*.go" | wc -l
grep -rn "interface{}" $SRC --include="*.go" | wc -l
# PHP/Laravel
grep -rn "var_dump\|print_r\|echo " $SRC --include="*.php" | grep -v "//\|test\|Test\|blade" | wc -l
grep -rn "DB::raw\|->whereRaw\|->\$" $SRC --include="*.php" | grep -v "//\|test" | wc -l
```

---

## Step 5 — Security Audit (6-Layer)

Apply `../skills/common/common-security-audit/SKILL.md`. Run all 6 layers.

### 5a. Hardcoded Secrets

```bash
grep -riE "(password|apiKey|api_key|secret|private_key|token)\s*=\s*['\"][^'\"]{6,}" \
  $SRC --exclude-dir={node_modules,dist,build,.git} -l
```

### 5b. PII / Sensitive Data in Logs

```bash
grep -rE "console\.(log|error|warn)" $SRC --include="*.ts" --include="*.js" | grep -iE "password|token|secret|private"
grep -rE "log\.(Print|Printf|Println|Fatal)" $SRC --include="*.go" | grep -iE "password|token|secret"
grep -rE "print\(|debugPrint\(" $SRC --include="*.dart" | grep -iE "password|token|secret"
grep -rE "log(ger)?\.(info|debug|warn|error)|Log\.[dev]" $SRC --include="*.java" --include="*.kt" | grep -iE "password|token|secret"
grep -rE "print\(|NSLog\(" $SRC --include="*.swift" | grep -iE "password|token|secret"
grep -rE "var_dump\(|error_log\(|Log::" $SRC --include="*.php" | grep -iE "password|token|secret"
```

### 5c. Injection Surface (SQL / Command)

```bash
grep -rE "\+.*SELECT|\+.*INSERT|\+.*UPDATE|\+.*DELETE|query\(.*\+|fmt\.Sprintf.*SELECT|exec\(.*\+" \
  $SRC --include="*.ts" --include="*.js" --include="*.go" \
       --include="*.java" --include="*.kt" --include="*.dart" \
       --include="*.php" --include="*.swift"
```

### 5d. Auth Coverage vs Exposure

```bash
# NestJS
total=$(grep -rE "@(Get|Post|Put|Delete|Patch)\(" $SRC 2>/dev/null | wc -l)
guarded=$(grep -rE "@(UseGuards|Auth)\(" $SRC 2>/dev/null | wc -l)
echo "NestJS Routes: $total | Guarded: $guarded | Unguarded: $(( (total - guarded) * 100 / (total + 1) ))%"

# Angular (route guards)
total=$(grep -rE "path:" $SRC --include="*.ts" 2>/dev/null | wc -l)
guarded=$(grep -rE "canActivate|canLoad|AuthGuard" $SRC --include="*.ts" 2>/dev/null | wc -l)
echo "Angular Routes: $total | Guards: $guarded"

# Spring Boot / Java
total=$(grep -rE "@(GetMapping|PostMapping|PutMapping|DeleteMapping|RequestMapping)" $SRC 2>/dev/null | wc -l)
guarded=$(grep -rE "@(PreAuthorize|Secured|RolesAllowed)" $SRC 2>/dev/null | wc -l)
echo "Spring Routes: $total | Guarded: $guarded"

# Go (gin/chi/echo)
total=$(grep -rE "\.(GET|POST|PUT|DELETE|PATCH)\(" $SRC --include="*.go" 2>/dev/null | wc -l)
guarded=$(grep -rE "(middleware|auth|jwt|guard)" $SRC --include="*.go" 2>/dev/null | wc -l)
echo "Go Handlers: $total | Auth middleware refs: $guarded"

# Laravel (routes/web.php + routes/api.php)
total=$(grep -rE "Route::(get|post|put|delete|patch)" routes/ 2>/dev/null | wc -l)
guarded=$(grep -rE "middleware\(|->middleware" routes/ 2>/dev/null | wc -l)
echo "Laravel Routes: $total | Middleware-guarded: $guarded"

# PHP (plain)
total=$(grep -rE "\$_(GET|POST|PUT|DELETE|REQUEST)" $SRC --include="*.php" 2>/dev/null | wc -l)
guarded=$(grep -rE "session_start|isAuthenticated|checkAuth|require.*auth" $SRC --include="*.php" 2>/dev/null | wc -l)
echo "PHP Endpoints: $total | Auth checks: $guarded"
```

### 5e. Dependency Audit (CVE)

```bash
[ -f package.json ] && npm audit --audit-level=high 2>/dev/null | tail -20
[ -f pubspec.yaml ] && dart pub outdated --json 2>/dev/null | head -40
[ -f go.mod ]       && go list -m -u all 2>/dev/null | grep "\["
[ -f pom.xml ]      && mvn dependency:list 2>/dev/null | grep "WARNING"
[ -f Pipfile ]      && pip-audit 2>/dev/null | head -20
```

### 5f. Infrastructure Hardening

```bash
grep -rE "^FROM .+:latest|^USER root|curl.*\| *sh|ADD http" . --include="Dockerfile" --include="*.dockerfile"
```

### 5g. Code Execution Surface (RCE / SSRF / Deserialization / Path Traversal)

Scan `$SRC` for each risk below. Confirm user input reaches the call site before marking as a finding.

| Risk               | What to scan for                                                                                                             | Stacks                              | Severity                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------- |
| RCE — dynamic eval | Code-from-string execution APIs                                                                                              | JS/TS, PHP, Python                  | 🔴 if user-controlled         |
| RCE — shell spawn  | Process/shell invocation APIs                                                                                                | Node, PHP, Go, Java/Kotlin          | 🔴 if user-controlled         |
| SSRF               | Outbound HTTP client calls (axios, got, RestTemplate, curl, http.Get) where URL comes from request, not a constant/allowlist | All                                 | 🟠 no allowlist / 🔴 no check |
| Deserialization    | Native binary/object deserializer on external input (not JSON)                                                               | Java/Kotlin, PHP, Node/TS, Python   | 🔴 Critical                   |
| Path traversal     | File I/O where path argument is not wrapped in platform path-join API (`path.join`, `filepath.Clean`, `Paths.get`)           | Node, PHP, Go, Java/Kotlin, Android | 🟠 read / 🔴 write or execute |

**Security Scoring Impact:**

| Finding                                 | Threshold | Severity    | Deduction |
| --------------------------------------- | --------- | ----------- | --------- |
| Hardcoded secrets                       | Any match | 🔴 Critical | -25       |
| PII / secrets in logs                   | Any match | 🔴 Critical | -20       |
| RCE surface — code exec with user input | Any match | 🔴 Critical | -25       |
| Deserialization of untrusted input      | Any match | 🔴 Critical | -20       |
| Unguarded routes > 20%                  | > 0.2     | 🔴 Critical | -15       |
| SSRF — outbound HTTP with dynamic URL   | Any match | 🟠 High     | -12       |
| Raw SQL / command string concatenation  | Any match | 🟠 High     | -10       |
| Path traversal — unsanitized file path  | Any match | 🟠 High     | -10       |
| Stack traces in responses               | > 0       | 🟠 High     | -10       |
| `FROM :latest` in Docker                | Any match | 🟠 High     | -8        |
| High-severity CVEs                      | > 0       | 🟠 High     | -8        |
| N+1 query patterns detected             | > 5 hits  | 🟡 Medium   | -5        |

> [!IMPORTANT]
> Any 🔴 Critical finding **caps the Security score at 40/100**.

### 5h. OWASP Top 10 Audit

Apply the checklists from the skills loaded in Step 3. Mark each item ✅ / ⚠️ / 🔴.

- **OWASP Web App (A01–A10)** + **OWASP API (API1–API10)**: follow `common-owasp` skill — see its `references/owasp-web.md` and `references/owasp-api.md` for full detection signals per item.
- **OWASP LLM (LLM01–LLM10)**: only if LLM SDK imports detected — follow `common-llm-security` skill; see `references/owasp-llm.md` for full detection signals.

> Any 🔴 P0 finding from either checklist **caps the Security score at 40/100**.

---

## Step 6 — Deep Quality Check (6 Lenses × 3 Files)

Pick the **largest non-generated file** from the fat-file scan for each layer below.
Apply each lens independently — do not blend concerns.

### Lens 1: Architecture Compliance

| Layer          | File type to pick                  | Verify                                               |
| -------------- | ---------------------------------- | ---------------------------------------------------- |
| Application    | Largest service / use case / bloc  | SRP, event/command count, no infrastructure imports  |
| Infrastructure | Largest repository / datasource    | No UI/analytics code, error wrapping, single concern |
| Presentation   | Largest page / widget / controller | No business logic, thin orchestration only           |

### Lens 2: N+1 Query Detection

> Only run if Step 4 N+1 signals returned > 0. Pick the largest repository/datasource/service file.

**Inspect for each ORM / data access pattern:**

| Stack                    | What to look for                                                                             | Fix                                                               |
| ------------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| TypeORM / NestJS         | `find()` / `findOne()` inside a `for` loop or `.map()`                                       | Use `relations` option or `QueryBuilder` with `leftJoinAndSelect` |
| Laravel Eloquent         | Accessing a relation property (`->items`) inside `foreach` without prior `->with('items')`   | Add eager loading: `->with(['relation'])`                         |
| Spring Boot / JPA        | `@OneToMany` / `@ManyToOne` fields accessed in a loop without `@EntityGraph` or `JOIN FETCH` | Add `@EntityGraph` or `FetchType.EAGER` where appropriate         |
| Go / GORM                | `db.Find()` or `db.First()` called inside a `for` loop                                       | Use `db.Preload("Relation")` or a single JOIN query               |
| Go / sqlx / database/sql | Raw `Query()` / `Exec()` calls inside a `for` loop                                           | Batch with `IN (?)` clause or single query with JOIN              |
| Android / Room           | DAO methods called directly in a loop on the same thread                                     | Use `@Relation` with `@Transaction` and return a data class       |

**How to confirm N+1:**

1. Find a loop that iterates over a collection of model/entity objects
2. Check if any DB call inside the loop uses an ID from that collection
3. If yes: N+1 confirmed — the outer query already loaded the parent, now it re-queries for each child

**Severity**: 🟡 Medium per occurrence; 🟠 High if inside a high-frequency endpoint (list/search/feed APIs).

### Lens 3: Silent Failures

For the 3 files selected above:

- Every `try/catch`, `.catch()`, error callback, or fallback path:
  - Error logged with context (operation, relevant IDs)?
  - User receives actionable feedback?
  - Catch block specific, or does it swallow unrelated errors?
- **Empty catch blocks** → Critical
- **Fallback to mock/stub in production** → Critical
- Optional chaining (`?.`) that silently skips failed operations → Major

### Lens 4: Test Coverage Gaps

- New logic paths without tests → flag
- Error path and edge case coverage?
- Tests verify behavior (contracts), not implementation details?
- Test files above 1200 LOC → likely testing too much at once

### Lens 5: Type Design (if new types/models)

For each new type found in the fat files:

- Invariants enforced at construction time?
- Illegal states representable? (flag as Major)
- Mutable internals exposed? (flag as Major)
- Anemic model with no behavior? (flag as NIT)

### Lens 6: Comment Accuracy

- Do comments match what the code does?
- Comments that restate obvious code → flag for removal
- Missing "why" for non-obvious logic → flag as NIT
- TODOs/FIXMEs — tracked or stale?

---

## Step 7 — Scored Report

**Scoring (deduct from 100 per category):**

- 🔴 Critical: -15 | 🟠 High: -8 | 🟡 Medium: -3 | 🔵 Low: -1
- Security score independently capped at **40/100** if any 🔴 Critical finding exists

**Report header:** `## [ProjectName] — Score [X/100] | [Framework] | [YYYY-MM-DD]`

### Metric Dashboard

| Metric               | Value               | Signal  |
| -------------------- | ------------------- | ------- |
| Source Files         | [N] excl. generated |         |
| Test Files           | [N]                 | [ratio] |
| Tech Debt (TODOs)    | [N in $SRC]         |         |
| Fat Files (>600 LOC) | [N]                 |         |
| Secret Scan          | Safe / Vulnerable   |         |
| RCE / SSRF Surface   | [N candidates]      |         |
| N+1 Query Signals    | [N candidates]      |         |
| Unguarded Routes     | [N% unguarded]      |         |
| LLM Usage Detected   | Yes / No            |         |
| OWASP P0 Findings    | [N]                 |         |

### Category Scores

| Category       | Score | Key Driver           |
| -------------- | ----- | -------------------- |
| Security       | /100  |                      |
| AI/LLM Safety  | /100  | skip if no LLM usage |
| Architecture   | /100  |                      |
| Performance    | /100  |                      |
| Testing        | /100  |                      |
| Code Quality   | /100  |                      |
| Error Handling | /100  |                      |

### Critical / High / Medium Findings

For fat-file findings, include the **complete ranked table** — do not abbreviate:

| File   | LOC | Lens        | Problem          |
| ------ | --- | ----------- | ---------------- |
| [link] | [N] | [lens name] | [specific issue] |

### What's Working Well

List genuine strengths to preserve.

### Improvement Plan

> [!IMPORTANT]
> Every row MUST include a **"Why / Benefits"** column — the concrete outcome delivered.

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

## Step 8 — Skill Feedback Loop

For every **Critical** or **High** finding, answer:

> _"Was there an active skill that should have prevented this?"_

**YES** — edit the skill directly:

1. Open `skills/<category>/<skill-name>/SKILL.md`
2. Add the missing rule as `**No X**: Do Y.` under `## Anti-Patterns`
3. Add or update `skills/<category>/<skill-name>/evals/evals.json` with an assertion for the violation
4. Note in the report: `SKILL GAP: <category/skill> — added rule for <issue>`

**NO** — note it: _no relevant skill exists yet_ → consider creating one using `common-skill-creator`.

---

## Step 9 — Interactive Follow-Up

Ask:

1. "Fix **[ID]** now?"
2. "Generate a `task.md` for Phase 1?"
3. "Create a deep-dive refactoring plan for **[component]**?"
