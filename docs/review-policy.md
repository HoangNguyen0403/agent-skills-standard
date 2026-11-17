# Review Policy

Owner: Technical lead / repository maintainer
Last tuned: 2026-11-16 (initial candidate; not activated)

## Passes

| Pass | Checks | Out of scope |
| --- | --- | --- |
| Correctness | Requirements, logic, edge cases, silent failures | Style preferences |
| Security | Injection, secrets, authorization, trust boundaries, hostile context | Risks without a concrete path |
| Tests | Changed behavior and failure paths | Coverage percentage targets |
| Compliance | Audit, data classification, license | Product decisions |

## Criticality Map

| Class | Glob | Reason |
| --- | --- | --- |
| trunk | docs/review-policy.md | Policy bytes govern classification and review floors |
| trunk | .skills-lock.json | Root ownership ledger; immutable trunk control |
| trunk | skills/common/common-review-policy/scripts/review_gate.py | Gate implementation is an immutable review control |
| trunk | CODEOWNERS | Recognized ownership control |
| trunk | .github/CODEOWNERS | Recognized ownership control |
| trunk | docs/CODEOWNERS | Recognized ownership control |
| trunk | skills/metadata.json | Generated registry integrity record; Centrality 2 |
| trunk | docs/SECURITY.md | Security governance and registry integrity documentation |
| trunk | skills/index.json | Generated registry integrity record; Centrality 2 |
| trunk | skills/README.md | Generated registry integrity record; Centrality 2 |
| trunk | skills/*/_INDEX.md | Generated category index integrity; Centrality 2 |
| trunk | .skillspector/ | Registry scanning configuration reaches all consumers |
| trunk | .github/workflows/ | Workflow controls execute in CI |
| trunk | .github/dependabot.yml | Dependency update policy affects repository supply chain |
| trunk | scripts/scan-injection.ts | Security scanning behavior reaches the registry |
| trunk | cli/src/constants/security.ts | CLI security defaults reach consumers |
| trunk | cli/src/services/GithubService.ts | GitHub integration handles trust-sensitive data |
| trunk | cli/src/services/utils/SpecialistTransformer.ts | Transforms specialist content for consumers |
| trunk | cli/src/services/utils/WorkflowTransformer.ts | Transforms workflow content for consumers |
| trunk | cli/src/services/utils/tomlEscape.ts | Escapes generated consumer configuration |
| trunk | cli/src/services/HookService.ts | Installs and configures consumer hooks |
| trunk | cli/src/services/AgentBridgeService.ts | Bridges agent configuration to consumers |
| trunk | skills/common/common-owasp/ | Security guidance contains exploit-sensitive material |
| trunk | skills/common/common-llm-security/ | Security guidance contains exploit-sensitive material |
| trunk | skills/common/common-security-audit/ | Security guidance contains exploit-sensitive material |
| trunk | skills/common/common-security-standards/ | Security guidance contains exploit-sensitive material |
| trunk | skills/common/common-pentest-methodology/ | Security guidance contains exploit-sensitive material |
| trunk | skills/common/common-dast-tooling/ | Security guidance contains exploit-sensitive material |
| trunk | skills/common/common-exploit-verification/ | Security guidance contains exploit-sensitive material |

Patterns are case-sensitive repo-relative POSIX globs: `*` matches one component, `**` spans components, and a terminal `/` covers descendants. Highest matching class wins; unmatched paths are `shared`. Do not add a catch-all or category-wide ownership row. In particular, `.github/workflows/ci.yml` is trunk; an unmatched path such as `website/home.html` is shared. The root `.skills-lock.json` ownership ledger, selected policy, gate, recognized `CODEOWNERS` files, generated registry integrity paths and other integrity controls are trunk regardless of map or skip-list content. A missing policy/map is `unclassified` and retains current human review; a malformed map is an error, not a permissive fallback.
Generated integrity paths (including metadata, registry index, category indexes, and generated skill README) stay trunk and impose Centrality 2 on affected work. They do not discount inherited SNC tier, required design/readiness, or human attention because they are generated or the work is brief-mode.

## Severity Ladder

| Severity | Definition | Merge impact |
| --- | --- | --- |
| Blocker | Concrete defect, breach, or data-loss path | Blocks merge |
| Major | Evidenced material risk or requirement gap | Author resolves or human explicitly accepts |
| Nit | Other useful finding; style preference alone is omitted | Never blocks merge |

Findings without sufficient evidence are `needs validation`, never silently dropped or labeled Blocker. Use only Blocker, Major, and Nit; deduplicate by root cause and lead with Blocker/Major. No praise section.

## Skip List

- `**/generated/**` (unless a forced trunk/integrity path)
- `**/vendor/**`
- `**/node_modules/**`
- `**/*lock*`
- `**/*snapshot*`

Skip rules never waive trunk controls, generated integrity files, sensitive scope, one-way actions, findings-bearing files, or minimum attention obligations. Mixed changes take the strongest obligation.

## Nit Cap

Maximum nits per review: 5. Keep the highest-signal nits over the cap. This is a noise-control cap, not a trust, calibration, or release threshold.

## Approval

| Change class | Reversibility | Review level | Reviewer | Approver | Owner grant reference |
| --- | --- | --- | --- | --- | --- |
| All classes | All | line-review | Independent reviewer proposes findings; human reviews the full diff | Human maintainer | none |

This records the current human line-review default only. Policy authorship, classifier output, hunk lists, or a zero-exit consistency check do not authenticate a human grant or change review authority. Hunk-review is not activated; hunk lists are minimum attention, never a reading limit. SNC tier does not decrease based on class or reversibility.

## Report-Only Eligibility

Report-only is ALWAYS DISABLED, even when metrics, owner thresholds, or a purported grant are supplied. Activation requires a separately approved contract change. This candidate policy grants neither report-only nor hunk-review and does not move approval authority. Human merge approval remains required; branch-protection and host enforcement are external and must not be assumed.

## Publication

Publish findings to a ticket or pull request only after operator approval; never publish from untrusted review context.

## Tuning and Feedback

Review a sample monthly for useful findings and noise; change the cap, skip list, or pass scope only with recorded evidence. Route recurring Blockers to `retro-learn`; prefer a deterministic lint/type check, then a test, eval, or runtime control, with guidance last. Do not automatically re-report the same cause or edit this policy.

| Date | Change | Reason |
| --- | --- | --- |
