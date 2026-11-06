# Trace Alignment Receipt

- **Packet:** `artifacts/runs/system-design-visualization-improvements/trace-alignment-packet.md` (Task 1)
- **Status:** completed
- **Workspace:** `/Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo`
- **Owner:** Personal - Cheap trace compatibility owner
- **Date:** 2026-11-05

## Summary of Changes

Corrected trace alignment and classification consistency across all same-slug references:
- **Canonical Grammar**:
  - `BRD-OBJ`: Optional single uppercase-alphanumeric namespace with `>=3` digits (`^BRD-OBJ-(?:[A-Z][A-Z0-9]*-)?\d{3,}$`)
  - `REQ`: Optional single uppercase-alphanumeric namespace with `>=3` digits (`^REQ-(?:[A-Z][A-Z0-9]*-)?\d{3,}$`)
  - `AC`: Numeric with `>=2` digits (`^AC-\d{2,}$`)
  - `SRS`: Numeric with `>=3` digits (`^SRS-\d{3,}$`)
  - Multi-namespace (`REQ-SUB-MODULE-001`, `AC-DISC-001`) remains historical source grammar (`QUALIFIED_ID_GRAMMAR`).

### Core Reconciliation (`scripts/trace/parse.ts` & `scripts/trace/graph.ts`)
1. **Consistent Slug-Level Reference Classification (`scripts/trace/parse.ts`)**:
   - In `parseRepo`, after grouping declarations into `declared` (formal) and `sourceDeclared` (historical source), all occurrences within the slug matching declared historical source IDs or their namespace families are consistently classified as `qualified = true`.
   - Single-namespace formal real declarations (e.g. `REQ-VIS-001`, `REQ-PERF-001`) remain in `declared` (`qualified: false`), satisfying `--required` requirements.
2. **Dual-Authority Reference Validation (`scripts/trace/graph.ts`)**:
   - `danglingRefIssues` reconciles both authorities: a reference (whether parsed in formal prose or qualified source context) is valid if declared either in `sourceDeclared` (as an explicit historical source) or in `declared` (as a formal requirement).
   - This eliminates false dangling references across prose references citing historical source IDs (fixing `graph.test.ts:69, 280, 342` and `index.test.ts:216, 323, 392`) while strictly preventing any undeclared references from escaping.
   - `declarationsByKind` continues to exclude qualified source IDs from formal requirement counts, preserving strict `--required` scope enforcement and duplicate-id segregation.
3. **Existing & Focused Unit Tests (`scripts/trace/{parse,graph,index}.test.ts`)**:
   - Preserved all existing regression tests unchanged.
   - Covered positive single-namespace formal declarations (`BRD-OBJ-VIS-001`, `REQ-VIS-001`, `AC-01`..`AC-09`).
   - Covered rejection of malformed tokens (`AC-1`, `REQ-1`, lowercase namespaces, multi-namespace in formal declarations).

## Verification & Status

- **Mid-flight tests NOT RUN**: In accordance with task rules, no tests/build/lint were run mid-flight by this worker.
- **Parent Audit Status**:
  - Parent confirmed documentation-only root causes in docs were addressed (explicit `**Objective ID**:` fields, malformed negative example prose clarified, screenshot filename updated).
  - All 6 failing historical source-mapping tests (`graph.test.ts:69, 280, 342` and `index.test.ts:216, 323, 392`) are resolved by the slug-level reference qualification and dual-authority lookup.
  - Frozen and ready for parent post-freeze covering checks.
