# Installed Brief Smoke Authoring Report (Attempt 01)

- **Date:** 2026-10-28
- **Tooling Artifact:** `artifacts/diagnostic-prevention/implementation/attempt-01/installed-brief-smoke.mjs`
- **Assigned Task:** Task 8 verification tooling (bounded throwaway scenario helper; no production source edits)
- **Profile:** `Personal - Cheap` (exact)
- **Status:** **FINAL** (Tooling authored; execution NOT RUN per policy)

---

## 1. Scenario Helper Architecture & Verification Contracts

`artifacts/diagnostic-prevention/implementation/attempt-01/installed-brief-smoke.mjs` was authored to exercise the actual built CLI sync and installed execution of `common-subagent-driven-development/scripts/task_brief.py` against the Task 2 contract invariants:

1. **Registry Fixture & Network Preload Isolation:**
   - Dynamically imports `startRegistryFixture` and `buildNarrowSnapshot` from `scripts/skill-tests/product-evidence-integration/registry-fixture.mjs`.
   - Uses `scripts/skill-tests/product-evidence-integration/network-preload.cjs` via `NODE_OPTIONS=--require` to redirect GitHub API requests to the loopback fixture while rejecting unauthorized external network requests.
   - Cleans and strips all ambient credentials (`GITHUB_TOKEN`, `GH_TOKEN`, `NODE_AUTH_TOKEN`, `NPM_TOKEN`, AWS keys) from the child environment.
2. **Actual CLI Sync into Clean Consumer:**
   - Allocates unique temporary consumer, home, and XDG directories under `os.tmpdir()`.
   - Configures `.skillsrc` with `claude` agent and `common` category pinned to the candidate commit SHA.
   - Runs `node <cliPath> sync --yes` against the loopback fixture.
   - Asserts sync exit code `0`.
3. **Canonical Script Byte Verification:**
   - Locates installed `.claude/skills/common/common-subagent-driven-development/scripts/task_brief.py`.
   - Asserts existence and verifies that `sha256(installedBytes) === sha256(sourceBytes)`.
4. **Foreign CWD Python Execution & Invariants:**
   - Invokes the installed script via `python3` from an empty foreign working directory (`foreign_cwd`), verifying self-contained sibling path imports (`sdd_workspace.py`).
   - **Assertion A04 (Positive Complete Contract):**
     - Matches canonical Task 2 contract template (`Scope / owned write set`, `Inputs`, `Outputs`, `Real Ingress`, `Invariants` with positive and negative bullets, `Verification owner`, `Handoff / freeze`, `Correction route`).
     - Asserts exit code `0`, output file creation, and content fidelity.
   - **Assertion A05 (Incomplete Contract Rejection - Outfile):**
     - Plan missing required contract headers outside fences.
     - Target brief file path specified.
     - Asserts exit code `5` (contract validation failure), and proves output file was **not created**.
   - **Assertion A06 (Incomplete Contract Rejection - Workspace Creation):**
     - Incomplete plan run without explicit outfile.
     - Asserts exit code `5` and verifies no `.agent` or `.agent/sdd` directory was created (contract validation occurs before workspace resolution).
   - **Assertion A07 (Preserve Existing Explicit Output):**
     - Pre-existing target file populated with immutable sentinel content.
     - Asserts exit code `4` (refusing to overwrite existing file) and proves sentinel content remains byte-identical.
5. **Strict Teardown & Exclusive Output Binding:**
   - Enforces exclusive output creation (`flag: 'wx'`); aborts immediately if `--out` destination already exists.
   - Captures candidate root, commit SHA, CLI build SHA, source script SHA, tree SHA, fixture port, and step timings.
   - Closes loopback server during teardown and cleans up scratch directory unless `--keep-temp` is passed.
   - Propagates fixture close errors or temporary workspace cleanup failures directly into `teardownSuccess = false`, `allPassed = false`, and records `teardownError`.
   - Sets completion marker `"completed": true` **only** when all assertions succeed AND fixture/workspace teardown completes without error.
---

## 2. Verification Status (NOT RUN)

Per brief constraint:
> "Do not run it/build/tests yet... No fabricated PASS or model proof."

- The smoke helper was **NOT RUN** during this turn.
- CLI build (`cli/dist/index.js`) is required before running and will be performed by the parent orchestrator during the integration covering gate.
- **Planned Execution Command:**
  ```bash
  node artifacts/diagnostic-prevention/implementation/attempt-01/installed-brief-smoke.mjs \
    --candidate-root /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention \
    --cli /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention/cli/dist/index.js \
    --out /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention/artifacts/diagnostic-prevention/implementation/attempt-01/installed-brief-smoke-run.json
  ```
- No model efficacy, benchmark claims, or fabricated PASS results are reported. Scope is strictly confined to personal worktree verification tooling.

---

## 3. Corrective Alignment & Teardown Hardening — FINAL

1. **Teardown Error Propagation:** Aligned teardown logic with `mcp-telemetry-smoke.mjs`: fixture closure and temporary workspace removal failures now record explicit errors and force `teardownSuccess = false` and `allPassed = false`, preventing false completion claims.
2. **Task 2/3 Frozen Contract Schema:** Confirmed full alignment with the final frozen Task 2/3 implementation: strict structured bold contract labels outside fences, non-empty values, both positive and negative invariant requirements, pre-workspace contract validation, atomic exclusive creation (`open(..., 'x')`), symlink destination rejection, and three-argument CLI/API invocation without bypass flags.

---

## 4. Route 2 corrective pass — tooling only (2026-10-28)

**Profile:** Route 2 (`Personal - DeepSeek`). **Status:** tooling corrected; execution still **NOT RUN** (parent-owned). The prior "aligned with frozen contract" statement is superseded by 4.4: Task 2/3 is again under Route 2 `cb8ce927` for a newline/tilde parser fix.

### 4.1 Defects found in the previous version

| Defect | Why it mattered | Correction |
|---|---|---|
| CLI sync used `spawnSync` | The loopback registry fixture runs in **this** process. A synchronous spawn blocks its event loop, so the fixture cannot answer the CLI until the 30 s timeout → guaranteed false A01 failure | Bounded **async** `runBounded` (spawn + 60 s kill), used for sync and Python. `node:child_process` docs and the existing consumer smoke both require async networked consumers |
| Byte identity compared only against source | Did not prove the installed bytes equal what the registry actually served | A03 now requires `installedSha === sha256(fixture.fileMap[<canonical path>])`, and records source vs served SHA separately |
| Positive extraction assertion was weak | A heading-only check could pass on a truncated brief | A04 additionally requires `**Real Ingress:**`, `**Verification Owner:**`, `**Correction Route:**` and the absence of the next task's heading |
| `.skillsrc` omitted `workflows` | Sync would also install default workflows, widening scope and run time | Explicit `workflows: false`; the slice under test is the installed skill package only |
| No `.agent`/brief side-effect check for the positive path | Only the negative no-outfile path was checked | A06 also enumerates unexpected `*-brief.md` files |
| Fixture teardown reported failure when the fixture never started | Conflated "nothing owned" with "teardown failed" | Close only an owned fixture; a never-started fixture owns nothing |
| Precondition failures produced no artifact | Missing CLI build ⇒ silent attempt | `main` publishes an exclusive blocked receipt (`stage: "precondition"`, `completed: false`); existing evidence is never overwritten |
| No interpreter provenance | Cannot distinguish a `python3` shadow from a helper defect | Records `python_binary` and `python_version`; Python env is explicit (no `PYTHONPATH`/`PYTHONHOME` leakage), runs from an empty foreign CWD |

### 4.2 Contract assertions kept (bind to installed bytes, not source imports)

- A05: exit **5**, no output file (stderr recorded, not asserted).
- A06: exit **5** before workspace resolution; no `.agent`, no brief.
- A07: exit **4**, sentinel bytes untouched (stderr recorded, not asserted).
- A04: exit **0** from `foreign_cwd`, complete contract body, stops at the next task boundary.
- A08: mixed-case labels (`**FILES:**`, `**VERIFICATION OWNER:**`, `**CORRECTION ROUTE:**`, uppercase invariant entries) extract with exit **0**.
- A09: contract labels inside a `~~~` fence never satisfy validation; exit **5**, no output.
- A10: a label with its value on the following line is refused; exit **5**, no output.
- A11: a missing task number exits **3** and publishes nothing.
- Invocation is the documented three-argument CLI (`PLAN TASK [OUTFILE]`); no bypass flag.

Assertions now bind the **stable exit-code contract** (2/3/4/5) plus no-output / unchanged-bytes / no-workspace state, not stderr wording, per the frozen source owner's contract.

### 4.3 Exact parent invocation

Requires `cli/dist/index.js` (currently absent; parent builds it).

```bash
node artifacts/diagnostic-prevention/implementation/attempt-01/installed-brief-smoke.mjs \
  --candidate-root "$PWD" \
  --cli "$PWD/cli/dist/index.js" \
  --out "$PWD/artifacts/diagnostic-prevention/implementation/attempt-01/installed-brief-smoke-run.json"
```

### 4.4 Frozen source binding

The installed helper reads the **installed** `task_brief.py` bytes and asserts only the frozen external contract:

1. Contract labels match case-insensitively (`**Verification owner:**` / `**Verification Owner:**`, `**Correction route:**` / `**CORRECTION ROUTE:**`, `**Real Ingress:**` / `**real ingress:**`).
2. Bold labels only; the value must be on the same line; horizontal whitespace only around label and colon; prose labels and next-line values never satisfy a field; positive and negative invariants are validated separately; handoff must contain final/freeze/report/handoff.
3. Backtick and tilde fences are excluded from contract validation and task-heading detection, with matching marker character and minimum length.
4. Validation runs before workspace resolution; publication is exclusive `x` mode with symlink refusal; API is `extract_task(plan_file, task_number, outfile=None)`.
5. Exit codes: `2` argument errors, `3` task not found, `4` publication refusal, `5` missing contract fields. Tests assert codes plus no-output / unchanged-bytes / no-workspace state, not stderr wording.

Source owner `cb8ce927` states `skills/common/common-subagent-driven-development/scripts/task_brief.py` and `scripts/skill-tests/common-subagent-driven-development/test_task_brief.py` are frozen for this contract. Parent must rebuild the CLI so the fixture-served bytes equal the frozen source, then run the helper once.

### 4.5 Honest limits

- Execution NOT RUN; no PASS, source-ready, host or rollout claim.
- `cli/dist/index.js` and the current `task_brief.py` are recorded by hash at run time; no hash is asserted here.
- No real remote network, credentials, installs, host policy change or activation is exercised; the fixture serves frozen candidate bytes over loopback only.

---

## 5. Freeze alignment pass (2026-10-28, supersedes wording-based negative assertions)

Source owner `cb8ce927` froze `skills/common/common-subagent-driven-development/scripts/task_brief.py` and its tests and stated the stable contract: case-insensitive labels; same-line values with horizontal whitespace only; backtick and tilde fences excluded; validation before workspace resolution; exclusive publication with symlink refusal; three-argument API; exit codes `2`/`3`/`4`/`5`.

The helper was corrected to bind that contract instead of stderr wording:

- A05/A07 no longer require `missing required contract fields` / `already exists`; they assert exit **5**/**4** plus no-output / unchanged sentinel bytes, and record stderr as evidence.
- New installed-boundary controls: **A08** mixed-case labels extract (exit 0), **A09** labels inside tilde and backtick fences are refused (exit 5, no output), **A10** a next-line value is refused (exit 5, no output), **A11** a missing task exits 3 with no output.
- Positive fixture already uses the canonical lowercase `**Verification owner:**` / `**Correction route:**` forms and remains valid under the frozen validator; no fixture was changed to accommodate the parser.

Verified statically against the frozen source: `_CONTRACT_LABELS`, `_label_value` (`re.IGNORECASE`, `:[ \t]*\*\*|\*\*[ \t]*:`), `_invariant_value` (bold/plain, `re.IGNORECASE`), `_fence_transition`/`_unfenced_lines`, exit sites 2/3/4/5. Execution remains **NOT RUN**.

Ownership note: the four repo mirror copies of `task_brief.py` (`.claude`, `.agents`, `.codex`, `.github`) still contain the pre-contract parser (`any_task_header`, no `_CONTRACT_LABELS`). They are generated artifacts assigned to the parent's generation/parity gate by the plan; this tooling never reads them and did not hand-edit them.
