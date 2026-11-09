# Feature Slicing: Demonstrable Increments and Justified Exceptions

Demand-loaded reference for `.agents/workflows/plan-feature.md` and `skills/product-management/product-requirements/SKILL.md`.

## 1. Core Rule: Demonstrable Feature Increments

Every feature slice must deliver an independently demonstrable behavioral outcome through a real producer-to-consumer path. A worker or reviewer must be able to exercise the slice from an actual entrypoint and observe its application-owned outward result without waiting for an unmerged sibling feature task or an unrelated layer ticket.

- **Vertical behavior, not horizontal architecture:** Slices cut through the necessary layers (parsing, domain logic, command/API entrypoint, outward reporting) to make one user- or caller-facing capability complete.
- **Single implementation owner:** Each slice has one accountable owner role and concrete repo/module targets. Do not assign parallel implementers to fragments of the same coupled behavior.
- **Traceable to canonical criteria:** Every slice explicitly references approved canonical requirements or behavioral criteria—using existing IDs where present (`REQ-*`, `AC-*`), or the approved ticket/session contract where brief delivery mode is used—without minting unnecessary fields or requiring a second intake.

## 2. Horizontal Regrouping Principle

When a proposed plan decomposes work into layer-only tasks (for example: Task 1 = database/storage, Task 2 = service/API, Task 3 = CLI/UI), **reject the plan as an independently complete feature breakdown**.

While individual layer tasks can be validly component-verified in isolation, their completion alone does not demonstrate the claimed feature outcome. Layer-only completion leaves the outward user- or caller-facing contract unverified and dependent on subsequent tickets.

**How to regroup:**
1. Identify the smallest cohesive user- or caller-visible capability.
2. Thread that single capability vertically through all necessary layers into a single slice.
3. Keep subsequent capabilities in follow-on vertical slices.
4. If a genuine foundational element must precede downstream feature work, classify it under the explicit exception rules below rather than mislabeling it as a feature slice.

## 3. Justified Exception Taxonomy

Non-feature work that cannot independently produce a complete consumer-facing capability must be classified into one of three explicit exception types. Every exception requires:
- Explicit type classification (`prerequisite`, `research`, or `mechanical_refactor`).
- Accountable owner role.
- Concrete verified result (observable outcome or artifact).
- Named consumer slices that depend on it (one or more).
- Explicit dependency edges in the implementation plan.

### A. Prerequisite (Foundational Setup / Shared Platform)
- **Definition:** Standalone infrastructural, environment, schema, or tooling setup required by one or more downstream slices.
- **Required fields:** Exact owned paths, verification command/result (e.g. frozen lockfile installed, migration executed, container healthy), and explicit dependent consumers.
- **Guardrail:** Never fake an end-user UI demo or mock a consumer behavior to justify readiness. Readiness is verified by its own contract (environment check, schema inspection), not simulated feature completion.

### B. Research (Spike / Feasibility Discovery)
- **Definition:** Bounded investigation to resolve a high-risk technical unknown, performance question, or architectural tradeoff before committing to an implementation contract.
- **Required fields:** Bounded question to answer, accountable researcher, concrete observable artifact (e.g., findings document, decision record, proof-of-concept benchmark), review method, and consumer slices unblocked by the decision.
- **Guardrail:** Bare "research done" or unevidenced speculation fails. The output is a verified decision or recommendation; no product feature demo is implied or required.

### C. Mechanical Refactor (Cross-Cutting Restructuring)
- **Definition:** Code reorganization, rename, extraction, or migration across modules without intentional user-visible behavioral changes.
- **Required fields:** Explicit mechanical scope and owned paths, behavioral equivalence verification (existing tests pass without functional regressions), affected consumers, and dependency edges.
- **Guardrail:** Honor the clean-cutover default: update all callers and delete obsolete code. Do not demand backward-compatibility shims, dual paths, or fake feature demos for internal restructuring.

## 4. Worked Example: Illustrative Decomposition of Audit Outcome CLI

This example uses the pre-existing, already-implemented audit outcome CLI journey as an illustrative comparison between bad horizontal decomposition and demonstrable feature slicing. It conveys no new authorization to modify existing outcome or schema components.

### Context (Pre-existing capability)
A capability that audits SDLC workflow outcomes via a scoped CLI command:
`rtk pnpm audit:outcome --records --required --dir <dir> --slug <slug> --workflow <wf> --run-id <id> --json`
The journey requires:
1. File discovery and schema validation of run records in `<dir>`.
2. Exact scope matching on `slug`, `workflow`, and `run_id`.
3. Outward reporting with exit codes (0 on match, 1 on absent/mismatch) and JSON payload.

### The Bad Plan (Horizontal Layers — REJECTED)
```
Task 1: Implement record discovery and JSON schema parser in scripts/outcome/schema.ts
  - Owner: Backend Dev
  - Artifact: parseRecord() function
  - Verification: unit test with mocked files (no CLI entrypoint)
  - Flaw: Incomplete; although component-valid, consumer cannot execute or observe outward feature behavior.

Task 2: Implement CLI argument parsing and filtering logic in scripts/outcome/index.ts
  - Owner: CLI Dev
  - Artifact: filterRecords() function
  - Verification: call function in isolation with synthetic objects
  - Flaw: Incomplete; relies on unintegrated Task 1 parser; outward CLI exit behavior unverified.

Task 3: Connect CLI reporting and exit codes
  - Owner: Integration Dev
  - Artifact: main entrypoint wiring
  - Verification: run CLI manually
  - Flaw: Forces three sequential tasks and artificial handoffs for one cohesive capability.
```
**Why QA Rejects This:** Tasks 1 and 2 deliver zero demonstrable user behavior. While component tests may pass, neither task alone completes the claimed feature outcome.

### The Demonstrable Slice (Illustrative Vertical Decomposition)
```
Task 1: Thin demonstrable outcome audit slice
  - Owner: Maintainer / CLI Engineer
  - Requirements / Criteria Trace: [illustrative ref: REQ-001 / AC-001 or approved ticket contract]
  - Scope / Modules: End-to-end path for exact-identity run selection across parsing, filtering, and reporting:
      * Record discovery and schema validation
      * Exact matching on slug, workflow, and run_id
      * Outward CLI exit codes (0 on unique valid match, 1 on absent/mismatch/error) and formatted JSON result
  - Ingress: CLI invocation with --slug, --workflow, --run-id
  - Positive Verification (unique schema-valid exact match with no audit errors):
      rtk pnpm audit:outcome --records --required --dir <dir> --slug <slug> --workflow <wf> --run-id <existing-id> --json
      -> Exit 0, ok: true, recordsMatched: 1, exact identity matched, issues: [].
  - Negative Verification (exact identity absent):
      rtk pnpm audit:outcome --records --required --dir <dir> --slug <slug> --workflow <wf> --run-id <absent-id> --json
      -> Exit 1, ok: false, recordsMatched: 0, no-matching-scope error.
  - Error Boundaries:
      * Invalid JSON or schema violation: Exit 1, ok: false, error issue recorded; cannot be accepted as valid.
      * Duplicate requested identity in inventory: Exit 1, ok: false, duplicate-identity error reported; cannot be accepted as unique match.
  - Result: Fully demonstrable in isolation without follow-on tasks.
```

### Exception Example: Shared Prerequisite
```
Task 0 (Prerequisite): Restore locked development dependencies
  - Type: prerequisite
  - Owner: Maintainer
  - Owned paths: node_modules, pnpm-lock.yaml (frozen)
  - Result: pnpm install --frozen-lockfile exits 0, tsx binary present.
  - Verification: rtk pnpm exec tsx --version exits 0.
  - Consumers: Task 1 (requires tsx runner for outcome CLI).
  - Justification: Tooling prerequisite; no feature demo possible or demanded.
```
