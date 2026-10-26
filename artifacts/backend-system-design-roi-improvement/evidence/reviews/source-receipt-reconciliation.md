# Source receipt reconciliation

Accepted guidance source: skills/system-design/system-design-resilience-ops/references/reliability-operations.md.

Actual SHA-256: `b9628d52dcfe04dbe81b349131d5e4cc873f73b9513251132b280ba7fc5d0e32`.

The initial T1 correction notification and copied lead/rereview receipt omitted `a7` near the digest suffix, yielding a 62-character string `b9628d52dcfe04dbe81b349131d5e4cc873f73b9513251132b280bfc5d0e32`, not a valid SHA-256. This was a receipt transcription error, not an observed source mutation.

Lead's first accepted-source-freeze digest assertion failed on this discrepancy. The lead corrected only its accepted-source-freeze.json receipt. Re-execution over all ten accepted source files returned `{"acceptedSourceFiles":10,"status":"PASS","scope":"guidance source freeze; not efficacy"}`. No canonical source was edited by this correction. T5-report.md already recorded the actual full digest and bound against it; no evaluation-source delta follows.

Preserve original T1/review reports and failed assertion as historical evidence. Use accepted-source-freeze.json plus this explicit reconciliation as the current source-binding authority. The failed first check is not relabeled PASS; the corrected receipt passes a separate later check. T6-preparation.json may retain its checkpoint discrepancy but must refer to this resolution before final integrity claims.
