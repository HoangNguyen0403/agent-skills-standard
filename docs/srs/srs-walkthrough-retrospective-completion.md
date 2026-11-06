# Walkthrough: AGS Retrospective Completion

## Scope

Operator-authorized repair in PR #295. Two triggers use the existing AGS retrospective engine and the human-consented private diagnostics store (default `~/ags/diagnostics`):

1. Settled SDLC implementation: `get_session_cost(workflow="implement-feature", outcome="implemented", completion={role: "orchestrator", activeTasks: 0, pendingTasks: 0})` invokes preparation automatically. `unassigned` is supported. Caller-declared counts are not authenticated host readiness or delivery proof.
2. Standalone: `prepare_retrospective(title="optional title")` works without an SDLC workflow or cost-reporting call. Existing manual behavior remains unchanged.

Both publish `summary.md`, `ledger.json`, and `report.html`; the tool returns fixed counts, coverage and paths, not report bodies. Consent remains interactive/human-managed; workers cannot initiate preparation. Automatic preparation additionally requires stdio and positive native main-session binding; no tracker-only fallback. Preparation never adopts lessons or edits policy.

## Verification

| Check                                       | Observed result                                   | Boundary                                                                                      |
| ------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| MCP typecheck                               | PASS                                              | `pnpm --filter ./mcp exec tsc --noEmit`                                                       |
| Focused regression                          | PASS: 5 suites, 96 tests                          | Automatic/manual lifecycle, adapter composition, transport and existing engine                |
| Full MCP suite                              | PASS: 35 files, 990 passed, 4 skipped (994 total) | Skips are not passes; existing Vite future-loader compatibility warning retained              |
| Fresh MCP build                             | PASS                                              | `pnpm --filter ./mcp build`                                                                   |
| Scoped TypeScript formatting                | PASS                                              | Seven changed source/spec files                                                               |
| Registry validation                         | PASS: 351 skills                                  | Existing description/freshness warnings remain; not model-efficacy evidence                   |
| SDLC, repository trace and alignment audits | PASS                                              | Alignment threshold70%; four unrelated below90% warnings retained                             |
| Generated output parity                     | PASS                                              | Supported isolated generation plus `pnpm generate-indices --check`                            |
| Independent real stdio smoke                | PASS: 10/10 probes                                | Built server, SDK JSON-RPC, synthetic consent/native sessions and actual private report files |

The protocol smoke exercises registered tools and invalid calls; legacy, worker, unsettled and wrong-workflow refusals; disabled consent; child/no-evidence auto refusal; successful automatic publication with private permissions; unchanged-checkpoint dedup; next-work checkpoint publication; concurrency; standalone publication/dedup; synthetic configuration isolation. Existing engine consent-revocation cases are covered by the regression suite, not claimed as a new protocol probe.

Initial verification exposed a template-literal parse error. Independent review also caught lost tool input-schema registration, missing explicit adapter outcome forwarding, a contradictory legacy nudge and an unclosed workflow fence. These were corrected before final checks; original behavioral RED was NOT RUN for the interrupted implementation, and the parse failure is not represented as behavioral RED.

## Deployment boundary

Supported project MCP installation refreshed the stale Codex launcher pin from0.6.1 to0.8.1. A separate actual installed-binary stdio probe confirmed the existing three manual retrospective tools. This does not hot-reload the MCP server mounted in an already-running chat.

The automatic completion extension is source delivered by this PR, not an existing0.8.1 capability or a Paseo lifecycle plugin. It runs when the updated completion-reporting call executes; it cannot observe unrelated host tasks by itself. Activation requires loading a build/release containing this change and restarting the relevant MCP connection. No package publication, merge, deployment or consent enablement was performed.

Runtime verification artifacts remain repository-ignored under `artifacts/runs/retrospective-completion/`: the implementation/two-trigger contracts, backend/docs reports, raw typecheck/full-suite/build/format receipts, protocol runner and execution receipt/report. Paths are local evidence references, not remotely available PR attachments. Protocol fixtures are synthetic; their results do not prove production-host rollout, authenticated completion assertions, or process-enforced network isolation.
