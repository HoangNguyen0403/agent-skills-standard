# PR #223 Remediation Implementation Plan

> **For agentic workers:** Use subagent-driven-development. Execute only your assigned task; no delegation, commits, pushes, merges, deployments, or policy changes.

**Goal:** Resolve the eleven confirmed Major defects, the type-import Nit, three validation gaps, and observed CI failures without weakening verification.
**Architecture:** Retain the existing task and text-evaluation engines, native exporter, and BASE-relative review collector. Repair their current contracts rather than create a second implementation. One worker owns each component; integration owns all generated/shared documentation and metadata.
**Tech stack:** Node/TypeScript, CommonJS benchmark fixtures/verifiers, Python stdlib, pnpm, GitHub Actions.
**Spec:** `artifacts/security-review.md` F1–F11, N1, NV1–NV3; requirements 1–8 in the approved original plan at `docs/superpowers/plans/2026-10-05-model-aware-instruction-modernization.md:11-34` (original numbering, not new governed trace identifiers).
**Approval:** User requested fixes and pipeline checks, then explicitly selected Subagent-Driven execution. SNC S=2 N=2 C=2, high. Standard eligible Personal Delivery workers; separate Personal Analysis & Review reviewers. The Cheap profile's configured Gemini provider conflicts with its stated Personal-Codex-only restriction, so it is ineligible under that restriction.

## Global Constraints
- Authorized personal/open-source checkout: `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/wealthy-hamster`; existing PR branch, HEAD `fbb30b5f52181c0f0c2943e2ff6ca2b5c4d9f757`.
- Preserve user-owned `paseo.json`, prior review artifacts, feedback evals, historical transcripts/results, and unrelated changes.
- No host/account/profile/approval-policy changes, live paid model runs, external publication, or production actions.
- Prefix shell commands with `rtk`; load AGENTS.md and applicable MCP skills before edits. Use read/edit/write tools, not shell editing.
- Workers skip build/lint/tests/formatters mid-flight. Existing failing reproduction evidence is authoritative RED; add behavioral regressions now. Integration runs checks once after the disjoint edits settle, followed by independent review.
- Do not suppress audit advisories, catch-and-ignore remote E2E failures, weaken authorization, inflate catalog counts, or relabel old evidence.
- Native YAML must open with `---`; native permissions remain advisory except concrete runtime primitives.
- Task verifiers and completion checks are integrity checks, not an OS sandbox against deliberately hostile same-UID code. State that limit explicitly.
- No inline controller implementation changes; docs/readiness/ledger orchestration only. Integration changes have a dedicated worker.

## Contract Rulings
1. Preserve current authorization create semantics: caller tenantId is overridden by the authenticated user's tenantId. Make all three guidance arms demand the same behavior; this avoids changing the existing oracle's product contract.
2. Restricted viewer listing must omit restricted documents, while direct restricted reads throw AuthorizationError. Editors/admins list their full tenant set, never another tenant's. Creation ID collisions must not overwrite foreign state.
3. Composite text runs are immutable views, not generation targets. Reject answer generation before runner invocation/writes, even if their top-level label is v4.
4. Unknown provenance is uncertainty, not proof of a mixed protocol. Report it and avoid known-only headline certification.
5. CI remote-sync must receive the existing read-only GitHub Actions token if the CLI supports it. Do not replace the real remote scenario with a mock or automatic retry.
6. Dependency remediation follows actual advisory patched-version/dependency-chain evidence. Consolidate duplicate pnpm keys without broad upgrades; preserve effective existing overrides and compatible intended security pins. Escalate incompatible upgrades with evidence.
7. Preserve advertised Node20 support: replace unsupported Promise.withResolvers in the affected engines and verify the actual Node20 lane; wire eval regressions into existing CI coverage.
8. Independent-review closure keeps protocol heterogeneity and unresolved contributors independent, qualifies physical-history presentation against full physical runs without rewriting records, and preserves current tracked membership in scoped alternate-index packages.
9. Carry the low-risk evidence exception through canonical verify-work, not just implementation. Expand Task5 ownership narrowly to that direct handoff; governed/sensitive trace and approval gates remain.

## Review Focus
- Premature verifier exit, incomplete/truncated receipt, and valid completion must have distinct outcomes.
- Normal leader exit with same-group helper must not race verifier execution; detached sessions remain outside the owned-group contract.
- Missing historical composite lanes and unknown exported provenance must never silently become fresh homogeneous evidence.
- Current replacement bytes and symlink targets must appear in review evidence without index mutation or target dereference.
- Pipeline fixes must preserve catalog, authorization, vulnerability, and real remote-sync gates.

## Task 1: Task harness and authorization oracle (F2–F6, NV2)
**Own:** `scripts/evals/task-{runner,types,index,runner.test}.ts`, `benchmarks/tasks/pilot.json`, `benchmarks/tasks/verifiers/`, `benchmarks/tasks/guidance/authorization.*.md`. Do not edit docs/shared metadata or text-evaluation tests.
- Add regressions for candidate process.exit(0), normal leader/non-detached ignored-stdio helper, valid `__proto__` task aggregation/JSON, foreign-ID creation collision, and viewer listing.
- Require an explicit structured completed-verification result, checked by the outer task runner independently of exit zero. Reject missing/malformed/duplicate/incomplete evidence. Preserve counts and useful evidence for real assertion failures. Update every owned test verifier and manifest hash; no legacy exit-only shim. Do not advertise this receipt as a hostile-code sandbox.
- Reuse bounded POSIX group termination/quiescence on normal exit; fail closed if owned group cleanup cannot be established. Preserve timeout/output bounds and Windows limitation disclosures.
- Use null-prototype per-task records, preserving all valid IDs without a name blacklist.
- Align spoof handling to forced tenant override in every arm. Exercise create collision and listing via the actual public service API; update passing test implementation, not the deliberately buggy starting fixture.
**Acceptance:** Early exit never succeeds; ordinary good implementations pass; owned helpers cannot continue past runner resolution; all accepted task IDs persist; collision corruption/viewer leakage fail oracle; treatment behavior is identical.
**Verification:** `rtk node --import tsx --test scripts/evals/task-runner.test.ts`; actual built-in task CLI smoke with deterministic worker; bounded helper cleanup observation.
**Report:** `artifacts/evidence/pr223-remediation/workpapers/task-1-report.md`.

## Task 2: Text provenance and evidence wording (F7, F8, N1, NV1)
**Own:** `scripts/evals/{execute,reporter,impact,compose}.ts`, `scripts/evals/evals-v2.test.ts` and narrowly related text-eval tests if needed. `manifest.ts` ownership is expanded only for the existing compromisedSkills array type annotation identified by the scoped strict compiler. No task-runner files.
- Reject composite generation before constructing/invoking runners or writing answers/metadata; preserve valid fresh-v4 generation and immutable historical reading.
- Keep unresolved contributors in provenance classification and emit uncertainty warnings without claiming unknown proves heterogeneity. Support category/group reports consistently.
- Import existing EvidenceMode as a type.
- Replace the unverified tool-free guarantee with truthful text-only evidence labeling: no-tool prompting/read-only capability is not host enforcement. Do not introduce host tool controls or certify historical runs.
- Add behavior regressions for missing historical composite recovery and known-plus-unknown report contributors. Remove incidental wording-only tests instead of re-pinning them.
**Acceptance:** No mutation or runner call for composite recovery; no v4-only headline with unknown contributors; historical verification unchanged; evidence labels do not overclaim capabilities.
**Verification:** `rtk node --import tsx --test scripts/evals/evals-v2.test.ts`; `rtk pnpm evals:verify -- --all`; actual temporary compose/recovery/report smoke.
**Report:** `artifacts/evidence/pr223-remediation/workpapers/task-2-report.md`.

## Task 3: Native metadata, package completeness, local catalog (F1, F9–F11)
**Own:** `.github/skills/skill-creator/SKILL.md`, `cli/src/services/utils/SpecialistTransformer.ts`, `cli/src/services/utils/__tests__/SpecialistTransformer.spec.ts`, `skills/common/common-subagent-driven-development/scripts/{review_package,test_review_package}.py`.
- Mark project-skill-maintenance metadata.internal true, preserving canonical inventory.
- Move unenforceable permission comments after native YAML closing delimiters for Cursor/Copilot/OpenCode/Gemini/Kiro; preserve body/warnings/metadata and actual least-privilege Codex projection.
- Add behavioral parsing coverage for permission-bearing canonical specialist exports.
- Include recreated untracked replacement content for base-tracked paths; use an isolated alternate index or other boring BASE-relative Git serialization, never modify the user's index.
- Support ordinary file and symlink Git additions with lstat/lexists semantics; include mode120000/target text, never follow links. Add isolated temporary-Git cases for replacement and dangling/directory symlinks, index unchanged.
**Acceptance:** Actual installer discovery excludes local helper; frontmatter parses with native metadata; collector includes current replacement bytes and safe link targets.
**Verification:** focused CLI exporter test; `rtk python3 -m unittest discover -s skills/common/common-subagent-driven-development/scripts -p 'test_review_package.py'`; installer smoke; actual export/package smokes.
**Report:** `artifacts/evidence/pr223-remediation/workpapers/task-3-report.md`.

## Task 4: CI root causes
**Own:** `package.json`, `pnpm-lock.yaml`, `.github/workflows/ci.yml`; `scripts/test-e2e.ts` only if the established credential contract requires adjustment; dependency-specific tests only if needed.
- Use the already-observed audit failures (proxy-addr GHSA-jqcg-44mw-7w3h, fast-copy GHSA-jggr-w7fw-pc2j); inspect current advisory sources, resolved dependency chains, and compatible patched releases. Consolidate duplicate pnpm objects rather than silently discard pins.
- Add supported read-only GitHub token environment to the remote-sync E2E step; verify the CLI's exact credential variable. No token printing or secret copying changes, broad permission increase, mocks, skips, retries, or continue-on-error.
- Do not change unrelated gates; report downstream failures newly exposed by the corrected prerequisites.
**Acceptance:** Corrected lockfile installs frozen; production audit clean or precise unreachable upstream blocker; CI E2E uses supported authentication; real sync remains enabled.
**Verification:** `rtk pnpm install --frozen-lockfile`; `rtk pnpm audit --prod`; local build/E2E with existing eligible credentials if available; actual post-push Actions requires separate publication approval.
**Report:** `artifacts/evidence/pr223-remediation/workpapers/task-4-report.md`.

## Task 5: Risk-sized workflow (NV3)
**Own:** `.agents/workflows/implement-feature.md`, narrowly affected direct-handoff `.agents/workflows/verify-work.md`, and relevant permanent workflow eval definitions only; no generated copies.
- Condition task-list, requirement IDs, decision trace, and PRD/SRS updates on governed delivery. Explicitly allow low-risk maintenance to keep its approved brief, acceptance criteria, decisions, and evidence in-chat/task report.
- Preserve sensitive-change risk floors, TDD, verification, approval, and independent review. Keep canonical workflow under80 lines.
**Acceptance:** A code/test-only low-risk maintenance scenario does not mandate new PRD/SRS documents; high-risk governed work retains trace and gates.
**Verification:** scenario trace against actual workflow; `rtk pnpm audit:sdlc`; no paid model evaluation.
**Report:** `artifacts/evidence/pr223-remediation/workpapers/task-5-report.md`.

## Task 6: Integration and delivery evidence (after Tasks1–5)
**Own:** `docs/EVALS.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md` only if affected, `CHANGELOG.md`, `skills/metadata.json`, generated indices/native exports, and dedicated remediation walkthrough/artifacts. Root package/lock remains Task4 ownership unless handed over.
- Reconcile contract docs, bump only affected common/workflow category versions under existing policy, preserve all historical evidence and prior review.
- Generate mirrors once with `rtk pnpm generate-indices`; prevent legacy .agent cleanup from losing ledger/report references by using .agents/sdd storage.
- Run focused regressions, actual task/export/package/text smokes, applicable full-root tests/build/lint/format checks and CI gates. Record exact outcomes including unrelated/environment failures; no blind reruns.
- Produce cumulative workspace review packages against pinned HEAD and separate independent reviews covering each task and whole-change behavior.
**Acceptance:** All findings resolved with observed proof; shared/generated surfaces agree; pipeline status precise, not claimed green based on local checks alone.

## Ownership/Interface Scan
| Pair/task | Interface/self-consistency | Finding/ruling |
|---|---|---|
| T1/T2 | Separate task vs text engines/tests | Disjoint; provenance docs integration-owned |
| T1/T3 | Task runner vs native exporter/Python collector | Disjoint |
| T1/T4 | Node package/lock runtime vs task engine | T4 dependency installation coordinated before checks |
| T2/T5 | Report wording vs risk-sized canonical workflow | Disjoint |
| T3/T5 | Canonical collector vs canonical workflow | Disjoint; generated copies integration-owned |
| T1–T5/T6 | Shared docs/metadata/generated export | T6 waits for all canonical edits |
| T1 | Completion receipt vs same-UID trust | Integrity receipt is not sandbox; document limit |
| T2 | Immutable view vs missing answers | Refuse all composite generation; preserve reads |
| T3 | Git index vs replacement/link bytes | Alternate index/non-following serialization only |
| T4 | Auth vs permission/secret policy | Existing contents:read token; no extra permission |
| T5 | Low-risk exception vs sensitive floor | Exception never bypasses high-risk trace |
| T6 | Full-root checks vs earlier parallel no-check rule | Run after edits settle, then review |

## Next Workflow
implementation-readiness -> dev-fix -> verify-work -> independent re-review. Commit/push/remote Actions run need the operator's publication decision; merging is never implicit.
