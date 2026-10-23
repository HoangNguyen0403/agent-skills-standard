# Observed verification receipts

Baseline commit: a2228857e4cf5b8ee2d71d96630c586618ec2edd. Commands below were run by orchestrator, not inferred from worker claims. Source-specific results can be invalidated by later edits; final integrated gate pending.

## Prerequisites

- `rtk pnpm install --frozen-lockfile --ignore-scripts`: completed; no lifecycle scripts run.
- Node v22.14.0, pnpm10.0.0, Python3.13.0.
- Native binaries found: codex, claude, gemini. Version-only commands: codex-cli0.163.0, ClaudeCode2.1.289, Gemini0.45.0. `which` exit1 because Copilot/Antigravity/OpenCode weren't found on this PATH. No model/native delegation calls made by those probes.

## Task2 packets

- RED: actual strict CLI/packet regressions failed against old extraction-only helper; successcases returned usageexit2, invalidfield cases lacked required classification.
- First GREEN: `rtk proxy python3 scripts/skill-tests/common-subagent-driven-development/test_task_brief.py`:15passed; review_package13passed; sdd_progress6passed.
- Actual approvedplan smoke: helper generated .agent/sdd/provider-neutral-delegation/task-2-682122a7a128.md with complete explicit authority/invariant andTask2text, noTask3text. Smoke receipt task-2-smoke-receipt.json. Independentworker couldreadthatpacket in this sharedworkspace, notproofremotetransport.
- Independent review found fivegaps: defaultoutputpreflight containment, ownedpath symlinks/root alias, singlebufferidentity, limitsvalidation, filesystemerrorclassification. First GREEN is NOT finalacceptance; correctionspending.

## Task3 contentdelivery

- RED:8newdeliverycases failed (repeatstubs, siblingstubs, stalecontent, obsoleteforce_reloadschema, missingstructureddeliveryevidence); existing incidental SERVER_INSTRUCTIONS wordingtest alsofailed andwasdeleted, notrepinned.
- Sourcecomplete/callercutoverclaimedbyworker; integrated GREEN pending catalogtools edits/settlement.

## Task5 exports

- RED:25failures across capability/transformer/consumer suites, including oldCopilotpath, falseCodexsandboxprojection, missingstructuredprojection/status. Workflowwrapperparity failureexpected whilecanonicalpolicysourceschanged; finalgenerationpending.
- First GREEN:3files/65tests passed for agentCapabilities, SpecialistTransformer, SpecialistSyncService. Native supportstillnot_verified; no liveoperationperformed. Independentreviewpending.

## Task6 routing

- RED:5failures (operatorprofile andcombinedbootstrap pulledperformance/a11y; reviewpulleda11y/mobile; baresubagentmissing; PagesRouterpulledmobile),68controls passed.
- GREEN:73/73tests passed after narrowmetadataedits; matcherunchanged. Independentreviewpending; no catalogwideefficacyclaim.

## Task7 usage/qualification

- RED:MCPjournal/telemetry5failures:missingActorsabsent,cancelledrejected, includedreasoningdoublecharged8.5vs7.5, ambiguousreasoningwronglypriced8.0; payloadforwardingtestremovednotrepinned.
- RED:nodefocusedqualification/cohort14passed,3failed:summary/comparisonfuncsabsent, qualificationmoduleabsent. These are prerequisitesfor newbehavior, not passingnativeevidence.
- GREENsourceinprogress; no paidtrials/nativeconformanceauthorized.

## Task4 workflowcatalog

- RED:MCP12newlookupcasesfailed,4existingpassed; CLIacquisition7failed, lockvalidation6failed, incompletecommandfalse-successandcatalogbody/provenancecasesfailed. Actualtempinstallfixtures; no claimedpassingcatalog.
- Sourceimplementationinprogress.

## Task1 policy

- Independentreviewround1:approved-inlinebranch contradiction andpacketworkerbootstrap contradiction.
- Round2:inlineaddressed, oneunconditional load_skills_for_files blockremained. Sliceescalatedto PersonalDelivery afterfailedcorrectiveround, notpremium.
- DomainDeliverynarrowcorrectionsettled; cumulativere-reviewpending. No policycompletenessclaimeduntilreviewclosed.
