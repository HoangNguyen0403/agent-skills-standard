# Test-Loop P1 Acceptance Runbook (ASS + solo-corp)

Status: documented contract; not yet executed. Execute once a solo-corp checkout with its P0 (sandbox image, verifier regex, safe-commands allowlist) is available next to this registry.

## Goal under test

Drive one real acceptance criterion end to end through both repos:

`AC-3: A signed-in customer with one item in the cart completes checkout and sees an order id.`

Pass means: a Playwright spec tagged `@AC-3` exists in solo-corp, uses a generated `CheckoutPage` page object through the `pages` fixture, every locator it needs has a stable id, and the spec passes inside the solo-corp sandbox with the verifier accepting the generator's `Test: PASS` line.

## Preconditions

| Side | Requirement |
| --- | --- |
| ASS | This branch merged; `ags sync` in solo-corp pulls `quality-engineering` >= 1.7.0 and `specialists` >= 1.6.0. |
| solo-corp | P0 landed: sandbox image with Node, pnpm, Playwright browsers; verifier regex matching the specialist Output lines; safe-commands allowlist. |
| solo-corp | `docs/prd/prd-checkout.md` with stable `AC-3`; `tests/seed.spec.ts` present or Playwright agents initialised. |

## Contract the run depends on

| Contract item | Owner | Value this runbook assumes |
| --- | --- | --- |
| Sandbox image | solo-corp | can run `npx playwright test tests/checkout.spec.ts --grep @AC-3` headless |
| Verifier regex | solo-corp | accepts `^Test: (PASS\|FAIL\|BLOCKED)$` from `specialist-integration-test-generator` and `^CHECK: (CLEAN\|FAILED)$` from `specialist-testid-inserter` |
| Safe-commands allowlist | solo-corp | includes `npx playwright test`, `npx tsc --noEmit`, `pnpm lint`; excludes anything that writes outside the worktree |
| Production-edit approval | solo-corp operator | passes `approved_production_edits: true` in the `test-loop` packet, or approves the `APPROVAL: required` file list interactively |

If any assumed value differs, update this table first, then the affected specialist Budget, then rerun.

## Steps

1. In solo-corp: `ags sync -y` then `git status` shows updated `.claude/skills/quality-engineering/`, `.claude/agents/testid-inserter.md`, `.claude/commands/test-loop.md`.
2. Run `/test-loop checkout` (interactive).
3. Step 2 output must show `PLAN: docs/srs/test-plan-checkout.md`, `CLASSES:` with at least one P and one N, `HALT:` empty, `SELECTOR_GAPS:` listing the checkout elements that lack ids.
4. Step 3: `specialist-testid-inserter` returns `APPROVAL: required` with the component file list; approve; it returns `INSERTED:` for every gap and `CHECK: CLEAN`. Page object `tests/pages/checkout.page.ts` and `tests/fixtures.ts` exist with no `expect` inside the page object.
5. Step 4: one generator call for `@AC-3` returns `Action: created`, `Format: CLEAN`, `Test: PASS`; the spec imports `test` from `./fixtures` and contains no `page.locator(`.
6. The sandbox runs the spec via the allowlisted command; the verifier accepts the `Test: PASS` line; the workflow report shows `## Page Objects`, an empty `## Selector Gaps Remaining`, and `release_confidence` computed.
7. Negative check: delete one inserted id, rerun step 4 for `@AC-3`; the generator must not silently fall back to a CSS or `nth` selector. Expected: `Test: FAIL` with the spec and page object unchanged (no new `page.locator(` or `nth`); the id reappears under `## Selector Gaps Remaining`, or `specialist-test-healer` returns `CLASS: SELECTOR_DRIFT` with `ROUTE: testid-inserter`.

## P3 extension (Run and heal)

8. Introduce a deliberate timing race in the seed (remove one explicit wait); run step 5. Expected: healer returns `CLASS: TIMING_SYNC`, `REPAIR:` names the state wait, `RERUNS: 3/3 green`, `ASSERTION_DELTA: none`, `VERDICT: HEALED`.
9. Change the product rounding so the order total differs from the AC; run step 5. Expected: `CLASS: REAL_REGRESSION`, `VERDICT: REAL_BUG_DO_NOT_HEAL`, `ROUTE: dev-fix`, the test file unchanged, `real_bugs[]` has one entry.
10. Make the seed non-deterministic (random cart item); run step 5 twice. Expected: `VERDICT: QUARANTINE_CANDIDATE`, `flake_quarantine[]` entry with ticket, expiry ≤ 14 days, bucket `DATA`; the test still runs and reports.
11. Change the header color; run the visual check. Expected: `VISUAL_DIFF` → `REAL_REGRESSION` until the intended change is linked; baseline updated only with `--grep` scoping and a named approver in the commit.

## Evidence to capture

- `docs/srs/test-plan-checkout.md` (planner output)
- `INSERTED:` list with `file:line`
- `tests/pages/checkout.page.ts`, `tests/fixtures.ts`, `tests/checkout.spec.ts`
- Sandbox run log with the verifier decision
- `test-loop` report with Outcome Report and `release_confidence`

## Exit criteria

All eleven steps pass on one clean run; the negative check refuses fallback selectors. Record the run date and both repo SHAs at the top of this file.
