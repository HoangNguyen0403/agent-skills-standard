### Task 3: Truthful layered acceptance (S01)

**Files:** `skills/common/common-tdd/**`, `.agents/workflows/implement-feature.md` only.
**Inputs:** existing Test Intent Record and settled-revision receipts. **Outputs:** concise acceptance contract/reference and eval controls; do not create a parallel RunRecord schema.
- [ ] Separate source-ready, focused checks, consumer-smoke, independent review and human acceptance with source/build identity, actual entrypoint/assertion and result artifact. Original preimplementation RED stays NOT RUN if absent; frozen old-revision proof separately labeled. Setup errors are not behavioral RED.
- [ ] Require actual test membership/count from output, no-listener/zero-exit completion rejection and actual producer→consumer proof. Later edits invalidate affected proof, not unrelated previous gates.
- [ ] Fix existing eval cases 4/5 negative substring assertions that reject their own compliant expected answers quoting unsafe terms. Replace with finite anchored decision controls, not bans on words in refusal text; include unsafe keyword-stuffed and partial-suite/no-marker answers as negatives.
- [ ] Add pressure cases for absent RED, partial suite, early exit and stale final source; do not fabricate runtime output or lower quality gate.
**Verification owner:** parent via real scorer test Task5 and scoped alignment. **Report:** task-3-report.md FINAL. **Correction route:** host ladder.

