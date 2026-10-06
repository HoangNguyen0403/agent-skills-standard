# Task 2 — Independent SPEC and QUALITY Review

## Final bounded verdict — v3

- **SPEC: PASS for bounded Task 2 scope.** R1 and R2 are closed by the inspected corrective source and behavioral cases. Original F7/N1/NV1 assessments remain valid.
- **QUALITY: PASS for bounded Task 2 scope.** No confirmed defect in the final type delta. Parent-observed strict compiler evidence covers the final affected import closure; the full Node 20/text runtime results and actual smokes precede these final edits and are not represented as post-v3 execution.
- **Remaining integration gap:** integrated root runtime after final generation remains pending parent verification. The previously pending combined Node 20 eval lane has parent-observed pre-type-closure GREEN evidence. No approval or publication is supplied.

### Authoritative scope and evidence basis

Authoritative final package: `.agents/sdd/pr223-remediation/task-2-review-v3.diff`, five-file cumulative scope, superseding v2. Final review is bounded to the v3-versus-v2 type closure: `manifest.ts` adds the existing compromised-skill array annotation under explicit parent Task 2 ownership; `execute.ts` narrows the existing baseline-run fallback; `reporter.ts` corrects the existing evidence-mode return annotation/import. The v3 package retains the same test and impact diff target hashes as v2. Prior v2 review read all corrective diff ranges and behavior/history cases; those closures remain valid. Historical v1 findings and reproduction facts remain below, with their original line references and superseded verdicts.

### Final type-delta assessment

**Status:** PASS; no new finding; confidence **99/100** for the bounded source assessment.

| Final delta | Evidence and assessment |
| --- | --- |
| Existing array annotation | `manifest.ts:293` uses `ManifestV2["compromisedSkills"]`, whose existing element contract is `CompromisedSkillRecord[]` (`types.ts:139`). The initializer remains `[]`; no new allocation, runtime behavior, public property or historical write is introduced. |
| Manifest discriminant narrowing | `execute.ts:307–311` accesses `baselineRunId` only after `schemaVersion === 2`; the field is defined only on `ManifestV2` (`types.ts:123–141`). Explicit metadata still takes precedence via `??`; valid v2 baseline runs remain incremental and other valid v2 runs fresh. Historical v1 generation is already rejected by the unchanged protocol gate before this fallback, so the added guard does not extend historical execution. |
| Existing evidence-mode contract | `reporter.ts:15,264–267` returns `EvidenceMode \| "unknown"` using the existing union (`types.ts:10`), including existing `regraded`. The function already returned `run.metadata.evidenceMode`; the runtime branches are unchanged. This fixes the narrow annotation rather than adding a mode or API. |

**Why:** These changes align local types with established contracts without changing provenance classification, recovery policy, constructor behavior, evidence labels or stored history. The final baseline discriminator is an explicit existing-model narrowing, not a new runtime feature.

**Check:** Parent reports the affected task-runner/reporter/execute/impact import closure passed its explicit strict compiler invocation in **1.11s**, with no diagnostics, using root NodeNext/ES2022 settings and `--ignoreConfig --noEmit --strict --skipLibCheck`. The full invocation was not supplied here and is not reconstructed. This reviewer did not rerun it or review unrelated Task 1 implementation. Earlier runtime evidence is recorded separately below.

### R1 closure — independent facts survive category/group aggregation

**Status:** CLOSED; former severity **MAJOR**; closure confidence **99/100**.

**Evidence (v3 source; unchanged closure logic):** `reporter.ts:270–290,309–374,453–475,518–528`; `evals-v2.test.ts:931–1028`.

`ProtocolFacts` now carries the known protocol set, unresolved contributor count and independently established heterogeneity. Leaf classification retains both known versions and missing contributors. `mergeProtocolFacts` unions known versions across selected partitions and sums unresolved counts before deriving the headline. Unknown contributors alone do not establish heterogeneity; known heterogeneity does not erase uncertainty. The summary emits a separate unresolved count and both notices when applicable.

**Why:** This removes both original information-loss paths: `[v1,v4,missing]` stays mixed with one unresolved contributor; `[v1,missing]` in category A plus `[v4]` in category B also stays mixed with one unresolved contributor. Known skill/category labels remain independently readable; missing leaf rows remain unknown.

**Check:** The group and cross-category regressions assert mixed classification, unresolved count `1`, and relevant leaf/category identities without pinning notice prose. Source inspection confirms both independent notice guards. Shared root/archive/per-run builders use these facts; CLI/MCP passthrough consumers require no duplicate implementation.

### R2 closure — history presentation uses the full physical run

**Status:** CLOSED; former severity **MAJOR**; closure confidence **99/100**.

**Evidence (v3 source; unchanged closure logic):** `reporter.ts:531–554,694–700`; `evals-v2.test.ts:1030–1097,2494–2622`.

The history renderer builds its lookup from full `allResults`, not selected category projections, and resolves protocol/count from the matching physical run. An available partial-provenance run overrides a stale stored v4 label in presentation. If the physical run is unavailable, the recorded label is retained with unresolved count `unknown`, not a fabricated count of zero.

**Why:** An all-v4 latest-category headline can coexist truthfully with a mixed, partially unresolved earlier physical run. Rendering no longer treats an old stored label as proof of resolved leaf provenance.

**Check:** The new physical-history case replaces the old angular projection with later v4 evidence, expects current headline v4 but physical history `mixed` / unresolved `1`, and compares serialized physical-run/history state before and after. The existing complete mixed-history case remains. The correction changes presentation only: `syncHistoryAndArchive` retains its pre-existing behavior; no stored-label repair or historical snapshot mutation is introduced.

### Retained acceptance and updated verification ledger

- **F7 remains PASS:** `execute.ts:217–225` still rejects composite recovery before configuration/runner construction at `235–236`, answer writes or metadata writes. The incomplete-recovery boundary assessment below is unchanged.
- **N1 remains PASS:** `impact.ts:16–21` still uses the existing `EvidenceMode` type-only import.
- **NV1 remains PASS as evidence qualification:** `execute.ts:141` and `reporter.ts:403` distinguish prompting from host enforcement and keep tool-free execution unverified. No actual tool use, host prohibition or historical tool-free certification is claimed.
- **Node 20 constructor remains source-correct:** `execute.ts:155–203` still uses ordinary `new Promise`; the supported engine floor and model defaults are unchanged. Parent-observed full Node 20 GREEN predates the final type-closure edits; post-generation integrated root runtime is still pending.

Authoritative **parent-observed** evidence, not rerun by this reviewer. Runtime rows below precede the final v3 type-closure edits; the compiler row covers the final affected closure:

| Evidence | Result |
| --- | --- |
| Three R1/R2 corrective cases before repair | **3/3 expected RED**, 0.35s |
| Full text suite after repair, including the three cases | **49/49 GREEN**, 0.78s |
| Actual temporary engine/report smoke | **PASS**, 0.38s: composite caused no runner calls/writes; known-v3 plus exported unknown produced unknown headline |
| Earlier historical CLI verification | **3/3 PASS**, 1.92s |
| Earlier Node 20 focused cases | **2/2 PASS**, 1.11s |
| Full combined Node 20 eval lane, previously pending at v2 review | **108/108 PASS**, 9.32s; before final type-closure edits |
| Final strict compiler, affected import closure | **PASS**, 1.11s; no diagnostics |
| Integrated root runtime after final generation | **PENDING parent** |

The original simple known-plus-unknown test is not present in the retained v2/v3 target; original F8 behavior is covered by the parent's actual exported-unknown smoke and independently checked fallback/merge source. No replacement wording assertion or style finding is requested. Earlier RED/GREEN and incidental-prose-failure facts remain in the historical record below.

### Compliance, limits and bounded retrospective

MCP workflow/source standards were reloaded; MCP compliance audit and `get_session_cost(code-review)` were called before delivery. Audit lists the prior ten skills plus `common/common-session-retrospective` and `common/common-learning-log`. Review-feedback and evidence-completion guidance were also read. Exact host tokens/rates/total cost remain unavailable.

Retrospective classification: implementation procedure/data-model information loss, not an invalid original review or a demonstrated skill-trigger miss. The concrete lesson is to preserve independent provenance facts until presentation and resolve physical history from full runs rather than projections. No registry, `AGENTS_LEARNING.md`, policy or learning artifact was changed; authorization permits this report only.

No commands/tests/build/lint/format, source writes, delegation, approval, publication or host-tool experiment were performed. **Next:** parent verifies integrated root runtime after final generation; no further Task 2 corrective source action is identified here.

---

## Historical initial review — v1 (superseded; retained below)

All findings, assessments, evidence gaps and next actions below describe the initial v1 review, not outstanding v3 findings.


## Initial verdict

- **SPEC: CHANGES REQUESTED.** F7, N1, NV1 and the Node 20 constructor correction satisfy the inspected source contracts. F8's original known-v4-plus-unknown headline defect is fixed, but unresolved provenance is not preserved consistently through mixed category/group summaries and physical-history presentation.
- **QUALITY: CHANGES REQUESTED.** Two reporting consistency defects remain below. Parent-observed focused GREEN evidence is accepted; it does not cover these input shapes. Complete Node 20 lane integration remains pending, not a confirmed constructor defect.
- No approval, publication, execution, delegation, or source modification performed. Only this report was written.

## Scope, trust and standards

Read the supplied `task-2-review.diff` first, then `task-2-brief.md`, `task-2-report.md`, and plan lines 11–36. Reviewed current `execute.ts`, `reporter.ts`, `impact.ts`, related composition/recovery/scoring/verification paths, reporting regressions, CLI/MCP report consumers, and affected Node 20 pipeline configuration. Source/worker narratives are **semi-trusted** review data; findings are anchored to source, not worker success claims. The supplied diff is a cumulative workspace snapshot, not an independently established whole-branch diff.

MCP audit confirmed these loaded skills: `common/common-best-practices`, `common/common-code-review`, `common/common-llm-security`, `common/common-owasp`, `common/common-performance-engineering`, `common/common-security-audit`, `common/common-tdd`, `nextjs/nextjs-data-access-layer`, `nextjs/nextjs-testing`, `typescript/typescript-language`. Loaded MCP `code-review` workflow, local `code-review` and session-entry skill; applied `docs/review-policy.md` and trust-review policy. Audit's extension-only NestJS/React/Angular coverage warnings do not identify framework code in this Node script scope. No framework conversion or unrelated rules remediation is warranted.

## Findings

### R1 — [MAJOR] Mixed-category classification drops unresolved contributors before warning aggregation

**Status:** confirmed static defect; confidence **100/100**. **Gate:** SPEC F8 / QUALITY correctness and edge cases.

**Evidence:** `scripts/evals/reporter.ts:271–282,313–325,404–415,472–483`; category/group partitioning at `97–113,159–171`.

For a supported category result containing three skills with leaf protocols `[governing-skill-v1, neutral-skill-v4, undefined]`, `classifyContributorProtocols` returns `mixed` at line 279 before retaining the missing contributor's uncertainty. The executive summary sees only `mixed`; `hasUnknownProtocols` is false and the unresolved-provenance notice is omitted. The per-skill row still says `unknown`, but the aggregate never discloses that its mixed evidence also has unresolved provenance. This affects category inputs and `all`/selective group inputs projected to that category.

The same lossy reduction also hides independently proven heterogeneity across partitions: category A `[v1, undefined]` becomes `unknown`, category B `[v4]` becomes `v4`; the combined headline is `unknown` with no cross-protocol notice, although known v1 and v4 both contribute.

**Why:** Known heterogeneity and incomplete provenance are independent facts. A single mutually exclusive label discards one of them before downstream reporting. The brief requires unresolved contributors to remain accounted for and uncertainty to be disclosed consistently; unknown must neither prove heterogeneity nor disappear when heterogeneity is already established.

**Fix:** Retain known protocol versions and an independent unresolved-contributor flag across the selected category/skill projections. Derive the summary and each applicable notice from those facts. Preserve `mixed` when multiple known versions prove it, and disclose unknown contributors independently.

**Check:** Add behavioral cases for known-v1 + known-v4 + missing leaf provenance within one category/group, and known-v1 + missing leaf in one category plus known-v4 in another. Current regression `evals-v2.test.ts:834–874` covers two separate categories without leaf provenance; existing mixed-protocol case `2271–2399` has complete leaf provenance. Neither exercises these combinations. Assert semantic classifications/disclosures, not exact notice prose.

### R2 — [MAJOR] Physical history can still certify v4 after current leaf resolution becomes unknown

**Status:** confirmed static inconsistency for supported inputs; confidence **98/100**. No claim that a currently committed history record exhibits it. **Gate:** QUALITY / F8 reporting-consumer consistency.

**Evidence:** `scripts/evals/reporter.ts:185–224,285–310,485–495,637–643`; `scripts/evals/types.ts:197–207,243–255`.

The revised resolver correctly returns `unknown` for a run with an incomplete provenance map, even when `metadata.protocolProvenance` says v4. However, `syncHistoryAndArchive` only fills an existing history record's protocol when that field is absent and the resolved value is known (`202–203`). An existing v4 history entry is retained. `buildEvalsReportMarkdown` then prints that stored v4 value directly (`494`) rather than qualifying it against the supplied physical run. Thus one freshly generated report can display an unknown current headline/category and an unqualified v4 physical-history row for that same run. The public report builder also accepts this history/results combination directly.

**Why:** A corrected resolver does not correct consumers that reuse earlier inferred classifications. Physical history must describe the whole physical run, not its latest category projection, but an old recorded label is not proof that missing leaf provenance is resolved.

**Fix:** Preserve historical records and evidence bytes. In the generated history presentation, qualify a recorded protocol against the available full physical run's resolved provenance, or display recorded versus currently unresolved provenance separately. Do not replace the physical run's protocol with a later selected category's protocol or rewrite historical snapshots.

**Check:** Supply a partial-provenance physical run plus an existing known-v4 history record to the report builder; confirm it does not present that record as unqualified resolved v4. Preserve the existing complete mixed-physical-history case at `evals-v2.test.ts:2367–2395`. Existing reporting tests do not cover stale known history paired with newly unresolved leaf evidence.

## Acceptance assessment

| Item | Assessment | Exact evidence |
| --- | --- | --- |
| F7 composite immutability | **PASS, static + parent focused evidence** | `execute.ts:217–225` rejects before worker configuration/runner construction (`235–236`), source reads, answer writes (`293–295`) and metadata writes (`328,343`). Covers explicit composite mode and historical `Composite immutable evidence` marker. |
| Incomplete composite recovery | **PASS for inspected supported boundary** | `manifest.ts:360–382` resume only reads/checks; CLI `index.ts:76–103,133–173` reaches the guarded executor before scoring/report writes. Missing answers make `scorer.ts:581–586` reject before snapshot/results writes. `reporter.ts:63–94` excludes incomplete physical runs. `compose.ts:84–156,235–238` verifies sources before output creation and refuses overwriting an existing composite. Selective baseline recovery (`impact.ts:410–448`) cannot select normal `all` composites. |
| Historical reading/verification | **UNCHANGED in supplied task delta** | `verify.ts:90–109` checks snapshots and re-scores with both write flags false. Existing v1/v3 verification regression at `evals-v2.test.ts:2136–2269` checks byte-exact preservation. No historical paths occur in the supplied task diff; no snapshots were written by this reviewer. |
| F8 original known + unknown categories | **PASS** | `reporter.ts:404–415` retains unknown category classifications; `478–483` calls them uncertainty, not proof of a different protocol. Test `evals-v2.test.ts:834–874` retains headline/category behavior assertions. |
| F8 all contributors/consumers | **FAIL** | R1 loses independent uncertainty/known-version information; R2 leaves an unqualified stale physical-history label. Partial leaf maps otherwise correctly override metadata and missing skill rows resolve unknown (`288–295,328–341`). |
| N1 type import | **PASS, static** | `impact.ts:16–21` imports existing `EvidenceMode` using `import type`; annotation at `502`, definition at `types.ts:10`. No compiler failure or compiler success is inferred. |
| NV1 truthful label | **PASS as evidence qualification** | `execute.ts:141` distinguishes prompting from host enforcement; `reporter.ts:354` labels transcript assertions, not executable verification, and explicitly says tool-free execution is unverified. `codexExecArgs` requests read-only capability (`52–70`); runner retains the final answer/usage, not a tool-use audit (`184–202`). Actual host enforcement or tool use was not exercised or certified. |
| Node 20 constructor | **PASS, static; integration PENDING** | `execute.ts:155–203` now uses ordinary `new Promise`, preserving spawn/output/error/usage/cleanup behavior without `Promise.withResolvers`. CI selects Node 20 (`ci.yml:64–74`); engines remain `>=20.0.0` (`package.json:110–112`). Parent observed Node 20.20.2 has `withResolvers === undefined`; no engine-floor/model-default change is introduced. |

### Reporting-consumer coverage

Inspected executive summary, category and skill rows, complete/all and selective projections, physical history, per-run report, archive and root report generation (`reporter.ts:97–235,345–660`). Archives and per-run reports reuse the same builder; both inherit R1. Root generation additionally inherits R2. CLI `commands/evals.ts:60–70` and `services/EvalsVerifier.ts:606–609`, and MCP `tools/index.ts:850–865` and `services/EvalsIndex.ts:573–575`, pass through the root report rather than independently reclassifying provenance. They require no duplicate classification implementation.

## Evidence and remaining gaps

- Parent observations accepted without rerunning: original two intended RED failures; full target 46 passing / one incidental prose failure; removed that prose assertion; amended two focused behavior regressions PASS in 0.44s. Removal does not require re-pinning wording.
- Worker report still says pending verification; the parent-provided observations are newer evidence. Focused GREEN does not establish a clean amended full target or complete Node 20 eval lane.
- Pending parent integration evidence: complete Node 20 lane, historical `evals:verify -- --all`, and actual temporary compose/recovery/report smoke from the brief. This reviewer ran no commands/tests/build/lint/format or host-tool experiment.
- R1/R2 are deterministic source-path findings, not observed runtime smoke outputs. New behavioral verification belongs to the implementation/integration owner.
- LSP references request returned `No language server found for this action`; consumer mapping used read-only repository search and source reads instead. No type diagnostics were run.
- Skill compliance audit completed before delivery. Cost tool ran for `code-review`; exact host token usage, rates and total cost are unavailable. No estimated billing total is asserted.

**Next:** Resolve the two reporting-consistency findings without rewriting historical evidence, verify their behavioral cases, and finish the parent's pending Node 20/integration evidence. No approval is supplied by this review.
