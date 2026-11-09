# JRN-OUTCOME-01 — Outcome Record Audit CLI

**Surface**: repo CLI `scripts/outcome/index.ts` (spawned with the resolved `tsx` loader)
**Recipe**: `recipes/outcome-audit.json`
**Criteria**: `AC-01`–`AC-14`, `VER-001`–`VER-007` (referenced, not restated)

## Consumed inputs

- `scripts/outcome/index.ts`, `schema.ts`, `template.ts`, `scripts/workflow-chain.ts`
- `artifacts/runs/pstack-verification-readiness/20261105T072631Z-design-solution.json`
- recipes: `recipes/outcome-audit.json`, `recipes/cli-policy.json`

## Assurance

`assurance: "record-schema-and-scope-valid"` — schema and scope validity only. It never
claims approval, current revision, or human authorization.

## Scenarios (arguments come from the recipe file)

| ID | Command shape | Oracle |
| --- | --- | --- |
| `outcome-exact-one-valid` | `--records --required --slug … --workflow design-solution --run-id 20261105T072631Z-design-solution --json` | exit 0, `ok=true`, `recordsMatched=1`, assurance label |
| `outcome-missing-scope` | `--records --required --slug … --workflow nonexistent-workflow --run-id … --json` | exit 1, `ok=false`, `recordsMatched=0`, issue message `no run record matches required scope` |
| `outcome-duplicate-identity` | `--records --required … --dir <scratch>/outcome-duplicate --json` | exit 1, `ok=false`, `recordsMatched=2`, exactly one issue mentioning `duplicate run record identity` |
| `outcome-invalid-schema` | `--records --required … --dir <scratch>/outcome-invalid --json` | exit 1, `ok=false`, `recordsMatched=0`, issue message `missing required field` |
| `outcome-usage-error` | `--slug … --json` (scope selector without `--required`) | exit 2, JSON payload `usageError=true` |

## Fixture construction

Both fixtures are synthetic and kit-owned, and their exact bytes plus digests are recorded
in the evidence artifact before the scratch root is removed:

- duplicate: the same **schema-valid** record (all required top-level keys, valid
  `requirement_trace` IDs, `cost.source=unavailable`) written twice under different
  filenames with one shared identity. The expected diagnostic is the duplicate-identity
  error only — no unrelated schema errors.
- invalid: a three-field object missing every other required key.

`--dir` receives an absolute path inside the owned scratch root, so no repository record
is ever written, moved, or deleted.
