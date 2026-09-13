# UI Automation Drivers

How the web and mobile verification lanes pick a driver, what has to be installed, and what
happens when nothing is. Design record: `docs/superpowers/specs/2026-09-13-ui-automation-driver-ladder-design.md`.

Nothing on this page is mandatory. Each driver skill ships a read-only `scripts/preflight.sh`;
a lane whose driver is missing and has no exported evidence returns `BLOCKED (driver: <name>)`
and the other lanes continue.

## Ladder at a glance

| Rung | Web | Mobile |
| --- | --- | --- |
| 0 | `sh skills/quality-engineering/quality-engineering-playwright-cli/scripts/preflight.sh` | `sh skills/quality-engineering/quality-engineering-appium-mcp/scripts/preflight.sh` |
| 1 | `playwright-cli -s=<session> …` | Appium MCP, embedded drivers, local emulator / simulator / USB device |
| 2 | Playwright MCP (`browser_*` tools) with `--isolated --headless --output-dir` | Appium MCP with `remoteServerUrl` on a device cloud (URL must match `REMOTE_SERVER_URL_ALLOW_REGEX`) |
| 3 | Exported screenshots or console log from a human run | Exported screenshots or cloud video link |
| 4 | `BLOCKED (driver: playwright)` | `BLOCKED (driver: appium)` |

## Runtime → default driver

| Runtime | Web | Mobile |
| --- | --- | --- |
| Claude Code, Codex CLI, any runtime with a shell, CI | `playwright-cli` | Appium MCP |
| Antigravity, GitHub Copilot, other no-shell runtimes | Playwright MCP | Appium MCP |

The CLI writes snapshots to disk and the agent reads only what it needs; the MCP streams the
whole accessibility tree into context. Prefer the CLI whenever a shell exists.

## Install matrix

Versions verified 2026-09-13: `@playwright/cli` 0.1.19, `@playwright/mcp` 0.0.80,
`appium-mcp` 1.94.0. Pin in the consuming project, not in skills.

| Driver | Install | Hard prerequisites |
| --- | --- | --- |
| Playwright CLI | `npm i -g @playwright/cli@latest && playwright-cli install --skills` then `npx playwright install chromium` | Node 18+ |
| Playwright MCP | nothing; the runtime launches `npx -y @playwright/mcp@latest` on first use, browsers download on demand (~1–2 GB cache) | Node 18+ |
| Appium MCP | nothing; the runtime launches `npx -y appium-mcp@latest` | Node 22+, JDK 8+; Android: Android SDK with `ANDROID_HOME`, `platform-tools/adb`, an emulator or USB device; iOS: macOS, Xcode + Command Line Tools, `xcrun simctl` |
| Device cloud (LambdaTest, BrowserStack, Sauce) | account credentials in env | none of the local SDKs |

`playwright-cli install --skills` registers the vendor command skills in Claude Code and
Copilot so the CLI surface is discovered on demand instead of loaded up front.

## MCP config snippets

Copy into the consuming project. They are deliberately not in this repo's `.mcp.json` or
`mcp-config-snippets/`; the agent-skills-standard server is the only one shipped by default.

Claude Code (`.mcp.json`) and Antigravity / OpenAI-style `mcpServers`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--isolated", "--headless", "--output-dir", ".playwright-cli/mcp"]
    },
    "appium": {
      "command": "npx",
      "args": ["-y", "appium-mcp@latest"],
      "env": {
        "ANDROID_HOME": "/absolute/path/to/Android/sdk",
        "NO_UI": "true",
        "AI_VISION_ENABLED": "false",
        "REMOTE_SERVER_URL_ALLOW_REGEX": "^https://[^@]+@mobile-hub\\.lambdatest\\.com/wd/hub$"
      }
    }
  }
}
```

GitHub Copilot uses the key `servers` instead of `mcpServers` with the same entries.

Useful Playwright MCP flags: `--browser chromium|firefox|webkit`, `--device "iPhone 15"`,
`--save-trace`, `--port 8931` (HTTP transport), `--caps=vision` (coordinate clicks, only for
pixel-level checks), `--caps=pdf`.

Useful Appium MCP env: `NO_UI=true` skips the built-in UI and cuts token usage; set
`AI_VISION_ENABLED=true` only when locator strategies fail on a Flutter or canvas screen;
`REMOTE_SERVER_URL_ALLOW_REGEX` is required before any `remoteServerUrl` is accepted.

## Security notes

- Playwright MCP is, in the vendor's words, not a security boundary. An agent holding it can
  reach any site the browser profile is logged into. Always run `--isolated` for verification.
- `--extension` attaches to the user's real Chrome or Edge tab with live sessions. Opt-in only,
  never in CI, never with an autonomous agent.
- Appium MCP is a local single-user server or a trusted CI job. Do not expose it as a shared
  service. Cloud URLs carry credentials in the userinfo segment; never log them.
- Consumers add `.playwright-cli/` and `.appium-mcp/` to `.gitignore`. Auth state files contain
  live cookies.

## Evidence layout

Web: `.playwright-cli/<session>/` (`<session>` = the `-s=` name; MCP writes there via
`--output-dir`). Mobile: `.appium-mcp/<session>/`. Files are `<AC|step>-<before|after>.png`,
`<AC|step>-<before|after>.aria.txt` or `<label>.source.xml`, `console.txt` or `perf.json`,
`trace.zip` only on a FAIL that needs replay, `video.webm` or `video.url` only for flaky
reproduction. Walkthrough reports record `driver:` and `evidence_dir:`.

## Evaluated, not adopted

| Tool | What it is | Why not now | Re-evaluate when |
| --- | --- | --- | --- |
| [Obscura](https://github.com/h4ckf0r0day/obscura) | Rust headless browser engine, CDP-compatible, built-in MCP | Created 2026-04, pre-1.0, pseudonymous maintainer, ships anti-detection fingerprinting, no npm or brew path, blocks private IPs by default so local apps need a flag | 1.0 with identifiable maintainers and an npm or brew distribution; then only as a CI cost optimisation behind a security review |
| [Lightpanda](https://github.com/lightpanda-io/browser) | Zig headless browser, CDP + MCP + natural-language agent mode | AGPL-3.0, no layout engine so screenshots are text dumps and visual bugs are invisible, telemetry on by default, no native Windows, pre-1.0 | Screenshots and layout land, telemetry opt-in, legal review of the licence; then only as a CI cost optimisation |
| [google/artemis](https://github.com/google/artemis) | Natural-language Android automation with its own agent loop and MCP | Android only, created 2026-08, no tagged release, needs Python 3.12 + uv + adb + scrcpy + ffmpeg and its own LLM key on top of the agent session, nondeterministic as a gate | First tagged release with iOS support, or a Flutter/canvas task Appium MCP cannot drive |

Alternatives that fit the same rungs if a team prefers them: `@mobilenext/mobile-mcp`
(accessibility-tree-first, lighter than Appium) and Maestro MCP (durable YAML flows for CI).
Both slot into rung 1 of the mobile ladder without changing the skills.
