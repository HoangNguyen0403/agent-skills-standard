# UI Automation Drivers (maintainer summary)

`docs/` is not synced to consumers. Everything an agent needs at runtime lives inside the two
driver skills and ships with them:

| Skill | Ladder | Setup, MCP snippet, security, alternatives | Preflight |
| --- | --- | --- | --- |
| `quality-engineering-playwright-cli` | `references/driver-ladder.md` | `references/setup.md` | `scripts/preflight.sh` |
| `quality-engineering-appium-mcp` | `references/driver-ladder.md` | `references/setup.md` | `scripts/preflight.sh` |

Design record: `docs/superpowers/specs/2026-09-13-ui-automation-driver-ladder-design.md`.

## Ladder at a glance

| Rung | Web | Mobile |
| --- | --- | --- |
| 0 | `sh scripts/preflight.sh` | `sh scripts/preflight.sh` |
| 1 | `playwright-cli -s=<session> …` | Appium MCP, local emulator / simulator / USB |
| 2 | Playwright MCP `browser_*` (`--isolated --headless --output-dir`) | Appium MCP `remoteServerUrl` cloud (allowlist regex required) |
| 3 | Exported screenshots / console from a human run | Exported screenshots / cloud video link |
| 4 | `BLOCKED (driver: playwright)` | `BLOCKED (driver: appium)` |

## Decisions (2026-09-13)

Adopted: Playwright CLI (web default), Playwright MCP (web fallback, no-shell runtimes), Appium MCP
(mobile). Not adopted, with re-evaluate triggers recorded in the skills' `setup.md`: Obscura,
Lightpanda, google/artemis. Nothing is installed by a skill; missing drivers degrade to exported
evidence and then `BLOCKED (driver: …)`.

Deferred to a later round: an `ags doctor` command and a multi-server MCP registry in the CLI.
