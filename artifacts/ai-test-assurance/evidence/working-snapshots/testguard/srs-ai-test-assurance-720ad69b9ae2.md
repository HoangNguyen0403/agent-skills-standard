# Software Requirements Specification: AI Test Assurance

- Slug: `ai-test-assurance`; date: 2026-10-26; owner: T1 technical designer.
- Contract revision: 1; status: ready for independent technical review, not self-approved.
- Authority update: the requester’s “okay start implement the plan” authorizes Subagent-Driven implementation. It does not authorize release, deployment, blocking-policy activation, pilot execution/provider spending, or additional model calls. This supersedes the PRD’s older implementation-pending status without editing its requirement registry.
- Sources: `docs/prd/prd-ai-test-assurance.md`, `.agent/sdd/ai-test-assurance/T1-brief.md`. No separate approved BRD is asserted; preserve PRD `OBJ-01..03`, `REQ-01..08`, and `AC-01..20` IDs.
- Repository status: design publication only. Activation status: not authorized. Independent review must freeze this document’s digest before T2–T6 dispatch.

## 1. Evidence ledger and decision

| Confirmed source | Observed convention / compatibility implication |
| --- | --- |
| TestGuard `cmd/testguard/main.go:55-144`, `pkg/reporter/azure.go:68-75` | JSON is currently a bare violation array; `--json` and `-f json` are equivalent; blocker=1, engine error=2; progress uses stderr. `--output` exports Markdown, not JSON. |
| TestGuard `pkg/engine/engine.go:210-274`, `discovery.go:88-120` | Discovery failures are discarded; read failures count as parse errors; discovered count is not successful-analysis count. `DiffOnly`/`ScanAll` are carried but selection is full traversal. |
| TestGuard `CHANGELOG.md:3-6`, `Makefile:77-84` | SemVer declared; pre-1.0 minor release mechanism exists. Proposed release boundary is **0.2.0**, not a patch release; publication still needs approval. |
| TestGuard `QUICKSTART.md:173`, `ARCHITECTURE.md:12-14`, `.github/workflows/ci.yml` | Known consumers are dashboard JSON example, pipeline-safe stdout promise, reporter tests, CLI/reporters. CI smoke exercises version/rules/explain, not JSON parsing. Scoped search found no checked-in jq field/array consumer. External dashboard consumers remain unknown and require release notes. |
| AGS `scripts/trace/index.ts:18-28,57-105` | Covered is a link heuristic; missing sources currently emit `ok:true`. Existing trace JSON is a document-audit contract, not execution evidence. |
| AGS `scripts/outcome/schema.ts`, `package.json:47-55,119-139` | Plain TypeScript validators, `node:test`, tsx and fs-extra exist; no new schema dependency required. Outcome records remain unchanged, not repurposed as receipts. |
| AGS `scripts/evals/scorer.ts:172-210`, `assertion-parity.test.ts` | Existing primitives: contains, contains_any, not_contains, regex, file_reference. v2 “semantic” matching is token-based, not a semantic judge. CLI/MCP copies are parity-sensitive. |
| AGS `skills/common/common-tdd/references/quality-contract.md:3-15` | Existing intent fields are contract/fault/layer/cases/command; extend this record, do not build a second checklist system. |
| AGS `scripts/generate-indices.ts:315-475` | `skills/` and `.agents/workflows/` are canonical. Native workflow/skill exports, indices and ownership snapshots are generated. Canonical `.agents/workflows/` must never be treated as a disposable mirror. |

Decision: one Go scan envelope, one small local TypeScript evidence validator, no execution service, signing platform, mutation engine, shared scorer change, or new runtime dependency. Hashes bind supplied bytes; they do not prove who executed them, whether execution happened, or whether the supplied scope was sufficient. All v1 receipts and derived assurance remain **local-untrusted**.

## 2. Trace, ownership and verification cards

All cards are status `review`, priority inherited below, owner the numbered worker; orchestrator accountable and independent QE responsible for acceptance. Inputs, outputs and failure behavior are defined in the referenced sections. Security/integrity invariants in §6 apply to every card.

| SRS | Source | Priority / component | Required behavior | Verification / evidence target |
| --- | --- | --- | --- | --- |
| SRS-001 | OBJ-01, REQ-01, AC-01..04 | P0 / T2 scan | Separate completeness from findings; deterministic exit precedence (§3). | VER-001 Go cases + actual CLI; T2 report and scan JSON fixtures. |
| SRS-002 | OBJ-03, REQ-02, AC-05..07 | P1 / T3 syntax | Go syntax distinguishes executable nodes from quoted/comment fixtures; retain true controls and source positions, no semantic-duplicate claim. | VER-002 paired executable/quoted CLI output and focused packages. |
| SRS-003 | OBJ-02, REQ-03, AC-08..09 | P1 / T4 intent | Extend existing intent with independent oracle, accountable owner and honest boundaries (§4). | VER-003 independent review of good/bad intent cases. |
| SRS-004 | OBJ-01..02, REQ-04, AC-10..13 | P0 / T5 evidence | Validate input identities, artifacts and named-fault classification; never upgrade trace/static evidence (§4–5). | VER-004 validator and trace regression cases + real CLI bundles. |
| SRS-005 | OBJ-02, REQ-05, AC-14 | P1 / T4,T7 healing | Green and unchanged assertion text cannot authorize weakened fixtures/selectors/baselines. | VER-005 adversarial guidance review + evaluator-owned healing challenge. |
| SRS-006 | OBJ-02, REQ-06, AC-15..16 | P1 / T6 scorer fixtures | Wrong keyword-rich candidates fail selected assertions; legitimate paraphrases pass; disclose matcher limits. | VER-006 existing scorer invoked directly from node:test (§7). |
| SRS-007 | OBJ-03, REQ-07, AC-17..19 | P1 / T7 pilot | Isolated generation, held-out evaluation, three strata and explicit denominators (§8). | VER-007 evaluator protocol, manifests and output pairs; separate authorization. |
| SRS-008 | OBJ-03, REQ-08, AC-20 | P2 / T8 integration | Migrate consumers, regenerate only approved exports and publish observation-only adoption/rollback. | VER-008 integrated smoke + owner approval record before any blocking activation. |

Functional flow: maintainer selects scan scope → TestGuard analyzes available inputs and retains diagnostics/findings → writes envelope and chooses exit independently of reporter. Maintainer supplies intent, expected current snapshot and receipt → AGS validates bytes and classification → reports separate declaration/static/execution/fault/freshness/review dimensions. Missing/error paths never become assurance success. No event bus, persistence service, retry loop or asynchronous job is introduced.

## 3. TestGuard scan contract (T2)

### 3.1 Exact JSON envelope

`--json` and `-f json` write exactly one UTF-8 JSON object plus newline to stdout, including scan/usage errors when JSON mode is recognizable. No banners, Cobra usage, progress or duplicate errors on stdout. `--json` with `-f azure` is invalid usage; `--json` with default console or explicit json is allowed. Help/version/rules/explain retain their existing non-scan interfaces.

Required shape (TypeScript notation specifies Go JSON tags, not a TypeScript dependency):

```ts
type ScanReport = {
  schema_version: 1;
  tool: { name: "testguard"; version: string; commit: string | null; built_at: string | null };
  scope: {
    requested_paths: string[]; // original CLI values; ["."] when omitted
    effective_mode: "full"; // diff is not implemented
    files: string[]; // sorted unique successfully analyzed files, cwd-relative slash paths
    excluded: { path: string; reason: "default_directory" | "generated" | "non_test" }[];
    unsupported: string[]; // sorted explicit unsupported file targets
    config_applied: false;
  };
  analysis: {
    status: "complete" | "incomplete" | "not_applicable" | "error";
    reason: "analyzed" | "input_failure" | "empty_scope" | "empty_allowed" | "unsupported_scope" | "invalid_usage" | "output_failure";
    discovered_files: number;
    analyzed_files: number;
    analyzed_tests: number;
    failed_files: number;
  };
  findings: Violation[]; // existing violation.go keys/severity values unchanged
  diagnostics: { code: string; path: string | null; message: string }[];
  policy: { blocker_count: number; status: "no_blocker" | "blocker_found" };
  exit_code: 0 | 1 | 2 | 3;
};
```

Empty arrays are `[]`, never null; counts are nonnegative integers; `analyzed_files === scope.files.length`; failed files are unique discovered candidate files that cannot be read/parsed/analyzed, not traversal failures without a known file. `discovered_files` counts supported candidate files before generated exclusion (generated files are excluded, not analyzed). `analyzed_tests` counts located test declarations, **not** synthetic whole-file fallback units. A supported candidate with no located tests may be analyzed for static rules but cannot alone establish nonempty analyzable test scope. No population/test-quality score is added.

`tool.commit`/`built_at` map existing linker variables, with `none`/`unknown` represented as null. Never stamp the current checkout’s revision onto an unrelated binary. T8 records executable SHA-256 externally alongside the report.

Scope policy: directory traversal retains current filename selection and default exclusions (dot directories, node_modules, vendor, build, dist; generated recognition). Record excluded directories/files where encountered; do not enumerate their descendants. Non-test entries inside directory targets are outside selection and need not each be recorded; explicit non-test files are recorded as `non_test`. Explicit files of unsupported extensions go in `unsupported` and make the report incomplete even when other inputs succeed; ordinary source files found within directories do not. Unsupported-only explicit inputs are never authorized emptiness. Root/path/traversal/read/known-parser failures produce diagnostics; continue safe remaining inputs so findings survive. Discovery must not discard a traversal error. A supported parser that reports malformed input makes that file failed. T2 may use Go stdlib syntax validation for error accounting; T3 owns executable-node rule precision. Non-Go heuristic parsers must be named as limited in documentation, not advertised as full syntax validation.

Symlinks are not followed during directory traversal; an explicit symlink target is rejected with an input diagnostic, not silently treated as an analyzed regular file. Overlapping roots deduplicate files. `--all` explicitly selects the same full traversal as default. `--diff`/`-d` fails with error/invalid_usage (exit 2), including combined --all/--diff: do not silently scan full scope. Existing generated `testguard.yaml` is not applied; expose `config_applied:false` and document this rather than implementing config features.

### 3.2 Decision and exit precedence

| Highest applicable condition | analysis.status / reason | Exit | Findings |
| --- | --- | --- | --- |
| Invalid arguments/unsupported diff/output I/O failure | error / invalid_usage or output_failure | 2 | Retain any already collected findings |
| Required traversal/read/parse failure | incomplete / input_failure | 2 | Retain all findings, including blockers |
| Explicit unsupported required file | incomplete / unsupported_scope | 2 | Retain all findings |
| No analyzable test declarations; no failures; --allow-empty absent | incomplete / empty_scope | 2 | Retain findings; cannot be clean |
| Same empty scope, --allow-empty present, no findings | not_applicable / empty_allowed | 3 | [] |
| Empty scope with findings even under --allow-empty | incomplete / empty_scope | 2 | Retain findings |
| Nonempty, complete analysis with blockers | complete / analyzed | 1 | Retain findings |
| Nonempty, complete analysis without blockers | complete / analyzed | 0 | Retain warnings/advisories |

`--allow-empty` is new, default false; it cannot excuse input/unsupported failures. `policy.status` is independent of completeness, computed only from retained findings. Exit 3 means explicitly inapplicable, **not passed**. Console/Azure/Markdown must name analysis status/reason and use this same exit decision; terminal rendering does not own exit policy. Azure emits error annotation on incomplete/error and a summary on not_applicable; it must not emit task-success commands.

Stable diagnostic codes: `invalid_usage`, `target_unreadable`, `traversal_failed`, `read_failed`, `parse_failed`, `unsupported_input`, `empty_scope`, `output_failed`. Unknown/new codes must remain failure diagnostics, not a reason for consumers to assume success. In JSON mode diagnostics live in the object; concise stderr is optional and contains no secrets. If stdout cannot be written, complete JSON is impossible: exit 2 with stderr error; consumers reject missing/truncated JSON. Console Markdown write errors must stop being ignored and produce exit 2. `--output` remains console Markdown export; in JSON/Azure, explicitly supplied --output is invalid usage, not a second report destination.

Illustrative complete report (actual version metadata is supplied by the built executable):

```json
{"schema_version":1,"tool":{"name":"testguard","version":"0.2.0","commit":null,"built_at":null},"scope":{"requested_paths":["sample_test.go"],"effective_mode":"full","files":["sample_test.go"],"excluded":[],"unsupported":[],"config_applied":false},"analysis":{"status":"complete","reason":"analyzed","discovered_files":1,"analyzed_files":1,"analyzed_tests":1,"failed_files":0},"findings":[],"diagnostics":[],"policy":{"blocker_count":0,"status":"no_blocker"},"exit_code":0}
```

Invalid reports: bare `[]`; unknown schema_version; complete with failed_files > 0; complete with zero analyzed_tests; not_applicable with findings/unsupported/failed inputs; blocker_count inconsistent with findings; exit 0 when status is incomplete. T5 rejects these rather than repairing them.

### 3.3 Compatibility cutover

T2 migrates reporter function signatures/tests and every CLI format together. T8 updates QUICKSTART dashboard example to read `.findings`, inspect `.analysis.status` and preserve process exit; updates ARCHITECTURE/README/CHANGELOG and CLI flag documentation. No legacy-array flag, alias or array/object auto-detection. Consumers pin schema_version 1 and the 0.2 release boundary. A release note explicitly calls out exits 2/3, --diff rejection and unapplied config. No unobserved external consumer is claimed migrated. Existing suppression and severity behavior remain unchanged.

## 4. Minimal AGS local evidence contract (T4/T5)

### 4.1 Intent: extend, do not replace

The existing human Test Intent Record adds `id`, `requirements`, `owner`, `oracle`, `boundaries`. T4 preserves contract/fault/layer/cases/command. T5 accepts its JSON representation in a bundle; documentation/table and serialized representation describe the same record, not parallel status systems.

```ts
type Artifact = { path: string; sha256: string };
type Intent = {
  id: string; requirements: string[]; owner: string;
  contract: string; fault: string;
  layer: "unit" | "integration" | "contract" | "e2e";
  cases: string[]; command: string;
  oracle: { ref: Artifact; basis: "approved_requirement" | "external_specification" | "independently_reviewed_example"; owner: string; rationale: string };
  boundaries: { real: string[]; mocked: string[]; justification: string };
};
```

`oracle.ref` is an existing independent requirement/spec/example artifact. Expected output copied solely from implementation is unacceptable. Structural validation verifies fields and file bytes, not semantic independence or the approver’s identity; a human reviewer remains necessary. At least one case and requirement, nonempty owner/ref/rationale/contract/fault/command are required. No score, universal mutation threshold or forced layer inflation.

### 4.2 Snapshot, execution and fault receipt

A bundle is one `bundle.json` under a caller-selected evidence root. All referenced evidence artifacts are regular files beneath that root. Input identities refer to a separately selected repository root. All fields below are required unless explicitly nullable; reject unknown properties and schema versions to avoid silently dropped meaning.

```ts
type Snapshot = {
  repository: string; // caller-approved logical ID, not an ambient remote URL
  commit: string; // 40 or 64 lowercase hex, revision claimed by local producer
  dirty: boolean;
  inputs: {
    source: InputGroup; tests: InputGroup; dependencies: InputGroup; config: InputGroup;
  };
};
type InputGroup = { roots: string[]; files: Artifact[] };
type Execution = {
  id: string; intent_id: string;
  snapshot: Snapshot;
  environment: { os: string; arch: string; runner: string; runner_version: string };
  command: string; // descriptive DATA only, never executed by validator
  outcome: "passed" | "assertion_failed" | "build_failed" | "setup_failed" | "timeout";
  exit_code: number | null;
  duration_ms: number;
  artifacts: Artifact[]; // at least one captured runner output
  failure: null | { test: string; oracle_ref: string; artifact_path: string; marker: string };
};
type Bundle = {
  schema_version: 1; trust: "local-untrusted";
  intent: Intent;
  baseline: Execution | null;
  challenge: null | {
    fault_id: string; description: string;
    variant: Artifact; // evaluator-owned strict VariantManifest JSON, data only
    execution: Execution;
    adjudication: { reviewer: string; oracle_ref: string; artifact_path: string; marker: string; classification: "intended_assertion" | "unrelated_failure" | "invalid_variant" };
  };
  static_report: Artifact | null;
  review: null | { reviewer: string; decision: "accepted" | "rejected"; rationale: string };
};
```

Fault challenge source bytes differ by design: challenge snapshot binds the faulty variant’s complete input inventory, baseline snapshot binds the current correct tree. `variant` references exactly this strict JSON shape:

```ts
type VariantManifest = {
  schema_version: 1;
  changes: { path: string; before_sha256: string | null; after_sha256: string | null }[];
};
```

Reject unknown keys at both object levels and unknown schema versions. `changes` must be nonempty, sorted lexicographically by unique repository-relative source path. Paths obey §6 and belong only to the unchanged approved source roots. Each digest is null or exactly 64 lowercase hexadecimal SHA-256; at least one side is nonnull and the two sides must differ. For each path, `before_sha256` equals its baseline source inventory digest, or null exactly when absent there; `after_sha256` equals its challenge source inventory digest, or null exactly when absent there. The changes list must equal the complete source inventory difference: no omitted or extra changed paths. No changes to test/config/dependency inventories, source-root selections, repository ID or baseline commit are permitted in the challenge. All other source files match. This manifest is not an executable patch. Challenge source artifacts and inventories remain local claims; the validator checks consistency, not actual execution of a variant.

`Snapshot.inputs.*.roots` are caller-reviewed, repository-relative directories or files. `files` is their exact, sorted, unique regular-file inventory with raw-byte SHA-256. Directory enumeration includes additions and deletions; no hidden ignore rules inside selected roots. Reject overlapping roots within a group, symlinks and duplicate inventory paths. Category membership is disjoint. Source/tests/dependencies/config each have nonempty roots/files; dependency-free projects bind an explicit checked-in dependency declaration stating none rather than omit the category. Lockfiles, relevant manifests, runner configuration and fixtures must be included. Sufficiency of selected roots is a review obligation, not something hashes prove.

Caller supplies an independent `current.json` Snapshot, not one extracted from the bundle, plus `--repo-root`. Validator recomputes inventories/digests against that tree, checks exact inventory equality and matches baseline snapshot including repository, commit, dirty flag and selected roots. Current commit/dirty values are caller assertions; no Git command or command from receipt is run. A caller forging both snapshots is outside local-untrusted assurance. Dirty snapshots are accepted only when the complete approved root inventories match; dirty boolean alone is insufficient. Relevant source/test/dependency/config modifications, additions or deletions make old baseline evidence stale. A disappearing selected historical file or directory root is historical input drift, not a missing captured evidence artifact. A structurally valid caller current inventory that differs from the actual readable repository tree is also stale (including a missing inventoried input/root); this classification applies even to declared-only requests. Do not try to open absent historical input paths as captured outputs. Missing caller `current.json` or `--repo-root`, malformed current schema, unsafe paths and unreadable inputs are invalid, not stale. No age-based expiry is introduced. Challenge freshness is consistency against baseline plus variant mapping, not equality of faulty bytes to the correct worktree.

### 4.3 Outcome constraints

- passed requires exit_code 0 and failure null. assertion_failed requires nonzero integer exit, nonnull failure and artifact_path naming a captured artifact. build/setup failures require nonzero exit and failure null. Timeout has null exit and failure null. duration_ms is finite/nonnegative.
- Execution intent_id matches intent.id; baseline command equals intent.command. Challenge command/environment/tests/dependencies/config equal baseline; challenge tests are frozen, not healed between runs.
- Fault demonstrated only when baseline passed, challenge assertion_failed, adjudication intended_assertion, reviewer is nonempty, and failure/adjudication oracle_ref match the intent oracle path. The exact nonempty marker must appear in the referenced digest-checked output artifact, and test/oracle evidence must identify the intended assertion. Substring presence is a consistency check; human adjudication supplies meaning and remains untrusted locally.
- Build/setup failure, timeout, passing faulty run, unrelated assertion or invalid variant is **not** a detected behavioral fault. Report invalid challenge or not_detected with reason, never count it as a kill. No automatic retries or equivalence judgment.
- Validly hashed forged output cannot be upgraded to trusted execution. A nonnull review is a recorded local claim, not proof of authorization; it cannot activate a gate.

### 4.4 Examples and negative controls

A minimal valid declared-only bundle has schema_version=1, trust=local-untrusted, a complete Intent with a digest-checked independent oracle, and baseline/challenge/static_report/review all null. It satisfies `--require declared`, not executed/fault. This is the smallest fixture T5 must provide, using actual local artifact bytes and digests rather than illustrative fake hashes.

T5 fixtures must include an executed bundle with matching current snapshot and captured output, and a named-fault bundle satisfying §4.3. Invalid variants are generated by changing one meaningful condition: test digest drift → stale; lockfile/config drift → stale; altered output → invalid; missing output → invalid; null baseline with challenge → invalid; build_failed/timeout challenge → not demonstrated; assertion failure for another oracle → not demonstrated; local-untrusted changed to trusted → invalid. These are schema/validation fixtures, not the held-out pilot faults.

## 5. Validator CLI, adapter and trace boundary

T5 adds `scripts/test-assurance/{types.ts,validate.ts,index.ts,validate.test.ts,index.test.ts}` and `scripts/test-assurance/__fixtures__/` only. Use node builtins and existing fs-extra/tsx, with explicit TypeScript validation as in outcome; do not add a schema framework or modify outcome schema. `types.ts` is authoritative runtime type/field inventory; validation must reject unknown keys and enforce cross-field rules, not rely on TypeScript casts.

```text
node --import tsx scripts/test-assurance/index.ts --bundle EVIDENCE_ROOT/bundle.json --evidence-root EVIDENCE_ROOT --repo-root REPO --current CURRENT_JSON --require declared|executed|fault [--json]
```

`--require` is mandatory. CURRENT_JSON is a caller-selected regular file, read once; it is validated against Snapshot and recomputed repository inputs even for declared requests when executions exist. Declared-only requests still validate the supplied current snapshot. Nothing is written by this command.

Output, one JSON object with newline under --json:

```ts
{
 schema_version: 1,
 trust: "local-untrusted",
 requested: "declared" | "executed" | "fault",
 satisfied: boolean,
 declaration: "valid" | "invalid",
 static: "absent" | "complete" | "incomplete" | "not_applicable" | "invalid",
 execution: "absent" | "passed" | "failed" | "invalid",
 fault: "absent" | "demonstrated" | "not_detected" | "invalid",
 freshness: "not_applicable" | "current" | "stale" | "invalid",
 review: "absent" | "accepted" | "rejected",
 issues: { code: string; path: string; message: string }[],
 exit_code: 0 | 1 | 2
}
```

Exit precedence: invalid arguments/schema, missing caller `current.json` or repository root, unsafe paths, unreadable repository inputs, missing/tampered captured evidence artifacts, or inconsistent reports/outcomes → 2; otherwise historical input inventory drift (modification/addition/deletion, including a disappearing selected historical root), a structurally valid current inventory mismatch with the actual readable tree, insufficient requested evidence or rejected review → 1; otherwise 0. Invalid conditions take precedence when both invalidity and staleness exist. Missing historical source/test/dependency/config inputs are stale inventory differences, never missing-output-artifact errors. Declared requires valid intent; executed additionally current passed baseline; fault additionally demonstrated named fault. Supplied invalid artifacts fail even if not needed by the selected level. A supplied incomplete/static not_applicable report is disclosed, never promoted to execution, and does not itself prevent a separate valid execution/fault requirement. `review:null` does not prevent local validation; downstream required human approval is separate. Stale takes precedence over claims of passed execution/fault and always makes satisfied=false. Human output renders the same dimensions. Error stdout follows the JSON-mode rule from §3; write failure uses stderr/exit 2.

Static adapter: accept only ScanReport schema_version 1 with tool.name=testguard, digest-bound as static_report; validate counts, status/exit/finding invariants. An array/unknown version/inconsistent envelope is invalid, incomplete stays incomplete, authorized empty stays not_applicable. Pin the report file SHA-256 and tool version in the bundle artifact/content; record binary SHA-256 externally in verification report. No TestGuard command is run by the adapter. A static report never satisfies executed/fault.

Trace: preserve existing trace JSON keys/exit semantics as a **document-audit** interface and add `assurance_kind:"document_links"`, `execution_evidence:"not_evaluated"`. Human Covered becomes `Linked (document only)`; other status labels explicitly describe links. No sources remains exit 0 for existing non-assurance audit callers, but output says not_applicable/no requirement sources, not release assurance. Preserve old `ok` as document-audit validity, document this meaning; no generic PASS mapping. Do not overload audit:trace with receipt execution or silently change ID parsing. Requested assurance uses the separate validator; absent document sources/receipts cannot satisfy its required level.

## 6. Bounded validation, NFRs and threat limits

- JSON files at most 1 MiB each; at most 10,000 input files per snapshot, 32 execution artifacts, 1 MiB per captured output/oracle/variant, and 16 MiB per input file. Oversize is explicit invalid evidence, never truncation followed by success. These are v1 local-validator limits, not performance claims.
- T5 review addendum (engineering safety defaults, not measured capacity): at most 128 selected roots, 10,000 regular input files, 20,000 visited filesystem entries (including directories), and depth 64 **in total per snapshot across all groups**. Reject oversized arrays before iteration; charge entry/file budgets before descending/opening the next item and enumerate incrementally. Sorted-prefix overlap checking replaces quadratic root-pair work. Exceeding any bound is invalid/exit 2, never truncation or stale success. These additional bounds require T5's scoped security rereview before acceptance; other report/receipt wire formats remain unchanged.
- Every selected filesystem entry must be a regular file or directory; reject FIFO/device/socket and symlink entries without opening them. Diagnostic text uses fixed schema paths and bounded, safely encoded filesystem names; never reflect unknown property names or control characters. Caller JSON reads receive the same stable pre/post descriptor and path-identity checks as contained artifacts. These clarify existing bounded-input/fail-closed requirements, not execution attestation.
- Evidence paths and input paths are relative slash-separated paths: reject absolute paths, empty segments, `.`/`..`, NUL, drive prefixes, backslashes and symlinks at any component; verify containment beneath the appropriate explicit root. CURRENT_JSON/bundle/root command-line paths are caller-selected; embedded paths cannot select another root. Files must be regular; digests are exactly 64 lowercase hexadecimal SHA-256 over raw bytes. No network reads, URLs, shell interpolation, child commands, artifact script execution or receipt-command evaluation.
- Validate arrays/types/counts before traversal. Missing historical repository inputs/selected roots and structurally valid caller inventory drift are stale/exit 1 under §4.2 and §5; missing caller current.json/repository root, unreadable inputs, unsafe paths, malformed schemas and missing/tampered captured evidence artifacts are invalid/exit 2. Invalid takes precedence over stale; never synthesize defaults. Field strings must be nonempty where identifiers/reasons are required. Unknown version fails closed. Deterministic ordering makes results reproducible; do not claim a latency SLO without measurement.
- No ambient credentials, provider calls or production data. Receipts retain sanitized commands/output only. Owners review for secrets before publication; tools cannot certify absence merely by hashing.
- Evidence is retained in the task/pilot evidence workspace with packets/review results, never in generated skill mirrors. No new retention daemon or cleanup mechanism is in scope.

## 7. Exact task ownership and verification handoff

Commands below are specified for the orchestrator **after the relevant edits freeze**; T1 did not execute them. Parent reports AGS locked install and 19 baseline trace/parity tests plus TestGuard focused packages already passed; this is parent-provided prerequisite evidence, not T1 execution. All shell commands retain rtk prefix. Commands with symbolic roots require packet-bound absolute values, not worker guesses.

| Owner | Exact owned paths / exclusions | Covering commands and observable smoke |
| --- | --- | --- |
| T2 | TestGuard `pkg/engine/{engine.go,discovery.go,engine_test.go,discovery_test.go}`, new `pkg/models/scan_report.go`, existing `pkg/models/violation.go` only if needed; `pkg/reporter/`; `cmd/testguard/main.go`, new `cmd/testguard/main_test.go`. T8 owns docs/version release metadata; T2 may add engine-local Go syntax validation, not a new public parser API. | `rtk proxy go test ./pkg/engine ./pkg/reporter ./cmd/testguard`; `rtk proxy go build -o /tmp/testguard-ai-assurance ./cmd/testguard`; run binary with `--json FIXTURE`, `--json --allow-empty EMPTY`, `--json UNSUPPORTED_FILE`, `--json --diff FIXTURE`, and complete/parse-failed/mixed-blocker fixture directories. Expect table §3 exits 0/1/2/3, preserved findings and parseable object. |
| T3 | TestGuard `pkg/parser/` including new `golang/adapter.go`/`adapter_test.go`; `pkg/rules/golang/`; `pkg/detectors/clone/`; `pkg/engine/engine.go` parser dispatch and its relevant tests only **after T2 settles**. | `rtk proxy go test ./pkg/parser/... ./pkg/rules/golang ./pkg/detectors/clone ./pkg/engine`; rebuilt binary `--json pkg/rules/golang/rules_test.go` plus paired real/quoted controls. Original quoted GUARD-GO-02/03 hits disappear; true controls remain at intended positions. Distinct boundary literals are not declared semantically redundant. |
| T4 | AGS `skills/common/common-tdd/{SKILL.md,references/quality-contract.md}`, `skills/quality-engineering/quality-engineering-test-healing/{SKILL.md,references/verdict-contract.md,references/forbidden-repairs.md}`, `.agents/workflows/test-loop.md`. No eval metadata/mirrors/schema edits; flaky-triage stays unchanged and referenced. | Manual independent walkthrough of implementation-copied oracle, justified real integration boundary, duplicate layers with distinct risk, assertion-preserving fixture/selector weakening, real bug and quarantine routing. T6 supplies executable scorer controls. |
| T5 | AGS `scripts/test-assurance/` files explicitly listed in §5 and fixtures; `scripts/trace/{index.ts,index.test.ts}` plus fixture additions only. No package script/scorer/skill bodies. | `rtk pnpm test:trace`; `rtk proxy node --import tsx --test scripts/test-assurance/*.test.ts`; actual validator command §5 on declared/executed/fault and absent/stale/tampered/build-failed/timeout bundles. Expected levels/dimensions as §4–5. `rtk proxy node --import tsx scripts/trace/index.ts --root TRACE_FIXTURE --json` proves document-only/no-sources labels. |
| T6 | AGS `skills/common/common-tdd/evals/evals.json`, `skills/quality-engineering/quality-engineering-test-healing/evals/evals.json`; new `scripts/evals/test-quality-controls.test.ts` and `scripts/evals/__fixtures__/test-assurance/` candidate transcripts/control matrix. No scorer/types/CLI/MCP matcher changes. | `rtk proxy node --import tsx --test scripts/evals/test-quality-controls.test.ts scripts/evals/assertion-parity.test.ts`; regression imports real `checkAssertion`, evaluates committed candidate transcripts against the same assertions used in eval metadata (not a reimplemented matcher), asserts wrong controls rejected and alternate valid prose accepted. |
| T7-E / G-B / G-C | Separate workspace-relative `protocol/`, `evaluator/`, `results/` for E; only `generated/baseline/` for G-B and `generated/candidate/` for G-C. No evaluator files in either generator filesystem. No production code edits. | Frozen per-case runner argv in evaluator protocol, actual TestGuard command §3, validator command §5; see §8. No pilot execution authorized by this SRS. |
| T8 | AGS `package.json` only add `test:test-assurance` and `audit:test-assurance` scripts invoking §5; `CHANGELOG.md`, new `docs/ai-test-assurance.md`, generated exports below. TestGuard `README.md`, `QUICKSTART.md`, `ARCHITECTURE.md`, `CHANGELOG.md`; `.github/workflows/ci.yml` only observation smoke wiring; `cmd/testguard/main.go` version literal only after T2/T3 settle. No release workflow/tag/install/update changes. | `rtk pnpm test:trace`; `rtk pnpm test:test-assurance`; `rtk pnpm test:evals`; focused Go commands above; actual CLI → captured report → validator smoke, including incomplete/static + stale/fault-invalid cases. New checks remain observation-only, not branch protection or new blocking policy. |

T2 deterministically injects traversal/read failures in engine tests where filesystem permissions cannot reproduce denial. Build RED/GREEN evidence using test-only/pre-fix/final snapshots supplied in reports, not parallel mutation of shared working files. Each report supplies exact fixture paths, binary identity, stdout/stderr/exit and no weakened assertions.

T6 limits: existing regex/negative assertions can reject the **bounded committed controls**, but cannot reliably judge arbitrary semantic correctness. Do not label token matching semantic validation. Use alternate phrasing controls and a keyword-rich incorrect candidate sharing the positive terminology, rejected by an explicit contradictory-decision assertion. If any selected AC cannot be represented safely, stop that AC with a bounded scorer-change proposal for orchestrator ownership; never change the shared matcher under this task or claim all adversarial prose is solved.

### Canonical/generated inventory for T8

Canonical: the T4/T6 `skills/**` files; `.agents/workflows/test-loop.md`; source `scripts/`; this SRS/PRD and `.agent/sdd/ai-test-assurance/` evidence. Generated outputs include `skills/index.json`, category `_INDEX.md`, skills README index, injected AGENTS/router sections, configured native skill/workflow exports and ownership lock snapshots. Current generator reads configuration to choose agents; T8 must enumerate its actual selected outputs in its packet allowlist before generation, rather than assuming every host is installed.

T8 uses `rtk pnpm generate-indices` and `rtk pnpm docs:capabilities` once in a disposable authoring-root worktree after all canonical owners settle, following generator-safety/SDD-preservation skills. Copy back only changed T4 skill members and test-loop native exports, necessary indices/lock snapshots, and capabilities docs if actually changed; no broad agent-directory replacement. Canonical `.agents/workflows/`, `.agent/sdd/`, PRD and SRS are never copy-back targets. No generated skill bodies are hand-edited. Abort copy-back if generator changes/deletes canonical evidence. Independent review checks export parity and preserved evidence digests. Actual host-specific paths are configuration-derived, not permission to widen task ownership.

## 8. Pilot interface and generator-safe partition

Public contract: §3–6 and approved behavior contracts/correct implementations/development examples. Generator-safe excerpt excludes task reports, evaluator protocol details, held-out fault identifiers, variant manifests, expected assertion failures, evaluator outputs and the other arm. This SRS contains **no actual held-out faulty implementation**; it is not itself a generator assignment.

T7-E writes separate `protocol/generator-inputs.json` and `evaluator/cases.json` (both schema_version 1). Generator manifest keys: `arm` (baseline/candidate), `repository`, `correct_snapshot` (Snapshot), `guidance` (Artifact[]), `allowed_inputs` (Artifact[]), `runner`/`runner_version`, `command` (reviewed descriptive focused command), `budget_seconds`, `output_directory`. An orchestrator-created excerpt and all delivered inputs are SHA-256 bound; host records input/access boundaries. Only one arm and no evaluator paths are supplied to a generator. Prompt wording alone is not access control.

Evaluator case keys: `id`, `split` (development/held_out/negative), `stratum` (static/evidence/behavior), `origin` (historical/synthetic), `oracle` (Artifact plus owner), `correct_snapshot`, `fault_variant` (Artifact|null), `expected_failure` (evaluator-only string|null), `command_argv` (reviewed array), `timeout_seconds`, `eligibility_reason`. Freeze protocol/case/guidance/tool/artifact digests before generation. Corpus is the PRD’s proposed 6 development + 6 held-out + 6 legitimate controls, stratified two/two/two; case existence/independent oracles remain T7 prerequisites, not invented evidence.

Generator outputs: tests plus `generation.json` with schema_version=1, arm, generator-input-manifest digest, supplied-input Artifact[], generated-test Artifact[], guidance Artifact[], command string, limitations string[]. Freeze output before held-out access. Correct implementation must pass each arm’s tests before fault scoring; failing baseline suite is invalid, not detection. Leakage or incomplete access manifests invalidate affected comparison; never iterate tests from held-out results.

Only the separately authorized evaluator/orchestrator executes reviewed protocol command_argv with fixed local runner/environment. Validator never executes it. Fault variants are applied only to disposable evaluator copies by reviewed harness logic, never commands read from receipts. Per-case runner commands necessarily freeze when corpus exists; T1 fixes the CLI/validator interfaces, not fictitious pilot test names.

Results rows: case_id, arm, stratum, eligible boolean, invalid_reason nullable, detected boolean, false_alarm boolean, runtime_ms, human_review_minutes, artifact refs. Report eligible denominators separately per arm/stratum; static findings and evidence rejection never count as behavioral fault detection. Executable kill requires §4.3. Use PRD’s proposed 120-second focused run / 30-minute machine time per arm only after explicit approval. Budget exhaustion is inconclusive. PRD go/no-go remains unchanged: zero B false-clean, no lost baseline held-out detections, at least one additional held-out C detection, zero false blocking among controls, within budget. Synthetic-only success does not demonstrate production effectiveness. No corpus/provider spend/runner authorization is inferred from implementation approval.

## 9. Failure analysis, review and ADR

| Failure | Required response / affected owner |
| --- | --- |
| Scan partial with blockers | Exit 2 and retain findings, T2; not blocker-only exit 1. |
| Empty/unsupported confusion | Explicit unsupported input is incomplete even with allow-empty; only genuine authorized empty is exit 3. |
| Receipt stale after dirty/config/dependency changes, historical input/root deletion, or readable-tree/current-inventory mismatch | satisfied=false/exit 1; recollect evidence, T5; never update just hashes to preserve an execution claim. |
| Missing caller current.json/repository root, malformed current schema, unreadable inputs, unsafe paths, or captured evidence artifact missing/tampered | invalid/exit 2, T5; invalid takes precedence over simultaneous staleness; historical input absence alone is not this case. |
| Fault fails compiler/setup or times out | Not demonstrated; exclude with reason from eligible behavioral denominator, T5/T7. |
| Semantic matcher cannot distinguish selected controls | T6 reports bounded gap; orchestrator owns any scorer scope expansion. |
| Generator sees held-out input | Invalidate affected comparison; freeze new independent corpus only with new authorization, T7. |
| Generator changes canonical evidence | Reject generated copy-back, preserve originals, T8. |

ADR-001: break the unversioned TestGuard array at the proposed pre-1.0 minor boundary, version the envelope independently, migrate all known consumers without shims. Preserve document trace as a separately labelled compatible audit and require explicit validator level for execution/fault assurance. Existing dependencies and local-untrusted receipts are sufficient for consistency checking but intentionally insufficient for attestation or rollout approval.

Design walkthrough (not runtime verification): all six PRD scan-table rows map to §3.2; failure+blocker selects 2; allowed empty selects 3; unsupported selects 2 even with allow-empty; document links alone select declared-only at most; source/test/dependency/config drift selects stale; correct-pass/intended-assertion selects named local fault; build/setup/timeout selects not demonstrated. These checks resolve contract interpretations, not implementation acceptance.

## Outcome / next gate

T1 deliverable: design_ready for independent review. No code, build, lint, formatter, test, pilot or deployment was run by T1. Required next gate: independent technical review freezes SRS digest; orchestrator dispatches authorized bounded workers. T7 corpus/oracle/profile/budget approval and eventual release/blocking approval remain separate downstream prerequisites, not blockers to T2–T6 implementation. Runtime acceptance evidence is missing by design. Cost source: unavailable; no token or savings estimate.
