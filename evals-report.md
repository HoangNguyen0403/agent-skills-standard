# 🧪 Live Skill Evals Report

> Generated: 2026-07-12T03:53:55.265Z
> Measured, not structural: outcome assertions are evaluated against immutable run inputs. Baseline and with-skill arms are generated in isolated workers; trigger arms receive only the skill name and description.
> Historical v1 runs remain readable through the compatibility adapter. v2 metrics report case pass rate, assertion pass rate, trigger recall, trigger specificity, and balanced trigger accuracy.

## 🔢 Executive Summary (latest complete partition per category)

| Metric | Value |
| --- | --- |
| Categories with a live run | **22** |
| Skills covered (unique category/skill) | **264** |
| Avg. baseline case pass rate | **40%** |
| Avg. with-skill case pass rate | **66%** |
| Avg. delta (valid baselines only) | **26%** |
| Avg. assertion pass rate | **81%** |
| Avg. balanced trigger accuracy | **96%** (264 skills) |

## 📜 Physical Run History

| Run | Category | Date | Skills | Baseline | With-Skill | Delta | Agent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | all | 2026-07-12 | 264 | 40% | 66% | +26% | Codex |

## 📦 Per-Category Results (latest complete partition)

| Category | Run | Scored | Skills | Baseline | With-Skill | Delta | Assertions | Trigger Recall | Trigger Specificity | Balanced Trigger |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| android | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 26 | 67% | 91% | 24% | 96% | 100% | 73% | 87% |
| angular | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 15 | 23% | 39% | 16% | 71% | 100% | 100% | 100% |
| common | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 38 | 22% | 53% | 30% | 74% | 100% | 99% | 100% |
| dart | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 3 | 89% | 100% | 11% | 100% | 100% | 92% | 96% |
| database | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 7 | 57% | 81% | 24% | 90% | 100% | 100% | 100% |
| flutter | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 22 | 29% | 58% | 29% | 78% | 95% | 77% | 86% |
| golang | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 11 | 67% | 85% | 20% | 93% | 100% | 100% | 100% |
| ios | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 15 | 7% | 42% | 36% | 67% | 100% | 100% | 100% |
| java | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 5 | 47% | 73% | 27% | 88% | 100% | 74% | 87% |
| javascript | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 3 | 0% | 100% | 100% | 100% | 100% | 92% | 96% |
| kotlin | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 4 | 58% | 83% | 25% | 94% | 100% | 65% | 83% |
| laravel | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 10 | 13% | 33% | 20% | 66% | 100% | 88% | 94% |
| nestjs | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 21 | 41% | 67% | 25% | 83% | 100% | 98% | 99% |
| nextjs | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 18 | 56% | 69% | 12% | 82% | 100% | 100% | 100% |
| php | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 7 | 31% | 45% | 14% | 66% | 100% | 93% | 96% |
| python | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 9 | 83% | 100% | 17% | 100% | 100% | 100% | 100% |
| quality-engineering | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 7 | 5% | 100% | 95% | 100% | 100% | 96% | 98% |
| react | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 8 | 50% | 92% | 42% | 96% | 100% | 100% | 100% |
| react-native | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 13 | 38% | 41% | 3% | 70% | 100% | 100% | 100% |
| spring-boot | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 10 | 63% | 93% | 30% | 97% | 100% | 100% | 100% |
| swift | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 8 | 21% | 36% | 14% | 59% | 100% | 100% | 100% |
| typescript | `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` | 2026-07-12 | 4 | 57% | 68% | 12% | 78% | 100% | 92% | 96% |

## 📋 Per-Skill Detail (latest complete partition per category)

| Skill | Category | Baseline Cases | With-Skill Cases | Delta | With-Skill Assertions | Recall | Specificity | Balanced | Guardrail |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `android-agp-upgrade` | android | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `android-architecture` | android | 67% | 100% | 33% | 100% | 100% | 80% | 90% | no |
| `android-background-work` | android | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `android-compose` | android | 33% | 67% | 33% | 88% | 100% | 90% | 95% | no |
| `android-compose-migration` | android | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `android-concurrency` | android | 67% | 67% | 0% | 89% | 100% | 60% | 80% | no |
| `android-deployment` | android | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `android-design-system` | android | 67% | 67% | 0% | 88% | 100% | 100% | 100% | no |
| `android-di` | android | 100% | 67% | -33% | 86% | 100% | 50% | 75% | no |
| `android-edge-to-edge` | android | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `android-legacy-navigation` | android | 67% | 67% | 0% | 71% | 100% | 90% | 95% | no |
| `android-legacy-security` | android | 67% | 100% | 33% | 100% | 100% | 80% | 90% | no |
| `android-legacy-state` | android | 100% | 100% | 0% | 100% | 100% | 70% | 85% | no |
| `android-navigation` | android | 33% | 100% | 67% | 100% | 100% | 60% | 80% | no |
| `android-navigation-3` | android | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `android-navigation-type-safe` | android | 100% | 67% | -33% | 86% | 100% | 100% | 100% | no |
| `android-networking` | android | 67% | 100% | 33% | 100% | 100% | 25% | 63% | no |
| `android-notifications` | android | 0% | 100% | 100% | 100% | 100% | 50% | 75% | no |
| `android-performance` | android | 0% | 100% | 100% | 100% | 100% | 70% | 85% | no |
| `android-persistence` | android | 100% | 100% | 0% | 100% | 100% | 50% | 75% | no |
| `android-resources` | android | 33% | 67% | 33% | 86% | 100% | 60% | 80% | no |
| `android-security` | android | 67% | 100% | 33% | 100% | 100% | 40% | 70% | no |
| `android-state` | android | 67% | 100% | 33% | 100% | 100% | 10% | 55% | no |
| `android-testing` | android | 67% | 100% | 33% | 100% | 100% | 80% | 90% | no |
| `android-tooling` | android | 100% | 100% | 0% | 100% | 100% | 70% | 85% | no |
| `android-xml-views` | android | 100% | 100% | 0% | 100% | 100% | 70% | 85% | no |
| `angular-architecture` | angular | 17% | 17% | 0% | 73% | 100% | 100% | 100% | no |
| `angular-components` | angular | 11% | 56% | 44% | 65% | 100% | 100% | 100% | no |
| `angular-dependency-injection` | angular | 0% | 17% | 17% | 53% | 100% | 100% | 100% | no |
| `angular-directives-pipes` | angular | 17% | 33% | 17% | 73% | 100% | 100% | 100% | no |
| `angular-forms` | angular | 50% | 83% | 33% | 92% | 100% | 100% | 100% | no |
| `angular-http-client` | angular | 17% | 33% | 17% | 67% | 100% | 100% | 100% | no |
| `angular-performance` | angular | 0% | 17% | 17% | 50% | 100% | 100% | 100% | no |
| `angular-routing` | angular | 67% | 83% | 17% | 92% | 100% | 100% | 100% | no |
| `angular-rxjs-interop` | angular | 50% | 50% | 0% | 82% | 100% | 100% | 100% | no |
| `angular-security` | angular | 0% | 17% | 17% | 43% | 100% | 100% | 100% | no |
| `angular-ssr` | angular | 50% | 83% | 33% | 95% | 100% | 100% | 100% | no |
| `angular-state-management` | angular | 17% | 33% | 17% | 72% | 100% | 100% | 100% | no |
| `angular-style-guide` | angular | 0% | 0% | 0% | 44% | 100% | 100% | 100% | no |
| `angular-testing` | angular | 33% | 50% | 17% | 84% | 100% | 100% | 100% | no |
| `angular-tooling` | angular | 17% | 17% | 0% | 74% | 100% | 100% | 100% | no |
| `common-accessibility` | common | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `common-api-design` | common | 33% | 67% | 33% | 78% | 100% | 100% | 100% | no |
| `common-architecture-audit` | common | 67% | 67% | 0% | 83% | 100% | 100% | 100% | no |
| `common-architecture-diagramming` | common | 0% | 0% | 0% | 22% | 100% | 100% | 100% | no |
| `common-best-practices` | common | 33% | 33% | 0% | 67% | 100% | 100% | 100% | no |
| `common-business-requirements` | common | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `common-code-review` | common | 0% | 80% | n/a | 92% | 100% | 100% | 100% | yes |
| `common-context-optimization` | common | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `common-dast-tooling` | common | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `common-debugging` | common | 40% | 60% | 20% | 75% | 100% | 100% | 100% | yes |
| `common-documentation` | common | 33% | 67% | 33% | 67% | 100% | 100% | 100% | no |
| `common-error-handling` | common | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `common-exploit-verification` | common | 50% | 0% | -50% | 50% | 100% | 100% | 100% | no |
| `common-feedback-reporter` | common | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `common-git-collaboration` | common | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `common-learning-log` | common | 0% | 33% | n/a | 67% | 100% | 100% | 100% | no |
| `common-llm-security` | common | 0% | 67% | 67% | 83% | 100% | 100% | 100% | no |
| `common-mobile-animation` | common | 0% | 67% | 67% | 89% | 100% | 100% | 100% | no |
| `common-mobile-ux-core` | common | 0% | 0% | 0% | 44% | 100% | 100% | 100% | no |
| `common-mobile-visual-testing` | common | 0% | 50% | 50% | 75% | 100% | 100% | 100% | no |
| `common-observability` | common | 0% | 0% | 0% | 33% | 100% | 100% | 100% | no |
| `common-owasp` | common | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `common-pentest-methodology` | common | 0% | 0% | 0% | 50% | 100% | 100% | 100% | no |
| `common-performance-engineering` | common | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `common-product-requirements` | common | 20% | 20% | 0% | 60% | 100% | 100% | 100% | no |
| `common-protocol-enforcement` | common | 0% | 20% | 20% | 64% | 100% | 100% | 100% | yes |
| `common-security-audit` | common | 33% | 67% | 33% | 83% | 100% | 100% | 100% | yes |
| `common-security-standards` | common | 67% | 67% | 0% | 83% | 100% | 100% | 100% | no |
| `common-session-retrospective` | common | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `common-skill-creator` | common | 0% | 40% | 40% | 67% | 100% | 100% | 100% | yes |
| `common-software-requirements` | common | 0% | 67% | 67% | 86% | 100% | 100% | 100% | no |
| `common-store-changelog` | common | 0% | 25% | 25% | 73% | 100% | 100% | 100% | no |
| `common-system-design` | common | 0% | 0% | 0% | 33% | 100% | 75% | 88% | no |
| `common-tdd` | common | 0% | 40% | 40% | 58% | 100% | 100% | 100% | yes |
| `common-telemetry` | common | 0% | 0% | n/a | 50% | 100% | 100% | 100% | no |
| `common-ui-design` | common | 33% | 67% | 33% | 67% | 100% | 100% | 100% | no |
| `common-web-visual-testing` | common | 0% | 0% | 0% | 60% | 100% | 100% | 100% | no |
| `common-workflow-writing` | common | 0% | 50% | 50% | 75% | 100% | 100% | 100% | yes |
| `dart-best-practices` | dart | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `dart-language` | dart | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `dart-tooling` | dart | 67% | 100% | 33% | 100% | 100% | 75% | 88% | no |
| `database-migrations` | database | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `database-mongodb` | database | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `database-postgresql` | database | 67% | 0% | -67% | 43% | 100% | 100% | 100% | no |
| `database-query-performance` | database | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `database-redis` | database | 67% | 67% | 0% | 86% | 100% | 100% | 100% | no |
| `database-schema-design` | database | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `database-transactions` | database | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `flutter-auto-route-navigation` | flutter | 33% | 100% | 67% | 100% | 100% | 75% | 88% | no |
| `flutter-bloc-state-management` | flutter | 0% | 33% | 33% | 71% | 100% | 100% | 100% | no |
| `flutter-cicd` | flutter | 67% | 67% | 0% | 88% | 100% | 100% | 100% | no |
| `flutter-concurrency` | flutter | 67% | 67% | 0% | 86% | 100% | 100% | 100% | no |
| `flutter-dependency-injection` | flutter | 33% | 33% | 0% | 71% | 100% | 100% | 100% | no |
| `flutter-design-system` | flutter | 0% | 33% | 33% | 78% | 100% | 100% | 100% | no |
| `flutter-error-handling` | flutter | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `flutter-feature-based-clean-architecture` | flutter | 33% | 67% | 33% | 88% | 100% | 100% | 100% | no |
| `flutter-getx-navigation` | flutter | 67% | 67% | 0% | 86% | 100% | 100% | 100% | no |
| `flutter-getx-state-management` | flutter | 33% | 67% | 33% | 71% | 100% | 75% | 88% | no |
| `flutter-go-router-navigation` | flutter | 33% | 67% | 33% | 88% | 100% | 75% | 88% | no |
| `flutter-idiomatic-flutter` | flutter | 0% | 0% | 0% | 50% | 0% | 75% | 38% | no |
| `flutter-layer-based-clean-architecture` | flutter | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `flutter-localization` | flutter | 33% | 33% | 0% | 43% | 100% | 25% | 63% | no |
| `flutter-navigation` | flutter | 0% | 33% | 33% | 50% | 100% | 25% | 63% | no |
| `flutter-notifications` | flutter | 33% | 33% | 0% | 50% | 100% | 50% | 75% | no |
| `flutter-performance` | flutter | 0% | 67% | 67% | 86% | 100% | 75% | 88% | no |
| `flutter-retrofit-networking` | flutter | 100% | 100% | 0% | 100% | 100% | 75% | 88% | no |
| `flutter-riverpod-state-management` | flutter | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `flutter-security` | flutter | 33% | 33% | 0% | 57% | 100% | 25% | 63% | no |
| `flutter-testing` | flutter | 0% | 33% | 33% | 78% | 100% | 75% | 88% | no |
| `flutter-widgets` | flutter | 0% | 67% | 67% | 88% | 100% | 50% | 75% | no |
| `golang-api-server` | golang | 67% | 67% | n/a | 83% | 100% | 100% | 100% | no |
| `golang-architecture` | golang | 67% | 33% | -33% | 75% | 100% | 100% | 100% | no |
| `golang-concurrency` | golang | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `golang-configuration` | golang | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `golang-database` | golang | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `golang-error-handling` | golang | 67% | 67% | 0% | 83% | 100% | 100% | 100% | no |
| `golang-language` | golang | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `golang-logging` | golang | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `golang-security` | golang | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `golang-testing` | golang | 67% | 67% | 0% | 83% | 100% | 100% | 100% | no |
| `golang-tooling` | golang | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `ios-app-lifecycle` | ios | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `ios-architecture` | ios | 0% | 0% | 0% | 56% | 100% | 100% | 100% | no |
| `ios-dependency-injection` | ios | 0% | 33% | 33% | 75% | 100% | 100% | 100% | no |
| `ios-deployment` | ios | 0% | 67% | 67% | 88% | 100% | 100% | 100% | no |
| `ios-design-system` | ios | 0% | 0% | 0% | 44% | 100% | 100% | 100% | no |
| `ios-localization` | ios | 0% | 0% | 0% | 50% | 100% | 100% | 100% | no |
| `ios-navigation` | ios | 0% | 33% | 33% | 56% | 100% | 100% | 100% | no |
| `ios-networking` | ios | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `ios-notifications` | ios | 0% | 33% | 33% | 67% | 100% | 100% | 100% | no |
| `ios-performance` | ios | 33% | 67% | 33% | 67% | 100% | 100% | 100% | no |
| `ios-persistence` | ios | 0% | 67% | 67% | 83% | 100% | 100% | 100% | no |
| `ios-security` | ios | 0% | 33% | 33% | 56% | 100% | 100% | 100% | no |
| `ios-state-management` | ios | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `ios-swiftui` | ios | 0% | 33% | 33% | 25% | 100% | 100% | 100% | no |
| `ios-ui-navigation` | ios | 0% | 33% | 33% | 67% | 100% | 100% | 100% | no |
| `java-best-practices` | java | 33% | 100% | 67% | 100% | 100% | 70% | 85% | no |
| `java-concurrency` | java | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `java-language` | java | 0% | 0% | 0% | 55% | 100% | 70% | 85% | no |
| `java-testing` | java | 33% | 67% | 33% | 88% | 100% | 50% | 75% | no |
| `java-tooling` | java | 100% | 100% | 0% | 100% | 100% | 80% | 90% | no |
| `javascript-best-practices` | javascript | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `javascript-language` | javascript | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `javascript-tooling` | javascript | 0% | 100% | 100% | 100% | 100% | 75% | 88% | no |
| `kotlin-best-practices` | kotlin | 67% | 100% | 33% | 100% | 100% | 90% | 95% | no |
| `kotlin-coroutines` | kotlin | 33% | 67% | 33% | 88% | 100% | 60% | 80% | no |
| `kotlin-language` | kotlin | 67% | 67% | 0% | 89% | 100% | 60% | 80% | no |
| `kotlin-tooling` | kotlin | 67% | 100% | 33% | 100% | 100% | 50% | 75% | no |
| `laravel-api` | laravel | 33% | 33% | 0% | 71% | 100% | 100% | 100% | no |
| `laravel-architecture` | laravel | 33% | 50% | 17% | 67% | 100% | 100% | 100% | no |
| `laravel-background-processing` | laravel | 0% | 83% | 83% | 97% | 100% | 100% | 100% | no |
| `laravel-clean-architecture` | laravel | 0% | 17% | 17% | 57% | 100% | 100% | 100% | no |
| `laravel-database-expert` | laravel | 17% | 17% | 0% | 72% | 100% | 100% | 100% | no |
| `laravel-eloquent` | laravel | 17% | 17% | 0% | 47% | 100% | 100% | 100% | no |
| `laravel-security` | laravel | 0% | 0% | 0% | 33% | 100% | 0% | 50% | no |
| `laravel-sessions-middleware` | laravel | 17% | 33% | 17% | 71% | 100% | 100% | 100% | no |
| `laravel-testing` | laravel | 0% | 33% | 33% | 68% | 100% | 75% | 88% | no |
| `laravel-tooling` | laravel | 17% | 50% | 33% | 73% | 100% | 100% | 100% | no |
| `nestjs-api-standards` | nestjs | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `nestjs-architecture` | nestjs | 0% | 0% | 0% | 20% | 100% | 100% | 100% | no |
| `nestjs-bullmq` | nestjs | 0% | 0% | 0% | 64% | 100% | 100% | 100% | no |
| `nestjs-caching` | nestjs | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `nestjs-configuration` | nestjs | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `nestjs-controllers-services` | nestjs | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `nestjs-database` | nestjs | 100% | 67% | -33% | 83% | 100% | 67% | 83% | no |
| `nestjs-deployment` | nestjs | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `nestjs-documentation` | nestjs | 33% | 33% | 0% | 67% | 100% | 100% | 100% | no |
| `nestjs-error-handling` | nestjs | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `nestjs-file-uploads` | nestjs | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `nestjs-notification` | nestjs | 33% | 33% | 0% | 67% | 100% | 100% | 100% | no |
| `nestjs-observability` | nestjs | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `nestjs-performance` | nestjs | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `nestjs-real-time` | nestjs | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `nestjs-scheduling` | nestjs | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `nestjs-search` | nestjs | 33% | 0% | -33% | 50% | 100% | 100% | 100% | no |
| `nestjs-security` | nestjs | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `nestjs-security-isolation` | nestjs | 0% | 67% | 67% | 83% | 100% | 100% | 100% | no |
| `nestjs-testing` | nestjs | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `nestjs-transport` | nestjs | 67% | 67% | 0% | 83% | 100% | 100% | 100% | no |
| `nextjs-app-router` | nextjs | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `nextjs-architecture` | nextjs | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `nextjs-authentication` | nextjs | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `nextjs-caching` | nextjs | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `nextjs-data-access-layer` | nextjs | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `nextjs-data-fetching` | nextjs | 83% | 67% | -17% | 79% | 100% | 100% | 100% | no |
| `nextjs-i18n` | nextjs | 0% | 33% | 33% | 67% | 100% | 100% | 100% | no |
| `nextjs-optimization` | nextjs | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `nextjs-pages-router` | nextjs | 100% | 67% | -33% | 86% | 100% | 100% | 100% | no |
| `nextjs-rendering` | nextjs | 33% | 67% | 33% | 67% | 100% | 100% | 100% | no |
| `nextjs-security` | nextjs | 67% | 67% | 0% | 83% | 100% | 100% | 100% | no |
| `nextjs-server-actions` | nextjs | 50% | 33% | -17% | 62% | 100% | 100% | 100% | no |
| `nextjs-server-components` | nextjs | 17% | 0% | -17% | 25% | 100% | 100% | 100% | no |
| `nextjs-state-management` | nextjs | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `nextjs-styling` | nextjs | 67% | 33% | -33% | 67% | 100% | 100% | 100% | no |
| `nextjs-testing` | nextjs | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `nextjs-tooling` | nextjs | 67% | 33% | -33% | 67% | 100% | 100% | 100% | no |
| `nextjs-upgrade` | nextjs | 0% | 67% | 67% | 83% | 100% | 100% | 100% | no |
| `php-best-practices` | php | 17% | 17% | 0% | 38% | 100% | 75% | 88% | no |
| `php-concurrency` | php | 33% | 50% | 17% | 62% | 100% | 100% | 100% | no |
| `php-error-handling` | php | 33% | 33% | 0% | 62% | 100% | 100% | 100% | no |
| `php-language` | php | 17% | 33% | 17% | 69% | 100% | 100% | 100% | no |
| `php-security` | php | 50% | 83% | 33% | 93% | 100% | 75% | 88% | no |
| `php-testing` | php | 33% | 50% | 17% | 75% | 100% | 100% | 100% | no |
| `php-tooling` | php | 33% | 50% | 17% | 64% | 100% | 100% | 100% | no |
| `python-architecture` | python | 50% | 100% | 50% | 100% | 100% | 100% | 100% | no |
| `python-async-runtime` | python | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `python-best-practices` | python | 50% | 100% | 50% | 100% | 100% | 100% | 100% | no |
| `python-database` | python | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `python-error-handling` | python | 50% | 100% | 50% | 100% | 100% | 100% | 100% | no |
| `python-language` | python | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `python-security` | python | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `python-testing` | python | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `python-tooling` | python | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `quality-engineering-appium-mcp` | quality-engineering | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `quality-engineering-business-analysis` | quality-engineering | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `quality-engineering-jira-integration` | quality-engineering | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `quality-engineering-playwright-cli` | quality-engineering | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `quality-engineering-quality-assurance` | quality-engineering | 0% | 100% | 100% | 100% | 100% | 75% | 88% | no |
| `quality-engineering-zephyr-coverage-analysis` | quality-engineering | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `quality-engineering-zephyr-test-generation` | quality-engineering | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `react-component-patterns` | react | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `react-hooks` | react | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `react-performance` | react | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `react-security` | react | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `react-state-management` | react | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `react-testing` | react | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `react-tooling` | react | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `react-typescript` | react | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `react-native-architecture` | react-native | 0% | 0% | 0% | 40% | 100% | 100% | 100% | no |
| `react-native-components` | react-native | 0% | 0% | 0% | 44% | 100% | 100% | 100% | no |
| `react-native-deployment` | react-native | 33% | 33% | 0% | 78% | 100% | 100% | 100% | no |
| `react-native-dls` | react-native | 0% | 33% | 33% | 63% | 100% | 100% | 100% | no |
| `react-native-navigation` | react-native | 100% | 67% | -33% | 88% | 100% | 100% | 100% | no |
| `react-native-navigation-v6` | react-native | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `react-native-notifications` | react-native | 33% | 33% | 0% | 67% | 100% | 100% | 100% | no |
| `react-native-performance` | react-native | 0% | 67% | 67% | 88% | 100% | 100% | 100% | no |
| `react-native-platform-specific` | react-native | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `react-native-security` | react-native | 67% | 33% | -33% | 56% | 100% | 100% | 100% | no |
| `react-native-state-management` | react-native | 0% | 0% | 0% | 63% | 100% | 100% | 100% | no |
| `react-native-styling` | react-native | 33% | 0% | -33% | 67% | 100% | 100% | 100% | no |
| `react-native-testing` | react-native | 33% | 67% | 33% | 63% | 100% | 100% | 100% | no |
| `spring-boot-api-design` | spring-boot | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `spring-boot-architecture` | spring-boot | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `spring-boot-best-practices` | spring-boot | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `spring-boot-data-access` | spring-boot | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `spring-boot-deployment` | spring-boot | 67% | 67% | 0% | 83% | 100% | 100% | 100% | no |
| `spring-boot-microservices` | spring-boot | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `spring-boot-observability` | spring-boot | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `spring-boot-scheduling` | spring-boot | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `spring-boot-security` | spring-boot | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `spring-boot-testing` | spring-boot | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `swift-best-practices` | swift | 0% | 0% | 0% | 33% | 100% | 100% | 100% | no |
| `swift-concurrency` | swift | 20% | 40% | 20% | 79% | 100% | 100% | 100% | no |
| `swift-error-handling` | swift | 50% | 75% | 25% | 88% | 100% | 100% | 100% | no |
| `swift-language` | swift | 0% | 20% | 20% | 56% | 100% | 100% | 100% | no |
| `swift-memory-management` | swift | 0% | 25% | 25% | 44% | 100% | 100% | 100% | no |
| `swift-swiftui` | swift | 0% | 0% | 0% | 25% | 100% | 100% | 100% | no |
| `swift-testing` | swift | 50% | 50% | 0% | 67% | 100% | 100% | 100% | no |
| `swift-tooling` | swift | 50% | 75% | 25% | 78% | 100% | 100% | 100% | no |
| `typescript-best-practices` | typescript | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `typescript-language` | typescript | 67% | 67% | 0% | 67% | 100% | 100% | 100% | no |
| `typescript-security` | typescript | 60% | 40% | -20% | 64% | 100% | 100% | 100% | no |
| `typescript-tooling` | typescript | 67% | 100% | 33% | 100% | 100% | 67% | 83% | no |

## ⚠️ Skills Where With-Skill Underperformed Baseline

| Skill | Category | Delta |
| --- | --- | --- |
| `android-di` | android | -33% |
| `android-navigation-type-safe` | android | -33% |
| `common-exploit-verification` | common | -50% |
| `database-postgresql` | database | -67% |
| `golang-architecture` | golang | -33% |
| `nestjs-database` | nestjs | -33% |
| `nestjs-search` | nestjs | -33% |
| `nextjs-data-fetching` | nextjs | -17% |
| `nextjs-pages-router` | nextjs | -33% |
| `nextjs-server-actions` | nextjs | -17% |
| `nextjs-server-components` | nextjs | -17% |
| `nextjs-styling` | nextjs | -33% |
| `nextjs-tooling` | nextjs | -33% |
| `react-native-navigation` | react-native | -33% |
| `react-native-security` | react-native | -33% |
| `react-native-styling` | react-native | -33% |
| `typescript-security` | typescript | -20% |

## 🛡️ How to Verify This Report

1. `pnpm evals:verify -- --all` — re-score committed transcripts from each run's immutable `inputs.json` snapshot.
2. `pnpm evals:report` — regenerate the deterministic category projection, history, and archive.
3. Root, CLI, and MCP verification must report the same result for the same run.
