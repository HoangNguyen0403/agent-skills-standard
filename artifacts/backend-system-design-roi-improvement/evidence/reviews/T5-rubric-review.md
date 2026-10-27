# T5 independent rubric review — sealed evaluation-owner handoff

## Verdict: CHANGES REQUESTED

**Keep this report with the lead/evaluation owner. Do not forward sealed prompts, candidate text or counterexample details to T1–T3 content owners.** Source reviews T1/T3 were completed and written before this sealed packet was read. This reviewer authored none of the guidance or packet and made no implementation/fixture changes.

Scope: the three new benchmark artifacts and T5-report.md, against ROI plan T5 and AC-ROI-12/13/14. Package `evals/evals.json` binding remains deferred until accepted source freeze and is not approved here. No build/test/lint/formatter/generator/model/candidate execution. Manual semantic adjudication below is documentary rubric calibration, not live model efficacy, lexical scorer discrimination, executable behavior, ROI or human acceptance.

Rules: code-review/review-system-design, common/common-code-review, common/common-architecture-audit, common/common-security-audit, common/common-security-standards, common/common-skill-creator, specialists/specialist-architecture-guard, system-design/system-design-methodology/principles/review and semantic-evaluation.md. Also loaded managed `ags-sealed-heldout-packet-authoring`. MCP file loading for packet returned no tier-eligible skill; prior keyword-loaded semantic/review rules remain applicable. Compliance audit performed before this report. No scorer or schema extension is requested.

## Confirmed blockers

### [MAJOR] T5-R1 — payment positive calibration authorizes the unsafe repeated calls it must prohibit

Evidence: `benchmarks/evals/backend-system-design-roi-heldout.json:97-99` marks PAY-C2 sound, but the answer says "When the retry times out twice I stop calling the bank entirely." The provider has no reference deduplication (`:18`), and the adverse condition includes a committed debit with a lost reply (`:19`). The case hard failure `:31` forbids any timeout/retry path issuing a second debit. Pilot matrix `backend-system-design-roi-pilot.md:181` repeats the false positive.

Why: stopping after two timed-out retries is too late to guarantee at most one debit. Stable row identity in the caller does not arbitrate effects in a non-deduplicating bank. This is a mechanism defect, not absent preferred phrasing.

Adverse timeline: first debit commits; reply disappears; caller issues the described retries before stopping; processor accepts the same reference again and debits twice or three times. Later settlement/manual repair cannot retroactively make the original safety claim true.

Violated AC: AC-ROI-12 hard failures must be non-compensable; AC-ROI-13 requires a genuinely safe alternative-phrasing positive, not labeling unsafe text sound.

Bounded repair: positive candidate must prevent every external reissue after an ambiguous first send until authoritative final evidence resolves the operation, while allowing retries of local status/recovery work. Make the manual evidence gate establish prior-call finality, not merely a file currently lacking a row. Keep the safe alternative wording and re-adjudicate it; do not merely relabel the only positive as negative and leave no positive case.

### [MAJOR] T5-R2 — tenant positive calibration trusts the corrupted copy scope and leaves the warehouse exposure interval unresolved

Evidence: heldout `:42` deliberately maps a B document into A's derived workspace field. TEN-C2 at `:121-123` relies on caller scope in vector query/cache key and equality with stored answer customer ID, without resolving that forged/stale A attribution against authoritative document ownership. Its deletion paragraph rebuilds warehouse snapshots on a fixed schedule but supplies no immediate deny/quarantine/generation gate for direct snapshot reads until rebuild. It is marked sound; pilot matrix `:184` repeats that verdict.

Why: a correct filter on an incorrect derived label still admits the foreign document. Authority in the cache key does not repair poisoned cache content. Eventually rebuilding a snapshot does not establish that revoked content is unservable in the interim. The case expects no foreign content in rerank sets and no revoked content on any path (`:45,54-56`), not just eventual deletion from a subset of copies.

Adverse timeline: B's copied record carries A's workspace label; A's vector predicate matches it, and the cache stores/returns it as A. Separately, deletion changes the generation for live caches/features, but a pre-rebuild warehouse reader can still return old content unless that path checks current revocation/generation or is disabled. Candidate's post-deletion query assertion has no mechanism establishing the warehouse gate.

Violated AC: AC-ROI-12 and AC-ROI-13; the marked-positive mechanism does not satisfy its own authorization/deletion hard gates.

Bounded repair: positive candidate must reject/re-authorize candidates against authoritative ownership/current authorization before reranking/cache construction when copy metadata is corrupt, and gate all snapshot/read/export/restore paths immediately while physical deletion/rebuild proceeds. Equivalent wording is welcome; preserve a truly sound positive and concrete post-revocation verification.

### [MAJOR] T5-R3 — overload positive calibration has incorrect failure arithmetic and an unsupported connection-to-request conversion

Evidence: heldout OVL-C2 `:145-147` claims loss of 40% after a one-third loss leaves 36% of peak. Prompts `:65-67` supply one-third loss followed by 40% of remaining capacity. It derives "320 in-flight streams" from 400 summaries/s and 900 ms p99 without stating how streaming bytes/intervals trigger summary requests. Base `:64` has 90,000 concurrent 12 KB/s streams. The pilot matrix `:187` calls this answer sound.

Why: on sequential interpretation, `(1 - 1/3) × (1 - .40) = .40`, not .36. On standalone-zone interpretation, surviving share is .60, still not .36. In-flight streams are not summarizer requests without a per-stream request-frequency/fan-out mapping; a p99 latency is not the mean service time needed for Little's-law rate/concurrency conversion.

Adverse timeline: a generated answer repeats the positive's 36% figure, assigns 320 arbitrary streams and sheds an arbitrary share; the rubric rewards this without proving whether admitted summaries/s exceed residual downstream capacity. Slow-client buffers are finite, but the claimed load-to-admission invariant remains unproven.

Violated AC: AC-ROI-12 hard quantitative/mechanism invariants and AC-ROI-13 safe-positive calibration; T5 consumer-visible finite admission check.

Bounded repair: freeze whether losses are sequential or alternative and recompute: sequential summarizer ceiling is `400 × 2/3 × .6 = 160 requests/s`; isolated zone loss is 240 requests/s. Supply or explicitly allow an assumed chunk/window-to-summary mapping and cost class, then derive admission in matching units. Separate measured safe throughput from any concurrency estimate; do not treat 900 ms p99 as mean service time. Useful dimensional checks: ingress is 1,080,000 KB/s (~1.08 GB/s decimal); 96 KB per each of 90,000 streams is 8.64 GB of potential application buffering. The positive need not accept all streams, but must account for the admitted population and aggregate bounds. Keep finite close/drain/cursor behavior and verify resume/expired-history contract.

### [MAJOR] T5-R4 — payment changed-constraint case does not change the provider capabilities

Evidence: heldout base `:18` already states the processor does not deduplicate references and has no reference-status lookup. Variant `:20-21` says the provider "drops" those same capabilities, and mandatory evidence `:28` demands a narrowed guarantee after their removal.

Why: an unchanged capability cannot distinguish changed-constraint adaptation from repeating the initial design. A safe base answer must already avoid ambiguous reissue and cannot honestly narrow an already at-most-one guarantee merely because the variant repeats its premise.

Adverse timeline: a grader rewards a candidate for announcing that the provider lost deduplication, despite that feature never existing in base, or rejects a safe candidate for retaining its original manual-hold design. Either result confounds mechanism correctness with agreeing to an inconsistent prompt.

Violated contract: T5 step 2 base/adverse/changed-constraint distinction and semantic changed-constraint re-evaluation; AC-ROI-13 must not reject a correct unchanged mechanism when it remains justified.

Bounded repair: either make base capabilities actually different and calibrate both contracts, or retain the base and change a real decision-shaping constraint (for example the evidence/repair availability with explicit finality conditions). Reconcile expected invariant, evidence, hard failures and positives with the chosen progression. Do not change scorer schema.

### [MAJOR] T5-R5 — pilot freeze receipt does not bind the live pilot bytes

Evidence: `.agent/sdd/backend-system-design-roi-improvement/T5-report.md:18-21` records pilot SHA-256 `c2175729907a6a4aacf2589882fc60b4c28a33cb1566a3a05af7c4693a43ff1c` as the freeze reference. Independent live `rtk proxy shasum -a 256` returned `109f36d08ec4d20c2ac9c1bd5d7a33dd20f562a15f9ec447322dfea6a14729f9`. Re-reading report and pilot confirmed the report still carries the old hash. Selection/heldout hashes match their report entries.

Why: even before execution, a receipt advertised as frozen must name the bytes being reviewed; later source/packet binding cannot safely reuse a stale pilot digest.

Violated contract: T5 freeze/source-binding contract; not itself evidence historical artifacts changed.

Bounded repair: after rubric corrections settle, recompute all new artifact digests and record the live pilot digest in the owner report/freeze manifest. Preserve old receipt provenance as superseded rather than calling it fresh. Review again at that new binding.

## Independent per-calibration adjudication

These verdicts are manual application of invariants to the supplied text, not results from a model, scorer or executable harness. No candidate is rejected for synonyms or structure.

| Candidate | Packet expected | Independent outcome | Decisive mechanism |
| --- | --- | --- | --- |
| ROI-PAY-01-C1 | unsound | UNSOUND — agrees | Non-deduplicating processor receives repeat calls; caller ledger cannot guarantee one external debit; unknown becomes false failure. |
| ROI-PAY-01-C2 | sound | UNSOUND — disagrees (R1) | Two retries can debit again before the later stop/manual settlement gate. |
| ROI-PAY-01-C3 | unsound | UNSOUND — agrees | Bank duplicate rejection is invented; eventual accounting does not reverse a duplicate debit safety violation. |
| ROI-TEN-01-C1 | unsound | UNSOUND — agrees | Authority-free shared embedding cache and privileged/stale-scope job enable foreign content; relevance language does not repair it. |
| ROI-TEN-01-C2 | sound | UNSOUND / material invariant unproven — disagrees (R2) | Filtering corrupted derived scope is insufficient; warehouse revocation gate absent during rebuild lag. |
| ROI-TEN-01-C3 | unsound | UNSOUND — agrees | Source-only absence does not revoke independently servable copies. |
| ROI-OVL-01-C1 | unsound | UNSOUND — agrees | Unbounded retries/queue and replica-count HA fail hard gates despite mechanism vocabulary. |
| ROI-OVL-01-C2 | sound | UNSOUND — disagrees (R3) | Wrong residual fraction; unsupported stream/request rate/concurrency mapping. |
| ROI-OVL-01-C3 | unsound | UNSOUND — agrees | Explicit unlimited admission, buffers, reconnect retries and drain violate finite bounds. |

Result: all six expected-negative candidates are independently unsafe. All three designated positives fail or leave material invariants unresolved; **zero currently valid positive calibration examples**. This does not measure an agent pass rate. Repair positives rather than weakening hard gates to make them pass.

## Hard-gate adequacy and AC status

| AC | Status at reviewed packet |
| --- | --- |
| AC-ROI-12 | Manual negative-candidate discrimination supported for all six negatives, including all three keyword-complete negatives. Contract says hard failures dominate vocabulary. Acceptance still blocked because three unsafe/unsupported positives are labeled sound. No L1 scorer discrimination run claimed. |
| AC-ROI-13 | NOT SATISFIED: paraphrase acceptance rule is correct, but no designated safe-positive candidate survives independent mechanism review. A valid alternate-phrasing example remains required for each family. |
| AC-ROI-14 | Five named historical fixture/report hashes independently match baseline manifest (below). No historical file was written by this review. Entire archive/transcript inventory not rehashed in this bounded packet review; exhaustive preservation remains T6 scope. New pilot receipt is stale (R5), not a historical mutation. |

Non-compensable invariant checks are the correct framework, and the manual-grade/scorer/executable-lane separation is explicit. Tighten numerical coherence and authority/finality checks so "4 of 5 evidence items" cannot compensate for a load-bearing omitted mechanism. A statement that an invariant holds is not its implementation. Correcting calibration labels alone is insufficient; retain safe examples and valid changed constraints.

Other bounded observations:
- Selection includes all four changed packages plus justified principles/estimation dependencies; old 11-skill set is not blindly reused. No T4 expansion.
- 27 attempts/81 condition rows, fresh contexts, randomized order, blinded labels, all-incurred-attempt accounting and context-mode stratification are explicit. No significance/ROI claim is made.
- L3 is explicitly unavailable and cannot be substituted with grader-authored mechanisms. The existing prompts request designs, not necessarily runnable code, so no future L3 completion should be inferred from this packet alone.
- L1 matrix is labeled expected, not measured. Several "pass by construction" cells remain unverified until package assertions are actually bound and scorer receipts exist. No assertion-level review was performed here.
- PAY source_fixture `idempotency-contract.md#operation-identity` names a nonexistent heading in the reviewed governing reference (headings include Required Decisions and Teaching Ladder). Use a resolving heading or document path; this is a traceability correction, not a new mechanism.
- No source-content repair recommendation in this report should be sent to T1–T3 authors: these are sealed evaluator defects and must stay with T5/lead.

## Exact reviewed artifact binding

| Artifact | Independently observed SHA-256 |
| --- | --- |
| backend-system-design-roi-skills.txt | `41c57a510a98bdb61d25e37385ae70e3d2db8b655ce5569cc1ae3ebf17f801ac` |
| backend-system-design-roi-heldout.json | `040e996682f548626304ed4405f997942b3f4f80fd091e789c280ac21cb98e17` |
| backend-system-design-roi-pilot.md | `109f36d08ec4d20c2ac9c1bd5d7a33dd20f562a15f9ec447322dfea6a14729f9` |

Paths above are under `benchmarks/evals/`. Historical preservation spot set, independently hashed live and matched against baseline-manifest.json:

| Artifact | SHA-256 |
| --- | --- |
| benchmarks/evals/system-design-professionalization-skills.txt | `243f7c531e8f10c4d425057c2033d94cb31be74efed6ef62745a4544421d6058` |
| benchmarks/evals/system-design-professionalization-heldout.json | `454f68119453cc652262abab699bb8d5804ef5ddb0466f9ad72c9c4a29e00c4f` |
| benchmarks/evals/history.json | `dd1ab60f1d2f4f022a7079dd56c1252e00c97b3bd773e42fb297a7cee7a6514c` |
| benchmark-report.md | `0b2bd3dc6bec401dd9fbec1e3470a69f2b543d9a7719c1becc4f4d63fb143652` |
| evals-report.md | `012126cfdec65ff16f109ac05cefbf9e2957f3c0979b56784035654709309368` |

Baseline revision `92d06c420f6a41f08e11579423e4e3eacdb7880d`. No live model/scorer/build/test/candidate-execution evidence was produced. Repair and source binding belong to T5; independent re-review must bind revised artifact hashes. Host token/pricing usage unavailable; review monetary cost unknown, not zero.
