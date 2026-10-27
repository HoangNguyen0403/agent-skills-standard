# T5 pilot contract — backend / system-design ROI evaluation

Status: **prepared, not executed.** No model call, no paid pilot, no candidate execution, no
efficacy or ROI claim. T4 is not activated and contributes no case. Binding of the four package
`evals/evals.json` files is gated on the lead's accepted/frozen notice for T1-T3 (see §8).

Authority: `docs/prd/prd-backend-system-design-roi-improvement.md` §5 T5 (steps 1-6), AC-ROI-12/13/14,
§7 verification commands, §8 economics; `.agent/sdd/backend-system-design-roi-improvement/lead-dispatch-contract.md`.
Ownership: `dispatch-locks.json` → `exclusive.T5`. Content authors T1-T3 must not read this file or
the held-out packet before the candidate freeze.

## 1. Prepared artifacts and frozen hashes

| Artifact | sha256 | Status |
| --- | --- | --- |
| `benchmarks/evals/backend-system-design-roi-skills.txt` | `41c57a510a98bdb61d25e37385ae70e3d2db8b655ce5569cc1ae3ebf17f801ac` | new, T5, unchanged since rev 1 |
| `benchmarks/evals/backend-system-design-roi-heldout.json` | revision 2 digest recorded in the freeze manifest after edits settle | repaired after independent review |
| `benchmarks/evals/backend-system-design-roi-pilot.md` | revision 2 digest recorded in the freeze manifest after edits settle | this file |
| Baseline source revision | `92d06c420f6a41f08e11579423e4e3eacdb7880d` | T0 frozen |
| `benchmarks/evals/system-design-professionalization-skills.txt` | `243f7c531e8f10c4d425057c2033d94cb31be74efed6ef62745a4544421d6058` | unchanged, regression only |
| `benchmarks/evals/system-design-professionalization-heldout.json` | `454f68119453cc652262abab699bb8d5804ef5ddb0466f9ad72c9c4a29e00c4f` | unchanged, regression only |
| `benchmarks/evals/history.json` | `dd1ab60f1d2f4f022a7079dd56c1252e00c97b3bd773e42fb297a7cee7a6514c` | unchanged |
| `benchmark-report.md` | `0b2bd3dc6bec401dd9fbec1e3470a69f2b543d9a7719c1becc4f4d63fb143652` | unchanged |
| `evals-report.md` | `012126cfdec65ff16f109ac05cefbf9e2957f3c0979b56784035654709309368` | unchanged |

Superseded receipts (kept for provenance, not evidence): heldout rev 1
`040e996682f548626304ed4405f997942b3f4f80fd091e789c280ac21cb98e17`; pilot rev 1
`c2175729907a6a4aacf2589882fc60b4c28a33cb1566a3a05af7c4693a43ff1c`. The independent review
observed a live pilot digest of `109f36d0…`, which matches neither revision because this file has
been edited since; **no digest in this table is the freeze receipt**. The authoritative live digests
are the ones written into `.agent/sdd/backend-system-design-roi-improvement/T5-report.md` after the
last edit to the three artifacts, and that manifest must be recomputed if any artifact is touched
again. A file cannot contain its own final hash.

All historical hashes equal `baseline-manifest.json` at capture time; recomputed live on 2026-10-26.
AC-ROI-14 evidence for this preparation step. Re-verify after final integration (T6), not before.

Freeze rule: any edit to `skills.txt`, `heldout.json`, the arm source sets or the grading rubric
invalidates the hash row above and requires a new freeze manifest before execution. Freeze is an
event recorded by the lead, not a claim made by this document.

## 2. Skill selection

`backend-system-design-roi-skills.txt` selects exactly the four packages changed by T1-T3 —
`system-design-building-blocks`, `system-design-resilience-ops`, `system-design-data-architecture`,
`system-design-integration-patterns` — plus two governing dependencies, `system-design-principles`
(operation identity / idempotency contract) and `system-design-estimation` (capacity arithmetic).
Structural check: 6/6 entries resolve to a package with `SKILL.md` and `evals/evals.json`
(4/7/14/4/7/4 evals, 12/17/31/12/17/14 assertions). It does not reuse the 11-package
professionalization selection.

## 3. Arms and context-delivery modes

| Arm | Skill content supplied | Source set |
| --- | --- | --- |
| A0 no-AGS | none supplied, none referenced in the prompt | prompt only. The runner sandboxes read-only over the repository, so skill files stay physically reachable and tool restriction is prompt text only (`execute.ts:58-76,141-150`). A0 cleanliness is an assumption, not an enforced guarantee: a transcript showing skill-file access is reported contaminated and excluded from the A1/A2 comparison, not scored as a no-AGS result. |
| A1 current-AGS | baseline bodies/references | baseline snapshot revision `92d06c4` |
| A2 improved-AGS | post-freeze candidate bodies/references | frozen candidate revision |

- Same model, same tools, same resource and time limits, same prompt text for all three arms. The
  only allowed difference is the skill content mount.
- Context-delivery mode is a frozen parameter, not a per-attempt choice:
  - **primary, `body-only`**: A0 none; A1/A2 receive `SKILL.md` bodies only, references not mounted.
  - **secondary, `references-inclusive`**: A1/A2 may open their package references. This is a
    separately priced 27-attempt stratum and is **not authorized** by this document.
- Report the mode with every result. Never pool modes in one comparison. `body-only` equalizes
  file-access affordances across arms and keeps A1 vs A2 attributable to body text; it understates
  reference content for A1/A2 and that limitation must ship with the result.

## 4. Design and randomization

3 core cases (`ROI-PAY-01`, `ROI-TEN-01`, `ROI-OVL-01`) × 3 arms × 3 independent repetitions
= **27 task attempts**. One attempt answers all three conditions of its case in one brief (base,
adverse, changed constraint), so each attempt yields 3 condition verdicts = 81 graded condition rows
across the pilot.

- Randomize execution order of the 27 attempts with a recorded seed and a published permutation
  table generated at freeze; no arm runs in a contiguous block and no case runs consecutively more
  than twice.
- Fresh context per attempt: no transcript reuse, no memory of a previous arm, no shared scratch
  directory between arms.
- Blinding: transcripts are stripped of arm identifiers, mount paths and model-facing metadata,
  relabelled `R-01..R-27` by a broker that does not grade. Only the broker holds the key. Graders
  report per-attempt verdicts; de-blinding happens after all 27 verdicts are recorded.
- Three repetitions exist to expose variance, not to establish significance. Report per-case and
  per-arm counts and dispersion; do not compute a p-value or claim deployment safety from n=3.

## 5. Grading lanes — kept separate, never substituted

**L1 lexical (existing scorer).** `scripts/evals/scorer.ts` assertion types only: `contains`,
`contains_any`, `not_contains`, `regex`, `file_reference`; pressure assertions map to `contains`
(`scorer.ts:475-483`); semantics v2 adds token and format tolerance in `containsV2`
(`scorer.ts:100-170`), selected per skill at `scorer.ts:441-446` — tolerance, not semantic
adjudication. L1 can pass a keyword-complete unsafe answer; that is the precondition AC-ROI-12
assumes, not what AC-ROI-12 measures. AC-ROI-12 measures that independent grading still fails such an
answer on the hard invariant. L1 results are reported as lexical pass rate only.

**L2 independent semantic grading.** A grader who did not author the guidance, has not seen arm
labels, and works from `heldout.json` `expected_invariant`, `mandatory_evidence`,
`hard_failures`. Rules:
- A hard failure in any condition makes the attempt unsound regardless of how many expected
  phrases appear (AC-ROI-12).
- Soundness requires the invariant plus at least 4 of 5 mandatory-evidence items, with no hard
  failure; an absent preferred phrase is never by itself a failure (AC-ROI-13). Variant-scoped
  evidence items are effectively mandatory because each is duplicated as a hard failure — the 4-of-5
  tolerance applies only to the base/adverse items, and that duplication is deliberate rather than a
  second independent gate.
- Paraphrase, different structure and different examples are acceptable if decision, invariant and
  verification survive.
- Grader output: per attempt × condition → `sound|unsound`, cited evidence spans, and for any hard
  failure its 1-based index in the case's `hard_failures` array plus the quoted clause. The packet
  carries prose failures without stable ids, so the index plus quote is the shared key. Grader
  disagreements are recorded, not averaged away; a disagreement blocks the verdict until a second
  independent grader resolves it.
- A statement that an invariant holds is not its implementation: the grader must point to the
  mechanism that enforces it in the answer, not to the claim.

**L3 executable candidate checks.** Only meaningful when the attempt produced a runnable artifact.
Criteria, run against the candidate's own code in an isolated lane:

| Case | Check | Pass condition |
| --- | --- | --- |
| ROI-PAY-01 | Stub processor records each debit call with its reference and timestamp, commits then drops the reply once, then serves settlement; harness kills and replays the worker | Exactly 1 debit recorded per billing instruction; the instruction never transitions unknown → failed/succeeded without settlement evidence; no second debit before settlement match |
| ROI-TEN-01 | Seed workspace B document, re-index with the stale mapping, query as workspace A through retrieval, rerank and cache; then delete A's rows and query again | 0 B-derived items in results, rerank input and cache entries for A; 0 revoked items returned after deletion on every path |
| ROI-OVL-01 | Drive admitted demand above capacity, stall one client cohort, drop a capacity share, then trigger drain | Rejections observed instead of growth; per-connection buffer never exceeds the declared ceiling; drain terminates within the declared deadline |

Harness constraints: the harness stubs only the external effect and fault timeline. It must not
contain the mechanism under test — if the grader's own sample implementation is substituted for the
candidate's code, the result is invalid, not a pass. A candidate that produced prose only has L3 =
`not-applicable` and the attempt is reported as runtime-unverified, never as passing.

## 6. Known runner gap (blocking for L3)

`scripts/evals/execute.ts:58-76,141-150,167-209` launches Codex with `--sandbox read-only`, captures
a final answer and parses usage from JSONL. Tool restrictions are prompt instructions, not
host-enforced guarantees. There is no isolated candidate lane, no container/process sandbox for
generated services, no effect-stub driver and no artifact-build step. Therefore:

- L1 and L2 are runnable with existing tooling.
- L3 is **not runnable** today. Runtime efficacy remains unverified for every arm.
- This task does not add a runner, change the scorer schema or extend a runtime API. The gap is
  returned to the lead as a design question for T7 authorization; closing it requires an approved
  design, not an improvised harness.

## 7. Cost accounting

- Unit: attempt. Every attempt counts, including failed, errored, retried, cancelled and rejected
  ones, and every actor that touched it (parent, worker, reviewer, integrator).
- Cost per accepted task = total incurred cohort cost ÷ accepted tasks. If zero tasks are accepted,
  the figure is **undefined / no accepted output** — never 0.
- Missing usage data is reported `unknown`, never 0, and blocks any savings claim.
- Reviewer, retry and integration effort are priced as separate line items, not folded into the
  27-attempt model bill. Human review/rework minutes require a maintainer-approved rate; absent a
  rate, report minutes only.
- The 27-attempt model bill, the L3 harness cost and the human review cost need separate approvals;
  none is granted here.

## 8. Binding status and post-freeze eval work

**Binding completed against the accepted source freeze.** Files changed inside the T5 lock:

| Package | Change |
| --- | --- |
| `system-design-integration-patterns` | eval 2 replaced entirely (fixed step count + universal compensation removed, constraint-driven selection); eval 5 added (unknown payment outcome, operation vs delivery identity, evidence before a second effect) |
| `system-design-data-architecture` | eval 15 added (tenant scope through retrieval/rerank/cache/job, revocation separated from erasure, snapshot/export denial, propagation bound and tombstone) |
| `system-design-resilience-ops` | eval 8 added (required vs optional dependency, mandatory checks fail closed, capacity measured after failure, no HA from replica count) |
| `system-design-building-blocks` | eval 5 added (stream buffer units, producer backpressure, resumable close, finite bounds); eval 6 added (conserved shares vs copied budget, atomic ledger with lease, declared bound type and partition mode) |

Every added assertion uses an existing type and schema field. `contains_any` anchors are lexical
grounding only: v1 substring matching can reject an equivalent paraphrase that omits the anchored
text. That is not evidence about semantic paraphrase acceptance; AC-ROI-13 belongs to L2 and remains
unmeasured. Unreliable overclaim regexes were removed rather than presented as denial-safe.

Remaining steps for T6, after approval:

1. Preserve the independent reviewer’s acceptance of all nine revision-3 calibration labels (9/9).
2. Run the prepared lexical matrix and preflight/audit pair only at the T6 consolidated gate.
3. Publish the freeze manifest: `skills.txt`, revision-4 `heldout.json`, this file, the four `evals.json`, and
   the A1/A2 source sets (body + reference hashes per package).

Do not start any check until the lead confirms the final gate. Paths are exactly those in
`dispatch-locks.json` `exclusive.T5`. Constraints that still govern any further eval edit:

- Add only existing assertion types; keep at least two independent assertions per eval.
- One assertion per material qualification, never a collapsed disjunction.
- Do not treat broad lexical overclaim guards as denial-safe. The unreliable regex guards in the
  revised evals were removed; semantic rubric review owns overclaim rejection. `not_contains` is
  substring-based and is unsuitable where a correct denial or quotation can contain the phrase.
- Lexical assertions are smoke checks only; they neither establish soundness nor guarantee
  acceptance of paraphrases.
- Never assert anything the eval prompt does not ask for; never pin incidental wording; never keep a
  replaced assertion to protect a pass rate.
- Dependencies are provisioned, so preflight, audit and the prepared matrix script are runnable. All
  of them stay T6-owned consolidated checks; provisioning must not change the lockfile or policy.
- No commit, push, release, generator run or paid model call is part of this work.

## 9. Candidate matrix — prepared, unexecuted, independently contested once

### 9.1 Status

No cell in this section is measured. There is no scorer receipt, no model output, no semantic
grading run and no executable check. The nine calibration candidates are documentary rubric anchors;
their verdicts are manual expectations, and an expectation is not discrimination evidence.

### 9.2 Prepared no-model lane, owned by T6

- Script: `.agent/sdd/backend-system-design-roi-improvement/T5/lexical-candidate-matrix.ts`
  (prepared by T5, **not executed, not deleted**).
- Run after the lead's accepted/frozen notice, from the repository root, local dependency only:
  `rtk node --import tsx .agent/sdd/backend-system-design-roi-improvement/T5/lexical-candidate-matrix.ts`
- Lane A: scores the nine answers against the existing package eval assertions for the same failure
  family. It is informational only — full-eval acceptance requires every assertion of an eval written
  for a different prompt to pass, so a near-zero result is expected by construction and proves
  nothing about assertion quality. The useful output is the per-assertion tally.
- No provisional Lane B gate is retained: candidate-specific positive/negative lexical probes run
  against `checkAssertion` for T6 smoke only. Their expected booleans do not establish semantic
  discrimination or general denial safety.
- Writes `.agent/sdd/.../T5/lexical-candidate-matrix.json`. `node_modules` is now provisioned, so the
  script is runnable; execution is deliberately reserved to T6 with the consolidated checks.

### 9.3 Independent adjudication status

Two independent reviewers have now examined this material; neither ran anything.

- Reviewer A (sealed rubric audit) agreed with all nine revision-1 labels, and separately found the
  revision-1 lexical gate defective: a `not_contains` given an array is stringified by
  `checkAssertion` (`scorer.ts:193-194`) and can never fire; one gate assertion was satisfied by the
  opposite statement; one required variant-only content under a base/adverse label; a collapsed
  disjunction covered two distinct qualifications; and Lane A's denominator and finding text were
  wrong.
- Reviewer B (`T5-rubric-review.md`, CHANGES REQUESTED) judged all six expected negatives genuinely
  unsafe **and all three designated positives unsound or unresolved** — zero valid positives in
  revision 1. Its blockers: the payment positive retried a non-deduplicating provider before its
  hold; the tenant positive trusted corrupted derived scope and left a snapshot/export window; the
  overload positive had unreproducible residual arithmetic (36% vs 40%) and no stream-to-request
  mapping; the payment changed constraint removed capabilities the base never had, so the contrast
  was invalid; and the report carried a stale pilot digest.
- The report's own revision-1 claim that the six negatives "prove" lexical discrimination was also
  wrong: those verdicts were manual, and the gate could not produce the reject it expected.

Revision 2 repaired the packet-level blockers: base contracts now declare the capabilities the
variants remove, each positive candidate prohibits reissue until authoritative finality, the tenant
positive re-authorizes against authoritative ownership and gates snapshot/export/restore reads before
rebuild, and the overload case states its stream-to-request mapping, separates mean service time from
p99, and uses `400 x 2/3 x 0.6 = 160 requests/s`. Revision 3 additionally makes ingest readiness
independent of optional summarizer health; summary work is shed while bounded ingest continues.
Independent reviewer re-adjudication accepted all nine revision-3 calibration labels (9/9). This is
calibration review evidence only; no execution or L3 outcome is implied.

### 9.4 Matrix

`L2 expected` = author-proposed packet verdict, not independent evidence. L1 lexical smoke and L2
semantic calibration are separate; L1 cannot establish soundness or paraphrase acceptance. L3 is
unavailable.

| Candidate | Type | L2 expected | Re-adjudicated | L1 | L3 |
| --- | --- | --- | --- | --- | --- |
| ROI-PAY-01-C1 | keyword-complete unsafe | unsound | accepted | not measured | n/a |
| ROI-PAY-01-C2 | correct alternate phrasing | sound | accepted | not measured | n/a |
| ROI-PAY-01-C3 | mechanism contradiction | unsound | accepted | not measured | n/a |
| ROI-TEN-01-C1 | keyword-complete unsafe | unsound | accepted | not measured | n/a |
| ROI-TEN-01-C2 | correct alternate phrasing | sound | accepted | not measured | n/a |
| ROI-TEN-01-C3 | deletion-as-source-only | unsound | accepted | not measured | n/a |
| ROI-OVL-01-C1 | keyword-complete unsafe | unsound | accepted | not measured | n/a |
| ROI-OVL-01-C2 | correct alternate phrasing | sound | accepted | not measured | n/a |
| ROI-OVL-01-C3 | unbounded-numeric answer | unsound | accepted | not measured | n/a |

Use: L1 records only which lexical assertions fire. It must never award or deny soundness. When L3
exists, C1/C3 must fail the case's executable check and C2 must pass it.

## 10. Acceptance and reporting rules

Reported separately, never collapsed into a score: critical invariant failures per arm, accepted-task
rate, median human review/rework minutes with counts and dispersion, wall time, total incurred cost,
and unverified lanes. Proposed adoption target (hypothesis, from PRD §5/§10): no observed critical
invariant violation, no accepted-task-rate regression, ≥20% lower median review/rework minutes than
current AGS. A 27-attempt diagnostic cannot establish safety or statistical significance; label it
as a diagnostic pilot. Failed or incomplete arms are reported as failed/unknown, not excluded.

## 11. Non-goals

No scorer/schema extension, no assertion-type addition, no new platform or API, no candidate
sandbox implementation, no paid model execution, no T4 activation, no cloud/chaos tooling, no
generator run, no edit to historical fixtures, runs, transcripts or root reports, no commit/push or
release, and no edit to any skill body or reference (T1-T3 own those).
