---
name: verify-bug
description: "Post-merge UAT verification workflow. Walks ticket reproduce steps, performs comparative before/after audits, and reports or syncs the verdict only within scoped authorization."
metadata:
  internal: true
  triggers:
    keywords:
    - verify bug
    - workflow
---
# Verify Bug Skill

> [!IMPORTANT]
> Post-merge UAT verification workflow. Walks ticket reproduce steps, performs comparative before/after audits, and reports or syncs the verdict only within scoped authorization.

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# Verify-Bug — UAT Audit

Goal: Prove a bug fix works in the UAT environment from comparative before/after evidence, and report or sync the verdict within the authority actually granted.

## Input

`/verify-bug <ticket-url-or-key> [--baseline-image <url>]`

## Tracker Authority

- Verdict-only is the default and terminal for every verdict, `PASS` and non-`PASS` alike: the run ends at the verdict, the machine route is `null`, and the human handoff names no successor, regardless of continuation settings. No status transition and no automatic `dev-fix` from this mode. No upload, comment, label, attachment, transition, delete, or board edit follows from it.
- Every tracker action is independently scoped to one exact issue key, the reviewed revision, and the evidence set that supports it; a grant for one action never authorizes another, a batch, or a neighboring ticket.
- Before each separately authorized tracker action, immediately reread the authoritative issue for the exact key, current revision, and that operation's expected state; if any value is unknown, unavailable, or changed, do not write. Never batch actions or reuse a prior preflight.
- Sanitize every payload: no credentials, tokens, cookies, customer data, or environment hosts in comments, labels, or attachments; attach only files this session produced.

## Workflow

1. **Pre-flight**: extract `Market`, `Reproduce steps`, and `Expected Result`; resolve market scope (Full/Sample/Custom) and fetch that market's test data. Rule out expired accounts before starting sessions. Without tracker or wiki access, request exported ticket/test-data text and continue with local evidence. Where sub-agents exist, `specialist-jira-analyst` may parse the ticket; otherwise do it inline.
2. **Bind evidence provenance**: require a credible historical baseline for the reported bug (origin, capture time, origin revision) or a controlled before reproduction at a recorded revision, plus separate fresh after evidence at the reviewed revision. If no credible before evidence is available, report the gap and withhold comparative PASS/FAIL; after-only evidence cannot establish a verdict.
3. **Comparative audit**, per market: run the DNS probe from `skills/common/common-web-visual-testing/references/diagnostic-decoder.md` and connect VPN only when it requires it. After the driver preflight, start a named session (`playwright-cli -s={TICKET}-{MARKET}`, Playwright MCP with `--output-dir .playwright-cli/{TICKET}-{MARKET}`, or an Appium MCP session); a missing driver with no exported evidence is `BLOCKED (driver: <name>)`.
4. **Walk and replay the steps**: execute the reproduce steps against the reviewed revision, disable animations, and mask dynamic fields. Capture per-step after snapshots as the fresh evidence set. Hover a target only when the asserted behavior is a hover, tooltip, or hover-revealed control; a static state needs a plain screenshot. Run markets in parallel only when sessions, accounts, and test data are independent; serialize markets that share credentials, mutable data, or a rate-limited target.
5. **Determine the comparative verdict from evidence**: only with credible before and fresh after sets, `PASS` when the after end state matches `Expected Result`, `FAIL` when it matches `Actual Result` or the original bug, and `NEEDS-HUMAN` when it deviates from both. Without credible before evidence, withhold comparative PASS/FAIL and report missing evidence. A single screenshot, prior run, or prose claim is not a verdict.
6. **Diagnose a non-PASS verdict**: run the decoder decision before reporting — `VPN NOT CONNECTED`, `ACCOUNT BLOCKED`, or `CODE REGRESSION`. An environment-caused failure is never recorded as a code regression, and the classification travels with the verdict.
7. **Sync only what is authorized**: post the verdict comment, upload session evidence, or transition status as separate scoped actions, each after its expected-state check.
8. **Record**: write the canonical walkthrough to `docs/srs/srs-walkthrough-[slug].md` when the run requests it and file writes are allowed, using the template reference. A verdict-only run records `decision_needed` and `recommended_next_workflow: null` and creates no ticket change.

## Artifact Templates

Load `references/pr-audit-workflow-templates.md` from installed `common/common-workflow-writing` or flattened `common-common-workflow-writing`: resolve `<SKILLS>` to the active provider skills root, checking nested providers (for example `.claude/skills` or `.codex/skills`) and flattened providers (for example `.kiro/skills`). Use its walkthrough shape. Fall back to `skills/common/common-workflow-writing` only when that source tree exists.

## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: verify-bug, feature_status: "[evidence-derived status]", started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: "[evidence-selected workflow or null]", cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}
## Next Workflow
deploy-release | dev-fix | null (null for every verdict in the default terminal mode)

## Runtime Contract
- Use for post-merge UAT verification of a bug fix against ticket reproduce steps. Load `common-decision-discipline` and apply its §8 continuation contract at entry and every handoff: the settled result selects the successor and specialized gates dominate.
- Required inputs: ticket URL/key or exported ticket text with reproduce steps and expected result, the authorization actually granted for each tracker action, and baseline provenance when `--baseline-image` is used.
- In verdict-only mode the successor is `null` for every verdict. Otherwise select from evidence and held approvals: `PASS` routes to `deploy-release` only with that lane's own release authorization, `FAIL` routes to `dev-fix` only when that lane is separately authorized, and `NEEDS-HUMAN` or an unheld approval yields `recommended_next_workflow: null` with the pending decision.
- Return `NEEDS-HUMAN` only when the end state deviates from both expected and original-bug behavior; a missing driver or unreadable ticket is `BLOCKED`.

## Handoff Payload
- `slug`, `operator_profile` (carried, not re-inferred), verdict (PASS/FAIL/NEEDS-HUMAN), baseline provenance, walkthrough path, diagnostic classification, authorized actions taken and refused, evidence-lane refs, outcome report, next workflow.

## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.

## Anti-Patterns

- **No Unsolicited Ticket Writes**: A verdict never authorizes a comment, attachment, label, transition, or delete on its own.
- **No Unauthorized Cleanup**: An existing temp-media comment is not a defect; deleting it needs its own exact-key authorization and state check.
- **No Unnamed Sessions**: Traceability depends on `-s={TICKET}-{MARKET}`.
- **No Mystery Failures**: Always include the Diagnostic Decoder result in FAIL comments.
- **No Leaked Test Data**: Never post the credentials, customer codes, or hosts used to reach UAT.
- **No Revision Blending**: A historical baseline image is context for the reported bug, not proof of the fix revision.

## Cost Report

Call `get_session_cost(workflow="verify-bug")` before final handoff.

