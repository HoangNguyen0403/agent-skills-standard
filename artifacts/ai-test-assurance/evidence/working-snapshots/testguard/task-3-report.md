# Task 3 Report: Calibrate Go Parsing and Rule Precision (T3)

- **Task**: Task 3 (Calibrate Go parsing and rule precision)
- **Status**: done
- **Settlement**: Edits settled. (No runtime SATISFIED claims asserted; verification belongs to orchestrator post-freeze run.)

## 1. Acceptance Criteria Mapping

| Criterion | Implementation & Settlement | Settlement State |
|---|---|---|
| **T3-1 (AC-05)**: Quoted source/comments inside Go tests do not trigger executable mock/duplicate signals | Standard library `go/parser` and `go/ast` inspection implemented in `pkg/parser/golang/adapter.go` and `pkg/rules/golang/rules.go`. `ast.Inspect` checks executable `*ast.CallExpr` and `*ast.CompositeLit` nodes, ignoring string literals (`token.STRING`) and comments. Scanning `pkg/rules/golang/rules_test.go` directly targets 0 false positives for `GUARD-GO-02` (which previously matched `"db, mock, err := sqlmock.New();"`) and `GUARD-GO-03` (which previously matched `"tests := []struct{ in int... }"`). | CODE_SETTLED |
| **T3-2 (AC-06)**: Corresponding executable bad patterns still trigger correct source locations | In `pkg/rules/golang/rules.go`, `getNodeLineAndColumn` resolves the truthful 1-based source line and column from `token.FileSet` using `fset.Position(node.Pos())`. Real executable calls (`gomock.NewController`, `sqlmock.New`, duplicate table rows in `*ast.CompositeLit`) trigger `GUARD-GO-01`, `GUARD-GO-02`, and `GUARD-GO-03` at the exact line of the offending executable construct rather than defaulting to `unit.StartLine`. Covered in `pkg/rules/golang/rules_test.go` and `pkg/engine/engine_test.go`. | CODE_SETTLED |
| **T3-3 (AC-07)**: Preserve boundary-valued cases and do not claim clone text proves semantic duplication | 1) In `pkg/rules/golang/rules.go` (`TableDuplicateRule`), rows with distinct boundary values (e.g. `{in: 0, want: 0}`, `{in: -1, want: 0}`, `{in: 100, want: 10}`) format to distinct AST representations; only verbatim duplicate rows trigger `GUARD-GO-03`. 2) In `pkg/detectors/clone/hasher.go`, code is lexically tokenized with comments stripped and literal contents preserved. When tests match only after literal normalization (`_LIT_`/`_NUM_`), the advisory explicitly reports structural similarity: `"Similar test structure: '%s' shares normalized token structure with '%s' (line %d). Note: literal normalization indicates structural similarity, not proven semantic redundancy."` The suggestion cautions: `"Check whether this test exercises a distinct edge case or boundary condition before consolidating. Do not treat syntactic clone similarity as proof of semantic redundancy or delete cases."` Signed boundary numbers (`0` vs `-1`) normalize consistently to `_NUM_` while distinct tokens retain structural similarity. Verbatim identical tests retain `"identical execution tokens"`. | CODE_SETTLED |
| **T3-4**: Keep other language behavior unchanged except reviewed shared contract compatibility | Dart parsing (`pkg/parser/dart/`), TypeScript rules, mobile rules (Kotlin/Swift), and core reporter contracts remain untouched. `TestUnit` in `pkg/parser/adapter.go` was extended only with unexported JSON fields `ASTDecl any `json:"-"``, `FileSet any `json:"-"``, and `FileImports map[string]string `json:"-"``, preserving JSON serializations and cross-language models. | CODE_SETTLED |

## 2. Changed Files

### Owned Existing Paths Edited
- `pkg/parser/adapter.go`: Added `ASTDecl any `json:"-"``, `FileSet any `json:"-"``, and `FileImports map[string]string `json:"-"`` to `parser.TestUnit` to carry optional AST declarations and file import mappings without altering JSON schemas.
- `pkg/parser/golang/adapter.go`: Standard library Go language adapter implementing `parser.LanguageAdapter`. Uses `go/parser` and `go/ast` to locate genuine executable test declarations (`Test*`, `Benchmark*`, `Example*`, `Fuzz*`), identify generated Go files (`.pb.go`, `.gen.go`, `// Code generated ... DO NOT EDIT.`), extract function bodies `{ ... }` as `RawBody` (R1), derive testing parameter names for assertion methods (R5), and populate `FileImports` (R7).
- `pkg/parser/golang/adapter_test.go`: Unit tests for `Adapter.ID`, `FileExtensions`, `IsGenerated`, and `LocateTests` covering executable vs quoted functions, TestMain and helper exclusions (R4), aliased imports, renamed testing parameters and constructor exclusions (R5), and malformed source error propagation.
- `pkg/rules/golang/rules.go`: Refactored `DomainPurityRule`, `PortMockingRule`, and `TableDuplicateRule` to inspect typed AST nodes via `getUnitAST` and `getNodeLineAndColumn`. Resolved R3 (DAO root-relative directory and suffix exemptions), R6 (defensible struct row table recognition without false positives on scalar slices or nested non-table payloads; short row duplicate detection), and R7 (import context alias tracking and local receiver discrimination).
- `pkg/rules/golang/rules_test.go`: Added positive and negative controls for all three rules, confirming that quoted patterns in string literals and comments produce 0 violations, executable bad calls trigger at exact source lines, DAO and repository exemptions function for root-relative and nested paths, aliased imports trigger, local receiver methods are ignored, and distinct boundary-valued table rows are preserved.
- `pkg/detectors/clone/hasher.go`: Token-aware lexing discarding comments while preserving string and number literal contents verbatim. Derives execution body from function block `{ ... }` (R1). Distinguishes verbatim token duplicates from literal-normalized clones (R2). Resolves signed boundary similarity (`Calc(0)` vs `Calc(-1)`).
- `pkg/detectors/clone/hasher_test.go`: Added unit tests verifying distinct boundary values (`0` vs `-1`), whitespace inside strings (`"a  b"` vs `"a b"`), differing comments, function header extraction, and non-Go Dart tests.
- `pkg/engine/engine.go`: Registered `goAdapter *goparseradapter.Adapter` in `Engine` and delegated Go file test extraction to `e.goAdapter.LocateTests(content, file)`. Removed redundant regex and engine-local AST extraction helpers.
- `pkg/engine/engine_test.go`: Added `TestEngineGoQuotedVsExecutableRules` and `TestEngineGoTestMainAndDAOExemption` end-to-end regression tests verifying that quoted patterns emit 0 violations, executable bad directories emit correct rules at exact lines, `pkg/rules/golang/rules_test.go` directly yields 0 false positives for GUARD-GO-02 and GUARD-GO-03, TestMain-only files produce empty scope, and root-relative DAO files are exempted.

### Untouched Paths (Protected Invariants)
- `cmd/testguard/` and `pkg/reporter/` (T2 owned for C1-C3).
- `README.md`, `QUICKSTART.md`, `ARCHITECTURE.md`, `CHANGELOG.md` (T8 owned).
- Version literal in `cmd/testguard/main.go` remains untouched.
- Other language adapters and rules (`pkg/parser/dart/`, `pkg/rules/dart/`, `pkg/rules/typescript/`, `pkg/rules/mobile/`).

## 3. Review Remediation Ledger (R1–R7)

| Item | Finding | Root Cause | Implemented Correction |
|---|---|---|---|
| **R1** | Go clone consumer: declaration names prevent real Go clone matches | `RawBody` previously included `func TestName(...) { ... }`, so different test names caused identical bodies to hash differently. | `adapter.go` extracts the block statement body `{ ... }` as `RawBody`; `hasher.go` includes `getCloneExecutionBody` to peel function declaration headers when present. Tested in `hasher_test.go` (`TestDetectExactClones_FunctionHeaderExtracted`). |
| **R2** | Clone exactness was not token exactness; literal whitespace produced false identity claim | `isExact` previously used `whitespaceRegex.ReplaceAllString` across the whole raw body, collapsing whitespace inside string literals (`"a  b"` matched `"a b"`). Comments were also retained in hashing. | Implemented `tokenizeCode` in `hasher.go` which discards comments, preserves string/number literal contents verbatim, and compares token streams in `isExactTokens`. Replaced "AST structure" with "normalized token structure" in GUARD-UNIV-02 message. Tested in `hasher_test.go` (`TestDetectExactClones_WhitespaceInsideStringsNotExact` and `TestDetectExactClones_CommentsDifferExact`). |
| **Signed Boundary Control** | `Calc(0)` vs `Calc(-1)` produced 0 advisories | `numberLiteralRegex` did not include unary minus sign, leaving `_NUM_` vs `-_NUM_`. | `tokenizeCode` recognizes unary signed numbers in expression context; both normalize to `_NUM_`, hash together, and evaluate as structurally similar, preserving the advisory without claiming semantic redundancy. Tested in `hasher_test.go` (`TestDetectExactClones_DistinctBoundaryValuesMessage`). |
| **R3** | DAO/db/store root-relative exemption failure | Stripping leading slash without adding root prefix prevented `dao/...`, `db/...`, `store/...` from matching `/dao/`, `/db/`, `/store/`. | `isRepositoryOrInfraLayer` normalizes `normalized := "/" + strings.ToLower(strings.TrimPrefix(filepath.ToSlash(filePath), "/"))` and checks segment-delimited paths (`/repository/`, `/infrastructure/`, `/database/`, `/db/`, `/dao/`, `/store/`) plus deliberate suffixes (`_repository_test.go`, `_repo_test.go`, `_dao_test.go`, `_store_test.go`). Tested root-relative and nested DAO/DB/store paths in `rules_test.go` and `engine_test.go`. Service files with incidental names (`service/repository_client_test.go`) remain non-exempt. |
| **R4** | Name-only discovery counted helper declarations and TestMain as tests | `isGoTestFunc` only checked name prefix and receiver absence; byte-to-rune indexing broke for multibyte lowercase Unicode. | `isGoTestFunc` in `adapter.go` enforces: receiver nil, body nonnil, no type parameters, no return values, excludes `TestMain`, validates first suffix rune using `utf8.DecodeRuneInString`, checks parameter types (`*testing.T`, `*testing.B`, `*testing.F`, or aliased testing package), and 0 params for `Example`. Tested in `adapter_test.go` and `engine_test.go`. |
| **R5** | Assertion detection flagged renamed testing parameters as zero-assertion blockers | Assertions were checked only against literal identifiers `t`, `b`, or `f`; constructors like `assert.New(t)` were counted as assertions. | `findExecutableAssertions` derives the testing receiver parameter name dynamically from `fn.Type.Params`; excludes constructors (`methodName == "New"`); recognizes assertion methods on testing receiver, assertion packages, and instantiated assertion receivers. Tested in `adapter_test.go`. |
| **R6** | Table recognition treated scalar fixture slices as duplicate test rows | Array/slice check accepted any identifier element type (`[]string{"repeat", "repeat"}`) and non-array composite literals; arbitrary length threshold skipped `{0}`. | `isTableComposite` in `rules.go` requires array/slice type, rejects primitive scalar types (`string`, `int`, etc.), requires every element to be a struct row literal (`*ast.CompositeLit` or `&CompositeLit`), removes character-length proxy so short `{0}` duplicate rows are detected, and isolates duplicate checks per table literal. Tested in `rules_test.go`. |
| **R7** | Package spelling mistaken for package identity; aliased imports ignored | Rule checks matched hardcoded identifier strings (`sqlmock`, `gomock`) without checking file imports. | `adapter.go` populates `unit.FileImports` mapping aliases to canonical import paths; `rules.go` checks `unit.FileImports` to resolve aliases (e.g. `dbmock "github.com/DATA-DOG/go-sqlmock"` triggers GUARD-GO-02) and ignores unrelated local receivers named `sqlmock` in files where the mock library is not imported. Tested in `rules_test.go`. |

## 4. Verification Commands for Orchestrator

In accordance with assignment instructions, mid-flight test and build commands were withheld. The orchestrator may execute the following commands after freeze:

```bash
# 1. Run unit and engine tests across affected packages
rtk proxy go test ./pkg/parser/... ./pkg/rules/golang ./pkg/detectors/clone ./pkg/engine

# 2. Build fresh testguard binary and verify against pkg/rules/golang/rules_test.go
rtk proxy go build -o /tmp/testguard-t3 ./cmd/testguard
/tmp/testguard-t3 --json pkg/rules/golang/rules_test.go

# Expected CLI outcome:
# - Analysis status is "complete", reason "analyzed", exit code 0
# - Zero false positives for GUARD-GO-02 and GUARD-GO-03 on rules_test.go
```

## 5. Actual Limitations & Non-Goals

- **Interprocedural & Dataflow Boundary**: TestGuard operates as a static AST token and syntax inspector. It does not perform interprocedural analysis or tracing through external helper functions. A helper function in another file or package that constructs mocks or database connections cannot be statically resolved without whole-program compilation.
- **Unresolved / Dynamic Receiver Ambiguity**: When `FileImports` is empty or absent (e.g. synthetic test units), rules fall back to canonical identifier names. In full file scans, import context resolves aliases and rejects unimported receiver identifiers.
- **Example Declarations**: `Example` declarations with zero parameters and valid syntax are recognized as test declarations. The testing framework requires an `// Output:` or `// Unordered output:` comment for runtime output matching, but AST parsing recognizes the entry point statically.

---

# T3 Recovery Report (after Cheap first-corrective quality failure)

- **Task**: T3-recovery — close consolidated R2/R4/R5/R6/R7 while preserving R1/R3 closures.
- **Status**: done (edits settled; no runtime SATISFIED claim — freeze verification is parent-owned).
- **Supersedes**: the earlier R1/R2/R4/R5/R6/R7 rows above where they describe `getCloneExecutionBody`, name-only signature checks, literal assertion-method matching, scalar-only table rejection, and `filepath.Base` import naming. Those descriptions are obsolete; this section is authoritative for the current tree.

## 1. Acceptance Criteria

| Criterion | Settlement | State |
|---|---|---|
| **T3-1** (unaliased go-sqlmock regression; aliases retain precision) | `resolveImports`/`importLocalName` now bind unaliased imports to the declared package identifier for known supported paths (`github.com/DATA-DOG/go-sqlmock` → `sqlmock`), versioned suffixes (`.../pgxmock/v3`, generic `/vN`), and keep explicit aliases exact. `TestEngineGoQuotedVsExecutableRules` is unchanged: `sqlmock.New()` at line 8 must produce GUARD-GO-02 there. Explicit control for declared-name resolution in `adapter_test.go`; unaliased consumer control in `rules_test.go`; alias control retained. | CODE_SETTLED |
| **T3-2** (clone exactness is lexical, language-aware, never conflates operators/ASI/literal bytes) | Clone bodies are lexed with `go/scanner` for `.go` files and a conservative language-neutral lexer elsewhere. The generic lexer recognises multi-character operators (`++`, `--`, `=>`, `?.`, `??`, …) and records line breaks as newline tokens, so `a + ++b` vs `a++ + b` and `return\nvalue` vs `return value` never compare exact. Comments are excluded; string/char/raw literals are compared byte-for-byte in the exact branch. Literal-normalized matches remain explicitly structural. Go exactness sees implicit/explicit semicolons; Go has no newline token, so comments never change executable tokens. Signed boundary normalization is spacing-insensitive (`Calc(- 1)` ≡ `Calc(-1)` structurally vs `Calc(0)`) without turning binary subtraction into a sign. | CODE_SETTLED |
| **T3-3** (only real entry points/provenance/runnable examples; only recognized assertion origins) | Test/Benchmark/Fuzz require the testing import actually present (normal, aliased, or dot-imported) and exactly one declared parameter (grouped `a, b *testing.T` counts as two); receivers, bodyless declarations, type parameters, results, TestMain, and lowercase/Unicode-lowercase suffixes are excluded. Examples require an `Output:`/`Unordered output:` marker as the last associated comment; compile-only examples are not analyzed tests. Assertions count only on the function's testing parameter, on a known assertion import, or on a constructor-established receiver (`check := assert.New(t)`), with local shadowing handled; arbitrary `x.Equal(...)`/`err.Error()` no longer count. | CODE_SETTLED |
| **T3-4** (fixtures vs table rows) | Table candidates now require an array/slice whose element type is a defensible struct row type: `struct{...}`, named/local type, package-qualified, pointer, or generic named type. `[][]int{{1},{1}}` and `[]map[string]int` fixtures are rejected; scalar slices still rejected; duplicate short `[]struct{{0},{0}}` rows detected; distinct boundaries and per-literal isolation preserved. Named-row ambiguity is disclosed in code comments. | CODE_SETTLED |
| **T3-5** (remove obsolete body guessing; paired behavior tests + CLI scenarios prepared) | `getCloneExecutionBody` and its first-textual-brace fallback are deleted; clone consumes the adapter's typed body-only `RawBody`. Paired tests added for operator identity, ASI, sign spacing, literal bytes, comments, adapter→clone integration, entry-point provenance, and rule controls. CLI scenarios listed below. No checks were run mid-flight. | CODE_SETTLED |

Preserved closures: R1 (actual adapter body path and DAO/path exemptions) and R3 (segment-aware leading-slash normalization plus deliberate filename suffixes) are unchanged; `TestEngineGoTestMainAndDAOExemption` stays as-is.

## 2. R2/R4/R5/R6/R7 Ledger

| Item | Correction |
|---|---|
| **R2 partial** | `hasher.go` rewritten around language-aware lexing. `tokenizeGoCode` uses `go/scanner` (comments skipped, literals verbatim, semicolons as boundaries). `tokenizeGenericCode` recognises multi-character operators and emits newline tokens. `normalizedTokens` drops newlines and literal values but keeps operator identity; unary signs merge into numeric literals only after an expression boundary. `Check` compares exact tokens including newlines, so exact claims are narrower than before. Dead exported helpers `Normalize`/`HashTokenStream` were removed (no remaining callers). |
| **R4 partial** | `classifyGoTestFunc` uses `resolveImports` provenance and `singleParameterType` (name count, not AST-field count). `isPointerToTestingType` no longer accepts unimported `*testing.T` or bare `*T` without a dot import. `hasRunnableExampleOutput` requires the go-test output marker. |
| **R5 partial** | `findExecutableAssertions` derives the testing receiver from the signature, accepts known assertion imports and constructor-established receivers only, and skips identifiers shadowed by local declarations (`locallyDeclaredNames`). Removed name-only `t`/`b`/`f` and unqualified method-name fallbacks. |
| **R6 partial** | `isStructRowElementType` rejects array/map/chan/func/interface element types; named, qualified, pointer, and generic named types remain accepted with disclosed ambiguity. Length proxy absent; per-table isolation and short-row detection retained. |
| **R7 open** | Canonical import→declared-package-name map plus version-suffix fallback in the adapter; engine unaliased control now resolves `sqlmock`. `isLocallyDeclared` suppresses package interpretation for locally shadowed identifiers in both Go rules. Explicit aliases unchanged. |

## 3. Changed Files (this recovery pass)

- `pkg/parser/golang/adapter.go` — import provenance, canonical package naming, signature/provenance checks, runnable examples, assertion origins, local shadow set.
- `pkg/parser/golang/adapter_test.go` — declared-name resolution, provenance (plain/bare/dot), grouped parameters and bodyless declarations, runnable examples, assertion origins.
- `pkg/detectors/clone/hasher.go` — language-aware lexers, exact/structural separation, signed-boundary normalization, removal of textual body guessing and dead exports.
- `pkg/detectors/clone/hasher_test.go` — adapter→clone exact/structural integration, Dart increment, JS ASI, sign spacing, raw/escaped literals, Go comment equality, structural control.
- `pkg/rules/golang/rules.go` — struct row element typing and local-shadow rejection for both rules.
- `pkg/rules/golang/rules_test.go` — nested array/map fixture controls, named-row ambiguity, unaliased import consumer, local shadow controls.
- `pkg/engine/engine_test.go` — progress fixtures made valid Go tests; entry-point provenance end-to-end counts; identical-body clone across differently named Go tests.

No CLI, reporter, Dart, docs, version, or CI files were edited in this pass.

## 4. Verification Commands for Parent (not run here)

```bash
# Unit + engine verification
rtk proxy go test ./pkg/parser/... ./pkg/rules/golang ./pkg/detectors/clone ./pkg/engine

# Fresh CLI binary
rtk proxy go build -o /tmp/testguard-t3 ./cmd/testguard

# 1. Original fixture: complete, exit 0, zero GUARD-GO-02 / GUARD-GO-03
/tmp/testguard-t3 --json pkg/rules/golang/rules_test.go

# 2. Unaliased go-sqlmock executable control (GUARD-GO-02 at line 4)
d=$(mktemp -d); mkdir -p "$d/service"; cat > "$d/service/order_test.go" <<'GO'
package service_test
import (
	"testing"
	"github.com/DATA-DOG/go-sqlmock"
)
func TestOrder(t *testing.T) {
	db, _, _ := sqlmock.New()
	_ = db
	t.Fatal("fail")
}
GO
/tmp/testguard-t3 --json "$d/service/order_test.go"

# 3. Explicit alias control (GUARD-GO-02 at line 4)
d=$(mktemp -d); mkdir -p "$d/service"; cat > "$d/service/order_test.go" <<'GO'
package service_test
import (
	"testing"
	dbmock "github.com/DATA-DOG/go-sqlmock"
)
func TestOrder(t *testing.T) {
	db, _, _ := dbmock.New()
	_ = db
	t.Fatal("fail")
}
GO
/tmp/testguard-t3 --json "$d/service/order_test.go"

# 4. Name-substring service path stays non-exempt (GUARD-GO-02 expected)
/tmp/testguard-t3 --json "$d/service/repository_client_test.go"  # copy fixture 2 first

# 5. Root-relative DAO path exempt (no GUARD-GO-02)
d=$(mktemp -d); mkdir -p "$d/dao"; cp <fixture-2> "$d/dao/order_dao_test.go"
/tmp/testguard-t3 --json "$d"

# 6. Clone across differently named Go tests (one GUARD-UNIV-01 identical-execution advisory)
d=$(mktemp -d); cat > "$d/service_test.go" <<'GO'
package service
import "testing"
func TestAlpha(t *testing.T) {
	x := 42
	if x != 42 { t.Fatal("fail") }
}
func TestBeta(t *testing.T) {
	x := 42
	if x != 42 { t.Fatal("fail") }
}
GO
/tmp/testguard-t3 --json "$d"

# 7. Non-runnable example is empty scope; runnable example is analyzed
d=$(mktemp -d); cat > "$d/example_test.go" <<'GO'
package sample
func ExampleCompileOnly() { }
GO
/tmp/testguard-t3 --json --allow-empty "$d"   # not_applicable, 0 tests, exit 3
```

Expected: command 1 complete/exit 0 with zero GO-02/GO-03; 2 and 3 emit GUARD-GO-02 at the constructor line; 4 emits GUARD-GO-02; 5 emits none; 6 emits one identical-execution GUARD-UNIV-01; 7 reports 0 analyzed tests. Exact JSON counts must be read from the frozen run, not assumed.

## 5. Cases and Limitations (explicit)

- **Lexical, not semantic**: exact clone equality means identical lexical tokens for that language, not semantic equivalence. Non-Go lexing is a conservative tokenizer, not a parser; unsupported syntax may split into more tokens, which can only reduce exact/structural matches, never merge distinct operator or literal bytes.
- **Go scanner boundary**: Go exactness includes automatically inserted semicolons, so reformatting that changes statement boundaries may downgrade an exact claim to structural (conservative false negative, never a false exact claim).
- **Import identity is a fixed supported map**: known canonical paths (sqlmock, pgxmock variants, gomock, gorm, testify assert/require, matryer/is) plus a last-segment/version-suffix fallback. Packages whose declared name differs from the path base and are not in the map remain unresolved; explicit aliases are always exact.
- **Shadowing is declaration-context, not scope resolution**: any local `:=`/`var`/range declaration of a package identifier suppresses that package interpretation in the function (and nested closures). This can suppress, never invent, a finding (also disclosed in code comments).
- **Assertions**: helper-mediated/dynamically resolved receivers, and dot-imported assertion packages, are not recognized. Constructors alone (`assert.New(t)`) still do not establish an assertion.
- **Entry points**: `TestMain`, receivers, bodyless declarations, grouped parameters, results, type parameters, unimported testing, and compile-only examples are excluded. Unnamed single parameters count as one parameter but yield no assertion receiver.
- **Tables**: named element types are accepted syntactically; a named non-struct slice could still be analyzed as a table (advisory severity only). No type checker/dataflow was added.
- **Examples** (superseded by the second-corrective section below): runnability now follows `go/doc.Examples` output-group semantics, not a hand-rolled marker scan.
- **Contracts preserved**: `TestUnit` JSON shape unchanged (`ASTDecl`, `FileSet`, `FileImports` remain `json:"-"`); Dart adapter behavior untouched; `parser.FindMatchingBrace` retained for Dart/engine use.

---

# T3 Recovery Report — second corrective (RR2/RR4/RR5/RR7)

- **Task**: consolidated corrective after the recovered-source review (`task-3-review.md` "Recovered frozen-source verdict", input SHA-256 `ca7a921a490b9c393af7e5e576d826412c164e3ab3a3bdda3ffe15843c4b912d`).
- **Status**: done (edits settled). No runtime SATISFIED claim and no green-alone PASS claim; freeze verification is parent-owned.
- **Scope**: closes the four residuals only. R1, R3, R6, and the known-canonical-import part of R7 are not reopened. No CLI/reporter/Dart/docs/CI/version edits.

## 1. Residual corrections

### RR2 — block-comment line terminators survive for newline-sensitive languages
`tokenizeGenericCode` (`pkg/detectors/clone/hasher.go`) now emits a `tokNewline` token for every line terminator encountered inside a block comment, at the comment's position. Line terminators inside comments therefore participate in automatic semicolon insertion comparison. Normalization still drops newline tokens, so `return /*\n*/ value;` and `return value;` share a structural hash but are never exact; a single-line `/* inline */` comment still yields an exact match. Go keeps `go/scanner` and is unaffected.

### RR4 — runnable examples use the standard library's example semantics
The hand-written last-comment parser is deleted. `runnableExamples` (`pkg/parser/golang/adapter.go`) calls `go/doc.Examples(fileAST)` and treats an example as runnable when `Output != ""` or `EmptyOutput` — the exact rule `go test` applies to the final in-body comment group. Multiline output, empty output (`// Output:`), and unordered output count; a documentation-only `// Output:` marker does not, because function documentation is not the output oracle. No custom examples grammar remains.

### RR5 — assertion receivers are bound by declaration identity
`singleParameterType` now returns the parameter's `*ast.Object`, and `findExecutableAssertions` keys constructor-established receivers by `lhs.Obj` and compares call receivers by `receiver.Obj`. The same spelling in a disjoint scope is a different lexical object, so an inner `check := assert.New(t)` (unused) no longer marks an outer `check := errors.New("boom"); check.Error()` as an assertion; the zero-assertion blocker is retained. Direct testing-parameter receivers, renamed parameters, package assertion calls, and real constructor receivers (`check.Equal`, `check.NoError`) remain recognized. Package-qualified calls additionally require `receiver.Obj == nil`, so a locally bound identifier is not read as an import.

### RR7 — package-vs-local provenance decided at the selector occurrence
`isLocallyDeclared` (whole-function spelling search) is deleted. Both Go rules now call `isLocalReceiver(ident)`, which is `ident.Obj != nil` — the lexical binding recorded by `go/parser`. A later disjoint block shadow no longer suppresses an earlier genuine `sqlmock.New()`/`gomock.NewController(t)`; only selector occurrences actually bound to the shadow are skipped. No package loader, compiler, or dataflow was added. The original engine `GUARD-GO-02` line 8 control is unchanged.

## 2. Behavior controls added (non-vacuous)

| Control | Assertion |
|---|---|
| `TestDetectExactClones_JavaScriptBlockCommentNewlineNotExact` | exactly 1 advisory, message must NOT contain "identical execution tokens", must contain the structural caveat |
| `TestDetectExactClones_JavaScriptInlineBlockCommentStillExact` | exactly 1 advisory with "identical execution tokens" (single-line comment harmless) |
| `TestGoAdapterLocateTestsRequiresRunnableExamples` | exactly 4 runnable units; multiline/empty/unordered included by name; no-output and documentation-only excluded by name |
| `TestGoAdapterLocateTestsAssertionReceiverDeclarationIdentity` | disjoint-scope unit has 0 assertions; bound-receiver unit has `Equal` and `NoError` |
| `TestEngineGoAssertionReceiverScopeIsolation` | exactly 1 finding, `GUARD-UNIV-ZERO` blocker, blocker_count 1, exit 1 |
| `TestEngineGoRunnableExamplesOnly` | runnable-example-only dir: 2 analyzed tests, complete/exit 0; documentation-only dir: 0 analyzed tests, incomplete/empty_scope/exit 2 |
| `TestPortMockingRule_RealPackageCallSurvivesLaterShadow` | exactly 1 `GUARD-GO-02` at the genuine call line 21; inner shadowed call suppressed |
| `TestDomainPurityRule_RealPackageCallSurvivesLaterShadow` | exactly 1 `GUARD-GO-01` at the genuine call line 11; inner shadowed call suppressed |
| `TestEngineGoUnaliasedPackageCallBeforeLocalShadow` | exactly 1 `GUARD-GO-02` at line 8 with the canonical unaliased import; inner shadowed call produces no second finding |

Existing controls retained: standalone constructor has 0 assertions; unrelated `now.Equal`/`err.Error` have 0 assertions; `check := assert.New(t); check.Equal(...)` is an assertion; local-receiver-only units produce 0 rule findings; renamed testing parameter is an assertion; nested array/map fixtures produce no table advisory.

## 3. Changed files (second corrective)

- `pkg/parser/golang/adapter.go` — `go/doc` example semantics; parameter and constructor receiver binding via `ast.Object`; package-qualifier check via `Obj`; deleted custom example and whole-function shadow helpers.
- `pkg/parser/golang/adapter_test.go` — expanded runnable-example matrix; declaration-identity receiver control.
- `pkg/rules/golang/rules.go` — `isLocalReceiver` (lexical binding at selector occurrence) replaces whole-function spelling search.
- `pkg/rules/golang/rules_test.go` — genuine-call-before-shadow controls for port and domain rules.
- `pkg/detectors/clone/hasher.go` — block-comment line terminators preserved for generic languages.
- `pkg/detectors/clone/hasher_test.go` — JS comment-carried ASI control and inline-comment exactness control.
- `pkg/engine/engine_test.go` — example-count/empty-scope, zero-assert scope isolation, and unaliased line-8-before-shadow end-to-end controls.

## 4. Parent verification (not run in this pass)

```bash
rtk proxy go test ./pkg/parser/... ./pkg/rules/golang ./pkg/detectors/clone ./pkg/engine
rtk proxy go build -o /tmp/testguard-t3 ./cmd/testguard
/tmp/testguard-t3 --json pkg/rules/golang/rules_test.go            # complete, exit 0, GO-02/GO-03 = 0

# Unaliased genuine call at line 8 with a later disjoint shadow
d=$(mktemp -d); mkdir -p "$d/service"; cat > "$d/service/shadow_test.go" <<'GO'
package service_test

import (
	"testing"
	"github.com/DATA-DOG/go-sqlmock"
)

func TestPackageCallBeforeShadow(t *testing.T) {
	db, mock, err := sqlmock.New()
	_ = db
	_ = mock
	_ = err
	{
		sqlmock := newFakeScope()
		res := sqlmock.New()
		_ = res
	}
	t.Fatal("control")
}
GO
/tmp/testguard-t3 --json "$d/service/shadow_test.go"                # exactly one GUARD-GO-02 at line 8

# Example-only files
d=$(mktemp -d); cat > "$d/example_test.go" <<'GO'
package sample

import "fmt"

func ExampleMultiline() {
	fmt.Println("one")
	fmt.Println("two")
	// Output:
	// one
	// two
}
GO
/tmp/testguard-t3 --json "$d"                                        # 1 analyzed test, complete, exit 0

d=$(mktemp -d); cat > "$d/example_test.go" <<'GO'
package sample

import "fmt"

// Output: documented
func ExampleDocumented() {
	fmt.Println("compile only")
}
GO
/tmp/testguard-t3 --json "$d"                                        # 0 analyzed tests, empty_scope, exit 2
```

The JS comment-ASI and receiver-scope controls are unit-level (`pkg/detectors/clone`, `pkg/parser/golang`, `pkg/engine`); there is no supported JS CLI discovery path claim here.

## 5. Updated limitations

- **Lexical binding, not a type checker**: `ast.Ident.Obj` is `go/parser`'s file-local resolution. A same-file top-level object that shares a spelling with an import name can make a genuine package qualifier look locally bound (false negative); uses resolved in another file are unresolved (`Obj == nil`) and are treated as package candidates. This bounds precision without inventing findings.
- **Nested closures**: receiver identity follows parser scopes, so a closure parameter/var shadow is distinguished from the outer object; dynamically dispatched receivers remain unsupported.
- **Examples**: semantics now come from `go/doc.Examples`; examples with malformed names or invalid signatures remain excluded by `classifyGoTestFunc` (stricter than raw `go/doc`).
- **Comments**: block-comment line terminators are preserved conservatively for all non-Go languages, so reformatting that adds a comment line terminator can downgrade an exact claim to structural, never the reverse.
- No population-wide precision, universal clone semantics, or all-language path claim.

## 6. Corrected test-source position oracle

- `pkg/engine/engine_test.go`, `TestEngineGoUnaliasedPackageCallBeforeLocalShadow`: corrected the expected `GUARD-GO-02` line and failure context from 8 to 9. In the raw Go fixture, `package service_test` is line 1, `func TestPackageCallBeforeShadow` is line 8, and the genuine `sqlmock.New()` package call is line 9. The finding at line 9 is the source-position contract; expecting line 8 was an incorrect test oracle.
- Preserved the assertion for exactly one `GUARD-GO-02`; left the separate `TestEngineGoQuotedVsExecutableRules` line-8 expectation unchanged.
- Verification: no tests/build/gopls/lint/formatter/probes run by this owner. Parent owns verification after settle; no runtime result is claimed.
