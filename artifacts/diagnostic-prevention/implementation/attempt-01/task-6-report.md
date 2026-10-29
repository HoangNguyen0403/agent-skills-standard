# Task 6 Report: Truthful MCP Telemetry and Conditional Price Coverage (H05 Reachable Source)

**Status:** FINAL  
**Execution Mode:** Bounded Worker (Approved subagent-driven implementation, personal agent-skills-standard)  
**Profile Materialized:** `Personal - Cheap`  
**Workspace:** `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention`  
**Branch:** `feat/diagnostic-prevention-improvements`  

---

## 1. Summary of Changes & Owned Write Set

In accordance with Task 6 brief and plan requirements, all modifications were strictly confined to the owned write set:

1. **`mcp/src/services/TelemetryWriter.ts`**:
   - Extended `TelemetryRecord` interface with `skillBodies?: Record<string, number>` and `skillStubs?: Record<string, number>`.
   - Updated `buildTelemetryRecord()` to iterate tracker events and separate returned skill body counts (`skillBodies`) from dedup stub counts (`skillStubs`), while maintaining the existing `skills` counter (loads including stubs) for full backward compatibility with freshness readers (`scripts/freshness/signals/telemetry.ts`).
   - Ensured catalog discovery (`discovered`) and category guides (`loadedGuides`) remain completely segregated from skill body counters.

2. **`mcp/src/tools/index.ts`**:
   - In `getSkill()`, included `estimatedTokens: estimateTokens(body)` when returning full skill content, resolving the token estimation omission for direct fetches.
   - When a skill exists in the index but its `SKILL.md` file is missing or unreadable on disk (`!body`), `ctx.tracker.record` records `{ via: "get_skill", input: [...], loaded: [] }` with 0 loaded skills and no estimated tokens, rather than skipping the record call.
   - In `getSessionCost()`, documented in session telemetry notes that mounted MCP deployment identity is unknown to the stdio process and callers cannot restart or reconfigure the live service.

3. **`mcp/src/services/WorkflowTelemetry.ts`**:
   - In `summarizeSessionCostCoverage()`:
     - When `cachedPromptTokens > 0` and `cachedInputCostPer1M` is missing (`undefined`), appends `"cachedInputCostPer1M"` to `missingHostFields`.
     - When `reasoningTokens > 0` and `reasoningCostPer1M` is missing (`undefined`), appends `"reasoningCostPer1M"` to `missingHostFields`.
     - When `missingHostFields.length > 0`, marks `exactCostAvailable = false`, `costSource = "unavailable"`, and sets `estimatedCost = null`.
     - When `cachedPromptTokens` or `reasoningTokens` is 0 (or undefined), nonexistent rates are not demanded.
   - In `calculateEstimatedSessionCost()`:
     - Returns `null` if `cachedPromptTokens > 0 && cachedInputCostPer1M === undefined`.
     - Returns `null` if `reasoningTokens > 0 && reasoningCostPer1M === undefined`.
     - Avoids implicit zeroing of missing rates when positive tokens were observed.

4. **`mcp/test/TelemetryWriter.spec.ts`**:
   - Added test: `separates returned bodies from dedup stubs and catalog discovery`, verifying `skillBodies` and `skillStubs` counts and confirming that catalog discovery produces no bodies or skill loads.

5. **`mcp/test/WorkflowTelemetry.spec.ts`**:
   - Added tests:
     - `requires cachedInputCostPer1M when cachedPromptTokens is positive` (partial/null cost status).
     - `requires reasoningCostPer1M when reasoningTokens is positive` (partial/null cost status).
     - `does not demand rates for known zero cache or reasoning buckets` (exact cost computed with $0 addition).
     - `computes exact cost when all required rates are present`.

6. **`mcp/test/Tools.spec.ts`**:
   - Added tests:
     - `getSkill records estimatedTokens on full body return`.
     - `getSkill records loaded: [] when skill file body is absent`.

---

## 2. Acceptance Criteria & Invariant Verification

- [x] **Direct skill body fetch estimates:** `getSkill` records `estimatedTokens: estimateTokens(body)`.
- [x] **Separation of body returns from dedup stubs:** `TelemetryRecord` persists `skillBodies` and `skillStubs` separately while maintaining `skills` for freshness readers.
- [x] **No false claims of actor consumption or host provenance:** MCP consultation events explicitly note that observations are limited to session return and do not prove actor execution or host authenticity.
- [x] **Truthful conditional cost coverage:** Positive cache/reasoning usage requires rates; missing rates return `null` and mark `unavailable`; known zero buckets do not demand rates.
- [x] **Documented deployment identity:** Stdio MCP environment documented as unknown deployment identity without live reconfiguration access.

---

## 3. Verification Plan & Status

- **Verification Owner:** Parent Orchestrator
- **Planned Verification Command:**
  ```bash
  rtk pnpm --filter ./mcp exec vitest run test/Tools.spec.ts test/TelemetryWriter.spec.ts test/WorkflowTelemetry.spec.ts
  ```
- **Execution Evidence:** `RED NOT RUN` (Per orchestrator instruction, mid-flight test/build runs skipped until parent settled verification).
- **Baseline Behavior:** Existing source tests pass; new coverage exercises edge invariants (absent body, positive missing rates, zero cache/reasoning rates, stub vs body counts).

---

## 4. External Dependencies & Blockers

- **Host Authentication & Process Controls (H01/H05):** Caller strings cannot authenticate host identity without runtime host-injected auth tokens. Live restart/reconfiguration of the MCP stdio daemon cannot be initiated from within the daemon itself; host runtime controls process lifecycle.

---

## 5. Round 1 Review Correction (FINAL)

**Review Reference:** `artifacts/diagnostic-prevention/implementation/attempt-01/tasks-6-7-review-round-1.md`  
**Verdict Handled:** CHANGES REQUESTED  

### Corrective Actions Taken:
1. **Restored `workflows` in `buildTelemetryRecord` (T6-1):**
   - Re-added `workflows` property in the returned record in `mcp/src/services/TelemetryWriter.ts`, satisfying the declared `TelemetryRecord` contract and restoring workflow counts in persisted telemetry.
2. **Qualified Caller-Declared Source (T6-2):**
   - In `mcp/src/services/WorkflowTelemetry.ts` and `mcp/src/tools/index.ts`:
     - Explicitly documented that `host` provenance is caller-declared and host authenticity remains unverified by this MCP server without an external authenticated host boundary.
     - Added disclaimer to session telemetry output: `token and cost fields carry caller-declared source labels; host authenticity is unverified`.
     - Preserved existing numeric API without inventing fake host authentication.
3. **Evidence Status Correction:**
   - Baseline execution status: **NOT OBSERVED** (all test executions deferred to parent orchestrator per policy; no passing-test claim is made).
   - AC status: Source-implemented, pending parent settled verification.
