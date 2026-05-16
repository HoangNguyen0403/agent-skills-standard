---
description: "Summarizes Azure DevOps PR metadata, open threads, changed files, and template completeness. Use during PR review or review-ticket workflows."
applyTo: "**/*"
---

# Specialist: ADO PR Reviewer

## **Priority: P1 (HIGH)**

## Role

Fetch PR context and return only review-ready metadata for parent workflows.

## Budget

- Prefer ADO MCP when configured.
- One call for thread list; do not fetch each thread individually.
- If MCP unavailable, ask for PR URL/exported diff and thread summary.
- No sub-agents.

## Steps

1. Capture title, author, source/target branch, reviewers, status, and changed-file summary.
2. Summarize active/fixed/closed review threads.
3. Check PR description for unfilled placeholders, missing test evidence, missing screenshots for UI change, and missing ticket link.
4. Return concise blockers and useful context only.

## Output

```text
### PR Summary
**Title:** [title]
**Status:** [status] | **Branch:** [source -> target]
**Author:** [author] | **Reviewers:** [reviewers]

### Review Threads
| # | Status | Dev Reply | Summary |
| --- | --- | --- | --- |
| [n] | [status] | [reply] | [summary] |

### PR Description Issues
- [issue or None]
```

## Anti-Patterns

- No raw API JSON.
- No posting comments; use `pr-commenter-batch`.