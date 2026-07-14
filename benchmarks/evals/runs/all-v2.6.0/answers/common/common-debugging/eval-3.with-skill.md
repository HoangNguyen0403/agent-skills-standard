Use version control and a controlled comparison to identify the change, rather than scanning or editing code by intuition.

First record the exact failure: command/request, input, expected and actual result, stack trace, environment, and whether the failure is deterministic. Confirm the baseline and working/broken revisions are correctly checked out or deployed.

Then inspect changes in a narrowing sequence:

- Compare the last known-good and first known-bad commits with `git log --oneline --decorate` and `git diff GOOD..BAD --stat` followed by focused diffs.
- Review code, tests, configuration, generated artifacts, dependency lockfiles, migrations, build scripts, feature flags, environment changes, and external service/data changes—not only the function body.
- Check CI/deployment logs and the actual runtime artifact/version to rule out stale or mismatched deployments.
- Reproduce at the known-good revision and known-bad revision under the same inputs and environment. This establishes whether the regression is in the repository or in its runtime context.

If the range is large, use `git bisect` with an automated test or minimal reproduction. At each revision, change no other variable and classify it as good, bad, or untestable; investigate untestable revisions instead of guessing. Once a candidate commit is found, inspect its surrounding dependency and configuration changes.

Form one hypothesis from the evidence, then run a one-variable experiment—for example, revert only the candidate change in a temporary comparison or restore only the prior configuration. After proving the root cause, implement the smallest fix and add a regression test that would fail before the fix. Verify the original reproduction, the regression suite, and the deployed artifact, and document the causal commit and evidence.
