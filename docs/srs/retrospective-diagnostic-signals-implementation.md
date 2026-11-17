# Retrospective diagnostic signals execution

Authority: operator approved starting implementation on 2026-11-16 and selected Subagent-Driven. This approves the SRS and DD-1/DD-2 for repository implementation and synthetic local checks only. No consent changes, production/private session reads, merge, commit, release, activation or premium calls.
Baseline: 24d9034d21d3b2ab5815236d20ba32a4e85c4c04. Existing dirty files are the four planning documents. Domain: personal/open-source agent-skills-standard. Workspace: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/evil-eel.
Placement: host-required worker execution; one owner for coupled ledger/view slices. Later discovery/consent work may run separately once the version-2 contract is frozen. Review remains independent.

## Task 1: Tree coverage and readable history (Slice 1)

- **Scope / owned write set:** mcp/src/retrospective/ledger.ts, run.ts, index-report.ts, trend.ts, views/summary.ts, views/report-html.ts; matching retrospective-ledger, retrospective-run, retrospective-index, retrospective-trend, retrospective-views, retrospective-report-html specs and a synthetic fixture under mcp/test. Additional new bounded schema/types modules under mcp/src/retrospective permitted only to preserve one shared schema convention; report their names.
- **Inputs:** approved docs/prd/prd-retrospective-diagnostic-signals.md and docs/srs/srs-retrospective-diagnostic-signals.md; SRS-001/SRS-002 and full version-2 contract. Read existing source before editing. Apply TypeScript and test standards named in the assignment.
- **Outputs:** schemaVersion 2 producer; complete version-2 type and strict stored-reader schema with activity/failureRuns/time/decisions null initially; agents activeSeconds null initially; treeCoverage and delegation-accounting claim with evidence; compatible version-1 reader and unknown-version rejection; Files/Tree headers and index read/created display. Verify new section against inputs. Preserve existing file-coverage semantics and partial recommendation rule.
- **Real ingress:** prepareRetrospective/runRetrospective publishes real synthetic artifacts; index and trend consume mixed v1/v2 generation stores; repeated publication returns committed numbers.
- **Invariants:** preserve zero model/network calls, permissions, receipt boundaries, generation immutability, strict validation and all pre-existing supported callers.
- **Positive:** AC-001 (5/24 read), AC-002 (all read and zero created), AC-021 (older generation read without mutation) and SRS ledger v2 shape hold.
- **Negative:** unknown ledger versions, unsafe values or tampered tree counts fail closed; unread descendants never produce bare complete-tree wording; missing historical signals never become zero.
- **Verification Owner:** implementer supplies source-ready receipt and narrow covering command proposal; orchestrator runs focused checks once after edits freeze, and independent reviewer verifies ACs. Skip build/lint/tests/formatters mid-flight under host rules. Original RED is NOT RUN, never fabricate it.
- **Handoff / freeze:** send FINAL with changed files, contract exported names, command proposal, known gaps and source identity; stop editing until orchestrator correction. Write receipt to artifacts/runs/retrospective-diagnostic-signals/slice-1-receipt.md.
- **Correction Route:** one same-owner corrective follow-up with concrete AC failure; no autonomous fallback or delegation. Material design changes go to orchestrator.

Slice 1 supplemental ownership: `mcp/src/retrospective/discovery.ts` and `mcp/test/retrospective-discovery.spec.ts` for splitting existing task/create_agent counters only. This is a prerequisite to truthful source counts, not authorization for Paseo linkage. Discovery ownership transfers to Slice 3 only after Slice 1 freezes.

## Task 5: Decision recording guidance and evaluation cases

- **Scope / owned write set:** skills/common/common-decision-discipline/SKILL.md, skills/common/common-decision-discipline/references/decision-record.md, skills/common/common-decision-discipline/evals/evals.json, cli/src/services/IndexGeneratorServiceImpl.ts and its matching __tests__/IndexGeneratorService.spec.ts. No mcp source or installed skill copies. The tool description and server instructions stay with Slice 4.
- **Inputs:** approved PRD REQ-008/AC-020 and SRS-008/SRS-012; the frozen record_decision contract: required basis, impact, reversible and label (trimmed 1–120 characters); ruleRef present exactly for rule basis and matches the named SRS grammar.
- **Outputs:** concise canonical guidance, demand-loaded worked reference, meaningful positive and negative held-out cases using the existing eval format, and one generated AGENTS MCP-table row. Provide exact safe generation/evaluation commands; parent runs generation and checks after freeze.
- **Real ingress:** generated project AGENTS MCP table and canonical decision-discipline skill consumption, not direct editing of generated installed copies.
- **Invariants:** recording never authorizes an action. High-impact defaults cannot bypass a required human gate. Record decisions, not every tool invocation or explicit instruction. No private transcript reads.
- **Positive:** an authorized unresolved choice and a named-rule choice are recorded with correct basis and impact.
- **Negative:** following an explicit instruction or choosing a routine tool does not produce a decision; a prohibited action is paused rather than performed and recorded afterwards.
- **Verification Owner:** implementer returns exact focused check and held-out eval recipe; independent reviewer assesses semantic evidence; parent runs checks only after FINAL.
- **Handoff / freeze:** write source-ready receipt under artifacts/runs/retrospective-diagnostic-signals/slice-5; report changed files, limitations, public-contract gaps and freeze with FINAL.
- **Correction Route:** parent sends one bounded AC-specific correction. Worker never spawns agents, approves a policy change or substitutes models.

## Task 2: Session signals and decision recording (Slices 2 and 4)

- **Scope / owned write set:** mcp/src/retrospective/aggregate.ts, server-tools.ts, ledger.ts, improvements.ts, decision-contract.ts, run.ts stored schemas only if necessary, index-report.ts, trend.ts, views/summary.ts, views/report-html.ts, new mcp/src/tools/decision.ts, mcp/src/server.ts and matching mcp/test retrospective aggregate, ledger, improvements, views, report-html, index, HTTP, tool and new decision specs. No discovery/consent/CLI or canonical skills edits.
- **Inputs:** frozen Slice 1 contract and receipt; approved SRS-005 through SRS-013 and PRD AC-007 through AC-019, AC-023. Worker continues coupled ledger/view ownership to avoid a second convention.
- **Outputs:** complete producer-to-consumer activity, per-agent same-tool failure runs, wall/idle/permission timing, stateless stdio-only record_decision validation, bounded transcript replay, decision claims/improvements/report/index summaries. Add tool description/server instructions under SRS-012. All new numbers have independently checked evidence.
- **Real ingress:** real stdio MCP calls, OMP synthetic session replay and actual published synthetic report/index files, not source-text assertions or mocked no-ops.
- **Invariants:** decisions are agent declarations and NEVER approval; invalid tool input stores nothing; fixed response echoes no labels or other supplied values; schema v1 remains readable; private report/store paths never read. A missing result is unconfirmed, not successful; unknown outcomes never become zero.
- **Positive:** requested activity/timing/failure/decision totals survive replay and restart; linked worker events attributed once; labels sanitized/redacted and HTML escaped; high-impact default backlog is visible.
- **Negative:** unknown enums/keys, absent ruleRef, over-length labels, duplicate results, pending/errored calls, interleaved tools, missing timestamps, malicious label content, HTTP/SSE registration and legacy reports are handled as the SRS requires.
- **Verification Owner:** implementer writes narrow behaviour tests and provides final focused commands; parent performs tests/typecheck and real consumer smoke after FINAL. Do not run builds, tests, lint or formatters mid-flight.
- **Handoff / freeze:** FINAL receipt under artifacts/runs/retrospective-diagnostic-signals/slice-2-4-receipt.md, exact changed files, AC coverage, public contract, commands and limits; then stop editing.
- **Correction Route:** parent supplies one AC-specific correction. Never delegate or silently relax scope; return material design changes to parent.

## Task 3: Consented Paseo agent linkage (Slice 3)

- **Scope / owned write set:** mcp/src/retrospective/discovery.ts, agent-records.ts (new), consent.ts, contracts.ts, mcp/src/retrospective-cli.ts, cli/src/commands/retrospective.ts, run.ts discovery/node wiring only, matching discovery/agent-record/consent/CLI specs and cli/src/commands/__tests__/RetrospectiveCommand.spec.ts. Ownership transfers only after Slice 1 FINAL; Slice 2 has no authority over discovery/consent/CLI or run.ts node wiring.
- **Inputs:** approved SRS-003/SRS-004 and PRD AC-003 through AC-006; frozen Slice 1 exact discovery and ledger input shapes.
- **Outputs:** consent version 5 and optional agent-record roots, both CLI surfaces, descriptor-safe bounded four-field reader, descendants and grandchild linkage, truthful per-source coverage with explicit gap/truncation handling, run manifest wiring preserving node identity and parent edges.
- **Real ingress:** interactive enable using injected synthetic terminal/IO only; prepareRetrospective/runRetrospective on synthetic native session and Paseo record stores; actual published report tree metrics.
- **Invariants:** no private home store/session reads, no enabling real consent, no model/network calls, one read allowlist, exact root containment, no symlinks in path components or swapped descriptors, never open paths supplied by a record, no successful lifecycle inferred from a failed creation call.
- **Positive:** all three synthetic descendants including grandchild are read when consented, with correct edges, source counts and session identity; optional no-agent-record mode preserves original task behaviour.
- **Negative:** malformed/oversized records, duplicate root/session identities, unsupported provider/session formats, missing session files, parent cycles, cap exhaustion, nonregular files, symlink ancestors, out-of-root and hostile identifiers stay gaps and terminate within bounds; version-4 consent remains disabled with reason version.
- **Verification Owner:** implementer writes regression cases and final focused command proposal; parent runs checks after FINAL. No mid-flight build/tests/lint/formatters.
- **Handoff / freeze:** FINAL receipt under artifacts/runs/retrospective-diagnostic-signals/slice-3-receipt.md with schema deltas, files, AC results, commands and limits; freeze.
- **Correction Route:** parent supplies one AC-specific correction. No nested agents, account substitutions, commits or deployment.
