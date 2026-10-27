# Assignment packet: T2

- Plan: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/mindless-impala/docs/prd/prd-ai-test-assurance.md
- Plan SHA-256: 5e5216a6126257490315db0cf5bf9c1ced091a16babfb73872691c1c6c888c06
- Task number: 2
- Project domain: Authorized personal repositories agent-skills-standard and testguard; no employer data
- Workspace root: /Users/nguyenhuyhoang/.paseo/worktrees/36t7hh3x/ai-test-assurance

## Goal

Implement reviewed T1 TestGuard reporting contract and AC-01 through AC-04

## Owner

Personal - Cheap report implementer

## Authority: allowed operations

- Read assigned repository sources
- Edit owned paths
- Prepare regression cases and verification commands

## Authority: forbidden actions

- Commit
- Push
- Deploy
- Delegate
- Run builds/lint/tests/formatters mid-flight
- Read employer repositories or credentials

## Authority: required approvals

- None declared (explicit empty list).

## Global invariants

- One owner per component; preserve existing user changes
- No fabricated verification
- Independent review required
- No weakening assertions to obtain green

## Non-goals

- Unrelated edits
- Release/deploy/merge
- Recursive delegation
- Premium calls

## Owned paths

- pkg/engine
- pkg/models
- pkg/reporter
- cmd/testguard

## Acceptance criteria

- **T2-1**: Complete scans report exact effective scope independently of findings
- **T2-2**: Missing unreadable malformed unsupported required scope cannot become clean success
- **T2-3**: Empty scopes require explicit allowance and become not applicable, never passed
- **T2-4**: Incomplete analysis takes precedence over blocker findings without losing them
- **T2-5**: Use reviewed T1 exact scan schema/version/exit/compatibility policy; no independent format invention

## Verification

- cwd: .
  command: rtk proxy go test ./pkg/engine ./pkg/reporter ./cmd/testguard
  expected: Focused behavior tests pass after orchestrator staged RED/GREEN verification

## Required standards

- None declared (explicit empty list).

## Source files

- pkg/engine/engine.go (SHA-256 1e170ef345be3cb9e69781757f123f99f8f2d9718260cfa218991cf392009a37)
- pkg/engine/discovery.go (SHA-256 4c5d97033483014ad9f9f94d1f7d6e32d67e62de192c10351c5752aef6a904ab)
- cmd/testguard/main.go (SHA-256 82e3b40644b1c7dd5cd3582ef2128156c125fcf32204815582c1c2c33ff14b9e)
- pkg/reporter/azure.go (SHA-256 0f42fbba2a4e13006e9b3126677812acd0c89b7ed0a50360033624909654ea32)
- pkg/models/violation.go (SHA-256 baf1b7a6d20e0ec05948e03c22d6d8a433d231b3640e85129d9dc8842636c0a1)
- .agent/sdd/ai-test-assurance/srs-ai-test-assurance.md (SHA-256 670ac1418a6ac3b0b50d6a05cf1dbd72c8d5e54091574df30b0e29199a5c29d5)

## Source revision

- 8fc53b4c683d312359166e49e397fa887dd0ac92

## Dirty identity

- No tracked diff at assignment preparation; untracked inputs bound by source_files

## Dependencies

- None declared (explicit empty list).

## Output contract: receipt destination

- /Users/nguyenhuyhoang/.paseo/worktrees/36t7hh3x/ai-test-assurance/.agent/sdd/ai-test-assurance/task-2-report.md

## Output contract: status vocabulary

- done
- done_with_concerns
- blocked
- needs_context

## Output contract: stop conditions

- Material contract change
- Missing prerequisite
- Account ineligibility

## Limits

- status: advisory
- attempts: 1

## Selected task text

### Task 2: Make TestGuard scan/report outcomes truthful (T2)

- Owner: TestGuard engine/report worker; 5 points, medium confidence.
- Depends on: reviewed T1.
- Owned existing paths: `pkg/engine/engine.go`, `pkg/engine/discovery.go`, engine tests, `pkg/models/violation.go`, `pkg/reporter/`, `cmd/testguard/main.go`; new report-model files only as approved by T1. This owner alone edits the engine during this wave.
- Requirements: REQ-01; AC-01 through AC-04.
- Steps: propagate discovery/read/parse failures; account for effective selection and unsupported scope; emit reviewed envelope in JSON and consistent console/Azure verdicts; implement empty-scope policy and precedence; report tool/source identity without fabricating unavailable build metadata; migrate discovered consumers and relevant CLI documentation.
- Verification: focused Go regression cases for complete, unreadable, parse-failed, unsupported, empty-allowed, empty-disallowed and incomplete-plus-blocker inputs. After freeze: `rtk proxy go test ./pkg/engine ./pkg/reporter ./cmd/testguard` plus actual freshly built CLI invocations on temporary fixtures using T1 exact flags. OS permission cases use deterministic fault injection where chmod cannot reproduce denial.
- Non-goals: AST rewrite, rule catalog expansion, implementing advertised diff/config features unless necessary to the frozen contract; unsupported diff mode must fail explicitly or honestly identify full scope, never claim changed-files-only.
