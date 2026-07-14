Goal: Report feature delivery status and the exact verification blocker when runtime access is unavailable.

Steps
- Gather implementation evidence: changed files, tests run, build results, and linked requirement IDs.
- Attempt verification: run available checks and note which runtime-dependent checks could not execute.
- Classify status: set `feature_status` to `verified`, `partially_verified`, `blocked`, or `not_started`.
- Record blocker truth: name the missing runtime access, blocked check, and impact on confidence.
- State decision needed: identify the exact access, artifact, or owner action required to continue verification.

Output template

| feature_status | completed_work | verified_evidence | blocked_check | missing_evidence | decision_needed |
| --- | --- | --- | --- | --- | --- |

This is portable because it uses status, evidence, blockers, and decisions without depending on runtime-specific tools, chat channels, containers, or local mount details.

