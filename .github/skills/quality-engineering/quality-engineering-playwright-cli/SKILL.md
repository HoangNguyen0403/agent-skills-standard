---
name: quality-engineering-playwright-cli
description: Standardizes token-efficient browser automation via playwright-cli, with Playwright MCP as the fallback driver. Runs a preflight, picks the driver rung, captures aria snapshots/console/screenshots into a named evidence dir. Use for web verification, navigation, and capturing snapshots/logs.
metadata:
  triggers:
    keywords:
    - playwright-cli
    - playwright mcp
    - browser_snapshot
    - browser automation
    - web verify
    - browser navigate
    - page verification
    - playwright-cli install
---

# 🎭 Playwright CLI (Web Automation)

## **Priority: P1 (HIGH)**

> [!IMPORTANT]
> **Tier 0 (Infrastructure)**: Browser process management, named sessions, network/console logs.
> **Tier 1 (Core Interactions)**: Clicks, fills, and navigation (`open` vs `goto`).
> **Tier 2 (Verification)**: Snapshot-based assertions and auth state persistence.

## 🔌 Activation

**Triggers**: `playwright-cli`, `playwright mcp`, `browser_snapshot`, `browser automation`, `web verify`, `snapshot`, `auth-state.json`.

## 🪜 Driver Ladder

1. `sh scripts/preflight.sh` — exit 0 found, 2 missing, 1 broken. `PLAYWRIGHT_CLI_BIN` overrides lookup.
2. `playwright-cli -s={ID}` — default when preflight passes and a shell exists.
3. Playwright MCP (`browser_navigate` → `browser_snapshot` → `browser_console_messages` → `browser_take_screenshot` → `browser_close`), launched `--isolated --headless --output-dir .playwright-cli/{ID}`. Use when CLI missing or runtime has no shell (Antigravity, Copilot). `--extension` opt-in only: not a security boundary.
4. Neither: ask for exported screenshots + console log; label `human-provided`.
5. Nothing exported: return `BLOCKED (driver: playwright)`, continue other lanes.

One driver per session. Full table: [driver-ladder](references/driver-ladder.md).

## 🛠 Core Workflow

| Step | Command | Purpose |
| :--- | :--- | :--- |
| 1 | `playwright-cli -s={ID} open <url>` | Start **named session**. (Mandatory `-s=`). |
| 2 | `playwright-cli -s={ID} snapshot --aria` | **Aria Snapshot**: YAML-like view for LLM reasoning (Best for assertions). |
| 3 | `playwright-cli -s={ID} console` | Check for JS errors/warnings. |
| 4 | `playwright-cli -s={ID} screenshot` | Visual evidence. Use `--mask <ref>` for dynamic content. |
| 5 | `playwright-cli -s={ID} close` | **MANDATORY Cleanup**. |

For a sticky header that appears after scrolling, scroll until the header is visible, use `hover` on the header (or its stable role/reference) to establish the visible state, then capture the `screenshot`. Keep the named session open until the evidence is captured.

## 📁 Evidence

`.playwright-cli/{ID}/` (MCP: same dir via `--output-dir`). Files: `<AC|step>-<before|after>.png`, `<AC|step>-<before|after>.aria.txt`, `console.txt`; `trace.zip` only on a FAIL needing replay. Walkthrough records `driver:` + `evidence_dir:`. Relative paths only; CLI refuses writes outside cwd.

## 💡 Agent-Native Optimization
- **Aria-First**: Use `snapshot --aria` as primary way to "see" page. Filters noise.
- **Robust Locators**: Prefer Role-based references (e.g. `button[name="Submit"]`) over fragile CSS classes.
- **Visual Stability**: evaluated `document.body.style.animation = 'none'` to freeze animations before capture.

## 🚫 Anti-Patterns (Zero-Tolerance)

- **Unnamed Sessions**: Never omit `-s=`. Bare commands collide across concurrent runs.
- **Double Open**: Use `open` for first run; `goto` for mid-session navigation.
- **Unmasked Snapshots**: Mask clocks/random IDs before comparison to avoid false positives.
- **Orphaned Processes**: Always `close` session, even on failure.

## ✅ Evaluation Criteria

- **Cleanup Rate**: 100% session closure.
- **Assertion Quality**: 90% of assertions use `snapshot` rather than pixels.
- **Auth Persistence**: Successful re-use of `state-load` for multi-step flows.

## 🔗 References

- **Web Visual Testing**: [common-web-visual-testing](../../common/common-web-visual-testing/SKILL.md) — Methodology for what to verify.
- **Driver Ladder**: [driver-ladder](references/driver-ladder.md) — CLI ↔ MCP equivalence, launch flags, degradation rules.
- **Setup**: [setup](references/setup.md) — install, MCP registration snippet, security, alternatives not adopted.
- **Anti-Patterns Rationale**: [anti-patterns-rationale](references/anti-patterns-rationale.md) — Why these rules exist.
- **Project Context**: [project-context](references/project-context.md) — Project-specific market/VPN/auth patterns.

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- 🎭 Playwright CLI (Web Automation)

## Remediation anchors

- Remediation anchors: hover, screenshot
