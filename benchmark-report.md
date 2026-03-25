# 📊 Agent Skill Benchmark Report

> Generated: 2026-03-25T08:22:42.219Z
> Token counting: `ceil(characters / 4)` — cl100k_base approximation.
> Baselines: derived from **real, measured example prompts** (see Methodology).
> Quality: structural rubric (0–10), no live LLM calls required.

## ❓ How to Read This Report

This benchmark answers: **"How many tokens and dollars does an agent skill save compared to a developer writing the same guidance inline?"**

**WITHOUT a skill**: A developer writes domain knowledge directly into the prompt every time (Baseline).
**WITH a skill**: The agent loads the SKILL.md file (~400 tokens) — structured, reusable, cached.

**Eval Alignment**: % of eval assertion values that appear in SKILL.md. High alignment means the skill actually teaches what the evals test — the static proxy for "with skill > without skill" behavioral improvement.

## 🔢 Executive Summary

| Metric                            | Value                             |
| --------------------------------- | --------------------------------- |
| Total Skills Benchmarked          | **235**           |
| Avg. Tokens WITH Skill (SKILL.md) | **523 tokens**    |
| Baseline: Light prompt (no skill) | **1449 tokens** ↓ see Methodology |
| Baseline: Heavy prompt (no skill) | **3656 tokens** ↓ see Methodology |
| Avg. Token Savings vs Light       | **64%** (926 tokens/call) |
| Avg. Token Savings vs Heavy       | **86%** (3133 tokens/call) |
| Avg. Quality Score                | **9.9/10** |
| Skills with Evals                 | **235 / 235** |
| Avg. Eval Alignment               | **92%** (eval assertions covered by SKILL.md) |

## 📜 History

| Version | Date       | Skills | Avg Tokens | Savings (%) | Quality | Report |
| ------- | ---------- | ------ | ---------- | ----------- | ------- | ------ |
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

### 💰 Cost Comparison — Per Single Call (Average Skill)

> Comparison based on **Heavy Baseline** vs. modern and speculative models.

| Model             | Original Cost | Skill Cost | Net Savings    | % Saved |
| ----------------- | ------------- | ---------- | -------------- | ------- |
| Gemini 3 Flash    | $0.0018280    | $0.0002615 | **$0.0015665    ** | 86% |
| GPT-5             | $0.0045700    | $0.0006538 | **$0.0039163    ** | 86% |
| Gemini 3.1 Pro    | $0.0073120    | $0.0010460 | **$0.0062660    ** | 86% |
| Claude Sonnet 4.5 | $0.0109680    | $0.0015690 | **$0.0093990    ** | 86% |

### 📈 Monthly Savings at Scale — (Avg Skill vs Heavy Prompt)

| Daily Calls | Original Cost/mo | Monthly Savings (1 skill) | Monthly Savings (50 skills) | Model |
| ----------- | ---------------- | ------------------------- | --------------------------- | ----- |
| 1,000       | $137.1000       /mo | $117.4875               /mo | $5874.3750                /mo | GPT-5 |
| 1,000       | $329.0400       /mo | $281.9700               /mo | $14098.5000               /mo | Claude Sonnet 4.5 |
| 1,000       | $219.3600       /mo | $187.9800               /mo | $9399.0000                /mo | Gemini 3.1 Pro |

## 📦 Per-Category Summary

<details>
<summary><h3>📦 android (22 skills | avg 350 tokens | quality 10.0/10 | eval alignment 92%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `android-architecture ` | 505    | █████████░ 86%     | 10/10 | 3 | ✅ 88% |
| `android-background-work` | 305    | █████████░ 92%     | 10/10 | 3 | ✅ 100% |
| `android-compose      ` | 450    | █████████░ 88%     | 10/10 | 3 | ✅ 100% |
| `android-concurrency  ` | 315    | █████████░ 91%     | 10/10 | 3 | ✅ 89% |
| `android-deployment   ` | 328    | █████████░ 91%     | 10/10 | 3 | ✅ 100% |
| `android-design-system` | 300    | █████████░ 92%     | 10/10 | 3 | ✅ 100% |
| `android-di           ` | 311    | █████████░ 91%     | 10/10 | 3 | ✅ 88% |
| `android-legacy-navigation` | 311    | █████████░ 91%     | 10/10 | 3 | ✅ 86% |
| `android-legacy-security` | 446    | █████████░ 88%     | 10/10 | 3 | ✅ 100% |
| `android-legacy-state ` | 258    | █████████░ 93%     | 10/10 | 3 | ✅ 100% |
| `android-navigation   ` | 277    | █████████░ 92%     | 10/10 | 3 | ✅ 100% |
| `android-navigation-type-safe` | 267    | █████████░ 93%     | 10/10 | 3 | ✅ 83% |
| `android-networking   ` | 415    | █████████░ 89%     | 10/10 | 3 | ⚠️ 67% |
| `android-notifications` | 436    | █████████░ 88%     | 10/10 | 3 | ✅ 100% |
| `android-performance  ` | 385    | █████████░ 89%     | 10/10 | 3 | ✅ 88% |
| `android-persistence  ` | 298    | █████████░ 92%     | 10/10 | 3 | ✅ 100% |
| `android-resources    ` | 412    | █████████░ 89%     | 10/10 | 3 | ✅ 100% |
| `android-security     ` | 398    | █████████░ 89%     | 10/10 | 3 | ✅ 86% |
| `android-state        ` | 363    | █████████░ 90%     | 10/10 | 3 | ✅ 88% |
| `android-testing      ` | 318    | █████████░ 91%     | 10/10 | 3 | ✅ 88% |
| `android-tooling      ` | 296    | █████████░ 92%     | 10/10 | 3 | ✅ 88% |
| `android-xml-views    ` | 297    | █████████░ 92%     | 10/10 | 3 | ✅ 88% |

</details>

<details>
<summary><h3>📦 angular (16 skills | avg 502 tokens | quality 9.9/10 | eval alignment 84%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `angular-architecture ` | 620    | ████████░░ 83%     | 10/10 | 6 | ✅ 95% |
| `angular-component-patterns` | 553    | █████████░ 85%     | 10/10 | 6 | ✅ 91% |
| `angular-components   ` | 568    | ████████░░ 84%     | 10/10 | 6 | ✅ 87% |
| `angular-dependency-injection` | 525    | █████████░ 86%     | 10/10 | 6 | ✅ 89% |
| `angular-directives-pipes` | 496    | █████████░ 86%     | 10/10 | 6 | ✅ 95% |
| `angular-forms        ` | 346    | █████████░ 91%     | 10/10 | 6 | ⚠️ 58% |
| `angular-http-client  ` | 560    | █████████░ 85%     | 10/10 | 6 | ✅ 96% |
| `angular-performance  ` | 476    | █████████░ 87%     | 10/10 | 6 | ✅ 82% |
| `angular-routing      ` | 381    | █████████░ 90%     | 10/10 | 6 | ⚠️ 43% |
| `angular-rxjs-interop ` | 507    | █████████░ 86%     | 10/10 | 6 | ✅ 100% |
| `angular-security     ` | 500    | █████████░ 86%     | 10/10 | 6 | ✅ 89% |
| `angular-ssr          ` | 473    | █████████░ 87%     | 10/10 | 6 | ✅ 90% |
| `angular-state-management` | 407    | █████████░ 89%     | 10/10 | 6 | ✅ 81% |
| `angular-style-guide  ` | 521    | █████████░ 86%     | 10/10 | 6 | ✅ 81% |
| `angular-testing      ` | 425    | █████████░ 88%     | 10/10 | 6 | ✅ 70% |
| `angular-tooling      ` | 675    | ████████░░ 82%     | 8/10 | 6 | ✅ 100% |

</details>

<details>
<summary><h3>📦 common (29 skills | avg 617 tokens | quality 9.8/10 | eval alignment 96%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `common-architecture-audit` | 623    | ████████░░ 83%     | 10/10 | 3 | ✅ 100% |
| `common-architecture-diagramming` | 453    | █████████░ 88%     | 10/10 | 3 | ✅ 100% |
| `common-best-practices` | 391    | █████████░ 89%     | 10/10 | 3 | ✅ 91% |
| `common-code-review   ` | 383    | █████████░ 90%     | 10/10 | 3 | ✅ 100% |
| `common-context-optimization` | 574    | ████████░░ 84%     | 10/10 | 3 | ✅ 100% |
| `common-debugging     ` | 396    | █████████░ 89%     | 10/10 | 3 | ✅ 100% |
| `common-documentation ` | 483    | █████████░ 87%     | 10/10 | 3 | ✅ 89% |
| `common-error-handling` | 395    | █████████░ 89%     | 10/10 | 3 | ✅ 78% |
| `common-feedback-reporter` | 635    | ████████░░ 83%     | 10/10 | 3 | ✅ 100% |
| `common-git-collaboration` | 507    | █████████░ 86%     | 10/10 | 3 | ✅ 100% |
| `common-mobile-animation` | 542    | █████████░ 85%     | 10/10 | 3 | ✅ 100% |
| `common-mobile-ux-core` | 369    | █████████░ 90%     | 10/10 | 3 | ✅ 100% |
| `common-observability ` | 380    | █████████░ 90%     | 10/10 | 3 | ✅ 100% |
| `common-performance-engineering` | 677    | ████████░░ 81%     | 10/10 | 3 | ✅ 78% |
| `common-product-requirements` | 431    | █████████░ 88%     | 10/10 | 3 | ✅ 100% |
| `common-protocol-enforcement` | 466    | █████████░ 87%     | 10/10 | 3 | ✅ 100% |
| `common-security-audit` | 740    | ████████░░ 80%     | 10/10 | 3 | ✅ 100% |
| `common-security-standards` | 709    | ████████░░ 81%     | 10/10 | 3 | ✅ 100% |
| `common-session-retrospective` | 581    | ████████░░ 84%     | 10/10 | 3 | ✅ 100% |
| `common-skill-creator ` | 1067   | ███████░░░ 71%     | 10/10 | 3 | ✅ 100% |
| `common-store-changelog` | 715    | ████████░░ 80%     | 10/10 | 4 | ⚠️ 43% |
| `common-system-design ` | 713    | ████████░░ 80%     | 10/10 | 3 | ✅ 100% |
| `common-tdd           ` | 868    | ████████░░ 76%     | 10/10 | 3 | ✅ 100% |
| `common-ui-design     ` | 784    | ████████░░ 79%     | 10/10 | 6 | ✅ 100% |
| `common-workflow-writing` | 563    | █████████░ 85%     | 10/10 | 3 | ✅ 100% |
| `common-llm-security  ` | 688    | ████████░░ 81%     | 9/10 | 5 | ✅ 100% |
| `common-owasp         ` | 901    | ████████░░ 75%     | 9/10 | 5 | ✅ 91% |
| `common-accessibility ` | 1009   | ███████░░░ 72%     | 8/10 | 3 | ✅ 100% |
| `common-api-design    ` | 844    | ████████░░ 77%     | 8/10 | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 dart (3 skills | avg 560 tokens | quality 10.0/10 | eval alignment 100%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `dart-best-practices  ` | 526    | █████████░ 86%     | 10/10 | 3 | ✅ 100% |
| `dart-language        ` | 637    | ████████░░ 83%     | 10/10 | 3 | ✅ 100% |
| `dart-tooling         ` | 518    | █████████░ 86%     | 10/10 | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 database (3 skills | avg 566 tokens | quality 10.0/10 | eval alignment 95%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `database-mongodb     ` | 624    | ████████░░ 83%     | 10/10 | 3 | ✅ 100% |
| `database-postgresql  ` | 471    | █████████░ 87%     | 10/10 | 3 | ✅ 86% |
| `database-redis       ` | 602    | ████████░░ 84%     | 10/10 | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 flutter (21 skills | avg 542 tokens | quality 9.5/10 | eval alignment 91%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `flutter-cicd         ` | 575    | ████████░░ 84%     | 10/10 | 3 | ✅ 100% |
| `flutter-design-system` | 525    | █████████░ 86%     | 10/10 | 3 | ✅ 100% |
| `flutter-error-handling` | 616    | ████████░░ 83%     | 10/10 | 3 | ✅ 100% |
| `flutter-feature-based-clean-architecture` | 713    | ████████░░ 80%     | 10/10 | 3 | ⚠️ 30% |
| `flutter-getx-navigation` | 382    | █████████░ 90%     | 10/10 | 3 | ✅ 100% |
| `flutter-idiomatic-flutter` | 370    | █████████░ 90%     | 10/10 | 3 | ✅ 100% |
| `flutter-layer-based-clean-architecture` | 677    | ████████░░ 81%     | 10/10 | 3 | ✅ 100% |
| `flutter-performance  ` | 466    | █████████░ 87%     | 10/10 | 3 | ✅ 100% |
| `flutter-retrofit-networking` | 565    | █████████░ 85%     | 10/10 | 3 | ⚠️ 67% |
| `flutter-riverpod-state-management` | 557    | █████████░ 85%     | 10/10 | 3 | ⚠️ 50% |
| `flutter-testing      ` | 750    | ████████░░ 79%     | 10/10 | 3 | ✅ 100% |
| `flutter-widgets      ` | 499    | █████████░ 86%     | 10/10 | 3 | ✅ 100% |
| `flutter-auto-route-navigation` | 511    | █████████░ 86%     | 9/10 | 3 | ✅ 100% |
| `flutter-bloc-state-management` | 666    | ████████░░ 82%     | 9/10 | 3 | ✅ 100% |
| `flutter-dependency-injection` | 526    | █████████░ 86%     | 9/10 | 3 | ✅ 80% |
| `flutter-localization ` | 500    | █████████░ 86%     | 9/10 | 3 | ✅ 100% |
| `flutter-navigation   ` | 400    | █████████░ 89%     | 9/10 | 3 | ✅ 100% |
| `flutter-notifications` | 415    | █████████░ 89%     | 9/10 | 3 | ✅ 100% |
| `flutter-security     ` | 502    | █████████░ 86%     | 9/10 | 3 | ✅ 75% |
| `flutter-getx-state-management` | 506    | █████████░ 86%     | 8/10 | 3 | ✅ 100% |
| `flutter-go-router-navigation` | 655    | ████████░░ 82%     | 8/10 | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 golang (11 skills | avg 449 tokens | quality 9.9/10 | eval alignment 93%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `golang-api-server    ` | 445    | █████████░ 88%     | 10/10 | 3 | ✅ 80% |
| `golang-architecture  ` | 500    | █████████░ 86%     | 10/10 | 3 | ✅ 100% |
| `golang-concurrency   ` | 427    | █████████░ 88%     | 10/10 | 3 | ⚠️ 67% |
| `golang-configuration ` | 434    | █████████░ 88%     | 10/10 | 3 | ✅ 100% |
| `golang-database      ` | 448    | █████████░ 88%     | 10/10 | 3 | ✅ 71% |
| `golang-error-handling` | 345    | █████████░ 91%     | 10/10 | 3 | ✅ 100% |
| `golang-language      ` | 499    | █████████░ 86%     | 10/10 | 3 | ✅ 100% |
| `golang-logging       ` | 390    | █████████░ 89%     | 10/10 | 3 | ✅ 100% |
| `golang-security      ` | 511    | █████████░ 86%     | 10/10 | 3 | ✅ 100% |
| `golang-testing       ` | 418    | █████████░ 89%     | 10/10 | 3 | ✅ 100% |
| `golang-tooling       ` | 518    | █████████░ 86%     | 9/10 | 4 | ✅ 100% |

</details>

<details>
<summary><h3>📦 ios (15 skills | avg 368 tokens | quality 10.0/10 | eval alignment 87%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `ios-app-lifecycle    ` | 345    | █████████░ 91%     | 10/10 | 3 | ✅ 89% |
| `ios-architecture     ` | 663    | ████████░░ 82%     | 10/10 | 3 | ✅ 100% |
| `ios-dependency-injection` | 307    | █████████░ 92%     | 10/10 | 3 | ✅ 89% |
| `ios-deployment       ` | 337    | █████████░ 91%     | 10/10 | 3 | ✅ 89% |
| `ios-design-system    ` | 240    | █████████░ 93%     | 10/10 | 3 | ✅ 100% |
| `ios-localization     ` | 372    | █████████░ 90%     | 10/10 | 3 | ✅ 78% |
| `ios-navigation       ` | 295    | █████████░ 92%     | 10/10 | 3 | ✅ 100% |
| `ios-networking       ` | 371    | █████████░ 90%     | 10/10 | 3 | ⚠️ 56% |
| `ios-notifications    ` | 310    | █████████░ 92%     | 10/10 | 3 | ✅ 100% |
| `ios-performance      ` | 363    | █████████░ 90%     | 10/10 | 3 | ✅ 100% |
| `ios-persistence      ` | 343    | █████████░ 91%     | 10/10 | 3 | ⚠️ 67% |
| `ios-security         ` | 379    | █████████░ 90%     | 10/10 | 3 | ✅ 100% |
| `ios-state-management ` | 350    | █████████░ 90%     | 10/10 | 3 | ⚠️ 56% |
| `ios-swiftui          ` | 429    | █████████░ 88%     | 10/10 | 3 | ✅ 88% |
| `ios-ui-navigation    ` | 417    | █████████░ 89%     | 10/10 | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 java (5 skills | avg 494 tokens | quality 10.0/10 | eval alignment 98%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `java-best-practices  ` | 479    | █████████░ 87%     | 10/10 | 3 | ✅ 89% |
| `java-concurrency     ` | 448    | █████████░ 88%     | 10/10 | 3 | ✅ 100% |
| `java-language        ` | 535    | █████████░ 85%     | 10/10 | 3 | ✅ 100% |
| `java-testing         ` | 534    | █████████░ 85%     | 10/10 | 3 | ✅ 100% |
| `java-tooling         ` | 473    | █████████░ 87%     | 10/10 | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 javascript (3 skills | avg 419 tokens | quality 10.0/10 | eval alignment 100%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `javascript-best-practices` | 403    | █████████░ 89%     | 10/10 | 3 | ✅ 100% |
| `javascript-language  ` | 511    | █████████░ 86%     | 10/10 | 3 | ✅ 100% |
| `javascript-tooling   ` | 342    | █████████░ 91%     | 10/10 | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 kotlin (4 skills | avg 410 tokens | quality 10.0/10 | eval alignment 95%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `kotlin-best-practices` | 466    | █████████░ 87%     | 10/10 | 3 | ✅ 100% |
| `kotlin-coroutines    ` | 384    | █████████░ 89%     | 10/10 | 3 | ✅ 89% |
| `kotlin-language      ` | 445    | █████████░ 88%     | 10/10 | 3 | ✅ 100% |
| `kotlin-tooling       ` | 346    | █████████░ 91%     | 10/10 | 3 | ✅ 89% |

</details>

<details>
<summary><h3>📦 laravel (10 skills | avg 650 tokens | quality 10.0/10 | eval alignment 82%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `laravel-api          ` | 707    | ████████░░ 81%     | 10/10 | 6 | ✅ 88% |
| `laravel-architecture ` | 395    | █████████░ 89%     | 10/10 | 6 | ⚠️ 17% |
| `laravel-background-processing` | 621    | ████████░░ 83%     | 10/10 | 6 | ✅ 91% |
| `laravel-clean-architecture` | 662    | ████████░░ 82%     | 10/10 | 6 | ✅ 76% |
| `laravel-database-expert` | 703    | ████████░░ 81%     | 10/10 | 6 | ✅ 84% |
| `laravel-eloquent     ` | 623    | ████████░░ 83%     | 10/10 | 6 | ✅ 85% |
| `laravel-security     ` | 727    | ████████░░ 80%     | 10/10 | 6 | ✅ 95% |
| `laravel-sessions-middleware` | 675    | ████████░░ 82%     | 10/10 | 6 | ✅ 90% |
| `laravel-testing      ` | 708    | ████████░░ 81%     | 10/10 | 6 | ✅ 95% |
| `laravel-tooling      ` | 675    | ████████░░ 82%     | 10/10 | 6 | ✅ 100% |

</details>

<details>
<summary><h3>📦 nestjs (21 skills | avg 632 tokens | quality 9.9/10 | eval alignment 98%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `nestjs-api-standards ` | 628    | ████████░░ 83%     | 10/10 | 3 | ✅ 100% |
| `nestjs-architecture  ` | 551    | █████████░ 85%     | 10/10 | 3 | ✅ 100% |
| `nestjs-bullmq        ` | 900    | ████████░░ 75%     | 10/10 | 3 | ✅ 100% |
| `nestjs-caching       ` | 616    | ████████░░ 83%     | 10/10 | 3 | ✅ 100% |
| `nestjs-configuration ` | 611    | ████████░░ 83%     | 10/10 | 3 | ✅ 83% |
| `nestjs-database      ` | 681    | ████████░░ 81%     | 10/10 | 3 | ✅ 100% |
| `nestjs-deployment    ` | 717    | ████████░░ 80%     | 10/10 | 3 | ✅ 100% |
| `nestjs-documentation ` | 542    | █████████░ 85%     | 10/10 | 3 | ✅ 83% |
| `nestjs-error-handling` | 587    | ████████░░ 84%     | 10/10 | 3 | ✅ 100% |
| `nestjs-file-uploads  ` | 431    | █████████░ 88%     | 10/10 | 3 | ✅ 100% |
| `nestjs-notification  ` | 511    | █████████░ 86%     | 10/10 | 3 | ✅ 100% |
| `nestjs-observability ` | 463    | █████████░ 87%     | 10/10 | 3 | ✅ 100% |
| `nestjs-performance   ` | 974    | ███████░░░ 73%     | 10/10 | 3 | ✅ 100% |
| `nestjs-real-time     ` | 905    | ████████░░ 75%     | 10/10 | 3 | ✅ 100% |
| `nestjs-scheduling    ` | 577    | ████████░░ 84%     | 10/10 | 3 | ✅ 100% |
| `nestjs-search        ` | 533    | █████████░ 85%     | 10/10 | 3 | ✅ 100% |
| `nestjs-security      ` | 759    | ████████░░ 79%     | 10/10 | 3 | ✅ 100% |
| `nestjs-security-isolation` | 536    | █████████░ 85%     | 10/10 | 3 | ✅ 100% |
| `nestjs-testing       ` | 556    | █████████░ 85%     | 10/10 | 3 | ✅ 100% |
| `nestjs-transport     ` | 451    | █████████░ 88%     | 10/10 | 3 | ✅ 100% |
| `nestjs-controllers-services` | 747    | ████████░░ 80%     | 8/10 | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 nextjs (18 skills | avg 642 tokens | quality 9.6/10 | eval alignment 85%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `nextjs-app-router    ` | 987    | ███████░░░ 73%     | 10/10 | 6 | ✅ 100% |
| `nextjs-architecture  ` | 1065   | ███████░░░ 71%     | 10/10 | 6 | ✅ 93% |
| `nextjs-authentication` | 492    | █████████░ 87%     | 10/10 | 6 | ⚠️ 61% |
| `nextjs-caching       ` | 813    | ████████░░ 78%     | 10/10 | 6 | ✅ 100% |
| `nextjs-data-access-layer` | 523    | █████████░ 86%     | 10/10 | 6 | ✅ 88% |
| `nextjs-data-fetching ` | 467    | █████████░ 87%     | 10/10 | 6 | ✅ 100% |
| `nextjs-optimization  ` | 512    | █████████░ 86%     | 10/10 | 6 | ✅ 87% |
| `nextjs-rendering     ` | 736    | ████████░░ 80%     | 10/10 | 6 | ✅ 100% |
| `nextjs-server-actions` | 735    | ████████░░ 80%     | 10/10 | 6 | ✅ 85% |
| `nextjs-server-components` | 635    | ████████░░ 83%     | 10/10 | 6 | ✅ 78% |
| `nextjs-upgrade       ` | 559    | █████████░ 85%     | 10/10 | 6 | ⚠️ 64% |
| `nextjs-i18n          ` | 594    | ████████░░ 84%     | 9/10 | 6 | ✅ 100% |
| `nextjs-pages-router  ` | 654    | ████████░░ 82%     | 9/10 | 6 | ✅ 100% |
| `nextjs-security      ` | 678    | ████████░░ 81%     | 9/10 | 6 | ✅ 100% |
| `nextjs-state-management` | 442    | █████████░ 88%     | 9/10 | 6 | ⚠️ 0% |
| `nextjs-styling       ` | 654    | ████████░░ 82%     | 9/10 | 6 | ✅ 100% |
| `nextjs-testing       ` | 622    | ████████░░ 83%     | 9/10 | 6 | ✅ 100% |
| `nextjs-tooling       ` | 392    | █████████░ 89%     | 9/10 | 6 | ✅ 73% |

</details>

<details>
<summary><h3>📦 php (7 skills | avg 513 tokens | quality 9.6/10 | eval alignment 83%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `php-best-practices   ` | 522    | █████████░ 86%     | 10/10 | 6 | ✅ 92% |
| `php-security         ` | 538    | █████████░ 85%     | 10/10 | 6 | ✅ 100% |
| `php-testing          ` | 533    | █████████░ 85%     | 10/10 | 6 | ⚠️ 13% |
| `php-tooling          ` | 546    | █████████░ 85%     | 10/10 | 6 | ✅ 86% |
| `php-concurrency      ` | 525    | █████████░ 86%     | 9/10 | 6 | ✅ 100% |
| `php-error-handling   ` | 472    | █████████░ 87%     | 9/10 | 6 | ✅ 100% |
| `php-language         ` | 456    | █████████░ 88%     | 9/10 | 6 | ✅ 91% |

</details>

<details>
<summary><h3>📦 quality-engineering (4 skills | avg 692 tokens | quality 10.0/10 | eval alignment 99%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `quality-engineering-business-analysis` | 1042   | ███████░░░ 71%     | 10/10 | 6 | ✅ 95% |
| `quality-engineering-jira-integration` | 562    | █████████░ 85%     | 10/10 | 3 | ✅ 100% |
| `quality-engineering-quality-assurance` | 467    | █████████░ 87%     | 10/10 | 3 | ✅ 100% |
| `quality-engineering-zephyr-test-generation` | 696    | ████████░░ 81%     | 10/10 | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 react (8 skills | avg 535 tokens | quality 10.0/10 | eval alignment 95%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `react-component-patterns` | 475    | █████████░ 87%     | 10/10 | 3 | ✅ 100% |
| `react-hooks          ` | 634    | ████████░░ 83%     | 10/10 | 3 | ✅ 100% |
| `react-performance    ` | 734    | ████████░░ 80%     | 10/10 | 3 | ✅ 100% |
| `react-security       ` | 508    | █████████░ 86%     | 10/10 | 3 | ✅ 100% |
| `react-state-management` | 532    | █████████░ 85%     | 10/10 | 3 | ✅ 100% |
| `react-testing        ` | 530    | █████████░ 86%     | 10/10 | 3 | ✅ 100% |
| `react-tooling        ` | 419    | █████████░ 89%     | 10/10 | 3 | ⚠️ 57% |
| `react-typescript     ` | 447    | █████████░ 88%     | 10/10 | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 react-native (13 skills | avg 431 tokens | quality 10.0/10 | eval alignment 97%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `react-native-architecture` | 553    | █████████░ 85%     | 10/10 | 3 | ✅ 83% |
| `react-native-components` | 377    | █████████░ 90%     | 10/10 | 3 | ✅ 100% |
| `react-native-deployment` | 526    | █████████░ 86%     | 10/10 | 3 | ✅ 100% |
| `react-native-dls     ` | 257    | █████████░ 93%     | 10/10 | 3 | ✅ 100% |
| `react-native-navigation` | 339    | █████████░ 91%     | 10/10 | 3 | ✅ 100% |
| `react-native-navigation-v6` | 499    | █████████░ 86%     | 10/10 | 3 | ✅ 86% |
| `react-native-notifications` | 357    | █████████░ 90%     | 10/10 | 3 | ✅ 100% |
| `react-native-performance` | 566    | █████████░ 85%     | 10/10 | 3 | ✅ 89% |
| `react-native-platform-specific` | 397    | █████████░ 89%     | 10/10 | 3 | ✅ 100% |
| `react-native-security` | 566    | █████████░ 85%     | 10/10 | 3 | ✅ 100% |
| `react-native-state-management` | 425    | █████████░ 88%     | 10/10 | 3 | ✅ 100% |
| `react-native-styling ` | 317    | █████████░ 91%     | 10/10 | 3 | ✅ 100% |
| `react-native-testing ` | 427    | █████████░ 88%     | 10/10 | 3 | ✅ 100% |

</details>

<details>
<summary><h3>📦 spring-boot (10 skills | avg 466 tokens | quality 10.0/10 | eval alignment 95%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `spring-boot-api-design` | 320    | █████████░ 91%     | 10/10 | 3 | ✅ 100% |
| `spring-boot-architecture` | 621    | ████████░░ 83%     | 10/10 | 3 | ✅ 100% |
| `spring-boot-best-practices` | 564    | █████████░ 85%     | 10/10 | 3 | ✅ 100% |
| `spring-boot-data-access` | 514    | █████████░ 86%     | 10/10 | 3 | ✅ 100% |
| `spring-boot-deployment` | 498    | █████████░ 86%     | 10/10 | 3 | ✅ 100% |
| `spring-boot-microservices` | 484    | █████████░ 87%     | 10/10 | 3 | ⚠️ 67% |
| `spring-boot-observability` | 483    | █████████░ 87%     | 10/10 | 3 | ✅ 100% |
| `spring-boot-scheduling` | 343    | █████████░ 91%     | 10/10 | 3 | ✅ 100% |
| `spring-boot-security ` | 513    | █████████░ 86%     | 10/10 | 3 | ✅ 100% |
| `spring-boot-testing  ` | 319    | █████████░ 91%     | 10/10 | 3 | ✅ 83% |

</details>

<details>
<summary><h3>📦 swift (8 skills | avg 479 tokens | quality 10.0/10 | eval alignment 92%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `swift-best-practices ` | 659    | ████████░░ 82%     | 10/10 | 4 | ✅ 92% |
| `swift-concurrency    ` | 521    | █████████░ 86%     | 10/10 | 5 | ✅ 93% |
| `swift-error-handling ` | 513    | █████████░ 86%     | 10/10 | 4 | ⚠️ 67% |
| `swift-language       ` | 465    | █████████░ 87%     | 10/10 | 5 | ✅ 94% |
| `swift-memory-management` | 381    | █████████░ 90%     | 10/10 | 4 | ✅ 89% |
| `swift-swiftui        ` | 427    | █████████░ 88%     | 10/10 | 4 | ✅ 100% |
| `swift-testing        ` | 451    | █████████░ 88%     | 10/10 | 4 | ✅ 100% |
| `swift-tooling        ` | 414    | █████████░ 89%     | 10/10 | 4 | ✅ 100% |

</details>

<details>
<summary><h3>📦 typescript (4 skills | avg 663 tokens | quality 9.5/10 | eval alignment 98%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `typescript-best-practices` | 594    | ████████░░ 84%     | 10/10 | 3 | ✅ 90% |
| `typescript-language  ` | 650    | ████████░░ 82%     | 10/10 | 4 | ✅ 100% |
| `typescript-security  ` | 608    | ████████░░ 83%     | 10/10 | 3 | ✅ 100% |
| `typescript-tooling   ` | 799    | ████████░░ 78%     | 8/10 | 3 | ✅ 100% |

</details>

## ⚠️ Low Eval Alignment — Skills to Review

> These skills have evals but SKILL.md content does not cover ≥70% of what the evals test. The skill may not actually improve agent behavior for its target scenarios.

| Skill                   | Category | Alignment | Evals | Action |
| ----------------------- | -------- | --------- | ----- | ------ |
| `nextjs-state-management` | nextjs   | ⚠️ 0% | 6 | Add missing terms from eval assertions to SKILL.md |
| `php-testing          ` | php      | ⚠️ 13% | 6 | Add missing terms from eval assertions to SKILL.md |
| `laravel-architecture ` | laravel  | ⚠️ 17% | 6 | Add missing terms from eval assertions to SKILL.md |
| `flutter-feature-based-clean-architecture` | flutter  | ⚠️ 30% | 3 | Add missing terms from eval assertions to SKILL.md |
| `angular-routing      ` | angular  | ⚠️ 43% | 6 | Add missing terms from eval assertions to SKILL.md |
| `common-store-changelog` | common   | ⚠️ 43% | 4 | Add missing terms from eval assertions to SKILL.md |
| `flutter-riverpod-state-management` | flutter  | ⚠️ 50% | 3 | Add missing terms from eval assertions to SKILL.md |
| `ios-networking       ` | ios      | ⚠️ 56% | 3 | Add missing terms from eval assertions to SKILL.md |
| `ios-state-management ` | ios      | ⚠️ 56% | 3 | Add missing terms from eval assertions to SKILL.md |
| `react-tooling        ` | react    | ⚠️ 57% | 3 | Add missing terms from eval assertions to SKILL.md |
| `angular-forms        ` | angular  | ⚠️ 58% | 6 | Add missing terms from eval assertions to SKILL.md |
| `nextjs-authentication` | nextjs   | ⚠️ 61% | 6 | Add missing terms from eval assertions to SKILL.md |
| `nextjs-upgrade       ` | nextjs   | ⚠️ 64% | 6 | Add missing terms from eval assertions to SKILL.md |
| `android-networking   ` | android  | ⚠️ 67% | 3 | Add missing terms from eval assertions to SKILL.md |
| `flutter-retrofit-networking` | flutter  | ⚠️ 67% | 3 | Add missing terms from eval assertions to SKILL.md |

## 🏆 Quality Leaders

| Rank | Skill                   | Category | Quality | Tokens | Evals | Aligned |
| ---- | ----------------------- | -------- | ------- | ------ | ----- | ------- |
| 1    | `android-architecture ` | android  | 10/10 | 505 | 3 | ✅ 88% |
| 2    | `android-background-work` | android  | 10/10 | 305 | 3 | ✅ 100% |
| 3    | `android-compose      ` | android  | 10/10 | 450 | 3 | ✅ 100% |
| 4    | `android-concurrency  ` | android  | 10/10 | 315 | 3 | ✅ 89% |
| 5    | `android-deployment   ` | android  | 10/10 | 328 | 3 | ✅ 100% |
| 6    | `android-design-system` | android  | 10/10 | 300 | 3 | ✅ 100% |
| 7    | `android-di           ` | android  | 10/10 | 311 | 3 | ✅ 88% |
| 8    | `android-legacy-navigation` | android  | 10/10 | 311 | 3 | ✅ 86% |
| 9    | `android-legacy-security` | android  | 10/10 | 446 | 3 | ✅ 100% |
| 10   | `android-legacy-state ` | android  | 10/10 | 258 | 3 | ✅ 100% |

## 📐 Methodology & Baseline Justification

### Why These Baselines?

The baselines are derived from **real, token-counted example prompts** that represent what a developer actually writes when there is no structured skill available.

Using NestJS as the **Reference Unit**: Because we measure instruction volume replaced, using a high-density reference ensures scientific consistency across all tech stacks.

#### 🟡 Reference Technical Prompt — Light — 1449 tokens

> **Reference Technical Prompt — Light (e.g., NestJS)**
> A compact inline system prompt used as a reference for token count calibration. Representative of focused developer instructions without a structured skill.

#### 🔴 Reference Technical Prompt — Heavy — 3656 tokens

> **Reference Technical Prompt — Heavy (e.g., NestJS Architecture)**
> A comprehensive architect-level inline prompt used as a reference for complex tasks. Includes deep patterns and rules sent by developers when no skill is present.

### 🏆 Detailed Quality Rubric (0–10)

To ensure skills are not just "short" but actually **high quality**, every skill is scored against this structural rubric:

| Score  | Criteria                  | Rationale                                              |
| ------ | ------------------------- | ------------------------------------------------------ |
| **+2** | **Structured Guidelines** | At least 3 specific instructions/bullet points.                    |
| **+2** | **Anti-Patterns**         | `## Anti-Patterns` section or `**No X**` inline lines.            |
| **+2** | **Reference Examples**    | Presence of a verified `references/` folder with code.             |
| **+2** | **Token Optimality**      | Entire `SKILL.md` is ≤100 lines (forces brevity).                  |
| **+2** | **Eval Coverage**         | ≥3 evals with `should_not_trigger`, ≥2 assertions each. +1 partial.|

> **Eval Alignment** (reported separately, not scored): % of eval `contains` assertion values that appear in SKILL.md content. Measures whether the skill actually teaches what its evals test — the closest static proxy for **with-skill vs without-skill** behavioral improvement.

### 🛡️ How to Verify This Report

Trust but verify. You can audit the raw data and run the benchmark yourself:

1. **Clone the repo** and install dependencies (`pnpm install`).
2. **Inspect Source**: The benchmark logic is open in [cli/src/scripts/benchmark/](./cli/src/scripts/benchmark/).

### Pricing (per 1M input tokens, Feb 2026)

- **Gemini 3 Flash**: $0.50
- **GPT-5**: $1.25
- **Gemini 3.1 Pro**: $2.00
- **Claude Sonnet 4.5**: $3.00
