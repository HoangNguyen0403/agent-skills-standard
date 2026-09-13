# Baseline Update Review

A baseline is a stored assertion. Changing it is changing the expected result, so it gets the same review as changing an `expect`.

## Steps

1. Run the failing check once with the diff reporter; save the `expected`, `actual`, and `diff` images from the run artifact.
2. Classify: does the diff match an intended product change named in the PRD, ticket, or design? If no such change exists, the verdict is `REAL_REGRESSION`; stop here and route to `dev-fix`.
3. If the diff is inside a region that should have been masked or thresholded, fix the mask or threshold and rerun; do not update the baseline.
4. Update only the baselines whose diff was reviewed: `npx playwright test <spec> --update-snapshots --grep "<scenario>"` (scoped by spec and grep, never the whole suite).
5. Commit the new baseline with the before/after images attached to the PR and this trailer in the commit message:

```text
Visual-Baseline-Approved-By: <name>
Intended-Change: <ticket or PRD section>
```

6. Rerun the full visual job on the same commit; any other baseline that now differs is unrelated drift and stays red until reviewed on its own.

## Forbidden

- `--update-snapshots` without `--grep` or a spec path.
- Updating a baseline in the same commit that changes the product without linking the intended change.
- Approving your own baseline change on a `tier=high` task (see `common-task-complexity-routing`).
