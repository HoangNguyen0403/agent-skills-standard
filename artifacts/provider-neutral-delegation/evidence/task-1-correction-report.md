# Task 1 Correction Report — Skill-loading role scope

Status: DONE (source settled; no commits, checks, builds, or generated mirrors run)
Owner: server-instructions correction

## Changed paths

| Path | Change |
| --- | --- |
| `mcp/src/server.ts` | Line 82 now says: `Orchestrators and unassigned agents call \`load_skills_for_files\` BEFORE they:`. The role qualifier scopes all three following bullets (source-file edits, PR review, and implementation-advice answers) to orchestrators and unassigned agents. |

## Reason

The prior heading was unqualified, so its three mandatory `load_skills_for_files` cases also appeared to bind valid packet workers, contradicting the packet-worker bootstrap branch above. The heading now makes the branch boundary explicit. The standards-resolution and compliance-audit requirements above remain unchanged; no exception was added to those requirements.

## Verification and limits

- Read back `mcp/src/server.ts:79-91` after the edit; the qualified heading and all three original bullets are present.
- No tests, checks, builds, linters, formatters, generated mirrors, or commits were run, per assignment.

## Review handoff

Independent review can verify the one-line qualification at `mcp/src/server.ts:82` against AC-10.a and the packet-worker bootstrap text at lines 74-80.
