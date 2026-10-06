# Task 3 final independent review — authoritative v3

## Current authoritative verdicts

- **SPEC: PASS.** F1, F9, F10, F11, NV-T3-1, and T3-R2 are addressed in the bounded Task 3 contract. Actual installer discovery, actual generated exports, and actual collector CLI execution have parent-provided runtime proof.
- **QUALITY: PASS.** The narrow `NotADirectoryError` correction closes T3-R2 without blanket `OSError` suppression, force-adding directories, or writing the caller index. No new confirmed consumer defect or unresolved named needs-validation finding remains in this reviewed v3 change.
- These are task-scoped independent assessments, **not** maintainer approval, publication authorization, native-host permission certification, or a green whole-branch claim.

This v3 section supersedes all earlier verdicts, open-finding status, and then-pending export-gap statements below. V2/v1 sections are historical; their CHANGES REQUESTED wording is not the current verdict.

## Scope and authoritative evidence

Primary package: `.agents/sdd/pr223-remediation/task-3-review-v3.diff`, parent records **22,816 bytes, five files**, cumulative from `fbb30b5f52181c0f0c2943e2ff6ca2b5c4d9f757` to WORKSPACE. Read the complete frozen v3 diff and current collector/new-regression sections. V3 retains the reviewed helper metadata, YAML exporter changes, selective tracked membership correction, and existing package regressions.

Parent observations are authoritative and attributed; **none were rerun by this reviewer**:

| Proof | Observation |
| --- | --- |
| T3-R2 exact isolated regression before correction | **RED: exit 1, 0.39s**, single `NotADirectoryError`, errno 20, `owned/sub/file.txt`, at collector line 80 |
| Full isolated-Git suite after v3 correction | **13/13 GREEN, 2.95s**; includes old-child removal, replacement bytes, unchanged caller staged tree, ignored-untracked exclusion, staged-new membership, recreated file, and safe leaf-link serialization |
| Actual collector CLI generating immutable v3 | **Success, 0.32s**; new unique cumulative package |
| Earlier NV-T3-1 reproduction and v2 full suite | **RED, 0.49s**, staged-new omission; then **12/12 GREEN, 2.68s** after selective tracked-leaf staging |
| Actual installer discovery | `skills@1.7.0`: **303/303, no leakage, 3.68s** |
| Focused native-export transformer suite | **18/18 pass** |
| Actual native-export writer smoke | `SpecialistSyncService.syncSpecialists`: **exit 0, 1.57s**, real 21-specialist catalog, **105 generated files** across Cursor/Copilot/OpenCode/Gemini/Kiro; correct opening YAML, parsed native metadata/canonical descriptions, retained canonical bodies, post-frontmatter risk/permission warnings; owned temporary directory removed in `finally` |

The export command previously supplied by parent remains `rtk pnpm dlx node@20 --import tsx .agents/sdd/pr223-remediation/native-export-smoke.ts`; it is recorded evidence, not a reviewer-run command.

## Every finding mapped to current closure

| Finding | Current status / confidence | Closure evidence |
| --- | --- | --- |
| **F1** | **ADDRESSED / 100** | Local helper retains only `metadata.internal: true` addition (`v3.diff:23-38`). No catalog inflation or canonical inventory adjustment in this five-file diff. Actual parent installer reports 303/303 with no leakage. |
| **F9** | **ADDRESSED / 100** | All five YAML branches open with `---\n`, preserve native fields/body, and place advisory warning after the closing delimiter (`v3.diff:70-110`). Parsing regression checks native values and post-frontmatter L2 warning (`:178-216`). Parent 18/18 plus the real writer's 105-file smoke proves actual output metadata/descriptions/body/warning placement; Codex projection remains unchanged. |
| **F10** | **ADDRESSED / 100** | BASE-seeded alternate index, scoped staging, cached BASE-relative names/stat/body and `-U10` remain (`review_package.py:62-110`). Recreated replacement test still requires both removed BASE content and current replacement bytes (`test_review_package.py:150-166`). Immutable cumulative rounds remain covered; actual collector generated v3. Caller-index writes are not introduced. T3-R2 no longer blocks this contract. |
| **F11** | **ADDRESSED / 100 for specified ordinary leaf links** | Git serialization preserves mode 120000 and link-target text for directory-target/dangling additions, excluding target sentinel content (`test_review_package.py:233-258`). Selective tracked-leaf classification uses `lstat` and permits regular files/symlinks, not directory force-add (`review_package.py:78-88`). Parent 13/13 retains these cases. No native host or hostile-configuration sandbox guarantee is inferred. |
| **NV-T3-1** | **CONFIRMED HISTORICALLY, ADDRESSED / 100** | Parent reproduced v1 omission. Caller-index tracked enumeration plus ownership filtering/literal selective force-add into the alternate index remains (`review_package.py:68-91`). New ignored-after-staging test proves staged-new inclusion, adjacent ignored-untracked exclusion, and unchanged staged tree (`test_review_package.py:168-203`). V2 12/12 and v3 13/13 parent GREEN retained. |
| **T3-R2** | **CONFIRMED HISTORICALLY, ADDRESSED / 100** | Parent's exact RED confirmed the earlier source finding. V3 catches only `(FileNotFoundError, NotADirectoryError)` for stale tracked descendants (`review_package.py:79-82`; `v3.diff:318-324`). New directory-to-regular-file regression (`test_review_package.py:205-231`; `v3.diff:431-457`) requires old-child removal, replacement content, and unchanged caller staged tree. Parent full 13/13 GREEN confirms the fix. |

## SPEC and QUALITY rationale for T3-R2 closure

**Problem, historically:** The caller index could still list `owned/sub/file.txt` after its parent directory became a regular file. The pre-add membership scan raised ENOTDIR and aborted before normal Git staging.

**Decision now verified:** Treat that obsolete descendant as absent in the membership-preservation step, then let scoped `git add -A` serialize the old-child deletion and new regular file. The handler is restricted to ENOENT/ENOTDIR; this is not suppressing arbitrary I/O errors or substituting an empty successful package.

**Why:** The owned directory scope denotes the current tree, not an obligation to open descendants of a directory that no longer exists. The fix preserves the real current replacement while retaining original BASE removal/context and the caller's staged tree.

**Check:** The new real-Git regression changes the parent type without staging that change, so the stale index entry remains and the exact prior failure path is exercised. Assertions concern outward package content and real staged-tree state, not mocks, source wording, or incidental choreography. Parent RED and full GREEN establish fault sensitivity; this reviewer did not execute checks.

## Current quality and boundary assessment

- **Ownership/path/ignore:** Existing narrow literal-scope validation, scoped index enumeration, exact/prefix filtering, and literal forced leaf pathspecs remain. Only present currently tracked regular-file/symlink leaves are forced. Ignored untracked neighbors are not globally force-added. No new path/ignore permissions or broad input scope are introduced by the ENOTDIR correction.
- **Index and snapshot:** All mutating Git operations use the unique alternate-index environment; caller-index enumeration is read-only. Names/stat/body derive from one cached BASE-relative index. Regression `write-tree` comparisons prove staged-tree invariance in exercised cases, not a measured byte-for-byte physical index-file checksum.
- **Errors:** V3 skips only missing/stale descendant cases and reaches normal Git serialization. Unrelated `OSError` failures are not blanket ignored. No no-op/fallback serializer replaces Git.
- **Symlinks and races:** The specified leaf link additions remain non-dereferenced Git entries. No atomic multi-file filesystem snapshot, malicious same-UID race defense, hostile Git configuration sandbox, or universal permission enforcement is certified.
- **Maintainability/security:** The fix remains a narrow stdlib exception boundary in the existing serializer. No new dependency, shell execution, approval-policy change, caller-index mutation, directory-force staging, or established material performance defect is introduced by the reviewed v3 correction.
- **Tests/runtime:** Named package regressions and actual collector CLI execution are parent-proven. Actual native-export runtime gap is closed. No further Task 3 runtime rerun is needed for the already supplied evidence.

## Remaining integration limits — not open Task 3 findings

- Parent reports canonical slices settled and **Task 6 generation authorized**. Authorization is not generation-completion evidence. Repository mirror generation and root/integrated checks remain pending; this report does not certify them.
- Native host binaries were **not launched**. The export proof certifies generated files/metadata/body/warnings, not host loading or native runtime permission enforcement. Permissions remain advisory except the already documented concrete runtime primitives.
- Maintainer retains integration, risk acceptance, publication, and merge authority. No approval is granted here.

## Audit, cost, and report-only execution

Refreshed MCP `code-review` and routing for all five owned files; reused the previously loaded 11 review/security/language/test standards listed in the historical audit. MCP compliance audit and `get_session_cost(workflow="code-review", model="openai-codex/gpt-6.1-sol")` completed before handoff. Generic Next.js/React routing warnings do not correspond to framework code in this Node/Python task. Host tokens/pricing unavailable; no numerical cost claimed.

Only `.agents/sdd/pr223-remediation/task-3-independent-review.md` was edited. No commands, tests, builds, lint, formatting, source changes, delegation, premium consultation, approvals, or publication.

---

# Historical v2 review — superseded verdicts and T3-R2 status

The following v2 review and export-evidence update are retained unchanged. Its open T3-R2 finding and CHANGES REQUESTED verdict describe v2; the current v3 closure above is authoritative.

# Task 3 corrective independent review — authoritative v2

## Current SPEC and QUALITY verdicts

- **SPEC: CHANGES REQUESTED for one new ordinary-file transition failure.** F1, F9, the original F10/F11 scenarios, and NV-T3-1 are addressed. The corrective tracked-membership scan introduces a failure when a tracked directory is replaced by a regular file inside an explicitly owned directory.
- **QUALITY: CHANGES REQUESTED — one source-established Major, T3-R2 below.** NV-T3-1 is closed, not carried forward as unresolved. No Blocker, permission-enforcement certification, publication, or maintainer approval is issued.
- **Actual generated-native-export runtime gap: CLOSED by parent smoke.** All 105 generated exports passed across the five YAML platforms. Repository mirror generation remains integration-pending, not a Task 3 runtime gap. Native host binaries were not launched; permissions remain advisory. The separate T3-R2 collector finding keeps the current SPEC/QUALITY verdicts at CHANGES REQUESTED.

This current section supersedes the v1 verdicts and open-NV status. The original v1 report is retained below as historical evidence, without retroactively turning its inference into reviewer-executed proof.

## Authoritative scope and evidence

Reviewed `.agents/sdd/pr223-remediation/task-3-review-v2.diff` (parent records **21,434 bytes; five files**) as the replacement for v1. Its cumulative BASE remains `fbb30b5f52181c0f0c2943e2ff6ca2b5c4d9f757`; it is not a fix-only delta. Read corrective collector/test source and the unchanged native-export/local-helper changes in that package.

Parent-observed evidence, **not rerun by this reviewer**:

| Observation | Result |
| --- | --- |
| Exact isolated NV-T3-1 regression before correction | **RED, 0.49s:** staged-new content missing |
| Full isolated-Git Python suite after correction | **12/12 GREEN, 2.68s**, including staged-new inclusion, ignored-untracked exclusion, unchanged real-index tree, replacement, and symlink cases |
| Actual collector CLI generating the new immutable v2 package | **Success, 0.30s** |
| Original actual `skills@1.7.0` discovery | **303/303, no leakage, 3.68s**; retained parent evidence, not rerun |
| Original focused native-export Vitest suite | **18/18 pass**; retained parent evidence, not rerun |
| Actual `SpecialistSyncService.syncSpecialists` native-export smoke | **Exit 0, 1.57s:** real 21-specialist canonical catalog generated **105 files** across Cursor/Copilot/OpenCode/Gemini/Kiro in an owned temporary directory; all first-byte YAML delimiters, parsed native fields/canonical descriptions, retained canonical bodies, and post-frontmatter risk/permission warnings checked; temporary directory removed in `finally` |

Parent command for that export proof: `rtk pnpm dlx node@20 --import tsx .agents/sdd/pr223-remediation/native-export-smoke.ts`. Recorded as supplied evidence only; no reviewer execution or redundant rerun.

Trust class remains semi-trusted diff/source with parent observations explicitly attributed. No tests, commands, builds, lint, formatting, delegation, publication, or approvals were performed. Only this report was edited.

## Confirmed new consumer finding

### [MAJOR] T3-R2 — A tracked directory replaced by a regular file aborts collection

**File:** `skills/common/common-subagent-driven-development/scripts/review_package.py:78-82`; exception boundary at `:175-177`. Corrective insertion is visible at `task-3-review-v2.diff:318-324`.

**Confidence:** 99/100 in the source-level failure path. **No reviewer runtime reproduction is claimed.** This finding follows directly from path traversal/error semantics and the inspected handlers; the supplied 12-test suite does not exercise this transition.

**Concrete consumer path:** BASE and the caller's unchanged index track `owned/sub/file.txt`. In the worktree, remove that subtree and create an ordinary regular file at `owned/sub`. Request the explicit bounded scope `owned`. This is a normal directory-to-file Git transition entirely within the owned scope; it needs no ignored file, hostile worker, race, submodule, or outside symlink target.

The caller-index `ls-files` enumeration still returns `owned/sub/file.txt`. The new pre-add loop calls `os.lstat` on that stale descendant. Traversing its now-regular-file parent raises `NotADirectoryError` / `ENOTDIR`, not `FileNotFoundError`; see [Python's documented exception semantics](https://docs.python.org/3/builtins/exceptions.html#NotADirectoryError). Only `FileNotFoundError` is skipped. The outer exception tuple also omits `NotADirectoryError`, so the collector exits before the ordinary scoped `git add -A` at line 91 can serialize the removed descendant and replacement file. A traceback is the predicted runtime outcome, not an observed log.

**Why:** The corrective membership pass treats an obsolete tracked descendant as a fatal filesystem error. It prevents a valid cumulative review package for an ordinary file replacement. V1 had no pre-add `lstat` loop; this failure is introduced by the v2 correction, not inferred from the original F10 defect or from formatting.

**Fix:** Treat `ENOTDIR` for these obsolete tracked descendants as absence, alongside `ENOENT`, and let normal scoped Git staging capture the replacement. Do not blanket-catch unrelated `OSError` failures or force-add directories. Add the isolated directory-to-regular-file transition regression requiring old-path removal, new-file contents, and unchanged caller staged tree.

**Check:** Parent owns runtime confirmation and corrective RED/GREEN. The existing suite covers regular-file edits/additions, same-path recreated replacement, leaf symlink additions, and the new ignore-membership scenario, but none replaces a tracked parent directory with a file. This is an owned packaging-contract failure, not a missing-test-only finding.

## Finding-by-finding corrective assessment

| ID | Current status | Source, behavior, and limits |
| --- | --- | --- |
| **F1** | **ADDRESSED** | V2 retains only `metadata.internal: true` for the local helper; no inventory/count inflation. Actual parent installer discovery remains 303/303 with no leakage. |
| **F9** | **ADDRESSED, including actual generated-export runtime proof** | V2 retains first-byte `---\n`, native YAML values, and the advisory warning after closing frontmatter for all five YAML platforms. Parent `SpecialistSyncService.syncSpecialists` smoke exercised the real 21-canonical-specialist catalog and generated 105 files. Every generated file had the opening YAML delimiter, correct parsed native `globs`/`applyTo`/`mode`/`kind`/`name` and canonical description, retained canonical body, and risk/permission warning after frontmatter. Exit 0 in 1.57s; owned temporary directory removed in `finally`. Earlier 18/18 transformer-test evidence and unchanged Codex least-privilege projection are retained. This closes the Task 3 actual-export gap, not native-host loading or runtime permission enforcement. |
| **F10** | **Original defect ADDRESSED; broader package acceptance blocked by T3-R2** | BASE seeding, cached BASE-relative names/stat/diff, `-U10`, and immutable package creation remain (`review_package.py:67,91-110,145-152`). Replacement coverage still requires both `-initial a` and `+replacement content`, plus unchanged caller index tree (`test_review_package.py:150-166`). Original removed BASE lines remain required diff evidence. Parent actual v2 collector CLI succeeded, but that invocation does not cover the new transition failure. |
| **F11** | **ADDRESSED for the specified leaf links** | Current-tracked leaf classification uses `lstat` and accepts regular files or symlinks (`review_package.py:78-84`); Git still serializes link mode/target text without dereferencing leaf targets. Directory-target and dangling-link coverage remains at `test_review_package.py:205-230`, with mode 120000, target text, target sentinel exclusion, and index-tree equality. Included in parent 12/12 GREEN. No target content or host sandbox guarantee is claimed. |
| **NV-T3-1** | **CONFIRMED HISTORICALLY, then ADDRESSED in v2** | Parent reproduced the exact v1 staged-new omission. V2 reads current scoped tracked names through the caller index, filters by exact ownership, selectively force-adds only present regular-file/symlink leaves with literal pathspecs into the alternate index, then runs normal owned `add -A` (`review_package.py:68-91`). The new real-Git regression (`test_review_package.py:168-203`) asserts staged-new and existing-edit contents, absence of ignored-neighbor name/content, and unchanged real-index tree. Parent 12/12 GREEN closes this NV. |

## Corrective QUALITY analysis

- **Membership/ignore boundary:** The correction reads the caller index without mutating it. Selective `-f` restores tracked membership rather than authorizing every ignored file under an owned directory. The regression would fail both omission and blanket-force-add faults. Normal ignored untracked neighbors remain excluded.
- **Ownership/path handling:** `ls-files` uses the explicit scopes and a second exact/prefix ownership check. Forced leaf names use `:(literal)` and `--`, so names discovered inside owned directories are not treated as globs or pathspec magic. Existing public-scope restrictions remain. Repository-root invocation remains the documented prerequisite.
- **Index isolation and cumulative output:** `read-tree`, selective `add -f`, normal `add -A`, and cached serialization receive the alternate-index environment. Caller-index enumeration is read-only. Names/stat/body still use one cached BASE-relative index. Test `write-tree` equality establishes staged-tree preservation, not measured byte-for-byte physical index-file equality.
- **File types:** The regular-file/symlink leaf restriction correctly avoids force-adding an actual directory and importing its ignored neighbors. The stale-descendant `ENOTDIR` handling is the concrete regression identified in T3-R2. No additional speculative symlink/race finding is raised.
- **Races/runtime boundary:** No atomic multi-file filesystem snapshot or malicious same-UID sandbox is promised. Ordinary Git configuration/filter semantics remain in force. The new finding does not depend on concurrency.
- **Tests and efficiency:** The new isolated-Git case proves current tracked membership plus ignored-neighbor exclusion and staged-tree preservation; it is not a mock/wiring test. The extra scoped index query, leaf checks, and alternate-index stage preserve the existing Git serializer. No new dependency, permission expansion, or confirmed material performance defect is established.
- **Native-export SPEC/QUALITY evidence:** The parent smoke uses actual `SpecialistSyncService.syncSpecialists`, not transformer-only or mocked output, and validates every generated artifact across the real catalog/five formats. The actual-export acceptance gap is closed. Earlier parent Python **12/12 GREEN, 2.68s** remains packaging evidence, and does not exercise T3-R2. Repository-generated mirror refresh is an integration deliverable, not an untested Task 3 export runtime path.

## History and remaining gaps

1. V1 raised NV-T3-1 with 92/100 source-semantics confidence and no reviewer reproduction. Parent subsequently observed exact RED in 0.49s; the owner corrected membership; full parent Python GREEN is now 12/12 in 2.68s. The original report and its then-current inference/11-test evidence remain archived below.
2. T3-R2 is the **only new confirmed source-level consumer finding** in this corrective review. No unresolved NV-T3-1 hold remains. Parent should validate and repair T3-R2 through the owned implementation workflow.
3. Actual package CLI execution and actual generated-native-export execution are now parent-proven for v2. The former actual-export gap is closed by exit 0 in 1.57s with 105 generated files checked. Native host binaries were **not launched**; native-host loading/runtime permission enforcement remain unmeasured, and declarations/warnings remain advisory.
4. Repository generator/mirror refresh, integration docs/changelog, and whole-branch CI remain integration-pending outside this bounded review; they are not a remaining Task 3 runtime-export gap.

## Current audit and delivery boundary

Refreshed MCP `code-review` and the same five-file skill routing; reused the 11 previously loaded language/test/common review/security standards listed in the original report. Also loaded `receiving-code-review`. MCP compliance was audited before this update; generic Next.js/React routing warnings remain unrelated to this Node/Python surface. Session telemetry was requested; host tokens/pricing remain unavailable, with no numerical cost claimed.

No implementation or feedback-eval files were changed: the current authorization permits only this report. These verdicts are independent review assessments, not approvals.

---

# Historical v1 review — superseded verdicts and NV status

The following original report is retained unchanged. Its open-NV wording describes the evidence available during v1, not the current v2 status.

# Task 3 independent review — SPEC and QUALITY

## Verdicts

- **SPEC: PASS for the named F1/F9/F10/F11 remediation scenarios, subject to the explicitly pending integration smokes.** The diff implements the requested installer exclusion, first-byte native YAML, BASE-relative replacement serialization, and non-dereferencing symlink serialization. The broader cumulative-input contract has one alternate-index edge case needing validation below.
- **QUALITY: HOLD / NEEDS VALIDATION.** No new confirmed Blocker or Major is reported. One concrete, potentially Major tracked/ignored-input regression needs a bounded parent check or an explicit input-contract ruling. Workflow disposition: **CHANGES REQUESTED pending that resolution**, not a claim that the candidate defect was reproduced.
- This is a task-scoped review assessment, not maintainer approval, publication authorization, or whole-branch merge readiness.

## Scope, trust, and audit

Primary evidence: `.agents/sdd/pr223-remediation/task-3-review.diff`, read before the brief/report; cumulative `fbb30b5f52181c0f0c2943e2ff6ca2b5c4d9f757..WORKSPACE`. Reviewed the five owned source/test files, their direct contracts, the brief/report, and plan global constraints/rulings at `docs/prd/prd-plan-pr223-remediation.md:11-36`. Original findings were used to establish the consumer failures, not to presume the fixes correct.

Trust class: **semi-trusted** supplied diff/source and implementation claims. Runtime: **read-only source review**; no commands, tests, builds, lint, formatting, delegation, native host launch, publication, or approvals. Only this requested report was written. Parent observations supplied in the review assignment are authoritative runtime evidence; they were not rerun or presented as reviewer execution.

Loaded MCP workflow: `code-review`. MCP compliance audit completed before this report. Audited skills:

- `common/common-code-review`
- `common/common-security-audit`
- `common/common-owasp`
- `common/common-llm-security`
- `common/common-best-practices`
- `common/common-tdd`
- `typescript/typescript-language`
- `python/python-language`
- `python/python-testing`
- `angular/angular-testing`
- `nestjs/nestjs-testing`

Also read `using-superpowers`, the local `code-review` skill, repository review policy, trust-review policy, review checklist/report template, and TDD quality contract. MCP's Next.js/React coverage warnings reflect generic `.ts` routing; these files contain no Next.js/React framework surface. Repository severity ladder applies. The explicitly owned local maintenance helper is reviewed despite the general generated-mirror skip list. Readiness evidence exists at `artifacts/evidence/pr223-remediation/20261006-implementation-readiness.json`.

## Confirmed findings

**No new confirmed Blocker/Major findings.** No style-only findings are raised.

## Needs validation — separate from confirmed findings

### NV-T3-1 — Potential Major: alternate index forgets current tracked membership for new ignored paths

**Evidence:** `skills/common/common-subagent-driven-development/scripts/review_package.py:61-75`, specifically BASE-only `read-tree` at line 66 followed by `git add -A -- <scopes>` at line 67. The removed implementation first obtained tracked changes through the caller's normal index via `git diff --name-only BASE` (`task-3-review.diff:260-265`). The new collector never imports or otherwise consults current tracked membership. The entire inspected package suite (`test_review_package.py:49-209`) has no staged-new-file plus ignore-rule case.

**Confidence:** 92/100 in the source/Git-semantics risk; **runtime outcome unobserved in this review**. Potential severity is Major because the contract promises a cumulative package of scoped task changes. This is not an allegation of symlink leakage, arbitrary path inclusion, or a hostile-code sandbox escape.

**Concrete scoped scenario to validate:** BASE has `owned/existing.txt`, but not `owned/new.txt`. Create and stage `owned/new.txt` normally; then add an ignore rule for that exact new path to `.git/info/exclude`. Modify `owned/existing.txt` as well. Request a package for the explicit bounded directory `owned`. The real index still tracks `owned/new.txt`, but the alternate index seeded solely from BASE does not. [Git's ignore contract](https://git-scm.com/docs/gitignore#_description) says already tracked files are unaffected. [Git add's documented behavior](https://git-scm.com/docs/git-add#_description) silently skips ignored new files under directory traversal, while an explicitly named ignored file causes failure. Thus [INFERENCE] this collector can emit an apparently valid package containing the existing-file edit but omit the scoped staged addition; the exact-file scope variant can instead abort. A previously force-added ignored ordinary file is another way to reach the same tracked-membership state.

**Why:** Reconstructing tracked membership from BASE changes an input that is normally tracked in the caller's repository into an ignored untracked input in the temporary index. That distinction can hide reviewable implementation even though it is explicitly within the owned directory and already staged. Ordinary ignored, genuinely untracked files are correctly excluded and are **not** the concern; BASE-tracked ignored files remain known to the temporary index and are **not** the concern either.

**Check:** Parent owns the bounded isolated-Git validation. Check that both current file contents appear and the caller index remains unchanged; also verify ordinary ignored untracked neighbors remain excluded. The supplied 11/11 result does not exercise this state. No failing outcome is claimed here.

**Fix if confirmed:** Preserve current scoped tracked-path membership while serializing current worktree contents relative to BASE, without writing the real index. Do not blanket-force-add the owned directory: that would incorrectly import genuinely ignored untracked inputs. Alternatively, an explicit contract ruling must establish that this otherwise ordinary tracked state is excluded; the current literal-path/directory contract does not state that restriction.

## SPEC assessment

| Contract | Assessment and evidence |
| --- | --- |
| **F1 — real installer excludes the internal local helper; no catalog inflation** | **Addressed.** `.github/skills/skill-creator/SKILL.md:4-5` adds only `metadata.internal: true`. No canonical inventory/count change appears in the frozen diff. Parent reports actual `skills@1.7.0` discovery **303/303, no leakage**. The existing real-installer harness compares missing/extra names, not merely equal counts (`scripts/harness-smoke/checks.ts:88-132`). This is not inferred from a mocked catalog test. |
| **F9 — native YAML at first bytes, real metadata and advisory warning preserved** | **Addressed.** All five YAML branches start with `---\n`, serialize the same native fields, close the frontmatter, then emit the warning (`SpecialistTransformer.ts:119-147`). The test parses the frontmatter and checks actual `globs`, `applyTo`, `mode`, `kind`, or `name` values and the post-frontmatter L2 warning (`SpecialistTransformer.spec.ts:321-350`). Description/body serialization remains intact; the warning summarizer still retains declared risk/tools/permissions. Codex's read-only/workspace-write mapping and no-auto-danger-full-access behavior are unchanged, with existing canonical-role tests retained. Parent focused CLI suite: **18/18 pass**. Native host acceptance is not claimed. |
| **F10 — cumulative BASE-relative current replacement, original diff context, user index unchanged** | **Addressed for the reported deletion/recreation regression.** Temporary index is seeded from BASE, then updated from scoped current worktree contents; all three outputs use cached diffs against the same BASE/index, retaining `-U10` (`review_package.py:61-86`). The replacement test requires both `-initial a` and `+replacement content`, plus unchanged caller index tree (`test_review_package.py:150-166`). Removed BASE lines are necessary diff evidence, not leakage. Immutable cumulative-package coverage remains (`:126-147`). See NV-T3-1 for the separate tracked-input edge case. |
| **F11 — mode 120000 and link text, no dereference, dangling/directory targets** | **Addressed for normal Git symlink semantics.** Git stages the link entry in the alternate index; no Python following `isfile` check or `/dev/null` no-index path remains. The isolated Git test asserts mode `120000`, both target strings, absence of target-directory sentinel contents, and unchanged caller index tree (`test_review_package.py:168-193`). Parent corrected Python suite: **11/11 pass in 2.54s**. No outside target contents are requested or followed by the collector's own code. |

## QUALITY assessment

- **Ownership/path boundaries:** Existing workspace validation rejects missing, root/traversal, glob/magic, duplicate, and overlapping scopes (`review_package.py:31-47`). The same scopes constrain staging and all cached diff outputs. Root invocation is an existing documented prerequisite (`common-subagent-driven-development/SKILL.md:55-58`), not a new arbitrary-working-directory guarantee. Narrow-scope exclusion and space-containing path cases remain in the isolated suite.
- **Index isolation:** Every mutating Git call receives the copied environment with a unique temporary `GIT_INDEX_FILE`. No `read-tree`/`add` operation addresses the caller's real index. Temporary-directory cleanup occurs on exceptions. Existing-output refusal remains unchanged. Tests compare `write-tree` values, proving unchanged staged trees in those scenarios; they do **not** measure byte-for-byte index-file equality, despite that wording in the worker report.
- **Snapshot/races:** After successful `git add`, names/stat/body derive from the same cached index. Subsequent worktree edits cannot make those three outputs disagree. A concurrent edit during collection is not a globally atomic filesystem snapshot guarantee; ordinary Git semantics and cooperative worker ownership apply. No same-UID malicious-race defense or OS sandbox is asserted, and no concrete new race failure was established.
- **Ignore semantics:** BASE-tracked ignored files remain tracked in the temporary index, and normal ignored untracked additions stay excluded. The exceptional loss of current tracked membership is isolated in NV-T3-1; merely requesting a directory does not authorize importing its ignored files.
- **Symlinks:** Directory-target and dangling links are Git-valid leaf entries. Their targets need not exist or be inside the repository. Target strings are evidence, not filesystem traversal instructions. No collector-level dereference path remains. Unusual Git configuration, submodules, filters, and deliberately hostile repository configuration are not newly certified by these ordinary-file/link tests.
- **Security/AI safety:** Git subprocesses use argv arrays, not a shell. Advisory native permission comments do not become universal runtime restrictions merely because their placement is corrected. No new auth, network, credential, or approval-policy changes are present. Normal Git object writes/attributes/filter behavior are not an OS isolation boundary.
- **Efficiency/maintainability:** The alternate-index design replaces separate regular-file/no-index assembly with one Git representation for additions, modifications, deletions, and links. No new dependency or custom symlink serializer is introduced. No material efficiency or architecture defect is established in the reviewed task-sized inputs.
- **Tests:** Behavioral YAML parsing, replacement bytes plus original removal, link mode/target text/non-dereference, immutable rounds, scope exclusion, and error/output-collision coverage exercise real contracts. Removal of the superseded warning-only tests does not discard their L2-warning behavior, which remains in the parsing case. The mistaken assertion excluding the BASE removal was corrected rather than weakening the BASE-relative contract. No incidental formatting/type-style demands are raised.

## Evidence gaps and next action

1. **Resolve NV-T3-1 independently:** parent bounded validation or explicit package-input ruling; no reviewer execution authorized. Do not assume the candidate is reproduced, or dismiss it as the expected exclusion of untracked ignored files.
2. **Complete planned actual export/package smokes at integration.** Supplied parent evidence establishes the focused suites and real installer discovery, not completion of those separate final smokes.
3. **Native host binary was not launched.** First-byte YAML plus parsed native metadata is demonstrated at transformer/test level; installed-host loading/runtime permission enforcement remains unmeasured. The warning remains advisory.
4. **Integration-owned docs/changelog/generated propagation are outside these five source files.** This report does not certify their completion or green whole-branch CI.
5. The worker report's final rerun-pending statement is superseded by the authoritative parent **11/11, 2.54s** observation supplied to this reviewer. No redundant rerun is requested for the corrected replacement assertion.

Next workflow: parent bounded `verify-work` for the identified input edge and pending integration smokes, then independent re-review of any corrective diff. Maintainer retains risk acceptance and merge authority.

## Cost/compliance evidence

MCP audit returned the 11 loaded skills listed above and the workflow/file-routing/direct-load calls. `get_session_cost(workflow="code-review", model="openai-codex/gpt-6.1-sol")` was called. Host token usage/pricing were unavailable; no numeric cost, comprehensive cross-agent bill, or execution of all discovery-listed workflows is claimed.
