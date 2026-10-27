# Assignment packet: T6

- Plan: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/mindless-impala/docs/prd/prd-ai-test-assurance.md
- Plan SHA-256: 5e5216a6126257490315db0cf5bf9c1ced091a16babfb73872691c1c6c888c06
- Task number: 6
- Project domain: Authorized personal repositories agent-skills-standard and testguard; no employer data
- Workspace root: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/mindless-impala

## Goal

Add adversarial test-quality controls using actual existing scorer for AC-15 AC-16 under T1 contract

## Owner

Personal - Cheap eval implementer

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

- skills/common/common-tdd/evals/evals.json
- skills/quality-engineering/quality-engineering-test-healing/evals/evals.json
- scripts/evals/test-quality-controls.test.ts
- scripts/evals/__fixtures__/test-assurance

## Acceptance criteria

- **T6-1**: Wrong-but-keyword-rich oracle copying weak assertion false clean and weakened healing controls fail intended assertion IDs
- **T6-2**: Legitimate differently phrased answers pass selected assertions; do not claim arbitrary semantic understanding
- **T6-3**: Use real existing scorer; no paid live eval or shared scorer edits; return exact unsupported gaps rather than inventing scores

## Verification

- cwd: .
  command: rtk proxy node --import tsx --test scripts/evals/test-quality-controls.test.ts
  expected: Real scorer rejects adversarial candidates and accepts legitimate controls

## Required standards

- skills/common/common-tdd/SKILL.md (skills/common/common-tdd/SKILL.md, revision 2902d3a26ef28015c2109f70526c7c6606a90fb510de6766566f1a0ee0a4ee31)

## Source files

- scripts/evals/scorer.ts (SHA-256 5f2547ec911309d11b4c3db54982fcc09769f7a08678ff1e4ebfd8efacdf7142)
- skills/common/common-tdd/evals/evals.json (SHA-256 536a1e76de7981b1e5396a8a4becaa3ae5be518b729b31a79b3ba89503717043)
- skills/quality-engineering/quality-engineering-test-healing/evals/evals.json (SHA-256 8ce106978017e1f62c28b2482489bea4d9447b707ca13dc89bebeb2b1edb062c)
- .agent/sdd/ai-test-assurance/srs-ai-test-assurance.md (SHA-256 670ac1418a6ac3b0b50d6a05cf1dbd72c8d5e54091574df30b0e29199a5c29d5)

## Source revision

- 92d06c420f6a41f08e11579423e4e3eacdb7880d

## Dirty identity

- No tracked diff at assignment preparation; untracked inputs bound by source_files

## Dependencies

- None declared (explicit empty list).

## Output contract: receipt destination

- /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/mindless-impala/.agent/sdd/ai-test-assurance/task-6-report.md

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

### Task 6: Add adversarial testing-quality eval controls (T6)

- Owner: AGS eval-fixture worker; 3 points, medium confidence.
- Depends on: reviewed T1; fixture design may run beside T2/T4. Final acceptance depends on T4 guidance.
- Owned paths: test-quality skill eval metadata/candidates and dedicated scorer regression fixtures selected by T1; do not edit `scripts/evals/scorer.ts` or shared behavior without orchestrator-approved scope expansion.
- Requirements: REQ-06; AC-15, AC-16.
- Steps: add wrong-but-keyword-rich controls, oracle-copying controls, tautological/mock-echo cases, empty-scan claims, weakened healing and valid paraphrase controls; prefer existing assertion primitives that actually distinguish behavior; record unsupported assertion semantics as explicit gaps rather than faking scores.
- Verification after freeze: run real existing scorer against controlled candidate transcripts using the exact local command frozen by T1. Demonstrate incorrect candidates fail and legitimate equivalents pass for the selected assertion. No paid live evals or claims of model effectiveness.
- Stop: existing primitives cannot express an AC safely; return a bounded scorer-change proposal for separate ownership before implementation.
