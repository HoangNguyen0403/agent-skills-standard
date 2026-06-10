---
description: Post-merge UAT verification workflow. Walks JIRA reproduce steps, performs comparative audits (Before/After), attaches evidence to JIRA, and transitions status on PASS.
---

# 🕵️ Verify-Bug — Enterprise UAT Audit

This workflow verifies that a bug fix is working as intended in the UAT environment. It uses high-fidelity automation and automated diagnostic reasoning.

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

## Next Workflow
```

## Cost Report

Call `get_session_cost` and output telemetry here before ending.

## 🚫 Anti-Patterns

- **No Sequential Runs**: Verify all markets in parallel.
- **No Unnamed Sessions**: Traceability depends on `-s={TICKET}`.
- **No Mystery Failures**: Always include the Diagnostic Decoder result in FAIL comments.
- **No Orphan Comments**: Clean up "temp media" comments after posting the final verdict.
