# 📊 Agent Skill Benchmark Report

> Generated: 2026-03-16T06:44:38.306Z
> Token counting: `ceil(characters / 4)` — cl100k_base approximation.
> Baselines: derived from **real, measured example prompts** (see Methodology).
> Quality: structural rubric (0–10), no live LLM calls required.

## ❓ How to Read This Report

This benchmark answers: **"How many tokens and dollars does an agent skill save compared to a developer writing the same guidance inline?"**

**WITHOUT a skill**: A developer writes domain knowledge directly into the prompt every time (Baseline).
**WITH a skill**: The agent loads the SKILL.md file (~400 tokens) — structured, reusable, cached.

## 🔢 Executive Summary

| Metric                            | Value                             |
| --------------------------------- | --------------------------------- |
| Total Skills Benchmarked          | **229**                           |
| Avg. Tokens WITH Skill (SKILL.md) | **434 tokens**                    |
| Baseline: Light prompt (no skill) | **1449 tokens** ↓ see Methodology |
| Baseline: Heavy prompt (no skill) | **3656 tokens** ↓ see Methodology |
| Avg. Token Savings vs Light       | **70%** (1015 tokens/call)        |
| Avg. Token Savings vs Heavy       | **88%** (3222 tokens/call)        |
| Avg. Quality Score                | **7/10**                          |

## 📜 History

| Version | Date       | Skills | Avg Tokens | Savings (%) | Quality | Report                                       |
| ------- | ---------- | ------ | ---------- | ----------- | ------- | -------------------------------------------- |
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

| Model             | Original Cost | Skill Cost | Net Savings    | % Saved |
| ----------------- | ------------- | ---------- | -------------- | ------- |
| Gemini 3 Flash    | $0.0018280    | $0.0002170 | **$0.0016110** | 88%     |
| GPT-5             | $0.0045700    | $0.0005425 | **$0.0040275** | 88%     |
| Gemini 3.1 Pro    | $0.0073120    | $0.0008680 | **$0.0064440** | 88%     |
| Claude Sonnet 4.5 | $0.0109680    | $0.0013020 | **$0.0096660** | 88%     |

### 📈 Monthly Savings at Scale — (Avg Skill vs Heavy Prompt)

| Daily Calls | Original Cost/mo | Monthly Savings (1 skill) | Monthly Savings (50 skills) | Model             |
| ----------- | ---------------- | ------------------------- | --------------------------- | ----------------- |
| 1,000       | $137.1000 /mo    | $120.8250 /mo             | $6041.2500 /mo              | GPT-5             |
| 1,000       | $329.0400 /mo    | $289.9800 /mo             | $14499.0000 /mo             | Claude Sonnet 4.5 |
| 1,000       | $219.3600 /mo    | $193.3200 /mo             | $9666.0000 /mo              | Gemini 3.1 Pro    |

## 📦 Per-Category Summary

<details>
<summary><h3>📦 android (22 skills | avg 290 tokens | quality 7.9/10)</h3></summary>

| Skill                          | Tokens | Savings (vs Heavy) | Quality |
| ------------------------------ | ------ | ------------------ | ------- |
| `android-architecture`         | 420    | █████████░ 89%     | 8/10    |
| `android-background-work`      | 239    | █████████░ 93%     | 8/10    |
| `android-compose`              | 334    | █████████░ 91%     | 8/10    |
| `android-concurrency`          | 259    | █████████░ 93%     | 8/10    |
| `android-deployment`           | 286    | █████████░ 92%     | 8/10    |
| `android-di`                   | 278    | █████████░ 92%     | 8/10    |
| `android-legacy-navigation`    | 248    | █████████░ 93%     | 8/10    |
| `android-legacy-security`      | 283    | █████████░ 92%     | 8/10    |
| `android-legacy-state`         | 250    | █████████░ 93%     | 8/10    |
| `android-navigation`           | 291    | █████████░ 92%     | 8/10    |
| `android-navigation-type-safe` | 256    | █████████░ 93%     | 8/10    |
| `android-networking`           | 303    | █████████░ 92%     | 8/10    |
| `android-notifications`        | 310    | █████████░ 92%     | 8/10    |
| `android-performance`          | 291    | █████████░ 92%     | 8/10    |
| `android-persistence`          | 257    | █████████░ 93%     | 8/10    |
| `android-resources`            | 241    | █████████░ 93%     | 8/10    |
| `android-security`             | 332    | █████████░ 91%     | 8/10    |
| `android-state`                | 287    | █████████░ 92%     | 8/10    |
| `android-testing`              | 253    | █████████░ 93%     | 8/10    |
| `android-tooling`              | 245    | █████████░ 93%     | 8/10    |
| `android-xml-views`            | 286    | █████████░ 92%     | 8/10    |
| `android-design-system`        | 426    | █████████░ 88%     | 6/10    |

</details>

<details>
<summary><h3>📦 angular (15 skills | avg 284 tokens | quality 6.8/10)</h3></summary>

| Skill                          | Tokens | Savings (vs Heavy) | Quality |
| ------------------------------ | ------ | ------------------ | ------- |
| `angular-components`           | 344    | █████████░ 91%     | 8/10    |
| `angular-dependency-injection` | 293    | █████████░ 92%     | 8/10    |
| `angular-performance`          | 294    | █████████░ 92%     | 8/10    |
| `angular-routing`              | 285    | █████████░ 92%     | 8/10    |
| `angular-state-management`     | 292    | █████████░ 92%     | 8/10    |
| `angular-style-guide`          | 344    | █████████░ 91%     | 8/10    |
| `angular-architecture`         | 447    | █████████░ 88%     | 6/10    |
| `angular-component-patterns`   | 310    | █████████░ 92%     | 6/10    |
| `angular-directives-pipes`     | 224    | █████████░ 94%     | 6/10    |
| `angular-forms`                | 222    | █████████░ 94%     | 6/10    |
| `angular-http-client`          | 239    | █████████░ 93%     | 6/10    |
| `angular-rxjs-interop`         | 257    | █████████░ 93%     | 6/10    |
| `angular-security`             | 254    | █████████░ 93%     | 6/10    |
| `angular-ssr`                  | 229    | █████████░ 94%     | 6/10    |
| `angular-testing`              | 226    | █████████░ 94%     | 6/10    |

</details>

<details>
<summary><h3>📦 common (25 skills | avg 618 tokens | quality 6.3/10)</h3></summary>

| Skill                             | Tokens | Savings (vs Heavy) | Quality |
| --------------------------------- | ------ | ------------------ | ------- |
| `common-architecture-diagramming` | 398    | █████████░ 89%     | 8/10    |
| `common-code-review`              | 384    | █████████░ 89%     | 8/10    |
| `common-feedback-reporter`        | 455    | █████████░ 88%     | 8/10    |
| `common-mobile-animation`         | 365    | █████████░ 90%     | 8/10    |
| `common-product-requirements`     | 430    | █████████░ 88%     | 8/10    |
| `common-session-retrospective`    | 642    | ████████░░ 82%     | 8/10    |
| `common-accessibility`            | 986    | ███████░░░ 73%     | 6/10    |
| `common-api-design`               | 819    | ████████░░ 78%     | 6/10    |
| `common-architecture-audit`       | 666    | ████████░░ 82%     | 6/10    |
| `common-best-practices`           | 935    | ███████░░░ 74%     | 6/10    |
| `common-context-optimization`     | 437    | █████████░ 88%     | 6/10    |
| `common-debugging`                | 396    | █████████░ 89%     | 6/10    |
| `common-error-handling`           | 967    | ███████░░░ 74%     | 6/10    |
| `common-git-collaboration`        | 641    | ████████░░ 82%     | 6/10    |
| `common-mobile-ux-core`           | 342    | █████████░ 91%     | 6/10    |
| `common-observability`            | 889    | ████████░░ 76%     | 6/10    |
| `common-protocol-enforcement`     | 415    | █████████░ 89%     | 6/10    |
| `common-security-audit`           | 766    | ████████░░ 79%     | 6/10    |
| `common-security-standards`       | 586    | ████████░░ 84%     | 6/10    |
| `common-skill-creator`            | 883    | ████████░░ 76%     | 6/10    |
| `common-system-design`            | 498    | █████████░ 86%     | 6/10    |
| `common-tdd`                      | 802    | ████████░░ 78%     | 6/10    |
| `common-workflow-writing`         | 563    | █████████░ 85%     | 6/10    |
| `common-documentation`            | 530    | █████████░ 86%     | 4/10    |
| `common-performance-engineering`  | 652    | ████████░░ 82%     | 4/10    |

</details>

<details>
<summary><h3>📦 dart (3 skills | avg 438 tokens | quality 4.7/10)</h3></summary>

| Skill                 | Tokens | Savings (vs Heavy) | Quality |
| --------------------- | ------ | ------------------ | ------- |
| `dart-language`       | 593    | ████████░░ 84%     | 6/10    |
| `dart-best-practices` | 352    | █████████░ 90%     | 4/10    |
| `dart-tooling`        | 369    | █████████░ 90%     | 4/10    |

</details>

<details>
<summary><h3>📦 database (3 skills | avg 714 tokens | quality 7.3/10)</h3></summary>

| Skill                 | Tokens | Savings (vs Heavy) | Quality |
| --------------------- | ------ | ------------------ | ------- |
| `database-mongodb`    | 587    | ████████░░ 84%     | 8/10    |
| `database-redis`      | 608    | ████████░░ 83%     | 8/10    |
| `database-postgresql` | 948    | ███████░░░ 74%     | 6/10    |

</details>

<details>
<summary><h3>📦 flutter (21 skills | avg 437 tokens | quality 6.5/10)</h3></summary>

| Skill                                      | Tokens | Savings (vs Heavy) | Quality |
| ------------------------------------------ | ------ | ------------------ | ------- |
| `flutter-bloc-state-management`            | 416    | █████████░ 89%     | 8/10    |
| `flutter-design-system`                    | 524    | █████████░ 86%     | 8/10    |
| `flutter-getx-navigation`                  | 382    | █████████░ 90%     | 8/10    |
| `flutter-layer-based-clean-architecture`   | 509    | █████████░ 86%     | 8/10    |
| `flutter-localization`                     | 494    | █████████░ 86%     | 8/10    |
| `flutter-navigation`                       | 318    | █████████░ 91%     | 8/10    |
| `flutter-notifications`                    | 342    | █████████░ 91%     | 8/10    |
| `flutter-retrofit-networking`              | 513    | █████████░ 86%     | 8/10    |
| `flutter-testing`                          | 873    | ████████░░ 76%     | 8/10    |
| `flutter-auto-route-navigation`            | 394    | █████████░ 89%     | 6/10    |
| `flutter-cicd`                             | 447    | █████████░ 88%     | 6/10    |
| `flutter-dependency-injection`             | 373    | █████████░ 90%     | 6/10    |
| `flutter-error-handling`                   | 399    | █████████░ 89%     | 6/10    |
| `flutter-feature-based-clean-architecture` | 391    | █████████░ 89%     | 6/10    |
| `flutter-getx-state-management`            | 502    | █████████░ 86%     | 6/10    |
| `flutter-riverpod-state-management`        | 444    | █████████░ 88%     | 6/10    |
| `flutter-security`                         | 323    | █████████░ 91%     | 6/10    |
| `flutter-go-router-navigation`             | 407    | █████████░ 89%     | 4/10    |
| `flutter-idiomatic-flutter`                | 338    | █████████░ 91%     | 4/10    |
| `flutter-performance`                      | 414    | █████████░ 89%     | 4/10    |
| `flutter-widgets`                          | 365    | █████████░ 90%     | 4/10    |

</details>

<details>
<summary><h3>📦 golang (10 skills | avg 377 tokens | quality 7.2/10)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality |
| ----------------------- | ------ | ------------------ | ------- |
| `golang-api-server`     | 410    | █████████░ 89%     | 8/10    |
| `golang-database`       | 360    | █████████░ 90%     | 8/10    |
| `golang-error-handling` | 320    | █████████░ 91%     | 8/10    |
| `golang-language`       | 324    | █████████░ 91%     | 8/10    |
| `golang-security`       | 500    | █████████░ 86%     | 8/10    |
| `golang-testing`        | 443    | █████████░ 88%     | 8/10    |
| `golang-architecture`   | 490    | █████████░ 87%     | 6/10    |
| `golang-concurrency`    | 368    | █████████░ 90%     | 6/10    |
| `golang-configuration`  | 273    | █████████░ 93%     | 6/10    |
| `golang-logging`        | 277    | █████████░ 92%     | 6/10    |

</details>

<details>
<summary><h3>📦 ios (15 skills | avg 402 tokens | quality 7.7/10)</h3></summary>

| Skill                      | Tokens | Savings (vs Heavy) | Quality |
| -------------------------- | ------ | ------------------ | ------- |
| `ios-app-lifecycle`        | 382    | █████████░ 90%     | 8/10    |
| `ios-architecture`         | 566    | █████████░ 85%     | 8/10    |
| `ios-dependency-injection` | 391    | █████████░ 89%     | 8/10    |
| `ios-deployment`           | 361    | █████████░ 90%     | 8/10    |
| `ios-localization`         | 469    | █████████░ 87%     | 8/10    |
| `ios-navigation`           | 288    | █████████░ 92%     | 8/10    |
| `ios-networking`           | 441    | █████████░ 88%     | 8/10    |
| `ios-notifications`        | 303    | █████████░ 92%     | 8/10    |
| `ios-performance`          | 408    | █████████░ 89%     | 8/10    |
| `ios-persistence`          | 451    | █████████░ 88%     | 8/10    |
| `ios-security`             | 411    | █████████░ 89%     | 8/10    |
| `ios-state-management`     | 426    | █████████░ 88%     | 8/10    |
| `ios-ui-navigation`        | 434    | █████████░ 88%     | 8/10    |
| `ios-design-system`        | 390    | █████████░ 89%     | 6/10    |
| `ios-swiftui`              | 310    | █████████░ 92%     | 6/10    |

</details>

<details>
<summary><h3>📦 java (5 skills | avg 518 tokens | quality 6.8/10)</h3></summary>

| Skill                 | Tokens | Savings (vs Heavy) | Quality |
| --------------------- | ------ | ------------------ | ------- |
| `java-concurrency`    | 469    | █████████░ 87%     | 8/10    |
| `java-testing`        | 522    | █████████░ 86%     | 8/10    |
| `java-best-practices` | 555    | █████████░ 85%     | 6/10    |
| `java-language`       | 632    | ████████░░ 83%     | 6/10    |
| `java-tooling`        | 412    | █████████░ 89%     | 6/10    |

</details>

<details>
<summary><h3>📦 javascript (3 skills | avg 382 tokens | quality 8.0/10)</h3></summary>

| Skill                       | Tokens | Savings (vs Heavy) | Quality |
| --------------------------- | ------ | ------------------ | ------- |
| `javascript-best-practices` | 402    | █████████░ 89%     | 8/10    |
| `javascript-language`       | 404    | █████████░ 89%     | 8/10    |
| `javascript-tooling`        | 339    | █████████░ 91%     | 8/10    |

</details>

<details>
<summary><h3>📦 kotlin (4 skills | avg 450 tokens | quality 7.0/10)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality |
| ----------------------- | ------ | ------------------ | ------- |
| `kotlin-coroutines`     | 330    | █████████░ 91%     | 8/10    |
| `kotlin-tooling`        | 392    | █████████░ 89%     | 8/10    |
| `kotlin-best-practices` | 528    | █████████░ 86%     | 6/10    |
| `kotlin-language`       | 551    | █████████░ 85%     | 6/10    |

</details>

<details>
<summary><h3>📦 laravel (10 skills | avg 359 tokens | quality 8.0/10)</h3></summary>

| Skill                           | Tokens | Savings (vs Heavy) | Quality |
| ------------------------------- | ------ | ------------------ | ------- |
| `laravel-api`                   | 335    | █████████░ 91%     | 8/10    |
| `laravel-architecture`          | 375    | █████████░ 90%     | 8/10    |
| `laravel-background-processing` | 381    | █████████░ 90%     | 8/10    |
| `laravel-clean-architecture`    | 428    | █████████░ 88%     | 8/10    |
| `laravel-database-expert`       | 399    | █████████░ 89%     | 8/10    |
| `laravel-eloquent`              | 323    | █████████░ 91%     | 8/10    |
| `laravel-security`              | 333    | █████████░ 91%     | 8/10    |
| `laravel-sessions-middleware`   | 381    | █████████░ 90%     | 8/10    |
| `laravel-testing`               | 312    | █████████░ 91%     | 8/10    |
| `laravel-tooling`               | 324    | █████████░ 91%     | 8/10    |

</details>

<details>
<summary><h3>📦 nestjs (21 skills | avg 554 tokens | quality 5.3/10)</h3></summary>

| Skill                         | Tokens | Savings (vs Heavy) | Quality |
| ----------------------------- | ------ | ------------------ | ------- |
| `nestjs-architecture`         | 406    | █████████░ 89%     | 8/10    |
| `nestjs-bullmq`               | 865    | ████████░░ 76%     | 8/10    |
| `nestjs-notification`         | 438    | █████████░ 88%     | 8/10    |
| `nestjs-security`             | 532    | █████████░ 85%     | 8/10    |
| `nestjs-security-isolation`   | 537    | █████████░ 85%     | 8/10    |
| `nestjs-testing`              | 552    | █████████░ 85%     | 8/10    |
| `nestjs-api-standards`        | 483    | █████████░ 87%     | 6/10    |
| `nestjs-database`             | 595    | ████████░░ 84%     | 6/10    |
| `nestjs-caching`              | 626    | ████████░░ 83%     | 4/10    |
| `nestjs-configuration`        | 528    | █████████░ 86%     | 4/10    |
| `nestjs-controllers-services` | 658    | ████████░░ 82%     | 4/10    |
| `nestjs-deployment`           | 554    | █████████░ 85%     | 4/10    |
| `nestjs-documentation`        | 838    | ████████░░ 77%     | 4/10    |
| `nestjs-error-handling`       | 498    | █████████░ 86%     | 4/10    |
| `nestjs-file-uploads`         | 332    | █████████░ 91%     | 4/10    |
| `nestjs-observability`        | 573    | ████████░░ 84%     | 4/10    |
| `nestjs-performance`          | 797    | ████████░░ 78%     | 4/10    |
| `nestjs-real-time`            | 615    | ████████░░ 83%     | 4/10    |
| `nestjs-scheduling`           | 338    | █████████░ 91%     | 4/10    |
| `nestjs-search`               | 434    | █████████░ 88%     | 4/10    |
| `nestjs-transport`            | 442    | █████████░ 88%     | 4/10    |

</details>

<details>
<summary><h3>📦 nextjs (18 skills | avg 480 tokens | quality 6.1/10)</h3></summary>

| Skill                      | Tokens | Savings (vs Heavy) | Quality |
| -------------------------- | ------ | ------------------ | ------- |
| `nextjs-data-fetching`     | 415    | █████████░ 89%     | 8/10    |
| `nextjs-i18n`              | 528    | █████████░ 86%     | 8/10    |
| `nextjs-pages-router`      | 927    | ████████░░ 75%     | 8/10    |
| `nextjs-rendering`         | 397    | █████████░ 89%     | 8/10    |
| `nextjs-security`          | 333    | █████████░ 91%     | 8/10    |
| `nextjs-testing`           | 344    | █████████░ 91%     | 8/10    |
| `nextjs-tooling`           | 342    | █████████░ 91%     | 8/10    |
| `nextjs-app-router`        | 511    | █████████░ 86%     | 6/10    |
| `nextjs-architecture`      | 805    | ████████░░ 78%     | 6/10    |
| `nextjs-authentication`    | 292    | █████████░ 92%     | 6/10    |
| `nextjs-server-components` | 477    | █████████░ 87%     | 6/10    |
| `nextjs-styling`           | 422    | █████████░ 88%     | 6/10    |
| `nextjs-caching`           | 388    | █████████░ 89%     | 4/10    |
| `nextjs-data-access-layer` | 360    | █████████░ 90%     | 4/10    |
| `nextjs-optimization`      | 549    | █████████░ 85%     | 4/10    |
| `nextjs-server-actions`    | 552    | █████████░ 85%     | 4/10    |
| `nextjs-state-management`  | 540    | █████████░ 85%     | 4/10    |
| `nextjs-upgrade`           | 463    | █████████░ 87%     | 4/10    |

</details>

<details>
<summary><h3>📦 php (7 skills | avg 319 tokens | quality 7.7/10)</h3></summary>

| Skill                | Tokens | Savings (vs Heavy) | Quality |
| -------------------- | ------ | ------------------ | ------- |
| `php-best-practices` | 329    | █████████░ 91%     | 8/10    |
| `php-concurrency`    | 287    | █████████░ 92%     | 8/10    |
| `php-error-handling` | 341    | █████████░ 91%     | 8/10    |
| `php-language`       | 326    | █████████░ 91%     | 8/10    |
| `php-security`       | 333    | █████████░ 91%     | 8/10    |
| `php-testing`        | 299    | █████████░ 92%     | 8/10    |
| `php-tooling`        | 316    | █████████░ 91%     | 6/10    |

</details>

<details>
<summary><h3>📦 quality-engineering (4 skills | avg 450 tokens | quality 6.0/10)</h3></summary>

| Skill                                        | Tokens | Savings (vs Heavy) | Quality |
| -------------------------------------------- | ------ | ------------------ | ------- |
| `quality-engineering-zephyr-test-generation` | 585    | ████████░░ 84%     | 8/10    |
| `quality-engineering-business-analysis`      | 389    | █████████░ 89%     | 6/10    |
| `quality-engineering-quality-assurance`      | 338    | █████████░ 91%     | 6/10    |
| `quality-engineering-jira-integration`       | 489    | █████████░ 87%     | 4/10    |

</details>

<details>
<summary><h3>📦 react (8 skills | avg 402 tokens | quality 7.0/10)</h3></summary>

| Skill                      | Tokens | Savings (vs Heavy) | Quality |
| -------------------------- | ------ | ------------------ | ------- |
| `react-component-patterns` | 406    | █████████░ 89%     | 8/10    |
| `react-hooks`              | 549    | █████████░ 85%     | 8/10    |
| `react-performance`        | 648    | ████████░░ 82%     | 8/10    |
| `react-security`           | 341    | █████████░ 91%     | 8/10    |
| `react-testing`            | 326    | █████████░ 91%     | 8/10    |
| `react-state-management`   | 356    | █████████░ 90%     | 6/10    |
| `react-typescript`         | 332    | █████████░ 91%     | 6/10    |
| `react-tooling`            | 259    | █████████░ 93%     | 4/10    |

</details>

<details>
<summary><h3>📦 react-native (13 skills | avg 439 tokens | quality 8.0/10)</h3></summary>

| Skill                            | Tokens | Savings (vs Heavy) | Quality |
| -------------------------------- | ------ | ------------------ | ------- |
| `react-native-architecture`      | 714    | ████████░░ 80%     | 8/10    |
| `react-native-components`        | 500    | █████████░ 86%     | 8/10    |
| `react-native-deployment`        | 443    | █████████░ 88%     | 8/10    |
| `react-native-dls`               | 257    | █████████░ 93%     | 8/10    |
| `react-native-navigation`        | 299    | █████████░ 92%     | 8/10    |
| `react-native-navigation-v6`     | 453    | █████████░ 88%     | 8/10    |
| `react-native-notifications`     | 322    | █████████░ 91%     | 8/10    |
| `react-native-performance`       | 500    | █████████░ 86%     | 8/10    |
| `react-native-platform-specific` | 425    | █████████░ 88%     | 8/10    |
| `react-native-security`          | 522    | █████████░ 86%     | 8/10    |
| `react-native-state-management`  | 419    | █████████░ 89%     | 8/10    |
| `react-native-styling`           | 410    | █████████░ 89%     | 8/10    |
| `react-native-testing`           | 445    | █████████░ 88%     | 8/10    |

</details>

<details>
<summary><h3>📦 spring-boot (10 skills | avg 369 tokens | quality 7.8/10)</h3></summary>

| Skill                        | Tokens | Savings (vs Heavy) | Quality |
| ---------------------------- | ------ | ------------------ | ------- |
| `spring-boot-api-design`     | 308    | █████████░ 92%     | 8/10    |
| `spring-boot-best-practices` | 387    | █████████░ 89%     | 8/10    |
| `spring-boot-data-access`    | 315    | █████████░ 91%     | 8/10    |
| `spring-boot-deployment`     | 332    | █████████░ 91%     | 8/10    |
| `spring-boot-microservices`  | 315    | █████████░ 91%     | 8/10    |
| `spring-boot-observability`  | 310    | █████████░ 92%     | 8/10    |
| `spring-boot-scheduling`     | 268    | █████████░ 93%     | 8/10    |
| `spring-boot-security`       | 520    | █████████░ 86%     | 8/10    |
| `spring-boot-testing`        | 351    | █████████░ 90%     | 8/10    |
| `spring-boot-architecture`   | 588    | ████████░░ 84%     | 6/10    |

</details>

<details>
<summary><h3>📦 swift (8 skills | avg 353 tokens | quality 8.0/10)</h3></summary>

| Skill                     | Tokens | Savings (vs Heavy) | Quality |
| ------------------------- | ------ | ------------------ | ------- |
| `swift-best-practices`    | 349    | █████████░ 90%     | 8/10    |
| `swift-concurrency`       | 341    | █████████░ 91%     | 8/10    |
| `swift-error-handling`    | 314    | █████████░ 91%     | 8/10    |
| `swift-language`          | 337    | █████████░ 91%     | 8/10    |
| `swift-memory-management` | 335    | █████████░ 91%     | 8/10    |
| `swift-swiftui`           | 380    | █████████░ 90%     | 8/10    |
| `swift-testing`           | 391    | █████████░ 89%     | 8/10    |
| `swift-tooling`           | 373    | █████████░ 90%     | 8/10    |

</details>

<details>
<summary><h3>📦 typescript (4 skills | avg 510 tokens | quality 8.0/10)</h3></summary>

| Skill                       | Tokens | Savings (vs Heavy) | Quality |
| --------------------------- | ------ | ------------------ | ------- |
| `typescript-best-practices` | 482    | █████████░ 87%     | 8/10    |
| `typescript-language`       | 547    | █████████░ 85%     | 8/10    |
| `typescript-security`       | 425    | █████████░ 88%     | 8/10    |
| `typescript-tooling`        | 584    | ████████░░ 84%     | 8/10    |

</details>

## 🏆 Quality Leaders

| Rank | Skill                       | Category | Quality | Tokens |
| ---- | --------------------------- | -------- | ------- | ------ |
| 1    | `android-architecture`      | android  | 8/10    | 420    |
| 2    | `android-background-work`   | android  | 8/10    | 239    |
| 3    | `android-compose`           | android  | 8/10    | 334    |
| 4    | `android-concurrency`       | android  | 8/10    | 259    |
| 5    | `android-deployment`        | android  | 8/10    | 286    |
| 6    | `android-di`                | android  | 8/10    | 278    |
| 7    | `android-legacy-navigation` | android  | 8/10    | 248    |
| 8    | `android-legacy-security`   | android  | 8/10    | 283    |
| 9    | `android-legacy-state`      | android  | 8/10    | 250    |
| 10   | `android-navigation`        | android  | 8/10    | 291    |

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
| **+2** | **Structured Guidelines** | At least 3 specific instructions/bullet points.        |
| **+2** | **Anti-Patterns**         | Specifically listing what the LLM should _avoid_.      |
| **+2** | **Reference Examples**    | Presence of a verified `references/` folder with code. |
| **+2** | **Token Optimality**      | Entire `SKILL.md` is ≤100 lines (forces brevity).      |
| **+2** | **Trigger Metadata**      | Proper keywords and file-match triggers defined.       |

### 🛡️ How to Verify This Report

Trust but verify. You can audit the raw data and run the benchmark yourself:

1. **Clone the repo** and install dependencies (`pnpm install`).
2. **Inspect Source**: The benchmark logic is open in [cli/src/scripts/benchmark/](./cli/src/scripts/benchmark/).

### Pricing (per 1M input tokens, Feb 2026)

- **Gemini 3 Flash**: $0.50
- **GPT-5**: $1.25
- **Gemini 3.1 Pro**: $2.00
- **Claude Sonnet 4.5**: $3.00
