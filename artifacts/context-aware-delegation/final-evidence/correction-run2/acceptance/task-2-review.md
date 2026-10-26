# Task 2 independent acceptance review

## Verdict

**Source/spec review: APPROVE. No BLOCKER or MAJOR findings.** Failed ACs: none in AC-07..14/18. This verdict accepts the guidance source and bounded offline evidence, not live efficacy, runtime enforcement, host activation or merge authority.

## Scope and standards

Reviewed `task-2-brief.md`, corrected `task-2-report.md`, cumulative `task-2-review-package-v2.md` from original base `92d06c420f6a41f08e11579423e4e3eacdb7880d`, and actual capability SKILL, routing reference and eval source. Independently inspected the full 65-candidate `corrected-scorer-smoke-result.json` and the actual scorer's pressure mapping and matching semantics (`scripts/evals/scorer.ts:47-88,155-209,475-483`). No commands executed.

Loaded standards: common-code-review, common-security-audit, common-owasp, common-llm-security, common-subagent-driven-development, common-skill-creator, common-workflow-writing, common-feedback-reporter, common-session-retrospective, common-tdd, common-best-practices, typescript-language, nestjs-testing, angular-testing; managed agent-skills-eval-pressure-cases. Framework-specific standards do not imply this change affects an Angular/NestJS application.

## AC/source check

| AC | Evidence and conclusion |
| --- | --- |
| AC-07 | SKILL.md:61 and routing-table.md:36 prefer an existing tool/script before another model. |
| AC-08 | SKILL.md:65 and routing-table.md:46 preserve explicit model/effort; reference also preserves mode/features. |
| AC-09 | routing-table.md:47-48 distinguishes vendor effort semantics, unsupported and unknown; actual configuration stays observable or unknown, never invented. |
| AC-10 | SKILL.md:55,93 and routing-table.md:50 retain separate premium approval and bounded analysis-only/no-state-mutation scope. Strong capability does not select an account. |
| AC-11 | routing-table.md:52-64 reuses receipts for requested capability, actual provider/model/effort, support, selection reason, authority, budget and substitution evidence; adds no mandatory runtime schema. |
| AC-12 | routing-table.md:75-80 separates tokens, money, quota and elapsed time, counts all actors/repairs/failures and forbids numerical monetary savings without resolved prices and full comparable coverage. |
| AC-13 | routing-table.md:45,72 permits fallback only within already-authorized eligible routes. |
| AC-14 | routing-table.md:70-73 distinguishes missing prerequisites, defective output and observed exhaustion; defects receive one corrective assignment. |
| AC-18 | Specific LLM model-tier/effort keywords are added; no bare `model` trigger. Task 3 repository-backed test covers model-tier discovery. |

## High-tier architecture/security lens

Controlling host/project eligibility remains the authority for resolution. No provider-specific model ladder, resolver service, billing mutation, persisted preference interface, telemetry store, or new lifecycle/assignment schema is introduced. SNC arithmetic, sensitive-change floors, irreversible-action approval and independent-review requirements remain intact. Unknown authority in a receipt is not dispatch permission: the recovery table expressly blocks missing authority. Host enforcement is not claimed by advisory guidance.

No confirmed permission weakening, injection path, secret exposure, unbounded agent recursion or premium self-approval in the changed source. Web/API/mobile implementation and dependency surfaces are not affected by this diff.

## Scorer and evidence assessment

Corrected pressure cases use nonempty action/concept assertions; their mapping to `contains` is real, not an inert expected-behavior field. v1 is case-insensitive substring matching; v2 tokenizes/stems and accepts token conjunction without semantic polarity. `no` is discarded by the token-length filter, and conjunction matching cannot establish whether an action was refused merely because its words appear. The revised cases do not rely on adding a negation to topic vocabulary as their discriminator.

The supplied actual-scorer artifact contains 13 cases, 39 unsafe and 26 safe candidates, with no unexpected decisions. All unsafe rows reject under both semantics; safe rows pass under v2. Some safe paraphrases fail v1, which is recorded rather than hidden and is permitted by the assigned validation contract. The fixtures include unsafe answers that mention a rule before breaking it; for example the defective-output candidate mentions `corrective assignment` but is rejected by the other required concept, `expected result`.

This establishes bounded adverse-fixture discrimination, not general semantic safety or resistance to arbitrary keyword-stuffed contradictory answers. Ordinary eval assertions are likewise textual checks, not proof of model behavior. No live efficacy or economic claim is supported or made. No scorer/schema rewrite is needed for this scoped acceptance.

## Verification limits

Parent reports MCP 241 tests, Python 42 tests, skill validation, and all 65 candidate decisions passed. This reviewer inspected the supplied candidate results but did not rerun them. Parent reports `evals:audit` exits 0 with two unrelated existing database-hana single-assertion issues (evals 2/3); it is not a perfect warning-free audit. Alignment passes its threshold of 70 with unrelated Flutter/Swift warnings. None is represented here as reviewer-executed verification.

Generated exports, final integrated revision-bound checks and whole-branch acceptance remain integration gates. No source-quality defect remains open for this task.
