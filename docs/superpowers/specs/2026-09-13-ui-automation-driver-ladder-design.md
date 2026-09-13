# UI automation driver ladder (web and mobile verification)

Date: 2026-09-13. Depends on PR #186 (test-loop P1, page-object generation).

## Problem

The web lane is hard-coded to the `playwright-cli` binary and the mobile lane to
`mcp__appium-mcp__*` tools. Neither skill detects whether its driver is present, neither has a
fallback, and the only install guidance is a stale `@playwright/cli@0.1.8` pin buried in
`anti-patterns-rationale.md`. `verify-work`, `verify-bug`, `test-loop` and
`specialist-integration-test-generator` say "use the MCP/tool matching the lane" with no table.
Evidence files have no naming or location convention, so walkthrough reports link to whatever
the agent happened to write. A runtime without a shell (Antigravity, Copilot) cannot run the web
lane at all.

## Scope

Skill prose, references, two read-only preflight scripts, four workflows, one specialist, evals,
two docs pages, CHANGELOG. Folded into the unreleased `quality-engineering-v1.7.0`,
`common-v2.5.0` and `specialists-v1.5.0` entries; no tag exists for any of them.

Out of scope: any change under `cli/` or `mcp/`; adding servers to the repo `.mcp.json` or
`mcp-config-snippets/`; `test-loop` Step 5 run/heal, `specialist-test-healer`,
`quality-engineering-flaky-triage` (owned by `feat/test-loop-p3-heal`); `allowed-tools`
frontmatter (Claude Code treats it as pre-authorisation, not a prerequisite manifest);
`references/project-context.md` in either driver skill.

## A. Decisions

| Tool | Decision | Why |
| --- | --- | --- |
| Playwright CLI (`@playwright/cli`) | Web default | Snapshots land on disk, agent reads only what it needs; roughly a quarter of the tokens of the MCP for the same flow; runs from Bash with no server process. |
| Playwright MCP (`@playwright/mcp`) | Web fallback | Same accessibility-snapshot model; the only option on runtimes without a shell; `npx` install, browsers auto-download. Vendor states it is not a security boundary. |
| Appium MCP (`appium-mcp`) | Mobile driver | Official Appium server, 1.x semver, embedded UiAutomator2/XCUITest drivers or `remoteServerUrl` for device clouds, `NO_UI` mode for token savings, `appium_generate_tests` feeds test generation. |
| Obscura | Not adopted | Five months old, pre-1.0, pseudonymous maintainer, ships anti-detection fingerprinting, no npm path. Re-evaluate at 1.0 with identifiable maintainers and an npm or brew distribution. |
| Lightpanda | Not adopted | AGPL-3.0, no layout engine so no real screenshots, telemetry on by default, no native Windows. Re-evaluate when screenshots and layout land and telemetry is opt-in, with legal review of the licence. |
| google/artemis | Not adopted | Android only, one month old, no tagged release, needs Python 3.12 + uv + scrcpy + ffmpeg and its own LLM key on top of the agent session. Re-evaluate on first tagged release with iOS support, or when Appium MCP cannot drive a Flutter/canvas screen. |

Install policy: nothing is mandatory. Each driver skill ships `scripts/preflight.sh` which
reports what is present and exits 0 (found), 2 (missing, with install hint) or 1 (present but
broken), mirroring `common-architecture-diagramming/scripts/export_drawio.py`. A lane whose
driver is missing and has no exported evidence returns `BLOCKED (driver: <name>)`.

## B. Driver ladders

Web (`quality-engineering-playwright-cli`):

1. `sh scripts/preflight.sh` (or `PLAYWRIGHT_CLI_BIN` override).
2. `playwright-cli -s=<session> …` — named session, aria snapshot, console, screenshot, close.
3. Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_console_messages`,
   `browser_take_screenshot`, `browser_close`) launched with `--isolated --headless
   --output-dir .playwright-cli/<session>/`. Chrome `--extension` mode is opt-in only and
   shares the user's real profile.
4. Ask for exported screenshots or console log from a human run.
5. `BLOCKED (driver: playwright)`.

Mobile (`quality-engineering-appium-mcp`):

1. `sh scripts/preflight.sh` — reports Node, JDK, `adb`, emulator, `xcrun simctl`, cloud creds.
2. Appium MCP with embedded drivers on a local emulator, simulator or USB device
   (`select_device`, `prepare_ios_simulator`).
3. Appium MCP with `remoteServerUrl` on a device cloud; URL must match
   `REMOTE_SERVER_URL_ALLOW_REGEX`.
4. Ask for exported screenshots or a cloud video link.
5. `BLOCKED (driver: appium)`.

Runtime defaults: Claude Code, Codex CLI, any shell runtime, CI → CLI. Antigravity, Copilot,
other no-shell runtimes → Playwright MCP. Mobile is always Appium MCP.

## C. Evidence convention

Web: `.playwright-cli/<session>/` where `<session>` is the `-s=` name
(`{TICKET}-{MARKET}` in verify-bug, `verify-<slug>` in verify-work). Playwright MCP writes to the
same directory through `--output-dir`. Files:

- `<AC|step>-<before|after>.png` — viewport screenshot after `hover`, dynamic fields masked
- `<AC|step>-<before|after>.aria.txt` — aria snapshot used for the assertion
- `console.txt` — console output after the last navigation
- `trace.zip` — only when a FAIL needs replay (CLI tracing or MCP `--save-trace`)
- `video.webm` — only for a flaky reproduction

Auth state stays at `.playwright-cli/<scope>-auth.json`. Paths are relative; the CLI refuses
writes outside the working directory.

Mobile: `.appium-mcp/<session>/` with `<AC|step>-<before|after>.png`, `<label>.source.xml`
(page source), `perf.json` (`appium_mobile_performance_data`), `video.url` (cloud recording
link). Navigation screenshots keep the `maxWidth` budget from the project overlay; only verdict
screenshots are full resolution.

`verify-work` and `verify-bug` walkthroughs record two fixed lines under Evidence:

```text
driver: playwright-cli | playwright-mcp | appium-mcp | none (BLOCKED)
evidence_dir: <relative path>
```

Consumers add `.playwright-cli/` and `.appium-mcp/` to `.gitignore`.

## D. Files

New: `docs/ui-automation-drivers.md` (install matrix, per-runtime MCP snippets, security notes,
evaluated-not-adopted record); `references/driver-ladder.md` and `scripts/preflight.sh` in
both driver skills.

Changed: both driver `SKILL.md` (ladder, evidence, keywords); `anti-patterns-rationale.md`
(unpinned install); Appium `tool-cheatsheet.md` and `lambdatest-cloud-setup.md` (new tools,
allowlist, video); `common-web-visual-testing` and `common-mobile-visual-testing` (evidence
section, MCP snapshot alias, `appium_get_page_source` name fix); `playwright-mcp-authoring.md`
and `playwright-agents-artifacts.md`; `.agents/workflows/{verify-work,verify-bug,test-loop}.md`
(steps 1–4 only) and `dev-fix.md`; `specialist-integration-test-generator` (lane → driver
table); `docs/mcp-integration-guide.md`; evals for both driver skills; CHANGELOG.

## E. Testing

`pnpm generate-indices` twice (second run no-op); `pnpm validate`; `pnpm audit:skills`;
`pnpm audit:keywords`; `pnpm audit:injection`; `pnpm check-alignment` and `pnpm evals:preflight`
against the develop baseline (2 alignment, 2 evals:audit, 42 preflight); preflight smoke with the
binary present, absent (`PATH=/usr/bin:/bin`) and overridden to a bad path; every new relative
link resolves.

## F. Risks

Versions drift: only `docs/ui-automation-drivers.md` names versions, tagged with the date they
were verified. MCP tool prefix (`mcp__<server-key>__browser_*`) depends on the key the user chose
when registering the server; references document the unprefixed names and say so. The P3 branch
edits `test-loop.md` lines 24–25; this change stops at line 23, so the merge is an adjacent-hunk
conflict.
