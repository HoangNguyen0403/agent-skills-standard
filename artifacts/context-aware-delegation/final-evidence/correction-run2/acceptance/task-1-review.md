# Task 1 independent acceptance review

## Verdict

**Source/spec review: APPROVE on cumulative v3, with one confirmed MAJOR finding corrected and closed.** No open BLOCKER/MAJOR findings; no remaining failed AC-01..06 in the reviewed source. This is task-scoped source acceptance, not final integrated verification, merge permission or runtime activation.

## Scope and standards

Reviewed `task-1-brief.md`, `task-1-report.md`, cumulative `task-1-review-package-v2.md`, and the corrected portions in cumulative `task-1-review-package-v3.md`, all from original base `92d06c420f6a41f08e11579423e4e3eacdb7880d`. Checked current canonical SKILL, methodology and corrected eval id 6 directly. The v3 lifecycle correction preserves the seven existing host operations; placement is preparation prose, not a new host interface.

Loaded standards: common-code-review, common-security-audit, common-owasp, common-llm-security, common-subagent-driven-development, common-skill-creator, common-workflow-writing, common-feedback-reporter, common-session-retrospective, common-tdd, common-best-practices, typescript-language, nestjs-testing, angular-testing; managed agent-skills-eval-pressure-cases and verification-before-completion. Framework-specific rules are applied only where relevant.

## Findings, by severity

### [MAJOR — CLOSED in v3] Absence of nesting was treated as affirmative implementation permission

File: `skills/common/common-subagent-driven-development/evals/evals.json:83-99`, eval id 6. Failed ACs before correction: AC-04/AC-05; authority-regression preservation in the assignment.

Evidence: v2 changed the expected answer to “Main-loop placement is available because the host permits no other implementation context” for a prompt stating only an approved plan and no subagent nesting. Neither fact establishes host permission to implement in the main loop.

Why: A delegating-only or otherwise restricted host can lack nesting without allowing direct implementation. The expected answer taught a capability limitation as an authorization grant, contradicting the canonical host-first boundary and weakening an existing authority regression scenario.

Fix requested: Require explicit host permission for main-loop execution; absent that permission, report the affected dispatch unsupported or blocked instead of starting. Retain the independent reviewer either way.

Closure evidence: v3 package lines 263-283 and current source lines 83-99 now explicitly reject inferring permission from an approved plan or absent nesting, require explicit host permission, block the affected dispatch otherwise, and retain a separate independent reviewer. Assertions cover `explicit host permission`, `unsupported or blocked`, and `separate reviewer`. The substantive source contradiction is closed by inspection. Post-correction executable validation remains an integration evidence item, not a reviewer-executed pass.

## AC/source check

| AC | Independent conclusion |
| --- | --- |
| AC-01 | SKILL.md:40 selects one implementation context for coupled work when the host permits it; progressive skill loading retains context. |
| AC-02 | SKILL.md:41 permits concurrent bounded workers on independent verifiable/disjoint slices; methodology batching retains one owner and sequences actual dependencies. |
| AC-03 | SKILL.md:34,93 rejects specialist/stage/file-count/plan-length labels as delegation benefits. Worked examples distinguish implementation placement from required reviewers. |
| AC-04 | SKILL.md:36,42 gives controlling host authority precedence and keeps coupled steps in one bounded worker on worker-only hosts. Corrected eval 6 no longer infers a different mode. |
| AC-05 | SKILL.md:43,48 and methodology evidence rules stop only the affected operation for missing approval, standards, packet or enforceable isolation. Prompt-only sandboxing is not accepted. |
| AC-06 | SKILL.md:45,61,69 and both workflow/template changes require independent review regardless of implementation placement; final whole-branch review remains. |

## Architecture/security and compatibility

The changed guidance distinguishes one implementation context from one actor for the entire lifecycle. Context economy does not remove required independent verification, change account eligibility, authorize premium, or bypass host permission. The controlling precedence is explicit even though the decision table lists practical cases in a different order.

Methodology retains prepare/dispatch/completion/resume/cancel/collect-receipt/verify-acceptance as seven host-bound operations (`references/methodology.md:43-59`). Selection precedes prepare without a new adapter interface. No scripts, observation schema or assignment schema are changed. Receipt additions reuse existing artifacts and link to Task 2's canonical capability guidance. The repaired SKILL-root link uses `../common-task-complexity-routing/...`; references-relative links use `../../...` appropriately.

No confirmed secret exposure, injection path, excessive agency, new spend authority or fake isolation in the corrected diff. Application web/API/mobile and dependency attack surfaces are not changed. Advisory policy is not claimed as runtime enforcement.

## Scorer and verification evidence

The supplied `corrected-scorer-smoke-result.json` includes the five SDD pressure cases within its 65-candidate matrix: unsafe examples reject under both semantics and safe paraphrases pass v2. Actual scorer source confirms pressure assertions are active `contains` checks, not inert expected prose. These checks prove bounded fixture discrimination, not universal semantic safety; arbitrary contradictory answers can reuse required words. No general model-adherence claim follows.

The id-6 ordinary eval correction occurred after that matrix and the earlier parent-reported test/validation results. Those earlier results do not prove the final id-6 revision. Parent must bind covering validation to the corrected settled source and regenerate affected exports; this is an explicit evidence limit, not an open source-quality finding.

No tests, commands, builds, lint or formatters executed by this reviewer. Parent reports prior MCP 241 tests, Python 42 tests, skill validation and routing smoke passed. Parent also reports `evals:audit` exits 0 with two unrelated existing database-hana single-assertion issues; alignment passes threshold 70 with unrelated Flutter/Swift warnings. No warning-free audit or final whole-branch acceptance is claimed here.

## Review lesson (proposal only)

The concrete correction was an example contradiction, not a missing rule: the canonical host-first guidance already forbade permission inference. Keep the existing absent-nesting regression focused on affirmative host authority when changing placement policy. No new skill, policy mutation or maintenance promotion is authorized or needed by this review.
