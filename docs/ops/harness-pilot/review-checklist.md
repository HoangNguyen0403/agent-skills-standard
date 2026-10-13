# Independent delivery review checklist

Use this checklist against the approved task card, exact delivered revision, worker report, and observable behavior. Reviewer must be separate from the implementer, authorized for the project/domain, and must not edit the delivery or supply human approval.

## Scope and contract

- [ ] Correct project, task, account/domain, revision, owned files, profile/settings, and authorization are identified.
- [ ] Every card acceptance criterion maps to evidence; no requirement was silently narrowed or invented.
- [ ] Project instructions and applicable standards were actually consulted by an approved route; distinguish body lookup, direct file/native guidance, and explicit brief. Do not treat catalog counts or an advisory instruction as enforcement.
- [ ] No unauthorized source/data, credentials, private journals, unrelated project context, or protected action entered the change/evidence.
- [ ] Commands correspond to existing project scripts and were run as authorized. Separate documentation checks, tests, and consumer-visible behavior proof.

## Behavior and quality

- [ ] Exercise the relevant user/consumer path on the reviewed revision with bounded non-production fixtures.
- [ ] Check observable outputs and meaningful boundaries, unknowns, errors, and state transitions from the card; tests alone do not establish the smoke result.
- [ ] Inspect the scoped diff for correctness, maintainability, privacy, and compatibility. Do not demand unrelated refactors or fixes.
- [ ] Record every AC as `PASS`, `FAIL`, `BLOCKED`, `NOT RUN`, or justified `N/A`, with its specific evidence. Missing evidence is not pass.

## Evidence and measurement

- [ ] Report exact revision/local-change state, command, scenario, exit/result, and source/runtime version when observed.
- [ ] Preserve all planned and attempted runs in the denominator: completed, failed, blocked, retried, interrupted, and not started. Do not erase an unsuccessful attempt when a retry passes.
- [ ] Keep usage/cost per-field completeness honest: explicit zero is distinct from missing; missing is unknown, not zero or savings; inapplicable is N/A. State the expected inventory and its limits.
- [ ] Keep raw private inputs local; check that shared evidence is authorized and sanitized.

## Repairs and verdict

A material repair changes the reviewed revision or behavior. Previous evidence for affected criteria is stale: rerun the affected behavior/checks, update the report to the repaired revision, and conduct a fresh independent review of the material repair. Preserve the original finding and failed/blocked attempt; do not overwrite history or change AC to make a prior verdict pass.

Return `PASS`, `CHANGES REQUIRED`, or `BLOCKED`, followed by findings with severity, exact file/AC/evidence, impact, and required action. `PASS` means only that the approved card is independently supported at the reviewed revision; it is not G2/G3 approval, proof of host containment, or permission to merge, release, or deploy.