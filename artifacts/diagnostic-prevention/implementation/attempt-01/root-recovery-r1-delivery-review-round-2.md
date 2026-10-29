# R1 Delivery single corrective — independent review round 2

## Decision

**Spec: REQUEST CHANGES. Quality: REQUEST CHANGES. No additional security defect found in the inspected corrective. No root execution clearance.**

D1–D3 from Delivery round1 are addressed in the current source; parent syntax execution and the new physical self-check records provide partial actual qualification. The prerequisite attempt still fails before the public baseline check, owing to a concrete fixture staging contradiction. That one remaining consequential finding is batched below. No full representative apply/check, root-scale counts or performance qualification exists.

## Revision and scope

Read frozen Delivery report appendix `:51–89`, actual harness `root-scale-generation-smoke.mjs#B332` (1799 lines), and `root-scale-r1-prerequisites-02/summary.json#DAD6`. No reviewer hash command executed; source binding here is the read snapshot and parent's current frozen invocation, not an invented SHA256. Production helper/test remain parent-attributed unchanged at `d3058d96...cbc7b2a71` / `222d904c...a0474b`, with accepted 61 PASS and formatting PASS; semantic zero owned errors/three independently BASE-attributed imports remains exit2, not overall PASS.

Only this report is written. Existing production slices, R0 acceptance, prior reports/runs/native evidence and quarantine are not reopened.

## Actual parent execution

- Parent b90 `node --check` **PASS**, proven also by the `&&` proceeding to prerequisite mode. This resolves the former delivered syntax blocker for this revision, without retroactively explaining the prior failing token or claiming a historical behavioral RED.
- Prerequisites02 **FAILED**, parent-reported 8.51 seconds, `FIXTURE_TRACKED_EVIDENCE`. The read receipt records physical fixture Git/hooks isolation and all three baseline producer exits zero, each with `groupReaped: true` (`summary:48–88`).
- Physical self-check receipt records real internal, alias and external paths, alias resolving to the internal physical root, external refusal and injected command-config stripping (`:103–112`). These are now actual owned-filesystem checks, not invented `/owned` strings.
- Failure occurs during `commitFixtureBase`; no `baseline-check` stage, injected manifest acceptance, changed/verified counts or final verification is present. Counts/verification null; unresolved process groups empty; fixture retained (`:90–116`). No apply or final check occurred. These successful prerequisite components do not equal **PREREQUISITES_VERIFIED** or **QUALIFIED**.
- Reviewer ran no command, test, probe, generator or syntax parser. Node26 only. Root untouched by this fixture invocation according to parent; no root state mutation inferred from fixture effects.

## Remaining consequential finding

### DR2-A — Major: BASE-archived historical artifacts are staged, then categorically forbidden

**Location:** `commitFixtureBase():698–743`, called before injection/baseline check at `:1257–1259`. Actual failure: prerequisites02 summary `:93–95`.

Candidate enumeration excludes only `.git` and root `node_modules` (`:700–703`). The pinned BASE archive already contains historical `artifacts/runs/...` files; Git's ordinary ignore filtering does not exclude all of them. The helper stages all remaining positive top-level paths, commits the synthetic fixture BASE, then rejects any tracked path beneath `artifacts/` (`:737–742`). Thus it commits the exact historical paths it later declares forbidden.

Actual rejected files are:

- `artifacts/runs/product-evidence-sdlc/verification/consumer-smoke.json`
- `artifacts/runs/sdlc-metrics-report/20260923T090000Z-brainstorm-feature.json`
- `artifacts/runs/sdlc-metrics-report/20260923T093000Z-plan-feature.json`
- `artifacts/runs/sdlc-metrics-report/20260923T100000Z-design-solution.json`
- `artifacts/runs/system-design-routing/20261001T031716Z-retro-learn.json`

These are historical files extracted into the owned fixture from pinned BASE, not leaked new parent-run receipts. Current smoke evidence is written outside the fixture under the exclusive approved A directory; that separation must remain. This is not a live-root evidence corruption, authority escape, failure of production batching, or reason to delete historical user evidence.

**Smallest safe correction, if separately authorized:** exclude the fixture's top-level `artifacts` tree from the positive staging candidate set before `git add` and the synthetic commit; retain its archived bytes on disk and preserve the existing no-tracked-evidence assertion. Verify the actual tracked inventory still contains all required canonical/config/producer/output paths and no dependency links/evidence. This changes only which paths enter the owned synthetic fixture BASE; it neither alters the real pinned BASE nor deletes live evidence. Do not use blanket force-add, ignore-list suppression, acceptance-band padding, live ignore changes, source/authority exclusions in production, or a root experiment.

An alternative policy that explicitly allows exactly pinned historical artifact entries in the synthetic commit would need parent contract disposition and exact provenance inventory; merely removing the final check would not satisfy the current no-evidence-tracking contract. The minimal positive-candidate exclusion is simpler and retains that contract.

**Acceptance still required:** actual prerequisite completion must reach schema-valid injected authority and the real public baseline PASS check; then a separately authorized fresh full representative apply/check must establish real topology/counts, byte/ownership preservation, query measurements and clean lifetime/teardown. No automatic new attempt is granted by this report; Delivery's single corrective has been used.

## D1–D3 dispositions

| Prior finding | Actual source and evidence | Disposition |
|---|---|---|
| D1 delivered EOF parse failure | Parent current syntax PASS; current `sha256File` and replaced self-check bodies close, prerequisite catch/cleanup and main remain structurally present. Worker static AST query is not substituted for the parent syntax observation. | **Resolved on current revision.** Prior failure remains prior evidence; exact old token not retrospectively attributed. |
| D2 physical self-check only lexical strings | `runIsolationSelfChecks(tempRoot):177–243` now creates internal/external existing directories and an alias symlink beneath the owned temp root, realpaths them and exercises the same owned `.git` containment/equality guard. Actual summary records identities and refusal. Sanitizer override self-check still deliberately executes no external hook. | **Resolved for the requested owned physical predicate/alias control.** It does not claim a complete malicious-Git repository attack simulation. |
| D3 incomplete command-result evidence | `writeEntrypointResultEvidence():790–835` writes exclusive logs and a bounded command result with full executable argv/cwd, exit/signal/spawn/timeout/termination/truncation/duration/group identity/reaped and log references. Public baseline/apply/check call it before unresolved-group refusal (`:1314–1326`, `:1405–1413`, `:1433–1441`). | **Resolved in source.** No public command reached that path in this attempt; no forced unresolved-group negative result claimed. |

## Retained safety/acceptance boundaries

- Physical root/Git-dir/owned `.git` and effective empty hooks verification remains; full `GIT_CONFIG_` family stripping remains before rebuilding only harness-owned safe values. The previous concrete `GIT_CONFIG_PARAMETERS` override is not reintroduced.
- Valid unrelated CLI owner/source/agent is copied from an ordinary baseline manifest entry and bound to the real fixture file digest. Final acceptance compares row fields and file bytes. This remains **unexecuted beyond source** because current failure precedes injection/public check; do not infer real schema acceptance yet.
- Prerequisite-only branch follows baseline check and digest capture, stops before canonical overlay/apply (`:1355–1377`), returns distinct PREREQUISITES_VERIFIED via sentinel catch, and still undergoes ownership/cleanup failure handling. Its success would not imply full qualification.
- Full mode retains real copied public apply/check ingress, baseline producer/ordinary class expectations, exact changed/verified sets, declared containment, unchanged unknown byte/no-ownership checks, scoped token metrics/nonmetric preservation, unrelated row/file, Git/config preservation and native Trace2 listing/proof counts plus ceiling. The source checks remain unmeasured here; broad count bands do not replace exact real topology adjudication.
- Detached process-group deadline/grace/reap behavior remains; unresolved ownership retains fixture and forces failure, cleanup errors force failure, output/result writes are exclusive. Successful reaping of baseline commands is not a forced-timeout/cleanup-error proof. Groups cover their own members, not arbitrary malicious detached escapees or host policy enforcement.
- The fixture's commit is an actual temporary local effect before the failing inventory assertion; it is not a parent-root commit or root adoption. Failure receipts truthfully remain FAILED with retained fixture.

No additional load-bearing source defect found in the changed D1–D3 branches. This statement is not completion of missing runtime qualification and does not predict the still-unreached schema/apply/check paths will pass.

## Stop/go and conduct

**HOLD for full R1 acceptance/root gate.** Current source is parseable and D1–D3 corrections are satisfactory within the stated scope, but the exact staging defect prevents prerequisites from completing. Parent must settle the authorized next route/action rather than silently issue another corrective or replay. No human approval, new writer/retry, root check/adoption/apply or deployment authority is supplied here.

Read-only source/evidence review; sole new report written. No commands, source edits, tests, root writes, delegation, model/config/permission changes or premium. MCP JavaScript/common standards refreshed, security guidance retained, compliance audited and telemetry requested; host token/cost fields unavailable, no totals fabricated. Generic React/product-management routing notices do not establish missing React/product implementation review for this harness-only scope.
