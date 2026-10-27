# Preserved evidence — first independent T5 rubric audit (reviewer A)

Preserved because its transient agent transcript is not a durable artifact. This is a record of what
reviewer A (read-only specialist reviewer, independent of the packet author) returned for the
revision-1 sealed material. It is not execution evidence and not an acceptance.

- Reviewed revision-1 hashes: `skills.txt` `41c57a51…801ac`, `heldout.json` `040e9966…98e17`,
  `pilot.md` `c2175729…43ff1c`.
- Reviewer A ran nothing: no scorer, build, test, lint, generator, model call or candidate
  execution. Read-only file inspection and read-only shell builtins only.
- Second reviewer (reviewer B) is the separate sealed report `T5-rubric-review.md`
  (`6fecc9ef96387b36290178987843faa0ed11edad0e40109573f6c6ca84704575`); its verdict was
  CHANGES REQUESTED, and it is the authority for blockers R1-R5.

## Calibration adjudication returned by reviewer A (revision 1)

All nine revision-1 labels were confirmed: six unsafe candidates `unsound`, three positives `sound`.
Reviewer A explicitly warned that agreement does not validate the calibration set, because both
revision-1 sound anchors carried defects the rubric could not see:

- `ROI-TEN-01-C2`: the fixed-schedule snapshot rebuild still claimed post-deletion reads return
  empty on every path, leaving a servable window the hard-failure list did not cover.
- `ROI-OVL-01-C2`: the residual figure ("about 36% of peak capacity") was not derivable from the
  stated losses ("removes 40% of remaining capacity").

Reviewer B later found the third positive, `ROI-PAY-01-C2`, actively unsafe (retries before the
hold), plus the PAY changed-constraint contrast defect. Revision 2 repairs all four.

## Blocking findings returned by reviewer A

1. **Dead `not_contains` in the prepared matrix.** The overload gate passed an array to
   `not_contains`; `checkAssertion` stringifies the value (`scorer.ts:193-194`), so the joined phrase
   never matched and the guard could not fire. Consequence: the declared reject for
   `ROI-OVL-01-C3` could not be produced and the first execution would have exited 1. Repaired in
   revision 2 by splitting guards into single-string / negation-guarded forms.
2. **Gate assertion satisfiable by the opposite statement.** The tenant gate matched the substring
   `cache key`, so "the semantic cache key is the query embedding" satisfied
   "cache identity carries tenant authority". Repaired by gating on authority identity terms.
3. **Requirement absent from the prompt.** The tenant gate required deletion/revocation content
   under a base+adverse label. Repaired by labelling calibration coverage as the whole-case brief,
   which is what those answers address.
4. **Collapsed disjunction.** The overload gate merged per-connection buffer bound and drain
   termination into one `contains_any`. Split in revision 2.
5. **Lane A denominator and inference wrong.** Acceptance required every assertion of an eval
   written for another prompt to pass, so a near-zero count is guaranteed by construction and is not
   evidence of assertion unusability; the reported denominator (29) also matched nothing in the code.
   Revision 2 computes the tally from the run and states the limitation instead of a conclusion.

## Non-blocking findings returned by reviewer A (disposition)

- Unlabelled hard failures vs the pilot's "hard failure id" → pilot now uses the 1-based index plus
  quoted clause as the shared key.
- The 4-of-5 evidence tolerance was nullified by variant-scoped evidence duplicated as hard failures
  → stated explicitly as an intentional design, applied to base/adverse items only.
- `ROI-OVL-01` hard failure 2 was not consumer-visible and satisfiable by decoration → rewritten as
  an observable post-loss behaviour.
- `ROI-PAY-01` hard failure 3 was wording-shaped → rewritten as a mechanism/promise failure.
- `ROI-TEN-01` hard failure 2 omitted post-retrieval filtering, the exact unsafe mechanism used by
  its own unsafe calibration answer → added.
- `source_fixture` named a non-resolving heading in `idempotency-contract.md` → anchor removed.
- `execute.ts` sandbox claim: the A0 no-AGS arm could not be guaranteed skill-free → pilot now
  states cleanliness as an assumption with a contamination rule.
- Semantics-v2 citation pointed at version selection rather than the tolerance implementation;
  AC-ROI-12 wording was inverted → both corrected.

No finding was applied by weakening an invariant or by making an example pass.
