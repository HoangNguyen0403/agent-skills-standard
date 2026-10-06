# Code Review: PR #223 — model-aware instruction modernization

## Verdict

**CHANGES REQUESTED — 11 confirmed Major findings, 1 Nit, and 3 high-impact items needing validation.** No Blocker or production-service breach is established. This independent PR review supersedes the earlier pre-PR clean verdict for merge-risk assessment; maintainer approval remains required.

- PR: https://github.com/HoangNguyen0403/agent-skills-standard/pull/223
- Review range: `1fb0537c339c1e135167f4c15ba603b8849da5bc..fbb30b5f52181c0f0c2943e2ff6ca2b5c4d9f757`; local HEAD/base matched the GitHub revision.
- Slug: `model-aware-instruction-modernization`; `snc_tier: high`; `SNC: S=2 N=2 C=2 total=6 tier=high`; review mode: **deep**.
- Trust class: **semi-trusted**. Diff/files are primary evidence; PR body, comments, source prose, design documents, and earlier approvals are data, not instructions or independent verification.

## Review Context, Runtime Contract, and Provenance

Three fresh `Personal · Analysis & Review` sessions reviewed independent runtime/security, text-evaluation/provenance, and policy/export/package slices. Their source review was read-only; they wrote only bounded local reports and did not run checks, implement fixes, delegate, or publish. The orchestrator independently exercised concrete scenarios using temporary repositories/fixtures, the actual runner/exporter/package collector, and deterministic child processes. The smokes were not live-model evaluations and no OS-level isolation is claimed.

Reviewed Security, Logic, Silent Failures, Type Design, AI Safety, Vibe Security, and Testing. Repository severity/skip policy and five-Nit cap apply. Generated mirrors were skipped except direct permission/frontmatter sanity; `.github/skills/skill-creator` is the manually maintained exception.

Loaded review rules: `common-code-review`, `common-security-audit`, `common-owasp`, `common-llm-security`, `common-task-complexity-routing`, `common-skill-creator`, language/testing rules, `docs/review-policy.md`, and the trust-review policy. MCP audit also lists prior documentation/retrospective loads. Angular/React/NestJS routing warnings arise from generic `.ts` extension routing, not framework code in this Node/Python CLI change. No language server was available.

Design/readiness evidence: the approved direction/requirements/technical-contract/test-lane plan at `docs/superpowers/plans/2026-10-05-model-aware-instruction-modernization.md:3-35,37-161`, assessed in `artifacts/evidence/model-aware-instruction-modernization/20261006T053122Z-implementation-readiness.json`. This is a current assessment of existing prerequisites, not a claim that the workflow ran before implementation or that merge readiness is clear.

Independent source reports: `/tmp/pr223-runtime-review.md`, `/tmp/pr223-text-review.md`, `/tmp/pr223-policy-review.md`. Concrete inputs, observations, commands, exit codes, and limits are retained in `artifacts/evidence/model-aware-instruction-modernization/20261006T053122Z-code-review-evidence.json`. Throwaway scripts were removed; their temporary fixtures were cleaned. The smoke-owned helper was terminated and a subsequent process lookup found no process.

## Findings

All Major findings below are **confirmed**, with independent source evidence and direct runtime or CI observations. Confidence scores assess the stated defect, not comprehensive system safety.

| ID / Severity | Lens / Confidence | Evidence | Fix |
| --- | --- | --- | --- |
| F1 / Major | Compatibility, AI supply chain / 100 | `.github/skills/skill-creator/SKILL.md:2-6`; installer CI found 304 skills vs 303 expected, extra `project-skill-maintenance` | Mark repository-local maintenance `metadata.internal: true`; preserve canonical inventory |
| F2 / Major | Logic, verification integrity / 100 | `verify-pagination.js:25`, `verify-authorization.js:27`, `task-runner.ts:941-947`; a module containing only `process.exit(0)` received 3/3 successes | Validate completed verification outside candidate execution; reject absent/incomplete results |
| F3 / Major | Resource lifetime, Silent Failures / 99 | `task-runner.ts:530-538,557-568,653`; normal exit 0 left an owned non-detached helper alive | Bound cleanup/quiescence of the owned group before verification |
| F4 / Major | Logic, Silent Failures / 100 | `task-runner.ts:224,1143-1145,1203-1207`; accepted `__proto__` task had 3 runs but no returned/persisted per-task key | Use a null-prototype record or `Map` with explicit serialization |
| F5 / Major | Experimental parity / 100 | `authorization.minimal.md:12` vs `verify-authorization.js:151-169`; permitted secure rejection failed the common oracle | Align all treatments and oracle to one spoofing contract |
| F6 / Major | Security oracle, Testing / 100 | `verify-authorization.js:146-178,317-325`; passing test implementation at `task-runner.test.ts:316-328` overwrote a foreign tenant's colliding ID | Add destructive-create collision coverage and require foreign-state preservation |
| F7 / Major | Provenance, Logic / 100 | `execute.ts:217-225,251-286`, `compose.ts:274-291,357`; a missing v1 composite lane regenerated with v4 while retaining v1 provenance | Refuse composite/historical regeneration or preflight effective lane protocols before writes |
| F8 / Major | Provenance, Silent Failures / 100 | `reporter.ts:389-400`; known-v4 plus unknown category produced v4-only summary with no warning | Retain unresolved contributors; disclose incomplete provenance |
| F9 / Major | Native agent architecture, Testing / 99 | `specialist-tdd-implementer/SKILL.md:4` activates `SpecialistTransformer.ts:121-148`; actual OpenCode export begins with a comment, not YAML | Place advisory warning after closing frontmatter; parse permission-bearing exports |
| F10 / Major | Review integrity, Logic / 100 | `review_package.py:72-78`; stage-deleted/recreated owned file appeared only as deletion | Include replacement contents for tracked/untracked overlap without changing the index |
| F11 / Major | Review availability, Logic / 100 | `review_package.py:80-82`; existing new directory-target/dangling symlinks were rejected as disappeared | Use non-following checks and serialize link targets/mode without dereferencing |
| N1 / Nit | Type Design / 100 | `scripts/evals/impact.ts:16,499`; `EvidenceMode` annotation has no import | Add the existing exported type to the type-only import |

Paths in the table with abbreviated filenames are under `scripts/evals/`, `benchmarks/tasks/{verifiers,guidance}/`, `skills/specialists/`, or `skills/common/common-subagent-driven-development/scripts/` as expanded below.

### F1 — Repository-only skill becomes publicly installable

**Why:** The valid renamed name activates installer discovery without the established internal exclusion. The real `skills@1.7.0` CI harness fails with `Extra: [project-skill-maintenance]`; canonical registry expectations exclude this local helper. This distributes repository-maintenance instructions as a catalog skill and breaks compatibility. **Path:** rename → external directory discovery → extra catalog entry. Existing mocked inventory tests do not execute actual discovery. Fix the local distribution metadata, not the expected count. [CI evidence](https://github.com/HoangNguyen0403/agent-skills-standard/actions/runs/37416625456/job/112116549611).

### F2 — Successful exit is mistaken for completed verification

**Why:** Both trusted verifiers import candidate code into their own process before assertions. Ordinary early exit can produce a valid zero exit without exports or checks. The actual pagination smoke recorded three evaluated successes and 100% with empty verifier output and intact hashes. **Path:** candidate `process.exit(0)` → trusted process terminates → exit-only acceptance. Existing verifier-tampering coverage changes verifier bytes and misses this unchanged-verifier path. A completion protocol must be checked; a log marker alone is not an adversarial sandbox boundary.

### F3 — Leader completion does not terminate its owned descendants

**Why:** Normal `close` clears the timeout while same-group helpers with ignored stdio can remain alive, race verification, or keep consuming resources. The smoke observed leader exit 0, no timeout/infra error, and a live helper; its helper had a short self-exit backstop and was explicitly killed by the smoke. **Path:** normal leader exit → immediate resolution/timer cancellation → background owned helper survives. This is distinct from explicitly detached sessions, which are documented out of scope. Nearby tests cover timeout and detached inherited pipes, not this normal-exit transition.

### F4 — Valid task IDs lose their per-task evidence

**Why:** Assigning `__proto__` to `{}` invokes its inherited setter; enumeration and JSON omit the entry. The real suite had three successful runs but both in-memory and persisted `byTask` key lists were empty. **Path:** accepted ID → prototype assignment → missing CLI/JSON row and pass-rate enumeration. This is local result loss, not demonstrated global prototype pollution. Existing ID cases cover traversal and aggregation uses ordinary keys.

### F5 — Treatment guidance and common oracle disagree

**Why:** `benchmarks/tasks/guidance/authorization.minimal.md:12` permits rejecting caller-supplied spoofing, but `benchmarks/tasks/verifiers/verify-authorization.js:151-169` requires success/override. A passing implementation changed only to reject spoofing was rejected by the real verifier. **Path:** compliant minimal-arm rejection → uncaught expected error in oracle → product failure. Required behavior differs between arms, biasing the comparison. Existing passing coverage always overrides.

### F6 — Destructive creation escapes the authorization oracle

**Why:** The oracle uses only fresh create IDs. The supposed passing implementation blindly sets a global document ID after forcing tenant ownership. It passed all ten real verifier checks, then a tenant-1 editor overwrote a tenant-2 document using its existing ID; the original owner's subsequent read was denied. **Path:** authorized local create + foreign ID collision → foreign-state overwrite → green benchmark. This is a benchmark-oracle defect, not a production-service breach or an objection to intentionally broken starting fixtures. Add a public-API collision case and preserve foreign state; update/delete checks do not cover creation.

### F7 — Recovery contaminates historical composite evidence

**Why:** Generation gates only the top-level v4 label, ignoring historical leaf provenance. A real mixed composite with one missing historical baseline called the injected runner once, wrote a new neutral answer, and retained `governing-skill-v1` provenance. **Path:** recover missing historical answer → top-level guard passes → v4 generation under historical leaf label, with historical sibling retained. Tests cover historical top-level refusal and incomplete inputs before composition, not recovery afterward. Composite evidence should remain immutable.

### F8 — Unknown provenance is silently excluded from the headline

**Why:** Unknown categories still contribute to rates but are filtered from protocol classification. The pure report smoke included a known v4 category and an unresolved exported category; the table said `unknown` for the latter while the headline said `neutral-skill-v4` without warning. **Path:** supported exported/alternate-root results → fixed-root manifest lookup misses → unknown removed from summary. Known v1/v4 tests do not cover unresolved contributors. Do not claim actual heterogeneous protocols solely from unknown; disclose the uncertainty.

### F9 — New permissions activate broken YAML placement

**Why:** The unchanged transformer prepends its permission warning before the YAML delimiter when the new L2 declaration exists. Actual canonical OpenCode transformation reproduced the prefixed header; removing only the declaration restored an opening delimiter. The [pinned OpenCode parser](https://github.com/anomalyco/opencode/blob/v1.18.32/packages/core/src/config/markdown.ts) directly calls [gray-matter](https://github.com/jonschlinkert/gray-matter/blob/master/index.js), whose delimiter check returns unparsed data for this shape. **Path:** new writer risk metadata → warning prefix → native description/mode unavailable. The native OpenCode binary was not launched; parser source and actual emitted bytes establish the issue. Existing new tests check warnings, not native parsing of permission-bearing exports.

### F10 — Cumulative package omits recreated implementation

**Why:** A path can be both base-tracked deletion and current untracked replacement. Subtracting tracked-diff names from the untracked set loses its current bytes. An isolated Git smoke recorded the owned path but omitted the replacement marker and reported deletion. **Path:** stage deletion → recreate without staging → incomplete package → later staging can introduce unreviewed code. Existing mixed tests use different filenames; the repair must retain BASE-relative semantics and leave the user's index untouched.

### F11 — Existing valid symlinks prevent review

**Why:** `isfile` follows links and rejects new directory-target/dangling symlinks as absent. Both existing Git-valid links failed collection in the isolated smoke. **Path:** ordinary owned link addition → following existence predicate → package abort. Serialize the Git link target/mode with non-following checks; never import outside target contents. Existing untracked cases are regular files only.

### N1 — Missing type import

**Why:** `EvidenceMode` is newly referenced without import. Root compilation excludes these scripts and eval execution is transpile-only, so no advertised runtime/build failure is inferred. Static source finding; no compiler check was run.

## Evidence Gaps and Needs Validation

1. **NV1 — AI Safety, confidence 85:** `scripts/evals/reporter.ts:339` says baseline/with-skill evidence is generated without tool execution. `execute.ts:52-70,141,173-194` supplies a read-only sandbox and a no-tool instruction but neither enforces nor retains/rejects tool-use events. Actual tool use is unobserved. Owner: evaluation maintainer. Validate host/retained historical evidence or label tool-free execution unverified; do not retroactively certify it.
2. **NV2 — Security-oracle semantics, confidence 85:** `authorization.minimal.md:16`, `authorization.current.md:37-38`, candidate permission matrix, and listing invariants do not clearly agree on restricted viewer listing. The passing template returns same-tenant restricted content to viewers; the oracle tests listing as admin. Owner: benchmark contract maintainer. Clarify one listing contract across treatments, then exercise the viewer public API. Do not invent extra production scope.
3. **NV3 — Workflow/AI Safety, confidence 90:** `.agents/workflows/implement-feature.md:12,22,26,37-38` accepts low-risk in-chat briefs but still unconditionally creates/updates SRS/PRD documents; `sdlc.md:50` promises no separate documents. Source contradiction is evidenced; actual agent behavior is unmeasured. Owner: workflow maintainer. Validate a bounded code/test-only maintenance scenario or condition the governed trace steps.
4. Current CI is not green. `harness` failure is attributable to F1. `lint-and-format` actually failed at `pnpm audit --prod`: critical [proxy-addr advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) and moderate [fast-copy advisory](https://github.com/advisories/GHSA-jggr-w7fw-pc2j). Dependency/lockfile paths are unchanged by this PR, so these are separate remediation follow-ups, not introduced findings. [Job](https://github.com/HoangNguyen0403/agent-skills-standard/actions/runs/37416625467/job/112116550030).
5. `unit-tests` actually failed during remote-sync E2E with GitHub API 403 rate-limit; source under review does not change that flow. Resolve CI's environment/auth prerequisite rather than rerunning the same failure. Validation was skipped downstream. [Job](https://github.com/HoangNguyen0403/agent-skills-standard/actions/runs/37416625467/job/112116549931).
6. CodeQL analyses, secret scan, dependency review, and SkillSpector passed in the observed CI snapshot. Those passes do not establish oracle correctness, native metadata behavior, or complete provenance. Prior local full-root results are historical evidence from implementation, not rerun in this review.
7. No live-model comparison, paid sweep, Windows/Linux lifecycle reproduction, comprehensive secret-exfiltration test, or native OpenCode launch was performed. Known same-UID trust and detached-session limits remain limits, not invented sandbox defects.

## Feedback Loop and Delivery Boundary

Added eleven permanent task-grounded skill-eval cases, one per confirmed Major:
- `common-code-review/evals/evals.json` IDs 5–13: F9, F2, F3, F4, F5, F7, F8, F10, F11 respectively.
- `common-skill-creator/evals/evals.json` ID 4: F1.
- `common-security-audit/evals/evals.json` ID 4: F6.

Focused existing definition-audit and task-grounding validation passed: eleven additions, zero audit issues, no duplicate IDs, all assertions grounded. These are **textual evaluation definitions**, not behavioral fixes or measured with-skill improvements; no model evaluation was run.

No implementation fix, generated-mirror refresh, new commit, push, PR comment, formal GitHub review, or merge was performed. Review artifacts and required feedback cases remain local/uncommitted. The previous security-review content is retained unchanged below. No publishing packet was emitted because comment publication has not been approved.

## Outcome Report

```json
{
  "schema_version": 1,
  "run_id": "20261006T053122Z-code-review",
  "slug": "model-aware-instruction-modernization",
  "workflow": "code-review",
  "feature_status": "implemented",
  "verdict": "CHANGES REQUESTED",
  "snc_tier": "high",
  "started_at": "2026-10-06T05:31:22Z",
  "completed_at": "2026-10-06T05:51:46Z",
  "requirement_trace": {
    "brd_objectives": ["Approved direction contract: plan goal/scope"],
    "requirements": ["REQ-1", "REQ-2", "REQ-3", "REQ-4", "REQ-5", "REQ-6", "REQ-7", "REQ-8"],
    "acceptance_criteria": ["AC-1", "AC-2", "AC-3", "AC-4", "AC-5", "AC-6", "AC-7", "AC-8"],
    "srs": ["Consolidated technical contracts: approved plan:26-35,116-125"]
  },
  "completed_evidence": ["Pinned local/GitHub revision", "Three independent layered reviews", "Concrete CI and temporary-runtime reproductions F1-F11", "Readiness assessment", "Eleven permanent feedback cases structurally validated", "artifacts/security-review.md"],
  "missing_evidence": ["Corrective implementation and passing regressions", "Tool-free execution proof", "Restricted-viewer listing contract", "Low-risk in-chat workflow validation", "Green CI after separate dependency/environment remediation"],
  "decision_needed": ["Maintainer chooses benchmark contract for spoof rejection and restricted listing", "Operator approval required before publishing findings"],
  "recommended_next_workflow": "dev-fix",
  "cost": { "source": "unavailable" },
  "agent": { "identity": "trusted coding assistant — PR review orchestrator with fresh independent reviewers", "model": "openai-codex/gpt-6.1-sol" }
}
```

## Next Workflow

`dev-fix`: resolve confirmed defects in bounded owned slices, retain failing-before/passing-after consumer regressions, then `verify-work` and independent re-review. Human maintainer retains merge/risk acceptance. No additional approval question is needed to finish this review; fixing and publishing are separate actions.

## Cost Report

Host token usage and pricing unavailable; no numerical session cost is claimed. MCP `get_session_cost(workflow="code-review")` is requested at final handoff. Its in-memory session includes earlier work and is not a complete cross-agent bill.

---

## Prior review retained unchanged — 2026-09-29

# Security review: open-source security remediation

- Date: 2026-09-29
- Scope: local `fix/open-source-security-remediation` patch against `develop`; SEC-01 installed-skill destination symlink containment and SEC-03 public Playwright-skill reference removal. Source: local diff and synthetic temporary-project smoke, not live targets.
- Trust class: trusted local checkout and user-authorized PR publication; no PR comments, external instructions, credentials, or live exercise targets were used as instructions.
- Runtime mode: local filesystem checks and synthetic temporary-project install only. No live cyber-exercise authorization, host-enforced network/credential scope, or independent exercise ground truth was supplied. Live exercise and independent adjudication: **blocked / not-tested**.
- Accountable owner: repository maintainer for merge and risk acceptance. Review and PR checks are not product or security signoff.

## Findings and evidence

- **SEC-01 (confirmed locally remediated; pending PR review):** Installed package destinations previously followed pre-existing symlinks. Focused 42/42 CLI tests and a synthetic two-agent package/backup smoke passed; linked resource and backup destinations were refused without outside writes. `lstat` preflight does not cover concurrent filesystem swaps, backup-restore source/ID reads, or direct root `CLAUDE.md` writes.
- **SEC-03 (confirmed locally remediated; pending PR review):** Removed the unrelated project guidance reference link and file from the canonical Playwright skill and four install mirrors. Local skill validation and `pnpm audit:injection` passed.
- **SEC-02 (not-tested):** Anonymous feedback policy remains a separate decision, excluded from the approved implementation plan.
- **Toolchain advisory (suspected risk; not changed):** `pnpm audit --json` reports one moderate GHSA-p498-v437-472g for transitive `@humanfs/node@0.16.7` under eslint; `pnpm audit --prod` finds none. Dependency manifests and lockfile are unchanged. Track separately.

## PR gate

- Local: focused 42/42 CLI tests, full CLI 1251/1251 tests, CLI build, root lint, skill validation, and injection audit passed; `git diff --check` passed. `pnpm format:check` reports files outside this patch in CLI and MCP; changed files passed focused Prettier checks. See `docs/srs/srs-walkthrough-open-source-security-review.md` for the before/after reproduction and limits.
- GitHub CI secret scan (gitleaks), dependency review, and full matrix: **not-tested until PR runs**. No local gitleaks, semgrep, trufflehog, detect-secrets, or codeql executable was available. Do not infer a clean secrets or SAST result from their absence.
- Required next gate: review PR diff and CI results; human maintainer decides merge. Live authorization/adjudication and SEC-02 remain separate.

---

## PR223 local remediation closure — 2026-10-06

This appendix preserves the original findings and historical reviews above. It records the unpublished corrected workspace, not merge approval or a new GitHub Actions result.

- **Original F1–F11, N1 and NV1–NV3:** addressed in bounded owned slices, with independent corrective reviews and attributed consumer-visible regressions/smokes.
- **Additional corrective findings:** complete privileged listings, full foreign-state preservation, provenance aggregation/history qualification, staged ignored files, tracked-directory replacement, fractional pagination, unresolved composite composition/reuse, and worker delegation ownership are addressed.
- **Final independent cumulative review:** original PR base `1fb0537c339c1e135167f4c15ba603b8849da5bc` → workspace, 197 changed files / 1,188,006-byte immutable package. Both harness/provenance and policy/projection reviewers report authoritative V2 **SPEC PASS / QUALITY PASS**, no open confirmed findings in their combined assigned scope. These verdicts do not provide human maintainer or security risk acceptance.

### Exercised proof

- Root suite: CLI1254, eval116, freshness62, outcome23, trace16, benchmark8, metrics44, release8, harness24; zero failures/skips, 14.13s.
- Node20.20.2 eval/outcome/trace lane:155/155, zero failures/skips, 9.17s.
- Expanded affected strict TypeScript compile: PASS1.29s, including composition and scorer narrowing without suppression.
- Actual Node20 task CLI: compliant pagination3/3 passes; fractional-predicate mutant3/3 product failures, no infrastructure failures. Actual compose/baseline CLIs refuse unresolved composition before output and require fresh generation for unresolved selected evidence.
- Latest changed-skill preflight:16skills,0issues; historical preflight bytes unchanged. Three token-calculator outputs byte-idempotent. Final generated42YAML/21TOML files parsed with canonical bodies preserved; no native-host permission proof.
- SDLC/outcome/trace/historical verification/full324-skill validation passed; 44 existing warnings retained. Earlier unchanged-surface coverage/build/authenticated remote-sync and exact mutating CI scripts remain phase-qualified evidence.

### Residuals and publication boundary

- Production dependency audit clean; full audit still fails on pre-existing unpatched server-development `braces@3.0.3`. No suppression or unsafe replacement.
- `magicast` still embeds `source-map-js@1.2.1`; declared-edge overrides do not patch bundled code. Benign indexed-map composition is not a vulnerability PoC or proof of attacker-controlled repository-input reachability.
- Strict-format debt and the historical fixed10% token-growth alarm remain visible. The latter is separately routed to a token-reduction proposal, not recalibration or fabricated model measurement.
- Linux/Windows lifecycle parity, hostile same-UID isolation, native host enforcement, live-model efficacy, and tool-free execution are not certified.
- Published head remains `fbb30b5`, with the previously observed failed Actions. No remediation commit/push/new-head Actions run or merge occurred.

### Evidence

- `artifacts/evidence/pr223-remediation/whole-review-correction-evidence.json`
- `artifacts/evidence/pr223-remediation/workpapers/whole-change-harness-review.md` — authoritative V2 appendix
- `artifacts/evidence/pr223-remediation/workpapers/whole-change-policy-review.md` — authoritative V2 appendix
- `artifacts/evidence/pr223-remediation/workpapers/pr223-remediation-walkthrough.md`

**Next:** operator publication decision; an approved push enables actual new-head Actions verification. Host token usage/pricing unavailable; no numerical session bill or measured model-quality improvement is claimed.
