# Changelog

All notable changes to the Programming Languages and Frameworks Agent Skills will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-15

### Added

#### Flutter Skills (9 categories)

- **architecture.md** (P0) - Clean Architecture with DDD, layer separation, dependency flow
- **state-management.md** (P0) - BLoC/Cubit patterns, Freezed, event transformers
- **security.md** (P0) - OWASP Mobile Top 10 (2024), PII masking, secure storage
- **widgets.md** (P1) - Smart/dumb widgets, decomposition, const constructors
- **dependency-injection.md** (P1) - GetIt patterns, service locator, testing
- **error-handling.md** (P1) - Either pattern, typed failures, recovery strategies
- **performance.md** (P1) - Profiling, optimization, caching, rendering
- **testing.md** (P2) - bloc_test, Robot Pattern, widget testing, coverage
- **navigation.md** (P2) - Auto-route, deep linking, guards, tab navigation

#### Dart Skills (2 categories)

- **language.md** - Null safety, type system, Freezed, Value Objects, SOLID principles
- **tooling.md** - Analysis options, dart_code_metrics, linting, formatting, CI/CD

#### Infrastructure

- **.skillsrc** - Version configuration for sync workflow
- **SYNC_WORKFLOW.md** - Documentation for version management from registry
- **README.md** - Repository overview and usage instructions
- **CHANGELOG.md** - Version history tracking

### Content Sources

- eZRX-mobile-v3 `.agent` directory (14 rules, 13 skills, 7 workflows)
- dart_code_metrics rules (331 common, 57 Flutter, 22 BLoC)
- Vercel react-best-practices pattern (priority-driven organization)
- OWASP Mobile Top 10 (2024) security standards

### Structure

- Priority-driven organization (P0/P1/P2) for Flutter skills
- Consolidated structure: `flutter/` and `dart/` directories
- Granular categorization based on domain and impact
- Progressive disclosure with main SKILL.md files
- Version sync support via .skillsrc configuration

---

## Future Enhancements

### Planned for v1.1.0

- Additional Flutter skills: theme-management, localization
- Git hooks for auto-sync on pull
- Offline-first sync mode
- Skill usage analytics

### Planned for v1.2.0

- React Native skills
- Kotlin/Swift skills
- Cross-platform patterns

---

**Maintainer**: Hoang Nguyen  
**Registry**: <https://github.com/HoangNguyen0403/agent-skills-standard>
