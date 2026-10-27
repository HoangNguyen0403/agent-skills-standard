# Assignment packet: T4

- Plan: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/mindless-impala/docs/prd/prd-ai-test-assurance.md
- Plan SHA-256: 5e5216a6126257490315db0cf5bf9c1ced091a16babfb73872691c1c6c888c06
- Task number: 4
- Project domain: Authorized personal repositories agent-skills-standard and testguard; no employer data
- Workspace root: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/mindless-impala

## Goal

Extend canonical AGS intent and healing guidance to reviewed T1 contract and AC-08 AC-09 AC-14

## Owner

Personal - Cheap guidance implementer

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

- skills/common/common-tdd/SKILL.md
- skills/common/common-tdd/references/quality-contract.md
- skills/quality-engineering/quality-engineering-test-healing
- .agents/workflows/test-loop.md

## Acceptance criteria

- **T4-1**: Extend existing intent record, not a competing checklist; add independent oracle owner and boundary realism
- **T4-2**: Risk-sensitive fault evidence; no blanket mutation score or test count target
- **T4-3**: Unchanged assertion text cannot authorize weakened fixture/selector behavior; preserve real-bug and quarantine paths
- **T4-4**: No generated mirror edits; provide canonical changed paths and good/bad scenario review

## Verification

- cwd: .
  command: Independent review of frozen deliverables and stated ACs
  expected: No unresolved material findings

## Required standards

- skills/common/common-tdd/SKILL.md (skills/common/common-tdd/SKILL.md, revision 2902d3a26ef28015c2109f70526c7c6606a90fb510de6766566f1a0ee0a4ee31)

## Source files

- skills/common/common-tdd/SKILL.md (SHA-256 2902d3a26ef28015c2109f70526c7c6606a90fb510de6766566f1a0ee0a4ee31)
- skills/common/common-tdd/references/quality-contract.md (SHA-256 b8411152f012da4812f6f57fc07266ff26fc14b280be077babe774b792a6aad1)
- .agents/workflows/test-loop.md (SHA-256 a7365624439d743f726b116ba21002f08a1767b24f2253606fc439896cd53ee9)
- .agent/sdd/ai-test-assurance/srs-ai-test-assurance.md (SHA-256 670ac1418a6ac3b0b50d6a05cf1dbd72c8d5e54091574df30b0e29199a5c29d5)

## Source revision

- 92d06c420f6a41f08e11579423e4e3eacdb7880d

## Dirty identity

- No tracked diff at assignment preparation; untracked inputs bound by source_files

## Dependencies

- None declared (explicit empty list).

## Output contract: receipt destination

- /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/mindless-impala/.agent/sdd/ai-test-assurance/task-4-report.md

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

### Task 4: Extend AGS intent, layer and healing guidance (T4)

- Owner: AGS skill/workflow worker; 3 points, high confidence.
- Depends on: reviewed T1. May run beside T2.
- Owned paths: canonical `skills/common/common-tdd/SKILL.md` and `references/quality-contract.md`; relevant canonical QE healing/triage guidance and `.agents/workflows/test-loop.md` identified in T1. Generated mirrors are owned by T8, not this worker.
- Requirements: REQ-03, REQ-05; AC-08, AC-09, AC-14.
- Steps: extend the existing intent record by reference to the shared schema; require independent oracle provenance and risk-sensitive fault evidence; make real/fake/mock boundaries explicit; preserve justified cross-layer checks; clarify that unchanged assertion text and repeated green are insufficient if fixtures/selectors weakened the behavior; preserve real-bug and quarantine routing.
- Verification: independent review against concrete good/bad scenarios; T6 adversarial cases exercise the changed guidance. No numeric score, universal mutation threshold, or fabricated model-run result.
- Non-goals: separate checklist platform, schema changes owned by T5, blanket end-to-end testing.
