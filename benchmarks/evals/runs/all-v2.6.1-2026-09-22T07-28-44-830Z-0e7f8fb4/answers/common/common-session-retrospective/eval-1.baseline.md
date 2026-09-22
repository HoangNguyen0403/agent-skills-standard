Assumption: each correction event reflects a process or control failure, not intentional deviation.

| Correction event | Root cause | Candidate actions |
|---|---|---|
| Available skill was not selected | Skill discovery and trigger evaluation were skipped or performed incompletely; the task-to-skill match was not checked before work began. | Require an initial skill inventory and task-match check; make skill selection a gated planning step; add a completion audit that verifies applicable skills were used or explicitly ruled out. |
| Example used an unsupported flag | The example was not validated against the actual tool/version interface; assumed syntax was treated as confirmed behavior. | Validate examples against authoritative tool help or documentation; include supported-version context; add executable examples or CI checks; remove or clearly mark version-specific flags. |
| Tool ignored its network policy | Network restrictions were not enforced at the execution boundary, or the tool lacked a policy-aware guard; policy compliance was assumed rather than verified. | Enforce allow/deny rules in the tool runtime; pass policy context explicitly; fail closed when policy is missing or ambiguous; log and audit network attempts; add tests for blocked and permitted destinations. |
