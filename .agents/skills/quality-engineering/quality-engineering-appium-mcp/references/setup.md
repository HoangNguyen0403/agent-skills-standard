# Mobile Driver Setup — install, MCP registration, security, alternatives considered

Ships with the skill. Nothing here is mandatory; `scripts/preflight.sh` reports what is present and
prints a `MODE:` line the ladder in `driver-ladder.md` acts on.

## Install

Version verified 2026-09-13: `appium-mcp` 1.94.0. Pin in the consuming project, never in a skill.

| Item | Install | Needed for |
| --- | --- | --- |
| Node 22+ | `nvm install 22` / `brew install node` | every rung |
| JDK 8+ | `brew install openjdk` / `apt install default-jdk` | Android local |
| Android SDK: `platform-tools/adb`, `emulator`, `ANDROID_HOME` exported | Android Studio → SDK Manager | Android local |
| Xcode + Command Line Tools (`xcode-select --install`), `xcrun simctl` | App Store, macOS only | iOS local |
| Device-cloud credentials in env (`LAMBDATEST_USERNAME`, `BROWSERSTACK_USERNAME`, `SAUCE_USERNAME` + access key) | vendor console | cloud rung; none of the SDKs above |

The MCP server itself needs nothing up front: the runtime launches `npx -y appium-mcp@latest` on
first use. Embedded UiAutomator2 / XCUITest drivers are bundled; a separate `appium` CLI is optional.

## MCP registration (copy into the consuming project)

Claude Code `.mcp.json`, Antigravity and OpenAI-style configs use `mcpServers`; GitHub Copilot uses
`servers` with the same entry.

```json
{
  "mcpServers": {
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

- `NO_UI=true` — default. Skips the built-in UI; fewer tokens, faster. Screenshots then come back as
  data the agent must save into the evidence dir itself.
- `AI_VISION_ENABLED=true` — only when `appium_find_element` fails on a Flutter or canvas screen.
- `REMOTE_SERVER_URL_ALLOW_REGEX` — required before any `remoteServerUrl` is accepted.

## Security

- Appium MCP is a local single-user server or a trusted CI job. Never expose it as a shared service.
- Cloud URLs carry credentials in the userinfo segment; keep them out of logs, reports and echoed
  tool arguments.
- Add `.appium-mcp/` to the consuming project's `.gitignore`.

## Evaluated, not adopted (2026-09-13)

| Tool | What | Why not now | Re-evaluate when |
| --- | --- | --- | --- |
| [google/artemis](https://github.com/google/artemis) | Natural-language Android automation with its own agent loop and MCP | Android only, created 2026-08, no tagged release, needs Python 3.12 + uv + adb + scrcpy + ffmpeg and its own LLM key on top of the agent session, nondeterministic as a gate | First tagged release with iOS support, or a Flutter/canvas task Appium MCP cannot drive |

Alternatives that fit rung 1 without changing the skill if a team prefers them:
`@mobilenext/mobile-mcp` (accessibility-tree-first, lighter than Appium) and Maestro MCP (durable
YAML flows for CI).
