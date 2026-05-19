---
name: quality-engineering-playwright-cli
description: Standardizes token-efficient browser automation via playwright-cli. Use for web verification, navigation, and capturing snapshots/logs.
metadata:
  triggers:
    keywords:
    - playwright-cli
    - browser automation
    - web verify
    - browser navigate
    - page verification
---

# 🎭 Playwright CLI (Web Automation)

## **Priority: P1 (HIGH)**

> [!IMPORTANT]
> **Tier 0 (Infrastructure)**: Browser process management, named sessions, network/console logs.
> **Tier 1 (Core Interactions)**: Clicks, fills, and navigation (`open` vs `goto`).
> **Tier 2 (Verification)**: Snapshot-based assertions and auth state persistence.

## 🔌 Activation

**Triggers**: `playwright-cli`, `browser automation`, `web verify`, `snapshot`, `auth-state.json`.

## 🛠 Core Workflow

| Step | Command | Purpose |
| :--- | :--- | :--- |
| 1 | `playwright-cli -s={ID} open <url>` | Start **named session**. (Mandatory `-s=`). |
| 2 | `playwright-cli -s={ID} snapshot --aria` | **Aria Snapshot**: YAML-like view for LLM reasoning (Best for assertions). |
| 3 | `playwright-cli -s={ID} console` | Check for JS errors/warnings. |
| 4 | `playwright-cli -s={ID} screenshot` | Visual evidence. Use `--mask <ref>` for dynamic content. |
| 5 | `playwright-cli -s={ID} close` | **MANDATORY Cleanup**. |

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
- **Anti-Patterns Rationale**: [anti-patterns-rationale](references/anti-patterns-rationale.md) — Why these rules exist.
- **Project Context**: [project-context](references/project-context.md) — Project-specific market/VPN/auth patterns.
