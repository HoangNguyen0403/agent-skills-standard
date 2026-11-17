# ADR: Decisions are persisted by the host transcript, not by the MCP server

Status: proposed; awaiting the requesting operator's design approval. Canonical contract: [SRS](srs-retrospective-diagnostic-signals.md). Requirement trace: SRS-008, SRS-009 (PRD `REQ-006`, `AC-012`, `AC-015`).

## Problem and evidence

`REQ-006` requires that a recorded decision survive a server restart and be attributed to the agent that recorded it.

- The server's own tracker is process-bound. In 11 of 18 stored reports its numbers were "not measured" because the session outlived or predated the process (`tracker-not-measured`).
- The server cannot name its caller. Binding a process to a session is done after the fact, by scoring session files against observed tool calls (`mcp/src/retrospective/discovery.ts:727-749`).
- A host that records tool calls already writes every call to this server, with its arguments, into the calling agent's own session file. The engine already reads this server's calls from those files (`mcp/src/retrospective/server-tools.ts:101-122`) and already parses its own tool results under a bounded contract (`mcp/src/retrospective/lookup-results.ts:1-12`).

## Decision

`record_decision` validates its input and returns a fixed receipt. It stores nothing. The retrospective engine reads the call back from the session file, validates the arguments again with the same schema, requires a non-error result, redacts and sanitizes the label, and attributes the decision to the node whose file holds the call.

## Consequences

- Restart safety and attribution come from the host, with no new store, no new write path and no consent check inside a tool any agent can call.
- A decision is counted only where the engine can read the session: OMP-format files inside consented source roots. Workers must be linked (SRS-004). Hosts without a reader, and tracker-only runs, report "not measured".
- This server's argument body for one tool becomes a read field. It is added to the privacy document and to consent text version 5.
- The transcript holds the label as the agent wrote it. Redaction happens when the engine reads it, so the stored ledger and report hold the redacted form only.

## Alternatives

- **Server-side append-only store keyed by process.** Not selected: it cannot attribute a decision to a session without the same after-the-fact binding, it loses the link when the process restarts mid-session, and it gives every agent a tool that writes to the private store.
- **Session tracker in memory only.** Rejected: it fails the restart clause outright.
- **Infer decisions from message text.** Rejected: outside the privacy boundary, and a non-goal of the PRD.

## Reversal condition

If the secondary metric shows decisions recorded on hosts the engine cannot read, add a server-side store as a second source behind the same ledger section. The ledger contract in the SRS does not change in that case.

## Authority and verification

Approval of this ADR authorizes implementation of SRS-008 and SRS-009 in the repository only. Behaviour is verified by the specs named in those cards; nothing here has been run.
