# MCP Telemetry Smoke Authoring Report (Attempt 01)

- **Date:** 2026-10-28
- **Tooling Artifact:** `artifacts/diagnostic-prevention/implementation/attempt-01/mcp-telemetry-smoke.mjs`
- **Assigned Task:** Task 8 verification tooling (MCP telemetry and conditional pricing smoke helper; no production source edits)
- **Profile:** `Personal - Cheap` (exact)
- **Status:** **FINAL** (Tooling authored; execution NOT RUN per policy)

---

## 1. Scenario Helper Architecture & Verification Contracts

`artifacts/diagnostic-prevention/implementation/attempt-01/mcp-telemetry-smoke.mjs` was authored to exercise the actual built local MCP server entrypoint (`mcp/dist/index.js`) using the official `@modelcontextprotocol/sdk` client via `StdioClientTransport`, completely independent of imported internal handlers or mocked servers:

1. **Isolation & Environment Boundary:**
   - Allocates unique isolated temporary directories under `os.tmpdir()` (`home`, `xdg`, `project`).
   - Points `SKILLS_PROJECT_ROOT` to the isolated project workspace, which contains a minimal fixture `AGENTS.md`, `.claude/skills/common/sample-skill/SKILL.md`, `.agents/workflows/sample-workflow.md`, and `.skillsrc`.
   - Directs `AGS_TELEMETRY=1` and `AGS_TELEMETRY_PATH` to an isolated `telemetry.jsonl` within the temporary home directory.
   - Cleans and strips all ambient network credentials (`GITHUB_TOKEN`, `GH_TOKEN`, `NODE_AUTH_TOKEN`, `NPM_TOKEN`, AWS keys) from the child process environment.
   - Operates entirely offline with zero network requests and no interaction with mounted/shared system MCP daemons.
2. **Direct Body Load vs. Dedup Stub:**
   - **Assertion T02:** Calls `get_skill` directly; verifies the response delivers the full markdown skill body and records a direct body load.
   - **Assertion T03:** Calls `load_skills_for_keywords` for the already-loaded skill; verifies the response delivers a standard dedup stub (`<!-- skill: common/sample-skill | ... already loaded this session, body omitted -->`) and strictly omits the full body.
3. **Workflow Listing vs. Workflow Body Load:**
   - **Assertion T04:**
     - Calls `list_workflows`; verifies that `sample-workflow` is discovered without loading its body.
     - Calls `get_workflow`; verifies that the full workflow body is returned with the canonical provenance comment (`<!-- Provenance: Loaded workflow/sample-workflow via get_workflow -->`).
4. **Truthful Conditional Pricing (`Missing ≠ Zero`):**
   - **Assertion T05 (Missing Usage Metrics):** Calls `get_session_cost` with workflow only; verifies that status is reported as `Partial - host usage or pricing fields missing`, missing fields are explicitly enumerated, and cost is **never coerced to $0.00**.
   - **Assertion T06 (Positive Cached Tokens with Missing Rate):** Calls `get_session_cost` with positive cached tokens but without `cachedInputCostPer1M`; verifies that status remains `Partial`, `cachedInputCostPer1M` is demanded, and partial uncached cost is not fabricated as the total.
   - **Assertion T07 (Known Zero Cached Usage):** Calls `get_session_cost` with `cachedPromptTokens: 0` and `reasoningTokens: 0`; verifies that absent cached/reasoning rates are not demanded, and exact cost is computed (`USD 0.010500`).
   - **Assertion T08 (Complete Rates with Cached and Reasoning Usage):** Calls `get_session_cost` with all token tiers and matching unit prices; verifies exact cost computation (`USD 0.013800`).
5. **Persisted Local Telemetry Verification & Exact Counts:**
   - Awaits child process termination via SDK transport lifecycle (`childExitPromise` bound to `transport.onclose`) rather than arbitrary delay.
   - Fails immediately if the telemetry file is missing, empty (`lines.length === 0`), or malformed.
   - **Assertion T09 (Exact Operation-Derived Counts):** Parses the flushed JSONL record and asserts exact counts:
     - `skillBodies['common/sample-skill'] === 1` (from direct `get_skill`).
     - `skillStubs['common/sample-skill'] === 1` (from dedup stub).
     - `workflows['workflow/sample-workflow'] === 1` and `totalWorkflows === 1` (proving `get_workflow` loaded exactly 1 workflow body and `list_workflows` loaded 0).
6. **Strict Teardown & Exclusive Publication:**
   - Propagates any error in `client.close()`, `transport.close()`, child process exit timeout, or temporary workspace removal (`fs.rmSync`) into `teardownSuccess = false`, `allPassed = false`, and records `teardownError`.
   - Requires exclusive output creation (`flag: 'wx'`); refuses to overwrite existing output files.
   - Binds built MCP entrypoint SHA-256 and candidate repository commit SHA to the final run record.
   - Sets `"completed": true` only if all assertions pass AND owned teardown completes cleanly without error.
   - Never marks test fixture app fields or probes as host enforcement.
---

## 2. Verification Status (NOT RUN)

Per brief constraint:
> "Own only two smoke artifact files; no tests run midflight... Final helper authoring claims only, report precise parent invocation after freeze."

- The smoke helper was **NOT RUN** during this turn.
- The MCP entrypoint was pre-built by the parent (`mcp/dist/index.js`, 101.54KB).
- **Exact Execution Command for Parent:**
  ```bash
  node artifacts/diagnostic-prevention/implementation/attempt-01/mcp-telemetry-smoke.mjs \
    --candidate-root /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention \
    --mcp /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention/mcp/dist/index.js \
    --out /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention/artifacts/diagnostic-prevention/implementation/attempt-01/mcp-telemetry-smoke-run.json
  ```
- No model efficacy or deployed host rollout claims are made. All production source files remain untouched.

---

## 3. Corrective Follow-Up (Review Remediation) — FINAL

In response to the reviewer's finding, the following corrections were implemented:
1. **SDK Lifecycle Child Process Exit:** Replaced arbitrary delay with a deterministic `childExitPromise` attached to `transport.onclose`, awaiting child termination concurrently with `transport.close()`.
2. **Teardown Error Propagation:** Removed swallow/warn-only blocks on client/transport close and `fs.rmSync` cleanup. Any failure sets `teardownSuccess = false`, captures the specific error in `teardownError`, and forces `allPassed = false`, preventing false completion claims.
3. **Telemetry Emptiness & Exact Count Assertions:** Telemetry file absence or empty lines now explicitly fail `allPassed`. Replaced `>= 1` loose checks with exact operation-derived counts (`skillBodies === 1`, `skillStubs === 1`, `workflows === 1`, `totalWorkflows === 1`), strictly proving that `list_workflows` discovered workflows without loading bodies.
4. **Cross-Helper Alignment (`installed-brief-smoke.mjs`):** Applied the same teardown and cleanup error propagation to `installed-brief-smoke.mjs` (fixture close and temporary workspace removal errors now fail teardown truthfully). Re-verified alignment with Task 2/3 final frozen contracts and three-argument API without bypass.

---

## 4. Route 2 corrective pass — tooling only (2026-10-28)

**Profile:** Route 2 (`Personal - DeepSeek`). **Status:** tooling corrected; execution still **NOT RUN** (parent-owned).

The prior FINAL claim was wrong: the actual parent stdio run reached a real connect, isolated serving directory, tool listing and calls, then failed with `transport close error: childExitPromise is not defined` and `FATAL parsedRecord is not defined`. No receipt was published, so no feature verification was ever obtained.

### 4.1 Observed root causes and corrections

| Cause | Evidence | Correction |
|---|---|---|
| `childExitResolve`/`childExitPromise` declared inside `try`, awaited in `finally` | ReferenceError at teardown | Declared once at function scope; teardown observes them only when set |
| `parsedRecord` declared inside `finally`, read by the outcome record after the block | ReferenceError at publication time | Hoisted to function scope, initialised `null` |
| `closeErr` declared only in `finally` | Same class of lexical-lifetime defect | Hoisted with all other cross-block state |
| Fixture skill declared triggers only in prose | `mcp/src/services/SkillParser.ts` reads `metadata.triggers`; `load_skills_for_keywords` therefore matched nothing, so T03 could never pass | Fixture frontmatter now declares `metadata.triggers.files`/`.keywords`; T03 exercises the real dedup path |
| `transport.onclose` replaced before `client.connect` | SDK documents that `Protocol.connect` takes ownership of transport callbacks (`dist/esm/shared/protocol.js` `connect()`), even though 1.32.1 happens to chain the prior handler | Observer is installed **after** connect and explicitly chains the protocol handler, so internal close handling still runs; terminal teardown awaits `transport.close()` (documented: stdin end → child `close`) and then the recorded child-close promise, with each step bounded |
| `withTimeout` left the losing promise unobserved | A late rejection could surface as `unhandledRejection` and kill the runner | `withTimeout` now attaches a no-op rejection handler to the observed promise |
| No child stderr capture | Isolation and telemetry target could not be proven from the process that actually served requests | `stderr: 'pipe'`, bounded 8 KiB tail, new T00 assertion on `serving skills from <fixture>/.claude/skills` and `telemetry: on (env) → <fixture>/home/telemetry.jsonl` |
| Precondition failures produced no artifact | Missing build ⇒ no receipt, unrecorded attempt | `main` publishes an exclusive blocked receipt (`stage: "precondition"`, `completed: false`) when possible; existing evidence is never overwritten |
| Loose tool check | All-expected-present did not catch extra/missing surface drift | T01 asserts the exact sorted 11-tool set registered in `mcp/src/server.ts` |
| Count assertions could pass without call identity | Only per-key counts were checked | T09 also requires exactly one flushed record, `skills` total 2, `callsByTool` = {get_skill 1, load_skills_for_keywords 1, list_workflows 1, get_workflow 1, get_session_cost 4}, `noMatchCalls` 0 |

### 4.2 Invariants retained

Exclusive `flag: 'wx'` publication; empty/absent malformed telemetry fails; cost assertions remain text-derived from real responses (no copied handler output); teardown errors are captured and force `completed: false`; temporary tree is the helper's own `os.tmpdir()` child; no source import, no network, no credentials in the child environment.

### 4.3 Exact parent invocation (unchanged CLI surface)

```bash
node artifacts/diagnostic-prevention/implementation/attempt-01/mcp-telemetry-smoke.mjs \
  --candidate-root "$PWD" \
  --mcp "$PWD/mcp/dist/index.js" \
  --out "$PWD/artifacts/diagnostic-prevention/implementation/attempt-01/mcp-telemetry-smoke-run.json"
```

### 4.4 Honest limits

- Execution NOT RUN here; no PASS, source-ready, rollout, host-authenticity or model-efficacy claim is made.
- The recorded build hash is whatever `mcp/dist/index.js` is at parent run time; this report asserts no hash value.
- Actual runtime is the host Node (observed 26.x by the parent), not the Node 20 build target; node20-target bundling is not a Node 20 execution result.
- Mounted MCP deployment identity and remote service state remain unknown and are not exercised.
