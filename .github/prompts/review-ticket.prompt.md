---
description: "Review a ticket or PR through focused specialist lenses: scope, architecture, security, tests, AC coverage, and PR metadata."
---

# Review Ticket Workflow

Goal: Produce a PR-ready review verdict using compact specialist fanout and evidence-linked findings.

## Steps

1. Load scope:
   - Ticket/story, PR URL/diff, changed files, ACs, test evidence, and loaded framework skills.
   - Jira/GitHub/GitLab/ADO/Zephyr/code-review-graph MCPs when configured; otherwise use exported ticket, diff, and local files.

2. Run specialist lenses:
   - `specialist-codebase-scout`: affected files, patterns, blast radius, tests.
   - `specialist-pr-reviewer`: PR/MR metadata, active threads, template gaps.
   - `specialist-ac-verifier`: AC coverage and scope creep.
   - `specialist-architecture-guard`: architecture and design risks.
   - `specialist-security-reviewer`: OWASP, Vibe Security, data provenance.
   - `specialist-test-gap-finder`: missing tests and weak assertions.

3. Merge findings:
   - Deduplicate by root cause.
    - Keep only actionable findings with evidence.
    - Calibrate severity: Blocker, Major, Minor, Suggestion.
    - Mark unverified items as assumptions or requests for evidence.
    - Lead with findings, not praise or summary.

4. Decide verdict:
   - APPROVE: no Blocker/Major, required evidence present.
   - CHANGES REQUESTED: fixable Blocker/Major.
   - BLOCKED: missing diff, ticket, environment, or required tool/export.

5. Optional publish:
   - Use `specialist-pr-commenter-batch` only after user approves posting comments.
   - Otherwise produce local review report.

## Output Template

```md
# Review Ticket Report

## Verdict

## Findings
| Severity | Lens | Evidence | Fix |
| --- | --- | --- | --- |
| [severity] | [lens] | [file/AC/tool] | [fix] |

## Evidence Gaps

## Next Workflow

## Cost Report
```
