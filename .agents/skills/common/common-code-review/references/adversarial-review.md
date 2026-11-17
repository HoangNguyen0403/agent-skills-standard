# Adversarial Review Protocol

## 1. Freeze blind-phase inputs

- Receive only the task brief, cumulative diff, and the orchestrator-observed deterministic-check receipt: command, exit code, raw-output reference, source revision, and dirty identity. Author-reported results are not evidence.
- If a required current check is observed `FAIL`, return `CHANGES REQUESTED` for that failure before semantic lens review. A missing, unknown, `NOT RUN`, or stale status is an explicit evidence gap, never a pass; continue useful static analysis without claiming technical readiness.
- Review the whole supplied diff, then freeze the phase-one findings artifact and its SHA-256 before receiving an author report or narrative. This is a declared sequence, not filesystem access control: omitted paths may still be readable in a shared workspace.

## 2. Reproduce only inside the verified boundary

Reproduction is permitted only when all are verified and recorded:

1. Command and source provenance are verified.
2. The host enforces an isolated runtime without credentials or publication authority, and positively verifies that execution cannot write to the shared implementation worktree.
3. Outbound networking is default-deny; any exception has separate human authorization bound to destination and permitted data.
4. The exact command was published by the orchestrator in the brief.

If any predicate is false or unknown—including shared-worktree write isolation—stay static-only and name the reproduction gap. Never execute author-controlled commands, tests, package hooks, or build scripts in a privileged reviewer runtime. A worktree, role label, `ask`/read-only mode, or omitted secret does not prove isolation. Orchestrator-run checks remain a separate evidence lane, not reviewer reproduction.

Compare any authorized reproduction's exact command, output, and source identity with the receipt. A mismatch between observed and claimed results is a `Blocker`; do not downgrade it to a confidence note. Authorized-verifier outputs belong to that verifier's run; findings reference durable copies by SHA-256. Finite output-shape assertions establish only a text contract; they do not prove command execution or model behavior. Execution requires independently observed output and identity; behavioral evals remain `NOT RUN` without separate authorization.

## 3. Reconcile after findings are frozen

Resume the same reviewer with the frozen phase-one artifact and digest plus the author report. Reconcile each material claim against source and evidence; unsupported claims remain explicit gaps or findings. If same-reviewer resume is unavailable, reconciliation is `BLOCKED`. A replacement reviewer must restart the complete blind phase; never invent continuity. Fix rounds use cumulative diffs from the original baseline and preserve prior phase snapshots; changed source invalidates affected proof.

## 4. Findings

Use only `[Blocker]`, `[Major]`, or `[Nit]`; each substantive finding includes:

`[Severity] path:line`  
`Evidence: exact source or observed result`  
`Why: consumer, security, or merge risk`  
`Fix: concrete correction`  
`Prevent-by: lint | type | test | eval | runtime | guidance | none`

No strengths or praise section. Do not create a finding from style preference alone. Keep unconfirmed concerns in evidence gaps rather than inflating severity. A mismatch between an observed result and an author claim is a `Blocker`.
