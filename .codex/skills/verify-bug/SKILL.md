---
name: verify-bug
description: "Post-merge UAT verification workflow. Walks JIRA reproduce steps, performs comparative audits (Before/After), attaches evidence to JIRA, and transitions status on PASS."
metadata:
  triggers:
    keywords:
    - verify bug
    - workflow
---
# Verify Bug Skill

> [!IMPORTANT]
> Post-merge UAT verification workflow. Walks JIRA reproduce steps, performs comparative audits (Before/After), attaches evidence to JIRA, and transitions status on PASS.

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# Verify-Bug — UAT Audit

Goal: Prove a bug fix works in the UAT environment via comparative Before/After evidence, then transition ticket status.

## Input

`/verify-bug <jira-url-or-key> [--baseline-image <url>]`

## Workflow

### Step 0: Pre-flight & Data Gathering

> [!TIP]
> **Sub-Agent Delegation**: If your platform supports sub-agents (e.g., Claude, OpenCode, Gemini, Kiro), delegate steps 1-3 below to your JIRA Analyst sub-agent (e.g., `@specialist-jira-analyst`). If sub-agents are NOT supported (e.g., Antigravity, Windsurf), you must execute these steps yourself.

1.  **Parse JIRA**: Extract `Market`, `Reproduce steps`, and `Expected Result`.
2.  **Resolve Markets**: If multiple markets, prompt for scope (Full/Sample/Custom).
3.  **Fetch Test Data**: Call Confluence for `Test data - <MARKET> UAT`. Parse credentials and module-specific data (e.g., customer codes).
4.  **Credential Check**: Rule out expired accounts before starting sessions.
5.  **Fallback**: If Jira/Confluence MCPs are unavailable, request exported ticket/test-data text and continue with local evidence.

### Step 1: Comparative Audit (Execution Phase)

For each market in scope:

1.  **Environment Setup**: Run the DNS probe from `<SKILLS>/common/common-web-visual-testing/references/diagnostic-decoder.md`; if it indicates VPN is required, connect VPN and retry.
2.  **Named Session**: Start `playwright-cli -s={TICKET}-{MARKET}` or Appium session.
3.  **Walk Steps**: Execute reproduction steps.
    - **Hover Discipline**: Always `hover` the target element (warning, button, price) before screenshotting.
    - **Stability**: Disable animations and mask dynamic fields (clocks, balances).
4.  **Verdict Determination**:
    - **PASS**: End-state matches `Expected Result`.
    - **FAIL**: End-state matches `Actual Result` or original bug screenshot.
    - **NEEDS-HUMAN**: Deviates from both.

### Step 2: Automated Failure Diagnostic

If the verdict is NOT PASS:

1.  **Run Decoder**: Load `common-web-visual-testing`; if synced references are available, consult `<SKILLS>/common/common-web-visual-testing/references/diagnostic-decoder.md`.
2.  **Categorize**: Is it a `VPN NOT CONNECTED` error? `ACCOUNT BLOCKED`? Or a genuine `CODE REGRESSION`?
3.  **Label**: Add the diagnostic label to the JIRA comment.

### Step 3: Evidence & JIRA Sync

1.  **Upload**: Push screenshots as attachments to the JIRA ticket.
2.  **Wiki Comment**: Post a verdict comment using JIRA Wiki Markup (orientation-aware widths).
    - Use `🟢 PASS` / `🔴 FAIL` badges.
    - Embed the most diagnostic screenshot inline.
3.  **Status Transition**:
    - If **PASS**: `Ready for UAT` → `Ready for Production`.
    - If **FAIL**: → `Reopened`.
4.  **Walkthrough**:
    - Use the **Walkthrough Template** below.
    - Update project-local `docs/srs/srs-walkthrough.md`.

## Runtime Contract
- Use for post-merge UAT verification of a bug fix against JIRA reproduce steps.
- Required inputs: JIRA URL/key or exported ticket text with reproduce steps and expected result.
- Return NEEDS-HUMAN only when the end-state deviates from both expected and original-bug behavior.

## Handoff Payload
- `slug`, `operator_profile` (carried, not re-inferred), verdict (PASS/FAIL/NEEDS-HUMAN), walkthrough path, diagnostic label, outcome report, next workflow.

## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.

## Artifact Templates

### Walkthrough Template

```md
# Walkthrough: [Name]

## Scope

## Acceptance Criteria

## Evidence

| Check   | Result              | Evidence   |
| ------- | ------------------- | ---------- |
| [check] | [PASS/FAIL/BLOCKED] | [evidence] |

## Risks

## Outcome Report
feature_status: implemented | blocked
requirement_trace: BRD-OBJ-* -> REQ-* -> AC-* -> SRS-* -> evidence
completed_evidence: []; missing_evidence: []; decision_needed: []; recommended_next_workflow: deploy-release | dev-fix

## Next Workflow
deploy-release | dev-fix
```

## Cost Report

Call `get_session_cost(workflow="verify-bug")` before final handoff.

## Anti-Patterns

- **No Sequential Runs**: Verify all markets in parallel.
- **No Unnamed Sessions**: Traceability depends on `-s={TICKET}`.
- **No Mystery Failures**: Always include the Diagnostic Decoder result in FAIL comments.
- **No Orphan Comments**: Clean up "temp media" comments after posting the final verdict.

