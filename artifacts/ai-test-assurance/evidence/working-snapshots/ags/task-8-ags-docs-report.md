# Task 8 Report: AGS Package Scripts and Test Assurance Documentation Checkpoint

- **Task**: T8 (AGS package and documentation checkpoint)
- **Status**: `done`
- **Owner**: Personal - Cheap AGS integration-docs implementer
- **Plan Reference**: `docs/prd/prd-ai-test-assurance.md` (SHA-256: `5e5216a6126257490315db0cf5bf9c1ced091a16babfb73872691c1c6c888c06`)
- **SRS Reference**: canonical `docs/srs/srs-ai-test-assurance.md` (§4–§7, SHA-256: `670ac1418a6ac3b0b50d6a05cf1dbd72c8d5e54091574df30b0e29199a5c29d5`)
- **Brief**: `.agent/sdd/ai-test-assurance/T8-AGS-docs-brief.md`

---

## 1. Executive Summary & Checkpoint Scope

This checkpoint settles the owned package scripts, changelog entry, and comprehensive technical documentation for AI test assurance within `agent-skills-standard` (AGS). All documentation strictly consumes the frozen contracts from SRS §4–§7 without altering runtime implementation files, dependencies, or root package metadata.

### Owned Paths Changed
1. `package.json`: Added `test:test-assurance` and `audit:test-assurance` script keys invoking the T5 validator CLI. No dependency versions or root package metadata were altered.
2. `CHANGELOG.md`: Added unreleased entry under `## [Unreleased] -> ### Added` documenting the local observation-first checkpoint, validator CLI scripts, contract distinctions, and governance procedures.
3. `docs/ai-test-assurance.md`: Created comprehensive operational guide and local evidence specification.

### Authority and Invariant Compliance
- **No mid-flight test/build/lint runs**: In accordance with the worker brief and orchestrator instruction, no tests, linters, or formatters were executed during editing. Parent orchestrator runs verification after all canonical owners settle.
- **No generated mirror pollution**: Generated skill mirrors (`skills/index.json`, `_INDEX.md`, etc.), CI workflows, PRD/SRS files, and `.agent` ledgers were not edited or regenerated.
- **No premature release or execution claims**: All additions are explicitly documented as unreleased and observation-first; no runtime test success, CI pilot release, or blocking policy activation is claimed.
- **T8 overall completion status**: This bounded documentation/package checkpoint is complete. T8 overall remains incomplete until canonical components settle, indices/mirrors are regenerated via standard tooling, and final integrated verification is executed by the parent.

---

## 2. Acceptance Criteria Verification

### AC-1 (T8-1): Local CLI Commands Wired Without Dependency Edits
- `package.json` scripts added:
  - `"test:test-assurance": "node --import tsx --test scripts/test-assurance/*.test.ts"`
  - `"audit:test-assurance": "node --import tsx scripts/test-assurance/index.ts"`
- Dependencies, devDependencies, pnpm overrides, engines, and package metadata remain untouched.
- Commands adhere strictly to the frozen T5 CLI interface defined in SRS §5:
  ```bash
  node --import tsx scripts/test-assurance/index.ts --bundle <EVIDENCE_ROOT>/bundle.json --evidence-root <EVIDENCE_ROOT> --repo-root <REPO> --current <CURRENT_JSON> --require declared|executed|fault [--json]
  ```

### AC-2 (T8-2): Honest Contract Distinctions & Source Freshness
Documented in `docs/ai-test-assurance.md`:
- **Document Links vs. Execution Evidence**: `audit:trace` is documented as a document-audit interface reporting `assurance_kind: "document_links"` and `execution_evidence: "not_evaluated"`. Links are labeled `Linked (document only)`. Structural trace validity (`ok: true`) does not equal test execution or release assurance.
- **Static vs. Execution**: Static adapter consumes TestGuard `ScanReport` schema_version 1 as `static_report` without running commands. Static reports cannot satisfy `executed` or `fault` levels.
- **Fault Evidence vs. Compile/Setup/Timeout**: Behavioral fault demonstration strictly requires baseline pass, challenge assertion failure on the intended assertion, matching oracle ref, and verified failure marker in captured runner output. Build failures (`build_failed`), setup failures (`setup_failed`), and timeouts (`timeout`) do not demonstrate fault detection and are excluded from the eligible detection denominator.
- **Local-Untrusted Verification Limits**: Local receipts carry `trust: "local-untrusted"`. Local validator performs cryptographic consistency and snapshot checks but cannot prevent dual-snapshot forgery or provide non-repudiation.
- **Snapshot Identity & Staleness vs. Invalidity**: Snapshot inputs enforce four disjoint groups (`source`, `tests`, `dependencies`, `config`). Inventory drift results in `freshness: "stale"` (exit 1). Path traversal, missing current.json/repo root, unreadable inputs, missing/tampered artifacts, or malformed schema produce `invalid` (exit 2). Invalid conditions strictly take precedence over staleness.

### AC-3 (T8-3): Governance, Rollback, Quarantine & Incident Feedback
Documented in `docs/ai-test-assurance.md`:
- **Human Ownership**: Automated tools verify bytes and hashes, not semantic validity. Human review is non-delegable.
- **Observation-First & Rollback**: Rollback disables blocking policies while preserving report generation and existing unrelated gates; rollback never converts missing evidence into synthetic success.
- **Quarantine Expiry & Test Removal Review**: Quarantined tests require an owner, rationale, and strict expiration date. Silent test deletion is prohibited; test removal requires a documented review verifying requirement deprecation and updating oracles.
- **Sanitized Incident-to-Regression Feedback**: Incident reproducers must undergo strict sanitization (purging PII, tokens, secrets, internal network data) before being authored as regression tests and linked to independent oracles.

### AC-4 (T8-4): Observation-First Status
- `CHANGELOG.md` entry placed under `[Unreleased]` with explicit observation-first framing.
- `docs/ai-test-assurance.md` header explicitly marks the document as an unreleased/observation-first checkpoint.

---

## 3. Actual Commands and Verification Summary

### Changed Files
- `package.json`
- `CHANGELOG.md`
- `docs/ai-test-assurance.md`

### Verification Performed
- `rtk git status` (verified only intended owned files are modified/created)
- `rtk git diff package.json CHANGELOG.md` (verified minimal surgical edits; no dependency or metadata drift)
- No mid-flight tests, linters, or compilers were executed, per brief instructions.

---

## 4. Post-Review Corrections (T8 Docs Independent Review)

Following the independent technical review in `.agent/sdd/ai-test-assurance/task-8-docs-review.md`, the following precise corrections were made to `docs/ai-test-assurance.md`:

1. **Independent Oracle Policy & Automated Limits (D3 Correction)**:
   - Revised Section 3 to clarify that copying expected test outcomes solely from implementation output is **prohibited by human review policy**, rather than claiming automated rejection.
   - Explicitly noted that structural validation verifies field regular-file status and digests; the validator **cannot detect semantic copying or authenticate an oracle owner**. Human review remains mandatory to verify semantic independence before evidence can be accepted.
2. **Risk-Scoped Adoption vs. Broad Suite Migration (D4 Correction)**:
   - Removed blanket requirements for whole-repository test suite migration and undefined "near-zero" false-alarm thresholds.
   - Replaced with owner-reviewed, risk-scoped adoption: promotion to a blocking gate within a target integration boundary requires maintainer approval, empirical calibration evidence documenting observed false-alarm characteristics and limitations, and consumer readiness within that specific boundary.
3. **Canonical Specification Links**:
   - Replaced links pointing to historical `.agent/sdd/...` evidence paths with canonical links to `docs/srs/srs-ai-test-assurance.md` (§4–§7).
4. **Freshness Qualification for Declared vs. Executed Evidence**:
   - Qualified Exit 0 so that `freshness: "current"` is required for executed and fault requests, whereas declared-only requests evaluate freshness to `"not_applicable"`, accurately reflecting SRS §4.4 and §5.
5. **Stale Structurally-Valid Drift vs. Invalid Unreadable/Unsafe Inputs**:
   - Clarified that structurally valid inventory drift (modified, added, or deleted regular files in approved roots) produces `freshness: "stale"` (exit 1), whereas missing caller `current.json`, unreadable or unsafe input paths (e.g. symlinks, `..`), malformed schemas, or missing/tampered captured artifacts result in `invalid` (exit 2).
6. **Fault Demonstration Criteria Summary & Canonical Invariants**:
   - Explicitly framed the behavioral fault criteria as a summary subject to all canonical invariants from SRS §4.2–§4.3, adding the missing constraints: matching `command`, matching execution environment (`os`, `arch`, `runner`, `runner_version`), exact equality for `tests`, `dependencies`, and `config` input groups, frozen challenge tests, and `VariantManifest.changes` equality to the complete source inventory difference.
7. **Snapshot Roots & Dependency-Free Declarations**:
   - Documented that all four input groups (`source`, `tests`, `dependencies`, `config`) must have nonempty roots and files, and that dependency-free projects bind an explicit checked-in dependency declaration stating `none` rather than omitting the category.
8. **Human-Owned Quarantine Expiry & Flaky-Triage Alignment**:
   - Removed the unapproved 14-day universal maximum rule and automated alert claims.
   - Replaced with human-owned expiry review referencing the existing `quality-engineering-flaky-triage` protocol, noting that any specific time limit is an owner-approved team policy rather than an automated enforcement daemon.
