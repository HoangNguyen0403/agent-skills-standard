# T5 independent security review

## Verdict: CHANGES REQUESTED

Boundary verdict: **not ready to approve local-untrusted ingestion**. Five source-confirmed defects below affect bounded work, special-file rejection, malformed-input handling, diagnostic safety, and caller-file consistency. No finding claims trusted execution or remote exploitation.

## Authority, provenance, and limits

- Authorized personal AGS; independent security reviewer, separate from implementation and the parallel code/spec review.
- Reviewed immutable `.agent/sdd/ai-test-assurance/T5-validator-review.md`, captured 2026-10-26T16:59:52.940Z, base `92d06c420f6a41f08e11579423e4e3eacdb7880d`.
- Snapshot source hashes: validate.ts `440394a2610fcf8b77ff8ec43331f8012ee65deb17593c747c3a9367286089e6`; index.ts `822b1b9c3cc1d331cc544ad969e761954b9bdd8d5c9c172151cc14c2782161c6`; types.ts `d95a17a39b2d6be1ec5e113680c0715d0edf01e4f7181c6f476508efe3f057a6`.
- Contract: `docs/srs/srs-ai-test-assurance.md` §§4–6; implementer claims: `task-5-report.md`.
- Source references below use original file line numbers; snapshot line = validate.ts line +1619, index.ts line +683. Evidence is static control/data-flow inspection, not executed reproduction.
- No source edits, delegation, build, lint, tests, formatters, shell execution, network, or premium calls. Only this requested review artifact was written. Parent-reported 43 pass/1 failure is not independently verified; the known UNSAFE_PATH diagnostic failure was not rerun.
- Loaded standards: common/common-best-practices, common/common-code-review, common/common-llm-security, common/common-owasp, common/common-security-audit, common/common-subagent-driven-development, typescript/typescript-language; additionally local `code-review`, `node-cli-boundary-hardening`, `using-superpowers`. MCP audit completed. Its generic framework/category coverage warnings do not identify applicable Angular/React/Nest/Next or product requirements in this builtin Node CLI scope.

## Findings

### [MAJOR] SEC-1 — Input limits do not bound work before traversal

**Evidence:** `scripts/test-assurance/validate.ts:371–397` (snapshot 1990–2016) filters all roots and compares every pair without a root-count cap. `:408–417` and `:528–536` flag oversized file/artifact arrays but still iterate them. `:843–896` (snapshot 2462–2515) allocates an entire `readdirSync` result, pushes every directory, reads/hashes every discovered file, and only checks the file count after completing all roots. The 10,000-file cap is per group, not summed per snapshot. Empty directories do not count at all.

**Why:** A <=1 MiB current.json can contain tens of thousands of short roots; 50,000 roots entail about 1.25 billion overlap comparisons before filesystem validation. A small honest-looking inventory selecting an attacker-controlled large tree causes arbitrarily many reads/hashes or directory traversals before rejection. The nominal byte/file limits therefore do not provide the required pre-traversal resource boundary (§6). No depth/directory-entry budget limits trees made mostly of empty directories.

**Fix:** Reject over-budget arrays before iteration; apply a shared per-snapshot file counter before opening the next file. Bound roots, total visited entries/directories and depth; enumerate incrementally instead of allocating whole directory listings. Replace pairwise overlap detection with bounded sorted-prefix checking. Budget values beyond the frozen limits need an explicit documented choice, not silent truncation.

**Check:** Parent can construct 10,001 tiny files beneath one selected root and instrument opens to establish that file 10,001 is never read. Separately test a wide/deep directory-only tree and a bounded large roots array; reject before quadratic work or unbounded enumeration. Existing snapshot tests cover drift, not these limits.

### [MAJOR] SEC-2 — FIFO/device/socket inputs silently disappear from inventories

**Evidence:** `scripts/test-assurance/validate.ts:826–887` (snapshot 2445–2506) handles selected roots only when `isFile()` or `isDirectory()`; all other kinds fall through to successful return. Directory children at `:861–884` reject symlinks but have no rejection branch for anything other than directories or regular files.

**Why:** Add a FIFO/socket/device to an otherwise valid selected directory: recomputation ignores it, preserving equality and allowing current/passed assurance. A selected special-file root can likewise be ignored while other roots provide the listed regular files. This violates §6 regular-file input boundaries and permits unsupported tree entries to evade the inventory. This is an acceptance defect, not a claim that the current code blocks on a FIFO.

**Fix:** Explicitly reject every selected root/entry that is neither a regular file nor a directory, and preserve invalid/exit 2. Do not open the special object to classify it.

**Check:** Parent can add `src/pipe` with `mkfifo` after a valid fixture is generated, then validate without modifying current.json. Required result: invalid/exit 2; no open/read of the FIFO. Also exercise a Unix socket leaf and a special-file selected root.

### [MAJOR] SEC-3 — Invalid intent can throw outside structured error handling

**Evidence:** `scripts/test-assurance/validate.ts:1187–1207` (snapshot 2806–2826) correctly marks malformed intent invalid and leaves `validatedIntent` null, but continues. At `:1447–1461` (snapshot 3066–3080), fault judgment casts `rawBundle.intent as Intent` and dereferences `intent.oracle.ref.path`. `index.ts:112` calls validate without a catch. A valid fault fixture with `intent: null` or missing `oracle` reaches this dereference after successful baseline/challenge processing.

**Why:** Attacker-controlled malformed receipts terminate the CLI with an uncaught TypeError rather than one local-untrusted JSON result and exit 2. This breaks fail-closed protocol/error labeling; stderr can expose runtime source paths. Schema rejection must prevent subsequent unsafe access, not merely record an issue.

**Fix:** Use only `validatedIntent` in fault judgment; skip judgment when it is null and keep fault invalid. Audit dependent accesses after failed validation. An entrypoint exception envelope may provide defense in depth but does not replace the guard.

**Check:** Generate a valid fault fixture, set intent to null, serialize, then invoke the real CLI with --json. Require exactly one parseable result, trust local-untrusted, satisfied false, exit 2, no uncaught stack. Repeat with `{}` / missing oracle.

### [MAJOR] SEC-4 — Attacker-controlled keys and paths are reflected into human diagnostics

**Evidence:** `scripts/test-assurance/validate.ts:279–285` (snapshot 1898–1904) includes unknown property name `k` in both issue.path and issue.message. `:912–937` (snapshot 2531–2556) interpolates artifact.path into messages. Repository issues also use caller/tree paths directly. `index.ts:34–36` (snapshot 717–719) prints issue fields verbatim. Relative-path checking at validate.ts:57–76 rejects NUL but permits newline, ESC and other control characters.

**Why:** Unknown keys can contain arbitrary newline/terminal escape sequences, injected into human output even though the input is rejected. A missing artifact named with a newline/ESC causes the same reflection. This enables forged diagnostic lines/terminal control sequences and contradicts the implementer's claimed fixed-code/no-reflection hygiene. JSON.stringify protects JSON syntax, not the human output renderer. No shell execution is claimed.

**Fix:** Unknown-key errors should identify only the closed parent schema path, never the supplied key. Use fixed artifact error messages and schema field paths; safely encode any intentionally exposed filesystem name. Do not echo invalid --require values in error envelopes either.

**Check:** Add an unknown top-level property named `\nSENTINEL\u001b[2J` to a valid bundle and call both human and JSON modes. Neither decoded diagnostic field nor human stdout/stderr should contain SENTINEL or ESC; result remains invalid/exit 2. Repeat with oracle.ref.path set to a nonexistent relative name containing those characters.

### [MODERATE] SEC-5 — Caller-selected JSON reads lack post-read identity verification

**Evidence:** `scripts/test-assurance/validate.ts:193–235` (snapshot 1812–1854) checks pre-open identity and size, reads expected bytes, then returns immediately. Unlike readContainedRegularFile at `:172–175`, it never fstats the descriptor or lstats the path after reading. Both current.json and bundle.json use this helper at `:986` and `:1111`.

**Why:** An in-place equal-length rewrite during a read can produce bytes that do not belong to a stable file version while passing the byte-count check. Path replacement during the read also goes undetected. The current snapshot is a separate caller trust input, so its reader should not have weaker consistency than artifact readers. Exploitation requires concurrent local mutation; runtime reproduction is not claimed. This is not trusted-authorship forgery protection.

**Fix:** Apply the same descriptor/path post-read dev/ino/mode/size/mtimeNs/ctimeNs checks used by the contained reader; require stable regular-file identity before returning bytes.

**Check:** Parent can intercept the first descriptor read in an isolated smoke harness, rewrite equal-length caller-file bytes, then return the original byte count. readCallerRegularFile must return an error, not ok. Also replace the pathname after opening. Do not run a nondeterministic racing test as the sole evidence.

## Other boundary observations / review limits

- Static symlink components and traversal strings are rejected before embedded artifact reads. Leaves use O_NOFOLLOW | O_NONBLOCK; nonregular descriptor objects are rejected; artifact size precedes Buffer allocation. Contained reads compare descriptor identity before/after and path identity afterward.
- Concurrent ancestor-directory replacement is not fully pinned: inspectContainedPath checks components then later opens a pathname; O_NOFOLLOW protects the leaf, not intermediate directories. A hostile concurrent rename/symlink swap requires a deterministic probe or a narrowed threat statement before claiming race-proof containment. **Needs validation**, not an observed escape. No openat-style descriptor-relative walk exists in this snapshot.
- evidence-root is not explicitly preflighted as a nonsymlink directory, and bundle is read through the unrestricted caller-file helper rather than bound beneath evidence-root. §4.2's bundle-under-root wording and permitted caller-selected root semantics should be reconciled by the code/spec reviewer; no attacker-controlled embedded root override was found in the reviewed artifact path helper.
- Static-report validation checks object key allowlists but does not validate all scope arrays, tool nullable members, analysis counts or nested finding/diagnostic shapes. For example `{}` as scope passes the allowlist, and missing/negative counts can pass complete-status comparisons. `scope.unsupported.length` can throw in not_applicable handling, though the outer report parse catch converts that to invalid. This schema completeness defect is also relevant to the parallel code/spec reviewer; no static report can by itself satisfy executed/fault.
- No receipt command, variant script, URL, child process or network invocation is executed by the reviewed validator/CLI. Command fields are compared as strings only.
- Trust is fixed local-untrusted on returned validator objects; changing bundle.trust to trusted is rejected. A forged hash-matching receipt remains a local claim. Human oracle independence/authorization is not established by this validator, consistent with §4.
- index.ts:117–125 uses resolve rather than realpath for direct-execution detection. Symlink-normalized invocation can silently skip the CLI; parent should include an actual symlinked-root smoke. This is a portability/check-execution gap, not a demonstrated security bypass here.
- No broad dependency/credential/remote attack audit was attempted; web/mobile OWASP controls and LLM invocation controls are not affected by these local builtin-only paths.

## Bounded parent reproduction command (proposed; NOT run)

This standalone command creates an isolated temporary fixture, exercises SEC-3 and SEC-4 through the CLI's run interface, and removes the fixture. It does not evaluate receipt commands. Run only after the implementation batch is frozen; apply the same cases to the real CLI for final acceptance.

```bash
rtk proxy node --import tsx --input-type=module -e '
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createValidFaultBundle, createValidDeclaredBundle } from "./scripts/test-assurance/__fixtures__/fixture-helper.ts";
import { run } from "./scripts/test-assurance/index.ts";
const base = fs.mkdtempSync(path.join(os.tmpdir(), "t5-security-"));
try {
  for (const mode of ["null-intent", "unknown-key"]) {
    const evidenceRoot = path.join(base, mode, "evidence");
    const repoRoot = path.join(base, mode, "repo");
    fs.mkdirSync(evidenceRoot, {recursive:true});
    fs.mkdirSync(repoRoot, {recursive:true});
    const fixture = mode === "null-intent" ? createValidFaultBundle(evidenceRoot,repoRoot) : createValidDeclaredBundle(evidenceRoot,repoRoot);
    if (mode === "null-intent") fixture.bundle.intent = null;
    else fixture.bundle["\nSENTINEL\u001b[2J"] = true;
    fs.writeFileSync(fixture.bundlePath, JSON.stringify(fixture.bundle));
    const args = ["--bundle",fixture.bundlePath,"--evidence-root",evidenceRoot,"--repo-root",repoRoot,"--current",fixture.currentPath,"--require", mode === "null-intent" ? "fault" : "declared"];
    try { console.log(JSON.stringify({mode,result:run(args)})); }
    catch (error) { console.log(JSON.stringify({mode,thrown:error.constructor.name})); }
  }
} finally { fs.rmSync(base,{recursive:true,force:true}); }
'
```

Expected pre-fix behavior is a source-derived prediction, not observed output: null-intent throws TypeError; unknown-key human output contains SENTINEL/ESC. Required repaired behavior is invalid/exit 2, structured local-untrusted result, no attacker reflection.

## Acceptance handoff

Parent: route SEC-1 through SEC-5 to the T5 implementation owner, regenerate the cumulative immutable packet, then independently re-review. Run bounded reproductions and integrated real CLI smokes only in the parent-authorized verification phase. Retain the known test failure separately; do not weaken it to erase an unsafe-path diagnostic distinction. No release/production/blocking-policy approval is supplied by this review.

Cost: runtime token counts/rates unavailable; no monetary or savings estimate claimed.

## Superseding scoped rereview — T5 recovered snapshot

### Verdict: CHANGES REQUESTED — two bounded schema corrections remain

This section supersedes the original snapshot's scope verdict, not its historical evidence. SEC-2 through SEC-5 are resolved by source inspection. SEC-1's filesystem and allocation exposure is repaired; its early-array-rejection requirement has one remaining traversal below. Sorted-prefix overlap checking also has a concrete correctness gap. Neither finding establishes sandbox escape, command execution, or an OS race-proofing requirement.

**Reviewed revision:** immutable `.agent/sdd/ai-test-assurance/T5-recovered-review.md`, captured 2026-10-26T23:05:26.627Z; parent-supplied packet SHA-256 `d97a4cc203b5f2ab8893ff835e0c228dbd891630eadbdf9389bd3abeb8f771a8`. Hash provenance is parent-supplied; this read-only rereview did not run a checksum command.

**Contract:** current `docs/srs/srs-ai-test-assurance.md` §6, including the narrow addendum: total per snapshot 128 roots, 10,000 regular files, 20,000 visited entries, directory depth 64; incremental enumeration, early budgets, nonregular refusal, safe diagnostics and stable caller-file reads. The historical legacy SRS basename is not used as authority.

**Standards:** previous security/review standards remain loaded; file routing reloaded for io.ts, schema.ts, validate.ts and index.ts; session compliance audited.

### Original-finding disposition

| Finding | Source disposition in recovered packet |
| --- | --- |
| SEC-1 | **Substantially repaired, residual below.** schema.ts snapshot lines 1558–1582 sum roots/files across all four groups before element validation. Execution artifacts use an over-limit `else if` before the validation loop (1760–1773). validate.ts creates one budget and visited set across categories (3762–3775). io.ts charges file counts before reads (1316–1321, 1379–1384), charges entries before descendant work, uses incremental opendirSync/readSync with finally-close (1346–1408), and limits directory depth before pushing children. The prior unbounded directory listing and post-traversal count check are gone. |
| SEC-2 | **Resolved in static control flow.** io.ts rejects nonregular/nondirectory components without opening (1091–1094) and rejects special directory entries before handling files/directories (1363–1367). Symlinks are separately rejected; FIFO/device/socket entries no longer silently disappear from stable-tree inventories. |
| SEC-3 | **Resolved.** validate.ts marks null/invalid intent invalid (3870–3876), refuses fault interpretation when validatedIntent is null (4000–4010, 4164–4184), and uses only validatedIntent.oracle. Unexpected errors receive a fixed INTERNAL_ERROR envelope with invalid/exit 2 (4285–4300), rather than an uncaught stack or a trusted result. |
| SEC-4 | **Resolved for reviewed producers.** schema.ts unknown-key issues contain only parent schema paths (1453–1481). Artifact errors use fixed messages (validate.ts 3579–3611). io.ts rejects C0/C1 control characters in embedded paths (1030–1064), and encodes/bounds filesystem diagnostic names (1035–1042 and all traversal issue paths). index.ts uses Object.hasOwn for valued flags (796), emits fixed unknown-token diagnostics, and sanitizes invalid required-level fields. Producer report strings are not forwarded as validator issue text or executed. |
| SEC-5 | **Resolved.** io.ts caller-file reader checks post-read fstat, path lstat, regular/nonsymlink kind and matching dev/ino/mode/size/mtimeNs/ctimeNs before returning bytes (1230–1245); both current and bundle reads use it (validate.ts 3652, 3794). Byte caps still precede Buffer allocation. This closes the missing-check defect, not all possible concurrent filesystem attacks. |

### Remaining findings

#### [MODERATE] SEC-1-R1 — oversized artifact array is still scanned by failure lookup

**Evidence:** `scripts/test-assurance/schema.ts:342–352` rejects artifact arrays over 32 and skips element validation, but `:364–370` then performs `exec.artifacts.some(...)` whenever failure is an object and artifacts is an array. Recovered snapshot lines 1763–1773 and 1786–1792 show this exact path.

**Why:** A malformed assertion-failure receipt with more than 32 artifacts still causes element traversal after the explicit count rejection. This is the remaining original SEC-1 requirement to reject over-budget arrays **before iteration**, now explicitly required by §6. The JSON 1 MiB cap bounds the residual scan; no unbounded file I/O or acceptance bypass is claimed.

**Fix:** Return false immediately on an oversized artifact array, or restrict every dependent artifact iteration, including failure membership lookup, to arrays with length <= MAX_EXECUTION_ARTIFACTS.

**Check (proposed, not run):** Use an otherwise valid assertion_failed execution with 33 artifact records and a failure.artifact_path matching only the final element. An isolated direct schema harness can place counting getters on artifact.path: expected count is zero after size rejection. A JSON/real-CLI case should independently confirm exit 2/satisfied false; that CLI result alone does not prove early iteration stopped.

#### [MODERATE] SEC-1-R2 — adjacent lexicographic prefix check misses overlapping roots

**Evidence:** `scripts/test-assurance/io.ts:286–296` (recovered snapshot 1260–1270) sorts raw path strings and checks only each adjacent pair. For `["src", "src-aux", "src/nested"]`, raw lexicographic order is exactly that sequence. Neither adjacent pair satisfies the test, even though src contains src/nested. schema.ts:195–203 (snapshot 1616–1624) relies on this helper to reject overlapping roots.

**Why:** The replacement overlap algorithm violates the frozen §4.2 invariant and §6's sorted-prefix requirement: an attacker can insert a lexically intervening sibling and submit an overlapping root selection as structurally valid. With matching inventories and existing empty sibling/nested directories, redundant same-group traversal is deduplicated rather than rejected. Shared entry/file budgets still bound work; no cross-root escape is claimed.

**Fix:** Use component-aware sorting or a bounded ancestor set/path-prefix check that cannot be interrupted by punctuation-sorted sibling names. Keep the 128-root precheck; do not restore unconstrained quadratic work.

**Check (proposed, not run):**

```bash
rtk proxy node --import tsx -e 'const {hasOverlappingRoots}=require("./scripts/test-assurance/io.ts"); console.log(hasOverlappingRoots(["src","src-aux","src/nested"]));'
```

Source-derived pre-fix prediction: false; required result: true. For integrated validation, add empty src-aux and src/nested directories to a valid declared fixture; update current.inputs.source.roots to those three paths while retaining the unchanged regular-file inventory. Required outcome is malformed schema/exit 2, not successful declared validation. This command and scenario were not executed by this reviewer.

### Other original observations and retained limits

- Nested static-report validation now checks scope arrays, tool nullable values, nonnegative counts, findings, diagnostics and policy types before cross-field access (schema.ts snapshot 1930–2281). This supersedes the original broad observation that those fields were unchecked; exact producer cross-field semantics remain the parallel code/spec review's ownership.
- CLI direct-execution comparison now uses realpathSync with a resolve fallback (index.ts snapshot 945–958), superseding the original resolve-only portability observation. Actual invocation evidence remains parent-owned.
- Current/root/bundle boundaries remain explicitly caller-selected. Embedded references stay below the selected evidence/repository roots; no new sandbox or bundle-location restriction is introduced by this rereview.
- Ancestor-directory swaps remain **needs validation**, not a demonstrated escape. Component lstats, O_NOFOLLOW leaf opens and descriptor identity checks are not proof of OS race-proof containment. This is retained threat-limit wording, not an added acceptance blocker.
- No child process, receipt-command evaluation, network access, artifact script execution, or trust upgrade exists in the reviewed module flow. Returned trust remains local-untrusted; any invalid condition forces satisfied false and exit 2 (validate.ts snapshot 4293–4327).

### Parent evidence and independent-review limits

Parent reports, not independently executed here:

- Focused suite: 48 passed / 0 failed; `T5-recovered-tests` SHA-256 `41a3b7c510ac8d15acdd970b02b31e978adbe8072a53cb82572e3f1a4c7169da`; strict typecheck passed.
- Actual CLI assurance/stale/tamper smoke receipt `T5-recovered-actual-cli` SHA-256 `2f01cf27bf1c802d71b15e2077d0306b7edd96cac854e48521f4fd7064f2cc99`.
- Boundary CLI receipt `T5-recovered-boundary-cli` SHA-256 `6d6d9564871e274e15889ea83ffb3a4ef1a0b22d4432f4721d13f201f8543201`: valid fixture first exits 0; FIFO, 65-deep directory, 129 roots, null-oracle fault and unknown newline/ESC property reject with exit 2/satisfied false/single JSON/no stderr; human diagnostic contains neither SENTINEL nor ESC.

These observations support the repaired cases but do not cover the two residual counterexamples, all budget boundaries or filesystem races. This reviewer ran no tests, builds, typechecks, checksum commands, CLI probes, network calls, recursive delegation or premium calls. No source changes were made. Parent should correct SEC-1-R1/R2, freeze the resulting packet and route those exact counterexamples for bounded verification/review; no unchanged reruns requested.

## Final scoped security closure — T5 residual-corrected snapshot

### Verdict: APPROVE within the assigned security scope

This verdict supersedes the preceding CHANGES REQUESTED verdict for SEC-1–SEC-5 and their two residuals. No remaining material security finding was identified in the two corrective source paths. This is not whole-feature acceptance, release approval, trusted execution attestation or approval of the separate code/spec review's count/diagnostic findings.

**Revision:** `.agent/sdd/ai-test-assurance/T5-residual-corrected-review.md`, parent-supplied packet SHA-256 `44770816655e0cc4a6361173337054a0b8d5d1723402678a56f44e537c5905b5`. Reviewed packet source hashes: io.ts `815a8d86b3ab7396b02178a17927e76ab4b6718a8d744820d1b754693894b540`; schema.ts `43fc81a7c8ce14a584baf38b50b6dccb00318ae591a647a85bfd29455c27b8c3`. These identities are supplied by the packet/parent, not recomputed by this reviewer.

- **SEC-1-R1 closed:** schema.ts recovered packet lines 1771–1784 still reject oversized arrays without entering element validation. The dependent failure lookup at 1800–1805 now requires both Array.isArray and length <= MAX_EXECUTION_ARTIFACTS. An over-budget array preserves ok=false/INPUT_TOO_LARGE and cannot reach either artifact element loop or `.some`; valid bounded arrays retain the membership check. No new malformed-type dereference was introduced in that guard.
- **SEC-1-R2 closed:** io.ts packet lines 1266–1281 build a root set, reject duplicate roots, and test every slash-delimited ancestor prefix. `src/nested` therefore detects `src` regardless of an intervening `src-aux` sibling; `src` and `src-aux` alone do not overlap. This also covers longer ancestor chains independently of input order. Existing snapshot prechecks bound the root count before this helper, and accepted paths have no empty/dot segments. No filesystem access or diagnostic reflection was introduced by the replacement.
- **SEC-2–SEC-5 remain closed** under the previous source dispositions. The assigned scope states there were no other I/O changes beyond the overlap helper; this closure review did not repeat an unrelated full audit.

**Evidence/limits:** Parent reports 56 passing tests in `T5-residual-corrected-tests`, log SHA-256 `884f06247ae35b9748bdb56ab03fef92b443beb4240738944b8536bca1cd53f0`. This is attributed parent evidence, not an independently run security check. Closure above is grounded in source control flow. No tests, probes, builds, typechecks, checksum commands, source edits, network, delegation or premium calls were run. Only this report append was written. Standards routing refreshed; session compliance audited.

The ancestor-directory-swap caveat remains **needs validation**, not a demonstrated escape or a new blocker. Static component checks and leaf descriptor identity checks do not prove OS race-proof containment. Current SRS §6 bounds and local-untrusted assurance limits remain the approved review boundary. No additional sandbox requirement is introduced.
