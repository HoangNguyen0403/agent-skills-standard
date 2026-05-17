# 📊 Agent Skill Benchmark Report

> Generated: 2026-05-17T15:15:33.588Z
> Token counting: `ceil(characters / 4)` — cl100k_base approximation.
> Baselines: derived from **real, measured example prompts** (see Methodology).
> Quality: structural rubric (0–10), no live LLM calls required.

## ❓ How to Read This Report

This benchmark answers: **"How many tokens and dollars does an agent skill save compared to a developer writing the same guidance inline?"**

**WITHOUT a skill**: A developer writes domain knowledge directly into the prompt every time (Baseline).
**WITH a skill**: The agent loads the SKILL.md file (~400 tokens) — structured, reusable, cached.

**Eval Alignment**: % of eval assertion values that appear in SKILL.md. High alignment means the skill actually teaches what the evals test — the static proxy for "with skill > without skill" behavioral improvement.

## 🔢 Executive Summary

| Metric                            | Value                                         |
| --------------------------------- | --------------------------------------------- |
| Total Skills Benchmarked          | **247**                                       |
| Avg. Tokens WITH Skill (SKILL.md) | **540 tokens**                                |
| Baseline: Light prompt (no skill) | **1449 tokens** ↓ see Methodology             |
| Baseline: Heavy prompt (no skill) | **3656 tokens** ↓ see Methodology             |
| Avg. Token Savings vs Light       | **63%** (909 tokens/call)                     |
| Avg. Token Savings vs Heavy       | **85%** (3116 tokens/call)                    |
| Avg. Quality Score                | **9.9/10**                                    |
| Skills with Evals                 | **247 / 247**                                 |
| Avg. Eval Alignment               | **95%** (eval assertions covered by SKILL.md) |

## 📜 History

| Version | Date       | Skills | Avg Tokens | Savings (%) | Quality | Report                                       |
| ------- | ---------- | ------ | ---------- | ----------- | ------- | -------------------------------------------- |
| v2.4.0  | 2026-05-17 | 247    | 540        | 85%         | 9.9/10  | [Full Report](benchmarks/archive/v2.4.0.md)  |
| v2.3.0  | 2026-05-13 | 246    | 540        | 85%         | 9.9/10  | [Full Report](benchmarks/archive/v2.3.0.md)  |
| v2.2.2  | 2026-05-09 | 249    | 539        | 85%         | 9.9/10  | [Full Report](benchmarks/archive/v2.2.2.md)  |
| v2.2.0  | 2026-04-22 | 242    | 538        | 85%         | 9.9/10  | [Full Report](benchmarks/archive/v2.2.0.md)  |
| v2.1.2  | 2026-04-11 | 237    | 516        | 86%         | 10/10   | [Full Report](benchmarks/archive/v2.1.2.md)  |
| v2.1.1  | 2026-04-11 | 237    | 516        | 86%         | 9.9/10  | [Full Report](benchmarks/archive/v2.1.1.md)  |
| v2.1.0  | 2026-04-04 | 237    | 526        | 86%         | 9.9/10  | [Full Report](benchmarks/archive/v2.1.0.md)  |
| v2.0.1  | 2026-03-30 | 238    | 527        | 86%         | 9.8/10  | [Full Report](benchmarks/archive/v2.0.1.md)  |
| v2.0.0  | 2026-03-25 | 235    | 523        | 86%         | 9.9/10  | [Full Report](benchmarks/archive/v2.0.0.md)  |
| v1.10.3 | 2026-03-21 | 234    | 505        | 86%         | 9.8/10  | [Full Report](benchmarks/archive/v1.10.3.md) |
| v1.10.1 | 2026-03-16 | 229    | 428        | 88%         | 9.9/10  | [Full Report](benchmarks/archive/v1.10.1.md) |
| v1.10.0 | 2026-03-16 | 229    | 434        | 88%         | 7/10    | [Full Report](benchmarks/archive/v1.10.0.md) |
| v1.9.3  | 2026-03-15 | 229    | 460        | 87%         | 8.9/10  | [Full Report](benchmarks/archive/v1.9.3.md)  |
| v1.9.2  | 2026-03-07 | 228    | 458        | 87%         | 8.9/10  | [Full Report](benchmarks/archive/v1.9.2.md)  |
| v1.9.1  | 2026-03-07 | 228    | 458        | 87%         | 8.9/10  | [Full Report](benchmarks/archive/v1.9.1.md)  |
| v1.9.0  | 2026-03-05 | 228    | 457        | 88%         | 8.9/10  | [Full Report](benchmarks/archive/v1.9.0.md)  |
| v1.8.0  | 2026-03-02 | 228    | 443        | 88%         | 8.9/10  | [Full Report](benchmarks/archive/v1.8.0.md)  |
| v1.7.3  | 2026-02-25 | 222    | 418        | 89%         | 8.9/10  | [Full Report](benchmarks/archive/v1.7.3.md)  |
| v1.7.2  | 2026-02-25 | 220    | 413        | 89%         | 8.9/10  | [Full Report](benchmarks/archive/v1.7.2.md)  |

### 💰 Cost Comparison — Per Single Call (Average Skill)

> Comparison based on **Heavy Baseline** vs. modern and speculative models.

| Model             | Original Cost | Skill Cost | Net Savings     | % Saved |
| ----------------- | ------------- | ---------- | --------------- | ------- |
| Gemini 3 Flash    | $0.0018280    | $0.0002700 | **$0.0015580 ** | 85%     |
| GPT-5             | $0.0045700    | $0.0006750 | **$0.0038950 ** | 85%     |
| Gemini 3.1 Pro    | $0.0073120    | $0.0010800 | **$0.0062320 ** | 85%     |
| Claude Sonnet 4.5 | $0.0109680    | $0.0016200 | **$0.0093480 ** | 85%     |

### 📈 Monthly Savings at Scale — (Avg Skill vs Heavy Prompt)

| Daily Calls | Original Cost/mo | Monthly Savings (1 skill) | Monthly Savings (50 skills) | Model             |
| ----------- | ---------------- | ------------------------- | --------------------------- | ----------------- |
| 1,000       | $137.1000 /mo    | $116.8500 /mo             | $5842.5000 /mo              | GPT-5             |
| 1,000       | $329.0400 /mo    | $280.4400 /mo             | $14022.0000 /mo             | Claude Sonnet 4.5 |
| 1,000       | $219.3600 /mo    | $186.9600 /mo             | $9348.0000 /mo              | Gemini 3.1 Pro    |

## 📦 Per-Category Summary

<details>
<summary><h3>📦 android (26 skills | avg 422 tokens | quality 9.9/10 | eval alignment 94%)</h3></summary>

| Skill                          | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ------------------------------ | ------ | ------------------ | ------- | ----- | ------- |
| `android-architecture `        | 579    | ████████░░ 84%     | 10/10   | 3     | ✅ 88%  |
| `android-background-work`      | 320    | █████████░ 91%     | 10/10   | 3     | ✅ 100% |
| `android-compose      `        | 511    | █████████░ 86%     | 10/10   | 3     | ✅ 100% |
| `android-compose-migration`    | 766    | ████████░░ 79%     | 10/10   | 3     | ✅ 100% |
| `android-concurrency  `        | 356    | █████████░ 90%     | 10/10   | 3     | ✅ 100% |
| `android-deployment   `        | 336    | █████████░ 91%     | 10/10   | 3     | ✅ 100% |
| `android-design-system`        | 273    | █████████░ 93%     | 10/10   | 3     | ✅ 100% |
| `android-di           `        | 331    | █████████░ 91%     | 10/10   | 3     | ✅ 88%  |
| `android-edge-to-edge `        | 768    | ████████░░ 79%     | 10/10   | 3     | ✅ 100% |
| `android-legacy-navigation`    | 325    | █████████░ 91%     | 10/10   | 3     | ✅ 86%  |
| `android-legacy-security`      | 462    | █████████░ 87%     | 10/10   | 3     | ✅ 100% |
| `android-legacy-state `        | 277    | █████████░ 92%     | 10/10   | 3     | ✅ 100% |
| `android-navigation   `        | 278    | █████████░ 92%     | 10/10   | 3     | ✅ 100% |
| `android-navigation-3 `        | 685    | ████████░░ 81%     | 10/10   | 3     | ✅ 100% |
| `android-navigation-type-safe` | 288    | █████████░ 92%     | 10/10   | 3     | ✅ 83%  |
| `android-networking   `        | 429    | █████████░ 88%     | 10/10   | 3     | ✅ 83%  |
| `android-notifications`        | 438    | █████████░ 88%     | 10/10   | 3     | ✅ 100% |
| `android-performance  `        | 399    | █████████░ 89%     | 10/10   | 3     | ✅ 88%  |
| `android-persistence  `        | 315    | █████████░ 91%     | 10/10   | 3     | ✅ 100% |
| `android-resources    `        | 427    | █████████░ 88%     | 10/10   | 3     | ✅ 100% |
| `android-security     `        | 405    | █████████░ 89%     | 10/10   | 3     | ✅ 86%  |
| `android-state        `        | 434    | █████████░ 88%     | 10/10   | 3     | ✅ 88%  |
| `android-testing      `        | 320    | █████████░ 91%     | 10/10   | 3     | ✅ 88%  |
| `android-tooling      `        | 300    | █████████░ 92%     | 10/10   | 3     | ✅ 88%  |
| `android-xml-views    `        | 319    | █████████░ 91%     | 10/10   | 3     | ✅ 88%  |
| `android-agp-upgrade  `        | 641    | ████████░░ 82%     | 8/10    | 3     | ✅ 100% |

</details>

<details>
<summary><h3>📦 angular (15 skills | avg 513 tokens | quality 10.0/10 | eval alignment 90%)</h3></summary>

| Skill                          | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ------------------------------ | ------ | ------------------ | ------- | ----- | ------- |
| `angular-architecture `        | 631    | ████████░░ 83%     | 10/10   | 6     | ✅ 95%  |
| `angular-components   `        | 622    | ████████░░ 83%     | 10/10   | 9     | ✅ 82%  |
| `angular-dependency-injection` | 533    | █████████░ 85%     | 10/10   | 6     | ✅ 89%  |
| `angular-directives-pipes`     | 504    | █████████░ 86%     | 10/10   | 6     | ✅ 91%  |
| `angular-forms        `        | 358    | █████████░ 90%     | 10/10   | 6     | ✅ 100% |
| `angular-http-client  `        | 576    | ████████░░ 84%     | 10/10   | 6     | ✅ 92%  |
| `angular-performance  `        | 487    | █████████░ 87%     | 10/10   | 6     | ✅ 82%  |
| `angular-routing      `        | 396    | █████████░ 89%     | 10/10   | 6     | ✅ 100% |
| `angular-rxjs-interop `        | 512    | █████████░ 86%     | 10/10   | 6     | ✅ 95%  |
| `angular-security     `        | 508    | █████████░ 86%     | 10/10   | 6     | ✅ 78%  |
| `angular-ssr          `        | 491    | █████████░ 87%     | 10/10   | 6     | ✅ 90%  |
| `angular-state-management`     | 420    | █████████░ 89%     | 10/10   | 6     | ✅ 81%  |
| `angular-style-guide  `        | 506    | █████████░ 86%     | 10/10   | 6     | ✅ 86%  |
| `angular-testing      `        | 477    | █████████░ 87%     | 10/10   | 6     | ✅ 83%  |
| `angular-tooling      `        | 676    | ████████░░ 82%     | 10/10   | 6     | ✅ 100% |

</details>

<details>
<summary><h3>📦 common (34 skills | avg 621 tokens | quality 9.9/10 | eval alignment 96%)</h3></summary>

| Skill                             | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| --------------------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `common-accessibility `           | 997    | ███████░░░ 73%     | 10/10   | 3     | ✅ 83%  |
| `common-api-design    `           | 840    | ████████░░ 77%     | 10/10   | 3     | ✅ 100% |
| `common-architecture-audit`       | 644    | ████████░░ 82%     | 10/10   | 3     | ✅ 100% |
| `common-architecture-diagramming` | 472    | █████████░ 87%     | 10/10   | 3     | ✅ 100% |
| `common-best-practices`           | 416    | █████████░ 89%     | 10/10   | 3     | ✅ 100% |
| `common-code-review   `           | 357    | █████████░ 90%     | 10/10   | 3     | ✅ 83%  |
| `common-context-optimization`     | 572    | ████████░░ 84%     | 10/10   | 3     | ✅ 100% |
| `common-dast-tooling  `           | 595    | ████████░░ 84%     | 10/10   | 3     | ✅ 100% |
| `common-debugging     `           | 365    | █████████░ 90%     | 10/10   | 3     | ✅ 83%  |
| `common-documentation `           | 360    | █████████░ 90%     | 10/10   | 3     | ✅ 100% |
| `common-error-handling`           | 422    | █████████░ 88%     | 10/10   | 3     | ✅ 83%  |
| `common-feedback-reporter`        | 880    | ████████░░ 76%     | 10/10   | 4     | ✅ 100% |
| `common-git-collaboration`        | 517    | █████████░ 86%     | 10/10   | 3     | ✅ 100% |
| `common-learning-log  `           | 596    | ████████░░ 84%     | 10/10   | 3     | ✅ 83%  |
| `common-llm-security  `           | 698    | ████████░░ 81%     | 10/10   | 3     | ✅ 100% |
| `common-mobile-animation`         | 546    | █████████░ 85%     | 10/10   | 3     | ✅ 100% |
| `common-mobile-ux-core`           | 398    | █████████░ 89%     | 10/10   | 3     | ✅ 100% |
| `common-observability `           | 408    | █████████░ 89%     | 10/10   | 3     | ✅ 100% |
| `common-owasp         `           | 912    | ████████░░ 75%     | 10/10   | 3     | ✅ 100% |
| `common-performance-engineering`  | 707    | ████████░░ 81%     | 10/10   | 3     | ✅ 100% |
| `common-product-requirements`     | 439    | █████████░ 88%     | 10/10   | 3     | ✅ 83%  |
| `common-protocol-enforcement`     | 415    | █████████░ 89%     | 10/10   | 3     | ✅ 100% |
| `common-security-audit`           | 938    | ███████░░░ 74%     | 10/10   | 3     | ✅ 83%  |
| `common-security-standards`       | 732    | ████████░░ 80%     | 10/10   | 3     | ✅ 83%  |
| `common-session-retrospective`    | 680    | ████████░░ 81%     | 10/10   | 3     | ✅ 100% |
| `common-skill-creator `           | 1354   | ██████░░░░ 63%     | 10/10   | 3     | ✅ 100% |
| `common-store-changelog`          | 699    | ████████░░ 81%     | 10/10   | 4     | ✅ 100% |
| `common-system-design `           | 726    | ████████░░ 80%     | 10/10   | 3     | ✅ 100% |
| `common-tdd           `           | 661    | ████████░░ 82%     | 10/10   | 3     | ✅ 100% |
| `common-ui-design     `           | 794    | ████████░░ 78%     | 10/10   | 3     | ✅ 100% |
| `common-workflow-writing`         | 568    | ████████░░ 84%     | 10/10   | 3     | ✅ 100% |
| `common-mobile-visual-testing`    | 548    | █████████░ 85%     | 9/10    | 2     | ✅ 100% |
| `common-telemetry     `           | 334    | █████████░ 91%     | 9/10    | 2     | ✅ 100% |
| `common-web-visual-testing`       | 530    | █████████░ 86%     | 9/10    | 2     | ✅ 100% |

</details>

<details>
<summary><h3>📦 dart (3 skills | avg 571 tokens | quality 9.3/10 | eval alignment 95%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `dart-best-practices  ` | 504    | █████████░ 86%     | 10/10   | 3     | ✅ 100% |
| `dart-tooling         ` | 508    | █████████░ 86%     | 10/10   | 3     | ✅ 86%  |
| `dart-language        ` | 700    | ████████░░ 81%     | 8/10    | 3     | ✅ 100% |

</details>

<details>
<summary><h3>📦 database (3 skills | avg 573 tokens | quality 10.0/10 | eval alignment 95%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `database-mongodb     ` | 637    | ████████░░ 83%     | 10/10   | 3     | ✅ 100% |
| `database-postgresql  ` | 469    | █████████░ 87%     | 10/10   | 3     | ✅ 86%  |
| `database-redis       ` | 614    | ████████░░ 83%     | 10/10   | 3     | ✅ 100% |

</details>

<details>
<summary><h3>📦 flutter (22 skills | avg 531 tokens | quality 9.6/10 | eval alignment 95%)</h3></summary>

| Skill                                      | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ------------------------------------------ | ------ | ------------------ | ------- | ----- | ------- |
| `flutter-cicd         `                    | 533    | █████████░ 85%     | 10/10   | 3     | ✅ 89%  |
| `flutter-concurrency  `                    | 630    | ████████░░ 83%     | 10/10   | 3     | ✅ 86%  |
| `flutter-design-system`                    | 532    | █████████░ 85%     | 10/10   | 3     | ✅ 100% |
| `flutter-error-handling`                   | 591    | ████████░░ 84%     | 10/10   | 3     | ✅ 100% |
| `flutter-feature-based-clean-architecture` | 584    | ████████░░ 84%     | 10/10   | 3     | ✅ 88%  |
| `flutter-getx-navigation`                  | 343    | █████████░ 91%     | 10/10   | 3     | ✅ 86%  |
| `flutter-getx-state-management`            | 454    | █████████░ 88%     | 10/10   | 3     | ✅ 86%  |
| `flutter-go-router-navigation`             | 562    | █████████░ 85%     | 10/10   | 3     | ✅ 89%  |
| `flutter-idiomatic-flutter`                | 411    | █████████░ 89%     | 10/10   | 3     | ✅ 89%  |
| `flutter-layer-based-clean-architecture`   | 642    | ████████░░ 82%     | 10/10   | 3     | ✅ 100% |
| `flutter-performance  `                    | 446    | █████████░ 88%     | 10/10   | 3     | ✅ 100% |
| `flutter-retrofit-networking`              | 561    | █████████░ 85%     | 10/10   | 3     | ✅ 100% |
| `flutter-riverpod-state-management`        | 539    | █████████░ 85%     | 10/10   | 3     | ✅ 100% |
| `flutter-widgets      `                    | 521    | █████████░ 86%     | 10/10   | 3     | ✅ 100% |
| `flutter-auto-route-navigation`            | 510    | █████████░ 86%     | 9/10    | 3     | ✅ 100% |
| `flutter-bloc-state-management`            | 687    | ████████░░ 81%     | 9/10    | 3     | ✅ 100% |
| `flutter-dependency-injection`             | 514    | █████████░ 86%     | 9/10    | 3     | ✅ 80%  |
| `flutter-localization `                    | 505    | █████████░ 86%     | 9/10    | 3     | ✅ 100% |
| `flutter-navigation   `                    | 406    | █████████░ 89%     | 9/10    | 3     | ✅ 100% |
| `flutter-notifications`                    | 409    | █████████░ 89%     | 9/10    | 3     | ✅ 100% |
| `flutter-security     `                    | 458    | █████████░ 87%     | 9/10    | 3     | ✅ 100% |
| `flutter-testing      `                    | 846    | ████████░░ 77%     | 8/10    | 3     | ✅ 100% |

</details>

<details>
<summary><h3>📦 golang (11 skills | avg 465 tokens | quality 10.0/10 | eval alignment 95%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `golang-api-server    ` | 462    | █████████░ 87%     | 10/10   | 3     | ✅ 100% |
| `golang-architecture  ` | 522    | █████████░ 86%     | 10/10   | 3     | ✅ 100% |
| `golang-concurrency   ` | 440    | █████████░ 88%     | 10/10   | 3     | ✅ 100% |
| `golang-configuration ` | 447    | █████████░ 88%     | 10/10   | 3     | ✅ 100% |
| `golang-database      ` | 466    | █████████░ 87%     | 10/10   | 3     | ✅ 100% |
| `golang-error-handling` | 358    | █████████░ 90%     | 10/10   | 3     | ✅ 83%  |
| `golang-language      ` | 515    | █████████░ 86%     | 10/10   | 3     | ✅ 100% |
| `golang-logging       ` | 406    | █████████░ 89%     | 10/10   | 3     | ✅ 83%  |
| `golang-security      ` | 528    | █████████░ 86%     | 10/10   | 3     | ✅ 100% |
| `golang-testing       ` | 433    | █████████░ 88%     | 10/10   | 3     | ✅ 83%  |
| `golang-tooling       ` | 533    | █████████░ 85%     | 10/10   | 3     | ✅ 100% |

</details>

<details>
<summary><h3>📦 ios (15 skills | avg 386 tokens | quality 10.0/10 | eval alignment 96%)</h3></summary>

| Skill                      | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| -------------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `ios-app-lifecycle    `    | 358    | █████████░ 90%     | 10/10   | 3     | ✅ 89%  |
| `ios-architecture     `    | 665    | ████████░░ 82%     | 10/10   | 3     | ✅ 100% |
| `ios-dependency-injection` | 330    | █████████░ 91%     | 10/10   | 3     | ✅ 89%  |
| `ios-deployment       `    | 352    | █████████░ 90%     | 10/10   | 3     | ✅ 89%  |
| `ios-design-system    `    | 259    | █████████░ 93%     | 10/10   | 3     | ✅ 100% |
| `ios-localization     `    | 387    | █████████░ 89%     | 10/10   | 3     | ✅ 89%  |
| `ios-navigation       `    | 300    | █████████░ 92%     | 10/10   | 3     | ✅ 100% |
| `ios-networking       `    | 390    | █████████░ 89%     | 10/10   | 3     | ✅ 100% |
| `ios-notifications    `    | 309    | █████████░ 92%     | 10/10   | 3     | ✅ 100% |
| `ios-performance      `    | 412    | █████████░ 89%     | 10/10   | 3     | ✅ 100% |
| `ios-persistence      `    | 364    | █████████░ 90%     | 10/10   | 3     | ✅ 100% |
| `ios-security         `    | 441    | █████████░ 88%     | 10/10   | 3     | ✅ 100% |
| `ios-state-management `    | 368    | █████████░ 90%     | 10/10   | 3     | ✅ 100% |
| `ios-swiftui          `    | 416    | █████████░ 89%     | 10/10   | 3     | ✅ 88%  |
| `ios-ui-navigation    `    | 435    | █████████░ 88%     | 10/10   | 3     | ✅ 100% |

</details>

<details>
<summary><h3>📦 java (5 skills | avg 497 tokens | quality 10.0/10 | eval alignment 98%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `java-best-practices  ` | 482    | █████████░ 87%     | 10/10   | 3     | ✅ 89%  |
| `java-concurrency     ` | 450    | █████████░ 88%     | 10/10   | 3     | ✅ 100% |
| `java-language        ` | 540    | █████████░ 85%     | 10/10   | 3     | ✅ 100% |
| `java-testing         ` | 538    | █████████░ 85%     | 10/10   | 3     | ✅ 100% |
| `java-tooling         ` | 473    | █████████░ 87%     | 10/10   | 3     | ✅ 100% |

</details>

<details>
<summary><h3>📦 javascript (3 skills | avg 370 tokens | quality 10.0/10 | eval alignment 93%)</h3></summary>

| Skill                       | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| --------------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `javascript-best-practices` | 301    | █████████░ 92%     | 10/10   | 3     | ✅ 89%  |
| `javascript-language  `     | 457    | █████████░ 88%     | 10/10   | 3     | ✅ 90%  |
| `javascript-tooling   `     | 351    | █████████░ 90%     | 10/10   | 3     | ✅ 100% |

</details>

<details>
<summary><h3>📦 kotlin (4 skills | avg 421 tokens | quality 10.0/10 | eval alignment 95%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `kotlin-best-practices` | 471    | █████████░ 87%     | 10/10   | 3     | ✅ 100% |
| `kotlin-coroutines    ` | 407    | █████████░ 89%     | 10/10   | 3     | ✅ 89%  |
| `kotlin-language      ` | 455    | █████████░ 88%     | 10/10   | 3     | ✅ 100% |
| `kotlin-tooling       ` | 352    | █████████░ 90%     | 10/10   | 3     | ✅ 89%  |

</details>

<details>
<summary><h3>📦 laravel (10 skills | avg 665 tokens | quality 10.0/10 | eval alignment 90%)</h3></summary>

| Skill                           | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ------------------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `laravel-api          `         | 720    | ████████░░ 80%     | 10/10   | 6     | ✅ 88%  |
| `laravel-architecture `         | 410    | █████████░ 89%     | 10/10   | 6     | ✅ 100% |
| `laravel-background-processing` | 637    | ████████░░ 83%     | 10/10   | 6     | ✅ 91%  |
| `laravel-clean-architecture`    | 676    | ████████░░ 82%     | 10/10   | 6     | ✅ 76%  |
| `laravel-database-expert`       | 718    | ████████░░ 80%     | 10/10   | 6     | ✅ 84%  |
| `laravel-eloquent     `         | 638    | ████████░░ 83%     | 10/10   | 6     | ✅ 85%  |
| `laravel-security     `         | 742    | ████████░░ 80%     | 10/10   | 6     | ✅ 95%  |
| `laravel-sessions-middleware`   | 692    | ████████░░ 81%     | 10/10   | 6     | ✅ 90%  |
| `laravel-testing      `         | 724    | ████████░░ 80%     | 10/10   | 6     | ✅ 95%  |
| `laravel-tooling      `         | 691    | ████████░░ 81%     | 10/10   | 6     | ✅ 100% |

</details>

<details>
<summary><h3>📦 nestjs (21 skills | avg 627 tokens | quality 9.8/10 | eval alignment 98%)</h3></summary>

| Skill                         | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `nestjs-api-standards `       | 606    | ████████░░ 83%     | 10/10   | 3     | ✅ 100% |
| `nestjs-architecture  `       | 559    | █████████░ 85%     | 10/10   | 3     | ✅ 100% |
| `nestjs-bullmq        `       | 927    | ████████░░ 75%     | 10/10   | 3     | ✅ 100% |
| `nestjs-caching       `       | 603    | ████████░░ 84%     | 10/10   | 3     | ✅ 100% |
| `nestjs-controllers-services` | 724    | ████████░░ 80%     | 10/10   | 3     | ✅ 100% |
| `nestjs-database      `       | 666    | ████████░░ 82%     | 10/10   | 3     | ✅ 100% |
| `nestjs-deployment    `       | 694    | ████████░░ 81%     | 10/10   | 3     | ✅ 100% |
| `nestjs-documentation `       | 543    | █████████░ 85%     | 10/10   | 3     | ✅ 83%  |
| `nestjs-file-uploads  `       | 411    | █████████░ 89%     | 10/10   | 3     | ✅ 100% |
| `nestjs-notification  `       | 520    | █████████░ 86%     | 10/10   | 3     | ✅ 100% |
| `nestjs-observability `       | 457    | █████████░ 88%     | 10/10   | 3     | ✅ 100% |
| `nestjs-performance   `       | 962    | ███████░░░ 74%     | 10/10   | 3     | ✅ 100% |
| `nestjs-real-time     `       | 895    | ████████░░ 76%     | 10/10   | 3     | ✅ 100% |
| `nestjs-scheduling    `       | 563    | █████████░ 85%     | 10/10   | 3     | ✅ 100% |
| `nestjs-search        `       | 516    | █████████░ 86%     | 10/10   | 3     | ✅ 100% |
| `nestjs-security      `       | 778    | ████████░░ 79%     | 10/10   | 3     | ✅ 100% |
| `nestjs-security-isolation`   | 546    | █████████░ 85%     | 10/10   | 3     | ✅ 100% |
| `nestjs-testing       `       | 572    | ████████░░ 84%     | 10/10   | 3     | ✅ 100% |
| `nestjs-transport     `       | 446    | █████████░ 88%     | 10/10   | 3     | ✅ 100% |
| `nestjs-configuration `       | 596    | ████████░░ 84%     | 8/10    | 3     | ✅ 83%  |
| `nestjs-error-handling`       | 581    | ████████░░ 84%     | 8/10    | 3     | ✅ 100% |

</details>

<details>
<summary><h3>📦 nextjs (18 skills | avg 657 tokens | quality 9.9/10 | eval alignment 98%)</h3></summary>

| Skill                      | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| -------------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `nextjs-app-router    `    | 993    | ███████░░░ 73%     | 10/10   | 3     | ✅ 100% |
| `nextjs-architecture  `    | 1040   | ███████░░░ 72%     | 10/10   | 3     | ✅ 100% |
| `nextjs-authentication`    | 508    | █████████░ 86%     | 10/10   | 3     | ✅ 100% |
| `nextjs-caching       `    | 802    | ████████░░ 78%     | 10/10   | 3     | ✅ 100% |
| `nextjs-data-access-layer` | 538    | █████████░ 85%     | 10/10   | 3     | ✅ 100% |
| `nextjs-data-fetching `    | 465    | █████████░ 87%     | 10/10   | 6     | ✅ 100% |
| `nextjs-i18n          `    | 610    | ████████░░ 83%     | 10/10   | 3     | ✅ 100% |
| `nextjs-optimization  `    | 533    | █████████░ 85%     | 10/10   | 3     | ✅ 100% |
| `nextjs-rendering     `    | 748    | ████████░░ 80%     | 10/10   | 3     | ✅ 100% |
| `nextjs-security      `    | 688    | ████████░░ 81%     | 10/10   | 3     | ✅ 100% |
| `nextjs-server-actions`    | 738    | ████████░░ 80%     | 10/10   | 6     | ✅ 85%  |
| `nextjs-server-components` | 624    | ████████░░ 83%     | 10/10   | 6     | ✅ 89%  |
| `nextjs-state-management`  | 603    | ████████░░ 84%     | 10/10   | 3     | ✅ 100% |
| `nextjs-styling       `    | 642    | ████████░░ 82%     | 10/10   | 3     | ✅ 83%  |
| `nextjs-testing       `    | 648    | ████████░░ 82%     | 10/10   | 3     | ✅ 100% |
| `nextjs-tooling       `    | 410    | █████████░ 89%     | 10/10   | 3     | ✅ 100% |
| `nextjs-upgrade       `    | 565    | █████████░ 85%     | 10/10   | 3     | ✅ 100% |
| `nextjs-pages-router  `    | 664    | ████████░░ 82%     | 9/10    | 6     | ✅ 100% |

</details>

<details>
<summary><h3>📦 php (7 skills | avg 529 tokens | quality 9.6/10 | eval alignment 93%)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ----------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `php-best-practices   ` | 534    | █████████░ 85%     | 10/10   | 6     | ✅ 92%  |
| `php-security         ` | 585    | ████████░░ 84%     | 10/10   | 6     | ✅ 100% |
| `php-testing          ` | 549    | █████████░ 85%     | 10/10   | 6     | ✅ 83%  |
| `php-tooling          ` | 542    | █████████░ 85%     | 10/10   | 6     | ✅ 86%  |
| `php-concurrency      ` | 536    | █████████░ 85%     | 9/10    | 6     | ✅ 100% |
| `php-error-handling   ` | 488    | █████████░ 87%     | 9/10    | 6     | ✅ 100% |
| `php-language         ` | 472    | █████████░ 87%     | 9/10    | 6     | ✅ 91%  |

</details>

<details>
<summary><h3>📦 quality-engineering (7 skills | avg 748 tokens | quality 9.7/10 | eval alignment 91%)</h3></summary>

| Skill                                          | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ---------------------------------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `quality-engineering-business-analysis`        | 1048   | ███████░░░ 71%     | 10/10   | 6     | ✅ 95%  |
| `quality-engineering-jira-integration`         | 570    | ████████░░ 84%     | 10/10   | 3     | ✅ 100% |
| `quality-engineering-quality-assurance`        | 509    | █████████░ 86%     | 10/10   | 3     | ✅ 100% |
| `quality-engineering-zephyr-coverage-analysis` | 517    | █████████░ 86%     | 10/10   | 4     | ✅ 80%  |
| `quality-engineering-zephyr-test-generation`   | 1216   | ███████░░░ 67%     | 10/10   | 3     | ✅ 100% |
| `quality-engineering-appium-mcp`               | 709    | ████████░░ 81%     | 9/10    | 2     | ✅ 80%  |
| `quality-engineering-playwright-cli`           | 667    | ████████░░ 82%     | 9/10    | 2     | ✅ 80%  |

</details>

<details>
<summary><h3>📦 react (8 skills | avg 548 tokens | quality 10.0/10 | eval alignment 96%)</h3></summary>

| Skill                      | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| -------------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `react-component-patterns` | 477    | █████████░ 87%     | 10/10   | 3     | ✅ 100% |
| `react-hooks          `    | 646    | ████████░░ 82%     | 10/10   | 3     | ✅ 100% |
| `react-performance    `    | 733    | ████████░░ 80%     | 10/10   | 3     | ✅ 100% |
| `react-security       `    | 545    | █████████░ 85%     | 10/10   | 3     | ✅ 83%  |
| `react-state-management`   | 541    | █████████░ 85%     | 10/10   | 3     | ✅ 100% |
| `react-testing        `    | 534    | █████████░ 85%     | 10/10   | 3     | ✅ 83%  |
| `react-tooling        `    | 420    | █████████░ 89%     | 10/10   | 3     | ✅ 100% |
| `react-typescript     `    | 487    | █████████░ 87%     | 10/10   | 3     | ✅ 100% |

</details>

<details>
<summary><h3>📦 react-native (13 skills | avg 446 tokens | quality 10.0/10 | eval alignment 97%)</h3></summary>

| Skill                            | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| -------------------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `react-native-architecture`      | 556    | █████████░ 85%     | 10/10   | 3     | ✅ 83%  |
| `react-native-components`        | 381    | █████████░ 90%     | 10/10   | 3     | ✅ 100% |
| `react-native-deployment`        | 546    | █████████░ 85%     | 10/10   | 3     | ✅ 100% |
| `react-native-dls     `          | 278    | █████████░ 92%     | 10/10   | 3     | ✅ 100% |
| `react-native-navigation`        | 345    | █████████░ 91%     | 10/10   | 3     | ✅ 100% |
| `react-native-navigation-v6`     | 517    | █████████░ 86%     | 10/10   | 3     | ✅ 86%  |
| `react-native-notifications`     | 358    | █████████░ 90%     | 10/10   | 3     | ✅ 100% |
| `react-native-performance`       | 583    | ████████░░ 84%     | 10/10   | 3     | ✅ 89%  |
| `react-native-platform-specific` | 422    | █████████░ 88%     | 10/10   | 3     | ✅ 100% |
| `react-native-security`          | 583    | ████████░░ 84%     | 10/10   | 3     | ✅ 100% |
| `react-native-state-management`  | 443    | █████████░ 88%     | 10/10   | 3     | ✅ 100% |
| `react-native-styling `          | 335    | █████████░ 91%     | 10/10   | 3     | ✅ 100% |
| `react-native-testing `          | 448    | █████████░ 88%     | 10/10   | 3     | ✅ 100% |

</details>

<details>
<summary><h3>📦 spring-boot (10 skills | avg 481 tokens | quality 10.0/10 | eval alignment 98%)</h3></summary>

| Skill                        | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ---------------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `spring-boot-api-design`     | 334    | █████████░ 91%     | 10/10   | 3     | ✅ 100% |
| `spring-boot-architecture`   | 643    | ████████░░ 82%     | 10/10   | 3     | ✅ 100% |
| `spring-boot-best-practices` | 581    | ████████░░ 84%     | 10/10   | 3     | ✅ 100% |
| `spring-boot-data-access`    | 528    | █████████░ 86%     | 10/10   | 3     | ✅ 100% |
| `spring-boot-deployment`     | 512    | █████████░ 86%     | 10/10   | 3     | ✅ 100% |
| `spring-boot-microservices`  | 499    | █████████░ 86%     | 10/10   | 3     | ✅ 100% |
| `spring-boot-observability`  | 498    | █████████░ 86%     | 10/10   | 3     | ✅ 100% |
| `spring-boot-scheduling`     | 356    | █████████░ 90%     | 10/10   | 3     | ✅ 100% |
| `spring-boot-security `      | 527    | █████████░ 86%     | 10/10   | 3     | ✅ 100% |
| `spring-boot-testing  `      | 332    | █████████░ 91%     | 10/10   | 3     | ✅ 83%  |

</details>

<details>
<summary><h3>📦 swift (8 skills | avg 493 tokens | quality 10.0/10 | eval alignment 96%)</h3></summary>

| Skill                     | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| ------------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `swift-best-practices `   | 702    | ████████░░ 81%     | 10/10   | 4     | ✅ 92%  |
| `swift-concurrency    `   | 534    | █████████░ 85%     | 10/10   | 5     | ✅ 93%  |
| `swift-error-handling `   | 518    | █████████░ 86%     | 10/10   | 4     | ✅ 100% |
| `swift-language       `   | 475    | █████████░ 87%     | 10/10   | 5     | ✅ 94%  |
| `swift-memory-management` | 390    | █████████░ 89%     | 10/10   | 4     | ✅ 100% |
| `swift-swiftui        `   | 438    | █████████░ 88%     | 10/10   | 4     | ✅ 88%  |
| `swift-testing        `   | 462    | █████████░ 87%     | 10/10   | 4     | ✅ 100% |
| `swift-tooling        `   | 427    | █████████░ 88%     | 10/10   | 4     | ✅ 100% |

</details>

<details>
<summary><h3>📦 typescript (4 skills | avg 686 tokens | quality 10.0/10 | eval alignment 100%)</h3></summary>

| Skill                       | Tokens | Savings (vs Heavy) | Quality | Evals | Aligned |
| --------------------------- | ------ | ------------------ | ------- | ----- | ------- |
| `typescript-best-practices` | 614    | ████████░░ 83%     | 10/10   | 3     | ✅ 100% |
| `typescript-language  `     | 673    | ████████░░ 82%     | 10/10   | 3     | ✅ 100% |
| `typescript-security  `     | 768    | ████████░░ 79%     | 10/10   | 5     | ✅ 100% |
| `typescript-tooling   `     | 689    | ████████░░ 81%     | 10/10   | 3     | ✅ 100% |

</details>

## 🏆 Quality Leaders

| Rank | Skill                       | Category | Quality | Tokens | Evals | Aligned |
| ---- | --------------------------- | -------- | ------- | ------ | ----- | ------- |
| 1    | `android-architecture `     | android  | 10/10   | 579    | 3     | ✅ 88%  |
| 2    | `android-background-work`   | android  | 10/10   | 320    | 3     | ✅ 100% |
| 3    | `android-compose      `     | android  | 10/10   | 511    | 3     | ✅ 100% |
| 4    | `android-compose-migration` | android  | 10/10   | 766    | 3     | ✅ 100% |
| 5    | `android-concurrency  `     | android  | 10/10   | 356    | 3     | ✅ 100% |
| 6    | `android-deployment   `     | android  | 10/10   | 336    | 3     | ✅ 100% |
| 7    | `android-design-system`     | android  | 10/10   | 273    | 3     | ✅ 100% |
| 8    | `android-di           `     | android  | 10/10   | 331    | 3     | ✅ 88%  |
| 9    | `android-edge-to-edge `     | android  | 10/10   | 768    | 3     | ✅ 100% |
| 10   | `android-legacy-navigation` | android  | 10/10   | 325    | 3     | ✅ 86%  |

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

| Score  | Criteria                  | Rationale                                                           |
| ------ | ------------------------- | ------------------------------------------------------------------- |
| **+2** | **Structured Guidelines** | At least 3 specific instructions/bullet points.                     |
| **+2** | **Anti-Patterns**         | `## Anti-Patterns` section or `**No X**` inline lines.              |
| **+2** | **Reference Examples**    | Presence of a verified `references/` folder with code.              |
| **+2** | **Token Optimality**      | Entire `SKILL.md` is ≤100 lines (forces brevity).                   |
| **+2** | **Eval Coverage**         | ≥3 evals with `should_not_trigger`, ≥2 assertions each. +1 partial. |

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
