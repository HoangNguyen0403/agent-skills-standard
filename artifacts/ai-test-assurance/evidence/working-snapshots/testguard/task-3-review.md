# T3 independent source review — corrections required

## Material findings

### R1 [MAJOR] Go adapter / clone consumer: declaration names prevent real Go clone matches

**Anchors:** `pkg/parser/golang/adapter.go:156-181`; `pkg/detectors/clone/hasher.go:27-38,46-52`; immutable snapshot lines 2441-2467 and 9-55.

Why: `RawBody` contains the complete `func TestName(...) {...}` declaration, but clone hashing does not remove or normalize declaration names. Two valid Go tests necessarily have different names in the same package, so even identical executable bodies hash differently. The added clone tests construct body-only `TestUnit`s and do not exercise this adapter/consumer boundary. AC-07 wording is therefore not reached through ordinary parsed Go tests.

Fix: Derive the Go clone input from the function body, preserving the existing cross-language `RawBody` contract where necessary; do not globally strip text with a function-name regex.

Correction scenarios: Parse two differently named tests with identical bodies, then run the actual clone consumer and CLI: one advisory identifying the duplicate. Parse two differently named tests with equal structure and distinct positive literals: a similarity advisory, never semantic redundancy. Keep a structurally different control unmatched.

### R2 [MAJOR] Clone exactness is not token exactness; literal whitespace can produce a false identity claim

**Anchors:** `pkg/detectors/clone/hasher.go:14-16,27-31,59-68,90`; snapshot lines 20-29,49-52.

Why: The new `isExact` comparison collapses whitespace inside string and raw-string contents. For body-only units `assert.Equal(t, "a  b", actual)` and `assert.Equal(t, "a b", actual)`, both the normalized hash and purported exact comparison coincide. The result claims “identical execution tokens” and recommends consolidation despite distinct expected values. This path is shared with non-Go adapters. The four-test branch additionally calls a regex-normalized raw-text comparison “AST structure”; no AST is inspected. Comments remain part of the hash, and escaped/raw strings are not reliably tokenized by the string regex.

Fix: Compare lexical token identities while retaining literal values for the exact branch and excluding comments; keep any literal-normalized branch explicitly structural/uncertain. Do not advertise AST comparison unless it actually exists. Preserve language boundaries rather than imposing Go tokenization on other adapters.

Correction scenarios: Distinct embedded spaces, raw-string newlines, escaped quotes, and different literals must never receive an exact-execution identity claim. Identical executable tokens with different comments must not become different execution bodies. Exercise a non-Go consumer because this detector is shared.

### R3 [MAJOR] Layer exemption regression and overbroad exemptions

**Anchors:** `pkg/rules/golang/rules.go:17-35,192-197`; snapshot lines 1494-1524. Parent focused-run failure: `dao/order_dao_test.go`, expected zero findings, got one.

Why: Removing the synthetic leading slash means a root-relative `dao/...`, `db/...`, or `store/...` no longer matches its slash-delimited exemption, while an absolute or nested spelling can. Simultaneously replacing `/repository/`, `/infrastructure/`, and `/database/` with unrestricted substrings exempts unrelated service paths such as `service/repository_client_test.go`. The same executable database call changes classification according to path spelling or an incidental name substring.

Fix: Normalize a leading slash and retain segment-aware directory matches plus deliberate filename suffix exemptions. Do not fix the DAO failure by broadening all matches further.

Correction scenarios: DAO/db/store root-relative, nested, and absolute paths receive the same exemption; real repository/infrastructure directories remain exempt; service files merely containing `repository` or `database` in their basename still receive GUARD-GO-02 for `sqlmock.New()`.

### R4 [MAJOR] Name-only discovery counts helper declarations and TestMain as executable tests

**Anchors:** `pkg/parser/golang/adapter.go:51-81,146-153`; snapshot lines 2336-2366; engine analyzed-test accumulation snapshot lines 574-577 and empty-scope decision lines 644-658.

Why: Discovery checks only receiver absence and a name prefix. A valid `func TestHelper() {}` used as a helper, and `func TestMain(m *testing.M) {...}`, become unit tests. A test file containing only TestMain can therefore have a positive analyzed-test count and a complete verdict despite having no test cases; helper/setup code can acquire test-quality blockers. The byte-to-rune conversion also fails Go's name-boundary rule for multibyte lowercase letters. This is syntactic entry-point recognition, not a request for a compiler or dataflow analysis.

Fix: Check body presence and syntax-level parameter/result/type-parameter constraints for each supported test kind; exclude TestMain from cases and decode the first suffix rune properly. Handle testing import aliases syntactically. Qualify example execution support when no Output marker exists.

Correction scenarios: Valid T/B/F entry points retained; helpers with Test-prefixed names and non-test signatures, TestMain, receiver methods, bodyless declarations, and lowercase Unicode suffixes excluded. TestMain-only file remains empty scope under the existing T2 decision contract. Valid aliased testing imports remain recognizable.

### R5 [MAJOR] Assertion detection turns a valid renamed testing parameter into a blocker

**Anchors:** `pkg/parser/golang/adapter.go:94-125`; `pkg/detectors/zeroassert/detector.go:22-27`; snapshot lines 2379-2411 and 595.

Why: Standard assertions are recognized only on identifiers literally named `t`, `b`, or `f`. `func TestValid(test *testing.T) { test.Fatal("failure") }` is valid Go but produces an empty Assertions slice, which the existing zero-assertion detector converts to a blocker. Conversely, every call on an identifier spelled `assert`, `require`, or `is` is treated as an assertion, including non-asserting constructors. The new adapter supplies stronger “genuine executable assertion” language than this heuristic supports.

Fix: Derive standard testing receiver identifiers from the accepted function parameters; use actual assertion-method recognition rather than accepting every selector call. Document helper-mediated and unresolved receiver limitations without claiming interprocedural proof.

Correction scenarios: Renaming the testing parameter must not change the zero-assert verdict; quoted assertions still do not count; a constructor-only `assert.New(t)` test does not establish an assertion. Preserve supported direct assertion-library calls and explicitly state unsupported helper/receiver cases.

### R6 [MAJOR] Table recognition treats repeated fixture values as duplicate test cases

**Anchors:** `pkg/rules/golang/rules.go:267-288,300-333`; snapshot lines 1761-1783,1803-1847.

Why: Every array/slice whose element type is an `ast.Ident` qualifies, including `[]string{"repeat", "repeat"}` and primitive/named scalar fixture data. These become “duplicate table test row” advisories even though repeated values may be the input being tested. The fallback also accepts non-array composite literals with a composite first element. No test-case relationship is established. Additionally, the arbitrary formatted-length threshold skips legitimate short duplicate struct rows such as `[]struct{ n int }{{0}, {0}}` while longer equivalent values are reported. Syntax-aware traversal eliminated quoted-fixture matches but introduced ordinary executable fixture false positives and short-row misses.

Fix: Restrict supported table candidates to defensible row-like array/slice syntax; do not treat arbitrary scalar slices or struct containers as test tables. Remove the character-length proxy and preserve distinct row literal values. Disclose ambiguity for named types without adding type-checking/dataflow requirements.

Correction scenarios: Repeated string/number fixture slices and nested payload structures produce no table advisory; two distinct tables do not cross-match; actual duplicate struct rows, including `{0}`, produce an advisory at the second row; distinct boundary values remain unreported.

### R7 [MAJOR] Package spelling is mistaken for package identity; alias misses and receiver false positives remain undisclosed

**Anchors:** `pkg/rules/golang/rules.go:136-161,211-237`; `pkg/parser/adapter.go:32-36`; snapshot lines 1633-1658,1708-1733 and 1411-1415.

Why: `dbmock "github.com/DATA-DOG/go-sqlmock"; dbmock.New()` is an executable instance of the supported bad pattern but is ignored. An unrelated receiver variable named `sqlmock` with a `New` method is flagged instead. The domain rule's broadened `*mock` spelling heuristic can similarly create blocker false positives. The AST carrier preserves the function and positions but not file import context, so consumers cannot distinguish these cases from the information currently supplied. This is a syntax-context limitation, not a demand for full semantic resolution.

Fix: Preserve enough original-file import context to resolve ordinary aliases and reject obvious non-import receiver matches, or explicitly narrow the supported detection contract and disclose unresolved/ambiguous cases. Do not state that arbitrary receiver-name matching proves a concrete database/mock constructor.

Correction scenarios: Canonical and aliased supported imports receive equivalent findings at exact positions; an unrelated local receiver with the same spelling does not become a proven package-constructor violation; helper-mediated calls remain an explicit limitation, not an implicit coverage claim.

## Existing failing control that must remain open

Parent focused execution of `TestDetectExactClones_DistinctBoundaryValuesMessage` expected one advisory and got zero. The fixture compares `Calc(0)` with `Calc(-1)`: number replacement leaves the unary minus, so the normalized hashes differ. This is an observed failure, not independently rerun here. Resolve the intended structural-similarity definition explicitly; keep the signed-boundary control meaningful rather than deleting the assertion, changing it to expect no result merely to green the suite, or claiming the warning branch was exercised. R1 separately prevents ordinary named Go declarations from reaching clone grouping even for same-sign literals.

## Evidence, scope, and limits

- Verdict: **corrections required; T3 not accepted**. Findings above are source-derived reasoning; proposed correction scenarios were not executed in this review.
- Authoritative review input: AGS `.agent/sdd/ai-test-assurance/T3-settled-review.md`, supplied SHA-256 `14daf193ba49bc21e6c4d42b96fab2d0ca447270e64e5d55c43bf3d6c418af02`. Snapshot anchors bind the reviewed diff; local source reads supplied readable file/line anchors. No hash command was run.
- Requirements: PRD REQ-02 / AC-05..07 / Task 3; SRS-002 and T3 ownership/verification row. Scope restricted to new Go adapter, shared TestUnit AST carriers, Go rules, clone detector, and engine parser dispatch/consumer integration. Earlier accepted T2 changes were not reopened. No compiler, dataflow engine, new framework, or other-language parser rewrite requested.
- Parent-supplied focused-run evidence: `T3-integrated-focused` log SHA-256 `66f0b499b41eed0416eee48709f7ba1ab11471cb00fccc80f31de750beff2f91`; DAO exemption and signed-boundary clone failures remain open. Other parser/Dart/Go-engine/reporter/CLI focused packages were reported passing, not independently certified here.
- Parent-supplied actual CLI smoke: `T3-actual-go-cli` log SHA-256 `b67e3a09fff0252b3be49b54cef1576d2e7be1773c948cec8ea601973cb7be10`. Fresh binary scanning original `pkg/rules/golang/rules_test.go`: complete, exit 0, GUARD-GO-02 count 0 and GUARD-GO-03 count 0. Real syntactically valid TestRealPort fixture with executable `sqlmock.New()` at line 4: GUARD-GO-02 at line 4, exit 0 because warning is nonblocking. This supports the named paired control only; no population-wide precision claim.
- Static positive observations: ordinary string/comment fixtures cannot become Go call/composite nodes; the direct adapter path retains an original FileSet for call/row source positions; AST carrier fields use `json:"-"`, preserving JSON shape; Dart dispatch remains separate. These do not close the findings or prove all-language regression freedom.
- Carrier limitation: fallback parsing silently returns no rule findings on unsupported RawBody; position code decides original-versus-synthetic provenance by nonnil ASTDecl rather than successful paired carrier validation. Keep carrier pairing/provenance consistent if this interface changes. The ordinary adapter-created pair is internally consistent; no separate runtime defect is asserted from malformed external carriers.
- Review performed no builds, tests, lint, formatting, shell checks, source edits, delegation, or explicit network operations. A descriptive source-location tool failed due its service credit error; literal local search supplied the assertion consumer evidence. Only this report was written.
- Applicable loaded rules: common/common-architecture-audit, common/common-best-practices, common/common-code-review, common/common-error-handling, common/common-observability, common/common-performance-engineering, common/common-security-standards, golang/golang-language; managed testguard-scan-contract-recovery. Session compliance tool confirms routed skill consultation, not behavior. No project workflows were available. Token/pricing telemetry unavailable; no cost estimate claimed.

## Recovered frozen-source verdict

**Verdict: corrections still required.** This section supersedes earlier open/closed status for the recovered snapshot only; earlier sections remain historical evidence.

Reviewed input: AGS `.agent/sdd/ai-test-assurance/T3-recovered-review.md`, parent-supplied SHA-256 `ca7a921a490b9c393af7e5e576d826412c164e3ab3a3bdda3ffe15843c4b912d`. All snapshot line anchors below refer to that immutable input. No digest computation or behavioral checks were performed by this reviewer.

### Closure matrix

| Finding | Recovered source disposition |
| --- | --- |
| R1 | Closed for actual adapter/clone integration: snapshot 4112-4125 extracts the AST body; clone 387-401 consumes it directly. The first-textual-brace fallback is removed. |
| R2 | Original string-whitespace, Dart operator, ordinary ASI newline, and Go signed-spacing counterexamples repaired: 227-274 uses Go scanner only for Go; 58-88 preserves generic operator/newline identity; 299-311 normalizes unary numeric signs. Exact comparison preserves literal bytes. Residual multiline-comment newline defect below prevents full closure. |
| R3 | Closed: 2404-2436 preserves leading-slash normalization and bounded directory/suffix exemptions. |
| R4 | Testing import provenance and exact parameter count repaired at 3754-3792, 3808-3851. Unicode handling, receiver/body/generic/result checks retained. Output-marker logic still rejects common runnable examples and accepts documentation-only markers; residual below. |
| R5 | Original arbitrary `now.Equal` / `err.Error` false assertions repaired: 4061-4073 requires a known package or constructor receiver. Renamed testing parameter preserved. Constructor receiver identity remains function-global rather than lexical, allowing the same false-clean outcome through separate scopes; residual below. |
| R6 | Closed for the reported syntactically identifiable cases: 2806-2852 excludes nested array/map element types, preserves struct/pointer row syntax, and explicitly qualifies named-type ambiguity. Short-row threshold remains removed; comparisons remain per table and retain literal values. No full type resolution demanded. |
| R7 | Known canonical import-name and alias recovery repaired at 3706-3792, including unaliased go-sqlmock and versioned pgxmock. Original engine expectation remains supported. Local shadow detection now suppresses genuine package calls outside the shadow's scope; residual below. |

### RR2 [MAJOR] Multiline comment removal discards execution-relevant JavaScript line breaks

**Anchors:** `pkg/detectors/clone/hasher.go`, recovered snapshot 80-109, 332-343, 419-424.

Why: Generic newlines become exact-comparison tokens only in the ordinary whitespace branch. The block-comment branch skips all contents, including line terminators. In JavaScript, a multiline comment containing a line terminator participates in automatic semicolon insertion. Valid callback bodies `return /*\n*/ value;` and `return value;` therefore have different results, but this lexer produces identical exact tokens and emits “identical execution tokens.” The ordinary newline control added at 694-719 does not cover comment-contained newlines.

Fix: Preserve execution-relevant line terminators when discarding block comments, or conservatively refuse exact identity for the affected generic syntax. This is lexical handling, not a request for a new language parser.

Correction scenario: Two JS callback bodies differing only by a line terminator inside the return-following block comment must not receive an exact-execution identity message. Keep ordinary single-line comment differences harmless where statement boundaries are unchanged.

### RR4 [MAJOR] Runnable example detection reads the last comment line, not its output group

**Anchors:** `pkg/parser/golang/adapter.go`, recovered snapshot 3908-3932, 4103-4105; added example controls 4534-4567.

Why: For the conventional multiline output form:

```go
func Example() {
    fmt.Println("one")
    fmt.Println("two")
    // Output:
    // one
    // two
}
```

the loop overwrites `last` with `// two`, so it drops a runnable example. A file containing only this example can become empty scope. Conversely, `// Output: one` placed in the function's documentation followed by an example body without an output comment is accepted because `fn.Doc` seeds `last`; go test does not treat that documentation as the example's output oracle. Existing added controls use single-line in-body output comments only.

Fix: Use the standard-library example/output-comment extraction semantics, or inspect the final in-body comment group as a group without consulting function documentation. Preserve empty output and unordered output forms.

Correction scenarios: Multiline output, empty output, and unordered output examples count when runnable; a documentation-only Output marker does not turn a compile-only example into an executable case. Assert analyzed-test count and empty-scope outcome for example-only files.

### RR5 [MAJOR] Assertion receiver origin leaks between disjoint lexical scopes

**Anchors:** `pkg/parser/golang/adapter.go`, recovered snapshot 3999-4024, 4070-4073; assertion-origin controls 4570-4623.

Why: The constructor pass stores only the receiver spelling in a function-wide map. In a valid test with:

```go
{
    check := assert.New(t)
    _ = check
}
check := errors.New("boom")
_ = check.Error()
```

the constructor alone supplies no oracle, and the outer `check.Error()` is not an assertion. Nevertheless the earlier inner-scope constructor marks every later identifier spelled `check` as an assertion receiver; `Error` is an accepted method, so the zero-assertion blocker disappears. The two declarations are different lexical objects, requiring no dynamic analysis to distinguish.

Fix: Associate constructor-established receivers with their actual lexical declaration/object, not just a spelling shared across the entire test. Preserve existing standalone-constructor and unrelated-method negative controls.

Correction scenario: Disjoint-scope receiver reuse above retains GUARD-UNIV-ZERO. An actual `check := assert.New(t); check.Equal(...)` retains assertion recognition. Do not solve this by counting constructors as assertions.

### RR7 [MAJOR] A local declaration suppresses real imported-package calls elsewhere in the test

**Anchors:** `pkg/rules/golang/rules.go`, recovered snapshot 2514-2565, 2618-2620, 2720-2722.

Why: `isLocallyDeclared` searches the entire function for a matching spelling, ignoring declaration position and block scope. With the canonical unaliased sqlmock import, this valid body loses the genuine GUARD-GO-02 finding:

```go
db, _, _ := sqlmock.New()
_ = db
{
    sqlmock := "fixture"
    _ = sqlmock
}
t.Fatal("control")
```

The inner local cannot shadow the preceding package call, yet its mere existence suppresses that call. The same global suppression applies to domain gomock blockers. The comment acknowledges conservative suppression but does not preserve the promised direct executable control; this is not helper-mediated ambiguity.

Fix: Decide import-versus-local provenance at the selector occurrence using lexical declaration context. No package loader, full compiler, or interprocedural dataflow needed.

Correction scenarios: Imported package calls before or outside a disjoint local shadow still report at their original positions; calls actually on the shadowing receiver do not. Keep the original unaliased engine control at GUARD-GO-02 line 8 unchanged.

### Recovered evidence status

- Parent authoritative focused run: all parser/Dart/Go/rules/clone/engine/reporter/CLI packages PASS; receipt `T3-recovered-focused`, SHA-256 `cdefa902d4d3142bf7938af6f838bc5a685a63f70f158abe83932ba49e904159`. The original engine expected GUARD-GO-02 line 8 is unchanged. These close the previously observed test failures, not the source-derived residuals above.
- Parent subsequently supplied full `go test ./...` PASS: `TestGuard-full-suite` SHA-256 `7d04f73e20719039a406326abf79e0d8dd040b38f648db6a0b894376bced9355`. Fresh recovered boundary CLI receipt `T3-recovered-boundary-cli-correct-rule`, SHA-256 `e9fe571858c303e36b45fa985a2544e4eda12e58590ed30ad62b4bb116519b2d`, reports PASS for canonical unaliased sqlmock, direct err.Error-only zero-assert blocker, TestMain-only/no-output-example/grouped-parameter empty scope, differently named identical-body clone, nested array exclusion, and short struct duplicate row. Binary SHA-256 `bbf64cdebc1a902e1dc7af9fdead33c2762e3942140611c77251a697521a9755`. Parent retained the initial throwaway harness's incorrect clone-rule expectation history and corrected the harness only to GUARD-UNIV-01; no product expectation was weakened. These named controls do not exercise the four residual scenarios above. Worker gopls/go-build diagnostics are not acceptance evidence.
- All four residual counterexamples are statically derived and unexecuted in this review. No tests, builds, diagnostics, probes, formatting, shell checks, or source edits were run. Only this report was appended.
- No population-wide precision, universal semantic duplicate detection, all-language regression freedom, or production protection claim. Remaining ambiguous named row types and helper-mediated/dynamic calls stay bounded limitations; no unbounded semantic-analysis work requested.

## Scope-corrected frozen verdict — four residuals closed

**Source verdict: RR2, RR4, RR5, and RR7 closed for their reported counterexamples; no additional material runtime defect identified in the bounded corrective paths. Execution acceptance remains pending the new test's source-oracle correction and parent verification.** This section supersedes the recovered section's four open residual statuses, not its historical evidence.

Reviewed input: AGS `.agent/sdd/ai-test-assurance/T3-scope-corrected-review.md`, supplied SHA-256 `d4491e21d5699838deec6d3081f779a0ee7d57f023045cd5846b8683b7ae40a0`. All anchors below refer to this immutable snapshot.

| Residual | Independent source closure |
| --- | --- |
| RR2 | Clone snapshot 101-116 now emits newline tokens while skipping multiline block comments. Exact comparison therefore distinguishes `return /*\n*/ value;` from inline return. Inline comments without a terminator remain harmless. Added controls at 805-854 distinguish uncertain similarity from exact identity rather than asserting only a nonzero count. Go-specific scanner and the prior operator boundaries remain intact. |
| RR4 | Adapter 4147-4160 uses `go/doc.Examples`, checking `Output` or `EmptyOutput`; 4287-4305 filters by the resulting actual function-name map. This replaces the last-comment-line and fn.Doc guesses. Added controls 4754-4798 cover multiline output, empty output, unordered output, and documentation-only markers. Prior testing-import provenance and exact parameter count are retained. |
| RR5 | Adapter 4194-4218 keys constructor receivers by `*ast.Object`; use at 4268-4270 checks the selector receiver's same lexical object. Disjoint identifiers spelled `check` cannot inherit the inner constructor's origin. Testing parameter recognition also uses declaration identity at 4071-4090 and 4248-4253; imported assertion qualifiers require no local object at 4256-4265. The actual parser invocation at 4280-4282 retains standard object resolution rather than enabling SkipObjectResolution. Added disjoint-scope and positive constructor controls at 4858-4907 cover both sides. |
| RR7 | Rules 2726-2733 replaces whole-function spelling searches with selector-occurrence `ident.Obj` provenance; both domain and port rules apply it at 2786-2789 and 2888-2891. An actual imported-package call has no local object; a later inner declaration has a different local binding and no longer suppresses the earlier call. Known canonical import-name/alias mapping is retained. |

R1 and R3 remain closed; the prior R6 nested-array/map exclusion and literal-preserving table boundaries remain closed for the reported cases. AST body extraction remains at adapter 4311-4324, with no textual first-brace fallback reinstated. These are bounded static closure judgments, not claims of full compiler/dataflow semantics or every-language lexical completeness.

### New regression test has an incorrect expected source line, not a runtime location regression

**Anchors:** new `TestEngineGoUnaliasedPackageCallBeforeLocalShadow`, snapshot 2475-2520.

Why: The fixture literal begins at snapshot 2479 with `package service_test`. Counting its actual lines gives package=1, blank=2, import opener=3, testing import=4, sqlmock import=5, import closer=6, blank=7, function declaration=8, and `sqlmock.New()` at snapshot 2487=**line 9**. The assertion at 2517-2518 expects 8. Parent's observed actual line 9 is truthful. The finding-count assertion immediately preceding it still requires exactly one GUARD-GO-02; there is no evidence here that a runtime position change is needed.

Fix: Correct only the new test's expected line and diagnostic from 8 to 9. Preserve the existing original `TestEngineGoQuotedVsExecutableRules` canonical control at line 8 unchanged. Parent has assigned that bounded two-line test-oracle correction to the standard worker; it was pending when this review settled. No runtime source correction is requested by this review.

### Scope-corrected evidence and acceptance boundary

- Parent full-suite run currently FAILS only the new test's expected 8 versus actual 9 location assertion; receipt `T3-scope-corrected-full`, SHA-256 `b32017c634f0b8b8e2bac43bf757a094c9b018afc7e61dbe09e9024c7ba3c565`. The original canonical engine control passed; other packages, including the new example/comment controls, were reported passing.
- The new failure is accepted as observed, not rerun. Independent literal-line counting establishes the erroneous test oracle without changing the product location to satisfy it.
- Earlier recovered full-suite/CLI PASS receipts remain earlier-revision evidence. Do not relabel this currently failing full-suite run PASS or treat proposed test changes as already applied.
- No tests, builds, diagnostics, probes, shell checks, source edits, or delegation performed in this scoped review. Only this report appended. Parent verification after the exact test-oracle correction is still required for final integration acceptance.
- No population-wide precision, semantic duplicate proof, all-language regression, production protection, or worker-diagnostics acceptance claim.
