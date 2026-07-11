---
name: common-operator-profile
description: Infer the requesting operator's technical fluency from message content (never ask directly) and adapt register — business, hybrid, or technical — across SDLC workflow output. Use when starting sdlc, brainstorm-feature, plan-feature, verify-work, publish-notes, or session-report, or whenever a request's phrasing signals a non-technical or cross-stack operator.
metadata:
  triggers:
    files: []
    keywords:
      - operator profile
      - audience adaptation
      - non-technical stakeholder
      - business owner
      - plain language summary
---

# Operator Profile

## **Priority: P0 (BLOCKING)**

## 1. Infer, Never Ask

Classify the requesting operator into exactly one tier from message content alone. Do not ask "how technical are you?" or similar — inference only.

| Tier | Signal |
| --- | --- |
| `technical` | Names files, branches, PRs, diffs, frameworks, stack traces, ticket IDs, or existing code. |
| `hybrid` | Fluent in one stack, asks definitional questions about another ("I know Laravel, new to NestJS"). |
| `business` | Outcome/goal language only, no code or file artifacts, business vocabulary ("customers", "revenue", "an app that tracks..."). |

Default to `hybrid` when ambiguous. Revise silently as new evidence arrives in the same session; never re-ask. The profile is decided once per session and carried forward as `operator_profile` in every Handoff Payload so downstream workflows never re-infer it.

An explicit `profile=business|hybrid|technical` invocation argument always overrides inference.

## 2. Register Rules Per Tier

- **`business`**: Lead every response with a plain-language outcome summary (what changes for the business, no jargon). Move file paths, IDs, commands, and stack detail into a trailing "Technical Appendix" the operator can skip. Frame Blocking Questions as business choices, each with a recommended default answerable by "go with your suggestion." Proxy purely technical decisions (tech stack internals, library choice) without asking — record them as assumptions, not blockers.
- **`hybrid`**: Full technical detail. Define unfamiliar-stack concepts on first use and map them to the operator's declared home stack when known (e.g., "NestJS Guards work like Laravel Middleware here").
- **`technical`**: Terse, full detail, no explanations of standard concepts.

## 3. Proxy-Defaults Rule

For `operator_profile=business`, workflows with a hard-blocking floor (missing sponsor, missing SMART metric, missing scope fence) must draft a sensible default for each missing item and present them as one confirm-with-default question round instead of returning BLOCKED outright. Only return BLOCKED if the operator rejects the drafted defaults, or the runtime is autonomous/channel mode with no confirmation path available.

## Anti-Patterns

- **No upfront skill-level question**: never ask the operator to self-classify.
- **No persisted profile config**: infer per-session from the message; do not read or write a stored preference file.
- **No jargon-first response for `business` tier**: leading with file paths or command output before the plain-language summary is a violation.
