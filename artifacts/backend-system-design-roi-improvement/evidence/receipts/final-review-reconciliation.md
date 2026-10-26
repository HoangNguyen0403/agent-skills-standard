# Final integration review provenance reconciliation

Created after the independent review dated 2026-10-27. This is an addendum; historical T0–T5 reports, the original failed integration review, and the captured source/eval packets remain unchanged.

## T5 acceptance review digest

- The lead notification's shorthand `8995f3ec…2884` is unsupported by any retained byte capture and is superseded; it is not evidence of tampering.
- The actual `T5-acceptance-review.md` bytes are bound to SHA-256 `ca36ec82a937404804d289d6152c27f791d5d469adec9b4c38135029c018125d`.
- The pre-generation archive `/Users/nguyenhuyhoang/.ags-evidence/backend-system-design-roi-improvement/t6-frozen-inputs-20261026T174353Z.tar.gz` (SHA-256 `26f2bd5d9cbe20b41064d5d71a828421797e98b573ff824777d862ebe0df5168`) contains the same acceptance-review digest. The stage-generation receipt independently recorded the same digest.
- Independent review recomputed all eight artifact hashes bound by the current review; all matched. The actual APPROVE decision remains bound to revision 4 at the captured bytes. No historical review text was rewritten.

## Full T0 baseline archive

- Exact archive: `/Users/nguyenhuyhoang/.ags-evidence/backend-system-design-roi-improvement/sdd-20261026T163623Z.tar.gz`
- SHA-256: `100d946a753f9b8f973d8a3ecefa501c53c793872f7e1bf868a03fcc4f86be86`
- Archive entries: 7,150. The `baseline-snapshot/` subtree is the original full baseline; it remains external and is not duplicated in this evidence bundle.
- This exact path, digest, and entry count are also recorded under `MANIFEST.json.external_archives` so the immutable baseline is retrievable from the tracked evidence manifest.

## Audit receipt distinction

The prior `receipts/audit-report.json` was byte-identical to `benchmarks/evals/eval-audit.json` from source commit `83ed6887`, generated `2026-09-22T08:08:39.422Z`, SHA-256 `004fcca496af44472a64aa4def5595c20c46bb691c332ed95f5ad9ecab9746f5`. It contained two unrelated `database-hana` eval errors. Its bytes are retained under `receipts/preexisting-eval-audit-snapshot.json`, with a separate provenance record. The current isolated-stage `audit:skills` stdout and exit are retained in `receipts/audit-skills-output.json`.
