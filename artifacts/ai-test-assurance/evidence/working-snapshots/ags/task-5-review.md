# T5 independent spec, architecture and code-quality review

## Verdict: CHANGES REQUESTED

- Spec: **CHANGES REQUESTED**. T5-1's documentary boundary is implemented, but T5-2/3/4 have the concrete contract defects below.
- Quality: **CHANGES REQUESTED**. External JSON is asserted into trusted types before full validation; semantic identities depend on serialization order; invalid evidence can retain an affirmative satisfaction result.
- Architecture-guard lens: Node/TypeScript CLI → local validation engine → filesystem, with type-only contracts. No added package, network dependency, receipt-command execution, or unnecessary strategy/interface layer appears in the supplied snapshot. Keep these boundaries; fixes do not require a new framework. The specific boundary violation is the incomplete external TestGuard adapter in F1.
- Reviewed source: `.agent/sdd/ai-test-assurance/T5-validator-review.md`, base `92d06c420f6a41f08e11579423e4e3eacdb7880d`, captured `2026-10-26T16:59:52.940Z`. All `snapshot:` anchors below refer to this immutable file, not subsequent live edits.
- Requirements: `T5-brief.md`; frozen SRS revision 1 §§3–6; `task-5-report.md`.
- Trust: semi-trusted local implementation/report; implementation claims are evidence to inspect, not proof. Read-only analysis except this authorized report. No code edits, delegation, tests, builds, lint, formatting, shell execution, network, or premium consultation.
- Runtime evidence: parent reports focused tests **43 passed / 1 failed**, with `validate.test.ts:586` expecting `UNSAFE_PATH`. Not rerun. The immutable test injects `../escape.md`; despite its name it creates no symlink (snapshot:1591–1610).
- Parent additionally reports actual CLI smoke from `.agent/sdd/ai-test-assurance/validator-smoke.cjs`, receipt `receipts/T5-actual-cli-smoke.json` plus sibling output log: actual addition test passed; subtraction variant failed at `ORACLE_ADD_SUM`; current source restored; digest-bound manifests generated from actual bytes; CLI declared 0, declared-not-executed 1, executed 0, fault 0, stale-source 1, tampered-output-over-stale 2. These are **parent-observed**, not executed or independently inspected by this reviewer. Synthetic/local-untrusted, explicitly synthetic all-zero commit; not T7 or production proof. This closes the parent's actual CLI-execution gap, not the defects below.

## Findings

### F1 [MAJOR] Static adapter does not enforce the reviewed TestGuard schema or decision invariants

**Evidence:** `scripts/test-assurance/validate.ts`, `validateScanReportObject` (snapshot:2311–2419); `types.ts` ScanReport definitions (snapshot:963–995); SRS §§3.1–3.2 and §5.

**Why:** `tool.commit`/`built_at` are not type-checked or required; scope member types/values are not checked; counts are not checked as nonnegative integers; findings/diagnostics entries are not validated; `analyzed_files === scope.files.length` is not enforced. Blocker count is merely compared with findings length, not computed from blocker findings; policy status and the full status/reason/exit relationship are not enforced. A report marked complete can carry negative/string counts, fabricated findings, `config_applied:true`, or an inconsistent exit/policy and still be accepted as complete. `types.ts` itself diverges: `excluded` is `string[]` rather than exclusion objects, and required report status `error` is absent. `checkExactKeys` only rejects additional keys; it does not require the allowed keys.

**Correction scenario:** Starting with the valid static fixture, independently change `analysis.analyzed_files` to -1, delete `tool.commit`, set `scope.config_applied:true`, replace findings with `[{}]`, set blocker_count 0 with blocker findings, or set a complete no-blocker report's exit to 3. Update the artifact hash; each inconsistent report must produce static invalid/exit 2. A valid incomplete report is incomplete/exit **2** in its embedded TestGuard envelope; the current permanent test deliberately uses embedded exit **1** and accepts it (snapshot:1541–1560), which pins a contract violation. Separate validator execution may still succeed when a *valid* incomplete static report is supplied.

**Fix:** Validate the exact reviewed nested envelope and all cross-field invariants before narrowing; align the types with §3, define how a recognized error report maps to the validator's static dimensions, and correct the incomplete-report fixture to an authentic status/reason/exit combination. Do not repair malformed reports into a passing form.

### F2 [MAJOR] Invalid supplied evidence can return `satisfied:true`

**Evidence:** `validate.ts` satisfaction/exit calculation (snapshot:3178–3243), supplied static/challenge invalid paths (snapshot:2946–2962, 3098–3127); SRS §5 states supplied invalid artifacts fail regardless of requested level.

**Why:** Satisfaction only checks declaration, freshness, review and the selected level. `exitCodePrecedence === 2` changes exit code but never clears satisfaction. A valid executed bundle with a missing/tampered static report returns exit 2 while retaining `satisfied:true`. A declared request can similarly report satisfied with invalid supplied execution/challenge evidence. Human output also says `Satisfied: yes`. This creates a contradictory machine/human assurance contract.

**Correction scenario:** From a valid executed bundle, remove its supplied static report; request executed. Expect static invalid, satisfied false, exit 2. Repeat with a declared request and invalid supplied baseline/challenge artifacts. Existing output-tamper tests use requested executed, where execution invalid already makes satisfaction false; they do not catch ancillary-invalid evidence.

**Fix:** Gate final satisfaction on absence of every invalid condition before rendering or returning; retain dimension-specific diagnostics and exit-2 precedence.

### F3 [MAJOR] Challenge execution is not bound to the bundle's intent

**Evidence:** Baseline explicitly checks `intent_id` against validated intent (snapshot:2838–2848); challenge consistency/judgment never does (snapshot:2985–3083); SRS §4.3: execution intent_id matches intent.id.

**Why:** A challenge receipt from a different intent can demonstrate this bundle's named fault if command, snapshot, oracle and marker happen to match. Nonempty-string validation is not identity validation.

**Correction scenario:** Change only `bundle.challenge.execution.intent_id` in a valid fault bundle to another intent ID. Current control flow still reaches demonstrated. Expected invalid challenge, satisfied false, exit 2.

**Fix:** Check challenge intent identity against the validated intent before any fault judgment. Add this distinct cross-receipt behavioral regression; none of the supplied challenge tests changes intent_id.

### F4 [MAJOR] A variant can add source inventory outside the approved source roots

**Evidence:** Snapshot files checked for syntax/sorting/disjointness but not root membership (snapshot:2019–2065). Variant equality compares baseline/challenge maps but never tests membership under approved source roots (snapshot:3020–3063). SRS §4.2 explicitly constrains variant paths to unchanged approved source roots.

**Why:** Current-tree recomputation protects the baseline/current inventory, but the challenge is intentionally not recomputed against the correct worktree. An extra challenge source path outside `src` plus a matching manifest addition satisfies the map-difference checks. Root equality alone does not restrict inventory members.

**Correction scenario:** Keep both source-root arrays `["src"]`. Add `outside/extra.ts` to the challenge's sorted source inventory and the manifest with before null/after a valid digest. Update the manifest artifact digest and keep the ordinary valid challenge evidence. Expected invalid source membership, not demonstrated. Also retain controls for omitted/extra changed paths and test/config/dependency changes.

**Fix:** Validate each inventory member against its category roots, including challenge snapshots, and explicitly enforce manifest source-root membership. A selected file root permits that file only; a directory root permits descendants, not lexical prefix siblings such as `src-other`.

### F5 [MAJOR] A malformed intent can throw instead of returning the required JSON invalid result

**Evidence:** Intent failure records invalidity but continues (snapshot:2806–2825). Fault judgment recasts raw intent and dereferences `intent.oracle.ref.path` (snapshot:3066–3083). CLI calls validate without an error boundary (snapshot:795–797).

**Why:** Input validation is not complete merely because an error was recorded. Deleting `intent.oracle` in an otherwise valid fault bundle makes intent validation fail, but the later assertion-failure judgment still dereferences the missing oracle. The CLI cannot emit its contracted JSON result/exit 2 and may leak a raw exception. This is a statically traced failure path; no repro was executed by this reviewer.

**Correction scenario:** Delete intent.oracle, set it null, or delete oracle.ref in a valid fault bundle and invoke with --json. Each must return exactly one structured invalid result with satisfied false/exit 2 and no thrown exception. Preserve independent artifact checking/invalid precedence where safe.

**Fix:** Only access validated/narrowed intent in judgment, and skip dependent judgment when prerequisites failed. Do not suppress the exception while proceeding with fake/default intent data.

### F6 [MAJOR] Identity comparison depends on JSON property order, not the contract's field values

**Evidence:** Challenge environment/group comparison (snapshot:2992–3017); baseline/current input comparison (snapshot:3163–3172). Inventory sorting additionally uses localeCompare (snapshot:2514), whereas schema sorting uses string `<=` (snapshot:2043, 2208).

**Why:** JSON object member order does not change the meaning of an environment or input group. Reordering the same fields in independently produced current.json marks unchanged evidence stale; reordering challenge environment/group fields marks a valid challenge invalid. Different sorting comparators can also cause a schema-valid inventory to disagree with recomputed order for mixed-case/punctuation filenames. These are legitimate independent producer inputs, not forged evidence.

**Correction scenario:** Re-serialize current inputs with tests/source/config/dependencies in a different property insertion order, and independently reorder a challenge environment's keys. Identical values/inventories must remain current/valid. Exercise mixed-case/punctuation multi-file inventories with the one documented comparator.

**Fix:** Compare named fields and canonical path/digest inventories, not whole-object JSON strings. Use one deterministic comparator consistently for schema ordering, recomputation and manifests. Preserve exact approved root selections without treating object key order as identity.

### F7 [MAJOR] Unknown CLI arguments are silently accepted

**Evidence:** `index.ts` extracts only known flags via indexOf and never validates all tokens (snapshot:690–697, 748–797); SRS §5 invalid arguments must exit 2.

**Why:** A caller can append an unsupported/typoed option to an otherwise valid invocation and receive success. An assurance CLI must reject unsupported requested semantics rather than silently ignore them.

**Correction scenario:** Append `--unsupported-policy strict` to a valid declared invocation with --json. Expected INVALID_USAGE, satisfied false, exit 2. Keep --help's explicit success behavior.

**Fix:** Parse the supported option grammar once and reject unknown/unconsumed arguments; return the same structured JSON error path. Avoid an ad hoc secondary parser with different acceptance rules.

### F8 [NIT] Report's direct-smoke commands refer to nonexistent fixture files and overstate fixture provenance

**Evidence:** `task-5-report.md:89–111` references bundle-declared.json, bundle-executed.json, bundle-fault.json and current.json in the checked-in evidence folder. Actual glob of `scripts/test-assurance/__fixtures__/**` finds none. Helper exports functions which write bundle.json/current.json; it has no direct-invocation generator (snapshot:325–482). It writes synthetic PASS/FAIL text (snapshot:266–276) and uses a repeated-1 challenge source digest rather than actual variant bytes (snapshot:421–440).

**Why:** These are useful local-consistency fixtures, not captured runner execution. Running the published direct commands on the supplied fixture tree cannot establish the claimed valid CLI outcomes. The parent's later actual CLI smoke provides the missing execution evidence, so this finding is report accuracy rather than an outstanding runtime-execution blocker.

**Fix:** Replace stale commands with the actual runnable parent smoke/helper invocation and durable receipt/output links. Label the original generated logs/digests synthetic validation fixtures; do not relabel the helper as having executed its recorded command. Keep the parent's actual smoke distinct from T7 evidence.

### F9 [NIT] Trace tests repeat the same documentary JSON assertions

**Evidence:** Trace diff snapshot:30–45 and 53–62 repeats ok, assurance_kind and execution_evidence for the same clean fixture.

**Why:** Both assertions exercise the same input/path and risk; the second case does not independently establish absence of execution/fault assurance. This is redundant test weight, not a coverage benefit. The required public human labels and JSON contract remain legitimate behavioral assertions.

**Fix:** Fold absence-of-execution/fault assertions into the existing clean-fixture test rather than keep a duplicate ticket-labelled case. For the known failing path test, retain path rejection and choose consistent diagnostic mapping; do not obtain green by deleting its safety assertion. Add an actual symlink scenario under the security review's correction brief rather than claiming the traversal-only test covered it.

## Test and acceptance assessment

- Existing useful behavioral coverage: declared cannot satisfy executed/fault; actual input edits make evidence stale; missing/tampered captured output invalid; build and timeout challenges not_detected; unrelated adjudication and absent marker notDetected; rejected review fails; captured-artifact invalidity beats staleness. These are not merely wording tests.
- Gaps directly evidenced by the supplied suites: no challenge intent mismatch, out-of-root variant inventory, malformed-intent fault traversal, invalid ancillary evidence satisfaction, property-order identity, or unknown-option scenarios; the adapter negative case tests bare arrays only despite naming unknown version. Add regression groups for the concrete escaping faults in F1–F7, not tests of helper wiring or private method calls.
- T5-1: source-level contract acceptable; trace semantics remain documentary, and no receipt execution added. Runtime pass remains parent evidence.
- T5-2: correction required for schema/identity and consistent validity output.
- T5-3: correction required for intent binding, variant ownership and safe dependent classification. Normal outcome distinctions are present; they do not compensate for inconsistent receipts.
- T5-4: no receipt-command evaluation appears, and trust remains local-untrusted; adapter correctness remains deficient.
- Detailed filesystem races, resource-limit enforcement and diagnostic escaping are assigned to the separate security reviewer; this report does not supply a security approval. The parent-known UNSAFE_PATH failure is not reclassified as passing.

## One correction handoff

Keep one owner for scripts/test-assurance. Resolve F1–F7 cumulatively against the same frozen contract, correct report/fixture provenance, and consolidate redundant trace coverage. Run the focused suite and the parent's actual CLI smoke only after corrections freeze; preserve each malformed-evidence and identity negative control. Generate a fresh cumulative immutable snapshot for independent rereview. No requirement reduction or arbitrary-command execution is necessary.

## Standards and evidence audit

MCP audit completed before this report. Loaded relevant standards: common-code-review, common-architecture-audit, common-best-practices, common-tdd, common-security-audit, common-security-standards, common-owasp, common-llm-security, typescript-language, system-design-principles, specialist-architecture-guard, specialist-security-reviewer; workflow code-review. Router also loaded common-subagent-driven-development, nextjs-testing, flutter-security, golang-architecture, python-architecture, react-native-security, swift-best-practices and swift-language. Those unrelated framework rules were not imposed on this Node CLI. AGENTS.md, the startup skill and local code-review workflow were read directly. Audit warnings for absent Angular/React/NestJS/product-management skills are broad extension routing, not detected runtime framework dependencies in this slice.

Cost telemetry: MCP reported 6 observed calls, 20 loaded skills and 139 elapsed seconds at collection; these are MCP-only observations, not total host activity. Host token usage/rates unavailable, so exact cost and savings are unavailable. No cost estimate fabricated.

## Superseding recovered-source review — T5-recovered

This section supersedes the original disposition above **only for the recovered cumulative snapshot**, not for the historical source. Original evidence/findings are retained.

### Binding and verification limits

- Source: `.agent/sdd/ai-test-assurance/T5-recovered-review.md`, captured `2026-10-26T23:05:26.627Z`, base `92d06c420f6a41f08e11579423e4e3eacdb7880d`; parent-supplied snapshot SHA-256 `d97a4cc203b5f2ab8893ff835e0c228dbd891630eadbdf9389bd3abeb8f771a8`. Hash is parent-supplied, not independently recomputed under this no-checks review.
- SRS: read `.agent/sdd/ai-test-assurance/srs-ai-test-assurance-720ad69b9ae2.md`, including §6 lines 240–246. The legacy unversioned SRS is intentionally the original historical freeze. The addendum requires total per-snapshot budgets of 128 roots / 10,000 regular files / 20,000 visited entries / depth 64, incremental bounded traversal, special-file rejection, safe diagnostics, and stable caller-file reads. Its scoped security acceptance remains the separate reviewer's responsibility.
- Parent reports fresh focused suite **48 passed / 0 failed**, receipt `T5-recovered-tests`, log SHA-256 `41a3b7c510ac8d15acdd970b02b31e978adbe8072a53cb82572e3f1a4c7169da`; strict tsc over index/types/validate/schema/io passed, receipt `T5-recovered-types`. These supersede the prior parent failure evidence for this revision; no checks were run here.
- Parent subsequently reports recovered actual CLI six-case smoke passed, receipt `T5-recovered-actual-cli`, SHA-256 `2f01cf27bf1c802d71b15e2077d0306b7edd96cac854e48521f4fd7064f2cc99`; boundary CLI cases FIFO, depth 65, 129 roots, null oracle and terminal-control unknown key each returned structured exit 2 / satisfied false, receipt `T5-recovered-boundary-cli`, SHA-256 `6d6d9564871e274e15889ea83ffb3a4ef1a0b22d4432f4721d13f201f8543201`. These are parent-observed, not reviewer-executed; synthetic/local-untrusted consistency only, not T7 or production assurance. Earlier smoke receipts remain bound to earlier revisions.
- Only this review report is changed. No source edits, tests, builds, typechecks, formatting, delegation, external research, or receipt-command execution.

### Current verdict: CHANGES REQUESTED — F1 adapter consistency remains open

**Spec/quality:** F2–F7's original concrete failure paths are repaired. F1's exact producer wire and primary validation repairs are present, but F1 remains partially open for contradictory population counts and failure diagnostics below. No architecture redesign requested; the CLI/schema/io split maintains the intended local-only boundary.

#### R1 / F1 continuation [MAJOR] Contradictory scan-population counts are accepted as complete

**Evidence:** recovered snapshot `schema.ts` lines 2071–2077 validates counts individually; lines 2193–2197 compares analyzed_files with scope.files.length; lines 2215–2236 approves complete analysis without relating either analyzed_files or failed_files to discovered_files. SRS §3.1 defines discovered_files as supported candidate files before generated exclusion, with failed files also drawn from discovered candidates; §5 requires report count consistency.

**Why:** Start with the valid complete report (one analyzed file/test). Change only `analysis.discovered_files` from 1 to 0, update the artifact hash, and keep its successful complete status/exit. Every implemented condition still passes, so the adapter emits `static: complete` for analysis of a file the same report claims was never discovered. This is an internally inconsistent producer envelope, not a limit of local execution attestation. Similarly a failed-files population cannot exceed discovery. This conclusion is statically traced, not an executed probe.

**Fix:** Enforce `analyzed_files + failed_files <= discovered_files` (successfully analyzed files and failed candidate files are disjoint; generated exclusions can account for the remainder), without assuming equality because exclusions exist. Reject contradictions as static invalid / satisfied false / exit 2. Derive each malformed-report case independently from a pristine fixture. Preserve a valid generated-exclusion remainder and valid partial-analysis failures.

**Coverage evidence:** recovered snapshot lines 3081–3113 independently tests five invalid report mutations, but none changes discovered_files or makes failed_files exceed the candidate population. Producer-shape tests at 3366–3483 likewise do not cover that cross-count contradiction. This is a consumer-visible contract regression case, not a source-text/wiring assertion.

#### R2 / F1 continuation [MAJOR] Failure diagnostics can coexist with complete/no-blocker/exit 0

**Evidence:** recovered snapshot `schema.ts` lines 2140–2160 validates diagnostic entry structure only; lines 2215–2236 accepts complete analysis without checking diagnostics. SRS §3.2 line 100 defines stable diagnostic codes and requires unknown/new codes to remain failure diagnostics, never a reason for success. Parent explicitly confirmed this interpretation during rereview.

**Why:** Add a well-formed diagnostic `{code:"parse_failed",path:"tests/calc.test.ts",message:"parse failed"}` to the otherwise valid complete report, keeping complete/analyzed/exit 0 and recomputing its artifact digest. The adapter still accepts static complete because diagnostic presence/classification is never used by the decision checks. An unknown nonempty diagnostic code has the same escaping path. A digest binds this contradiction; it does not resolve it.

**Fix / correction scenarios:** Reject complete or not_applicable envelopes containing any diagnostic from this failure-only diagnostic channel, including unknown/new codes; require static invalid / satisfied false / exit 2 for contradictory envelopes. Preserve valid incomplete/error envelopes with failure diagnostics and separate valid execution evidence. Add independent pristine-fixture cases for a known failure diagnostic and an unknown code. None of the recovered adapter tests at 3040–3113 or 3366–3483 supplies such a contradictory diagnostic.

### Original finding closure ledger

| Finding | Recovered disposition and immutable anchors |
| --- | --- |
| F1 | **Partial closure; R1 remains.** `schema.ts` 1950–2183 now checks required member types, nested scope/exclusion/diagnostic/finding objects, enums and nonnegative counts; 2199–2279 binds blocker count/status and status/reason/exit. `types.ts` 2425–2493 uses the actual producer's `rule_id`, `severity`, `file_path`, `line_number`, `column`, `message`, `suggestion`, with severity exactly `Blocker` / `Warning` / `Advisory`. No invented path/line/lowercase contract remains. Tests 3366–3483 cover the real shape and reject invented shape/unsupported blocker count. Incomplete envelope test now embeds input_failure/exit 2 (3056–3075). Valid error envelopes map to incomplete, never execution (4222–4232). |
| F2 | **Closed.** Any invalid dimension or exit-2 precedence prevents satisfaction; final exit 2 also forces false (4293–4327). Missing ancillary static regression asserts false/invalid/2 (3115–3138). |
| F3 | **Closed.** Challenge intent is compared with validatedIntent.id, and unavailable validated intent invalidates challenge (4000–4010). Distinct mismatch regression at 3140–3163. |
| F4 | **Closed for the original escaping scenario.** Snapshot inventory root membership enforced (1659–1667); challenge source inventory and variant paths constrained to baseline source roots (4101–4126); complete before/after inventory difference still checked (4128–4160). Extra outside/extra.ts regression updates the manifest and hash before expecting invalid (3165–3205). |
| F5 | **Closed at source, not merely caught.** Null/missing oracle fails intent narrowing; challenge marks unavailable validatedIntent invalid (3870–3890, 4000–4010), and judgment dereferences only validatedIntent after a guard (4164–4184). Residual unexpected exceptions are explicitly INTERNAL_ERROR/exit 2 (4285–4291), not mislabeled caller misuse. The permanent null-intent test is real behavioral evidence (3207–3231); its title overclaims missing-oracle coverage because that test only sets intent null. Source inspection, not that test, establishes the missing-oracle repair. |
| F6 | **Closed for object-member identity and inventory comparator.** Named-field/environment/input/snapshot comparisons (3534–3569) replace JSON serialization. One comparator at io.ts 997–999 is used by schema 1644–1656 and 1823–1829 and recomputation 1414. Current-input/environment insertion-order regression at 3233–3280. |
| F7 | **Closed.** Parser consumes supported tokens, tests valued flags with Object.hasOwn and rejects leftovers/missing values (775–811, 863–895). Unknown policy and inherited-property token regressions at 667–717. Invalid --require cannot echo arbitrary value (719–745; validator 3630–3648). |
| F8 | **Original nonexistent-fixture-command defect closed.** Current task-5-report.md §7 replaces the absent named bundle commands with a helper-generated temp fixture and labels earlier smoke as revision-bound. This proposed snippet calls in-process run(), not an actual separate CLI launch, and is not itself runtime evidence; the parent's separate real CLI smoke remains the correct execution gate. Fixture helper logs and variant source identities remain synthetic and cannot supply runner attestation. |
| F9 | **Closed.** Recovered trace diff 30–46 folds absence-of-execution/fault assertions into the existing clean-fixture test. Traversal test now accurately names traversal (3016–3038); an actual symlink is created in a separate test (3311–3335). Detailed filesystem acceptance remains separate. |

### Evidence interpretation and next gate

The 48 passing parent tests/typecheck and actual CLI/boundary smoke do not close R1/R2: supplied scenarios contain neither contradictory discovery populations nor failure diagnostics in a clean static report. Correct those narrow adapter invariants, bind a new cumulative snapshot and focused parent verification, then request targeted F1 closure. No user decision, framework change, arbitrary command execution, or T7 scope is needed. Do not substitute a new invented producer schema.

Standards audit rerun; same review/architecture-guard/type/test/security-boundary skills remain loaded. MCP cost reporting rerun; exact host token/cost fields remain unavailable. No runtime or premium claim is made by this reviewer.

## Residual-corrected scoped verdict — F1-R1/R2

**Verdict: CHANGES REQUESTED — R1 closed; R2 partially closed.** Original F2–F9 closures are preserved. No new architecture or wire format is proposed.

### Evidence binding

- Inspected `.agent/sdd/ai-test-assurance/T5-residual-corrected-review.md`, captured `2026-10-26T23:14:32.818Z`; parent-supplied SHA-256 `44770816655e0cc4a6361173337054a0b8d5d1723402678a56f44e537c5905b5`.
- Contract remains `.agent/sdd/ai-test-assurance/srs-ai-test-assurance-720ad69b9ae2.md`, especially §3.1 population semantics and §3.2 lines 87–100. No revision or benign diagnostic extension was authorized by this review.
- Parent reports **56 tests passed**, receipt `T5-residual-corrected-tests`, log SHA-256 `884f06247ae35b9748bdb56ab03fef92b443beb4240738944b8536bca1cd53f0`. These are parent-observed checks, not this reviewer's execution. Parent states prior actual CLI/typecheck evidence remains applicable to unchanged index/validate; integrated smoke follows component freeze. No new smoke success inferred.
- Review is source-only, scoped to these residuals and introduced defects; separate security reviewer owns SEC1-R1/R2. No checks/source edits/delegation.

### R1 closure

Recovered snapshot `schema.ts` lines 2214–2225 now enforces `discovered_files >= analyzed_files + failed_files` for every structurally valid envelope. It does not demand equality. Regression at 3550–3566 isolates under-discovery and asserts invalid/false/2; control at 3570–3593 retains a valid incomplete envelope with a discovery remainder and partial failure. **R1 closed.**

### R2 partial closure and remaining [MAJOR] exception

**Evidence:** snapshot `schema.ts` 2260–2267 rejects every diagnostic on complete reports, including unknown codes. Tests 3597–3630 isolate known parse_failed and unknown-code contradictions. That complete-status defect is closed. However, lines 2301–2311 explicitly permit `empty_scope` diagnostics in not_applicable envelopes; test 3634–3658 pins that exception as valid.

**Why:** The frozen decision table distinguishes `incomplete / empty_scope / exit 2` from `not_applicable / empty_allowed / exit 3`; the latter is authorized empty scope with no failures. The diagnostics channel has no authorized benign-notice variant. SRS line 100 lists empty_scope among stable diagnostic codes, and the parent already confirmed the failure-channel interpretation during the preceding review. The actual producer currently emits no diagnostic for authorized emptiness, as stated in this assignment. The new comment describing empty_scope as an authentic benign producer notice is unsupported. Treating it as benign is a new consumer exception, not necessary interoperability with the pinned producer.

**Correction scenario:** Derive a not_applicable/empty_allowed/exit-3 envelope from a pristine fixture with zero test population, no findings/unsupported/failed inputs, and diagnostics empty: it remains valid static not_applicable. Independently append an empty_scope diagnostic and rehash: require static invalid, satisfied false, exit 2, just as for parse_failed or an unknown diagnostic. Do not change legitimate empty_allowed/no-diagnostic behavior.

**Fix:** Remove the empty_scope carveout; reject nonempty diagnostics for not_applicable, and replace the current invented benign-notice positive test with authentic allowed-empty acceptance plus contradictory-diagnostic rejection. Preserve complete-status and unknown-code protections already implemented. This is the existing R2 correction, not additional scope.

### Acceptance interpretation

The parent 56-pass suite establishes its exercised scenarios; it does not authorize the contradicted test oracle. Source-only review found no additional material defect in the count-cover or complete-diagnostic corrections. R2 needs the narrow exception removal and targeted independent closure before this spec/quality lens can approve. Security and integrated-smoke gates remain separate. Compliance audit rerun; same loaded standards apply; no cost/usage measurement available for an exact monetary claim.

## Final scoped spec/quality closure — T5-na-corrected

**Overall T5 spec/quality verdict within the reviewed scope: APPROVE.** This supersedes the preceding CHANGES REQUESTED dispositions for the corrected cumulative source. No outstanding material finding remains in this review lens. It is not release approval, security self-approval, execution attestation, or T7 acceptance.

- Inspected immutable `.agent/sdd/ai-test-assurance/T5-na-corrected-review.md`, captured `2026-10-26T23:17:18.279Z`; parent-supplied SHA-256 `eeb3249ad040d0647956e2e7225ed372ee788b95187d0d68c14619957341653e`. Hash not independently recomputed under the no-checks assignment.
- Scope: only remaining F1-R2 not_applicable diagnostic exception and its correction scenarios. F1-R1 and original F2–F9 closures remain preserved; no broader re-audit performed.
- **R2 CLOSED:** snapshot `schema.ts` lines 2301–2306 now rejects every nonempty diagnostic array for not_applicable, including empty_scope, known failure codes and unknown codes. No benign-notice wire variant or special case remains. Existing empty_allowed/zero-tests/no-findings/exit-3 constraints are retained (2288–2309).
- Authentic allowed-empty positive case at snapshot 3629–3653 uses diagnostics empty and expects static not_applicable with the separately valid executed requirement still satisfied. Negative group at 3655–3685 builds fresh temporary fixtures independently for empty_scope, parse_failed and brand_new_failure_code; each digest-bound contradictory envelope asserts static invalid, satisfied false and exit 2. These are distinct observable contract regressions, not wording/wiring tests.
- Parent reports fresh focused suite **57 passed**, receipt `T5-na-corrected-tests`, log SHA-256 `d3f8d6d5ad38962862ceb6c7ec7e3ffbc463d52585ae64c04b511372bd2aad44`. This is parent-observed verification, not a reviewer-run check. Prior actual CLI/typecheck evidence remains revision-scoped as described by the parent; final integrated smoke remains pending component freeze and is not claimed complete here.
- Parent reports separate security closure on the prior reviewed IO state and no IO changes in this narrow correction. This report neither redoes nor substitutes for that independent security review.
- No source edits, execution/checks, delegation, or unrelated research. Only this report appended. Compliance audit rerun with the same loaded review/architecture/type/test/boundary standards. Exact host token/cost data remains unavailable.
