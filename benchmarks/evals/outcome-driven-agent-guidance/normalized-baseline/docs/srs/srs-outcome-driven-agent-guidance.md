# Technical Design: Outcome-Driven Agent Guidance

Status: Normalized-concept routing source implementation approved; caller qualification and executable/runtime work remain gated

- Delivery mode: extended; source: `docs/prd/prd-outcome-driven-agent-guidance.md`.
- Authority: the operator's latest “Check and continue” answered the specific normalized-concept routing implementation question. It authorizes only the presented five-file source change. Earlier bounded design approval supplied no runtime/provider/spend/publication authority; those grants remain absent.
- Design owner: parent orchestrator. Component analysis: independent bounded routing and executable-host investigations. Validation owner: separate reviewer after integration.
- Scope: resolve T2 routing-contract and T3/T4 execution-mechanism prerequisites. Existing T1/T3 source-only acceptance stands; no qualification is inferred.

## Decision brief

Decision: use caller-normalized associated concepts through the existing keyword API, as presented in the latest routing implementation question. The approved AC09/10 input boundary is normalized concepts, not raw-prose recognition. AC15 retains separate caller-association qualification. Do not repurpose the no-tools evaluator or create a refusal-only broker as a substitute for a working executable adapter.

Confirmed source facts:

- `mcp/src/services/SkillIndex.ts:197–213` matches declared keyword phrases, not semantic intent.
- The ordinary evaluator's function accepts prompt text and returns answer/usage; it supplies one skill body and removes its temporary output directory (`scripts/evals/execute.ts:20–22,141–209`).
- L3 rejects a network policy other than `none` (`scripts/evals/l3/runtime/runtime.ts:204–217`). Its post-exposure interface is exactly `none`, with results recovered after stopping the guest (`runtime/types.ts:336–345`).
- VZ guest configuration has serial input from `/dev/null` and no network, socket or directory-sharing devices (`runtime/vz/Runner.swift:359–377`). It cannot supply live model-response input unchanged.
- `NodeProcessIO` uses non-shell detached subprocesses, bounded output and cancellation/group termination (`runtime/process-io.ts:131–220`); these are process controls, not filesystem/network confinement.
- Guest `ProviderStubLike` is debit/lookup/settlement handling, not a model transport (`runtime/guest/controller.ts:61–65`).
- Local path lookup found `/usr/bin/sandbox-exec` and `/Users/nguyenhuyhoang/.npm-global/bin/codex`. A separate batched Codex help request timed out at 30 seconds. Neither path existence nor source flags prove usable confinement or provider access. No safety probe or paid model request was run.

Impact if wrong: irrelevant/missed skill delivery; contaminated comparisons; private resource exposure; unobserved side effects; false efficacy claims. These are reasons to preserve a gated design, not to bypass it with a passing source suite.

## Trace and existing baseline

REQ-04 / AC-09–10 govern routing. REQ-05 / AC-02–08, AC-11–12 govern the qualification inputs and evidence. REQ-06 / AC-13–14 governs later distribution/status. The definitions remain in the PRD; this document does not narrow them to current passing cases.

Retained source/evidence: `benchmarks/evals/outcome-driven-agent-guidance/baseline/manifest.json`, `t0-review.md`, `t2-review.md`, `design-review.md`, `parent-verification.md`, `runtime-design-proposal.md`.

## Architecture and change boundary

Two separate components, independently approvable:

- Routing: one canonical `flutter cicd` keyword and consistent caller guidance for associated requested-work concepts; existing parser/schema/matcher/ranking/composites remain unchanged. Exact proposed files and input-boundary decision are below. No skill-ID special case or semantic classifier.
- Executable comparison: no inspected approved host/model callback mechanism meets the full plan. A separate pilot boundary would be required, but implementation is held rather than introducing a nonworking default host or refusal-only scaffolding. `EvalRunner`, `GenerationProtocol` and the L3 post-exposure contract remain unchanged.

Existing public interfaces keep their semantics until a reviewed explicit delta is approved. No adapter fallback may silently switch account/model, enable network in L3 or broaden host permissions.

## Technical requirements

### SRS-001 — Routing representation preserves intent boundaries

- Source: REQ-04, AC-09–10, AC-15. Priority: Must. Status: Approved for normalized retrieval source implementation; caller qualification pending.
- Behavior: callers supply the associated concept as `keywords: ["flutter cicd"]`; the real index retrieves Flutter CI/CD with composites while unrelated concepts do not trigger it. Raw-request association is separately evaluated under the caller-selection protocol, not implemented by phrase enumeration, split-token joining or a semantic matcher.
- Failure: if association cannot be inferred under that contract, report the limitation; do not silently claim broad semantic recall or narrow AC-10 to observed positives. Literal keyword matching for other skills is unchanged. Canonical retrieval tests alone never prove caller association; qualification follows the separate frozen caller-selection protocol.
- Security/compatibility: selection never grants tool authority. No parser, schema or ranking change is proposed; existing literal matching for unrelated skills remains unchanged.
- Verification: real-registry integration — frozen positive/negative routing corpus and parser/distribution consumer checks, recorded in the T2 qualification receipt.

### SRS-002 — Frozen bundles are delivered without oracle exposure

- Source: REQ-05, AC-11. Priority: Must. Status: Draft.
- Behavior: current/candidate bundles have ordered allowlisted resource paths, byte counts/digests and a fixed source identity. Every trial records what was delivered separately from observed loads, under identical discovery rules.
- Failure: missing/different bytes or incomplete load coverage prevents a qualified comparison. Bundles exclude answer transcripts, hidden rubric/oracle material, expected-observation manifests and unrelated repository resources.
- Security: worker has no write access to evidence, grant, hidden oracle or sibling trial state. Predeclare which loads must be observed; an intentionally unopened on-demand reference is not a missing load. Missing capture for an actual or required load invalidates that coverage claim.
- Verification: isolated fixture integration — deliberate missing, substituted and oracle-containing bundle controls in the pilot evidence manifest.

### SRS-003 — Tool execution has a proved host boundary

- Source: REQ-02, REQ-05, AC-03, AC-05–07, AC-11. Priority: Must. Status: Blocked on host mechanism.
- Behavior: an explicitly approved mechanism confines actual worker tools to the trial fixture; provider calls/credentials belong to a host-mediated route unavailable to worker code. Worker-tool egress is separately restricted and observed. Only scope-authorized effects are possible.
- Failure: no launch if the necessary capabilities, provider route or resource grant are absent. Read-only flags, a working-directory setting, prompts and process-group controls cannot substitute for proof.
- Security: no host policy changes, credential copying, broad shell execution or unreviewed new guest communications. Existing L3's no-channel invariant remains unchanged.
- Verification: approved instrumented security scenario — independently observed allowed write/test and denied outside-scope write/egress/oracle access, after explicit interactive approval of the safety check.

### SRS-004 — Observations survive failure and cancellation

- Source: REQ-05, AC-06–08, AC-11. Priority: Must. Status: Draft.
- Behavior: actual actions and independent expected/final state bind to trial/input/configuration identity. On timeout, cancellation or capture loss, stop owned execution, retain partial evidence and reconcile protected target state before replacement.
- Failure: incomplete observation coverage yields unknown/infrastructure-invalid coverage status, never proof that no unauthorized effect occurred. A task failure cannot disappear through invalidity classification.
- Security: evidence is written by the host observer, not supplied as a generated transcript by the model. Cleanup cannot erase the sole copy or affect unrelated processes.
- Verification: fault-injected isolated integration — capture loss, output limit, timeout, process cleanup and uncertain-effect controls in pilot receipts.

### SRS-005 — Qualification retains all attempts and honest usage

- Source: REQ-05, AC-11–12. Priority: Must. Status: Draft.
- Behavior: predeclare 144 planned slots separately from the maximum launched-attempt count, repeat/replacement rules, model/profile/effort, order/blinding, resource caps and independent rubric. Count every launched task failure/timeout/incompletion; disclose justified infrastructure invalidity separately. Publish both all-attempt and valid-task success rates.
- Failure: no launch or promotion with missing authorization; no after-results threshold changes or silent dropped arms. Unknown pricing/usage remains unknown; worker/reviewer actor costs must not be omitted from savings claims.
- Security/compatibility: do not rename prompt-only as current-guidance baseline or treat textual checks as artifact/safety evidence. Existing evaluator reports remain readable unchanged.
- Verification: evidence/report contract integration — incomplete/mismatched attempt inventory and missing-usage controls bound to the frozen manifest.

### SRS-006 — Promotion is independent of source acceptance

- Source: REQ-06, AC-13–14. Priority: Must. Status: Draft.
- Behavior: only qualified approved canonical revisions enter staged generation/copyback. Preserve manifests and independently verify intended consumer discovery and parity. Record repository, activation, acceptance and release separately.
- Failure: T4 blocked/inconclusive or a known acceptance regression holds T5. No handwritten mirrors or recovery flags to bypass ownership/provenance.
- Security/compatibility: rollback is reviewed reversal of owned canonical/export changes while retaining evidence; no destructive worktree reset or broad cleanup.
- Verification: distribution integration — staged approved output inventory, parity/discovery receipt and explicit status review.

## Proposed routing delta and owner decision

The current API already asks for concept words (`mcp/src/tools/index.ts:213–229`); static index guidance already interprets indirect phrasing by intent (`cli/src/services/IndexContentBuilder.ts:96–104`). Reuse that boundary instead of introducing an association schema across parser/generator/sync consumers.

Approved bounded source changes:

| File | Proposed change |
| --- | --- |
| `skills/flutter/flutter-cicd/SKILL.md` | Replace the rejected phrase enumeration with canonical `flutter cicd`; preserve file declarations. |
| `mcp/src/tools/index.ts` | Clarify associated, normalized requested-work concepts as `keywords: ["flutter cicd"]`, not separate `"flutter"`/`"cicd"` items. No signature/schema change. |
| `mcp/src/server.ts` | Align tool description with actual literal boundary matching and caller normalization; unrelated/background/quoted references do not manufacture requested association. |
| `cli/src/services/IndexContentBuilder.ts` | Replace the contradictory literal “words appear” rule and add the associated-concept example; retain other keyword semantics. |
| `mcp/test/SkillIndex.spec.ts` | Exercise canonical concepts, ordinary literal matching, unrelated negatives and composites. Preserve raw-query failure evidence; do not delete/repin failing raw requirements to claim acceptance. |

Examples for independent caller-selection assessment, not observed model results:

- “CI pipeline for a Flutter app”, “GitHub Actions workflow for a Flutter app”, “pipeline setup for Flutter applications” → associated `flutter cicd`.
- Prompt/workflow authoring, Flutter navigation, “Flutter navigation workflow and Go deployment pipeline” → no Flutter CI/CD concept.
- “Do not configure Flutter CI; improve navigation”, or a quoted background discussion of the phrase → no requested Flutter CI/CD work.
- “Fix CI that does not build Flutter” → genuine CI work; do not implement blanket negation/quote stripping.
- “Flutter app and deployment pipeline” → association unresolved; use actual task context rather than manufacture it.

Scoped decision: the latest operator “Check and continue” answered the specific approval question for normalized associated-concept retrieval and the five-file implementation. AC09/10 carry that input boundary; AC15 retains caller-association qualification. Prior raw-query failures remain evidence and are not reclassified as passing results. Before qualification freeze inputs/context, catalog/instruction bytes, expected concept membership, missing/extra-concept scoring, actual configuration and retained real tool arguments per `benchmarks/evals/outcome-driven-agent-guidance/caller-selection-protocol.md`. Hand-normalized fixtures or generated intended calls cannot substitute for observed caller selection. This approval adds no runtime, paid-run, distribution or activation authority.

The file declarations are unchanged, but production metadata currently lacks YAML routing. Fallback-derived tests are not evidence of production YAML discovery. Do not expand this slice into file-routing repair or claim absent discovery works.

## Executable host finding and conditional interfaces

No inspected mechanism can provide the full live callback/tool/observation boundary unchanged. The ordinary runner discards action capture; L3's no-channel guest cannot receive model responses; process lifecycle plumbing is not confinement. A process sandbox executable exists, but no approved probe has established its capabilities.

If a real approved host is identified, a separate proposed directory `scripts/evals/guidance-pilot/` would own `contracts.ts` (trial/bundle/tool/event/receipt), `broker.ts` (admitted loop), `host.ts` (provider/tool/observer operations), `evidence.ts` (exclusive immutable capture) and focused offline controls. This is a proposed interface boundary, not an authorized implementation slice. Do not create stub host methods, no-op safety checks, fabricated tool traces or a refusal-only “completed adapter.”

Required host operations: preflight capability proof; authorized model turn; allowlisted tool execution; independent effect observation; stop and confirm ownership cleanup. Worker tools never receive provider credentials. Capture admission precedes dispatch; missing or lost capture refuses/stops execution, retains partial evidence and leaves unknown state where reconciliation is incomplete.

Future controls must reject grants/digests mismatch, traversal/symlink/oracle access, unknown tools/egress, capture absence/loss, timeout/unfinished cleanup, model-success with failed actual state, missing/reordered/truncated events, and duplicate publication. Unknown usage remains unknown. These controls have not run.

A finite read/patch/fixed-check harness would be a narrower experiment, not the full coding/parallel-worker/workflow suite; it requires explicit scope approval and must not replace the original acceptance silently. Least-expansive default: hold T4/T5, retain reviewed branch-only candidates and request a concrete host/probe decision rather than build new evaluation infrastructure speculatively.

## Failure analysis and rollback

- Routing false positive/negative: hold acceptance and distribution; preserve corpus and evidence; revise the approved contract/design rather than adding reviewer phrases indefinitely.
- Unknown/malformed routing metadata: explicit surfaced validation failure for that skill; never broad automatic fallback. Legacy fields retain their current semantics.
- Host or provider unavailable: no trial launch, exact capability/input reported, no account fallback inferred.
- Post-launch observation failure: cancel owned execution, preserve evidence and independently reconcile state; no blind replay.
- Incomplete source/bundle identity: reject comparison and retain the failed attempt record.
- Adoption failure: retain current qualified version; unqualified candidates stay branch-only. Nothing in this design authorizes activation.

## Approval and next step

Owner: requesting operator. Independent technical review must assess the integrated design but cannot supply human authorization. Exact runtime/schema changes and any safety probe require scoped approval before implementation. Paid evaluation separately requires eligible account/configuration, spend/attempt/concurrency caps and expiry.

Automatic chaining remains disabled. Next step after design integration/review is an explicit scoped decision; existing T2/T4/T5 blockers are not marked complete by creating this document.
