# Web Driver Setup — install, MCP registration, security, alternatives considered

Ships with the skill. Nothing here is mandatory; `scripts/preflight.sh` reports what is present and
the ladder in `driver-ladder.md` degrades from there.

## Install

Versions verified 2026-09-13: `@playwright/cli` 0.1.19, `@playwright/mcp` 0.0.80. Pin in the
consuming project (lockfile, `.tool-versions`), never in a skill.

| Driver | Install | Hard prerequisite |
| --- | --- | --- |
| Playwright CLI | `npm i -g @playwright/cli@latest && playwright-cli install --skills`, then `npx playwright install chromium` | Node 18+ |
| Playwright MCP | nothing up front; the runtime launches `npx -y @playwright/mcp@latest` on first use, browsers download on demand (~1–2 GB cache) | Node 18+ |

`playwright-cli install --skills` registers the vendor command skills in Claude Code and Copilot so
the CLI surface is discovered on demand instead of loaded up front.

## Runtime → default driver

| Runtime | Driver |
| --- | --- |
| Claude Code, Codex CLI, any runtime with a shell, CI | `playwright-cli` |
| Antigravity, GitHub Copilot, other no-shell runtimes | Playwright MCP |

The CLI writes snapshots to disk and the agent reads only what it needs; the MCP streams the whole
accessibility tree into context. Prefer the CLI whenever a shell exists.

## MCP registration (copy into the consuming project)

Claude Code `.mcp.json`, Antigravity and OpenAI-style configs use `mcpServers`; GitHub Copilot uses
`servers` with the same entry.

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--isolated", "--headless", "--output-dir", ".playwright-cli/mcp"]
    }
  }
}
```

Extra flags: `--browser chromium|firefox|webkit`, `--device "iPhone 15"`, `--save-trace`,
`--port 8931` (HTTP transport), `--caps=vision` (coordinate clicks, pixel-level checks only),
`--caps=pdf`.

## Security

- Playwright MCP is, in the vendor's words, not a security boundary. An agent holding it can reach
  any site the browser profile is logged into. Always `--isolated` for verification.
- `--extension` attaches to the user's real Chrome or Edge tab with live sessions. Opt-in by a human
  only, never in CI, never autonomous.
- Add `.playwright-cli/` to the consuming project's `.gitignore`; auth state files contain live cookies.

## Evaluated, not adopted (2026-09-13)

| Tool | What | Why not now | Re-evaluate when |
| --- | --- | --- | --- |
| [Obscura](https://github.com/h4ckf0r0day/obscura) | Rust headless browser engine, CDP-compatible, built-in MCP | Created 2026-04, pre-1.0, pseudonymous maintainer, ships anti-detection fingerprinting, no npm or brew path, blocks private IPs by default | 1.0 with identifiable maintainers and an npm or brew distribution; then only as a CI cost optimisation behind a security review |
| [Lightpanda](https://github.com/lightpanda-io/browser) | Zig headless browser, CDP + MCP + agent mode | AGPL-3.0, no layout engine so screenshots are text dumps and visual bugs are invisible, telemetry on by default, no native Windows, pre-1.0 | Screenshots and layout land, telemetry opt-in, legal review of the licence; then only as a CI cost optimisation |

Neither replaces a rung: both would sit behind the Playwright MCP as a CDP endpoint, and neither can
produce trustworthy visual evidence today.
