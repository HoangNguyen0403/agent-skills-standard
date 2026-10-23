# 🧪 Live Skill Evals Report

> Generated: 2026-10-23T05:14:42.993Z
> Measured transcript-assertion evidence, not structural or executable task verification: outcome assertions are evaluated against transcripts from isolated evaluation workers. Workers are instructed not to use tools and have read-only filesystem capability, but neither tool-use prohibition nor tool invocation is host-enforced or retained here; tool-free execution is unverified. Trigger arms receive only the skill name and description.
> Historical v1 runs remain readable through the compatibility adapter. v2 metrics report case pass rate, assertion pass rate, trigger recall, trigger specificity, and balanced trigger accuracy.
> Activation metrics are omitted for legacy trigger evidence until a clean activation-evidence v2 run replaces it.

## 🔢 Executive Summary (latest complete partition per category)

| Metric | Value |
| --- | --- |
| Categories with a live run | **22** |
| Catalog release status | **NOT READY** |
| Outcome readiness | **NOT READY** |
| Activation readiness | **NOT READY** |
| Evidence mode | **composite** |
| Protocol provenance | **unknown** |
| Unresolved protocol contributors | **227** |
| Strict outcome-ready skills | **133/265** |
| Activation-ready skills | **226/265** |
| Strict release-ready skills | **113/265** |
| Skills covered (unique category/skill) | **265** |
| Avg. baseline case pass rate | **42%** |
| Avg. with-skill case pass rate | **72%** |
| Avg. delta (valid baselines only) | **30%** |
| Avg. assertion pass rate | **85%** |
| Avg. balanced trigger accuracy | **96.88%** (265 skills) |
| Avg. trigger recall | **99.62%** |
| Avg. trigger specificity | **94.14%** |
| Skills meeting ≥90% recall and specificity | **226/265** |

> ⚠️ **Unresolved Protocol Provenance Notice**: At least one contributing skill has unresolved protocol provenance. This is uncertainty, not evidence that the contributor used a different protocol; protocol-specific aggregate comparisons cannot be certified.

## 📜 Physical Run History

| Run | Category | Date | Skills | Baseline | With-Skill | Delta | Evidence | Protocol | Unresolved | Agent |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `all-v2.6.1-2026-09-22T07-28-44-830Z-0e7f8fb4` | all | 2026-09-22 | 14 | 10% | 68% | +57% | incremental | governing-skill-v3 | 0 | Codex CLI isolated worker |
| `governed-cybersecurity-20260922-attribution` | all | 2026-09-22 | 14 | 4% | 67% | +63% | fresh | governing-skill-v3 | 0 | Codex CLI isolated worker |
| `all-v2.6.0` | all | 2026-07-14 | 265 | 42% | 72% | +30% | composite | unknown | 227 | Composite immutable evidence |

## 📦 Per-Category Results (latest complete partition)

| Category | Run | Scored | Protocol | Skills | Baseline | With-Skill | Delta | Assertions | Trigger Recall | Trigger Specificity | Balanced Trigger |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| android | `all-v2.6.0` | 2026-07-14 | unknown | 26 | 68% | 92% | 24% | 96% | 100% | 75% | 87% |
| angular | `all-v2.6.0` | 2026-07-14 | unknown | 15 | 30% | 56% | 26% | 79% | 100% | 100% | 100% |
| common | `all-v2.6.0` | 2026-07-14 | unknown | 39 | 24% | 68% | 44% | 82% | 100% | 99% | 100% |
| dart | `all-v2.6.0` | 2026-07-14 | unknown | 3 | 89% | 100% | 11% | 100% | 100% | 92% | 96% |
| database | `all-v2.6.0` | 2026-07-14 | unknown | 7 | 57% | 81% | 24% | 90% | 100% | 100% | 100% |
| flutter | `all-v2.6.0` | 2026-07-14 | unknown | 22 | 29% | 68% | 39% | 82% | 95% | 78% | 87% |
| golang | `all-v2.6.0` | 2026-07-14 | unknown | 11 | 67% | 85% | 18% | 93% | 100% | 100% | 100% |
| ios | `all-v2.6.0` | 2026-07-14 | unknown | 15 | 7% | 49% | 42% | 70% | 100% | 100% | 100% |
| java | `all-v2.6.0` | 2026-07-14 | unknown | 5 | 47% | 73% | 27% | 88% | 100% | 74% | 87% |
| javascript | `all-v2.6.0` | 2026-07-14 | unknown | 3 | 0% | 100% | 100% | 100% | 100% | 100% | 100% |
| kotlin | `all-v2.6.0` | 2026-07-14 | unknown | 4 | 58% | 92% | 33% | 97% | 100% | 75% | 88% |
| laravel | `all-v2.6.0` | 2026-07-14 | unknown | 10 | 23% | 50% | 27% | 75% | 100% | 98% | 99% |
| nestjs | `all-v2.6.0` | 2026-07-14 | unknown | 21 | 41% | 67% | 25% | 83% | 100% | 98% | 99% |
| nextjs | `all-v2.6.0` | 2026-07-14 | unknown | 18 | 55% | 72% | 18% | 83% | 100% | 100% | 100% |
| php | `all-v2.6.0` | 2026-07-14 | unknown | 7 | 31% | 45% | 14% | 66% | 100% | 93% | 96% |
| python | `all-v2.6.0` | 2026-07-14 | unknown | 9 | 83% | 100% | 17% | 100% | 100% | 100% | 100% |
| quality-engineering | `all-v2.6.0` | 2026-07-14 | unknown | 7 | 21% | 100% | 79% | 100% | 100% | 100% | 100% |
| react | `all-v2.6.0` | 2026-07-14 | unknown | 8 | 50% | 92% | 42% | 96% | 100% | 100% | 100% |
| react-native | `all-v2.6.0` | 2026-07-14 | unknown | 13 | 38% | 41% | 3% | 70% | 100% | 100% | 100% |
| spring-boot | `all-v2.6.0` | 2026-07-14 | unknown | 10 | 63% | 93% | 30% | 97% | 100% | 100% | 100% |
| swift | `all-v2.6.0` | 2026-07-14 | unknown | 8 | 41% | 65% | 24% | 78% | 100% | 100% | 100% |
| typescript | `all-v2.6.0` | 2026-07-14 | unknown | 4 | 57% | 68% | 12% | 78% | 100% | 92% | 96% |

## 📋 Per-Skill Detail (latest complete partition per category)

| Skill | Category | Protocol | Baseline Cases | With-Skill Cases | Delta | With-Skill Assertions | Recall | Specificity | Balanced | Guardrail |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `android-agp-upgrade` | android | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `android-architecture` | android | unknown | 67% | 100% | 33% | 100% | 100% | 80% | 90% | no |
| `android-background-work` | android | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `android-compose` | android | unknown | 33% | 67% | 33% | 88% | 100% | 90% | 95% | no |
| `android-compose-migration` | android | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `android-concurrency` | android | unknown | 67% | 67% | 0% | 89% | 100% | 60% | 80% | no |
| `android-deployment` | android | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `android-design-system` | android | unknown | 67% | 67% | 0% | 88% | 100% | 100% | 100% | no |
| `android-di` | android | unknown | 100% | 67% | -33% | 86% | 100% | 50% | 75% | no |
| `android-edge-to-edge` | android | unknown | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `android-legacy-navigation` | android | unknown | 67% | 67% | 0% | 71% | 100% | 90% | 95% | no |
| `android-legacy-security` | android | unknown | 67% | 100% | 33% | 100% | 100% | 80% | 90% | no |
| `android-legacy-state` | android | unknown | 100% | 100% | 0% | 100% | 100% | 70% | 85% | no |
| `android-navigation` | android | unknown | 33% | 100% | 67% | 100% | 100% | 60% | 80% | no |
| `android-navigation-3` | android | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `android-navigation-type-safe` | android | unknown | 100% | 67% | -33% | 86% | 100% | 100% | 100% | no |
| `android-networking` | android | unknown | 67% | 100% | 33% | 100% | 100% | 25% | 63% | no |
| `android-notifications` | android | unknown | 0% | 100% | 100% | 100% | 100% | 50% | 75% | no |
| `android-performance` | android | unknown | 0% | 100% | 100% | 100% | 100% | 70% | 85% | no |
| `android-persistence` | android | unknown | 100% | 100% | 0% | 100% | 100% | 50% | 75% | no |
| `android-resources` | android | governing-skill-v3 | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `android-security` | android | unknown | 67% | 100% | 33% | 100% | 100% | 40% | 70% | no |
| `android-state` | android | unknown | 67% | 100% | 33% | 100% | 100% | 10% | 55% | no |
| `android-testing` | android | unknown | 67% | 100% | 33% | 100% | 100% | 80% | 90% | no |
| `android-tooling` | android | unknown | 100% | 100% | 0% | 100% | 100% | 70% | 85% | no |
| `android-xml-views` | android | unknown | 100% | 100% | 0% | 100% | 100% | 70% | 85% | no |
| `angular-architecture` | angular | unknown | 17% | 17% | 0% | 73% | 100% | 100% | 100% | no |
| `angular-components` | angular | unknown | 11% | 56% | 44% | 65% | 100% | 100% | 100% | no |
| `angular-dependency-injection` | angular | unknown | 0% | 17% | 17% | 53% | 100% | 100% | 100% | no |
| `angular-directives-pipes` | angular | unknown | 17% | 33% | 17% | 73% | 100% | 100% | 100% | no |
| `angular-forms` | angular | governing-skill-v3 | 50% | 100% | 50% | 100% | 100% | 100% | 100% | no |
| `angular-http-client` | angular | governing-skill-v3 | 17% | 100% | 83% | 100% | 100% | 100% | 100% | no |
| `angular-performance` | angular | governing-skill-v3 | 50% | 100% | 50% | 100% | 100% | 100% | 100% | no |
| `angular-routing` | angular | governing-skill-v3 | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `angular-rxjs-interop` | angular | unknown | 50% | 50% | 0% | 82% | 100% | 100% | 100% | no |
| `angular-security` | angular | unknown | 0% | 17% | 17% | 43% | 100% | 100% | 100% | no |
| `angular-ssr` | angular | unknown | 50% | 83% | 33% | 95% | 100% | 100% | 100% | no |
| `angular-state-management` | angular | governing-skill-v3 | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `angular-style-guide` | angular | unknown | 0% | 0% | 0% | 44% | 100% | 100% | 100% | no |
| `angular-testing` | angular | unknown | 33% | 50% | 17% | 84% | 100% | 100% | 100% | no |
| `angular-tooling` | angular | unknown | 17% | 17% | 0% | 74% | 100% | 100% | 100% | no |
| `common-accessibility` | common | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `common-api-design` | common | unknown | 33% | 67% | 33% | 78% | 100% | 100% | 100% | no |
| `common-architecture-audit` | common | unknown | 67% | 67% | 0% | 83% | 100% | 100% | 100% | no |
| `common-architecture-diagramming` | common | unknown | 0% | 0% | 0% | 22% | 100% | 100% | 100% | no |
| `common-best-practices` | common | unknown | 33% | 33% | 0% | 67% | 100% | 100% | 100% | no |
| `common-business-requirements` | common | unknown | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `common-code-review` | common | governing-skill-v3 | 20% | 100% | 80% | 100% | 100% | 100% | 100% | yes |
| `common-context-optimization` | common | unknown | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `common-dast-tooling` | common | unknown | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `common-debugging` | common | unknown | 40% | 60% | 20% | 75% | 100% | 100% | 100% | yes |
| `common-documentation` | common | governing-skill-v3 | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `common-error-handling` | common | governing-skill-v3 | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `common-exploit-verification` | common | unknown | 50% | 0% | -50% | 50% | 100% | 100% | 100% | no |
| `common-feedback-reporter` | common | governing-skill-v3 | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `common-git-collaboration` | common | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `common-learning-log` | common | unknown | 0% | 33% | 33% | 67% | 100% | 100% | 100% | no |
| `common-llm-security` | common | unknown | 0% | 67% | 67% | 83% | 100% | 100% | 100% | no |
| `common-mobile-animation` | common | governing-skill-v3 | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `common-mobile-ux-core` | common | unknown | 0% | 0% | 0% | 44% | 100% | 100% | 100% | no |
| `common-mobile-visual-testing` | common | governing-skill-v3 | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `common-observability` | common | unknown | 0% | 0% | 0% | 33% | 100% | 100% | 100% | no |
| `common-operator-profile` | common | governing-skill-v3 | 50% | 100% | 50% | 100% | 100% | 100% | 100% | no |
| `common-owasp` | common | governing-skill-v3 | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `common-pentest-methodology` | common | unknown | 0% | 0% | 0% | 50% | 100% | 100% | 100% | no |
| `common-performance-engineering` | common | unknown | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `common-product-requirements` | common | governing-skill-v3 | 40% | 100% | 60% | 100% | 100% | 100% | 100% | no |
| `common-protocol-enforcement` | common | unknown | 0% | 20% | 20% | 64% | 100% | 100% | 100% | yes |
| `common-security-audit` | common | unknown | 33% | 67% | 33% | 83% | 100% | 100% | 100% | yes |
| `common-security-standards` | common | governing-skill-v3 | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `common-session-retrospective` | common | governing-skill-v3 | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `common-skill-creator` | common | unknown | 0% | 40% | 40% | 67% | 100% | 100% | 100% | yes |
| `common-software-requirements` | common | unknown | 0% | 67% | 67% | 86% | 100% | 100% | 100% | no |
| `common-store-changelog` | common | unknown | 0% | 25% | 25% | 73% | 100% | 100% | 100% | no |
| `common-system-design` | common | unknown | 0% | 0% | 0% | 33% | 100% | 75% | 88% | no |
| `common-tdd` | common | unknown | 0% | 40% | 40% | 58% | 100% | 100% | 100% | yes |
| `common-telemetry` | common | governing-skill-v3 | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `common-ui-design` | common | governing-skill-v3 | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `common-web-visual-testing` | common | governing-skill-v3 | 50% | 100% | 50% | 100% | 100% | 100% | 100% | no |
| `common-workflow-writing` | common | unknown | 0% | 50% | 50% | 75% | 100% | 100% | 100% | yes |
| `dart-best-practices` | dart | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `dart-language` | dart | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `dart-tooling` | dart | unknown | 67% | 100% | 33% | 100% | 100% | 75% | 88% | no |
| `database-migrations` | database | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `database-mongodb` | database | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `database-postgresql` | database | unknown | 67% | 0% | -67% | 43% | 100% | 100% | 100% | no |
| `database-query-performance` | database | unknown | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `database-redis` | database | unknown | 67% | 67% | 0% | 86% | 100% | 100% | 100% | no |
| `database-schema-design` | database | unknown | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `database-transactions` | database | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `flutter-auto-route-navigation` | flutter | unknown | 33% | 100% | 67% | 100% | 100% | 75% | 88% | no |
| `flutter-bloc-state-management` | flutter | governing-skill-v3 | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `flutter-cicd` | flutter | unknown | 67% | 67% | 0% | 88% | 100% | 100% | 100% | no |
| `flutter-concurrency` | flutter | unknown | 67% | 67% | 0% | 86% | 100% | 100% | 100% | no |
| `flutter-dependency-injection` | flutter | unknown | 33% | 33% | 0% | 71% | 100% | 100% | 100% | no |
| `flutter-design-system` | flutter | governing-skill-v3 | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `flutter-error-handling` | flutter | unknown | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `flutter-feature-based-clean-architecture` | flutter | governing-skill-v3 | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `flutter-getx-navigation` | flutter | unknown | 67% | 67% | 0% | 86% | 100% | 100% | 100% | no |
| `flutter-getx-state-management` | flutter | unknown | 33% | 67% | 33% | 71% | 100% | 75% | 88% | no |
| `flutter-go-router-navigation` | flutter | unknown | 33% | 67% | 33% | 88% | 100% | 75% | 88% | no |
| `flutter-idiomatic-flutter` | flutter | unknown | 0% | 0% | 0% | 50% | 0% | 75% | 38% | no |
| `flutter-layer-based-clean-architecture` | flutter | unknown | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `flutter-localization` | flutter | unknown | 33% | 33% | 0% | 43% | 100% | 25% | 63% | no |
| `flutter-navigation` | flutter | unknown | 0% | 33% | 33% | 50% | 100% | 25% | 63% | no |
| `flutter-notifications` | flutter | unknown | 33% | 33% | 0% | 50% | 100% | 50% | 75% | no |
| `flutter-performance` | flutter | unknown | 0% | 67% | 67% | 86% | 100% | 75% | 88% | no |
| `flutter-retrofit-networking` | flutter | unknown | 100% | 100% | 0% | 100% | 100% | 75% | 88% | no |
| `flutter-riverpod-state-management` | flutter | unknown | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `flutter-security` | flutter | unknown | 33% | 33% | 0% | 57% | 100% | 25% | 63% | no |
| `flutter-testing` | flutter | governing-skill-v3 | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `flutter-widgets` | flutter | unknown | 0% | 67% | 67% | 88% | 100% | 50% | 75% | no |
| `golang-api-server` | golang | unknown | 67% | 67% | 0% | 83% | 100% | 100% | 100% | no |
| `golang-architecture` | golang | unknown | 67% | 33% | -33% | 75% | 100% | 100% | 100% | no |
| `golang-concurrency` | golang | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `golang-configuration` | golang | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `golang-database` | golang | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `golang-error-handling` | golang | unknown | 67% | 67% | 0% | 83% | 100% | 100% | 100% | no |
| `golang-language` | golang | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `golang-logging` | golang | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `golang-security` | golang | unknown | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `golang-testing` | golang | unknown | 67% | 67% | 0% | 83% | 100% | 100% | 100% | no |
| `golang-tooling` | golang | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `ios-app-lifecycle` | ios | unknown | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `ios-architecture` | ios | unknown | 0% | 0% | 0% | 56% | 100% | 100% | 100% | no |
| `ios-dependency-injection` | ios | unknown | 0% | 33% | 33% | 75% | 100% | 100% | 100% | no |
| `ios-deployment` | ios | unknown | 0% | 67% | 67% | 88% | 100% | 100% | 100% | no |
| `ios-design-system` | ios | governing-skill-v3 | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `ios-localization` | ios | unknown | 0% | 0% | 0% | 50% | 100% | 100% | 100% | no |
| `ios-navigation` | ios | unknown | 0% | 33% | 33% | 56% | 100% | 100% | 100% | no |
| `ios-networking` | ios | unknown | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `ios-notifications` | ios | unknown | 0% | 33% | 33% | 67% | 100% | 100% | 100% | no |
| `ios-performance` | ios | unknown | 33% | 67% | 33% | 67% | 100% | 100% | 100% | no |
| `ios-persistence` | ios | unknown | 0% | 67% | 67% | 83% | 100% | 100% | 100% | no |
| `ios-security` | ios | unknown | 0% | 33% | 33% | 56% | 100% | 100% | 100% | no |
| `ios-state-management` | ios | unknown | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `ios-swiftui` | ios | unknown | 0% | 33% | 33% | 25% | 100% | 100% | 100% | no |
| `ios-ui-navigation` | ios | unknown | 0% | 33% | 33% | 67% | 100% | 100% | 100% | no |
| `java-best-practices` | java | unknown | 33% | 100% | 67% | 100% | 100% | 70% | 85% | no |
| `java-concurrency` | java | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `java-language` | java | unknown | 0% | 0% | 0% | 55% | 100% | 70% | 85% | no |
| `java-testing` | java | unknown | 33% | 67% | 33% | 88% | 100% | 50% | 75% | no |
| `java-tooling` | java | unknown | 100% | 100% | 0% | 100% | 100% | 80% | 90% | no |
| `javascript-best-practices` | javascript | unknown | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `javascript-language` | javascript | unknown | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `javascript-tooling` | javascript | governing-skill-v3 | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `kotlin-best-practices` | kotlin | unknown | 67% | 100% | 33% | 100% | 100% | 90% | 95% | no |
| `kotlin-coroutines` | kotlin | unknown | 33% | 67% | 33% | 88% | 100% | 60% | 80% | no |
| `kotlin-language` | kotlin | governing-skill-v3 | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `kotlin-tooling` | kotlin | unknown | 67% | 100% | 33% | 100% | 100% | 50% | 75% | no |
| `laravel-api` | laravel | unknown | 33% | 33% | 0% | 71% | 100% | 100% | 100% | no |
| `laravel-architecture` | laravel | unknown | 33% | 50% | 17% | 67% | 100% | 100% | 100% | no |
| `laravel-background-processing` | laravel | unknown | 0% | 83% | 83% | 97% | 100% | 100% | 100% | no |
| `laravel-clean-architecture` | laravel | unknown | 0% | 17% | 17% | 57% | 100% | 100% | 100% | no |
| `laravel-database-expert` | laravel | unknown | 17% | 17% | 0% | 72% | 100% | 100% | 100% | no |
| `laravel-eloquent` | laravel | unknown | 17% | 17% | 0% | 47% | 100% | 100% | 100% | no |
| `laravel-security` | laravel | governing-skill-v3 | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `laravel-sessions-middleware` | laravel | governing-skill-v3 | 83% | 100% | 17% | 100% | 100% | 100% | 100% | no |
| `laravel-testing` | laravel | unknown | 0% | 33% | 33% | 68% | 100% | 75% | 88% | no |
| `laravel-tooling` | laravel | unknown | 17% | 50% | 33% | 73% | 100% | 100% | 100% | no |
| `nestjs-api-standards` | nestjs | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `nestjs-architecture` | nestjs | unknown | 0% | 0% | 0% | 20% | 100% | 100% | 100% | no |
| `nestjs-bullmq` | nestjs | unknown | 0% | 0% | 0% | 64% | 100% | 100% | 100% | no |
| `nestjs-caching` | nestjs | unknown | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `nestjs-configuration` | nestjs | unknown | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `nestjs-controllers-services` | nestjs | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `nestjs-database` | nestjs | unknown | 100% | 67% | -33% | 83% | 100% | 67% | 83% | no |
| `nestjs-deployment` | nestjs | unknown | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `nestjs-documentation` | nestjs | unknown | 33% | 33% | 0% | 67% | 100% | 100% | 100% | no |
| `nestjs-error-handling` | nestjs | unknown | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `nestjs-file-uploads` | nestjs | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `nestjs-notification` | nestjs | unknown | 33% | 33% | 0% | 67% | 100% | 100% | 100% | no |
| `nestjs-observability` | nestjs | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `nestjs-performance` | nestjs | unknown | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `nestjs-real-time` | nestjs | unknown | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `nestjs-scheduling` | nestjs | unknown | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `nestjs-search` | nestjs | unknown | 33% | 0% | -33% | 50% | 100% | 100% | 100% | no |
| `nestjs-security` | nestjs | unknown | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `nestjs-security-isolation` | nestjs | unknown | 0% | 67% | 67% | 83% | 100% | 100% | 100% | no |
| `nestjs-testing` | nestjs | unknown | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `nestjs-transport` | nestjs | unknown | 67% | 67% | 0% | 83% | 100% | 100% | 100% | no |
| `nextjs-app-router` | nextjs | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `nextjs-architecture` | nextjs | unknown | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `nextjs-authentication` | nextjs | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `nextjs-caching` | nextjs | unknown | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `nextjs-data-access-layer` | nextjs | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `nextjs-data-fetching` | nextjs | unknown | 83% | 67% | -17% | 79% | 100% | 100% | 100% | no |
| `nextjs-i18n` | nextjs | unknown | 0% | 33% | 33% | 67% | 100% | 100% | 100% | no |
| `nextjs-optimization` | nextjs | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `nextjs-pages-router` | nextjs | unknown | 100% | 67% | -33% | 86% | 100% | 100% | 100% | no |
| `nextjs-rendering` | nextjs | unknown | 33% | 67% | 33% | 67% | 100% | 100% | 100% | no |
| `nextjs-security` | nextjs | unknown | 67% | 67% | 0% | 83% | 100% | 100% | 100% | no |
| `nextjs-server-actions` | nextjs | unknown | 50% | 33% | -17% | 62% | 100% | 100% | 100% | no |
| `nextjs-server-components` | nextjs | unknown | 17% | 0% | -17% | 25% | 100% | 100% | 100% | no |
| `nextjs-state-management` | nextjs | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `nextjs-styling` | nextjs | governing-skill-v3 | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `nextjs-testing` | nextjs | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `nextjs-tooling` | nextjs | unknown | 67% | 33% | -33% | 67% | 100% | 100% | 100% | no |
| `nextjs-upgrade` | nextjs | unknown | 0% | 67% | 67% | 83% | 100% | 100% | 100% | no |
| `php-best-practices` | php | unknown | 17% | 17% | 0% | 38% | 100% | 75% | 88% | no |
| `php-concurrency` | php | unknown | 33% | 50% | 17% | 62% | 100% | 100% | 100% | no |
| `php-error-handling` | php | unknown | 33% | 33% | 0% | 62% | 100% | 100% | 100% | no |
| `php-language` | php | unknown | 17% | 33% | 17% | 69% | 100% | 100% | 100% | no |
| `php-security` | php | unknown | 50% | 83% | 33% | 93% | 100% | 75% | 88% | no |
| `php-testing` | php | unknown | 33% | 50% | 17% | 75% | 100% | 100% | 100% | no |
| `php-tooling` | php | unknown | 33% | 50% | 17% | 64% | 100% | 100% | 100% | no |
| `python-architecture` | python | governing-skill-v3 | 50% | 100% | 50% | 100% | 100% | 100% | 100% | no |
| `python-async-runtime` | python | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `python-best-practices` | python | unknown | 50% | 100% | 50% | 100% | 100% | 100% | 100% | no |
| `python-database` | python | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `python-error-handling` | python | unknown | 50% | 100% | 50% | 100% | 100% | 100% | 100% | no |
| `python-language` | python | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `python-security` | python | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `python-testing` | python | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `python-tooling` | python | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `quality-engineering-appium-mcp` | quality-engineering | unknown | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `quality-engineering-business-analysis` | quality-engineering | governing-skill-v3 | 17% | 100% | 83% | 100% | 100% | 100% | 100% | no |
| `quality-engineering-jira-integration` | quality-engineering | governing-skill-v3 | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `quality-engineering-playwright-cli` | quality-engineering | unknown | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `quality-engineering-quality-assurance` | quality-engineering | governing-skill-v3 | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `quality-engineering-zephyr-coverage-analysis` | quality-engineering | unknown | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `quality-engineering-zephyr-test-generation` | quality-engineering | unknown | 0% | 100% | 100% | 100% | 100% | 100% | 100% | no |
| `react-component-patterns` | react | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `react-hooks` | react | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `react-performance` | react | unknown | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `react-security` | react | governing-skill-v3 | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `react-state-management` | react | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `react-testing` | react | unknown | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `react-tooling` | react | unknown | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `react-typescript` | react | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `react-native-architecture` | react-native | unknown | 0% | 0% | 0% | 40% | 100% | 100% | 100% | no |
| `react-native-components` | react-native | unknown | 0% | 0% | 0% | 44% | 100% | 100% | 100% | no |
| `react-native-deployment` | react-native | unknown | 33% | 33% | 0% | 78% | 100% | 100% | 100% | no |
| `react-native-dls` | react-native | unknown | 0% | 33% | 33% | 63% | 100% | 100% | 100% | no |
| `react-native-navigation` | react-native | unknown | 100% | 67% | -33% | 88% | 100% | 100% | 100% | no |
| `react-native-navigation-v6` | react-native | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `react-native-notifications` | react-native | unknown | 33% | 33% | 0% | 67% | 100% | 100% | 100% | no |
| `react-native-performance` | react-native | unknown | 0% | 67% | 67% | 88% | 100% | 100% | 100% | no |
| `react-native-platform-specific` | react-native | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `react-native-security` | react-native | unknown | 67% | 33% | -33% | 56% | 100% | 100% | 100% | no |
| `react-native-state-management` | react-native | unknown | 0% | 0% | 0% | 63% | 100% | 100% | 100% | no |
| `react-native-styling` | react-native | unknown | 33% | 0% | -33% | 67% | 100% | 100% | 100% | no |
| `react-native-testing` | react-native | unknown | 33% | 67% | 33% | 63% | 100% | 100% | 100% | no |
| `spring-boot-api-design` | spring-boot | unknown | 100% | 100% | 0% | 100% | 100% | 100% | 100% | no |
| `spring-boot-architecture` | spring-boot | unknown | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `spring-boot-best-practices` | spring-boot | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `spring-boot-data-access` | spring-boot | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `spring-boot-deployment` | spring-boot | unknown | 67% | 67% | 0% | 83% | 100% | 100% | 100% | no |
| `spring-boot-microservices` | spring-boot | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `spring-boot-observability` | spring-boot | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `spring-boot-scheduling` | spring-boot | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `spring-boot-security` | spring-boot | unknown | 67% | 100% | 33% | 100% | 100% | 100% | 100% | no |
| `spring-boot-testing` | spring-boot | unknown | 33% | 100% | 67% | 100% | 100% | 100% | 100% | no |
| `swift-best-practices` | swift | unknown | 0% | 0% | 0% | 33% | 100% | 100% | 100% | no |
| `swift-concurrency` | swift | governing-skill-v3 | 80% | 100% | 20% | 100% | 100% | 100% | 100% | no |
| `swift-error-handling` | swift | unknown | 50% | 75% | 25% | 88% | 100% | 100% | 100% | no |
| `swift-language` | swift | unknown | 0% | 20% | 20% | 56% | 100% | 100% | 100% | no |
| `swift-memory-management` | swift | governing-skill-v3 | 50% | 100% | 50% | 100% | 100% | 100% | 100% | no |
| `swift-swiftui` | swift | governing-skill-v3 | 50% | 100% | 50% | 100% | 100% | 100% | 100% | no |
| `swift-testing` | swift | unknown | 50% | 50% | 0% | 67% | 100% | 100% | 100% | no |
| `swift-tooling` | swift | unknown | 50% | 75% | 25% | 78% | 100% | 100% | 100% | no |
| `typescript-best-practices` | typescript | unknown | 33% | 67% | 33% | 83% | 100% | 100% | 100% | no |
| `typescript-language` | typescript | unknown | 67% | 67% | 0% | 67% | 100% | 100% | 100% | no |
| `typescript-security` | typescript | unknown | 60% | 40% | -20% | 64% | 100% | 100% | 100% | no |
| `typescript-tooling` | typescript | unknown | 67% | 100% | 33% | 100% | 100% | 67% | 83% | no |

## 🚫 Skills Below Strict Release Gate

These skills are not release-ready. Trigger accuracy alone does not make them ready.

| Skill | Category | Failures |
| --- | --- | --- |
| `android-architecture` | android | trigger specificity must reach 90% |
| `android-compose` | android | with-skill case pass must exceed 85% |
| `android-concurrency` | android | with-skill case pass must exceed 85%; trigger specificity must reach 90% |
| `android-design-system` | android | with-skill case pass must exceed 85% |
| `android-di` | android | with-skill case pass must exceed 85%; outcome delta must be non-negative; trigger specificity must reach 90% |
| `android-legacy-navigation` | android | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `android-legacy-security` | android | trigger specificity must reach 90% |
| `android-legacy-state` | android | trigger specificity must reach 90% |
| `android-navigation` | android | trigger specificity must reach 90% |
| `android-navigation-type-safe` | android | with-skill case pass must exceed 85%; outcome delta must be non-negative |
| `android-networking` | android | trigger specificity must reach 90% |
| `android-notifications` | android | trigger specificity must reach 90% |
| `android-performance` | android | trigger specificity must reach 90% |
| `android-persistence` | android | trigger specificity must reach 90% |
| `android-security` | android | trigger specificity must reach 90% |
| `android-state` | android | trigger specificity must reach 90% |
| `android-testing` | android | trigger specificity must reach 90% |
| `android-tooling` | android | trigger specificity must reach 90% |
| `android-xml-views` | android | trigger specificity must reach 90% |
| `angular-architecture` | angular | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `angular-components` | angular | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `angular-dependency-injection` | angular | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `angular-directives-pipes` | angular | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `angular-rxjs-interop` | angular | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `angular-security` | angular | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `angular-ssr` | angular | with-skill case pass must exceed 85% |
| `angular-style-guide` | angular | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `angular-testing` | angular | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `angular-tooling` | angular | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `common-api-design` | common | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `common-architecture-audit` | common | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `common-architecture-diagramming` | common | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `common-best-practices` | common | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `common-debugging` | common | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `common-exploit-verification` | common | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; outcome delta must be non-negative |
| `common-learning-log` | common | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `common-llm-security` | common | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `common-mobile-ux-core` | common | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `common-observability` | common | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `common-pentest-methodology` | common | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `common-protocol-enforcement` | common | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `common-security-audit` | common | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `common-skill-creator` | common | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `common-software-requirements` | common | with-skill case pass must exceed 85% |
| `common-store-changelog` | common | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `common-system-design` | common | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; trigger specificity must reach 90% |
| `common-tdd` | common | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `common-workflow-writing` | common | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `dart-tooling` | dart | trigger specificity must reach 90% |
| `database-postgresql` | database | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; outcome delta must be non-negative |
| `database-redis` | database | with-skill case pass must exceed 85% |
| `flutter-auto-route-navigation` | flutter | trigger specificity must reach 90% |
| `flutter-cicd` | flutter | with-skill case pass must exceed 85% |
| `flutter-concurrency` | flutter | with-skill case pass must exceed 85% |
| `flutter-dependency-injection` | flutter | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `flutter-getx-navigation` | flutter | with-skill case pass must exceed 85% |
| `flutter-getx-state-management` | flutter | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; trigger specificity must reach 90% |
| `flutter-go-router-navigation` | flutter | with-skill case pass must exceed 85%; trigger specificity must reach 90% |
| `flutter-idiomatic-flutter` | flutter | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; trigger recall must reach 90%; trigger specificity must reach 90% |
| `flutter-localization` | flutter | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; trigger specificity must reach 90% |
| `flutter-navigation` | flutter | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; trigger specificity must reach 90% |
| `flutter-notifications` | flutter | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; trigger specificity must reach 90% |
| `flutter-performance` | flutter | with-skill case pass must exceed 85%; trigger specificity must reach 90% |
| `flutter-retrofit-networking` | flutter | trigger specificity must reach 90% |
| `flutter-riverpod-state-management` | flutter | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `flutter-security` | flutter | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; trigger specificity must reach 90% |
| `flutter-widgets` | flutter | with-skill case pass must exceed 85%; trigger specificity must reach 90% |
| `golang-api-server` | golang | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `golang-architecture` | golang | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; outcome delta must be non-negative |
| `golang-error-handling` | golang | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `golang-testing` | golang | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `ios-architecture` | ios | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `ios-dependency-injection` | ios | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `ios-deployment` | ios | with-skill case pass must exceed 85% |
| `ios-localization` | ios | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `ios-navigation` | ios | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `ios-networking` | ios | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `ios-notifications` | ios | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `ios-performance` | ios | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `ios-persistence` | ios | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `ios-security` | ios | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `ios-state-management` | ios | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `ios-swiftui` | ios | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `ios-ui-navigation` | ios | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `java-best-practices` | java | trigger specificity must reach 90% |
| `java-language` | java | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; trigger specificity must reach 90% |
| `java-testing` | java | with-skill case pass must exceed 85%; trigger specificity must reach 90% |
| `java-tooling` | java | trigger specificity must reach 90% |
| `kotlin-coroutines` | kotlin | with-skill case pass must exceed 85%; trigger specificity must reach 90% |
| `kotlin-tooling` | kotlin | trigger specificity must reach 90% |
| `laravel-api` | laravel | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `laravel-architecture` | laravel | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `laravel-background-processing` | laravel | with-skill case pass must exceed 85% |
| `laravel-clean-architecture` | laravel | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `laravel-database-expert` | laravel | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `laravel-eloquent` | laravel | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `laravel-testing` | laravel | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; trigger specificity must reach 90% |
| `laravel-tooling` | laravel | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `nestjs-architecture` | nestjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `nestjs-bullmq` | nestjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `nestjs-configuration` | nestjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `nestjs-database` | nestjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; outcome delta must be non-negative; trigger specificity must reach 90% |
| `nestjs-documentation` | nestjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `nestjs-notification` | nestjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `nestjs-real-time` | nestjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `nestjs-scheduling` | nestjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `nestjs-search` | nestjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; outcome delta must be non-negative |
| `nestjs-security` | nestjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `nestjs-security-isolation` | nestjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `nestjs-testing` | nestjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `nestjs-transport` | nestjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `nextjs-caching` | nextjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `nextjs-data-fetching` | nextjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; outcome delta must be non-negative |
| `nextjs-i18n` | nextjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `nextjs-pages-router` | nextjs | with-skill case pass must exceed 85%; outcome delta must be non-negative |
| `nextjs-rendering` | nextjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `nextjs-security` | nextjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `nextjs-server-actions` | nextjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; outcome delta must be non-negative |
| `nextjs-server-components` | nextjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; outcome delta must be non-negative |
| `nextjs-tooling` | nextjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; outcome delta must be non-negative |
| `nextjs-upgrade` | nextjs | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `php-best-practices` | php | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; trigger specificity must reach 90% |
| `php-concurrency` | php | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `php-error-handling` | php | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `php-language` | php | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `php-security` | php | with-skill case pass must exceed 85%; trigger specificity must reach 90% |
| `php-testing` | php | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `php-tooling` | php | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `react-native-architecture` | react-native | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `react-native-components` | react-native | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `react-native-deployment` | react-native | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `react-native-dls` | react-native | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `react-native-navigation` | react-native | with-skill case pass must exceed 85%; outcome delta must be non-negative |
| `react-native-notifications` | react-native | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `react-native-performance` | react-native | with-skill case pass must exceed 85% |
| `react-native-security` | react-native | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; outcome delta must be non-negative |
| `react-native-state-management` | react-native | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `react-native-styling` | react-native | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; outcome delta must be non-negative |
| `react-native-testing` | react-native | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `react-testing` | react | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `react-tooling` | react | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `spring-boot-architecture` | spring-boot | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `spring-boot-deployment` | spring-boot | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `swift-best-practices` | swift | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `swift-error-handling` | swift | with-skill case pass must exceed 85% |
| `swift-language` | swift | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `swift-testing` | swift | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `swift-tooling` | swift | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `typescript-best-practices` | typescript | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `typescript-language` | typescript | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85% |
| `typescript-security` | typescript | with-skill case pass must exceed 85%; with-skill assertion pass must reach 85%; outcome delta must be non-negative |
| `typescript-tooling` | typescript | trigger specificity must reach 90% |

## 🧭 Residual Failure Matrix

This matrix records every failed non-baseline transcript arm for a skill below the strict gate. It is diagnostic evidence only; it does not alter immutable scores.

| Skill | Category | Case | Arm | Failed assertions |
| --- | --- | --- | --- | --- |
| `android-architecture` | android | `trigger-2` | with-skill | trigger marker expected no |
| `android-architecture` | android | `trigger-3` | with-skill | trigger marker expected no |
| `android-compose` | android | `eval-2` | with-skill | contains:hoist |
| `android-compose` | android | `trigger-10` | with-skill | trigger marker expected no |
| `android-concurrency` | android | `eval-2` | with-skill | contains:hardcode |
| `android-concurrency` | android | `trigger-4` | with-skill | trigger marker expected no |
| `android-concurrency` | android | `trigger-5` | with-skill | trigger marker expected no |
| `android-concurrency` | android | `trigger-6` | with-skill | trigger marker expected no |
| `android-concurrency` | android | `trigger-9` | with-skill | trigger marker expected no |
| `android-design-system` | android | `eval-1` | with-skill | contains:hardcode |
| `android-di` | android | `eval-2` | with-skill | contains:code |
| `android-di` | android | `trigger-11` | with-skill | trigger marker expected no |
| `android-di` | android | `trigger-3` | with-skill | trigger marker expected no |
| `android-di` | android | `trigger-5` | with-skill | trigger marker expected no |
| `android-di` | android | `trigger-6` | with-skill | trigger marker expected no |
| `android-di` | android | `trigger-9` | with-skill | trigger marker expected no |
| `android-legacy-navigation` | android | `eval-1` | with-skill | contains:SafeArgs; contains:NavDirections |
| `android-legacy-navigation` | android | `trigger-11` | with-skill | trigger marker expected no |
| `android-legacy-security` | android | `trigger-10` | with-skill | trigger marker expected no |
| `android-legacy-security` | android | `trigger-5` | with-skill | trigger marker expected no |
| `android-legacy-state` | android | `trigger-10` | with-skill | trigger marker expected no |
| `android-legacy-state` | android | `trigger-2` | with-skill | trigger marker expected no |
| `android-legacy-state` | android | `trigger-7` | with-skill | trigger marker expected no |
| `android-navigation` | android | `trigger-10` | with-skill | trigger marker expected no |
| `android-navigation` | android | `trigger-11` | with-skill | trigger marker expected no |
| `android-navigation` | android | `trigger-2` | with-skill | trigger marker expected no |
| `android-navigation` | android | `trigger-8` | with-skill | trigger marker expected no |
| `android-navigation-type-safe` | android | `eval-2` | with-skill | contains_any:Define ProductDetail(val productId,name |
| `android-networking` | android | `trigger-2` | with-skill | trigger marker expected no |
| `android-networking` | android | `trigger-3` | with-skill | trigger marker expected no |
| `android-networking` | android | `trigger-5` | with-skill | trigger marker expected no |
| `android-notifications` | android | `trigger-10` | with-skill | trigger marker expected no |
| `android-notifications` | android | `trigger-5` | with-skill | trigger marker expected no |
| `android-notifications` | android | `trigger-6` | with-skill | trigger marker expected no |
| `android-notifications` | android | `trigger-7` | with-skill | trigger marker expected no |
| `android-notifications` | android | `trigger-9` | with-skill | trigger marker expected no |
| `android-performance` | android | `trigger-2` | with-skill | trigger marker expected no |
| `android-performance` | android | `trigger-6` | with-skill | trigger marker expected no |
| `android-performance` | android | `trigger-7` | with-skill | trigger marker expected no |
| `android-persistence` | android | `trigger-11` | with-skill | trigger marker expected no |
| `android-persistence` | android | `trigger-5` | with-skill | trigger marker expected no |
| `android-persistence` | android | `trigger-6` | with-skill | trigger marker expected no |
| `android-persistence` | android | `trigger-7` | with-skill | trigger marker expected no |
| `android-persistence` | android | `trigger-8` | with-skill | trigger marker expected no |
| `android-security` | android | `trigger-10` | with-skill | trigger marker expected no |
| `android-security` | android | `trigger-11` | with-skill | trigger marker expected no |
| `android-security` | android | `trigger-3` | with-skill | trigger marker expected no |
| `android-security` | android | `trigger-4` | with-skill | trigger marker expected no |
| `android-security` | android | `trigger-5` | with-skill | trigger marker expected no |
| `android-security` | android | `trigger-9` | with-skill | trigger marker expected no |
| `android-state` | android | `trigger-10` | with-skill | trigger marker expected no |
| `android-state` | android | `trigger-11` | with-skill | trigger marker expected no |
| `android-state` | android | `trigger-2` | with-skill | trigger marker expected no |
| `android-state` | android | `trigger-3` | with-skill | trigger marker expected no |
| `android-state` | android | `trigger-4` | with-skill | trigger marker expected no |
| `android-state` | android | `trigger-5` | with-skill | trigger marker expected no |
| `android-state` | android | `trigger-7` | with-skill | trigger marker expected no |
| `android-state` | android | `trigger-8` | with-skill | trigger marker expected no |
| `android-state` | android | `trigger-9` | with-skill | trigger marker expected no |
| `android-testing` | android | `trigger-4` | with-skill | trigger marker expected no |
| `android-testing` | android | `trigger-9` | with-skill | trigger marker expected no |
| `android-tooling` | android | `trigger-10` | with-skill | trigger marker expected no |
| `android-tooling` | android | `trigger-8` | with-skill | trigger marker expected no |
| `android-tooling` | android | `trigger-9` | with-skill | trigger marker expected no |
| `android-xml-views` | android | `trigger-10` | with-skill | trigger marker expected no |
| `android-xml-views` | android | `trigger-11` | with-skill | trigger marker expected no |
| `android-xml-views` | android | `trigger-9` | with-skill | trigger marker expected no |
| `angular-architecture` | angular | `eval-1` | with-skill | contains:feature folder |
| `angular-architecture` | angular | `eval-3` | with-skill | contains:Eliminate NgModule |
| `angular-architecture` | angular | `eval-4` | with-skill | contains:inputs/outputs; contains:separates data concerns from rendering |
| `angular-architecture` | angular | `eval-5` | with-skill | contains:.then(m => |
| `angular-architecture` | angular | `eval-6` | with-skill | contains:Never put singletons in shared/ |
| `angular-components` | angular | `eval-2` | with-skill | contains:@if (condition); contains:@for (item of items; track item.id); contains:@empty { } |
| `angular-components` | angular | `eval-4` | with-skill | contains:Never use @HostBinding |
| `angular-components` | angular | `eval-6` | with-skill | contains:Signal inputs |
| `angular-components` | angular | `eval-7` | with-skill | contains:Smart (Container); contains:inputs and emit events via outputs |
| `angular-dependency-injection` | angular | `eval-1` | with-skill | contains:inject(MyService); contains:class fields or constructor-equivalent |
| `angular-dependency-injection` | angular | `eval-2` | with-skill | contains:provide: API_URL; contains:inject(API_URL) |
| `angular-dependency-injection` | angular | `eval-3` | with-skill | contains:providers: [MyService] |
| `angular-dependency-injection` | angular | `eval-5` | with-skill | contains:before app bootstrap |
| `angular-dependency-injection` | angular | `eval-6` | with-skill | contains:collects all multi providers; contains:HTTP_INTERCEPTORS |
| `angular-directives-pipes` | angular | `eval-1` | with-skill | contains:host: {} object; contains:not with @HostBinding |
| `angular-directives-pipes` | angular | `eval-3` | with-skill | contains:cache results; contains:not set pure: false |
| `angular-directives-pipes` | angular | `eval-4` | with-skill | contains:'(mouseenter)': 'show()' |
| `angular-directives-pipes` | angular | `eval-5` | with-skill | contains:imports array |
| `angular-rxjs-interop` | angular | `eval-2` | with-skill | contains:{{ users() }}; contains:httpResource() |
| `angular-rxjs-interop` | angular | `eval-4` | with-skill | contains:toSignal() |
| `angular-rxjs-interop` | angular | `eval-6` | with-skill | contains:toSignal() |
| `angular-security` | angular | `eval-1` | with-skill | contains:DomSanitizer.sanitize |
| `angular-security` | angular | `eval-2` | with-skill | contains:never as HTML |
| `angular-security` | angular | `eval-3` | with-skill | contains:nonce-based CSP; contains:script-src 'nonce-{nonce}' |
| `angular-security` | angular | `eval-5` | with-skill | contains:inject(Router).createUrlTree |
| `angular-security` | angular | `eval-6` | with-skill | contains:HttpOnly cookies; contains:not localStorage; contains:Never store API keys |
| `angular-ssr` | angular | `eval-4` | with-skill | contains_any:Never access window,access |
| `angular-style-guide` | angular | `eval-1` | with-skill | contains:PascalCase; contains:camelCase |
| `angular-style-guide` | angular | `eval-2` | with-skill | contains:app prefix |
| `angular-style-guide` | angular | `eval-3` | with-skill | contains:Identify files |
| `angular-style-guide` | angular | `eval-4` | with-skill | contains:No — do not use; contains:not recommended |
| `angular-style-guide` | angular | `eval-5` | with-skill | contains:public APIs |
| `angular-style-guide` | angular | `eval-6` | with-skill | contains:src/app/core/; contains:src/app/features/; contains:depth ≤3 levels |
| `angular-testing` | angular | `eval-1` | with-skill | contains:provideHttpClientTesting() |
| `angular-testing` | angular | `eval-2` | with-skill | contains:Never query by CSS class |
| `angular-testing` | angular | `eval-6` | with-skill | contains:native ESM |
| `angular-tooling` | angular | `eval-1` | with-skill | contains:never create files manually |
| `angular-tooling` | angular | `eval-2` | with-skill | contains:@angular/ssr |
| `angular-tooling` | angular | `eval-3` | with-skill | contains:angular.json budgets |
| `angular-tooling` | angular | `eval-4` | with-skill | contains:Never use --force |
| `angular-tooling` | angular | `eval-6` | with-skill | contains:angular.json |
| `common-api-design` | common | `eval-2` | with-skill | contains:PATCH; contains:POST /orders/:id/cancel |
| `common-architecture-audit` | common | `eval-3` | with-skill | contains:duplication |
| `common-architecture-diagramming` | common | `eval-1` | with-skill | contains:graph TD; contains:Use C4 Model |
| `common-architecture-diagramming` | common | `eval-2` | with-skill | contains:Use C4 Model; contains:Audience-Centric; contains:Select Type |
| `common-architecture-diagramming` | common | `eval-3` | with-skill | contains:Explicit Labels; contains:Consistent Notation |
| `common-best-practices` | common | `eval-2` | with-skill | contains:hardcoded |
| `common-best-practices` | common | `eval-3` | with-skill | contains:intention |
| `common-debugging` | common | `eval-3` | with-skill | contains_any:git bisect),name |
| `common-debugging` | common | `pressure-1` | with-skill | contains:reproduce; contains:one variable |
| `common-exploit-verification` | common | `eval-1` | with-skill | contains:false positive |
| `common-exploit-verification` | common | `eval-2` | with-skill | contains_any:Build the PoC,name |
| `common-learning-log` | common | `eval-1` | with-skill | contains:Iteration |
| `common-learning-log` | common | `eval-3` | with-skill | contains:trigger |
| `common-llm-security` | common | `eval-3` | with-skill | contains:sanitize |
| `common-mobile-ux-core` | common | `eval-1` | with-skill | contains:InputType |
| `common-mobile-ux-core` | common | `eval-2` | with-skill | contains:Touch Targets |
| `common-mobile-ux-core` | common | `eval-3` | with-skill | contains:Safe Areas; contains:Interactions; contains:Typography |
| `common-observability` | common | `eval-1` | with-skill | contains:<HTTP_METHOD> <route> |
| `common-observability` | common | `eval-2` | with-skill | contains:pino; contains:zap |
| `common-observability` | common | `eval-3` | with-skill | contains:GET /users/123; contains:Tracing; contains:JSON Logs |
| `common-pentest-methodology` | common | `eval-1` | with-skill | contains:No Exploit |
| `common-pentest-methodology` | common | `eval-2` | with-skill | contains:No Production Testing |
| `common-protocol-enforcement` | common | `eval-2` | with-skill | contains:Anti-Patterns; contains:active skills |
| `common-protocol-enforcement` | common | `eval-3` | with-skill | contains:design tokens |
| `common-protocol-enforcement` | common | `pressure-1` | with-skill | contains:evidence |
| `common-protocol-enforcement` | common | `pressure-2` | with-skill | contains:active skill |
| `common-security-audit` | common | `eval-2` | with-skill | contains:-25 |
| `common-skill-creator` | common | `eval-1` | with-skill | contains:TEMPLATE; contains:evals |
| `common-skill-creator` | common | `eval-2` | with-skill | contains:100 lines |
| `common-skill-creator` | common | `pressure-2` | with-skill | contains:should_not_trigger |
| `common-software-requirements` | common | `eval-3` | with-skill | contains:plan-feature |
| `common-store-changelog` | common | `eval-2` | with-skill | contains:Bug fixes |
| `common-store-changelog` | common | `eval-3` | with-skill | contains:[Fixed] |
| `common-store-changelog` | common | `eval-4` | with-skill | contains:performance improvements |
| `common-system-design` | common | `eval-1` | with-skill | contains:Divide into distinct sections per concern; contains:SoC; contains:SSOT |
| `common-system-design` | common | `eval-2` | with-skill | contains:Fail Fast; contains:High Cohesion |
| `common-system-design` | common | `eval-3` | with-skill | contains:Event-Driven |
| `common-system-design` | common | `trigger-2` | with-skill | trigger marker expected no |
| `common-tdd` | common | `eval-2` | with-skill | contains:Iron Law; contains:delete |
| `common-tdd` | common | `pressure-1` | with-skill | contains:delete; contains:restart |
| `common-tdd` | common | `pressure-2` | with-skill | contains:not enough |
| `common-workflow-writing` | common | `eval-1` | with-skill | contains:80 lines |
| `common-workflow-writing` | common | `eval-3` | with-skill | contains:extract |
| `dart-tooling` | dart | `trigger-4` | with-skill | trigger marker expected no |
| `database-postgresql` | database | `eval-1` | with-skill | contains:synchronize |
| `database-postgresql` | database | `eval-2` | with-skill | contains:query builder |
| `database-postgresql` | database | `eval-3` | with-skill | contains:queryRunner; contains_any:Explains ENABLE ROW LEVEL SECURITY,name |
| `database-redis` | database | `eval-3` | with-skill | contains:lazyfree |
| `flutter-auto-route-navigation` | flutter | `trigger-4` | with-skill | trigger marker expected no |
| `flutter-cicd` | flutter | `eval-2` | with-skill | contains:run analyze/format |
| `flutter-concurrency` | flutter | `eval-3` | with-skill | contains:Dart Concurrency and Isolates |
| `flutter-dependency-injection` | flutter | `eval-1` | with-skill | contains:abstract interface |
| `flutter-dependency-injection` | flutter | `eval-2` | with-skill | contains:Dependency Injection |
| `flutter-getx-navigation` | flutter | `eval-1` | with-skill | contains:GetX |
| `flutter-getx-state-management` | flutter | `eval-2` | with-skill | contains:Avoid; contains:disposal. Avoid |
| `flutter-getx-state-management` | flutter | `trigger-5` | with-skill | trigger marker expected no |
| `flutter-go-router-navigation` | flutter | `eval-2` | with-skill | contains:redirect callback |
| `flutter-go-router-navigation` | flutter | `trigger-5` | with-skill | trigger marker expected no |
| `flutter-idiomatic-flutter` | flutter | `eval-1` | with-skill | contains:BuildContext; contains:before using |
| `flutter-idiomatic-flutter` | flutter | `eval-2` | with-skill | contains:into small |
| `flutter-idiomatic-flutter` | flutter | `eval-3` | with-skill | contains:for simple |
| `flutter-idiomatic-flutter` | flutter | `trigger-1` | with-skill | trigger marker expected yes |
| `flutter-idiomatic-flutter` | flutter | `trigger-2` | with-skill | trigger marker expected no |
| `flutter-localization` | flutter | `eval-1` | with-skill | contains:easy_localization with; contains:CSV format |
| `flutter-localization` | flutter | `eval-3` | with-skill | contains_any:Use 'cartitems',name; contains:Localization |
| `flutter-localization` | flutter | `trigger-2` | with-skill | trigger marker expected no |
| `flutter-localization` | flutter | `trigger-3` | with-skill | trigger marker expected no |
| `flutter-localization` | flutter | `trigger-5` | with-skill | trigger marker expected no |
| `flutter-navigation` | flutter | `eval-1` | with-skill | contains:AndroidManifest; contains:iOS URL-type |
| `flutter-navigation` | flutter | `eval-2` | with-skill | contains:Android |
| `flutter-navigation` | flutter | `trigger-3` | with-skill | trigger marker expected no |
| `flutter-navigation` | flutter | `trigger-4` | with-skill | trigger marker expected no |
| `flutter-navigation` | flutter | `trigger-5` | with-skill | trigger marker expected no |
| `flutter-notifications` | flutter | `eval-1` | with-skill | contains:handle all |
| `flutter-notifications` | flutter | `eval-3` | with-skill | contains:dialog explaining; contains:explaining benefits |
| `flutter-notifications` | flutter | `trigger-2` | with-skill | trigger marker expected no |
| `flutter-notifications` | flutter | `trigger-5` | with-skill | trigger marker expected no |
| `flutter-performance` | flutter | `eval-3` | with-skill | contains_any:not original resolution,name |
| `flutter-performance` | flutter | `trigger-3` | with-skill | trigger marker expected no |
| `flutter-retrofit-networking` | flutter | `trigger-3` | with-skill | trigger marker expected no |
| `flutter-riverpod-state-management` | flutter | `eval-1` | with-skill | contains:AsyncNotifier |
| `flutter-security` | flutter | `eval-1` | with-skill | contains_any:No — use fluttersecurestorage instead,name |
| `flutter-security` | flutter | `eval-3` | with-skill | contains:SSL pinning; contains:root detection |
| `flutter-security` | flutter | `trigger-2` | with-skill | trigger marker expected no |
| `flutter-security` | flutter | `trigger-4` | with-skill | trigger marker expected no |
| `flutter-security` | flutter | `trigger-5` | with-skill | trigger marker expected no |
| `flutter-widgets` | flutter | `eval-1` | with-skill | contains:interactive elements |
| `flutter-widgets` | flutter | `trigger-3` | with-skill | trigger marker expected no |
| `flutter-widgets` | flutter | `trigger-4` | with-skill | trigger marker expected no |
| `golang-api-server` | golang | `eval-3` | with-skill | contains:constructor |
| `golang-architecture` | golang | `eval-2` | with-skill | contains:inject |
| `golang-architecture` | golang | `eval-3` | with-skill | contains:single |
| `golang-error-handling` | golang | `eval-3` | with-skill | contains:log |
| `golang-testing` | golang | `eval-3` | with-skill | contains:Use t |
| `ios-architecture` | ios | `eval-1` | with-skill | contains:UIImage |
| `ios-architecture` | ios | `eval-2` | with-skill | contains:public var |
| `ios-architecture` | ios | `eval-3` | with-skill | contains:Inputs/Outputs; contains:ViewModel Responsibility |
| `ios-dependency-injection` | ios | `eval-2` | with-skill | contains_any:Abstractions,name |
| `ios-dependency-injection` | ios | `eval-3` | with-skill | contains:Swinject |
| `ios-deployment` | ios | `eval-2` | with-skill | contains_any:Info.plist,info |
| `ios-localization` | ios | `eval-1` | with-skill | contains:String(localized: "key") |
| `ios-localization` | ios | `eval-2` | with-skill | contains:Formatted; contains_any:Native Implementation,implementation |
| `ios-localization` | ios | `eval-3` | with-skill | contains:Pluralization |
| `ios-navigation` | ios | `eval-2` | with-skill | contains:WindowGroup; contains:applinks; contains:TabItem |
| `ios-navigation` | ios | `eval-3` | with-skill | contains:guard let |
| `ios-networking` | ios | `eval-3` | with-skill | contains:MainActor |
| `ios-notifications` | ios | `eval-2` | with-skill | contains:.sound |
| `ios-notifications` | ios | `eval-3` | with-skill | contains:Framework; contains:Permissions |
| `ios-performance` | ios | `eval-2` | with-skill | contains:Kingfisher; contains:AsyncImage; contains:SWIFT_TREAT_WARNINGS_AS_ERRORS |
| `ios-persistence` | ios | `eval-3` | with-skill | contains:mergePolicy |
| `ios-security` | ios | `eval-2` | with-skill | contains:SecItemDelete; contains:kSecClassGenericPassword; contains:LocalAuthentication |
| `ios-security` | ios | `eval-3` | with-skill | contains_any:Info.plist,info |
| `ios-state-management` | ios | `eval-2` | with-skill | contains:cancellables |
| `ios-swiftui` | ios | `eval-1` | with-skill | contains:@State for local simple data; contains:VMs marked \`@Observable\`; contains:Small, composable structs |
| `ios-swiftui` | ios | `eval-2` | with-skill | contains:body property computationally cheap; contains:No Logic in Body; contains:Main Actor |
| `ios-ui-navigation` | ios | `eval-2` | with-skill | contains:UIViewRepresentable |
| `ios-ui-navigation` | ios | `eval-3` | with-skill | contains:UIViewControllerRepresentable; contains:UIStackView |
| `java-best-practices` | java | `trigger-4` | with-skill | trigger marker expected no |
| `java-best-practices` | java | `trigger-5` | with-skill | trigger marker expected no |
| `java-best-practices` | java | `trigger-6` | with-skill | trigger marker expected no |
| `java-language` | java | `eval-1` | with-skill | contains:Lombok; contains:DTOs/Value Objects |
| `java-language` | java | `eval-2` | with-skill | contains:if/else chains |
| `java-language` | java | `eval-3` | with-skill | contains:sealed interface/class; contains:exhaustive switch |
| `java-language` | java | `trigger-10` | with-skill | trigger marker expected no |
| `java-language` | java | `trigger-6` | with-skill | trigger marker expected no |
| `java-language` | java | `trigger-9` | with-skill | trigger marker expected no |
| `java-testing` | java | `eval-3` | with-skill | contains:IT.java |
| `java-testing` | java | `trigger-10` | with-skill | trigger marker expected no |
| `java-testing` | java | `trigger-11` | with-skill | trigger marker expected no |
| `java-testing` | java | `trigger-4` | with-skill | trigger marker expected no |
| `java-testing` | java | `trigger-7` | with-skill | trigger marker expected no |
| `java-testing` | java | `trigger-9` | with-skill | trigger marker expected no |
| `java-tooling` | java | `trigger-10` | with-skill | trigger marker expected no |
| `java-tooling` | java | `trigger-11` | with-skill | trigger marker expected no |
| `kotlin-coroutines` | kotlin | `eval-3` | with-skill | contains:hardcode |
| `kotlin-coroutines` | kotlin | `trigger-11` | with-skill | trigger marker expected no |
| `kotlin-coroutines` | kotlin | `trigger-4` | with-skill | trigger marker expected no |
| `kotlin-coroutines` | kotlin | `trigger-5` | with-skill | trigger marker expected no |
| `kotlin-coroutines` | kotlin | `trigger-7` | with-skill | trigger marker expected no |
| `kotlin-tooling` | kotlin | `trigger-2` | with-skill | trigger marker expected no |
| `kotlin-tooling` | kotlin | `trigger-5` | with-skill | trigger marker expected no |
| `kotlin-tooling` | kotlin | `trigger-6` | with-skill | trigger marker expected no |
| `kotlin-tooling` | kotlin | `trigger-8` | with-skill | trigger marker expected no |
| `kotlin-tooling` | kotlin | `trigger-9` | with-skill | trigger marker expected no |
| `laravel-api` | laravel | `eval-1` | with-skill | contains:ApiResource; contains:JsonResource; contains:UserResource |
| `laravel-api` | laravel | `eval-2` | with-skill | contains:toArray() |
| `laravel-api` | laravel | `eval-4` | with-skill | contains:AppServiceProvider |
| `laravel-api` | laravel | `eval-5` | with-skill | contains:routes/api.php |
| `laravel-architecture` | laravel | `eval-2` | with-skill | contains:handle() |
| `laravel-architecture` | laravel | `eval-5` | with-skill | contains:No logic in; contains:Service Container |
| `laravel-architecture` | laravel | `eval-6` | with-skill | contains:constructor |
| `laravel-background-processing` | laravel | `eval-1` | with-skill | contains:model ID |
| `laravel-clean-architecture` | laravel | `eval-1` | with-skill | contains:Eloquent queries in Controllers; contains:Action classes |
| `laravel-clean-architecture` | laravel | `eval-2` | with-skill | contains:pass between layers |
| `laravel-clean-architecture` | laravel | `eval-3` | with-skill | contains:Contracts/OrderRepository interface; contains:inject interface |
| `laravel-clean-architecture` | laravel | `eval-4` | with-skill | contains:Group by business domain; contains:User, Order, Payment; contains:not by type; contains:Controllers, Models |
| `laravel-clean-architecture` | laravel | `eval-5` | with-skill | contains:Controller → Action → Repository Interface → Eloquent; contains:no Eloquent in Controller; contains:DTOs cross boundaries; contains:bind interfaces to implementations |
| `laravel-database-expert` | laravel | `eval-1` | with-skill | contains:selectRaw; contains:DB::raw |
| `laravel-database-expert` | laravel | `eval-2` | with-skill | contains:grouped invalidation |
| `laravel-database-expert` | laravel | `eval-3` | with-skill | contains:INSERT/UPDATE/DELETE; contains:no code changes needed |
| `laravel-database-expert` | laravel | `eval-5` | with-skill | contains:correlated subqueries |
| `laravel-database-expert` | laravel | `eval-6` | with-skill | contains:withAvg; contains:aggregates; contains:DB::raw |
| `laravel-eloquent` | laravel | `eval-1` | with-skill | contains:Eloquent::preventLazyLoading; contains:N+1 Prevention; contains:never in loops |
| `laravel-eloquent` | laravel | `eval-2` | with-skill | contains:Eager Loading; contains:LazyLoadingViolationException |
| `laravel-eloquent` | laravel | `eval-3` | with-skill | contains:reusable query filters; contains:Reusable Scopes |
| `laravel-eloquent` | laravel | `eval-5` | with-skill | contains:Mass Assignment |
| `laravel-eloquent` | laravel | `eval-6` | with-skill | contains:Eloquent::preventLazyLoading |
| `laravel-testing` | laravel | `eval-2` | with-skill | contains:database rolled back |
| `laravel-testing` | laravel | `eval-3` | with-skill | contains:never DB::table()->insert() |
| `laravel-testing` | laravel | `eval-4` | with-skill | contains:once()->with(100); contains:never make real network calls |
| `laravel-testing` | laravel | `eval-6` | with-skill | contains:DB_CONNECTION' value='sqlite; contains:DB_DATABASE' value=':memory; contains:phpunit.xml |
| `laravel-testing` | laravel | `trigger-2` | with-skill | trigger marker expected no |
| `laravel-tooling` | laravel | `eval-3` | with-skill | contains:preset: 'laravel' |
| `laravel-tooling` | laravel | `eval-5` | with-skill | contains:Remove laravel-mix; contains:replace mix() with vite() |
| `laravel-tooling` | laravel | `eval-6` | with-skill | contains:Vite (not Mix); contains:@vite directive; contains:npm run build for production |
| `nestjs-architecture` | nestjs | `eval-1` | with-skill | contains:Feature Modules (Auth) vs Core (Config/DB) vs Shared (Utils); contains:circular dependencies; contains:madge |
| `nestjs-architecture` | nestjs | `eval-2` | with-skill | contains:Thin controllers, fat services; contains:Don't return ORM entities; contains:No business in Controller; contains:Move logic to Service |
| `nestjs-architecture` | nestjs | `eval-3` | with-skill | contains:Dependency Integrity |
| `nestjs-bullmq` | nestjs | `eval-1` | with-skill | contains:try |
| `nestjs-bullmq` | nestjs | `eval-2` | with-skill | contains:removeOnComplete |
| `nestjs-bullmq` | nestjs | `eval-3` | with-skill | contains:ThrottlerGuard; contains:fail-open |
| `nestjs-configuration` | nestjs | `eval-3` | with-skill | contains_any:get('KEY'),name |
| `nestjs-database` | nestjs | `eval-3` | with-skill | contains:atomic |
| `nestjs-database` | nestjs | `trigger-3` | with-skill | trigger marker expected no |
| `nestjs-documentation` | nestjs | `eval-1` | with-skill | contains:nest-cli.json |
| `nestjs-documentation` | nestjs | `eval-3` | with-skill | contains:ApiTags |
| `nestjs-notification` | nestjs | `eval-1` | with-skill | contains:try/catch |
| `nestjs-notification` | nestjs | `eval-3` | with-skill | contains:minimal |
| `nestjs-real-time` | nestjs | `eval-1` | with-skill | contains:bi-directional |
| `nestjs-scheduling` | nestjs | `eval-2` | with-skill | contains:crash |
| `nestjs-search` | nestjs | `eval-1` | with-skill | contains:dual write |
| `nestjs-search` | nestjs | `eval-2` | with-skill | contains:CQRS |
| `nestjs-search` | nestjs | `eval-3` | with-skill | contains:Docker |
| `nestjs-security` | nestjs | `eval-2` | with-skill | contains:APP_GUARD |
| `nestjs-security-isolation` | nestjs | `eval-1` | with-skill | contains:Row Level Security |
| `nestjs-testing` | nestjs | `eval-2` | with-skill | contains:Docker |
| `nestjs-transport` | nestjs | `eval-2` | with-skill | contains:RpcExceptionFilter |
| `nextjs-caching` | nextjs | `eval-3` | with-skill | contains:memoization |
| `nextjs-data-fetching` | nextjs | `eval-1` | with-skill | contains:fetch(url |
| `nextjs-data-fetching` | nextjs | `eval-5` | with-skill | contains:await db.; contains:select: |
| `nextjs-i18n` | nextjs | `eval-2` | with-skill | contains:hardcoded |
| `nextjs-i18n` | nextjs | `eval-3` | with-skill | contains:sub-path |
| `nextjs-pages-router` | nextjs | `eval-3` | with-skill | contains_any:{ posts },posts |
| `nextjs-pages-router` | nextjs | `eval-4` | with-skill | contains_any:access via router,access |
| `nextjs-rendering` | nextjs | `eval-3` | with-skill | contains:hydration; contains:mounted |
| `nextjs-security` | nextjs | `eval-1` | with-skill | contains:auth() |
| `nextjs-server-actions` | nextjs | `eval-2` | with-skill | contains:action={createPost}; contains:revalidatePath |
| `nextjs-server-actions` | nextjs | `eval-4` | with-skill | contains:z.object({ |
| `nextjs-server-actions` | nextjs | `eval-5` | with-skill | contains:action={action} |
| `nextjs-server-actions` | nextjs | `eval-6` | with-skill | contains_any:at end of successful Server Action call redirect('/success'),server |
| `nextjs-server-components` | nextjs | `eval-1` | with-skill | contains:leaf nodes; contains:maximise RSC benefits |
| `nextjs-server-components` | nextjs | `eval-2` | with-skill | contains:'use client'; contains_any:// Page,page |
| `nextjs-server-components` | nextjs | `eval-3` | with-skill | contains:await db.; contains:await params |
| `nextjs-server-components` | nextjs | `eval-4` | with-skill | contains:Client Component-only hooks |
| `nextjs-server-components` | nextjs | `eval-5` | with-skill | not_contains:NEXT_PUBLIC_ |
| `nextjs-server-components` | nextjs | `eval-6` | with-skill | contains:zero JS |
| `nextjs-tooling` | nextjs | `eval-2` | with-skill | contains:Docker |
| `nextjs-tooling` | nextjs | `eval-3` | with-skill | contains:Zod |
| `nextjs-upgrade` | nextjs | `eval-3` | with-skill | contains:one major |
| `php-best-practices` | php | `eval-1` | with-skill | contains:opening braces on same line |
| `php-best-practices` | php | `eval-2` | with-skill | contains_any:SRP:,name; contains:inject dependencies via constructor |
| `php-best-practices` | php | `eval-3` | with-skill | contains:extract each into its own focused class; contains:inject via constructor |
| `php-best-practices` | php | `eval-4` | with-skill | contains:if (!$user) return null; contains:no else after return |
| `php-best-practices` | php | `eval-5` | with-skill | contains:Define trait |
| `php-best-practices` | php | `trigger-2` | with-skill | trigger marker expected no |
| `php-concurrency` | php | `eval-2` | with-skill | contains:Fiber::suspend; not_contains:file_get_contents |
| `php-concurrency` | php | `eval-3` | with-skill | contains_any:Install react/event-loop,name |
| `php-concurrency` | php | `eval-6` | with-skill | contains:separate PDO connections per Fiber; contains:avoid shared mutable state |
| `php-error-handling` | php | `eval-2` | with-skill | contains:DomainException |
| `php-error-handling` | php | `eval-3` | with-skill | contains_any:httpresponsecode(500),name |
| `php-error-handling` | php | `eval-5` | with-skill | contains_any:call $logger-error($e-getMessage(),name |
| `php-error-handling` | php | `eval-6` | with-skill | contains_any:try { $conn = connect(),conn; contains_any:$conn-query(),name |
| `php-language` | php | `eval-1` | with-skill | contains:match($status) |
| `php-language` | php | `eval-2` | with-skill | contains:public readonly string $name |
| `php-language` | php | `eval-4` | with-skill | contains:public function __construct(public string $name |
| `php-language` | php | `eval-6` | with-skill | contains:name: 'John' |
| `php-security` | php | `eval-1` | with-skill | contains:$stmt->execute |
| `php-security` | php | `trigger-3` | with-skill | trigger marker expected no |
| `php-testing` | php | `eval-2` | with-skill | contains_any:Use dataset for data-driven tests,dataset |
| `php-testing` | php | `eval-3` | with-skill | contains:independent |
| `php-testing` | php | `eval-4` | with-skill | contains_any:Define a static method returning test cases as arrays,method |
| `php-tooling` | php | `eval-1` | with-skill | contains:composer require --dev phpstan/phpstan; contains:paths: [src] |
| `php-tooling` | php | `eval-2` | with-skill | contains:composer require --dev friendsofphp/php-cs-fixer; contains:php-cs-fixer |
| `php-tooling` | php | `eval-3` | with-skill | contains_any:Always commit composer,always |
| `react-testing` | react | `eval-2` | with-skill | contains_any:Violation,name |
| `react-tooling` | react | `eval-1` | with-skill | contains:re-render |
| `react-native-architecture` | react-native | `eval-1` | with-skill | contains:absolute imports; contains:tsconfig.json paths |
| `react-native-architecture` | react-native | `eval-2` | with-skill | contains:extract to hooks; contains:Single Responsibility; contains:one clear purpose |
| `react-native-architecture` | react-native | `eval-3` | with-skill | contains:web-parity |
| `react-native-components` | react-native | `eval-1` | with-skill | contains:TypeScript |
| `react-native-components` | react-native | `eval-2` | with-skill | contains:data fetching |
| `react-native-components` | react-native | `eval-3` | with-skill | contains:Define; contains:nested component; contains:top level. |
| `react-native-deployment` | react-native | `eval-1` | with-skill | contains:Microsoft |
| `react-native-deployment` | react-native | `eval-2` | with-skill | contains:Xcode |
| `react-native-dls` | react-native | `eval-1` | with-skill | contains:Enforce |
| `react-native-dls` | react-native | `eval-3` | with-skill | contains:Reference; contains:theme tokens |
| `react-native-navigation` | react-native | `eval-2` | with-skill | contains:Handle |
| `react-native-notifications` | react-native | `eval-2` | with-skill | contains:before requesting; contains:requesting system |
| `react-native-notifications` | react-native | `eval-3` | with-skill | contains:React |
| `react-native-performance` | react-native | `eval-3` | with-skill | contains:Android |
| `react-native-security` | react-native | `eval-1` | with-skill | contains:Android |
| `react-native-security` | react-native | `eval-2` | with-skill | contains:Warn; contains:Only; contains:requires app |
| `react-native-state-management` | react-native | `eval-1` | with-skill | contains:Provider |
| `react-native-state-management` | react-native | `eval-2` | with-skill | contains:React Query |
| `react-native-state-management` | react-native | `eval-3` | with-skill | contains:React |
| `react-native-styling` | react-native | `eval-1` | with-skill | contains:Inline style |
| `react-native-styling` | react-native | `eval-2` | with-skill | contains:percentage widths |
| `react-native-styling` | react-native | `eval-3` | with-skill | contains:Centralize |
| `react-native-testing` | react-native | `eval-3` | with-skill | contains:Integration; contains:RNTL; contains:test behavior |
| `spring-boot-architecture` | spring-boot | `eval-3` | with-skill | contains:@Service |
| `spring-boot-deployment` | spring-boot | `eval-1` | with-skill | contains:multi-stage |
| `swift-best-practices` | swift | `eval-1` | with-skill | contains:nested if |
| `swift-best-practices` | swift | `eval-2` | with-skill | contains:Default to struct |
| `swift-best-practices` | swift | `eval-3` | with-skill | contains:for-where; contains:clear names; contains:default to let |
| `swift-best-practices` | swift | `eval-4` | with-skill | contains:is, has, or can; contains:isValid; contains:canEdit |
| `swift-error-handling` | swift | `eval-4` | with-skill | contains:Never for expected |
| `swift-language` | swift | `eval-1` | with-skill | contains:Never force unwrap |
| `swift-language` | swift | `eval-2` | with-skill | contains:blueprint; contains:value types |
| `swift-language` | swift | `eval-3` | with-skill | contains:extension MyType: MyProtocol |
| `swift-language` | swift | `eval-5` | with-skill | contains:Default to struct; contains:value semantics; contains:reference identity |
| `swift-testing` | swift | `eval-1` | with-skill | contains:prefixed by 'test' |
| `swift-testing` | swift | `eval-4` | with-skill | contains:Use protocols; contains:Inject them via constructor |
| `swift-tooling` | swift | `eval-4` | with-skill | contains:triple slashes; contains:documentation comments |
| `typescript-best-practices` | typescript | `eval-2` | with-skill | contains:async/await |
| `typescript-language` | typescript | `eval-2` | with-skill | contains:Discriminated Union; contains:kind |
| `typescript-security` | typescript | `eval-2` | with-skill | contains:environment variable |
| `typescript-security` | typescript | `eval-4` | with-skill | contains:injection; contains:args |
| `typescript-security` | typescript | `eval-5` | with-skill | contains:allowlist |
| `typescript-tooling` | typescript | `trigger-2` | with-skill | trigger marker expected no |

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
| `nextjs-tooling` | nextjs | -33% |
| `react-native-navigation` | react-native | -33% |
| `react-native-security` | react-native | -33% |
| `react-native-styling` | react-native | -33% |
| `typescript-security` | typescript | -20% |

## 💰 Task Economics

> Per-attempt usage joined to its outcome, so parent, worker, review and failed/retried/interrupted/cancelled attempts stay in task-cost accounting. A missing usage sample is unmetered and unknown, never zero. Executed lanes are worker attempts only, so this report records the observed actor coverage and withholds monetary savings until a full declared actor inventory (parent, workers, review, integration, auxiliary) is certified for a single task scope, both cohorts are fully metered and priced, and the baseline provenance is explicit.

| Run | Model | Attempts | Outcomes | Actors observed | Unknown actors | Metered | Unmetered | Tokens | Est. USD | Savings vs baseline |
| --- | --- | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |
| all-v2.6.0 | GPT-5 + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna + gpt-5.6-luna | 0 | unavailable | 0 | 0 | 0 | 0 | unavailable | unavailable | withheld: no per-attempt usage recorded |

## 🛡️ How to Verify This Report

1. `pnpm evals:verify -- --all` — re-score committed transcripts from each run's immutable `inputs.json` snapshot.
2. `pnpm evals:report` — regenerate the deterministic category projection, history, and archive.
3. Root, CLI, and MCP verification must report the same result for the same run.
