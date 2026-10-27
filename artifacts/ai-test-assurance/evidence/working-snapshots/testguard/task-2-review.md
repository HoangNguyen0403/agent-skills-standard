# Independent T2 review — changes requested

## Verdict and evidence boundary

- **Spec verdict: FAIL. Quality verdict: FAIL; not ready for T2 acceptance.** T2-1, T2-2, T2-3 and T2-5 have material defects. The central T2-4 precedence branch is correctly ordered by static inspection, but integration acceptance is blocked.
- Reviewed the immutable `T2-report-review.md` at `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/mindless-impala/.agent/sdd/ai-test-assurance/`, captured `2026-10-26T16:52:35.876Z`, base `8fc53b4c683d312359166e49e397fa887dd0ac92`; also read T2-brief, frozen SRS §3, implementer report, relevant current source and known callers. Snapshot line references below refer to that immutable artifact. Source anchors identify the corresponding reviewed code.
- **Observed runtime evidence supplied by parent:** focused Go test attempt failed compilation because `pkg/engine/engine.go` imports `fmt` and `path/filepath` without using them; reporter tests passed. Accepted as ground truth; no rerun.
- **This review is static.** All scenario outcomes below are static predictions [INFERENCE], not newly executed reproductions. No builds, lint, tests, formatters, implementation edits, delegation, premium calls or T8 documentation edits performed. Only this requested review artifact was written.
- AGENTS.md was supplied in context. MCP workflow discovery returned no workflows. Loaded standards: `common/common-architecture-audit`, `common/common-best-practices`, `common/common-code-review`, `common/common-error-handling`, `common/common-observability`, `common/common-performance-engineering`, `common/common-security-standards`, `common/common-tdd`, `golang/golang-configuration`, `golang/golang-language`, `golang/golang-testing`. Compliance audit reported no routed-category gaps. These observations do not prove implementation compliance.

## Actionable findings

### R1 [BLOCKER] `pkg/engine/engine.go:3-8` — unused imports prevent engine and CLI compilation

Why: Parent's focused command observed unused `fmt` and `path/filepath`. The immutable engine diff retains both imports after removing their uses (snapshot 424-435, 481-514). No freshly built CLI or engine acceptance scenario is available until corrected; the implementer's `done`/all-satisfied/no-risks report is unsupported.

Fix: Remove the obsolete imports in the engine owner's correction. Do not rerun the unchanged failing command merely to reconfirm it.

Check: After edits settle, parent runs `rtk proxy go test ./pkg/engine ./pkg/reporter ./cmd/testguard` once for corrected compilation and focused behavior, then freshly built CLI scenarios. Compilation success alone does not close the remaining findings.

### R2 [MAJOR] `pkg/engine/engine.go:262,368-369` — engine overwrites the initialized empty file array with nil

Why: `var analyzedFiles []string` remains nil when nothing is successfully analyzed; assigning it to `report.Scope.Files` defeats `NewScanReport`'s non-nil initialization. JSON emits `scope.files:null` for empty directories, unsupported-only or missing-only targets, and all-read/parse-failed inputs. SRS §3.1 requires every empty array to be `[]`; both allowed-empty and failure reports violate the exact schema. Snapshot 530,608-609.

Fix: Initialize the accumulation slice non-nil or preserve the initialized report slice while appending.

Check: Decode actual CLI JSON for empty-disallowed, empty-allowed, unsupported-only, missing-only and all-parse-failed scopes; require `files` to be an array exactly `[]`, `analyzed_files:0`, and the appropriate independent status/reason/exit. Current empty CLI tests inspect status only and miss this regression.

### R3 [MAJOR] `pkg/engine/engine.go:299-307`; `pkg/parser/dart/adapter.go:118-121,145` — known malformed Dart callbacks are silently dropped rather than reported as parser failures

Why: Engine marks the file analyzed whenever `LocateTests` returns nil error, but the adapter explicitly detects an unmatched callback brace and merely continues, ultimately returning nil error. A malformed selected `broken_test.dart` beside a valid test file can therefore produce `complete/analyzed`; alone with `--allow-empty`, the malformed file can become `not_applicable`. Required malformed/known-parser failures cannot be clean or authorized emptiness (T2-2, SRS §3.1/§3.2). Snapshot 571-579 wires propagation but does not make the known failure observable.

Fix: Propagate the adapter's detected malformed callback as a parser error and preserve findings from independent safe files. Coordinate any parser-file ownership adjustment with the parent; this does not require a new Dart grammar or AST rewrite.

Check: An unmatched `test('broken', () {` callback alone and mixed with a good file, with and without allow-empty, must report `incomplete/input_failure`, exit 2, `parse_failed` and one failed candidate; retain exact findings from the good file. A genuinely declaration-free valid Dart file remains a separate empty-scope case.

### R4 [MAJOR] `pkg/engine/engine.go:289-298,314-317` with `:111,157-202` — regex matches are promoted to declaration counts despite successful Go syntax parsing

Why: The new `analyzed_tests` count treats every non-file unit as a located declaration, but Go's parsed AST is discarded and units still come from raw-source regex matching. A syntactically valid `fixture_test.go` containing only `const fixture =` a multiline raw string whose contents include `func TestFake(t *testing.T) { t.Fatal("fixture") }` has no test declarations, yet is counted as nonempty. SRS §3.1 explicitly requires declaration counts; skipping synthetic whole-file units alone does not establish that invariant. This can turn genuine zero-declaration scope into complete success. Snapshot 561-570,587-590.

Fix: Derive Go declaration presence/count from the already parsed executable declarations, not fixture/comment text; reconcile with T3's syntax-aware ownership rather than introducing a competing parser. Ensure the count and analyzed units agree about what constitutes a test.

Check: A raw-string-only fake test, block-comment-only fake test, ordinary helper-only file, and genuine Test function must distinguish zero from one declaration. With zero findings, zero-declaration inputs select exits 2/3 by allow-empty; static findings on a zero-declaration file keep exit 2 even when allow-empty is set. Preserve real executable positive controls.

### R5 [MAJOR] `pkg/engine/discovery.go:182,198-201,243-262` — overlapping roots inflate discovery counts; mixed absolute/relative roots also duplicate analysis and findings

Why: `DiscoveredFiles++` occurs before deduplication, so identical roots or directory+explicit-file overlap count one candidate repeatedly, including generated candidates. Candidate identity uses only `filepath.Clean`, leaving an absolute path and cwd-relative spelling of the same file as different keys. Both are analyzed, then may normalize to identical `scope.files` entries, inflating declarations/findings/blocker counts and violating sorted-unique scope and exact accounting (T2-1, SRS §3.1). Snapshot 309,329-332,375-394.

Fix: Use one absolute lexical identity for candidate deduplication before incrementing unique discovered counts, including generated exclusions. Keep original requested paths untouched and emit one canonical relative display path. Use the same identity for failed-file accounting.

Check: Select the same fixture via duplicate roots, parent+child roots, directory+explicit file, and absolute+relative spellings; require one discovered/analyzed file, one declaration, unique `scope.files` and exactly one copy of each expected finding. Repeat overlap with a generated file and a deterministic read-failed candidate. Existing dedup test only asserts analyzed count for same-style roots, not discovered count or mixed spellings.

### R6 [MAJOR] `pkg/engine/discovery.go:102-109` — path normalization does not satisfy cwd-relative output

Why: `filepath.Rel(cwd, path)` is attempted directly on relative paths even though cwd is absolute; on that error the fallback merely cleans the input. Absolute paths outside cwd are deliberately retained absolute because `..` results are rejected. Thus the same outside-cwd target can be emitted absolute or relative according to input spelling, contrary to `scope.files`' cwd-relative slash contract. This also prevents stable scope identity across equivalent invocations (T2-1, SRS §3.1). Snapshot 223-230.

Fix: First obtain an absolute lexical path, then compute the cwd-relative slash path, including legitimate `../` results. Keep original values only in `requested_paths`. Reuse this normalization for scope, exclusions, unsupported entries and finding locations where applicable.

Check: Scan one fixture from cwd via absolute, relative, `./`, and parent-relative forms, including an absolute target outside cwd. Assert the exact identical relative file inventory, while requested paths remain the original values. Do not add evidence-bundle containment rules to this CLI contract; caller-selected outside-cwd scan paths are not prohibited here.

### R7 [MAJOR] `cmd/testguard/main.go:80-96,285-286` — Cobra parser errors bypass the JSON error envelope

Why: JSON error emission exists only inside `RunE`. Unknown flags, invalid boolean/int values and missing flag arguments fail before `RunE`; the final Execute error branch simply exits 2, with SilenceErrors/Usage set. Recognizable JSON requests therefore receive no JSON object or diagnostic, breaking SRS §3.1. Existing CLI usage tests cover hand-written RunE rejections, not parser failures. Snapshot 50-75 and unchanged final Execute branch.

Fix: Route scan argument/flag parsing failures through the same structured invalid-usage boundary, recognizing actual JSON request forms even if parsing stopped before their tokens. Respect `--`, option values and false boolean values; preserve non-scan command interfaces.

Check: Exercise `--json --unknown`, `--unknown --json`, `-f json --top nope`, `--format=json --format`, and `--json=invalid`. Recognizable JSON scan usage failures must emit exactly one newline-terminated v1 object, `error/invalid_usage`, exit 2, original recoverable requested paths, no banners/progress/Cobra usage on stdout. Also verify plain console parser errors remain visible on stderr.

### R8 [MAJOR] `cmd/testguard/main.go:91-93` — explicitly empty output flags bypass the JSON/Azure prohibition

Why: The frozen policy rejects an explicitly supplied `--output` in JSON/Azure modes, not just nonempty values. Checking `outputFile != ""` accepts `--json --output=` and `-f azure -o ''`, scans and exits according to analysis instead of invalid usage (SRS §3.2). Snapshot 68-70.

Fix: Check Cobra's flag-presence/Changed state for `output`, independent of its string value.

Check: Cover long and short explicitly empty output values in JSON and Azure modes; require invalid usage/exit 2 before scanning. Omitted output must remain valid; console's default Markdown path behavior remains unchanged.

### R9 [MAJOR] `pkg/reporter/azure.go:24-56,74-115`; `pkg/reporter/terminal.go:89-317`; `cmd/testguard/main.go:140-159` — non-JSON output write failures still permit success

Why: Markdown only returns mkdir/create failures. Every Fprintf and deferred Close error is ignored, so successful open followed by ENOSPC/write/close failure returns nil and allows exit 0. Azure/terminal similarly discard writer errors; CLI ignores their returned integer and exits with the original report code. A missing/truncated report can be reported successful. Console also renders a success verdict before a Markdown create failure is discovered, leaving the displayed verdict inconsistent with final exit 2. SRS §3.2 gives output I/O failure highest precedence and specifies error/output_failure while retaining findings. Snapshot 1067-1133,129-158,1427-1524.

Fix: Propagate write/close failures across each renderer and CLI boundary; finalize output failure status/reason, `output_failed` diagnostic and exit 2 without dropping collected findings. Arrange console Markdown export/rendering so an export failure is not first advertised as passed. Keep the specified stderr/exit-2 exception when stdout itself cannot carry a complete report.

Check: Use deterministic failing writers for Azure/terminal and a controlled post-open write/close failure for Markdown, plus an unwritable Markdown destination through actual console CLI. Require error visibility and exit 2 for otherwise-clean scans; keep the original blocker findings/policy in the retained report. JSON's existing write-error exit path is statically present; include a failed JSON writer boundary as a separate exercised scenario after correction.

### R10 [MAJOR] `pkg/reporter/azure.go:29-54`; `pkg/reporter/terminal.go:147-163` — human/CI formats do not consistently name analysis status and reason

Why: Azure emits nothing at all for a complete no-finding scan, and only issue annotations for complete findings. Incomplete reports with diagnostics emit those diagnostics without naming `incomplete/input_failure` (or other reason); only the no-diagnostics fallback names them. Terminal complete reports display PASSED/FAILED without `complete/analyzed`. SRS §3.2 requires Console/Azure/Markdown to name analysis status/reason, not infer completeness from issue count. Snapshot 1037-1064,1478-1489.

Fix: Emit an explicit analysis status/reason summary for every Azure verdict and include them in complete console verdicts. Preserve separate blocker policy and never emit Azure task-success commands.

Check: Complete/no-findings, complete/blocker, incomplete/with-diagnostic and not-applicable reports must all expose exact status/reason on each format, with matching exit decision. Update behavior tests to validate this distinction rather than merely the presence of one issue annotation.

### R11 [MAJOR] `cmd/testguard/main.go:77-78,184-187,285-286` — silencing Cobra errors also silences existing non-scan command failures

Why: Root-wide SilenceErrors combined with an Execute branch that prints nothing suppresses errors returned by `explain`, `update`, and `init`; e.g. an unknown rule ID exits 2 without its explanation. The previous return/error behavior of those interfaces is intentionally outside the scan cutover (SRS §3.1). This regression is independent of whether JSON scan parsing is repaired. Snapshot 53-55 introduces the global silence settings; unchanged subcommands return ordinary errors.

Fix: Scope structured scan error handling without swallowing non-scan errors; print non-scan Execute failures exactly once to stderr.

Check: `testguard explain NOT-A-RULE` and missing explain argument must preserve visible error messages and failure exit. Help/version/rules/explain success output must remain non-scan output, without injected scan JSON.

### R12 [MAJOR] `pkg/engine/engine_test.go:281-287`; `pkg/reporter/reporter_test.go:198-202,305-319` — regression assertions miss the advertised acceptance invariants and pin incidental wording

Why: Incomplete-plus-blocker only checks nonempty findings and blocker count greater than zero, so it cannot establish which finding survived, its location/severity, duplicate prevention or blocker-count consistency. Empty CLI cases do not inspect arrays; declaration-free supported files are untested. Reporter tests pin prose such as `Scope explicitly allows empty test set` rather than just the owned status/exit contract. The JSON test splits after trimming newlines, so it does not actually prove a trailing newline exists. These defects explain why reporter tests passing do not establish T2 acceptance. Snapshot 851-857,1261-1267,1350-1384.

Fix: Replace weak/nonempty and incidental wording assertions with exact consumer invariants: expected rule/path/line/severity findings and policy count; decoded schema/array types; exact single-object plus newline framing; status/reason/exit and no false-passed/task-success output. Keep test fixtures minimal; do not add wiring, source-text or mock-echo tests.

Check: Corrected tests must fail if the expected blocker is dropped/replaced/duplicated, if empty files serialize null, if the terminal prose changes without changing semantics, or if JSON lacks its required newline. Add only distinct boundary cases from R2-R11, preferably table-driven; no percentage-driven padding.

## Symlink assessment and bounded follow-up

- Static positive: ordinary final-component explicit symlinks are rejected by Lstat, and symlink entries reached during WalkDir are skipped before filename handling (`discovery.go:148-158,239-240`). The existing test covers only an ordinary explicit file symlink.
- **Unverified edge risk [INFERENCE]:** final-component Lstat alone does not check symlink ancestors; a target such as `link/subdir` or `link/sample_test.go` can resolve through a symlink ancestor. A directory symlink with a trailing separator is also a platform-sensitive spelling worth testing because filesystem path resolution may dereference it before Lstat reports the final component. No runtime claim is made for this environment.
- Required correction check: add explicit directory-symlink and trailing-separator scenarios alongside directory traversal containing a file/directory symlink. The frozen rule explicitly rejects an explicit symlink target; normalize spelling without erasing evidence of a final symlink. If the parent intends to prohibit symlinks in every ancestor as well, document that interpretation before extending the rule; SRS scan policy is not the stricter T5 evidence-path policy. Do not follow links to claim additional analyzed scope.

## Acceptance and compatibility assessment

| Item | Static assessment |
|---|---|
| T2-1 exact scope/counts independent of findings | Fail: duplicate discovery/analysis, unstable path representation; raw-text matches are not declaration evidence. |
| T2-2 incomplete required inputs cannot become clean | Fail: known malformed Dart callback is silently skipped; Go syntax failures and ordinary missing/read/traversal failures do have explicit incomplete branches. |
| T2-3 empty allowance produces inapplicable, never passed | Decision branch is correctly ordered for its inputs, but declaration counting and null file arrays break end-to-end contract. Unsupported precedes emptiness; findings under allow-empty remain incomplete. |
| T2-4 incomplete overrides blockers without dropping findings | Static implementation retains findings across safe file iteration and computes policy independently; input failure precedes unsupported, which precedes empty/blockers. Needs exact retained-finding verification after compilation is repaired. |
| T2-5 exact schema/exit/compatibility policy | Fail: empty-array serialization, pre-RunE JSON usage errors, output-presence and I/O handling, format summaries, non-scan regression. |

Known callers: LSP references found JSON writer calls in CLI error/scan paths and reporter test; Markdown writer calls in CLI and reporter test. Those signatures are migrated. Literal/reference inspection found no active caller of `FindTestFiles`; its remaining compatibility-shaped wrapper returns `nil` error unconditionally and discards discovery diagnostics (`discovery.go:282-285`). Remove this unused obsolete wrapper rather than advertise an error-returning discovery API that hides all failures. `Result` also retains legacy counters/findings alongside `Report`; do not claim that the external ecosystem was migrated merely because local callers were updated. No unobserved external consumer is asserted.

T8-owned README/QUICKSTART/ARCHITECTURE/CHANGELOG/version changes are excluded from review and were not edited. CLI's existing example still advertises day-to-day `--diff`; parent should ensure the designated CLI-doc owner removes that stale recommendation during the authorized documentation pass, not re-enable unsupported diff.

## Correction and verification handoff

1. Engine owner corrects compile imports, non-nil arrays, unique canonical inventory/counting and declaration/known-parser failure integration. Coordinate the Dart parser boundary and T3 executable-declaration boundary; do not create a second convention or seize another worker's files.
2. CLI/reporter owner closes all parser/format/output-presence and output-failure boundaries, preserves non-scan errors, and produces explicit status/reason summaries. Replace weak test assertions rather than re-pin incidental wording.
3. After edits settle, parent runs the focused command from R1; then builds a fresh executable and exercises the real CLI matrix: clean, blocker, malformed/missing/read-failed, unsupported mixed with good input, allowed/disallowed empty including zero-declaration supported files, input-failure+blocker, overlap/path spellings, symlink spellings, parser errors, all formats and output failures. Verify actual process exit, exact JSON envelope and retained findings. Permission denial must use deterministic injection when chmod does not reliably deny reads.
4. Independent re-review follows correction; this review supplies neither runtime PASS nor acceptance approval. Update task-2-report.md to reflect corrected evidence and remaining risks rather than retaining unconditional all-satisfied claims.

Session telemetry: MCP compliance audit completed. Token usage and monetary cost were unavailable from the host; no cost estimate is asserted.

---

## Superseding rereview — recovered T2 snapshot

### Current verdict

**Changes requested; T2 is not fully accepted.** The recovered implementation closes the original compilation, empty-array, known Dart error, scope deduplication/path normalization, output-presence, writer-error propagation and status-summary defects. R7 remains partially open: the new raw-argument recognizer does not preserve Cobra flag/value/boolean semantics. Additional Azure diagnostic escaping and failed-export artifact claims need correction. These are bounded CLI/reporter corrections; this rereview does not require another shared-engine correction before T3 receives its separately authorized engine ownership.

This section supersedes the initial verdict for the recovered revision only. It does not erase the original findings or retroactively claim that the initial implementation passed.

### Revision and runtime evidence

- Immutable cumulative snapshot: external `T2-recovered-review.md`, captured `2026-10-26T22:42:07.167Z`; SHA-256 independently checked as `450cbddd42baec7898d8796e842b4d2f0061f6994295e347febbfa9bd8f0ef89`.
- Read parent receipt `receipts/T2-recovered.json` and its log: `go test ./pkg/engine ./pkg/reporter ./cmd/testguard ./pkg/parser/dart`, status 0. Engine, reporter and CLI packages report `ok`; Dart reports `ok (cached)`. Log SHA-256 independently checked as `1ae21ae0f404e244bfc1230487d12a2a140f78260291254eda079cf12191d24e`. This supersedes both earlier compile failures; no unchanged failing command was rerun.
- Parent reports a fresh binary build PASS. Read `T2-recovered-cli.json/.log`: clean exit 0, unsupported exit 2, empty exit 2, allowed empty exit 3, diff usage error exit 2. Receipt output digest: `a2d93ab51f385ae7ef30df8d3817c26872ca6e04eb9ef4787f65a69ed5c4031a`.
- Read `T2-recovered-extra-cli.json/.log`: blocker exit 1; malformed+blocker exit 2 with one retained blocker/failed file; mixed absolute/relative duplicate scope remains one blocker; `-fjson` invalid-top, invalid JSON boolean, explicitly empty output all exit 2. Parent additionally reports the script checked exact retained finding/scope equality, one-object envelopes, and `--json=false --unknown` stderr-only exit 2. Receipt output digest: `d2ce81990411cb6247e3d9831a1591b8bc70f592e4b25dd68ca0dbac5f1bad30`.
- Runtime claims here are attributed to those parent receipts/messages, not new executions by this reviewer. This reviewer ran checksum commands only; no builds/tests/lint/formatters, source edits or delegation. No runtime evidence for the residual scenarios below is claimed.
- Same applicable 11 skills remain loaded; the rereview compliance audit reported no routing gaps. No T8 docs or unrelated T3 parser-precision review performed.

### Literal R1–R12 closure assessment

Snapshot line anchors below refer to the recovered immutable snapshot, not the original artifact.

| Finding | Closure | Evidence |
|---|---|---|
| R1 compile imports | Closed | Obsolete engine imports removed, snapshot 557–570; parent focused command now passes. |
| R2 nil empty file array | Closed | `analyzedFiles := make([]string, 0)`, 731/829–834. Empty engine/CLI JSON tests now check array shape, 1222–1229 and 2664–2694. |
| R3 known Dart malformed callback | Closed for identified structural failure | Adapter now returns an unmatched-brace error, 1479–1485; engine maps it to failed-file/input_failure. Mixed Dart regression asserts the retained blocker, 1394–1465. This is not a full non-Go syntax-validation claim. |
| R4 fixture text counted as Go declarations | Closed for original raw-string/comment case | Parsed AST declarations now supply Go units, 624–665/762–771; negative fixtures and real declaration control, 1314–1391. Broader Go test signature/executable-node precision remains T3's separate task, not reopened here. |
| R5 overlap/duplicate counts | Closed for specified lexical path spellings | Absolute lexical identity is used before discovery increment and candidate append, 353–359/443–462/512–532; failed-file keys also canonicalized, 740–778. Generated and mixed-spelling regressions, 2891–2950; parent actual CLI duplicate-scope check passed. No inode/hardlink dedup claim added. |
| R6 cwd-relative paths | Closed | Absolute resolution precedes Rel, including outside-cwd `../` display paths, 336–350. Stable-spelling behavior test preserves original requested paths, 982–1015. |
| R7 parser-error envelopes | Partially closed; C1 open | Execute errors now use a structured boundary, 286–293, and the original parser-error examples are covered/passed. The recognizer still misclassifies value tokens, false booleans and some non-scan errors. |
| R8 explicit empty output | Closed | Cobra `Changed("output")`, 161–162; long-empty JSON and short-empty Azure cases, 2518–2544; parent actual JSON-empty-output check passed. |
| R9 writer errors/false successful verdict | Core failure propagation closed; C3 residual | Azure/terminal return `(int,error)` and stop after first failed write; Markdown checks writes and Close, 1526–1571/1590–1619/2201–2412. CLI exports before rendering, marks `error/output_failure`, retains findings, 241–264. Controlled write/close tests, 2145–2177/3109–3135. Remaining summary/truncation text can falsely claim an export exists after that export failed. |
| R10 explicit status/reason | Closed | Azure always names both, 1539–1554; terminal complete/incomplete/error/NA branches name both, 2241–2265. No success command deliberately generated. C2 addresses unescaped data impersonating commands, not absence of the summary. |
| R11 visible non-scan errors | Original example closed; C1 leaves classification edge | Execute fallback prints stderr, 286–293; invalid/missing explain tests, 2626–2645. An earlier format flag can still cause a non-scan parser error to be wrapped as scan JSON. |
| R12 weak behavior assertions | Material corrections closed | Incomplete+blocker now checks one specific rule/severity/file and exact policy count, 1119–1137; JSON framing checks one actual trailing newline, 2061–2073; arrays are asserted. The identified incidental explanatory sentence assertion was removed. No request to pin additional prose or add wiring/source-text tests. |

`FindTestFiles`' unused diagnostic-discarding wrapper was removed. Reporter signature changes are reflected in the cumulative source/tests and passing focused compilation. LSP caller positions were stale relative to current source, so this assessment relies on immutable source and parent compilation rather than claiming those stale positions are current call-site evidence; the tool inconsistency was reported.

### C1 [MAJOR] `cmd/testguard/main.go:23–68,71–100` — raw argument recognition still confuses flags, their values, commands and valid false booleans

Why: The first loop interprets the first non-dash token as a potential subcommand without skipping option values. The second loop scans each token independently without consuming value operands. Its JSON boolean handling recognizes only exact `true`/`false`, whereas Cobra/pflag accepts additional standard boolean spellings. Thus R7's correction covers the supplied examples but not the required flag/parser boundary generally. Snapshot 32–109.

Static scenarios [INFERENCE; not executed]:

- `testguard --output rules --json --unknown`: `rules` is the output filename, not a subcommand. The first loop returns false, so the recognizable JSON scan parser error emits no JSON envelope.
- `testguard --output --json --unknown`: `--json` is the consumed output value, not a JSON flag; the second loop nevertheless treats it as JSON mode.
- `testguard --json=FALSE --unknown` (also `--json=0`): valid false boolean values are treated as invalid/true by this helper and produce JSON instead of the stderr-only console error.
- `testguard -f json explain NOT-A-RULE`: the first nonflag token `json` stops the command check before `explain`; an Execute error can therefore be wrapped in scan JSON although the selected command is non-scan.

Fix: Use one bounded token walk based on the registered flag metadata and selected Cobra command: consume value-bearing options, honor `--`, parse accepted boolean values consistently, and do not treat option operands as commands/flags. Keep the original recoverable paths without inventing defaults for actual path tokens. Do not add a second independently maintained CLI grammar.

Check: Add a table of these distinct semantic cases to the existing actual-helper CLI tests and the parent's fresh-binary smoke. Assert stdout type/framing, error status/exit, stderr visibility and actual requested paths, not exact explanatory prose. Recheck existing reverse-order unknown-before-JSON, attached `-fjson`, false JSON and non-scan controls.

### C2 [MAJOR] `pkg/reporter/azure.go:43–47,61–62` — raw diagnostic paths/messages can inject Azure logging commands

Why: New failure diagnostics place caller-controlled paths and OS error messages directly into `##vso[...]` properties and message bodies, without escaping CR/LF or property delimiters. A missing explicit target containing a newline followed by `##vso[task.complete result=Succeeded;]` is preserved in `target_unreadable` and printed as another command line. This defeats the frozen requirement not to emit task-success commands and lets malformed paths alter CI annotations. The finding path/message emitter has the same raw boundary and should share the correction. Snapshot 1545–1549/1563–1565. Command interpretation by Azure is a static risk [INFERENCE], not an exercised Azure-agent result.

Fix: Encode dynamic Azure property/message content according to the Azure logging-command escaping rules, using separate property and message escaping where necessary. Prevent literal CR/LF from creating additional command lines; escape property `%`, `;` and `]` as required. Keep the intended logissue command itself unescaped.

Check: A diagnostic/finding with newline, carriage return, `%`, `;`, `]` and a literal task.complete payload must render only the intended annotation records, preserve encoded data and contain no additional executable command line. Also exercise an actual CLI missing-path error in Azure mode with a newline-bearing target. No Azure deployment or pipeline invocation is needed to prove the emitted-stream boundary.

### C3 [MAJOR] `pkg/reporter/terminal.go` summary/truncation branches — failed Markdown export is still advertised as a complete artifact

Why: CLI correctly sets `error/output_failure` before terminal rendering, but summary mode still prints `Full detailed violations written to ...`, and truncated output still says remaining issues were written to that path, regardless of the export failure. With a blocker-bearing scope, `--summary --output <blocked-path>` therefore emits both an output failure and a false artifact-existence claim. This is not an incidental wording preference: consumers/operators are told omitted evidence exists when creation failed. Snapshot 241–250/2347–2361/2374–2378.

Fix: Suppress the written-artifact claim when export failed, and either render the omitted findings or explicitly state they were not exported. Preserve the error verdict/exit 2 and retained findings.

Check: Extend the existing Markdown failure CLI scenario with summary/truncated output. Require error/output_failure, exit 2, retained blocker policy and no claim that omitted details were successfully written. Do not assert a replacement sentence verbatim.

### Residual scope and handoff

- Engine schema, ordinary lexical unique scope, independent blocker policy and failure precedence are materially repaired; parent receipts now exercise clean/blocker/incomplete/unsupported/empty/diff and duplicate scope. No new engine acceptance blocker found within this bounded rereview.
- Final-component directory symlinks with trailing separators are now checked after separator trimming, snapshot 399–417; dedicated tests cover both spellings, 2767–2785. Ancestor-symlink policy remains the original explicit interpretation caveat, not a newly imposed T5 containment rule.
- Do not treat the parent JSON-only smoke as runtime verification of Azure/console, post-open I/O failures or C1–C3. Focused tests do cover injected writer errors; no real disk-full or Azure-agent execution is claimed.
- T3 may proceed on its separately assigned parser-precision task once the parent transfers shared-engine ownership. C1–C3 belong to CLI/reporter ownership and must not overwrite T3 changes.
- T8's independent documentation correction remains outside this source review. The parent retains acceptance authority; this is neither release approval nor a clean T2 sign-off.

---

## Superseding scoped rereview — T2 residual correction

**Scoped verdict: changes requested for C1 only. C2 and C3 are closed by static review plus the parent's scoped test receipt.** The earlier accepted engine/schema/scope assessment is carried forward without inspecting T3's active engine changes. No integrated fresh-binary runtime claim is made for this correction.

### Evidence and scope

- Reviewed only CLI/reporters and their tests from the immutable targeted cumulative artifact `T2-residual-corrected-review.md`, captured `2026-10-26T23:01:25.949Z`, parent-supplied SHA-256 `5a7ad720f8eb1771e4c4138ca8956222c18f0dd0887fcb7d0044087984bf2fe8`. All snapshot anchors below refer to that artifact.
- Read parent `receipts/T2-residual-corrected.json/.log`: `go test ./pkg/reporter ./cmd/testguard`, status 0; both packages report `ok`. Receipt output digest is `2de59f4565b8a6f019df6ee9712ff1d3df6714318ef7873d032db5e78ef87ad5`. This is observed receipt evidence, not a command rerun by this reviewer.
- No commands/checks, implementation edits, live engine inspection, T3 precision review or T8 edits performed in this scoped pass. Only this requested review append was made. Applicable previously loaded Go/review/test standards were refreshed through the MCP router; compliance audit reported no routed-category gaps.
- Parent explicitly deferred fresh-binary residual smoke until T3 settles. That integration gate remains pending and cannot be inferred from the scoped package test receipt.

### C1 — original examples repaired, shorthand-cluster boundary still open [MAJOR]

File/anchor: `cmd/testguard/main.go`, `classifyScanInvocation`, snapshot 38–120, especially 70–73 and 89–114; Execute integration at 297–304.

Why: Command selection now uses Cobra's tree, option lookup uses registered flag metadata, separate value operands are consumed, and `strconv.ParseBool` correctly handles the previously reported false spellings. The table at 1505–1579 covers the original C1 cases. However, the short-option branch always interprets every character after the first shorthand as that flag's attached value. That matches a value-taking option such as `-fjson`, but not pflag's supported clusters of no-argument boolean shorthands followed by another flag. `NoOptDefVal` is consulted only after this branch has already marked the remainder as a value.

Consequences [INFERENCE from static code; not executed]:

- `testguard -sfjson --top not-a-number`: Cobra parses `-s` as true and `-fjson` as JSON format, then rejects the integer. The classifier treats `fjson` as a value for `s`, never recognizes format=json and emits stderr-only instead of the required JSON usage envelope.
- `testguard -so --json --unknown`: Cobra parses `-s` as true and `-o` with the following token `--json` as its output filename, then rejects the unknown flag. The classifier consumes only the clustered token as `s` with value `o`, then misreads the output operand `--json` as a JSON flag, emitting a scan JSON envelope for a console-mode invocation.

This is the same C1 flag/value classification defect, not a schema expansion or a request to reject valid existing shorthand syntax. It affects error presentation and recoverable requested scope, not the engine's finding-retention policy.

Fix: Walk short-option clusters according to the registered flags' `NoOptDefVal`: a no-argument boolean shorthand without `=` consumes only its own character and continues the cluster; a value-taking shorthand consumes the remainder or next token. Preserve explicit boolean `=value` behavior and existing long-flag/`--` handling. Keep a single metadata-driven classifier rather than adding special cases for the two strings above.

Check after the parent authorizes the next settled verification: add these two distinct classification cases to the existing helper CLI table, asserting JSON-vs-stderr framing, exit 2 and recovered paths; run them through the pending fresh-binary residual smoke after T3 settles. No new incidental prose assertions are needed.

### C2 — Azure diagnostic/finding command injection closed

- Separate property/message replacers encode `%`, CR/LF and property `;`/`]` before constructing logissue commands (snapshot 320–342).
- Diagnostic paths and messages and finding paths/messages all flow through those boundaries (371–401); internally generated analysis status/reason remain fixed contract values rather than caller path content.
- Reporter regression exercises both diagnostic and finding payloads with newline-bearing task.complete text, property delimiters and percent/CRLF, asserting only intended command records (674–729). CLI helper exercises an actual missing newline-bearing target in Azure mode (1645–1662).
- Existing first-write-error propagation remains intact (360–365/404–407); no deliberate task-success command was introduced.
- Closure is scoped to emitted-stream safety. No Azure-agent deployment, server-side interpretation test or fresh standalone binary execution is claimed.

### C3 — failed-export artifact claims closed

- Terminal derives the failed-export condition from the existing `analysis.reason == "output_failure"` without changing the report schema (1159–1161).
- Both summary and truncation branches explicitly distinguish failed export from successful written-artifact claims (1297–1304 and 1328–1336), preserving error/exit and retained findings.
- Existing CLI export-before-render/error mutation remains in place (252–275).
- Tests cover summary and truncated outputs at reporter and helper CLI layers (940–992/1605–1642), checking the error verdict, blocker retention and absence of a false successful-export claim. Replacement explanatory prose is not pinned.

### Current handoff

One bounded CLI-only C1 correction remains. No further reporter defect was identified within this scoped pass; do not reopen accepted C2/C3 or touch T3's engine. Earlier R1–R12 closures are unchanged except the already-partial R7/R11 classification edge tracked by C1. After the classifier correction and T3 settlement, parent must exercise the pending actual fresh-binary residual matrix before claiming integrated T2 runtime acceptance.

---

## Superseding C1-only source rereview — shorthand correction

**Verdict: original two cluster examples repaired; C1 remains open for equals-valued clusters.** C2/C3 remain closed. Earlier accepted engine closures are carried forward without inspecting T3. No build/test/fresh-binary runtime PASS is claimed on this revision.

Evidence: immutable `T2-shorthand-corrected-review.md`, captured `2026-10-26T23:05:26.621Z`, parent-supplied SHA-256 `4b3b16efee90ba53958b67f6d023f3074c9fbb84ddc494ef3fcd3bed5005fcc0`. Review limited to `classifyScanInvocation` and its table regression additions. No checks, commands, source edits or unrelated audits performed; only this review append. Applicable CLI/Go/test standards were refreshed; MCP compliance audit reported no routed-category gaps.

### Closed portion

- Snapshot 118–145 now looks up one shorthand character at a time. Nonempty `NoOptDefVal` consumes only the boolean shorthand; a value-taking shorthand consumes the remainder or next argv token.
- Therefore the previously reported `-sfjson --top not-a-number` and `-so --json --unknown` cases are structurally repaired. The table adds both behaviors at 489–490; no execution result is available for them on this revision.
- Long boolean false aliases continue to use `strconv.ParseBool` (88–93), and ordinary `--`/separate value handling is preserved.

### C1 remaining [MAJOR] — the early equals branch bypasses the new cluster parser

File/anchor: `cmd/testguard/main.go`, `classifyScanInvocation`, immutable snapshot 100–115.

Why: Before entering the corrected per-character loop, any shorthand token containing `=` is split into the entire prefix and passed to `ShorthandLookup`. For `-sf=json`, that passes `"sf"` as one shorthand instead of parsing boolean `s` followed by value-taking `f` with value `"json"`. A shorthand lookup is for one character, not a cluster; the JSON format cannot be recovered by this branch. A single-byte-enforcing pflag implementation additionally rejects that multi-character lookup. This path remains outside the new regression cases.

Static correction scenarios [INFERENCE, not executed]:

- `testguard -sf=json --top not-a-number`: valid clustered JSON selection followed by a parser error must emit exactly one v1 error/invalid_usage envelope and exit 2, not fail inside the classifier or fall back to stderr-only.
- `testguard -so=--json --unknown`: the output value is literal `--json`; this must remain a console-mode stderr-only parser error, with no scan JSON.
- Preserve standalone `-f=json`, clustered `-sfjson`, explicit short boolean assignment such as `-s=false`, long false aliases, and `--` path handling.

Fix: Handle `=` at the current shorthand position inside the same metadata-driven cluster loop, rather than looking up the entire prefix. Boolean shorthands continue one character unless their own next character is `=`; value-taking shorthands consume the remaining attached value, removing only its optional leading `=`, or consume the next argv token. Never submit a cluster to `ShorthandLookup`.

Check when the parent authorizes post-freeze verification: extend the existing classification table with these distinct equals-valued cluster cases and exercise them in the pending fresh-binary residual smoke. Assert framing, mode, requested paths and exit behavior; no incidental sentence or schema additions.

This is still one bounded CLI-only correction. It does not block T3's separate engine work or reopen reporter ownership. Parent integration acceptance remains pending engine freeze and actual CLI verification.

---

## Superseding C1 technical verdict — equals correction

**C1 CLOSED by scoped static review. No remaining supported-spelling contradiction identified in the corrected shorthand/equals boundary.** C2/C3 remain closed; earlier engine closures are unchanged. This supersedes the open C1 verdict above, not the pending runtime integration gate.

Reviewed immutable `T2-equals-corrected-review.md`, parent-supplied SHA-256 `c6b6f69a94203d7944dcc14c832cac8c479b22c5f9f3b02f29d9aa9fa7fda061`. Scope was only the remaining equals-cluster correction and corresponding tests; no live engine/T3 audit, source edits, commands, builds, tests or checks. Only this review artifact was appended. Applicable CLI/Go/test skills remain loaded; MCP compliance audit reported no routing gaps.

Technical closure evidence (anchors refer to this immutable snapshot):

- The early whole-prefix equals branch is removed. Every shorthand lookup receives exactly one character in the common cluster loop, lines 100–105.
- A no-argument flag uses `NoOptDefVal` and advances one character; when its immediately following character is `=`, the remaining text is its explicit value and the cluster stops, lines 107–112. This preserves ordinary `-s=false` semantics without interpreting `false` as additional flags.
- A value-taking shorthand consumes the attached remainder, removing only one optional leading `=`, or consumes the next argv token, lines 113–120. Thus `-sf=json` locates boolean `s`, then `f` with value `json`; `-so=--json` locates boolean `s`, then `o` with literal value `--json`, not a JSON option.
- Standalone `-f=json`, attached `-fjson`, prior boolean clusters and next-token dash-prefixed option operands follow the same metadata-driven path. Long JSON false aliases continue through `strconv.ParseBool`, lines 88–93. End-of-options/path handling is unchanged.
- Existing classification table retains the prior C1 controls and adds `-sf=json`, `-so=--json`, `-s=false` and `-f=json` at lines 479–482. These assert the relevant mode/framing/exit/path behavior; their presence is not a runtime PASS claim.

**Current gate:** no C1–C3 source-review correction remains. Parent must wait for T3 engine freeze, then run the settled focused tests/build and actual fresh-binary residual smoke before declaring integrated T2 acceptance. No runtime evidence from a prior revision is promoted to this one.

### Parent integrated runtime evidence — C1/C2 gate satisfied

This update supersedes the pending fresh-binary C1/C2 gate above. Read parent `receipts/T3-actual-go-cli.json/.log`: receipt status 0; executable `/tmp/testguard-ai-assurance-t3-settled`; receipt output SHA-256 `b67e3a09fff0252b3be49b54cef1576d2e7be1773c948cec8ea601973cb7be10`. No commands/checks or source edits were performed by this reviewer.

The recorded actual CLI cases confirm:

- `-sfjson`, `-sf=json` and `-f=json` followed by invalid `--top` produce JSON error envelopes and exit 2.
- `-so --json --unknown` and `-so=--json --unknown` preserve consumed-output-value semantics: visible non-JSON errors and exit 2.
- `--json=FALSE --unknown` remains a visible non-JSON error/exit 2.
- `-f json explain NOT-A-RULE` remains a visible non-scan error/exit 2.
- Azure output for the newline-bearing missing target contains no injected command lines. Parent additionally reports encoded CR/LF and only intended logissue command records.

Parent separately reports integrated focused parser/engine/reporter/CLI packages PASS. That package-run statement is attributed to the parent message; this append directly inspected only the named actual-CLI receipt/log. Earlier focused writer-error and failed-export behavior evidence remains revision-scoped as recorded, not newly rerun evidence.

**T2 scoped review disposition: no outstanding R1–R12/C1–C3 source-review correction; C1 and Azure C2 fresh-binary scenarios now exercised by the parent.** C3's focused reporter/helper-CLI evidence remains the recorded prior scoped PASS; no new standalone-binary failed-export scenario is asserted. T3's separately reported Go-rule/clone test failures remain under its independent review and do not reopen these CLI/reporting findings or imply a full-suite PASS. Final T2 acceptance remains the parent's decision.
