---
description: Systematic workflow for improving test coverage to a target threshold
---

# Improve Test Coverage Workflow

1. **Set Target**: Confirm coverage threshold (default: 90% all metrics).
   Check current threshold in `package.json` → `jest.coverageThreshold.global`.

2. **Baseline**: Run coverage and capture current metrics.

   ```bash
   pnpm test:cov 2>&1 | tail -20
   ```

   Record: Stmts, Branches, Funcs, Lines percentages.

3. **Identify Gaps**: Parse coverage report for files below target.

   ```bash
   # Find files with <90% coverage
   pnpm test:cov --coverageReporters=text 2>&1 | grep -E '\|\s+[0-7][0-9]\.'
   ```

   Prioritize by: (A) core business logic, (B) most-used services, (C) utilities.

4. **Enhance Tests** (per file):
   - **Read the source file** — understand all branches, edge cases
   - **Read existing spec** (if any) — identify untested paths
   - **Verify DTO/entity shapes** — read actual class before writing mocks
   - Write tests following **[Strict TypeScript Testing](./strict-typescript-testing.md)**
   - Focus on branches: `if/else`, `switch`, `try/catch`, `??`, `?.`, ternaries

5. **Lint Check**: After each batch of spec changes:

   ```bash
   npx eslint --no-warn-ignored <changed-spec-files>
   ```

   Fix immediately — **NO `eslint-disable`**, **NO `as any`**.

6. **Verify Tests Pass**:

   ```bash
   npx jest --testPathPattern="<pattern>" --no-coverage
   ```

7. **Re-measure Coverage**:

   ```bash
   pnpm test:cov
   ```

   Compare against baseline. If threshold not met, return to step 3.

8. **Final Validation**:
   - All tests pass (0 failures)
   - All lint checks pass (0 errors)
   - Coverage meets threshold for all 4 metrics
   - No `eslint-disable` or `as any` in any spec file

## Anti-Patterns

- **No Coverage Padding**: Don't add meaningless `toBeDefined()` tests for coverage
- **No Shape Guessing**: Always verify actual DTO/entity structure before mocking
- **No eslint-disable**: Fix type issues properly per [strict-typescript-testing](../skills/nestjs/testing/references/strict-typescript-testing.md)
- **No Batch-and-Pray**: Lint-check after EACH file, not at the end

## Key Skill Dependencies

- [nestjs/testing](../skills/nestjs/testing/SKILL.md) — Test patterns and structure
- [typescript/best-practices](../skills/typescript/best-practices/SKILL.md) — No `any`, no lint-disable
- [common/tdd](../skills/common/tdd/SKILL.md) — Red-Green-Refactor cycle
