# Web Driver Ladder — playwright-cli first, Playwright MCP fallback

Take the first rung that works. Say which rung you used in the walkthrough (`driver:` line).

## Rungs

| Rung | Driver | When | Evidence dir |
| --- | --- | --- | --- |
| 0 | `sh scripts/preflight.sh` | Always, before opening anything. Exit 0 found, 2 missing, 1 broken. `PLAYWRIGHT_CLI_BIN=/path` overrides lookup. | — |
| 1 | `playwright-cli -s=<session> …` | Preflight exit 0 and the runtime has a shell (Claude Code, Codex CLI, CI). | `.playwright-cli/<session>/` |
| 2 | Playwright MCP `browser_*` tools | Preflight exit 2, or no shell (Antigravity, Copilot). Server must be registered by the user; snippet in `setup.md`. | same dir via `--output-dir .playwright-cli/<session>` |
| 3 | Exported evidence | Neither driver. Ask for screenshots + console log from a human run; label them as human-provided. | wherever the user put them |
| 4 | `BLOCKED (driver: playwright)` | Nothing exported. Continue other lanes; never invent a verdict. | — |

Never mix rungs 1 and 2 inside one session: pick one driver per `<session>` so refs and auth state stay consistent.

## CLI ↔ MCP equivalence

| Intent | `playwright-cli -s=<session>` | Playwright MCP tool |
| --- | --- | --- |
| open first URL | `open <url>` | `browser_navigate` |
| navigate mid-session | `goto <url>` | `browser_navigate` |
| see the page | `snapshot --aria` | `browser_snapshot` |
| click / fill / type | `click <ref>` / `fill <ref> <text>` | `browser_click` / `browser_fill_form` / `browser_type` |
| scroll proof into view | `hover <ref>` | `browser_hover` |
| console errors | `console` | `browser_console_messages` |
| network calls | `network` | `browser_network_requests` |
| visual evidence | `screenshot --filename=<path>` (`--mask <ref>`) | `browser_take_screenshot` (`filename`) |
| wait for text | snapshot-grep poll | `browser_wait_for` |
| auth reuse | `state-save` / `state-load <file>` | launch flag `--storage-state <file>` |
| trace for replay | `tracing start` / `tracing stop` | launch flag `--save-trace` |
| cleanup | `close` | `browser_close` |

MCP tool names above are the server's own. In Claude Code they surface as
`mcp__<server-key>__browser_snapshot` where `<server-key>` is whatever key the user chose in
`.mcp.json` (`playwright` in the documented snippet). Do not hard-code the prefix in reports.

## Playwright MCP launch flags

```text
npx -y @playwright/mcp@latest --isolated --headless --output-dir .playwright-cli/<session>
```

- `--isolated` — fresh context, no leaked logins. Mandatory for verification.
- `--headless` — CI and autonomous runs. Drop it only for a human watching.
- `--output-dir` — keeps evidence under the same convention as the CLI.
- `--browser chromium|firefox|webkit`, `--device "iPhone 15"` — cross-browser / responsive lanes.
- `--save-trace` — only when a FAIL needs replay; traces are large.
- `--caps=vision` — coordinate clicks. Only for pixel-level checks; aria refs first.
- `--port <n>` — HTTP transport for runtimes that cannot spawn stdio servers.
- `--extension` — attaches to the user's real Chrome/Edge tab. Opt-in by the human only, never in CI, never autonomous. The vendor states the server is not a security boundary.

## Install (no version pin in skills)

```text
npm i -g @playwright/cli@latest && playwright-cli install --skills
npx playwright install chromium
```

Pin the version in the consuming project (lockfile, `.tool-versions`), not here. Versions
verified on a given date, runtime matrix, security notes and the alternatives considered live in `setup.md`.

## Degradation rules

- Preflight exit 1 (binary present, `--version` fails) is a broken install, not a missing one: report `INSTALL:` line, then go to rung 2.
- Rung 2 without a registered server: do not try to write `.mcp.json`; report the snippet path and go to rung 3.
- Rung 3 evidence is labelled `human-provided` in the AC trace and can support PASS only for the checks it actually shows.
- Rung 4 text is exactly `BLOCKED (driver: playwright)` so `verify-work` and `test-loop` can route it.
