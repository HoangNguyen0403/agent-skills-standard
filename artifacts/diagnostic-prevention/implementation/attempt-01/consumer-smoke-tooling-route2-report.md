# Task 8 verification tooling — Route 2 corrective report

- **Date:** 2026-10-28
- **Profile:** Route 2 (`Personal - DeepSeek`), after the Route 1 (`Personal - Cheap`) author plus one corrective failed at actual parent execution
- **Owner:** sole smoke-helper writer; verification tooling only
- **Owned write set (only files touched):**
  - `artifacts/diagnostic-prevention/implementation/attempt-01/mcp-telemetry-smoke.mjs`
  - `artifacts/diagnostic-prevention/implementation/attempt-01/mcp-telemetry-smoke-authoring-report.md` (appended §4)
  - `artifacts/diagnostic-prevention/implementation/attempt-01/installed-brief-smoke.mjs`
  - `artifacts/diagnostic-prevention/implementation/attempt-01/installed-brief-smoke-authoring-report.md` (appended §4)
  - this report
- **Not touched:** production source, metadata, `package.json`, generators, eval JSON, workflows, skills, prior evidence files. No commits, installs, builds, tests, probes, formatters, linters or generators were run.

## 1. What the parent actually observed

The previous MCP helper reached a real stdio connect, the correct isolated `serving.skills` directory, tool listing and calls, then failed at teardown/publication:

- `transport close error: childExitPromise is not defined`
- `FATAL parsedRecord is not defined`

No receipt was published, so **no feature verification exists**. The previous "FINAL" tooling claim is withdrawn for both helpers.

## 2. Root causes (source-evidenced)

1. **Lexical lifetime defects** in `mcp-telemetry-smoke.mjs`: `childExitResolve`/`childExitPromise` were declared inside `try` and awaited in `finally`; `parsedRecord` and `closeErr` were declared inside `finally` and read afterwards. These are unconditional `ReferenceError`s on the teardown path.
2. **Fixture could never reach T03**: `mcp/src/services/SkillParser.ts` (`parseSkill`) reads triggers from frontmatter `metadata.triggers`; the fixture declared them only in prose in `description`. `load_skills_for_keywords` therefore matched nothing, and the dedup-stub assertion was structurally unsatisfiable even after the scope fix.
3. **Guaranteed deadlock in `installed-brief-smoke.mjs`**: CLI sync ran via `spawnSync` while `startRegistryFixture` serves the registry from the **same** process. The event loop is blocked, so the child could never be answered and would be killed at the 30 s timeout. `scripts/skill-tests/product-evidence-integration/consumer-smoke.mjs` deliberately uses an async spawn for exactly this reason.
4. **SDK close contract misuse**: `MCP Protocol.connect()` documents that it takes ownership of transport callbacks (`mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.js`, `connect()`), even though 1.32.1 chains the pre-existing `onclose`. Relying on an undocumented chain is unsafe; the observer must be installed after connect and must explicitly chain the protocol handler.
5. **Unobserved losing promises**: the old `withTimeout` left the loser's rejection unhandled, which can surface as `unhandledRejection` after a timeout.
6. **Scalar-only assertions**: tool presence was "all expected present" and telemetry only compared per-key counters, so extra/missing surface and call-identity drift could not be detected.

## 3. Corrections applied

### `mcp-telemetry-smoke.mjs`
- All cross-block state (`transport`, `client`, `connectPromise`, `connected`, `childExitPromise`, `stderrTail`, `parsedRecord`, `closeErr`, `cleanupErr`, `allPassed`, `teardownSuccess`, `teardownError`) hoisted to function scope.
- Child stderr captured (`stderr: 'pipe'`, 8 KiB tail) and asserted in **T00**: the child must report `serving skills from <fixture>/.claude/skills` and `telemetry: on (env) → <fixture>/home/telemetry.jsonl`. This proves the fixture tree and telemetry target, not the candidate repo.
- Terminal lifecycle: after `connect`, the observer chains the protocol `onclose` (internal handling preserved) and resolves on the actual child `close`; teardown awaits `client.close()` → `transport.close()` (documented: stdin end, bounded SIGTERM/SIGKILL, resolves on child `close`) → the recorded child-close promise, each bounded. If `connect` timed out, its real lifecycle promise is settled (bounded) before close so a late spawn cannot escape.
- Close/settle/cleanup errors are captured, never swallowed, and force `completed: false`.
- Fixture `SKILL.md` now declares real `metadata.triggers` (`files: **/*.ts`, `keywords: sample, smoke`).
- **T01** asserts the exact sorted tool set registered by `mcp/src/server.ts` (11 tools).
- **T09** requires exactly one flushed record, `skillBodies=1`, `skillStubs=1`, `skills` total `2`, `workflows['workflow/sample-workflow']=1`, total workflows `1`, `callsByTool` exactly `{get_skill:1, load_skills_for_keywords:1, list_workflows:1, get_workflow:1, get_session_cost:4}`, and `noMatchCalls=0` — i.e. discovery did not load a body.
- Cost assertions remain derived from real responses: `Partial - host usage or pricing fields missing`, `promptTokens, completionTokens, inputCostPer1M, outputCostPer1M`, `cachedInputCostPer1M`, `USD 0.010500`, `USD 0.013800`, `_(none)_`.
- Precondition failures publish an exclusive blocked receipt (`stage: "precondition"`); existing evidence is never overwritten.

### `installed-brief-smoke.mjs`
- Bounded async `runBounded` replaces every `spawnSync` for the CLI and Python; the loopback fixture can serve while the CLI runs.
- Sync scope narrowed to the installed skill slice: `workflows: false`, MCP disabled, telemetry off, isolated `HOME`/`XDG`, network preload, no credentials.
- A03 now requires installed bytes to equal the **bytes served by the registry fixture** for `skills/common/common-subagent-driven-development/scripts/task_brief.py`, and records the source SHA separately.
- A04 strengthened: exit 0 from an empty foreign CWD, complete contract body, presence of `**Real Ingress:**`/`**Verification owner:**`/`**Correction route:**`, and no content from the next task.
- A05/A06/A07 bind the **stable exit-code contract** (not stderr wording): exit 5 with no output; exit 5 before workspace resolution with no `.agent` and no brief; exit 4 with sentinel bytes unchanged.
- A08 mixed-case labels (`**FILES:**`, `**VERIFICATION OWNER:**`, `**CORRECTION ROUTE:**`, uppercase invariants) extract with exit 0; A09 labels inside tilde and backtick fences are refused with exit 5 and no output; A10 a value on the following line is refused with exit 5; A11 a missing task exits 3 with no output.
- Owned teardown only; a fixture that never started closes nothing. Python provenance (`python_binary`, `python_version`) recorded; Python env is explicit (no `PYTHONPATH`/`PYTHONHOME` inheritance) and execution happens from an empty foreign CWD.

## 4. Acceptance-criteria status (static only)

| AC | Status | Basis |
|---|---|---|
| Helper defects that produced parent failure are removed | Implemented, **NOT RUN** | Scope/contract inspection above; no execution permitted |
| MCP smoke covers body load, dedup stub, workflow discovery vs body, conditional pricing, persisted counters | Implemented, **NOT RUN** | T00–T09 as described |
| Installed smoke exercises built CLI sync + installed script from foreign CWD | Implemented, **NOT RUN** | A01–A11 as described |
| Exclusive publication, no overwrite of prior evidence | Implemented | `existsSync` refusal + `flag: 'wx'` in both helpers |
| No false success | Implemented | `completed` requires every assertion plus clean teardown; blocked receipts are `completed: false` |
| No source import forwarding | Implemented | Installed smoke runs `python3 <installed path>`; MCP smoke talks stdio to the built entrypoint |

## 5. Commands NOT RUN (parent-owned)

- `node artifacts/.../mcp-telemetry-smoke.mjs ...`
- `node artifacts/.../installed-brief-smoke.mjs ...`
- Any build, test, formatter, linter, generator, `node --check` or custom probe.

## 6. Exact parent invocations

```bash
node artifacts/diagnostic-prevention/implementation/attempt-01/mcp-telemetry-smoke.mjs \
  --candidate-root "$PWD" \
  --mcp "$PWD/mcp/dist/index.js" \
  --out "$PWD/artifacts/diagnostic-prevention/implementation/attempt-01/mcp-telemetry-smoke-run.json"

node artifacts/diagnostic-prevention/implementation/attempt-01/installed-brief-smoke.mjs \
  --candidate-root "$PWD" \
  --cli "$PWD/cli/dist/index.js" \
  --out "$PWD/artifacts/diagnostic-prevention/implementation/attempt-01/installed-brief-smoke-run.json"
```

`cli/dist/index.js` does not exist in this worktree yet; the parent must build it first.

## 7. Dependencies and risks

- **Frozen source (owner `cb8ce927`):** `skills/common/common-subagent-driven-development/scripts/task_brief.py` and its tests are frozen. The helper binds that contract exactly: case-insensitive bold labels, same-line values, backtick/tilde fences excluded, validation before workspace resolution, exclusive `x` publication with symlink refusal, three-argument API, and exit codes 2/3/4/5 with no-output / unchanged-bytes / no-workspace state. If a future edit changes those, the helper must be corrected — assertions will not be weakened to force green.
- Parent must rebuild the CLI so the fixture-served `task_brief.py` bytes equal the frozen source, then run the helper once.
- The helper covers installed exit codes 3/4/5 plus positive extraction; exit code 2 (argument/plan-path misuse) is argv handling already covered by the frozen source tests and is not exercised here.
- The helper reads `task_brief.py` bytes from the installed consumer and the fixture snapshot; it never imports the source module, so "installed script works" is not inferred from source.
- **Repo mirror copies of `task_brief.py` are stale relative to the frozen source.** `.claude/skills/...`, `.agents/skills/...`, `.codex/skills/...` and `.github/skills/common/common-subagent-driven-development/scripts/task_brief.py` still contain the pre-contract parser (they define `any_task_header` and have no `_CONTRACT_LABELS`, no case-insensitive label table). Regenerating them is a CLI sync/generation step owned by the parent under the plan's "generated mirrors" rule; hand-copying four generated artifacts would bypass single-surface generation. This helper does not read those mirrors — it installs into an isolated consumer from the frozen fixture snapshot — so the smoke remains valid, but the parent's generation/parity gate must refresh them before parity is claimed.
- MCP helper requires `mcp/dist/index.js` built by the parent; it records that build's SHA-256 and the repository commit at run time.
- Actual host Node is not Node 20; node20-target bundling is not a Node 20 execution result.
- Mounted MCP deployment identity, remote service state, host approval/enforcement, and any model efficacy remain outside this tooling and are not claimed.

## 8. Honest limits

These are throwaway verification helpers. Success, when the parent obtains it, proves only: the built entrypoints, under the isolated fixtures described, behaved as asserted. It does not prove host rollout, publication, authenticated approval, or that the guidance changes improve model behavior.
