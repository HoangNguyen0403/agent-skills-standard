# Technical Design: Agent Review Trust

slug: agent-review-trust
revision: 1
status: draft; no design approval or implementation verification claimed
delivery_mode: extended
owner: requesting maintainer
source: [PRD revision 2](../prd/prd-agent-review-trust.md)
implementation: [task list revision 2](srs-task-list-agent-review-trust.md)

## Decision Brief

- Fable approved the revision-2 plan for technical design/readiness, not as a substitute for them. This design realizes the accepted D1/D2 and DD-1/DD-2/DD-3 constraints.
- M1 uses the existing assignment packet publisher, adds a strict task-field parser and a declared blind/reconcile protocol, and retains the privileged reviewer execution prohibition.
- No shared-worktree agent is assumed sandboxed. In this workspace reviewer reproduction remains static-only unless host isolation, credentials removal and provenance are positively verified. Parent-observed commands are admissible evidence but do not become reviewer reproduction.
- All report-only grants remain disabled. Human current review applies until an independently authorized policy decision, not merely a model verdict.
- Independent architecture/security analysis is required before design acceptance. The maintainer owns design approval; profile labels and attribution are not approval tokens.
- No live eval, merge, publication, policy activation or deployment is authorized by this document.

## Architecture And Ownership

| Component | Responsibility / owner | Dependency |
| --- | --- | --- |
| Task plan and assignment packet | Maintainer contract; orchestrator freezes reference/digest | Existing `task_brief.py` v1 manifest; owned-path/source/dependency validation preserved |
| Task field parser | Delivery owner, Task 2 | Standard-library parsing of unfenced task section; called before packet publication |
| Review procedure and template | Task 1 owns review behavior; Task 2 owns dispatch phases; Task 4 wires workflows | Existing read-only/least-privilege boundary is authoritative |
| Deterministic checks | Orchestrator or independently authorized verifier | Approved command, immutable output evidence and source identity |
| Reviewer | Separate eligible analysis context, no implementation ownership | Brief, cumulative diff, check receipt; author narrative only after phase-one freeze |
| Delivery report | Implementation/orchestration records facts; human assesses residual risk | Frozen criteria, explicit statuses, review/evidence references |

No new database, background service, scheduler, model selector or permission API. Scratch evidence is run-owned and durable until archived; no destructive cleanup or ownership adoption is implied. Existing seven SDD operations remain unchanged.

## SRS-ART-01: Parse gate and rollback fields before publishing a brief

- Priority: Must; status: Draft.
- Source: REQ-ART-03, AC-ART-06, AC-ART-07.
- Interface: retain `validate_task_contract(lines) -> list[str]` and manifest schema version 1. A gate-field failure contributes a precise diagnostic to the same missing/invalid-contract list; CLI exit 2 occurs before `publish` and before artifact-root creation. Required manifest fields and source/dependency digests remain unchanged.
- Parse only `_unfenced_lines` using the existing bold-label parser. Exactly one `Gate / rollback` field is permitted. Split the value at semicolons; each segment must be nonempty and recognized. Semicolons are structural separators, not escaped free text. Reject duplicate keys, unknown keys, line continuations or a field appearing only in a fence.
- First segment: a nonempty named flag/version pin, or `none: <nonempty reason>`. Reject bare `none` and `none:`. Named gate identifiers do not assert control efficacy.
- Remaining required keys: `control`, `rollback`, `reversibility`. Optional key `authorization` becomes mandatory when reversibility is `one-way`. Values are trimmed and cannot be empty. Literal instructional placeholders beginning `<` and ending `>` do not qualify.
- Reversibility enum: `gated | revertible | one-way`. Rollback enum: `flag off | revert | one-way`. `flag off` pairs only with `gated` and a named gate; `revert` pairs only with `revertible`; `one-way` pairs only with `one-way` and nonempty authorization reference. A version pin uses `revert`; previous-pin detail belongs in the control/plan narrative, not a new parser alias.
- A reference is attribution, not authenticated human approval. Readiness independently checks one-way authority before execution. No parser grants permission.
- Migration: canonical active task templates, fixtures and this initiative's already-complete briefs use the new grammar. Historical archival plans are not rewritten wholesale; attempted new dispatch of an incomplete historical plan refuses with an actionable diagnostic. Existing brief-mode SDD plans carry the field, but routine work outside SDD gains no new document.
- Security/failure: invalid input produces no packet and relaxes no current validation; standard library only, no subprocess or network added to parsing.
- Verification: consumer-facing Python CLI tests in `test_task_brief.py` exercising invalid field variants, duplicate/malformed segments, fences, incompatible pairs and valid justified-none/named-gate/authorized-one-way through packet publication or refusal.

## SRS-ART-02: Freeze blind-phase findings before author claims

- Priority: Must; status: Draft.
- Source: REQ-ART-01, AC-ART-01, AC-ART-03.
- The orchestrator settles owned source and collects the cumulative BASE-to-workspace diff using existing `review_package.py`. A separate reviewer receives the brief path/digest, diff path/digest and orchestrator-observed deterministic receipt only. No author-report placeholder, author summary or implementation conversation is in the first dispatch template.
- M1 source identity is computed by the orchestrator before and after each check and phase freeze, not supplied by the implementer. Use the read-only manifest algorithm of SRS-ART-06 over an explicitly frozen scope: every literal owned path plus dependency/source paths listed in the validated assignment. Resolve directories recursively, including ignored untracked entries; omit only Git administration and the exact predeclared non-source artifact inventory. Missing/ambiguous dependency scope blocks that check. Scope path bytes, BASE/actual HEAD, index stage/mode/blob entries, filesystem kind/mode/content digests and artifact inventory are length-delimited, byte-path-sorted records hashed with SHA-256. The scope list/digest travels with every receipt and findings artifact. This is an M1 orchestration computation, not a dependency on the later M2 gate executable. Whole-milestone review expands scope to all milestone source/dependencies after writers pause. Any before/after or receipt/findings identity mismatch makes affected evidence stale and requires a new settled check/freeze; never relabel old proof.
- Receipt fields: `source_revision`, `dirty_identity`, `checks[]` with command, cwd, exit code, raw-output path/SHA-256, and status (`PASS | FAIL | NOT RUN | NOT APPLICABLE` plus reason where unexecuted). The orchestrator's execution must be authorized independently; no receipt alone proves isolation or authentic actor identity.
- Receipt mismatch or changed source is stale evidence, not PASS. Observed current deterministic FAIL returns CHANGES REQUESTED before spending tokens on semantic lenses. Missing/NOT RUN required checks remain evidence gaps and block technical readiness, rather than suppressing static risk analysis that remains useful.
- Reviewer writes a bounded findings artifact. Orchestrator records its SHA-256 and phase-one completion reference before delivering the author report. Reconciliation resumes the same reviewer with the frozen artifact identity and the author report; claimed-but-unproven statements become explicit gaps or findings.
- This is a declared protocol: a path omitted from a prompt may remain accessible in a shared filesystem. Never call it host-enforced blindness or a sandbox. If access enforcement is required and unavailable, block that operation rather than assuming prompts enforce it.
- Same-reviewer resume unavailable: reconciliation BLOCKED. A replacement may restart the entire blind protocol in a fresh context; no synthetic continuity or fabricated chronology.
- Fix rounds use cumulative diffs from the original baseline; phase artifacts bind the specific revision/dirty identity, and affected edits invalidate affected proof. Preserve earlier snapshots instead of overwriting them.
- Severity format: Blocker, Major, Nit; every finding includes evidence, Why, Fix and Prevent-by. No strengths/praise section. Mismatched executed versus claimed result is a Blocker, not a mere confidence downgrade.
- Verification: `test_review_dispatch.py` checks the externally used template sections for admissible phase-one inputs and absence of author-report placeholders, and that reconciliation requires frozen proof. These tests prove template contract only; live agent compliance is NOT RUN absent separately authorized evaluation.

## SRS-ART-03: Preserve reviewer execution boundary

- Priority: Must; status: Draft.
- Source: REQ-ART-01, AC-ART-02; accepted DD-1.
- Reproduction is allowed only if all are recorded as verified: source/command provenance; host-enforced isolated runtime without credentials/publication authority; default-deny outbound networking; command in the orchestrator-published brief. Any egress exception requires separate human authorization bound to destination and permitted data. Unknown network controls stay static-only. An agent mode named ask/read-only, a worktree, a role label or an omitted secret is not proof.
- Never execute author-controlled tasks, test commands, package hooks or build scripts in a privileged reviewer runtime. A separate isolated executor may be used only within the approved boundary; do not silently create infrastructure, credentials or permission grants to manufacture eligibility.
- When any predicate is false or unknown: static-only reviewer with a named reproduction gap, while the orchestrator's separately authorized focused checks remain their own evidence lane. No executed command and no reproduction PASS are claimed.
- Compare independently observed output with the check receipt and, after reconciliation, author claims. Record exact command/output/identity rather than relying on claimed test counts.
- Workspace safety: isolated execution cannot mutate the shared implementation worktree. Artifacts generated by an authorized verifier belong to its own run; findings reference durable copies with hashes.
- Security impact: no new host tool or capability is minted. The current host does not expose a verified isolated reviewer executor here, so operational reproduction defaults to blocked/static-only until that evidence exists.
- Verification: independent security/architecture contract review plus separately authorized held-out behavior cases. Offline preflight only checks that those cases exist; it cannot mark this behavior verified.

## SRS-ART-04: Decision-first report and review-to-prevention path

- Priority: Must; status: Draft.
- Source: REQ-ART-04, AC-ART-08, AC-ART-09; REQ-ART-06, AC-ART-12, AC-ART-13.
- Report C4 in the task list is the presentation contract, not a new lifecycle enum. Verdicts are report-local and do not alter RunRecord FeatureStatus.
- Before M2 classification/policy exists, state `review level: not-assessed; current human review applies`. Hunk lists are minimum attention, not authority to skip code. Always retain findings-bearing files and reviewer nominations.
- Criteria status enum: PASS, FAIL, NOT RUN, BLOCKED, NOT APPLICABLE with scope reason. Required FAIL prevents READY; missing required execution blocks readiness; a justified optional NOT APPLICABLE lane does not. Behavioral evals remain NOT RUN with the no-live-eval authority limit stated next to their criteria.
- Report is concise at the top and links detailed receipts below; no source-text word quota or confidence percentage implies quality. Technical evidence, business acceptance and release remain distinct.
- Each substantive finding names its prevention mechanism: lint, type, test, eval, runtime, guidance, none. Recurring causes route to retro-learn's existing mechanism order, not automatic skill prose or policy edits.
- PR template remains a short evidence/blast-radius/rollback/not-verified request; a filled section is still an author claim until inspected. Specialist completeness findings flag missing sections without auto-publishing.
- Cap integration: edit capped workflows in place, move details to existing skill references and explicitly load applicable bodies. Do not replace machine-parsed Outcome Report mappings with links. SDD/routing bodies stay within 100 lines and workflow limits remain unchanged.
- Verification: independent contract review and outcome/SDLC/export consumer checks; new skill/specialist eval cases retained as NOT RUN behavioral evidence until a live run is separately authorized.

## M1 Failure Analysis And Readiness

| Failure | Required outcome | Authority / recovery |
| --- | --- | --- |
| Invalid C2 or historical plan lacks the new field | Exit 2; no published packet | Owner updates only the plan they intend to dispatch |
| No current orchestrator check receipt | Gap; no required-check PASS | Orchestrator supplies authorized current proof |
| Unknown reviewer isolation | Static-only and explicit reproduction gap | Human/host must provide verified isolated execution before reproduction |
| No same-reviewer resume | Reconciliation BLOCKED | Supported resume or full fresh blind restart |
| Changed findings/output bytes or source identity | Evidence stale; affected gate reopened | Recompute/freeze affected receipts, never rewrite old proof |
| Author report claims more than source/output | Finding or evidence gap; discrepancy Blocker | Correction through existing host retry policy |
| No paid live eval authority | Eval behavior NOT RUN | Never bypass through direct model calls; separate future authorization |
| Caps cannot fit | Affected file blocked | Maintainer decision; no cap change or packed safety clauses |

## Migration And Rollback

No automated global historical migration or dual-parser shim. Task 2 updates active fixtures and current templates; old contract violations refuse at new dispatch. Public skill consumers receive candidates only after separately authorized release/ref changes. Candidate source rollback is a revert, followed by generator-produced mirror restoration; no permanent data mutation or external effect is part of this work.

## ADR-ART-01: Declarations remain separate from host authority

Use small portable standard-library checks and existing packet/report workflows. Reject inconsistent claims deterministically; do not pretend declared actors, grants, review phase chronology or model labels are authenticated. The rejected alternative is treating an agent verdict, a tracked file or a zero-exit script as human approval, host sandboxing or permission enforcement. No automatic report-only activation is shipped.

## Remaining Milestone Design Gates

M2 C1/C5 and M3 C6 remain gated until their bounded source analysis is integrated into this document and independently reviewed. Their acceptance conditions are defined in PRD revision 2 and are not waived by approving M1. No implementation of those milestones is currently claimed.

## Status And Next Workflow

M1 technical design is proposed, awaiting independent architecture/security review and maintainer design approval. Readiness must record the explicit reproduction limitation and all NOT RUN behavioral criteria. No implementation worker has write ownership yet. After design approval: `implementation-readiness`; only named ready slices proceed to `implement-feature`.

## SRS-ART-05: Base-bound policy classification and immutable control floors

- Priority: Must; status: Draft.
- Source: REQ-ART-02, AC-ART-04, AC-ART-05, AC-ART-17; REQ-ART-08, AC-ART-16.
- Design input: bounded gate analysis by agent `6be7fa2f-c9fb-4d57-84bf-296ff7a0a0b8`; analysis recommendations are not executed proof.
- The independently selected baseline is a full commit OID frozen by the orchestrator before assigning implementation. `check --base <full-oid>` requires an existing ancestor of actual HEAD and matches it against the frozen dispatch receipt; never choose base from the report, candidate branch config or candidate policy. This checks consistency; authenticity of the baseline selection remains a human/host responsibility. Ancestry alone cannot stop a dishonest caller choosing HEAD.
- Policy bytes come from `BASE:<repo-relative-policy-path>`, with the path and SHA-256 bound into the report. Working-tree policy edits cannot decide their own review class. An absent policy is an explicit unclassified/current-review result, not leaf permission.
- Forced trunk controls precede every map/skip rule: selected policy path, canonical `docs/review-policy.md`, gate implementation path and recognized CODEOWNERS paths (`CODEOWNERS`, `.github/CODEOWNERS`, `docs/CODEOWNERS`). Include deletion and addition endpoints, so rename cannot escape the floor. An edited checker itself is not authenticated by its own result.
- Parse one unfenced Criticality Map table with exact Class/Glob/Reason header and trunk/shared/leaf values, nonempty reasons and case-sensitive repo-relative POSIX patterns. `*` is one component, `**` spans components and terminal `/` covers descendants. Reject traversal, absolute/empty path components, negation, brackets, escaped pipes, duplicate headings and malformed rows; highest matching class wins, unmatched shared. Absent table differs from malformed table (exit 2).
- CODEOWNERS catch-all ownership is not a trunk map. Copy only the identified sensitive/integrity path rows into the project map. Generated integrity outputs such as `skills/metadata.json` remain trunk and force Centrality 2 on their PRs; generated status or a brief label never discounts that floor. Mixed-class changes take the strongest obligation while minimum-attention coverage includes every trunk unit.
- No owner-approved policy: current review remains. Trunk/sensitive/one-way always requires line-review; every report-only attempt returns REPORT_ONLY_DISABLED during this implementation, even if a file supplies a purported grant. A future activation is a separately approved contract change supported by M3 evidence, not a hidden conditional enabled now.
- Verification: temporary-Git consumer tests in `test_review_gate.py`, including candidate policy self-relaxation, arbitrary-base mismatch against frozen baseline, rename out of trunk, immutable floors and malformed/absent policy distinctions.

## SRS-ART-06: Read-only source and proof identity

- Priority: Must; status: Draft.
- Source: REQ-ART-08, AC-ART-16; REQ-ART-02, AC-ART-05.
- The gate uses Git read operations with external diff/text conversion disabled and standard-library hashing/diffing. Do not reuse `review_package.py`'s temporary-index collector: it writes Git objects and collapses index/worktree distinctions. No Git add, write-tree, hooks, filters, subprocess shell interpolation, network, directory creation or source mutation.
- Canonical source manifest includes actual HEAD; base/policy digests; index path/mode/stage/blob OID; filesystem path/kind/executable-bit/content digest for tracked and untracked files. Preserve byte paths with length-delimited canonical records sorted by raw path. Hash symlink target bytes without following; reject unsupported filesystem types, unresolved index stages and submodules rather than omit them.
- Conservative C5 scope includes ignored untracked files too, except exact approved evidence artifacts and Git administration. No `--exclude-standard` or directory/glob exemption silently hides source. Scanning ignored dependency/build trees may be expensive; changing this scope requires explicit design amendment, not an optimization that narrows proof.
- Freeze an exact evidence/report inventory before review. Each excluded path must be a run-owned regular non-symlink file inside designated artifact scope, not tracked source or a changed source endpoint. Reject traversal, symlink components, duplicate aliases and source disguised as proof. Bind the inventory itself into source identity. Report content is excluded to avoid self-hashing; proof files are separately digest-checked. A new inventory entry invalidates frozen receipts.
- Collect Base-to-HEAD, Base-to-index and Base-to-filesystem differences independently and union their review units. Deletion/addition endpoints represent renames without trusting rename heuristics. This retains staged changes even when worktree bytes were restored.
- Text units use fixed stdlib diff settings; unit identity includes comparison target, path, before/after digests, ranges and hunk bytes. Binary, empty-file, mode-only and symlink changes become explicit whole-file/metadata units. Every trunk unit, finding-bearing file and frozen reviewer nomination must be in human_attention; stale or extraneous units reject.
- Re-read source manifest after validation and refuse SOURCE_CHANGED_DURING_CHECK on change. This catches persistent concurrent writes, not hostile change-and-restore races; stable writer freeze/host locking remains external.
- Sidecar v1 must bind baseline receipt, approved criterion inventory, all declared source identities, policy identity, exact artifact inventory, blind-phase artifact/digest/receipt, current deterministic receipt, criterion results, declared actors, parsed gate, open findings and attention units. Required criterion IDs/applicability come from the independently frozen inventory, not report enumeration.
- READY refuses missing criteria, required FAIL/NOT RUN/BLOCKED or unjustified NOT APPLICABLE, open Blocker/Major, source/evidence mismatch, absent blind-phase proof, absent reproduction without explicit gap, or a claim/result mismatch not represented as a blocking finding. A gap never satisfies an execution-required criterion. Declared actor equality rejects; inequality does not authenticate independence.
- Errors: 0 descriptive/consistent only; 1 well-formed but refused report with stable reason codes; 2 malformed JSON/schema/policy, duplicate keys, invalid enum/glob/ref or unusable Git input. Do not coerce types or accept unknown versions.
- Verification: temporary-Git gate suite for staged/unstaged/untracked and ignored changes, staged/worktree cancellation, source edits after freeze, evidence self-reference and escaping aliases, complete multi-hunk coverage, invalid criterion inventory, reproduction gaps/mismatches, and unchanged index/object store/artifacts after check.

## SRS-ART-07: Independent trust observation populations

- Priority: Must; status: Draft.
- Source: REQ-ART-05, AC-ART-10, AC-ART-11.
- Design input: bounded metrics analysis by agent `365a1780-bf1b-43a8-81c8-3c01a203d38b`; implementation behavior remains unverified.
- Add an optional `trust` block with its own schema_version 1, records, population manifests and per-kind coverage to the existing authorized local delivery-observations export. Old exports keep existing values; absent trust means unavailable new rows. Do not overload human acceptance or fake a change ID for seeds.
- Every trust record carries id, observed_at and source_ref; immutable domain timestamps determine report membership, not observed_at. Classes trunk/shared/leaf/unknown; missing or unclassified maps to unknown and remains visible. Configuration keys provider/model/effort/mode/features describe actual execution or explicit unknown, never a requested profile.
- Records:
  - revision-class: change_id, revision, change_class, policy_ref and policy_digest; domain identity (change_id, revision). Without policy evidence only unknown is valid.
  - agent-review: review_id, change_id, revision, completed_at, terminal verdict approved/changes-requested/blocked, reviewer_configuration, evidence reference/digest. One immutable terminal event per review_id; separate executions may disagree.
  - human-finding: finding_id, approval_review_id, exact change_id/revision, detected_at, severity Blocker/Major/Nit, evidence reference/digest. It asserts a fault present in that exact reviewed revision, not later edits.
  - seed-assignment: seed_run_id, immutable package/digest, class or unknown, assigned_at, evaluation_cutoff, expected defect IDs/severities and evidence. Never requires submission, acceptance, deployment or merge.
  - seed-result: seed_run_id, completed_at, detected_seed_ids, actual reviewer_configuration and frozen review-output reference/digest. Detection-to-ground-truth mapping is independently checked; unexpected IDs reject.
  - grant-reference (optional, declaration-only historical input): grant_id, change_class, exact scope_ref, evidence_cutoff, effective_from, effective_until (or explicit null), revoked_at/suspended_at (or null), independent_validation_ref and source_ref. Domain identity is grant_id; conflicting payload rejects. State is derived from these timestamps, never a blanket active boolean. References are supplied by an independently authorized export and remain unauthenticated by this metrics script; they cannot activate report-only in this implementation.
- Existing deployment records continue to map one deployment_id to one exact change revision; join that revision's classification, not latest reviewer class. Multi-change physical release membership is not added; incompatible exports reject rather than invent membership. Unknown classification remains an explicit bucket.
- Use structured tuple identities, not delimiter-joined keys. Identical ID/payload or equivalent domain replay excluding transport ID collapses; conflicting domain payload rejects the entire export regardless of event order. Changed attribution/time fields are not silently equivalent. Reject bad references, chronology, duplicate conflicting classifications, mutable seed ground truth and invalid detection IDs.
- Complete population manifests declare population_kind (agent-review, seed-assignment, production-deployment), population_id, scope_ref, inventory_digest, interval, exhaustive member identities, complete flag and source_ref. This is still declared coverage, not authenticated completeness. Per-kind intervals are half-open and must continuously cover relevant lifecycle; legacy endpoint semantics remain unchanged.
- Verification: metrics suite fixtures covering unknowns, replay/conflict, exact joins, missing populations, old export preservation and malformed records.

## SRS-ART-08: Trust rates without survivor bias

- Priority: Must; status: Draft.
- Source: REQ-ART-05, AC-ART-10, AC-ART-11.
- For report interval [S,U), human-found-after-agent-approval population is distinct change revisions whose first technical approval completed in that interval. Later reapproval cannot move the revision into a newer cohort. Denominator counts those revisions by class; numerator counts members with at least one linked human Blocker/Major detected after approval and before U. Rejected, unmerged and never-human-accepted revisions remain included. Multiple approvals/findings do not multiply a member. Report as-of observation duration, not lifetime defect probability.
- Seed population is assignments with evaluation_cutoff in [S,U), fixed before observing results. Recall denominator is expected Blocker/Major defects; numerator is independently confirmed detections completed by cutoff. Report packages and expected defects separately; actual configuration strata retain unknown. Completed empty detections are true misses; missing/late/unfinished results make planned-cohort recall unavailable with diagnostics. Empty expected-defect denominator is unavailable, not 100 percent. No accepted-change filter.
- Deployment population is production deployments with deployed_at in [S,U), irrespective of acceptance/review. Include defects deployed_at <= detected_at < U, including remediation none. Separate defect count, affected deployment count, eligible deployments, affected share and hotfix/rollback/rollback-only deployment counts. Older-deployment detection-period counts cannot contaminate that cohort rate.
- Rates require complete independently declared population inventory plus continuous relevant kind coverage: review history sufficient for first approval; human findings from first approval through U; seed assignment/expected/result coverage through cutoff; deployment inventory and each member's defect coverage through U. A gap containing no event is still a gap. Unknown class does not reduce denominator.
- Missing/partial coverage makes rates unavailable, while observed counts can be labeled partial. Empty denominators unavailable; no count or rate coerced from missing to zero. Every rate exposes numerator, denominator, sampleSize, coverage, source, cohort, as-of horizon and limitations; optional unavailable metadata survives JSON and Markdown rendering. Preserve existing metric sections/rows and all old values.
- Fresh escape assessment uses defect `detected_at`, not observed_at or deployed_at: join its exact deployed revision/class and scope to a grant-reference where detected_at > evidence_cutoff, effective_from <= detected_at < effective_until (null means open), and neither revocation nor suspension is at/before detected_at. Emit stable `SUSPENSION_REQUIRED` with grant/defect/evidence references even when aggregate rate coverage is incomplete. No policy edit, activation or authentication occurs.
- Missing grant inventory, missing validation reference, unknown class/scope or incomplete applicability history yields `unavailable` assessment, never “no escape.” A proven expired/revoked grant does not produce an active-grant suspension at that instant. The first implementation creates no grants; historical reference diagnostics are non-authoritative.
- Verification: metrics suite cases for unmerged approval cohorts, repeated approvals/findings, exact revision matching, first approval outside period, partial coverage, independent seed cohorts, pending versus empty results, unknown configuration, remediation none, deployment deduplication, half-open boundaries, replay conflicts and unchanged old exports; grant cases include cutoff equality, effective-start/end, revocation/suspension equality, missing grant evidence and suspension-required despite incomplete rate coverage.

## SRS-ART-09: Launch audit cannot upgrade missing proof

- Priority: Must; status: Draft.
- Source: REQ-ART-07, AC-ART-14, AC-ART-15; REQ-ART-08, AC-ART-18.
- Medium/high feature verification selects applicable journey, abnormal-state, changed hot-path performance and input/permission security lanes against approved criteria. Distinct fresh contexts have bounded independent concerns; do not fan out a role per stage without scope or inherit implementer narrative.
- Reuse project-owned verification kit ingress, read-only doctor, target ownership, cleanup and durable evidence. Missing runtime/driver/data/authority prevents the dependent lane only; no fabricated command, mock-as-live-proof or automatic environment mutation.
- Required FAIL makes technical verdict FAIL and routes to correction; required NOT RUN/missing proof makes it BLOCKED. Neither routes to UAT as verified. Justified NOT APPLICABLE for genuinely irrelevant scope is recorded; it never waives an applicable criterion.
- Stage exposure only for a declared gate and within separately granted release authority. Observe existing approved guardrails between stages; missing telemetry is a gap, not health. Without gate retain existing release path; no new approval, credentials or traffic mutation inferred.
- Verification: independent workflow/kit consumer contract review and scoped runtime evidence when authorized/available; absent live lanes remain NOT RUN, never closed by source-text checks.

## Integrated Design Disposition

M1 is under independent design review; M2/M3 proposed technical contracts above incorporate the bounded analyses but require their own independent architecture/security review. The conservative choice is to include ignored source in C5 rather than silently exclude it; reviewers should assess the computation/coverage tradeoff. Deployment membership remains the existing one-revision contract, not a many-to-many feature. Human design approval and readiness precede implementation of each named milestone. No new permission or report-only activation is part of this design.
