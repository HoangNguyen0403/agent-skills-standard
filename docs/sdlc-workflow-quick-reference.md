# SDLC Workflow Quick Reference

Agent Skills Standard syncs workflows into each agent's native surface. Run `ags sync`, then invoke the synced workflow from Claude, Codex, Cursor, Gemini, Copilot, Kiro, or another configured runtime.

| Stage      | Workflow                   | Use When                               | Primary Output           |
| ---------- | -------------------------- | -------------------------------------- | ------------------------ |
| Route      | `sdlc`                     | Unsure what to run next                | next workflow            |
| Brainstorm | `brainstorm-feature`       | Idea is vague                          | `product-brief.md`       |
| Plan       | `plan-feature`             | Feature needs PRD and task slices      | `prd-[slug].md`          |
| Design     | `design-solution`          | Contracts or architecture are unclear  | `architecture-[slug].md` |
| Readiness  | `implementation-readiness` | PRD/design/AC/test plan needs go/no-go | readiness verdict        |
| Build      | `implement-feature`        | Approved feature needs code            | `task.md` and handoff    |
| Fix        | `dev-fix`                  | Bug ticket needs remediation           | fix plan and evidence    |
| Review     | `review-ticket`            | PR or ticket needs multi-lens review   | review verdict           |
| Verify     | `verify-work`              | Work is code-complete but unproven     | `walkthrough.md`         |

## Native Runtime Surfaces

| Agent               | Workflow Surface              |
| ------------------- | ----------------------------- |
| Antigravity/Kiro    | `.agents/workflows/*.md`      |
| Claude/Roo/OpenCode | command markdown              |
| Gemini              | TOML command files            |
| Copilot             | prompt files                  |
| Cursor/Trae/Codex   | skill folders with `SKILL.md` |

## Rule

Do not run daily SDLC work through `ags`. Use `ags` to initialize, sync, validate, and update standards; run the synced workflows inside your agent.

## External MCPs

Jira, Azure DevOps, Zephyr, and similar MCPs are optional integration points. Use them when already connected to fetch tickets, update traceability, or publish test evidence; otherwise keep the same workflow running from local specs, task files, and walkthrough evidence.

## Role Quick Reference

| Role     | Recommended Surfaces                                             |
| -------- | ---------------------------------------------------------------- |
| EM       | `sdlc`                                                           |
| PM/BA    | `brainstorm-feature`, `plan-feature`, `implementation-readiness` |
| Engineer | `dev-fix`, `implement-feature`, `review-ticket`, `verify-work`   |
| QA       | `zephyr-coverage-analysis`, `verify-bug`                         |

## Specialist Quick Reference

| Need                                 | Specialist                              |
| ------------------------------------ | --------------------------------------- |
| Jira Ticket summary and ACs          | `specialist-jira-analyst`               |
| Code structure and blast radius      | `specialist-codebase-scout`             |
| Architecture boundaries              | `specialist-architecture-guard`         |
| Security review                      | `specialist-security-reviewer`          |
| Test gaps                            | `specialist-test-gap-finder`            |
| AC coverage                          | `specialist-ac-verifier`                |
| Azure DevOps PR metadata and threads | `specialist-ado-pr-reviewer`            |
| Zephyr TC discovery                  | `specialist-zephyr-scanner`             |
| Confluence context                   | `specialist-confluence-searcher`        |
| Approved PR comment posting          | `specialist-pr-commenter-batch`         |
| Integration test generation          | `specialist-integration-test-generator` |
| TC creation                          | `specialist-tc-creator`                 |
