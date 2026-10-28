# AI Test Assurance: Local Evidence Contract and Operational Guide

> **Status: Unreleased / Observation-First Checkpoint**  
> This specification documents the local evidence contract, validator CLI, and operational governance for AI-assisted test assurance in `agent-skills-standard` (AGS).  
> **Non-goals / Exclusions:** This document does not claim that runtime tests, CI blocking policies, pilot execution, or production release gates have been activated. All local assurance capabilities currently operate in non-blocking, observation-first mode.  
> **Authoritative Specification:** For formal interface definitions, schemas, and invariants, see the canonical [docs/srs/srs-ai-test-assurance.md](srs/srs-ai-test-assurance.md) (§4–§7).

---

## 1. Executive Summary & Core Distinctions

In the era of AI-generated code and automated test synthesis, superficial test execution metrics (e.g., green checkmarks or tautological assertions) do not guarantee production correctness. The AGS AI Test Assurance framework introduces a verifiable local evidence contract that enforces four critical boundaries:

1. **Document Links vs. Execution Evidence**: Traceability linking a test file to a requirement document does not prove that the test was ever run or passed. AGS trace audits explicitly label linkages as `Linked (document only)` and assign `assurance_kind: "document_links"` with `execution_evidence: "not_evaluated"`. Document-link validity (`ok: true`) confirms structural linkage only, never release assurance.
2. **Static Analysis vs. Dynamic Execution**: Static inspection (via TestGuard `ScanReport`) evaluates code patterns, structure, and assertion antipatterns without running code. Static report ingestion digests an existing report file; the adapter never invokes TestGuard or executes shell commands. A valid static report cannot satisfy dynamic execution or fault demonstration requirements.
3. **Behavioral Fault Demonstration vs. Build/Setup/Timeout Failures**: A test suite only proves fault-detection capability if it passes against the baseline implementation and fails specifically on the intended assertion against a faulty variant. Failures caused by compiler errors (`build_failed`), test harness misconfigurations (`setup_failed`), or execution timeouts (`timeout`) do **not** demonstrate behavioral fault detection and are explicitly excluded from the detection denominator.
4. **Local-Untrusted Verification Limits**: Evidence generated locally carries `trust: "local-untrusted"`. The AGS validator performs rigorous cryptographic digest and snapshot consistency checks. However, local validation cannot prove that runner binaries were uncompromised or that an adversary did not forge both the repository tree and the evidence bundle. Local validation provides tamper-detection for compliant producers, not cryptographic non-repudiation or automated release attestation.

---

## 2. Local Validator CLI & NPM Scripts

AGS provides two standard package scripts in `package.json` for test assurance:

```bash
# Run unit and integration tests for the validator
pnpm test:test-assurance

# Validate an evidence bundle against a repository and current snapshot
pnpm audit:test-assurance --bundle <EVIDENCE_ROOT>/bundle.json --evidence-root <EVIDENCE_ROOT> --repo-root <REPO> --current <CURRENT_JSON> --require <LEVEL> [--json]
```

Under the hood, `pnpm test:test-assurance` executes:
```bash
node --import tsx --test scripts/test-assurance/*.test.ts
```

And `pnpm audit:test-assurance` invokes the validator CLI entrypoint:
```bash
node --import tsx scripts/test-assurance/index.ts --bundle <EVIDENCE_ROOT>/bundle.json --evidence-root <EVIDENCE_ROOT> --repo-root <REPO> --current <CURRENT_JSON> --require <LEVEL> [--json]
```

### CLI Parameters

| Flag | Required | Description |
| --- | --- | --- |
| `--bundle <path>` | Yes | Path to `bundle.json` inside the evidence directory. Must reside under `--evidence-root`. |
| `--evidence-root <path>` | Yes | Explicit root directory containing the bundle and all referenced output artifacts. |
| `--repo-root <path>` | Yes | Explicit repository root directory against which source/test/dependency/config inventories are resolved. |
| `--current <path>` | Yes | Caller-supplied `Snapshot` JSON file describing the expected current repository state. Read once; never extracted from the bundle. |
| `--require <level>` | Yes | Minimum required assurance level: `declared`, `executed`, or `fault`. |
| `--json` | No | Outputs a single machine-readable JSON object followed by a newline to stdout. |

### Exit Code Semantics & Precedence

The validator enforces a deterministic, fail-closed exit code hierarchy:

* **Exit 0 (Success)**: All requested evidence constraints are satisfied, declaration is valid, review (if present) is accepted, and required executions or fault demonstrations are verified. For requests requiring execution evidence (`executed` or `fault`), input inventories must match the current repository state (`freshness: "current"`). For declared-only requests (`--require declared` on bundles with `baseline: null`), freshness evaluates to `"not_applicable"`, confirming valid declaration without claiming execution or freshness assurance.
* **Exit 1 (Stale or Insufficient Evidence)**: Structurally valid evidence that fails to satisfy the requested level, or has fallen out of date. Causes include:
  * Structurally valid input inventory drift (historical source, test, dependency, or config files modified, added, or deleted, including disappearing selected historical roots).
  * Structurally valid current inventory mismatch against the actual readable repository tree.
  * Insufficient evidence for the requested level (e.g. requesting `executed` or `fault` on a declared-only bundle).
  * Recorded human review decision is `rejected`.
* **Exit 2 (Invalid / Malformed / Tampered)**: Catastrophic, structural, or security validation failure. Causes include:
  * Invalid CLI arguments or unrecognized flags.
  * Missing caller-selected `--current` file or unreadable `--repo-root`.
  * Unsafe paths: absolute paths, path traversal segments (`..`, `.`), drive prefixes, backslashes, NUL bytes, or symlinks.
  * Unreadable repository input files or files exceeding size limits (e.g. JSON > 1 MiB, input files > 16 MiB).
  * Missing or tampered captured runner output artifacts (digest mismatch).
  * Malformed schema, unrecognized `schema_version`, or extraneous unknown fields.

> **CRITICAL PRECEDENCE RULE:** **Invalid conditions strictly take precedence over stale conditions.** If a bundle has both staleness (e.g., a modified source file) and an invalid condition (e.g., an unreadable artifact or path traversal), the validator **must exit 2**, never exit 1.

### Output JSON Shape

When invoked with `--json`, the validator outputs exactly one JSON object:

```json
{
  "schema_version": 1,
  "trust": "local-untrusted",
  "requested": "executed",
  "satisfied": true,
  "declaration": "valid",
  "static": "not_applicable",
  "execution": "passed",
  "fault": "absent",
  "freshness": "current",
  "review": "accepted",
  "issues": [],
  "exit_code": 0
}
```

---

## 3. Minimal Local Evidence Contract (`bundle.json`)

An evidence bundle is rooted at a single `bundle.json` file inside an evidence directory. All referenced execution outputs and manifests are stored as relative regular files beneath that evidence root.

### Core Schema Overview

For complete TypeScript type definitions, see [SRS §4.1–4.3](srs/srs-ai-test-assurance.md#4-minimal-ags-local-evidence-contract-t4t5). The bundle envelope contains:

* `schema_version`: Must equal `1`.
* `trust`: Must equal `"local-untrusted"`.
* `intent`: Human Test Intent Record defining requirements, ownership, and independent oracle.
* `baseline`: Execution receipt for the correct baseline tree (or `null` for declared-only).
* `challenge`: Fault execution receipt and adjudication (or `null`).
* `static_report`: Artifact reference to a TestGuard `ScanReport` (or `null`).
* `review`: Recorded human review decision (`accepted` or `rejected`, or `null`).

### Test Intent Record & Independent Oracle Policy

The `Intent` structure binds the test to human requirements and independently verified behavior:

```ts
type Artifact = { path: string; sha256: string };

type Intent = {
  id: string;
  requirements: string[];
  owner: string;
  contract: string;
  fault: string;
  layer: "unit" | "integration" | "contract" | "e2e";
  cases: string[];
  command: string;
  oracle: {
    ref: Artifact;
    basis: "approved_requirement" | "external_specification" | "independently_reviewed_example";
    owner: string;
    rationale: string;
  };
  boundaries: {
    real: string[];
    mocked: string[];
    justification: string;
  };
};
```

#### Independent Oracle Policy and Automated Validation Limits
Copying expected test outcomes solely from implementation output (e.g. running an AI generator, capturing its stdout/snapshots, and asserting whatever was produced) is **prohibited by human review policy**. An oracle must cite an independent requirement, external specification, or independently reviewed fixture (`oracle.ref`), along with a stated rationale and human owner.

**Validator Limitation:** Structural validation verifies field presence, file regular-file status, and cryptographic digests; **the validator cannot detect semantic copying or authenticate an oracle owner**. Human review remains strictly required to evaluate semantic independence and verify that the cited oracle basis is legitimate before evidence can be accepted.

### Snapshot Identity & Four Disjoint Input Groups

A `Snapshot` binds the exact file inventory of the repository at execution time across four disjoint, mutually exclusive input groups:

```ts
type Snapshot = {
  repository: string; // Logical project identifier
  commit: string;     // 40 or 64 lowercase hex characters
  dirty: boolean;
  inputs: {
    source: InputGroup;
    tests: InputGroup;
    dependencies: InputGroup;
    config: InputGroup;
  };
};

type InputGroup = {
  roots: string[];    // Relative directory or file paths
  files: Artifact[];  // Sorted, unique regular files with raw-byte SHA-256
};
```

1. **`source`**: Production application source code files.
2. **`tests`**: Test files, suites, test fixtures, and mock implementations.
3. **`dependencies`**: Lockfiles (`pnpm-lock.yaml`, `package-lock.json`, `go.sum`), manifests, or explicit checked-in dependency declarations.
4. **`config`**: Build configs, test runner configs (`tsconfig.json`, `jest.config.js`, `vitest.config.ts`), and environment manifests.

#### Snapshot Rules and Inventory Invariants
* Every category (`source`, `tests`, `dependencies`, `config`) must have nonempty `roots` and nonempty `files`.
* **Dependency-free projects**: Projects without external third-party dependencies bind an explicit checked-in dependency declaration stating `none` rather than omitting the category.
* Roots within a group must not overlap; category memberships are strictly disjoint.
* Directory enumeration includes all regular files; hidden ignore rules inside selected roots are forbidden.
* Symlinks are rejected at any path component.
* The caller provides a standalone `current.json`. The validator traverses `--repo-root`, recomputes SHA-256 digests over raw bytes, and compares inventories:
  * Structurally valid inventory drift (historical source, test, dependency, or config files modified, added, or deleted, including a disappearing selected historical input root) produces `freshness: "stale"` (exit 1).
  * Missing caller `--repo-root` prerequisite, missing caller `--current` file, unreadable inputs, unsafe paths, or malformed current snapshots produce `invalid` (exit 2).

### Execution Receipts

An `Execution` object documents a test execution run:

```ts
type Execution = {
  id: string;
  intent_id: string;
  snapshot: Snapshot;
  environment: { os: string; arch: string; runner: string; runner_version: string };
  command: string; // Descriptive data only; NEVER executed by the validator
  outcome: "passed" | "assertion_failed" | "build_failed" | "setup_failed" | "timeout";
  exit_code: number | null;
  duration_ms: number;
  artifacts: Artifact[]; // Captured runner stdout/stderr log files
  failure: null | {
    test: string;
    oracle_ref: string;
    artifact_path: string;
    marker: string;
  };
};
```

* The `command` field is recorded descriptive metadata. The validator **never** executes the command or evaluates receipt scripts.
* `artifacts` must contain at least one captured runner output file stored inside the evidence directory.
* `passed` requires `exit_code: 0` and `failure: null`.
* `assertion_failed` requires a nonzero exit code, nonnull `failure`, and an `artifact_path` naming one of the captured artifacts.

### Fault Challenge & Adjudication

To demonstrate fault-detection effectiveness (mutation testing / challenge verification), the bundle records a `challenge`:

```ts
type Challenge = {
  fault_id: string;
  description: string;
  variant: Artifact; // Points to a strict VariantManifest JSON file
  execution: Execution;
  adjudication: {
    reviewer: string;
    oracle_ref: string;
    artifact_path: string;
    marker: string;
    classification: "intended_assertion" | "unrelated_failure" | "invalid_variant";
  };
};
```

The `variant` points to a strict `VariantManifest`:
```ts
type VariantManifest = {
  schema_version: 1;
  changes: {
    path: string;
    before_sha256: string | null;
    after_sha256: string | null;
  }[];
};
```

#### Behavioral Fault Demonstration Summary
Subject to all canonical invariants defined in [SRS §4.2–§4.3](srs/srs-ai-test-assurance.md#42-snapshot-execution-and-fault-receipt), a fault is classified as **demonstrated** only when:
1. Baseline execution outcome is `passed` (`exit_code: 0`, `failure: null`).
2. Challenge execution outcome is `assertion_failed` (`exit_code != 0`, nonnull `failure`).
3. Execution `intent_id` matches `intent.id`, and baseline `command` equals `intent.command`.
4. Challenge `command`, execution environment (`os`, `arch`, `runner`, `runner_version`), `tests`, `dependencies`, and `config` input groups strictly equal the baseline; challenge tests are frozen, not healed between runs.
5. `VariantManifest.changes` equals the complete source inventory difference: nonempty, sorted lexicographically by unique repository-relative path, affecting only unchanged approved `source` roots, with `before_sha256` and `after_sha256` matching baseline and challenge source inventories respectively; no changes to test, dependency, or config inventories, source-root selections, repository ID, or baseline commit.
6. Adjudication classification is explicitly `intended_assertion`.
7. Reviewer field is a nonempty human identifier.
8. Both failure and adjudication `oracle_ref` match the intent's `oracle.ref.path`.
9. The exact nonempty `marker` string appears verbatim in the referenced captured output artifact, and test/oracle evidence identifies the intended assertion.

If the variant causes a compiler error (`build_failed`), test harness error (`setup_failed`), or timeout (`timeout`), it is **not** a demonstrated behavioral fault. It must be reported as `invalid_variant` or `not_detected` and excluded from fault-detection coverage.

---

## 4. Static Analysis Integration (TestGuard ScanReport Adapter)

AGS supports linking static analysis evidence via TestGuard `ScanReport` files (schema version 1).

### Static Report Constraints
* The adapter reads and digests an existing `ScanReport` file specified by `static_report`.
* The adapter **does not invoke TestGuard** or execute child processes.
* The report is validated for structural consistency:
  * `tool.name` must be `"testguard"`.
  * `schema_version` must be `1`.
  * Array envelopes, missing versions, or corrupted counts fail validation.
  * Incomplete scans (`analysis.status: "incomplete"`) remain incomplete.
  * Authorized empty scopes (`analysis.status: "not_applicable"`) map to `static: "not_applicable"`.
* A valid static report alone **never** satisfies `--require executed` or `--require fault`.

---

## 5. Traceability Boundary: Document Audit vs. Assurance

AGS maintains a traceability command (`pnpm audit:trace` / `scripts/trace/index.ts`). To prevent conflating documentation coverage with test execution:

* Trace output specifies `assurance_kind: "document_links"` and `execution_evidence: "not_evaluated"`.
* Human-readable reports display `Linked (document only)` instead of misleading claims such as `Covered` or `Verified`.
* Missing requirement sources or empty scopes exit `0` for backward compatibility with documentation audits, but clearly state `not_applicable` rather than release assurance.
* The legacy `ok: true` field denotes valid document linkage, not test execution or operational readiness.

---

## 6. Governance, Controlled Adoption & Rollback

### Human Ownership Invariant
Automated tools perform structural validation (checking schemas, file hashes, and substring markers). They do not verify semantic truthfulness, business requirement validity, or legal compliance. Human reviewers must remain explicitly accountable for:
* Oracle rationale and basis review.
* Fault challenge adjudication.
* Final acceptance reviews.

### Observation-First Adoption
All AI test assurance tooling is introduced in **observation mode**:
1. Teams generate intent records and evidence bundles during local development.
2. Reports and metrics are observed without blocking developer workflows or CI builds.
3. Baseline metrics and false-alarm characteristics are measured over a sustained calibration period.

### Blocking Gate Promotion Prerequisites
Adoption is risk-scoped and observation-first; broad whole-repository suite migration is an explicit non-goal. Promoting a specific test assurance check to a blocking gate within a selected integration boundary requires:
* Explicit maintainer/owner approval.
* Bounded, empirical calibration evidence gathered over an observation period demonstrating acceptable false-alarm characteristics and documenting known limitations within that boundary.
* Consumer and schema readiness for the specific target integration boundary.

### Rollback Procedures
If a test assurance check misbehaves or introduces pipeline disruption:
* **Immediate Rollback**: Disable the blocking gate configuration or remove the gate check from the CI pipeline.
* **Preserve Evidence & Reports**: Continue generating and archiving evidence bundles and scan reports in observation mode.
* **Maintain Existing Gates**: Standard unit tests, lint checks, and existing release gates must remain active.
* **PROHIBITED ACTION**: Never "fix" a failing assurance check by converting missing or corrupted evidence into synthetic success (e.g. bypassing hash verification or auto-approving unverified bundles).

---

## 7. Quarantine Expiry & Test Removal Review

### Test Quarantine Policy
When a test becomes flaky, unstable, or fails due to an external dependency or pending upstream bug:
1. **Flaky-Triage Routing**: Route the failing test through the existing `quality-engineering-flaky-triage` protocol rather than disabling or deleting assertions ad-hoc.
2. **Quarantine Metadata**: Every quarantined test must record:
   * `owner`: Name of the engineer responsible for remediation.
   * `quarantined_at`: ISO 8601 date of quarantine.
   * `issue_ref`: Link to the tracking defect or issue.
   * `expiry_review`: Planned re-evaluation date.
3. **Human-Owned Expiry Review**: Quarantined tests must be regularly reviewed by their designated human owners. Any specific duration threshold (e.g. 14 days) is an owner-approved team policy, not an automated daemon or alert mechanism. Quarantined tests cannot remain indefinitely dormant without active re-evaluation.

### Test Removal Review
Tests must **never be deleted silently** or removed merely to make a failing suite green. Removing any test requires a documented review verifying:
* The original requirement or user story was formally deprecated, superseded, or obsoleted.
* The oracle reference is updated or retired in documentation.
* Traceability matrices and intent records are updated to reflect the removal.

---

## 8. Sanitized Incident-to-Regression Feedback Loop

Real-world production incidents and defects provide the highest-value test cases. To convert incidents into durable regression assurance without introducing security risks:

```
[ Production Incident ]
          │
          ▼
[ 1. Incident Reproduction ] ──▶ Isolate minimal repro scenario
          │
          ▼
[ 2. Data Sanitization Gate ] ──▶ Strip PII, credentials, tokens, session IDs, internal hostnames
          │
          ▼
[ 3. Test Intent Creation ]   ──▶ Draft Intent record with independent requirement/oracle
          │
          ▼
[ 4. Regression Test & Fault ]──▶ Implement regression test (passes on fix, fails on incident repro)
          │
          ▼
[ 5. Bundle Evidence Commit ] ──▶ Record baseline & fault challenge in bundle.json
```

### Sanitization Gate Requirements
Before any incident artifact, log, or payload is committed as a test fixture or fault variant:
* **PII Removal**: Names, email addresses, phone numbers, IP addresses, and user identifiers must be replaced with synthetic equivalents.
* **Secrets Purge**: API keys, JWTs, OAuth tokens, passwords, and authorization headers must be completely stripped.
* **Infrastructure Anonymization**: Internal server names, database connection strings, and private DNS entries must be replaced with neutral placeholders (e.g. `example.com`, `localhost`).
* **Verification**: A human owner must review and certify that test fixtures contain zero production secrets before committing them to source control.
