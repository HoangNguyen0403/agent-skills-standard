# Skill Quality Baseline

Baseline captured for the SDLC standards-layer upgrade.

## Gates

| Gate | Status | Notes |
| --- | --- | --- |
| `pnpm --filter ./cli validate:all` | PASS | 259 skills validated after specialist expansion |
| `pnpm audit:skills` | PASS | no obvious redundant checkpoint structure |
| `pnpm check-alignment` | PASS | all skills meet 70% threshold; many warnings below 90% |

## Registry Shape

| Signal | Value |
| --- | --- |
| `SKILL.md` files | 259 |
| `evals/evals.json` files | 259 |
| Workflow source | `.agents/workflows/*.md` |
| Codex export target | `.codex/skills/<workflow>/SKILL.md` |
| Primary quality target | 90% eval alignment before release |

## Priority Categories

| Wave | Categories | Reason |
| --- | --- | --- |
| A | `common`, `quality-engineering`, `specialists` | shared rules and SDLC behavior |
| B | `typescript`, `javascript`, `react`, `nextjs`, `nestjs`, `database` | web/backend high usage |
| C | `flutter`, `dart`, `ios`, `swift`, `android`, `kotlin`, `react-native` | mobile standards coverage |
| D | `spring-boot`, `java`, `php`, `laravel`, `golang`, `angular` | server and enterprise frameworks |

## Token Hotspots

Watch the largest skills first when tightening token budget:

| Area | Examples |
| --- | --- |
| Common | `common-skill-creator`, `common-accessibility`, `common-security-audit` |
| Quality | `quality-engineering-zephyr-test-generation`, `quality-engineering-business-analysis` |
| Web/backend | `nextjs-architecture`, `nestjs-performance`, `nestjs-bullmq` |
| Mobile | `flutter-testing`, `android-edge-to-edge`, `android-compose-migration` |

## Next Actions

1. Add SDLC workflow spine.
2. Add Vibe Security Scan lens.
3. Add default init SDLC support and public proof docs.
4. Add `audit:sdlc`.
5. Raise release-candidate alignment gate to 90%.
