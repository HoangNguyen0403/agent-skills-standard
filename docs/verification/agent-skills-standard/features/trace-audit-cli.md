# JRN-TRACE-01 — Requirement Trace CLI

**Surface**: repo CLI `scripts/trace/index.ts` (spawned with the resolved `tsx` loader)
**Recipe**: `recipes/trace-audit.json`
**Criteria**: `AC-01`–`AC-14`, `VER-001`–`VER-007` (referenced, not restated)

## Consumed inputs

- `scripts/trace/index.ts`, `parse.ts`, `graph.ts`, `types.ts`
- `docs/prd/prd-pstack-verification-readiness.md`
- `docs/srs/srs-pstack-verification-readiness.md`
- recipes: `recipes/trace-audit.json`, `recipes/cli-policy.json`

## Assurance

The CLI's own label is the oracle: `assurance: "document-links-only"` with
`execution_evidence: "not_evaluated"`. A passing scenario proves document-link
consistency for the requested slug only.

## Scenarios (arguments come from the recipe file)

| ID | Command shape | Oracle |
| --- | --- | --- |
| `trace-valid-scope` | `--slug pstack-verification-readiness --required --json` | exit 0, `ok=true`, `assurance=document-links-only`, `requested_scope` echoed |
| `trace-missing-scope` | `--slug nonexistent-feature-slug-12345 --required --json` | exit 1, `ok=false`, exactly one issue with `code=missing-scope` |
| `trace-empty-scope` | `--slug trace-empty --required --json --root <scratch>/trace-empty` | exit 1, `ok=false`, issue `code=empty-scope` |
| `trace-usage-error` | `--required` (no slug) | exit 2, stderr names the missing selector |

The empty-scope fixture is synthetic, kit-owned, byte-recorded in the evidence artifact,
and lives only under the owned scratch root.

## Negative branches covered elsewhere

- A missing declared driver (`scripts/trace/nonexistent-driver.ts` written into the
  owned recipe) must produce the real module-resolution error; the gap is scoped to
  worker R, never a silent fallback to a different target.
- A missing `tsx` loader is a harness failure: no product PASS is inferred.
- A drifted `--slug-id` argument in the owned recipe fails with the CLI usage exit code;
  correcting the recipe and re-driving must pass with product bytes unchanged.
