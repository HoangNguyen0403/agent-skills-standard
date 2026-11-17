# Retrospective evidence integrity and interruption analysis

## Authority and baseline
- Work item: user's request to create an improvement plan and delegate implementation, following the six-worker retrospective investigation.
- Domain: agent-skills-standard, authorized personal open-source workspace.
- Execution: Subagent-Driven explicitly selected by user. Two disjoint implementation owners; separate independent reviewer. No premium consultation, publication, deployment, consent changes or policy changes.
- Baseline: fb3ebb23893fb551663e96e04109ffb983d816fa. Preserve pre-existing user changes.
- Goal: reports inventory all declared actors, never confuse file-read coverage with delegation completeness, and explain observable permission friction without invented causes or totals.

## Decisions and shared contract
- Real Paseo/OMP dispatcher code is outside this repository. Do not claim to intercept it. Implement a working local consent-bound manifest preparation ingress plus conservative native discovery; document the host's structured launch/lineage capture contract. No parsing Eval JavaScript, arbitrary tool-output prose or titles for authority.
- Reuse LocalManifest validation, private store, consent checks, source-root boundaries, resource limits and immutable generation publication. User-supplied manifests are declared scope, not authenticated host inventory. A provenance string never proves trusted host origin.
- Discovered files must have valid native session headers. Directory proximity alone never establishes parentage. Existing changes.jsonl or other journals are not sessions.
- Report inventory, linkage and authorized evidence coverage separately. Unknown inventory or inaccessible/unlinked actors prevents whole-delegation completeness. Missing usage/timing remains unknown. Deduplicate actors, sources and permission events at their actual identity boundaries.
- Permission slice exports `PermissionFriction` and `buildPermissionFriction(tree: TreeAggregate | null): PermissionFriction | null` from `mcp/src/retrospective/permission-friction.ts`. JSON-safe output contains counts/labels/categories only: `requests`, `answered`, `unanswered`, `repeatedRequests`, `humanAnswers` (number|null), `orchestratorAnswers` (number|null), `waitMs` (number|null), `waitMeasuredRequests`, `coverage` ('complete'|'partial'), `limitations` (string[]), `byAgent` (array of {label, requests, answered, unanswered, repeatedRequests}), and `byTool` (array of {tool, requests, repeatedRequests}). Labels are generated report aliases, not raw native identifiers or arbitrary titles. Repeats mean same safe operation category requested again, not proof of semantically identical commands. Waiting sum is request-wait duration, not total session wall time. Distinguish automated answer visibility from human attribution; unknown stays null.
- Evidence owner wires this function into ledger, stored validation, HTML and summary with field name `permissionFriction` and wires observable improvement recommendations. Permission owner never edits those consumers.
- Preserve established privacy boundaries; no new raw arguments, prompts, private report text or native paths in returned receipts. No network, model calls, automatic policy edits, or approval weakening.

## Acceptance criteria
- AC-01: native discovery rejects non-session JSONL, duplicates, inconsistent headers and unproven sibling parentage; tests use main + five Eval-launched actors + independent reviewer as the motivating case without parsing JavaScript.
- AC-02: actual local preparation ingress accepts bounded explicitly authorized manifest nodes, preserving local/restricted/unavailable/remote dispositions; no unconsented source reads, symlink escapes or forged trusted provenance. Flat native files link through explicit declared inventory or proven native lineage.
- AC-03: inventory known/unknown/declaration provenance, expected/linked/read/missing counts and every expected actor are visible. Unknown/missing scope cannot display unqualified complete. No phantom unknown zero-turn worker certifies coverage.
- AC-04: permission requests are deduplicated across parent/child observations and attributed to stable safe actor labels; answered/unanswered and repeated category counts are correct. Timing and answerer provenance are measured only when structured evidence supports them; otherwise null with limitations.
- AC-05: HTML and summary show coverage warning first, delegation roster, observable interruption analysis, evidence-backed improvement actions, claim-vs-verification limits and partial usage caveats. Escape untrusted labels and preserve CSP/no network.
- AC-06: old reports remain intact and readable under explicit version/compatibility rules; new reports publish a fresh generation/checkpoint and never overwrite prior evidence. No same-checkpoint cache silently returns obsolete semantics.
- AC-07: focused regressions exercise real discover -> prepare -> validate -> persist -> render behavior, plus direct/nested/failed launch uncertainty, duplicates, missing/restricted/remote sources, non-session journals and permission duplication. No lexical-padding tests. Build, type/lint checks and actual HTML browser smoke cover final integrated source.

## Task 1: Evidence coverage, preparation ingress and report integration
**Scope / owned write set:** mcp/src/retrospective except aggregate.ts, permission-requests.ts, permission-friction.ts and improvements.ts; mcp/src/retrospective-cli.ts; mcp/test/retrospective-discovery.spec.ts; mcp/test/retrospective-run.spec.ts; mcp/test/retrospective-ledger.spec.ts; mcp/test/retrospective-cli.spec.ts; mcp/test/retrospective-views.spec.ts; mcp/test/retrospective-report-html.spec.ts; mcp/test/retrospective-publication.spec.ts; mcp/test/fixtures/retrospective; docs/session-retrospective.md; docs/session-retrospective-hosts.md; docs/session-retrospective-privacy.md; ARCHITECTURE.md; CHANGELOG.md; artifacts/retrospective-evidence-integrity/evidence-receipt.json.
**Inputs:** this plan, baseline source, LocalManifest and private preparation/store contracts; permission-friction shared API above.
**Outputs:** working preparation ingress and conservative discovery, explicit coverage and actor roster, verified ledger schema/serialization/views, documentation and focused evidence receipt.
**Real Ingress:** existing local retrospective CLI and MCP-native run/prepare path; add an explicit local CLI prepare --manifest path reusing run collection and all consent/root checks (not an inert helper). Native auto discovery remains supported with honest uncertainty.
**Invariants:** preserve local-only consent, bounds, privacy, immutable generations and no unproven authority.
- Positive: all six declared children have visible nodes, including missing dispositions, in a real persisted report.
- Negative: no non-session file or absent worker can make delegation complete; no manifest outside consent roots is read.
**Verification Owner:** implementer returns focused regression evidence once after edits; integrator owns covering build/type/lint and real CLI/browser smoke; independent reviewer approves separately. Do not run full suites, generators, lint or formatters mid-flight. User report supplies repro; original RED may be NOT RUN if not executed, never fabricated.
**Handoff / freeze:** final report freezes owned paths; receipt lists files, criteria, exact commands, results, limitations and unresolved external host capture boundary. Notify orchestrator when settled.
**Correction Route:** one concrete corrective assignment to same worker; provider exhaustion or unresolved quality failure uses authorized profile fallback. No recursive delegation, commits, releases, private report loading or permission changes.

## Task 2: Permission event identity and friction analysis
**Scope / owned write set:** mcp/src/retrospective/aggregate.ts; mcp/src/retrospective/permission-requests.ts; mcp/src/retrospective/permission-friction.ts; mcp/src/retrospective/improvements.ts; mcp/test/retrospective-aggregate.spec.ts; mcp/test/retrospective-permission-requests.spec.ts; mcp/test/retrospective-permission-friction.spec.ts; mcp/test/retrospective-improvements.spec.ts; artifacts/retrospective-evidence-integrity/friction-receipt.json.
**Inputs:** this plan, existing notification parser and OMP aggregate event types; no private diagnostic reports.
**Outputs:** bounded structural identity/timing capture, shared pure friction API, precise observed-vs-candidate improvement rules and focused evidence receipt.
**Real Ingress:** actual OMP permission notifications and response records consumed by aggregateSession, then buildPermissionFriction consumed by Task 1 ledger/view integration. Preserve existing stats consumers while fixing cross-node overcounting where identities permit it; do not sum duplicates as distinct human interruptions.
**Invariants:** preserve redaction and existing command-display restrictions; internal event IDs may support dedup but are not emitted by new summary. Keep all state bounded and deterministic.
- Positive: replayed parent/child notifications count once, different agents/request identities remain distinct, safe tool categories and supported request/response timestamps yield evidence-backed counts.
- Negative: absence of human provenance or timing never becomes zero or a fabricated human answer; repeated tool category is never claimed to prove identical command semantics or avoidability.
**Verification Owner:** implementer runs focused regression target once after edits; integrator owns final covering checks. No full suites, generators, lint or formatters mid-flight. Report RED classification honestly; user report supplies reproduction.
**Handoff / freeze:** final report freezes owned files; writes receipt and sends API/criteria/check results with limitations to orchestrator. Task 1 may consume the stated API without waiting for implementation.
**Correction Route:** concrete corrective follow-up via orchestrator only; no spawning, commits, policy changes, host modifications or private report reads. Material contract change returns decision evidence before editing consumers.

## Integration and review
1. Generate validated standalone task packets, dispatch both eligible workers with completion notifications; do independent verification preparation while they run.
2. Freeze both slices, generate cumulative review package from baseline and request independent read-only review of whole change and each AC.
3. Apply bounded corrections through component owners; run final affected checks once on settled source. Exercise actual local CLI and open a synthetic generated HTML report in browser; never load the private historical report into model context.
4. Regenerate the historical session only through authorized existing consent/source boundaries and verified explicit inventory. If host lineage or consent is unavailable, preserve that gap instead of relaxing controls. Preserve earlier report generation and record new revision separately.
5. Return exact evidence, source/runtime activation boundary and any external host dependency. Source delivery is not release, deployed-host verification or automatic adoption.

## Task 3: Coupled integration corrections after failed corrective review
**Scope / owned write set:** union of Task 1 and Task 2 source/test/document paths after both original owners are terminal and frozen; artifacts/retrospective-evidence-integrity/integration-receipt.json. No private diagnostic reports, source-root changes, runtime-policy edits or other repository paths.
**Inputs:** this plan; original packets and frozen receipts; final cumulative package .agent/sdd/retrospective-evidence-integrity/review-fb3ebb238-workspace-7f3861396251-3abf2f6d2f43.diff; precise remaining findings .agent/sdd/retro-integrity-fallback-findings.md.
**Outputs:** corrected real ingress, truthful temporal and native-inventory coverage, configured formatting/lint compliance, focused evidence and final freeze receipt.
**Real Ingress:** actual local CLI prepare and native discovery -> aggregation -> ledger -> persisted readback -> summary/HTML. Reuse implementation already delivered; no rewrite or parallel writer.
**Invariants:** retain all existing consent/root/source identity/privacy safeguards and independently corrected R1-R5 behavior; do not change ACs or weaken tests.
- Positive: real OMP title-preamble sessions validate their actual bounded header; cutoff-only changes create fresh generations; unknown-time exclusions visibly make evidence partial.
- Negative: native launch lower bounds never become zero merely because no child was linked; unrelated records never bypass native-header proof; no data/policy permission escalation.
**Verification Owner:** fallback implementer runs narrow affected regressions and final formatting/lint/type checks once after settled edits; orchestrator owns real CLI/browser/replay verification and separate independent review. Existing passing integrated result is 646 passed, 1 skipped; observed failures/findings are reproduction, not reasons to rerun unchanged commands.
**Handoff / freeze:** final report freezes the entire transferred owned write set and records precise checks/limits. Both previous implementers are closed/terminal as confirmed by host status before transfer.
**Correction Route:** standard Personal Delivery fallback after DeepSeek corrective output retained major findings; no premium escalation or recursive delegation. Any further failure follows active user stop/escalation policy.
