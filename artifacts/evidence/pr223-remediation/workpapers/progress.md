# SDD ledger — plan: docs/prd/prd-plan-pr223-remediation.md

BASE: fbb30b5f52181c0f0c2943e2ff6ca2b5c4d9f757
Approval: user requested fixes/pipeline, explicitly selected Subagent-Driven.
Readiness: READY; artifacts/evidence/pr223-remediation/20261006-implementation-readiness.json.
Ownership/interface preflight: plan's Ownership/Interface Scan table; no shared implementation ownership.
Ruling: Preserve forced tenant override across guidance arms — existing oracle/current contract is binding — wrong semantics would require benchmark contract rework.
Ruling: Viewers list only unrestricted same-tenant documents — current restricted-access rule must apply consistently — incorrect expectation would require benchmark contract revision.
Ruling: Composite runs are immutable views, never generation targets — leaf historical provenance cannot be safely inferred from top-level v4 — intentional composite regeneration would need a separate fresh-run contract.
Ruling: Unknown provenance is uncertainty, not proven heterogeneity — headline must not discard contributors — alternative output styling may need later revision.
Ruling: Keep reports/ledger under .agents/sdd rather than generated resolver's legacy .agent/sdd — native sync removes/migrates .agent — an incorrect storage choice only requires artifact-path repair.
Ruling: Cheap profile is ineligible because its configured Gemini model conflicts with its Codex-only route restriction — use eligible Personal Delivery — costs standard rather than cheap implementation calls.
Ruling: Parallel implementation is permitted only for these explicitly disjoint components; integration waits for all owners — user selected bounded Subagent-Driven and ownership policy permits it — undiscovered shared contract may require sequencing.

Tasks 1-3: first dispatch regression-only; await orchestrator RED verification before production changes. Workers run no checks mid-flight.
Tasks 4-5: existing concrete CI/source contradiction evidence is RED; bounded root-cause correction allowed.
Task 6: pending canonical fixes; owns shared docs, versions, generated outputs, and walkthrough.

## Dispatch identities
- Task1: d15bc0b7-4965-4db1-b397-a3ea9a9d94b4 — Personal Delivery gpt-6-luna high/write — regression-only phase.
- Task2: 21d22c59-e989-4b12-a8bf-97e35aa3f2bb — Personal Delivery gpt-6-luna high/write — regression-only phase.
- Task3: e5c9bb81-0a5d-4f34-9995-e30aaee38522 — Personal Delivery gpt-6-luna high/write — regression-only phase.
- Task4: b51821e1-83d0-457a-8e9a-b524bc50bccc — Personal Delivery gpt-6-luna high/write — pipeline correction.
- Task5: e698f361-7b0c-46ca-a6e8-da3c8d7d1702 — Personal Delivery gpt-6-luna high/write — canonical workflow correction.

## Recovery and verified evidence
- Interrupted frozen install had no result; recovered after user requested continuation. Workers resumed by persisted identities without re-dispatching completed slices.
- Task1 RED: premature candidate exit falsely succeeds; valid __proto__ result is missing. Normal-exit fixture initially retained a child reference (invalid RED), corrected with unref; then normal leader0 left the owned helper running (valid RED). Authorization baseline initially lost return results (invalid RED), restored; final independent secure baseline passed, collision/viewer vulnerable cases each falsely verifier0 (valid RED). Production authorized afterward.
- Task2 RED: composite generation missing expected rejection; known+unknown headline incorrectly v4-only. Production authorized.
- Task3 GREEN:18 native exporter tests;11 isolated Git collector tests; actual installer303/303 no leakage. Replacement test initially contradicted BASE-relative Git semantics by forbidding removed original bytes; corrected to retain removal+replacement and index invariance.
- Dependency frozen install+production audit passed2.00s after compatible proxy-addr/fast-copy upgrades and scoped brace-expansion floor correction.
- Actual local authenticated remote-sync E2E passed25.24s; fetched Flutter package and34workflows, validation324pass/0fail with44warnings. CLI build passed. Token memory-only, not logged/written. Remote Actions not yet exercised on new changes.
- Ruling: Keep advertised Node20 floor; actual node20.20.2 reports Promise.withResolvers undefined — affected owners use ordinary constructors, CI wires eval regressions — costs small compatibility edits instead of silently raising minimum runtime.
- Task2 initial GREEN target46pass/1incidental warning-prose failure; ordered deletion of wording assertion, not production rewording or regex repinning.
- Independent Task3 reviewer02ba803a-5efd-4337-ae92-74190f1df5bb; Task4/5 reviewer7ecde078-e2a4-46ab-a456-de311b4adb3b, latter v2 snapshot includes eval CI wiring.
- Task2 focused GREEN2/2 passed0.44s; actual temporary engine/report smoke passed0.33s: composite refused without writes/calls, real known-v3 plus exported-unknown evidence reports unknown headline. Historical CLI verification all3committed runs passed1.92s. Actual Node20 focused lane2pass/45skip passed1.11s; no live-model execution.
- Task2 independent reviewer a5e1ef96-f1e3-4b07-83c2-6da19a03f3e4 is assessing final saved source snapshot.
- Independent Task2 v1 found two additional Major reporting-consistency edges. Parent observed all3 new regression failures0.35s; owner repaired independent known/unresolved facts and full-physical history presentation without historical writes. Full text target49/49 passed0.78s; actual engine/report smoke passed0.38s. Independent corrective SPEC/QUALITY both PASS.
- Task3 tracked-new-then-ignored regression reproduced missing scoped staged content0.49s; selective current-tracked membership repair passed full Python12/12 in2.68s. Actual collector generated immutable v2 task package0.30s; corrective independent review in progress.
- Task1 production Promise rewrite omitted settled and cleanupError; parent failures recorded, owner restored both. Focused F2/F3/F4 now3/3 passed0.52s. Actual Node20.20.2 CLI four deterministic modes passed8.79s: pass3/3, early exit0evaluated/3infra, reject3productfailures, timeout3. No model calls.
- Task1 whole Node20 lane32/33 initially failed only generic cli-results cleanup test namespace due an older interrupted-run snapshot. Owner isolated output basename, kept cleanup/JSON/exit assertions, deleted incidental CLI prose assertions, bounded spawnSync15s. Focused amended case1pass/24skip passed1.30s; combined Node20 eval lane running. Authoritative Task1 review-v2.diff sent to reviewer92b7b0ec-3265-4313-9839-4ab9f6db82d1.
- Task4 independent review identified restored dev backports; corrected1.1.21/2.1.7 with10 retained5.0.12. Frozen install passed; FULL audit still2high (unpatched braces3.0.3, source-map-js1.2.1). Compatible source-map-js1.2.2 repair authorized; unpatched braces exposure/baseline mapping requested. Production-only clean audit is not a full-audit success.
- Task5 ownership explicitly expanded to canonical verify-work.md to close direct-handoff contradiction; low-risk chat/task-report exception now carries through verification, governed/sensitive trace/gates remain. Final audit/re-review pending.
- Combined Node20 eval lane108/108 passed9.32s before final type/oracle deltas; bounded strict affected TypeScript compile passed1.11s afterward. Actual receipt status/exit disagreement smoke9runs passed1.82s.
- Actual native writer exercised21canonical specialists across5YAMLplatforms:105files all parsed/validated1.57s. Native host binaries not launched; advisory permissions not runtime enforcement.
- Task1 corrective review found privileged-list completeness and reject-with-foreign-mutation blindspots. Parent observed two independent REDs1.28s; owned oracle/guidance correction passed5behaviorcases (6testcounts,0fail,24skip)1.23s. V4 immutable10file package70376bytes generated0.29s; independent corrective review pending.
- Task2 final corrective SPEC/QUALITY PASS. Task4 v3 bounded SPEC/QUALITY PASS: compatible backports/source-map declared-edge pins; frozen install+prod audit0, fullaudit1 solepreexistingunpatchedserverdevbraces3.0.3. Bundled magicast source-map1.2.1 separately source-confirmed; graph override is not a comprehensive bundled-code patch.
- Task5 bounded corrective SPEC/QUALITY PASS; expanded canonical audit:sdlc observedPASS0.53s. No live-model behavior claim.
- Task3 v2 review closed staged-ignored and actual-export gaps but identified new T3-R2: stale tracked descendant lstatENOTDIR when a directory becomes a regular file. Owner test-only PhaseA saved; parentRED running, production not yet authorized.
- Task6 owner0995a319-0b93-44dc-a329-efb54c8a0fe3 PersonalDelivery gpt-6-luna high/write prepared onlydisjoint docs/changelog/metadata; common2.8.5/workflows1.1.3, specialists1.5.1/CLI2.6.5unchanged. Generation deferred for Task3 canonical closure, thenexplicitPhaseB. No parentimplementation edits.
- Current publishedPR readback remains fbb30b5/BLOCKED;14checks:9success,3failure(harness/lint-and-format/unit-tests),2skipped(validate-skills/TagVerifiedRelease). Local remediationunpublished; no new-head Actions proof.
- Follow-up send_agent_prompt notifyOnFinish failed to deliver Task1PhaseA completion; recovered stale report onceviaidle/status+latestactivity, reportedtoolbug. Create-agent Task6 completion delivered normally; no routine polling.
- Final Task3 v3 bounded SPEC/QUALITY PASS, including exact T3-R2 RED0.39s/fullPython13/13GREEN2.95s and immutable5filepackage22816bytes0.32s. Task1 v4 boundedSPECconforms/QUALITYnooutstandingfindings; receiptstatus/exitgapclosed.
- Task6 generator completedonce1.93s andcalculate-tokens0.49s; canonicalversionsretained,324skills211483tokens reported. Parentchecksactualgeneratedstate, notsoleworkerclaim.
- Integratedroot firstfailedsoleobsolete specialist byte snapshot1254pass/1fail3.25s. Ownerremovedonlythat97lineentry/test/unusedfixture/import, notrepinningincorrectfrontmatter. Finalrootchainpassed13.54s:CLI1254,eval110,freshness62,outcome23,trace16,benchmark8,metrics44,release8,harness24, all0fail/0skip.
- Workspacecoveragepassed3.74s:CLI1254/MCP127;serverNoTestsfound exits0 underexistingpassWithNoTests — no serverbehaviorcoverageclaim. CLIbuildpassed1.16s72modules; futureViteconfigwarningretained.
- Nonmutatingformatcheckfailedbaseline debt (41CLIfiles,3MCPtests); don'trestyleunrelatedsource. ActualCIformat/lint/build scripts onisolatedcopiedsourceNode20allpassed7.90s; originalworktreenotformatted, noLinux/new-headActionsclaim.
- Outcomeaudit exposedad-hocevidenceJSONincorrectlyunderreservedartifacts/runs. Movedsixnon-outcomeJSONintodedicatedartifacts/evidence namespaceswithoutcontentchanges; historicalobservationskept. Doclinksupdated; nofakeOutcomefields/timestampsorweakenedauditor. Traceauditfoundplan'slegacyone-digitrequirementcitationgrammar; citationnowplainnumberedreference tooriginalapprovedplan, notinventedtraceIDs.
- Final Node20.20.2 combined eval/outcome/trace lane149/149 passed8.86s, no failures/skips. Full canonical validation324/3240fail44warnings passed1.02s. Final actual authenticated builtCLI E2E passed23.05s.
- Final installer skills@1.7.0 discovered303/303 without helper leakage2.97s. Actual Node20taskCLI12attempts/fourmodes passed7.14s: pass3, prematureexit3infra/0evaluated, reject3productfailed, timeout3timedout (existing counters also evaluated/productfailed).
- Actual changed-skill preflight on isolated complete scripts/skills/benchmarks copy selected all16originalPR-base changedskills,0issues; original historical preflight bytes unchanged. Actual calculate-tokens remained byte-idempotent for metadata/rootREADME/cliREADME. Combined smoke6.26s;324skills211483character-estimatedtokens, not live-model measurement.
- Actual generated63native files parsed:21Copilot/21Claude YAML with js-yaml,21Codex TOML with Python3.13tomllib; canonical bodies preserved,0.93s. No native host launch/runtime-permission certification.
- Corrected structural chain:outcome21templates/5records valid; trace/injection/alignment/freshness/historyverify/release/skills gates pass; no pending scoredrun/newmodelmeasurement. Existing freshness9issues,docs40warnings retained. metrics:check alone fails the alreadydeclared historical fixed10%avgTokens threshold (528->593,+12.3%); monitor-respond routes a separately scoped token-reduction proposal, not threshold/history recalibration or silent dismissal.
- Final integration evidence is artifacts/evidence/pr223-remediation/integration-evidence.json. Parent-owned throwaway smoke scripts removed after proof retention. OriginalPR-base whole-change review snapshot frozen for independent final review; no commit/push/merge authorization inferred.

## Final corrective integration and independent closure

- H1: one valid behavioral RED, compliant/mutant GREEN, then actual Node20 task CLI compliant3/3 passes versus finite-only3/3 product failures/no infra.
- H2: initial invalid public-field selectors preserved as invalid RED; corrected selected-key RED has physical-source control1pass/unknown-source4fail. Full text54/54 GREEN and actual compose/baseline CLIs reject unresolved selected evidence before output or require generation without history mutation.
- WCP-R1: canonical workers return evidence/blockers, never recursively dispatch; orchestrator owns disjoint verification. Actual generation refreshed all three native workflow surfaces. Feedback definitions14–16 are task-grounded, not live-model measurements.
- Final parent integration after all source/generation deltas: root CLI1254/eval116 plus all other root lanes PASS14.13s; Node20 scripts155/155 PASS9.17s; strict five-entry affected compile PASS1.29s; structural/history/full324-skill validation PASS5.28s with44 warnings retained.
- Final actual preflight16skills0issues and42YAML parse/canonical preservation plus token-output idempotence PASS4.79s;21TOML parse/body preservation PASS0.09s. Native host enforcement not claimed. Parent throwaway helpers removed after observed proof.
- Immutable ORIGINAL BASE→workspace V2 package197files/1,188,006bytes reviewed by two independent owners. Both authoritative V2 SPEC/QUALITY PASS: H1/H2/WCP-R1 closed, no current confirmed findings in assigned cumulative scopes.
- Latest source of truth: `artifacts/evidence/pr223-remediation/whole-review-correction-evidence.json`; earlier evidence remains phase-qualified. Source reviews exclude subsequent report/log-only appendices, not any undisclosed implementation delta.
- Local status: **LOCAL_REMEDIATION_VERIFIED_PENDING_OPERATOR_PUBLICATION_DECISION**. No remediation commit/push/new-head Actions/merge. Existing upstream audit, bundled source-map, strict-format and historical token-band residuals remain. Token/rate data unavailable; no numerical cross-agent bill.
