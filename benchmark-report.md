# 📊 Agent Skill Benchmark Report

> Generated: 2026-03-16T12:06:27.572Z
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
| Avg. Tokens WITH Skill (SKILL.md) | **428 tokens**                    |
| Baseline: Light prompt (no skill) | **1449 tokens** ↓ see Methodology |
| Baseline: Heavy prompt (no skill) | **3656 tokens** ↓ see Methodology |
| Avg. Token Savings vs Light       | **70%** (1021 tokens/call)        |
| Avg. Token Savings vs Heavy       | **88%** (3228 tokens/call)        |
| Avg. Quality Score                | **9.9/10**                        |

## 📜 History

| Version | Date       | Skills | Avg Tokens | Savings (%) | Quality | Report                                       |
| ------- | ---------- | ------ | ---------- | ----------- | ------- | -------------------------------------------- |
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

| Model             | Original Cost | Skill Cost | Net Savings    | % Saved |
| ----------------- | ------------- | ---------- | -------------- | ------- |
| Gemini 3 Flash    | $0.0018280    | $0.0002140 | **$0.0016140** | 88%     |
| GPT-5             | $0.0045700    | $0.0005350 | **$0.0040350** | 88%     |
| Gemini 3.1 Pro    | $0.0073120    | $0.0008560 | **$0.0064560** | 88%     |
| Claude Sonnet 4.5 | $0.0109680    | $0.0012840 | **$0.0096840** | 88%     |

### 📈 Monthly Savings at Scale — (Avg Skill vs Heavy Prompt)

| Daily Calls | Original Cost/mo | Monthly Savings (1 skill) | Monthly Savings (50 skills) | Model             |
| ----------- | ---------------- | ------------------------- | --------------------------- | ----------------- |
| 1,000       | $137.1000 /mo    | $121.0500 /mo             | $6052.5000 /mo              | GPT-5             |
| 1,000       | $329.0400 /mo    | $290.5200 /mo             | $14526.0000 /mo             | Claude Sonnet 4.5 |
| 1,000       | $219.3600 /mo    | $193.6800 /mo             | $9684.0000 /mo              | Gemini 3.1 Pro    |

## 📦 Per-Category Summary

<details>
<summary><h3>📦 android (22 skills | avg 290 tokens | quality 10.0/10)</h3></summary>

| Skill                          | Tokens | Savings (vs Heavy) | Quality |
| ------------------------------ | ------ | ------------------ | ------- |
| `android-architecture`         | 420    | █████████░ 89%     | 10/10   |
| `android-background-work`      | 239    | █████████░ 93%     | 10/10   |
| `android-compose`              | 334    | █████████░ 91%     | 10/10   |
| `android-concurrency`          | 260    | █████████░ 93%     | 10/10   |
| `android-deployment`           | 287    | █████████░ 92%     | 10/10   |
| `android-design-system`        | 426    | █████████░ 88%     | 10/10   |
| `android-di`                   | 279    | █████████░ 92%     | 10/10   |
| `android-legacy-navigation`    | 248    | █████████░ 93%     | 10/10   |
| `android-legacy-security`      | 283    | █████████░ 92%     | 10/10   |
| `android-legacy-state`         | 251    | █████████░ 93%     | 10/10   |
| `android-navigation`           | 291    | █████████░ 92%     | 10/10   |
| `android-navigation-type-safe` | 257    | █████████░ 93%     | 10/10   |
| `android-networking`           | 303    | █████████░ 92%     | 10/10   |
| `android-notifications`        | 310    | █████████░ 92%     | 10/10   |
| `android-performance`          | 291    | █████████░ 92%     | 10/10   |
| `android-persistence`          | 257    | █████████░ 93%     | 10/10   |
| `android-resources`            | 241    | █████████░ 93%     | 10/10   |
| `android-security`             | 332    | █████████░ 91%     | 10/10   |
| `android-state`                | 287    | █████████░ 92%     | 10/10   |
| `android-testing`              | 254    | █████████░ 93%     | 10/10   |
| `android-tooling`              | 246    | █████████░ 93%     | 10/10   |
| `android-xml-views`            | 287    | █████████░ 92%     | 10/10   |

</details>

<details>
<summary><h3>📦 angular (15 skills | avg 302 tokens | quality 10.0/10)</h3></summary>

| Skill                          | Tokens | Savings (vs Heavy) | Quality |
| ------------------------------ | ------ | ------------------ | ------- |
| `angular-architecture`         | 480    | █████████░ 87%     | 10/10   |
| `angular-component-patterns`   | 311    | █████████░ 91%     | 10/10   |
| `angular-components`           | 344    | █████████░ 91%     | 10/10   |
| `angular-dependency-injection` | 293    | █████████░ 92%     | 10/10   |
| `angular-directives-pipes`     | 257    | █████████░ 93%     | 10/10   |
| `angular-forms`                | 256    | █████████░ 93%     | 10/10   |
| `angular-http-client`          | 272    | █████████░ 93%     | 10/10   |
| `angular-performance`          | 295    | █████████░ 92%     | 10/10   |
| `angular-routing`              | 286    | █████████░ 92%     | 10/10   |
| `angular-rxjs-interop`         | 290    | █████████░ 92%     | 10/10   |
| `angular-security`             | 288    | █████████░ 92%     | 10/10   |
| `angular-ssr`                  | 263    | █████████░ 93%     | 10/10   |
| `angular-state-management`     | 292    | █████████░ 92%     | 10/10   |
| `angular-style-guide`          | 344    | █████████░ 91%     | 10/10   |
| `angular-testing`              | 260    | █████████░ 93%     | 10/10   |

</details>

<details>
<summary><h3>📦 common (25 skills | avg 535 tokens | quality 9.8/10)</h3></summary>

| Skill                             | Tokens | Savings (vs Heavy) | Quality |
| --------------------------------- | ------ | ------------------ | ------- |
| `common-architecture-audit`       | 700    | ████████░░ 81%     | 10/10   |
| `common-architecture-diagramming` | 399    | █████████░ 89%     | 10/10   |
| `common-best-practices`           | 288    | █████████░ 92%     | 10/10   |
| `common-code-review`              | 385    | █████████░ 89%     | 10/10   |
| `common-context-optimization`     | 471    | █████████░ 87%     | 10/10   |
| `common-debugging`                | 430    | █████████░ 88%     | 10/10   |
| `common-documentation`            | 564    | █████████░ 85%     | 10/10   |
| `common-error-handling`           | 331    | █████████░ 91%     | 10/10   |
| `common-feedback-reporter`        | 455    | █████████░ 88%     | 10/10   |
| `common-git-collaboration`        | 675    | ████████░░ 82%     | 10/10   |
| `common-mobile-animation`         | 365    | █████████░ 90%     | 10/10   |
| `common-mobile-ux-core`           | 342    | █████████░ 91%     | 10/10   |
| `common-observability`            | 317    | █████████░ 91%     | 10/10   |
| `common-performance-engineering`  | 686    | ████████░░ 81%     | 10/10   |
| `common-product-requirements`     | 431    | █████████░ 88%     | 10/10   |
| `common-protocol-enforcement`     | 415    | █████████░ 89%     | 10/10   |
| `common-security-audit`           | 800    | ████████░░ 78%     | 10/10   |
| `common-security-standards`       | 620    | ████████░░ 83%     | 10/10   |
| `common-session-retrospective`    | 643    | ████████░░ 82%     | 10/10   |
| `common-skill-creator`            | 323    | █████████░ 91%     | 10/10   |
| `common-system-design`            | 532    | █████████░ 85%     | 10/10   |
| `common-tdd`                      | 836    | ████████░░ 77%     | 10/10   |
| `common-workflow-writing`         | 563    | █████████░ 85%     | 10/10   |
| `common-accessibility`            | 986    | ███████░░░ 73%     | 8/10    |
| `common-api-design`               | 819    | ████████░░ 78%     | 8/10    |

</details>

<details>
<summary><h3>📦 dart (3 skills | avg 460 tokens | quality 10.0/10)</h3></summary>

| Skill                 | Tokens | Savings (vs Heavy) | Quality |
| --------------------- | ------ | ------------------ | ------- |
| `dart-best-practices` | 385    | █████████░ 89%     | 10/10   |
| `dart-language`       | 593    | ████████░░ 84%     | 10/10   |
| `dart-tooling`        | 403    | █████████░ 89%     | 10/10   |

</details>

<details>
<summary><h3>📦 database (3 skills | avg 524 tokens | quality 10.0/10)</h3></summary>

| Skill                 | Tokens | Savings (vs Heavy) | Quality |
| --------------------- | ------ | ------------------ | ------- |
| `database-mongodb`    | 588    | ████████░░ 84%     | 10/10   |
| `database-postgresql` | 375    | █████████░ 90%     | 10/10   |
| `database-redis`      | 609    | ████████░░ 83%     | 10/10   |

</details>

<details>
<summary><h3>📦 flutter (21 skills | avg 453 tokens | quality 9.9/10)</h3></summary>

| Skill                                      | Tokens | Savings (vs Heavy) | Quality |
| ------------------------------------------ | ------ | ------------------ | ------- |
| `flutter-auto-route-navigation`            | 427    | █████████░ 88%     | 10/10   |
| `flutter-bloc-state-management`            | 417    | █████████░ 89%     | 10/10   |
| `flutter-cicd`                             | 481    | █████████░ 87%     | 10/10   |
| `flutter-dependency-injection`             | 406    | █████████░ 89%     | 10/10   |
| `flutter-design-system`                    | 525    | █████████░ 86%     | 10/10   |
| `flutter-error-handling`                   | 433    | █████████░ 88%     | 10/10   |
| `flutter-feature-based-clean-architecture` | 425    | █████████░ 88%     | 10/10   |
| `flutter-getx-navigation`                  | 382    | █████████░ 90%     | 10/10   |
| `flutter-go-router-navigation`             | 440    | █████████░ 88%     | 10/10   |
| `flutter-idiomatic-flutter`                | 371    | █████████░ 90%     | 10/10   |
| `flutter-layer-based-clean-architecture`   | 510    | █████████░ 86%     | 10/10   |
| `flutter-localization`                     | 494    | █████████░ 86%     | 10/10   |
| `flutter-navigation`                       | 318    | █████████░ 91%     | 10/10   |
| `flutter-notifications`                    | 343    | █████████░ 91%     | 10/10   |
| `flutter-performance`                      | 448    | █████████░ 88%     | 10/10   |
| `flutter-retrofit-networking`              | 514    | █████████░ 86%     | 10/10   |
| `flutter-riverpod-state-management`        | 444    | █████████░ 88%     | 10/10   |
| `flutter-security`                         | 356    | █████████░ 90%     | 10/10   |
| `flutter-testing`                          | 874    | ████████░░ 76%     | 10/10   |
| `flutter-widgets`                          | 399    | █████████░ 89%     | 10/10   |
| `flutter-getx-state-management`            | 503    | █████████░ 86%     | 8/10    |

</details>

<details>
<summary><h3>📦 golang (10 skills | avg 390 tokens | quality 10.0/10)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality |
| ----------------------- | ------ | ------------------ | ------- |
| `golang-api-server`     | 410    | █████████░ 89%     | 10/10   |
| `golang-architecture`   | 523    | █████████░ 86%     | 10/10   |
| `golang-concurrency`    | 401    | █████████░ 89%     | 10/10   |
| `golang-configuration`  | 307    | █████████░ 92%     | 10/10   |
| `golang-database`       | 360    | █████████░ 90%     | 10/10   |
| `golang-error-handling` | 320    | █████████░ 91%     | 10/10   |
| `golang-language`       | 324    | █████████░ 91%     | 10/10   |
| `golang-logging`        | 311    | █████████░ 91%     | 10/10   |
| `golang-security`       | 501    | █████████░ 86%     | 10/10   |
| `golang-testing`        | 443    | █████████░ 88%     | 10/10   |

</details>

<details>
<summary><h3>📦 ios (15 skills | avg 403 tokens | quality 10.0/10)</h3></summary>

| Skill                      | Tokens | Savings (vs Heavy) | Quality |
| -------------------------- | ------ | ------------------ | ------- |
| `ios-app-lifecycle`        | 382    | █████████░ 90%     | 10/10   |
| `ios-architecture`         | 567    | ████████░░ 84%     | 10/10   |
| `ios-dependency-injection` | 392    | █████████░ 89%     | 10/10   |
| `ios-deployment`           | 362    | █████████░ 90%     | 10/10   |
| `ios-design-system`        | 391    | █████████░ 89%     | 10/10   |
| `ios-localization`         | 469    | █████████░ 87%     | 10/10   |
| `ios-navigation`           | 289    | █████████░ 92%     | 10/10   |
| `ios-networking`           | 442    | █████████░ 88%     | 10/10   |
| `ios-notifications`        | 304    | █████████░ 92%     | 10/10   |
| `ios-performance`          | 409    | █████████░ 89%     | 10/10   |
| `ios-persistence`          | 452    | █████████░ 88%     | 10/10   |
| `ios-security`             | 412    | █████████░ 89%     | 10/10   |
| `ios-state-management`     | 427    | █████████░ 88%     | 10/10   |
| `ios-swiftui`              | 310    | █████████░ 92%     | 10/10   |
| `ios-ui-navigation`        | 434    | █████████░ 88%     | 10/10   |

</details>

<details>
<summary><h3>📦 java (5 skills | avg 519 tokens | quality 9.6/10)</h3></summary>

| Skill                 | Tokens | Savings (vs Heavy) | Quality |
| --------------------- | ------ | ------------------ | ------- |
| `java-concurrency`    | 470    | █████████░ 87%     | 10/10   |
| `java-language`       | 633    | ████████░░ 83%     | 10/10   |
| `java-testing`        | 523    | █████████░ 86%     | 10/10   |
| `java-tooling`        | 412    | █████████░ 89%     | 10/10   |
| `java-best-practices` | 556    | █████████░ 85%     | 8/10    |

</details>

<details>
<summary><h3>📦 javascript (3 skills | avg 382 tokens | quality 10.0/10)</h3></summary>

| Skill                       | Tokens | Savings (vs Heavy) | Quality |
| --------------------------- | ------ | ------------------ | ------- |
| `javascript-best-practices` | 403    | █████████░ 89%     | 10/10   |
| `javascript-language`       | 405    | █████████░ 89%     | 10/10   |
| `javascript-tooling`        | 339    | █████████░ 91%     | 10/10   |

</details>

<details>
<summary><h3>📦 kotlin (4 skills | avg 450 tokens | quality 10.0/10)</h3></summary>

| Skill                   | Tokens | Savings (vs Heavy) | Quality |
| ----------------------- | ------ | ------------------ | ------- |
| `kotlin-best-practices` | 528    | █████████░ 86%     | 10/10   |
| `kotlin-coroutines`     | 330    | █████████░ 91%     | 10/10   |
| `kotlin-language`       | 551    | █████████░ 85%     | 10/10   |
| `kotlin-tooling`        | 392    | █████████░ 89%     | 10/10   |

</details>

<details>
<summary><h3>📦 laravel (10 skills | avg 360 tokens | quality 10.0/10)</h3></summary>

| Skill                           | Tokens | Savings (vs Heavy) | Quality |
| ------------------------------- | ------ | ------------------ | ------- |
| `laravel-api`                   | 336    | █████████░ 91%     | 10/10   |
| `laravel-architecture`          | 375    | █████████░ 90%     | 10/10   |
| `laravel-background-processing` | 381    | █████████░ 90%     | 10/10   |
| `laravel-clean-architecture`    | 428    | █████████░ 88%     | 10/10   |
| `laravel-database-expert`       | 400    | █████████░ 89%     | 10/10   |
| `laravel-eloquent`              | 323    | █████████░ 91%     | 10/10   |
| `laravel-security`              | 334    | █████████░ 91%     | 10/10   |
| `laravel-sessions-middleware`   | 382    | █████████░ 90%     | 10/10   |
| `laravel-testing`               | 313    | █████████░ 91%     | 10/10   |
| `laravel-tooling`               | 324    | █████████░ 91%     | 10/10   |

</details>

<details>
<summary><h3>📦 nestjs (21 skills | avg 579 tokens | quality 9.7/10)</h3></summary>

| Skill                         | Tokens | Savings (vs Heavy) | Quality |
| ----------------------------- | ------ | ------------------ | ------- |
| `nestjs-api-standards`        | 516    | █████████░ 86%     | 10/10   |
| `nestjs-architecture`         | 406    | █████████░ 89%     | 10/10   |
| `nestjs-bullmq`               | 866    | ████████░░ 76%     | 10/10   |
| `nestjs-caching`              | 660    | ████████░░ 82%     | 10/10   |
| `nestjs-configuration`        | 562    | █████████░ 85%     | 10/10   |
| `nestjs-database`             | 628    | ████████░░ 83%     | 10/10   |
| `nestjs-deployment`           | 588    | ████████░░ 84%     | 10/10   |
| `nestjs-error-handling`       | 532    | █████████░ 85%     | 10/10   |
| `nestjs-file-uploads`         | 366    | █████████░ 90%     | 10/10   |
| `nestjs-notification`         | 439    | █████████░ 88%     | 10/10   |
| `nestjs-observability`        | 607    | ████████░░ 83%     | 10/10   |
| `nestjs-real-time`            | 649    | ████████░░ 82%     | 10/10   |
| `nestjs-scheduling`           | 372    | █████████░ 90%     | 10/10   |
| `nestjs-search`               | 467    | █████████░ 87%     | 10/10   |
| `nestjs-security`             | 533    | █████████░ 85%     | 10/10   |
| `nestjs-security-isolation`   | 538    | █████████░ 85%     | 10/10   |
| `nestjs-testing`              | 552    | █████████░ 85%     | 10/10   |
| `nestjs-transport`            | 475    | █████████░ 87%     | 10/10   |
| `nestjs-controllers-services` | 691    | ████████░░ 81%     | 8/10    |
| `nestjs-documentation`        | 872    | ████████░░ 76%     | 8/10    |
| `nestjs-performance`          | 831    | ████████░░ 77%     | 8/10    |

</details>

<details>
<summary><h3>📦 nextjs (18 skills | avg 465 tokens | quality 9.7/10)</h3></summary>

| Skill                      | Tokens | Savings (vs Heavy) | Quality |
| -------------------------- | ------ | ------------------ | ------- |
| `nextjs-app-router`        | 545    | █████████░ 85%     | 10/10   |
| `nextjs-architecture`      | 839    | ████████░░ 77%     | 10/10   |
| `nextjs-caching`           | 422    | █████████░ 88%     | 10/10   |
| `nextjs-data-access-layer` | 393    | █████████░ 89%     | 10/10   |
| `nextjs-data-fetching`     | 415    | █████████░ 89%     | 10/10   |
| `nextjs-i18n`              | 528    | █████████░ 86%     | 10/10   |
| `nextjs-pages-router`      | 338    | █████████░ 91%     | 10/10   |
| `nextjs-rendering`         | 398    | █████████░ 89%     | 10/10   |
| `nextjs-security`          | 333    | █████████░ 91%     | 10/10   |
| `nextjs-server-components` | 478    | █████████░ 87%     | 10/10   |
| `nextjs-state-management`  | 574    | ████████░░ 84%     | 10/10   |
| `nextjs-styling`           | 456    | █████████░ 88%     | 10/10   |
| `nextjs-testing`           | 344    | █████████░ 91%     | 10/10   |
| `nextjs-tooling`           | 342    | █████████░ 91%     | 10/10   |
| `nextjs-upgrade`           | 497    | █████████░ 86%     | 10/10   |
| `nextjs-authentication`    | 293    | █████████░ 92%     | 8/10    |
| `nextjs-optimization`      | 583    | ████████░░ 84%     | 8/10    |
| `nextjs-server-actions`    | 586    | ████████░░ 84%     | 8/10    |

</details>

<details>
<summary><h3>📦 php (7 skills | avg 319 tokens | quality 10.0/10)</h3></summary>

| Skill                | Tokens | Savings (vs Heavy) | Quality |
| -------------------- | ------ | ------------------ | ------- |
| `php-best-practices` | 330    | █████████░ 91%     | 10/10   |
| `php-concurrency`    | 287    | █████████░ 92%     | 10/10   |
| `php-error-handling` | 341    | █████████░ 91%     | 10/10   |
| `php-language`       | 326    | █████████░ 91%     | 10/10   |
| `php-security`       | 334    | █████████░ 91%     | 10/10   |
| `php-testing`        | 300    | █████████░ 92%     | 10/10   |
| `php-tooling`        | 316    | █████████░ 91%     | 10/10   |

</details>

<details>
<summary><h3>📦 quality-engineering (4 skills | avg 481 tokens | quality 10.0/10)</h3></summary>

| Skill                                        | Tokens | Savings (vs Heavy) | Quality |
| -------------------------------------------- | ------ | ------------------ | ------- |
| `quality-engineering-business-analysis`      | 423    | █████████░ 88%     | 10/10   |
| `quality-engineering-jira-integration`       | 529    | █████████░ 86%     | 10/10   |
| `quality-engineering-quality-assurance`      | 372    | █████████░ 90%     | 10/10   |
| `quality-engineering-zephyr-test-generation` | 601    | ████████░░ 84%     | 10/10   |

</details>

<details>
<summary><h3>📦 react (8 skills | avg 411 tokens | quality 9.8/10)</h3></summary>

| Skill                      | Tokens | Savings (vs Heavy) | Quality |
| -------------------------- | ------ | ------------------ | ------- |
| `react-component-patterns` | 407    | █████████░ 89%     | 10/10   |
| `react-hooks`              | 549    | █████████░ 85%     | 10/10   |
| `react-security`           | 342    | █████████░ 91%     | 10/10   |
| `react-state-management`   | 390    | █████████░ 89%     | 10/10   |
| `react-testing`            | 326    | █████████░ 91%     | 10/10   |
| `react-tooling`            | 293    | █████████░ 92%     | 10/10   |
| `react-typescript`         | 333    | █████████░ 91%     | 10/10   |
| `react-performance`        | 648    | ████████░░ 82%     | 8/10    |

</details>

<details>
<summary><h3>📦 react-native (13 skills | avg 440 tokens | quality 10.0/10)</h3></summary>

| Skill                            | Tokens | Savings (vs Heavy) | Quality |
| -------------------------------- | ------ | ------------------ | ------- |
| `react-native-architecture`      | 715    | ████████░░ 80%     | 10/10   |
| `react-native-components`        | 501    | █████████░ 86%     | 10/10   |
| `react-native-deployment`        | 444    | █████████░ 88%     | 10/10   |
| `react-native-dls`               | 258    | █████████░ 93%     | 10/10   |
| `react-native-navigation`        | 299    | █████████░ 92%     | 10/10   |
| `react-native-navigation-v6`     | 453    | █████████░ 88%     | 10/10   |
| `react-native-notifications`     | 322    | █████████░ 91%     | 10/10   |
| `react-native-performance`       | 501    | █████████░ 86%     | 10/10   |
| `react-native-platform-specific` | 425    | █████████░ 88%     | 10/10   |
| `react-native-security`          | 523    | █████████░ 86%     | 10/10   |
| `react-native-state-management`  | 419    | █████████░ 89%     | 10/10   |
| `react-native-styling`           | 411    | █████████░ 89%     | 10/10   |
| `react-native-testing`           | 445    | █████████░ 88%     | 10/10   |

</details>

<details>
<summary><h3>📦 spring-boot (10 skills | avg 370 tokens | quality 10.0/10)</h3></summary>

| Skill                        | Tokens | Savings (vs Heavy) | Quality |
| ---------------------------- | ------ | ------------------ | ------- |
| `spring-boot-api-design`     | 309    | █████████░ 92%     | 10/10   |
| `spring-boot-architecture`   | 622    | ████████░░ 83%     | 10/10   |
| `spring-boot-best-practices` | 387    | █████████░ 89%     | 10/10   |
| `spring-boot-data-access`    | 316    | █████████░ 91%     | 10/10   |
| `spring-boot-deployment`     | 333    | █████████░ 91%     | 10/10   |
| `spring-boot-microservices`  | 315    | █████████░ 91%     | 10/10   |
| `spring-boot-observability`  | 311    | █████████░ 91%     | 10/10   |
| `spring-boot-scheduling`     | 268    | █████████░ 93%     | 10/10   |
| `spring-boot-security`       | 520    | █████████░ 86%     | 10/10   |
| `spring-boot-testing`        | 320    | █████████░ 91%     | 10/10   |

</details>

<details>
<summary><h3>📦 swift (8 skills | avg 353 tokens | quality 10.0/10)</h3></summary>

| Skill                     | Tokens | Savings (vs Heavy) | Quality |
| ------------------------- | ------ | ------------------ | ------- |
| `swift-best-practices`    | 349    | █████████░ 90%     | 10/10   |
| `swift-concurrency`       | 341    | █████████░ 91%     | 10/10   |
| `swift-error-handling`    | 315    | █████████░ 91%     | 10/10   |
| `swift-language`          | 338    | █████████░ 91%     | 10/10   |
| `swift-memory-management` | 336    | █████████░ 91%     | 10/10   |
| `swift-swiftui`           | 380    | █████████░ 90%     | 10/10   |
| `swift-testing`           | 391    | █████████░ 89%     | 10/10   |
| `swift-tooling`           | 373    | █████████░ 90%     | 10/10   |

</details>

<details>
<summary><h3>📦 typescript (4 skills | avg 510 tokens | quality 10.0/10)</h3></summary>

| Skill                       | Tokens | Savings (vs Heavy) | Quality |
| --------------------------- | ------ | ------------------ | ------- |
| `typescript-best-practices` | 483    | █████████░ 87%     | 10/10   |
| `typescript-language`       | 547    | █████████░ 85%     | 10/10   |
| `typescript-security`       | 425    | █████████░ 88%     | 10/10   |
| `typescript-tooling`        | 585    | ████████░░ 84%     | 10/10   |

</details>

## 🏆 Quality Leaders

| Rank | Skill                       | Category | Quality | Tokens |
| ---- | --------------------------- | -------- | ------- | ------ |
| 1    | `android-architecture`      | android  | 10/10   | 420    |
| 2    | `android-background-work`   | android  | 10/10   | 239    |
| 3    | `android-compose`           | android  | 10/10   | 334    |
| 4    | `android-concurrency`       | android  | 10/10   | 260    |
| 5    | `android-deployment`        | android  | 10/10   | 287    |
| 6    | `android-design-system`     | android  | 10/10   | 426    |
| 7    | `android-di`                | android  | 10/10   | 279    |
| 8    | `android-legacy-navigation` | android  | 10/10   | 248    |
| 9    | `android-legacy-security`   | android  | 10/10   | 283    |
| 10   | `android-legacy-state`      | android  | 10/10   | 251    |

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
