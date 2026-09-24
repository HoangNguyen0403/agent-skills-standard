# 📊 Agent Skill Benchmark Report

> Generated: 2026-09-23T06:17:26.300Z
> Token counting: real cl100k-family tokenizer (`gpt-tokenizer`), chars/4 as fallback only.
> Baselines: **synthetic reference instruction-volume bands**, not a measured survey of real prompts (see Methodology). Token/cost figures below measure *skill size*, not *behavioral effectiveness*.
> Quality: structural rubric (0–10), no live LLM calls required. For measured with/without-skill behavioral results, see the [Live Evals Report](evals-report.md).

## ❓ How to Read This Report

This benchmark answers: **"How much smaller is a skill than a reference band of inline instructions a developer might otherwise write?"** It is a size/structure metric, not a measured behavioral improvement — that is what the [Live Evals Report](evals-report.md) is for.

**Reference band (no skill)**: a synthetic stand-in for domain knowledge written directly into the prompt every time.
**WITH a skill**: the agent loads the SKILL.md file (avg. 594 tokens this run) — structured, reusable, cached.

**Eval–Skill Consistency** (labeled "Aligned" below): % of eval `contains` assertion values that are literal substrings of SKILL.md. This only checks that the skill and its evals were written consistently with each other — it is **not** evidence the skill changes agent behavior. Evals are written from the skill, so near-100% is expected and does not by itself indicate quality. Measured behavioral delta lives in the [Live Evals Report](evals-report.md).

## 🔢 Executive Summary

| Metric                            | Value                             | Basis / Provenance |
| --------------------------------- | --------------------------------- | --- |
| Total Skills Benchmarked          | **288**           | Measured: count of `skills/*/*/SKILL.md` this run |
| Avg. Tokens WITH Skill (SKILL.md) | **594 tokens**    | Measured: real cl100k-family tokenizer over SKILL.md files |
| Baseline: Light prompt (no skill) | **529 tokens** ↓ see Methodology | Synthetic reference (`BASELINE_LIGHT`, scripts/benchmark/baselines.ts) — not a measured survey |
| Baseline: Heavy prompt (no skill) | **986 tokens** ↓ see Methodology | Synthetic reference (`BASELINE_HEAVY`, scripts/benchmark/baselines.ts) — not a measured survey |
| Avg. Token Savings vs Light       | **-12%** (-65 tokens/call) | ⚠️ Synthetic-baseline upper bound vs `BASELINE_LIGHT` = 529 tokens — not a measured behavioral saving |
| Avg. Token Savings vs Heavy       | **40%** (392 tokens/call) | ⚠️ Synthetic-baseline upper bound vs `BASELINE_HEAVY` = 986 tokens — not a measured behavioral saving |
| Avg. Quality Score                | **9.8/10** | ⚠️ Structural rubric score (bullet count, anti-patterns, line budget, eval coverage) — not measured behavioral quality. Rubric is saturated: 96% of skills score ≥9/10, so this average has little discriminative power |
| Guardrail Skills Covered          | **13** | Measured: skills matching the guardrail-applicability heuristic |
| Avg. Behavior Quality             | **3.3/4** (guardrail skills only) | ⚠️ Structural rubric score, not measured behavioral quality |
| Skills with Evals                 | **288 / 288** | Measured: evals.json presence, not behavioral pass rate |
| Avg. Eval–Skill Consistency       | **99%** (272 skills with `contains` assertions — see caveat above) | Wording-overlap heuristic, not a behavioral signal |

> All "⚠️ Synthetic-baseline upper bound" figures above are priced/sized against the fixed reference constants in `scripts/benchmark/baselines.ts` (`BASELINE_LIGHT` = 529, `BASELINE_HEAVY` = 986), not a measured population of real prompts. Dollar figures further down also depend on the pricing table dated **Feb 2026** (`PRICING_AS_OF`, scripts/benchmark/models.ts). See Methodology for the full caveat and the [Live Evals Report](evals-report.md) for the one measured (non-synthetic) effectiveness signal in this report.

## 🆕 What Changed Since v2.6.0

**New skills (25)**: `common-agent-guardrails`, `common-operator-profile`, `common-review-policy`, `common-sdlc-metrics`, `common-task-complexity-routing`, `database-hana`, `quality-engineering-automation-health`, `quality-engineering-flaky-triage`, `quality-engineering-playwright-pom-generation`, `quality-engineering-selector-stability`, `quality-engineering-test-healing`, `quality-engineering-test-plan-authoring`, `quality-engineering-visual-baseline`, `system-design-artifact-intake`, `system-design-building-blocks`, `system-design-case-catalog`, `system-design-communication`, `system-design-data-architecture`, `system-design-estimation`, `system-design-integration-patterns`, `system-design-interview-coaching`, `system-design-methodology`, `system-design-principles`, `system-design-resilience-ops`, `system-design-review`

**Removed skills (1)**: `common-system-design`

**Quality-score changes**:

| Skill | Category | Before | After |
| --- | --- | --- | --- |
| `common-tdd` | common | 10/10 | 6/10 |
| `common-feedback-reporter` | common | 10/10 | 8/10 |
| `common-telemetry` | common | 9/10 | 7/10 |
| `common-workflow-writing` | common | 10/10 | 8/10 |
| `flutter-widgets` | flutter | 10/10 | 8/10 |
| `android-networking` | android | 9/10 | 10/10 |
| `common-accessibility` | common | 9/10 | 10/10 |
| `common-code-review` | common | 9/10 | 10/10 |
| `common-debugging` | common | 9/10 | 10/10 |
| `common-error-handling` | common | 9/10 | 10/10 |
| `common-learning-log` | common | 9/10 | 10/10 |
| `common-product-requirements` | common | 9/10 | 10/10 |
| `common-security-standards` | common | 9/10 | 10/10 |
| `flutter-auto-route-navigation` | flutter | 9/10 | 10/10 |
| `flutter-bloc-state-management` | flutter | 9/10 | 10/10 |
| `flutter-dependency-injection` | flutter | 9/10 | 10/10 |
| `flutter-localization` | flutter | 9/10 | 10/10 |
| `flutter-navigation` | flutter | 9/10 | 10/10 |
| `flutter-notifications` | flutter | 9/10 | 10/10 |
| `flutter-security` | flutter | 9/10 | 10/10 |
| `golang-error-handling` | golang | 9/10 | 10/10 |
| `golang-logging` | golang | 9/10 | 10/10 |
| `golang-testing` | golang | 9/10 | 10/10 |
| `nestjs-configuration` | nestjs | 7/10 | 8/10 |
| `nestjs-documentation` | nestjs | 9/10 | 10/10 |
| `nextjs-pages-router` | nextjs | 9/10 | 10/10 |
| `nextjs-server-actions` | nextjs | 9/10 | 10/10 |
| `nextjs-server-components` | nextjs | 9/10 | 10/10 |
| `nextjs-styling` | nextjs | 9/10 | 10/10 |
| `php-concurrency` | php | 9/10 | 10/10 |
| `php-error-handling` | php | 9/10 | 10/10 |
| `php-language` | php | 9/10 | 10/10 |
| `php-testing` | php | 9/10 | 10/10 |
| `quality-engineering-appium-mcp` | quality-engineering | 9/10 | 10/10 |
| `quality-engineering-playwright-cli` | quality-engineering | 9/10 | 10/10 |
| `react-security` | react | 9/10 | 10/10 |
| `react-testing` | react | 9/10 | 10/10 |
| `spring-boot-testing` | spring-boot | 9/10 | 10/10 |
| `swift-swiftui` | swift | 9/10 | 10/10 |

**Token-size changes ≥10%**:

| Skill | Category | Change |
| --- | --- | --- |
| `common-architecture-diagramming` | common | +129% (1083 tokens now) |
| `quality-engineering-playwright-cli` | quality-engineering | +75% (1196 tokens now) |
| `common-telemetry` | common | +71% (926 tokens now) |
| `golang-database` | golang | +70% (780 tokens now) |
| `quality-engineering-appium-mcp` | quality-engineering | +58% (1170 tokens now) |
| `golang-logging` | golang | +44% (579 tokens now) |
| `golang-concurrency` | golang | +41% (576 tokens now) |
| `golang-api-server` | golang | +39% (609 tokens now) |
| `android-navigation-type-safe` | android | +35% (345 tokens now) |
| `common-web-visual-testing` | common | +35% (743 tokens now) |
| `common-learning-log` | common | +33% (670 tokens now) |
| `angular-architecture` | angular | +30% (780 tokens now) |
| `laravel-clean-architecture` | laravel | +29% (819 tokens now) |
| `flutter-localization` | flutter | +28% (585 tokens now) |
| `common-protocol-enforcement` | common | +25% (614 tokens now) |

| `common-observability` | common | +22% (506 tokens now) |
| `php-concurrency` | php | +22% (629 tokens now) |
| `quality-engineering-quality-assurance` | quality-engineering | +22% (593 tokens now) |
| `common-store-changelog` | common | +21% (805 tokens now) |

| `database-postgresql` | database | +21% (464 tokens now) |
| `flutter-bloc-state-management` | flutter | +21% (854 tokens now) |
| `flutter-security` | flutter | +21% (536 tokens now) |
| `ios-notifications` | ios | +21% (326 tokens now) |
| `common-code-review` | common | +20% (622 tokens now) |
| `common-debugging` | common | +20% (476 tokens now) |
| `common-mobile-animation` | common | +20% (613 tokens now) |
| `database-redis` | database | +20% (544 tokens now) |
| `ios-design-system` | ios | +20% (315 tokens now) |
| `angular-performance` | angular | +19% (543 tokens now) |
| `common-documentation` | common | +19% (416 tokens now) |
| `common-mobile-visual-testing` | common | +19% (727 tokens now) |

| `common-mobile-ux-core` | common | +18% (483 tokens now) |
| `javascript-language` | javascript | +18% (545 tokens now) |
| `swift-memory-management` | swift | +18% (456 tokens now) |
| `angular-dependency-injection` | angular | +17% (584 tokens now) |
| `angular-security` | angular | +17% (553 tokens now) |
| `common-error-handling` | common | +17% (467 tokens now) |
| `ios-dependency-injection` | ios | +17% (335 tokens now) |
| `ios-deployment` | ios | +17% (386 tokens now) |
| `javascript-best-practices` | javascript | +17% (357 tokens now) |
| `javascript-tooling` | javascript | +17% (469 tokens now) |
| `php-best-practices` | php | +17% (608 tokens now) |
| `swift-swiftui` | swift | +17% (501 tokens now) |
| `flutter-navigation` | flutter | +16% (440 tokens now) |
| `laravel-security` | laravel | +16% (836 tokens now) |
| `laravel-sessions-middleware` | laravel | +16% (751 tokens now) |
| `nestjs-architecture` | nestjs | +16% (674 tokens now) |
| `nextjs-server-components` | nextjs | +16% (668 tokens now) |
| `react-native-dls` | react-native | +16% (333 tokens now) |
| `common-feedback-reporter` | common | +15% (999 tokens now) |
| `dart-language` | dart | +15% (815 tokens now) |
| `database-mongodb` | database | +15% (467 tokens now) |
| `flutter-getx-state-management` | flutter | +15% (544 tokens now) |
| `ios-ui-navigation` | ios | +15% (463 tokens now) |
| `kotlin-language` | kotlin | +15% (518 tokens now) |
| `angular-components` | angular | +14% (723 tokens now) |
| `angular-forms` | angular | +14% (367 tokens now) |
| `common-product-requirements` | common | +14% (1034 tokens now) |
| `golang-testing` | golang | +14% (496 tokens now) |
| `android-resources` | android | +13% (490 tokens now) |
| `angular-directives-pipes` | angular | +13% (558 tokens now) |
| `angular-style-guide` | angular | +13% (591 tokens now) |
| `laravel-background-processing` | laravel | +13% (720 tokens now) |
| `quality-engineering-zephyr-coverage-analysis` | quality-engineering | +13% (521 tokens now) |
| `swift-language` | swift | +13% (518 tokens now) |
| `flutter-feature-based-clean-architecture` | flutter | +12% (568 tokens now) |
| `java-language` | java | +12% (585 tokens now) |
| `laravel-architecture` | laravel | +12% (388 tokens now) |
| `laravel-testing` | laravel | +12% (802 tokens now) |
| `react-native-components` | react-native | +12% (411 tokens now) |
| `android-concurrency` | android | +11% (378 tokens now) |
| `angular-http-client` | angular | +11% (616 tokens now) |
| `angular-testing` | angular | +11% (493 tokens now) |
| `flutter-dependency-injection` | flutter | +11% (520 tokens now) |
| `ios-localization` | ios | +11% (399 tokens now) |
| `android-navigation` | android | +10% (285 tokens now) |
| `angular-state-management` | angular | +10% (426 tokens now) |
| `flutter-auto-route-navigation` | flutter | +10% (509 tokens now) |

## 🧪 Measured Effectiveness — Live Evals (latest run per category)

Unlike everything else in this report, these numbers come from actually running each skill's eval prompts through an agent — see the [Live Evals Report](evals-report.md) and [docs/EVALS.md](docs/EVALS.md) for the full methodology and how to verify or extend this table.

| Category | Baseline Pass Rate | With-Skill Pass Rate | Delta | Last Run |
| --- | --- | --- | --- | --- |
| all | 10% | 68% | +57% | 2026-09-22 |

> Full-catalog live eval run covers all 23 categories; see the [Live Evals Report](evals-report.md) for the per-category breakdown.

## 📜 History

> ⚠️ `Savings (%)` per row is that release's `savingsPctHeavy` against the synthetic `BASELINE_HEAVY` reference band **in effect at generation time** (currently 986 tokens, scripts/benchmark/baselines.ts) — not a measured behavioral saving, and not necessarily comparable across rows if the reference prompt changed. `Quality` is the structural rubric score, not measured behavior. Use `pnpm benchmark:gate` (see Regression Gate) to catch a within-tolerance drift between adjacent releases.

| Version | Date       | Skills | Avg Tokens | Savings (%) | Quality | Report |
| ------- | ---------- | ------ | ---------- | ----------- | ------- | ------ |
| v2.6.1 | 2026-09-23 | 288 | 594 | 40% | 9.8/10 | [Full Report](benchmarks/archive/v2.6.1.md) |
| v2.6.0 | 2026-07-10 | 264 | 528 | 46% | 9.8/10 | [Full Report](benchmarks/archive/v2.6.0.md) |
| v2.4.7 | 2026-06-15 | 251 | 551 | 85% | 9.8/10 | [Full Report](benchmarks/archive/v2.4.7.md) |
| v2.4.6 | 2026-06-10 | 251 | 548 | 85% | 9.8/10 | [Full Report](benchmarks/archive/v2.4.6.md) |
| v2.4.1 | 2026-05-18 | 247 | 540 | 85% | 9.9/10 | [Full Report](benchmarks/archive/v2.4.1.md) |
| v2.4.0 | 2026-05-14 | 246 | 540 | 85% | 9.9/10 | [Full Report](benchmarks/archive/v2.4.0.md) |
| v2.3.0 | 2026-05-13 | 246 | 540 | 85% | 9.9/10 | [Full Report](benchmarks/archive/v2.3.0.md) |
| v2.2.2 | 2026-05-09 | 249 | 539 | 85% | 9.9/10 | [Full Report](benchmarks/archive/v2.2.2.md) |
| v2.2.0 | 2026-04-22 | 242 | 538 | 85% | 9.9/10 | [Full Report](benchmarks/archive/v2.2.0.md) |
| v2.1.2 | 2026-04-11 | 237 | 516 | 86% | 10/10 | [Full Report](benchmarks/archive/v2.1.2.md) |
| v2.1.1 | 2026-04-11 | 237 | 516 | 86% | 9.9/10 | [Full Report](benchmarks/archive/v2.1.1.md) |
| v2.1.0 | 2026-04-04 | 237 | 526 | 86% | 9.9/10 | [Full Report](benchmarks/archive/v2.1.0.md) |
| v2.0.1 | 2026-03-30 | 238 | 527 | 86% | 9.8/10 | [Full Report](benchmarks/archive/v2.0.1.md) |
| v2.0.0 | 2026-03-25 | 235 | 523 | 86% | 9.9/10 | [Full Report](benchmarks/archive/v2.0.0.md) |
| v1.10.3 | 2026-03-21 | 234 | 505 | 86% | 9.8/10 | [Full Report](benchmarks/archive/v1.10.3.md) |
| v1.10.1 | 2026-03-16 | 229 | 428 | 88% | 9.9/10 | [Full Report](benchmarks/archive/v1.10.1.md) |
| v1.10.0 | 2026-03-16 | 229 | 434 | 88% | 7/10 | [Full Report](benchmarks/archive/v1.10.0.md) |
| v1.9.3 | 2026-03-15 | 229 | 460 | 87% | 8.9/10 | [Full Report](benchmarks/archive/v1.9.3.md) |
| v1.9.2 | 2026-03-07 | 228 | 458 | 87% | 8.9/10 | [Full Report](benchmarks/archive/v1.9.2.md) |
| v1.9.1 | 2026-03-07 | 228 | 458 | 87% | 8.9/10 | [Full Report](benchmarks/archive/v1.9.1.md) |
| v1.9.0 | 2026-03-05 | 228 | 457 | 88% | 8.9/10 | [Full Report](benchmarks/archive/v1.9.0.md) |
| v1.8.0 | 2026-03-02 | 228 | 443 | 88% | 8.9/10 | [Full Report](benchmarks/archive/v1.8.0.md) |
| v1.7.3 | 2026-02-25 | 222 | 418 | 89% | 8.9/10 | [Full Report](benchmarks/archive/v1.7.3.md) |
| v1.7.2 | 2026-02-25 | 220 | 413 | 89% | 8.9/10 | [Full Report](benchmarks/archive/v1.7.2.md) |

## 🧾 Metadata Overhead (the cost skills are NOT free)

> Skills are not zero-cost to install. Every synced skill's frontmatter (`name` + `description`) is loaded into the session/router context regardless of whether its full body is ever read. This section reports that always-on cost, which the savings figures above do not net out.

| Metric | Value |
| --- | --- |
| Avg. frontmatter tokens per skill | **105 tokens** |
| Total frontmatter overhead (all 288 skills registered, paid every session) | **30237 tokens** |
| Break-even (skill *uses*, at avg. savings/use, to offset the whole catalog's per-session frontmatter cost) | **~78 use(s)** |

> **Prompt caching caveat**: all cost figures in this report price every token at the full input rate. In practice, static context (including skill frontmatter and any skill body loaded early in a session) is frequently served from a prompt cache at a fraction of the input price on providers that support it. Real savings are directionally consistent with this report but smaller in absolute $ than the tables below imply.

### 💰 Cost Comparison — Per Single Call (Average Skill)

> ⚠️ **Synthetic-baseline upper bound**: priced from the Heavy reference band `BASELINE_HEAVY` = 986 tokens (scripts/benchmark/baselines.ts, not a measured survey) against the model pricing table dated **Feb 2026** (`PRICING_AS_OF`, scripts/benchmark/models.ts). Ignores prompt caching (see caveat above) — treat every $ and % below as an upper bound, not a measured result.

| Model             | Original Cost | Skill Cost | Net Savings | % Saved |
| ----------------- | ------------- | ---------- | ----------- | ------- |
| Gemini 3 Flash | $0.0004930 | $0.0002970 | **$0.0001960** | 40% |
| GPT-5 | $0.0012325 | $0.0007425 | **$0.0004900** | 40% |
| Gemini 3.1 Pro | $0.0019720 | $0.0011880 | **$0.0007840** | 40% |
| Claude Sonnet 4.5 | $0.0029580 | $0.0017820 | **$0.0011760** | 40% |

### 📈 Monthly Savings at Scale — (Avg Skill vs Heavy Reference Band)

> ⚠️ **Synthetic-baseline upper bound**, illustrative only: assumes 1,000 calls/day for a single average skill against `BASELINE_HEAVY` = 986 tokens (scripts/benchmark/baselines.ts) and pricing dated **Feb 2026** (`PRICING_AS_OF`), no prompt caching, and constant token counts. Real savings depend heavily on caching and actual call volume — do not treat this as a budgeting figure.

| Daily Calls | Original Cost/mo | Monthly Savings (1 skill) | Model |
| ----------- | ---------------- | -------------------------- | ----- |
| 1,000 | $36.9750/mo | $14.7000/mo | GPT-5 |
| 1,000 | $88.7400/mo | $35.2800/mo | Claude Sonnet 4.5 |
| 1,000 | $59.1600/mo | $23.5200/mo | Gemini 3.1 Pro |

## 📦 Per-Category Summary

> ⚠️ Every `Savings (vs Heavy)` value below is a synthetic-baseline upper bound vs `BASELINE_HEAVY` = 986 tokens (scripts/benchmark/baselines.ts) — skill size relative to a reference instruction band, not a measured behavioral improvement. `Quality` is the structural rubric score (see Detailed Quality Rubric below), not measured behavior.

<details>
<summary><h3>📦 android (26 skills | avg 423 tokens | quality 9.9/10 | eval–skill consistency 100%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `android-architecture ` | 577    | ████░░░░░░ 41%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-background-work` | 290    | ███████░░░ 71%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-compose      ` | 540    | █████░░░░░ 45%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-compose-migration` | 687    | ███░░░░░░░ 30%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-concurrency  ` | 378    | ██████░░░░ 62%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-deployment   ` | 323    | ███████░░░ 67%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-design-system` | 279    | ███████░░░ 72%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-di           ` | 328    | ███████░░░ 67%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-edge-to-edge ` | 770    | ██░░░░░░░░ 22%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-legacy-navigation` | 308    | ███████░░░ 69%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-legacy-security` | 442    | ██████░░░░ 55%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-legacy-state ` | 267    | ███████░░░ 73%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-navigation   ` | 285    | ███████░░░ 71%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-navigation-3 ` | 667    | ███░░░░░░░ 32%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-navigation-type-safe` | 345    | ███████░░░ 65%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-networking   ` | 415    | ██████░░░░ 58%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-notifications` | 403    | ██████░░░░ 59%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-performance  ` | 389    | ██████░░░░ 61%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-persistence  ` | 318    | ███████░░░ 68%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-resources    ` | 490    | █████░░░░░ 50%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-security     ` | 378    | ██████░░░░ 62%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-state        ` | 443    | ██████░░░░ 55%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-testing      ` | 322    | ███████░░░ 67%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-tooling      ` | 317    | ███████░░░ 68%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-xml-views    ` | 316    | ███████░░░ 68%     | 10/10 | n/a      | 3 | ✅ 100% |
| `android-agp-upgrade  ` | 710    | ███░░░░░░░ 28%     | 8/10 | n/a      | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 angular (15 skills | avg 557 tokens | quality 10.0/10 | eval–skill consistency 99%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `angular-architecture ` | 780    | ██░░░░░░░░ 21%     | 10/10 | n/a      | 6 | ✅ 100% |
| `angular-components   ` | 723    | ███░░░░░░░ 27%     | 10/10 | n/a      | 9 | ✅ 100% |
| `angular-dependency-injection` | 584    | ████░░░░░░ 41%     | 10/10 | n/a      | 6 | ✅ 100% |
| `angular-directives-pipes` | 558    | ████░░░░░░ 43%     | 10/10 | n/a      | 6 | ✅ 100% |
| `angular-forms        ` | 367    | ██████░░░░ 63%     | 10/10 | n/a      | 6 | ✅ 100% |
| `angular-http-client  ` | 616    | ████░░░░░░ 38%     | 10/10 | n/a      | 6 | ✅ 100% |
| `angular-performance  ` | 543    | █████░░░░░ 45%     | 10/10 | n/a      | 6 | ✅ 100% |
| `angular-routing      ` | 386    | ██████░░░░ 61%     | 10/10 | n/a      | 6 | ✅ 100% |
| `angular-rxjs-interop ` | 528    | █████░░░░░ 46%     | 10/10 | n/a      | 6 | ✅ 100% |
| `angular-security     ` | 553    | ████░░░░░░ 44%     | 10/10 | n/a      | 6 | ✅ 88% |
| `angular-ssr          ` | 490    | █████░░░░░ 50%     | 10/10 | n/a      | 6 | ✅ 100% |
| `angular-state-management` | 426    | ██████░░░░ 57%     | 10/10 | n/a      | 6 | ✅ 100% |
| `angular-style-guide  ` | 591    | ████░░░░░░ 40%     | 10/10 | n/a      | 6 | ✅ 100% |
| `angular-testing      ` | 493    | █████░░░░░ 50%     | 10/10 | n/a      | 6 | ✅ 100% |
| `angular-tooling      ` | 711    | ███░░░░░░░ 28%     | 10/10 | n/a      | 6 | ✅ 100% |

</details>

<details>
<summary><h3>📦 common (42 skills | avg 779 tokens | quality 9.6/10 | eval–skill consistency 98%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `common-accessibility ` | 1075   | ⚠️ Overhead 9%     | 10/10 | n/a      | 3 | ✅ 100% |
| `common-agent-guardrails` | 949    | ░░░░░░░░░░ 4%      | 10/10 | n/a      | 5 | ✅ 88% |
| `common-api-design    ` | 895    | █░░░░░░░░░ 9%      | 10/10 | n/a      | 3 | ✅ 100% |
| `common-architecture-audit` | 628    | ████░░░░░░ 36%     | 10/10 | n/a      | 3 | ✅ 100% |
| `common-architecture-diagramming` | 1083   | ⚠️ Overhead 10%    | 10/10 | n/a      | 8 | ✅ 100% |
| `common-best-practices` | 425    | ██████░░░░ 57%     | 10/10 | n/a      | 3 | ✅ 100% |
| `common-business-requirements` | 630    | ████░░░░░░ 36%     | 10/10 | n/a      | 3 | ✅ 100% |
| `common-code-review   ` | 622    | ████░░░░░░ 37%     | 10/10 | 4/4      | 3 | ⚠️ 67% |
| `common-context-optimization` | 513    | █████░░░░░ 48%     | 10/10 | n/a      | 3 | ✅ 100% |
| `common-dast-tooling  ` | 958    | ░░░░░░░░░░ 3%      | 10/10 | n/a      | 3 | ✅ 100% |
| `common-debugging     ` | 476    | █████░░░░░ 52%     | 10/10 | 4/4      | 3 | ✅ 100% |
| `common-documentation ` | 416    | ██████░░░░ 58%     | 10/10 | n/a      | 3 | ✅ 80% |
| `common-error-handling` | 467    | █████░░░░░ 53%     | 10/10 | n/a      | 3 | ✅ 100% |
| `common-git-collaboration` | 523    | █████░░░░░ 47%     | 10/10 | n/a      | 3 | ✅ 100% |
| `common-learning-log  ` | 670    | ███░░░░░░░ 32%     | 10/10 | n/a      | 3 | ✅ 100% |
| `common-llm-security  ` | 705    | ███░░░░░░░ 28%     | 10/10 | n/a      | 3 | ✅ 100% |
| `common-mobile-animation` | 613    | ████░░░░░░ 38%     | 10/10 | n/a      | 3 | ✅ 100% |
| `common-mobile-ux-core` | 483    | █████░░░░░ 51%     | 10/10 | n/a      | 3 | n/a |
| `common-observability ` | 506    | █████░░░░░ 49%     | 10/10 | n/a      | 3 | n/a |
| `common-operator-profile` | 925    | █░░░░░░░░░ 6%      | 10/10 | n/a      | 4 | ✅ 100% |
| `common-owasp         ` | 1273   | ⚠️ Overhead 29%    | 10/10 | n/a      | 3 | ✅ 100% |
| `common-performance-engineering` | 664    | ███░░░░░░░ 33%     | 10/10 | n/a      | 3 | ✅ 100% |
| `common-product-requirements` | 1034   | ⚠️ Overhead 5%     | 10/10 | n/a      | 5 | ✅ 100% |
| `common-review-policy ` | 967    | ░░░░░░░░░░ 2%      | 10/10 | 4/4      | 5 | ✅ 100% |
| `common-sdlc-metrics  ` | 975    | ░░░░░░░░░░ 1%      | 10/10 | n/a      | 5 | ✅ 83% |
| `common-security-audit` | 990    | ░░░░░░░░░░ 0%      | 10/10 | 0/4      | 3 | ✅ 100% |
| `common-security-standards` | 694    | ███░░░░░░░ 30%     | 10/10 | n/a      | 3 | ✅ 100% |
| `common-session-retrospective` | 731    | ███░░░░░░░ 26%     | 10/10 | n/a      | 3 | ✅ 100% |
| `common-skill-creator ` | 1559   | ⚠️ Overhead 58%    | 10/10 | 4/4      | 3 | ✅ 100% |
| `common-software-requirements` | 657    | ███░░░░░░░ 33%     | 10/10 | n/a      | 3 | ✅ 100% |
| `common-store-changelog` | 805    | ██░░░░░░░░ 18%     | 10/10 | n/a      | 4 | ✅ 100% |
| `common-task-complexity-routing` | 846    | █░░░░░░░░░ 14%     | 10/10 | 4/4      | 3 | ✅ 100% |
| `common-ui-design     ` | 732    | ███░░░░░░░ 26%     | 10/10 | n/a      | 3 | ✅ 100% |
| `common-exploit-verification` | 742    | ███░░░░░░░ 25%     | 9/10 | n/a      | 2 | ✅ 100% |
| `common-mobile-visual-testing` | 727    | ███░░░░░░░ 26%     | 9/10 | n/a      | 2 | ✅ 100% |
| `common-pentest-methodology` | 1068   | ⚠️ Overhead 8%     | 9/10 | n/a      | 2 | ✅ 100% |
| `common-web-visual-testing` | 743    | ███░░░░░░░ 25%     | 9/10 | n/a      | 2 | ✅ 100% |
| `common-feedback-reporter` | 999    | ⚠️ Overhead 1%     | 8/10 | n/a      | 4 | ✅ 94% |
| `common-protocol-enforcement` | 614    | ████░░░░░░ 38%     | 8/10 | 4/4      | 3 | ✅ 100% |
| `common-workflow-writing` | 613    | ████░░░░░░ 38%     | 8/10 | 0/4      | 4 | ✅ 100% |
| `common-telemetry     ` | 926    | █░░░░░░░░░ 6%      | 7/10 | n/a      | 2 | ✅ 100% |
| `common-tdd           ` | 786    | ██░░░░░░░░ 20%     | 6/10 | 4/4      | 6 | ✅ 100% |

</details>

<details>
<summary><h3>📦 dart (3 skills | avg 597 tokens | quality 9.3/10 | eval–skill consistency 100%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `dart-best-practices  ` | 481    | █████░░░░░ 51%     | 10/10 | n/a      | 3 | ✅ 100% |
| `dart-tooling         ` | 496    | █████░░░░░ 50%     | 10/10 | n/a      | 3 | ✅ 100% |
| `dart-language        ` | 815    | ██░░░░░░░░ 17%     | 8/10 | n/a      | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 database (8 skills | avg 449 tokens | quality 9.4/10 | eval–skill consistency 98%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `database-mongodb     ` | 467    | █████░░░░░ 53%     | 10/10 | n/a      | 3 | ✅ 100% |
| `database-postgresql  ` | 464    | █████░░░░░ 53%     | 10/10 | n/a      | 3 | ✅ 100% |
| `database-redis       ` | 544    | █████░░░░░ 45%     | 10/10 | n/a      | 3 | ✅ 86% |
| `database-hana        ` | 867    | █░░░░░░░░░ 12%     | 9/10 | n/a      | 3 | n/a |
| `database-migrations  ` | 312    | ███████░░░ 68%     | 9/10 | n/a      | 1 | ✅ 100% |
| `database-query-performance` | 321    | ███████░░░ 67%     | 9/10 | n/a      | 1 | ✅ 100% |
| `database-schema-design` | 331    | ███████░░░ 66%     | 9/10 | n/a      | 1 | ✅ 100% |
| `database-transactions` | 283    | ███████░░░ 71%     | 9/10 | n/a      | 1 | ✅ 100% |

</details>

<details>
<summary><h3>📦 flutter (22 skills | avg 568 tokens | quality 9.8/10 | eval–skill consistency 99%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `flutter-auto-route-navigation` | 509    | █████░░░░░ 48%     | 10/10 | n/a      | 3 | ✅ 100% |
| `flutter-bloc-state-management` | 854    | █░░░░░░░░░ 13%     | 10/10 | n/a      | 3 | ✅ 100% |
| `flutter-cicd         ` | 599    | ████░░░░░░ 39%     | 10/10 | n/a      | 3 | ✅ 100% |
| `flutter-concurrency  ` | 674    | ███░░░░░░░ 32%     | 10/10 | n/a      | 3 | ✅ 100% |
| `flutter-dependency-injection` | 520    | █████░░░░░ 47%     | 10/10 | n/a      | 3 | ✅ 100% |
| `flutter-design-system` | 612    | ████░░░░░░ 38%     | 10/10 | n/a      | 3 | ✅ 100% |
| `flutter-error-handling` | 599    | ████░░░░░░ 39%     | 10/10 | n/a      | 3 | ✅ 100% |
| `flutter-feature-based-clean-architecture` | 568    | ████░░░░░░ 42%     | 10/10 | n/a      | 3 | ✅ 100% |
| `flutter-getx-navigation` | 335    | ███████░░░ 66%     | 10/10 | n/a      | 3 | ✅ 100% |
| `flutter-getx-state-management` | 544    | █████░░░░░ 45%     | 10/10 | n/a      | 3 | ✅ 100% |
| `flutter-go-router-navigation` | 599    | ████░░░░░░ 39%     | 10/10 | n/a      | 3 | ✅ 100% |
| `flutter-idiomatic-flutter` | 451    | █████░░░░░ 54%     | 10/10 | n/a      | 3 | ✅ 100% |
| `flutter-layer-based-clean-architecture` | 639    | ████░░░░░░ 35%     | 10/10 | n/a      | 3 | ✅ 100% |
| `flutter-localization ` | 585    | ████░░░░░░ 41%     | 10/10 | n/a      | 3 | n/a |
| `flutter-navigation   ` | 440    | ██████░░░░ 55%     | 10/10 | n/a      | 3 | ✅ 83% |
| `flutter-notifications` | 349    | ███████░░░ 65%     | 10/10 | n/a      | 3 | ✅ 100% |
| `flutter-performance  ` | 481    | █████░░░░░ 51%     | 10/10 | n/a      | 3 | ✅ 100% |
| `flutter-retrofit-networking` | 547    | █████░░░░░ 45%     | 10/10 | n/a      | 3 | ✅ 100% |
| `flutter-riverpod-state-management` | 563    | ████░░░░░░ 43%     | 10/10 | n/a      | 3 | ✅ 100% |
| `flutter-security     ` | 536    | █████░░░░░ 46%     | 10/10 | n/a      | 3 | ✅ 100% |
| `flutter-testing      ` | 945    | ░░░░░░░░░░ 4%      | 8/10 | n/a      | 3 | ✅ 100% |
| `flutter-widgets      ` | 542    | █████░░░░░ 45%     | 8/10 | n/a      | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 golang (11 skills | avg 546 tokens | quality 10.0/10 | eval–skill consistency 100%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `golang-api-server    ` | 609    | ████░░░░░░ 38%     | 10/10 | n/a      | 3 | ✅ 100% |
| `golang-architecture  ` | 509    | █████░░░░░ 48%     | 10/10 | n/a      | 3 | ✅ 100% |
| `golang-concurrency   ` | 576    | ████░░░░░░ 42%     | 10/10 | n/a      | 3 | ✅ 100% |
| `golang-configuration ` | 401    | ██████░░░░ 59%     | 10/10 | n/a      | 3 | ✅ 100% |
| `golang-database      ` | 780    | ██░░░░░░░░ 21%     | 10/10 | n/a      | 3 | ✅ 100% |
| `golang-error-handling` | 372    | ██████░░░░ 62%     | 10/10 | n/a      | 3 | ✅ 100% |
| `golang-language      ` | 550    | ████░░░░░░ 44%     | 10/10 | n/a      | 3 | ✅ 100% |
| `golang-logging       ` | 579    | ████░░░░░░ 41%     | 10/10 | n/a      | 3 | ✅ 100% |
| `golang-security      ` | 540    | █████░░░░░ 45%     | 10/10 | n/a      | 3 | ✅ 100% |
| `golang-testing       ` | 496    | █████░░░░░ 50%     | 10/10 | n/a      | 3 | ✅ 100% |
| `golang-tooling       ` | 598    | ████░░░░░░ 39%     | 10/10 | n/a      | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 ios (15 skills | avg 406 tokens | quality 10.0/10 | eval–skill consistency 99%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `ios-app-lifecycle    ` | 319    | ███████░░░ 68%     | 10/10 | n/a      | 3 | ✅ 100% |
| `ios-architecture     ` | 670    | ███░░░░░░░ 32%     | 10/10 | n/a      | 3 | ✅ 100% |
| `ios-dependency-injection` | 335    | ███████░░░ 66%     | 10/10 | n/a      | 3 | ✅ 100% |
| `ios-deployment       ` | 386    | ██████░░░░ 61%     | 10/10 | n/a      | 3 | ✅ 100% |
| `ios-design-system    ` | 315    | ███████░░░ 68%     | 10/10 | n/a      | 3 | ✅ 100% |
| `ios-localization     ` | 399    | ██████░░░░ 60%     | 10/10 | n/a      | 3 | ✅ 100% |
| `ios-navigation       ` | 278    | ███████░░░ 72%     | 10/10 | n/a      | 3 | ✅ 100% |
| `ios-networking       ` | 388    | ██████░░░░ 61%     | 10/10 | n/a      | 3 | ✅ 100% |
| `ios-notifications    ` | 326    | ███████░░░ 67%     | 10/10 | n/a      | 3 | ✅ 100% |
| `ios-performance      ` | 388    | ██████░░░░ 61%     | 10/10 | n/a      | 3 | ✅ 100% |
| `ios-persistence      ` | 368    | ██████░░░░ 63%     | 10/10 | n/a      | 3 | ✅ 100% |
| `ios-security         ` | 460    | █████░░░░░ 53%     | 10/10 | n/a      | 3 | ✅ 83% |
| `ios-state-management ` | 362    | ██████░░░░ 63%     | 10/10 | n/a      | 3 | ✅ 100% |
| `ios-swiftui          ` | 627    | ████░░░░░░ 36%     | 10/10 | n/a      | 3 | ✅ 100% |
| `ios-ui-navigation    ` | 463    | █████░░░░░ 53%     | 10/10 | n/a      | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 java (5 skills | avg 511 tokens | quality 10.0/10 | eval–skill consistency 100%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `java-best-practices  ` | 436    | ██████░░░░ 56%     | 10/10 | n/a      | 3 | ✅ 100% |
| `java-concurrency     ` | 407    | ██████░░░░ 59%     | 10/10 | n/a      | 3 | ✅ 100% |
| `java-language        ` | 585    | ████░░░░░░ 41%     | 10/10 | n/a      | 3 | ✅ 100% |
| `java-testing         ` | 593    | ████░░░░░░ 40%     | 10/10 | n/a      | 3 | ✅ 100% |
| `java-tooling         ` | 532    | █████░░░░░ 46%     | 10/10 | n/a      | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 javascript (3 skills | avg 457 tokens | quality 10.0/10 | eval–skill consistency 100%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `javascript-best-practices` | 357    | ██████░░░░ 64%     | 10/10 | n/a      | 3 | ✅ 100% |
| `javascript-language  ` | 545    | █████░░░░░ 45%     | 10/10 | n/a      | 3 | ✅ 100% |
| `javascript-tooling   ` | 469    | █████░░░░░ 52%     | 10/10 | n/a      | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 kotlin (4 skills | avg 435 tokens | quality 10.0/10 | eval–skill consistency 100%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `kotlin-best-practices` | 448    | ██████░░░░ 55%     | 10/10 | n/a      | 3 | ✅ 100% |
| `kotlin-coroutines    ` | 408    | ██████░░░░ 59%     | 10/10 | n/a      | 3 | ✅ 100% |
| `kotlin-language      ` | 518    | █████░░░░░ 47%     | 10/10 | n/a      | 3 | ✅ 100% |
| `kotlin-tooling       ` | 365    | ██████░░░░ 63%     | 10/10 | n/a      | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 laravel (10 skills | avg 723 tokens | quality 10.0/10 | eval–skill consistency 100%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `laravel-api          ` | 749    | ██░░░░░░░░ 24%     | 10/10 | n/a      | 6 | ✅ 100% |
| `laravel-architecture ` | 388    | ██████░░░░ 61%     | 10/10 | n/a      | 6 | ✅ 100% |
| `laravel-background-processing` | 720    | ███░░░░░░░ 27%     | 10/10 | n/a      | 6 | ✅ 100% |
| `laravel-clean-architecture` | 819    | ██░░░░░░░░ 17%     | 10/10 | n/a      | 6 | ✅ 100% |
| `laravel-database-expert` | 791    | ██░░░░░░░░ 20%     | 10/10 | n/a      | 6 | ✅ 100% |
| `laravel-eloquent     ` | 613    | ████░░░░░░ 38%     | 10/10 | n/a      | 6 | ✅ 100% |
| `laravel-security     ` | 836    | ██░░░░░░░░ 15%     | 10/10 | n/a      | 6 | ✅ 100% |
| `laravel-sessions-middleware` | 751    | ██░░░░░░░░ 24%     | 10/10 | n/a      | 6 | ✅ 100% |
| `laravel-testing      ` | 802    | ██░░░░░░░░ 19%     | 10/10 | n/a      | 6 | ✅ 100% |
| `laravel-tooling      ` | 756    | ██░░░░░░░░ 23%     | 10/10 | n/a      | 6 | ✅ 100% |

</details>

<details>
<summary><h3>📦 nestjs (21 skills | avg 618 tokens | quality 9.8/10 | eval–skill consistency 99%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `nestjs-api-standards ` | 556    | ████░░░░░░ 44%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nestjs-architecture  ` | 674    | ███░░░░░░░ 32%     | 10/10 | n/a      | 3 | ✅ 83% |
| `nestjs-bullmq        ` | 946    | ░░░░░░░░░░ 4%      | 10/10 | n/a      | 3 | ✅ 100% |
| `nestjs-caching       ` | 584    | ████░░░░░░ 41%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nestjs-controllers-services` | 697    | ███░░░░░░░ 29%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nestjs-database      ` | 618    | ████░░░░░░ 37%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nestjs-deployment    ` | 693    | ███░░░░░░░ 30%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nestjs-documentation ` | 521    | █████░░░░░ 47%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nestjs-file-uploads  ` | 419    | ██████░░░░ 58%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nestjs-notification  ` | 495    | █████░░░░░ 50%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nestjs-observability ` | 448    | ██████░░░░ 55%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nestjs-performance   ` | 937    | █░░░░░░░░░ 5%      | 10/10 | n/a      | 3 | ✅ 100% |
| `nestjs-real-time     ` | 847    | █░░░░░░░░░ 14%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nestjs-scheduling    ` | 585    | ████░░░░░░ 41%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nestjs-search        ` | 488    | █████░░░░░ 51%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nestjs-security      ` | 825    | ██░░░░░░░░ 16%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nestjs-security-isolation` | 512    | █████░░░░░ 48%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nestjs-testing       ` | 600    | ████░░░░░░ 39%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nestjs-transport     ` | 408    | ██████░░░░ 59%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nestjs-configuration ` | 557    | ████░░░░░░ 44%     | 8/10 | n/a      | 3 | ✅ 100% |
| `nestjs-error-handling` | 572    | ████░░░░░░ 42%     | 8/10 | n/a      | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 nextjs (18 skills | avg 650 tokens | quality 10.0/10 | eval–skill consistency 100%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `nextjs-app-router    ` | 1019   | ⚠️ Overhead 3%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nextjs-architecture  ` | 1039   | ⚠️ Overhead 5%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nextjs-authentication` | 465    | █████░░░░░ 53%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nextjs-caching       ` | 644    | ████░░░░░░ 35%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nextjs-data-access-layer` | 515    | █████░░░░░ 48%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nextjs-data-fetching ` | 525    | █████░░░░░ 47%     | 10/10 | n/a      | 6 | ✅ 100% |
| `nextjs-i18n          ` | 612    | ████░░░░░░ 38%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nextjs-optimization  ` | 516    | █████░░░░░ 48%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nextjs-pages-router  ` | 735    | ███░░░░░░░ 25%     | 10/10 | n/a      | 6 | ✅ 100% |
| `nextjs-rendering     ` | 750    | ██░░░░░░░░ 24%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nextjs-security      ` | 658    | ███░░░░░░░ 33%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nextjs-server-actions` | 569    | ████░░░░░░ 42%     | 10/10 | n/a      | 6 | ✅ 100% |
| `nextjs-server-components` | 668    | ███░░░░░░░ 32%     | 10/10 | n/a      | 6 | ✅ 100% |
| `nextjs-state-management` | 595    | ████░░░░░░ 40%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nextjs-styling       ` | 707    | ███░░░░░░░ 28%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nextjs-testing       ` | 658    | ███░░░░░░░ 33%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nextjs-tooling       ` | 406    | ██████░░░░ 59%     | 10/10 | n/a      | 3 | ✅ 100% |
| `nextjs-upgrade       ` | 616    | ████░░░░░░ 38%     | 10/10 | n/a      | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 php (7 skills | avg 583 tokens | quality 10.0/10 | eval–skill consistency 100%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `php-best-practices   ` | 608    | ████░░░░░░ 38%     | 10/10 | n/a      | 6 | ✅ 100% |
| `php-concurrency      ` | 629    | ████░░░░░░ 36%     | 10/10 | n/a      | 6 | ✅ 100% |
| `php-error-handling   ` | 455    | █████░░░░░ 54%     | 10/10 | n/a      | 6 | ✅ 100% |
| `php-language         ` | 464    | █████░░░░░ 53%     | 10/10 | n/a      | 6 | ✅ 100% |
| `php-security         ` | 635    | ████░░░░░░ 36%     | 10/10 | n/a      | 6 | ✅ 100% |
| `php-testing          ` | 593    | ████░░░░░░ 40%     | 10/10 | n/a      | 6 | ✅ 100% |
| `php-tooling          ` | 699    | ███░░░░░░░ 29%     | 10/10 | n/a      | 6 | ✅ 100% |

</details>

<details>
<summary><h3>📦 python (9 skills | avg 358 tokens | quality 9.0/10 | eval–skill consistency 100%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `python-architecture  ` | 377    | ██████░░░░ 62%     | 9/10 | n/a      | 2 | ✅ 100% |
| `python-async-runtime ` | 329    | ███████░░░ 67%     | 9/10 | n/a      | 2 | ✅ 100% |
| `python-best-practices` | 323    | ███████░░░ 67%     | 9/10 | n/a      | 2 | ✅ 100% |
| `python-database      ` | 331    | ███████░░░ 66%     | 9/10 | n/a      | 2 | ✅ 100% |
| `python-error-handling` | 292    | ███████░░░ 70%     | 9/10 | n/a      | 2 | ✅ 100% |
| `python-language      ` | 438    | ██████░░░░ 56%     | 9/10 | n/a      | 2 | ✅ 100% |
| `python-security      ` | 335    | ███████░░░ 66%     | 9/10 | n/a      | 2 | ✅ 100% |
| `python-testing       ` | 383    | ██████░░░░ 61%     | 9/10 | n/a      | 2 | ✅ 100% |
| `python-tooling       ` | 414    | ██████░░░░ 58%     | 9/10 | n/a      | 2 | ✅ 100% |

</details>

<details>
<summary><h3>📦 quality-engineering (14 skills | avg 812 tokens | quality 9.9/10 | eval–skill consistency 100%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `quality-engineering-appium-mcp` | 1170   | ⚠️ Overhead 19%    | 10/10 | n/a      | 3 | ✅ 100% |
| `quality-engineering-automation-health` | 743    | ███░░░░░░░ 25%     | 10/10 | n/a      | 3 | ✅ 100% |
| `quality-engineering-business-analysis` | 1044   | ⚠️ Overhead 6%     | 10/10 | n/a      | 6 | ✅ 100% |
| `quality-engineering-flaky-triage` | 820    | ██░░░░░░░░ 17%     | 10/10 | 4/4      | 3 | ✅ 100% |
| `quality-engineering-jira-integration` | 607    | ████░░░░░░ 38%     | 10/10 | n/a      | 3 | ✅ 100% |
| `quality-engineering-playwright-cli` | 1196   | ⚠️ Overhead 21%    | 10/10 | n/a      | 3 | ✅ 100% |
| `quality-engineering-playwright-pom-generation` | 769    | ██░░░░░░░░ 22%     | 10/10 | n/a      | 3 | ✅ 100% |
| `quality-engineering-quality-assurance` | 593    | ████░░░░░░ 40%     | 10/10 | n/a      | 3 | ✅ 100% |
| `quality-engineering-selector-stability` | 510    | █████░░░░░ 48%     | 10/10 | n/a      | 3 | ✅ 100% |
| `quality-engineering-test-plan-authoring` | 756    | ██░░░░░░░░ 23%     | 10/10 | 4/4      | 5 | ✅ 100% |
| `quality-engineering-visual-baseline` | 771    | ██░░░░░░░░ 22%     | 10/10 | 4/4      | 3 | ✅ 100% |
| `quality-engineering-zephyr-coverage-analysis` | 521    | █████░░░░░ 47%     | 10/10 | n/a      | 4 | ✅ 100% |
| `quality-engineering-zephyr-test-generation` | 1192   | ⚠️ Overhead 21%    | 10/10 | n/a      | 5 | ✅ 100% |
| `quality-engineering-test-healing` | 678    | ███░░░░░░░ 31%     | 8/10 | n/a      | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 react (8 skills | avg 578 tokens | quality 10.0/10 | eval–skill consistency 98%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `react-component-patterns` | 659    | ███░░░░░░░ 33%     | 10/10 | n/a      | 3 | ✅ 100% |
| `react-hooks          ` | 575    | ████░░░░░░ 42%     | 10/10 | n/a      | 3 | ✅ 83% |
| `react-performance    ` | 519    | █████░░░░░ 47%     | 10/10 | n/a      | 3 | ✅ 100% |
| `react-security       ` | 573    | ████░░░░░░ 42%     | 10/10 | n/a      | 3 | ✅ 100% |
| `react-state-management` | 777    | ██░░░░░░░░ 21%     | 10/10 | n/a      | 3 | ✅ 100% |
| `react-testing        ` | 582    | ████░░░░░░ 41%     | 10/10 | n/a      | 3 | ✅ 100% |
| `react-tooling        ` | 405    | ██████░░░░ 59%     | 10/10 | n/a      | 3 | ✅ 100% |
| `react-typescript     ` | 534    | █████░░░░░ 46%     | 10/10 | n/a      | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 react-native (13 skills | avg 461 tokens | quality 10.0/10 | eval–skill consistency 100%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `react-native-architecture` | 500    | █████░░░░░ 49%     | 10/10 | n/a      | 3 | ✅ 100% |
| `react-native-components` | 411    | ██████░░░░ 58%     | 10/10 | n/a      | 3 | ✅ 100% |
| `react-native-deployment` | 581    | ████░░░░░░ 41%     | 10/10 | n/a      | 3 | ✅ 100% |
| `react-native-dls     ` | 333    | ███████░░░ 66%     | 10/10 | n/a      | 3 | ✅ 100% |
| `react-native-navigation` | 437    | ██████░░░░ 56%     | 10/10 | n/a      | 3 | ✅ 100% |
| `react-native-navigation-v6` | 561    | ████░░░░░░ 43%     | 10/10 | n/a      | 3 | ✅ 100% |
| `react-native-notifications` | 313    | ███████░░░ 68%     | 10/10 | n/a      | 3 | ✅ 100% |
| `react-native-performance` | 622    | ████░░░░░░ 37%     | 10/10 | n/a      | 3 | ✅ 100% |
| `react-native-platform-specific` | 385    | ██████░░░░ 61%     | 10/10 | n/a      | 3 | ✅ 100% |
| `react-native-security` | 573    | ████░░░░░░ 42%     | 10/10 | n/a      | 3 | ✅ 100% |
| `react-native-state-management` | 458    | █████░░░░░ 54%     | 10/10 | n/a      | 3 | ✅ 100% |
| `react-native-styling ` | 324    | ███████░░░ 67%     | 10/10 | n/a      | 3 | ✅ 100% |
| `react-native-testing ` | 492    | █████░░░░░ 50%     | 10/10 | n/a      | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 spring-boot (10 skills | avg 463 tokens | quality 10.0/10 | eval–skill consistency 100%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `spring-boot-api-design` | 331    | ███████░░░ 66%     | 10/10 | n/a      | 3 | ✅ 100% |
| `spring-boot-architecture` | 598    | ████░░░░░░ 39%     | 10/10 | n/a      | 3 | ✅ 100% |
| `spring-boot-best-practices` | 564    | ████░░░░░░ 43%     | 10/10 | n/a      | 3 | ✅ 100% |
| `spring-boot-data-access` | 538    | █████░░░░░ 45%     | 10/10 | n/a      | 3 | ✅ 100% |
| `spring-boot-deployment` | 517    | █████░░░░░ 48%     | 10/10 | n/a      | 3 | ✅ 100% |
| `spring-boot-microservices` | 443    | ██████░░░░ 55%     | 10/10 | n/a      | 3 | ✅ 100% |
| `spring-boot-observability` | 460    | █████░░░░░ 53%     | 10/10 | n/a      | 3 | ✅ 100% |
| `spring-boot-scheduling` | 336    | ███████░░░ 66%     | 10/10 | n/a      | 3 | ✅ 100% |
| `spring-boot-security ` | 516    | █████░░░░░ 48%     | 10/10 | n/a      | 3 | ✅ 100% |
| `spring-boot-testing  ` | 328    | ███████░░░ 67%     | 10/10 | n/a      | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 swift (8 skills | avg 519 tokens | quality 10.0/10 | eval–skill consistency 100%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `swift-best-practices ` | 735    | ███░░░░░░░ 25%     | 10/10 | n/a      | 4 | ✅ 100% |
| `swift-concurrency    ` | 522    | █████░░░░░ 47%     | 10/10 | n/a      | 5 | ✅ 100% |
| `swift-error-handling ` | 527    | █████░░░░░ 47%     | 10/10 | n/a      | 4 | ✅ 100% |
| `swift-language       ` | 518    | █████░░░░░ 47%     | 10/10 | n/a      | 5 | ✅ 100% |
| `swift-memory-management` | 456    | █████░░░░░ 54%     | 10/10 | n/a      | 4 | ✅ 100% |
| `swift-swiftui        ` | 501    | █████░░░░░ 49%     | 10/10 | n/a      | 4 | ✅ 100% |
| `swift-testing        ` | 484    | █████░░░░░ 51%     | 10/10 | n/a      | 4 | ✅ 100% |
| `swift-tooling        ` | 409    | ██████░░░░ 59%     | 10/10 | n/a      | 4 | ✅ 100% |

</details>

<details>
<summary><h3>📦 system-design (12 skills | avg 882 tokens | quality 10.0/10 | eval–skill consistency 0%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `system-design-artifact-intake` | 1097   | ⚠️ Overhead 11%    | 10/10 | n/a      | 4 | n/a |
| `system-design-building-blocks` | 823    | ██░░░░░░░░ 17%     | 10/10 | n/a      | 4 | n/a |
| `system-design-case-catalog` | 775    | ██░░░░░░░░ 21%     | 10/10 | n/a      | 3 | n/a |
| `system-design-communication` | 783    | ██░░░░░░░░ 21%     | 10/10 | n/a      | 4 | n/a |
| `system-design-data-architecture` | 779    | ██░░░░░░░░ 21%     | 10/10 | n/a      | 4 | n/a |
| `system-design-estimation` | 851    | █░░░░░░░░░ 14%     | 10/10 | n/a      | 3 | n/a |
| `system-design-integration-patterns` | 830    | ██░░░░░░░░ 16%     | 10/10 | n/a      | 4 | n/a |
| `system-design-interview-coaching` | 1176   | ⚠️ Overhead 19%    | 10/10 | n/a      | 4 | n/a |
| `system-design-methodology` | 1109   | ⚠️ Overhead 12%    | 10/10 | n/a      | 3 | n/a |
| `system-design-principles` | 726    | ███░░░░░░░ 26%     | 10/10 | n/a      | 3 | n/a |
| `system-design-resilience-ops` | 810    | ██░░░░░░░░ 18%     | 10/10 | n/a      | 4 | n/a |
| `system-design-review ` | 827    | ██░░░░░░░░ 16%     | 10/10 | 3/4      | 3 | n/a |

</details>

<details>
<summary><h3>📦 typescript (4 skills | avg 730 tokens | quality 10.0/10 | eval–skill consistency 100%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Behavior | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | -------- | ----- | ------- |
| `typescript-best-practices` | 659    | ███░░░░░░░ 33%     | 10/10 | n/a      | 3 | ✅ 100% |
| `typescript-language  ` | 726    | ███░░░░░░░ 26%     | 10/10 | n/a      | 3 | ✅ 100% |
| `typescript-security  ` | 822    | ██░░░░░░░░ 17%     | 10/10 | n/a      | 5 | ✅ 100% |
| `typescript-tooling   ` | 714    | ███░░░░░░░ 28%     | 10/10 | n/a      | 3 | ✅ 100% |

</details>

## ⚠️ Low Eval–Skill Consistency — Skills to Review

> These skills have `contains` assertions whose exact wording does not appear in SKILL.md content ≥70% of the time. This usually means the eval and the skill drifted (e.g. the skill was edited after the eval was written) — it is a maintenance signal, not a measure of behavioral effectiveness. See the Live Evals Report for that.

| Skill                   | Category | Consistency | Evals | Action |
| ----------------------- | -------- | ----------- | ----- | ------ |
| `cyber-scoped-validation` | cybersecurity | ⚠️ 56% | 3 | Reconcile wording between evals/evals.json and SKILL.md |
| `common-code-review   ` | common   | ⚠️ 67% | 3 | Reconcile wording between evals/evals.json and SKILL.md |
| `cyber-detection-engineering` | cybersecurity | ⚠️ 67% | 3 | Reconcile wording between evals/evals.json and SKILL.md |
| `cyber-threat-hunting ` | cybersecurity | ⚠️ 67% | 3 | Reconcile wording between evals/evals.json and SKILL.md |

## ⚠️ Guardrail Skills Missing Behavior Coverage

> These skills enforce behavior but do not yet cover enough pressure scenarios, rationalizations, red flags, or behavior assertions.

| Skill | Category | Behavior | Action |
| ----- | -------- | -------- | ------ |
| `common-security-audit` | common | 0/4 | Add pressure_scenarios, rationalizations, red_flags, and behavior_assertions |
| `common-workflow-writing` | common | 0/4 | Add pressure_scenarios, rationalizations, red_flags, and behavior_assertions |

| `system-design-review` | system-design | 3/4 | Add pressure_scenarios, rationalizations, red_flags, and behavior_assertions |

## 📊 Quality Distribution

> Averages hide saturation. This shows how many skills actually sit at each score, so a 9.8/10 average can be read in context.

| Score | Count | Share |
| --- | --- | --- |
| 10/10 | 258 | ██████████████░ 90% |
| 9/10 | 18 | █░░░░░░░░░░░░░░ 6% |
| 8/10 | 10 | ░░░░░░░░░░░░░░░ 3% |
| 7/10 | 1 | ░░░░░░░░░░░░░░░ 0% |
| 6/10 | 1 | ░░░░░░░░░░░░░░░ 0% |

## 🔧 Needs Attention

> Actionable, not celebratory: lowest structural quality, largest token footprint, and guardrail skills with the weakest behavior coverage. (Guardrail gaps are also listed in full above, under "Guardrail Skills Missing Behavior Coverage".)

**Lowest structural quality:**

| Skill | Category | Quality | Tokens | Evals | Consistency |
| --- | --- | --- | --- | --- | --- |
| `common-tdd` | common | 6/10 | 786 | 6 | ✅ 100% |
| `common-telemetry` | common | 7/10 | 926 | 2 | ✅ 100% |
| `android-agp-upgrade` | android | 8/10 | 710 | 3 | ✅ 100% |
| `common-feedback-reporter` | common | 8/10 | 999 | 4 | ✅ 94% |
| `common-protocol-enforcement` | common | 8/10 | 614 | 3 | ✅ 100% |
| `common-workflow-writing` | common | 8/10 | 613 | 4 | ✅ 100% |
| `dart-language` | dart | 8/10 | 815 | 3 | ✅ 100% |
| `flutter-testing` | flutter | 8/10 | 945 | 3 | ✅ 100% |
| `flutter-widgets` | flutter | 8/10 | 542 | 3 | ✅ 100% |
| `nestjs-configuration` | nestjs | 8/10 | 557 | 3 | ✅ 100% |

**Largest token footprint** (candidates for splitting or trimming):

| Skill | Category | Tokens | Quality |
| --- | --- | --- | --- |
| `common-skill-creator` | common | 1559 | 10/10 |
| `common-owasp` | common | 1273 | 10/10 |
| `quality-engineering-playwright-cli` | quality-engineering | 1196 | 10/10 |
| `quality-engineering-zephyr-test-generation` | quality-engineering | 1192 | 10/10 |
| `system-design-interview-coaching` | system-design | 1176 | 10/10 |
| `quality-engineering-appium-mcp` | quality-engineering | 1170 | 10/10 |
| `system-design-methodology` | system-design | 1109 | 10/10 |
| `system-design-artifact-intake` | system-design | 1097 | 10/10 |
| `common-architecture-diagramming` | common | 1083 | 10/10 |
| `common-accessibility` | common | 1075 | 10/10 |

## 📐 Methodology & Baseline Justification

### Why These Baselines? (and what they do NOT prove)

The baselines are **synthetic reference prompts**, hand-written once and token-counted — they are not a measured survey or average of real developer prompts. They exist to give "tokens saved" a stable unit of comparison across a catalog of 264+ skills spanning many stacks; they do not claim any individual skill was benchmarked against what a specific developer would have typed.

NestJS was picked as the **Reference Unit** purely because it is a high-density, well-documented stack — not because every skill category resembles NestJS. Savings % should be read as "SKILL.md is this much smaller than a reference instruction-volume band", not as "this skill saves X% of what a developer would otherwise write for this specific framework."

For a measured (not synthetic) with/without-skill effectiveness signal, see the [Live Evals Report](evals-report.md), which runs each skill's eval prompts through an agent twice — once without the skill, once with it — and scores the transcripts deterministically.

#### 🟡 Reference Prompt — Light — 529 tokens (real-tokenizer count, no padding)

> **Synthetic Reference Prompt — Light (e.g., NestJS)**
> A compact inline system prompt used as a reference instruction-volume band. Representative of focused developer instructions without a structured skill. Not a measured average of real prompts.

#### 🔴 Reference Prompt — Heavy — 986 tokens (real-tokenizer count, no padding)

> **Synthetic Reference Prompt — Heavy (e.g., NestJS Architecture)**
> A comprehensive architect-level inline prompt used as a reference instruction-volume band. Includes deep patterns and rules a developer might send when no skill is present. Not a measured average of real prompts.

### 🏆 Detailed Quality Rubric (0–10)

To ensure skills are not just "short" but actually **high quality**, every skill is scored against this structural rubric:

| Score  | Criteria                  | Rationale                                              |
| ------ | ------------------------- | ------------------------------------------------------ |
| **+2** | **Structured Guidelines** | At least 3 specific instructions/bullet points.                    |
| **+2** | **Anti-Patterns**         | `## Anti-Patterns` section or `**No X**` inline lines.            |
| **+2** | **Reference Examples**    | `references/*.md` links resolved on disk (existing + non-empty) — OR ≤60 lines total. Dangling links score 0 here even if present in text. |
| **+2** | **Token Optimality**      | Entire `SKILL.md` is ≤100 lines (forces brevity).                  |
| **+2** | **Eval Coverage**         | ≥3 evals with `should_not_trigger`, ≥2 assertions each. +1 partial.|

> **Eval–Skill Consistency** (reported separately, not scored): % of eval `contains` assertion values that are literal substrings of SKILL.md content. Because evals are typically authored from the skill, near-100% is the expected baseline, not evidence of quality — it only flags drift between a skill and its own evals. It is **not** a proxy for with-skill vs. without-skill behavioral improvement; that requires actually running the evals (see [Live Evals Report](evals-report.md)).
> **Behavior Quality** (reported separately): guardrail-only score for pressure scenarios, rationalizations, red flags, and behavior assertions.

### 🛡️ How to Verify This Report

Trust but verify. Every number above is reproducible from source — nothing here requires taking our word for it:

1. **Clone the repo** and install dependencies (`pnpm install`).
2. **Inspect source**: the benchmark logic is open in [scripts/benchmark/](scripts/benchmark/) (`utils.ts` for the quality rubric, `baselines.ts` for the reference prompts, `reporter.ts` for how this file is generated).
3. **Regenerate this report**: `pnpm benchmark:report` — diff the output against this file; it should match modulo the `Generated:` timestamp.
4. **For measured (non-structural) behavioral results**, see [docs/EVALS.md](docs/EVALS.md) for how to run and verify the Live Evals Report yourself, including via `pnpm evals:verify` or the MCP `verify_eval_run` tool — no API key required.

### Pricing (per 1M input tokens, Feb 2026)

> Pricing drifts. Verify current rates with each provider before using these figures for budgeting.

- **Gemini 3 Flash**: $0.50
- **GPT-5**: $1.25
- **Gemini 3.1 Pro**: $2.00
- **Claude Sonnet 4.5**: $3.00
