# playwright-cli Anti-patterns — Rationale

The SKILL.md anti-pattern list is one-line for scannability. This file holds the WHY behind each rule so the rules survive future edits.

## No bare `playwright-cli` (always pass `-s=<session>`)

The bare form (`playwright-cli click ...`) uses an implicit default browser. If two flows run at once — e.g. a dev's `/verify-implementation` overlapping a `/verify-bug` for a different ticket — they share the same default browser and stomp each other's state. Named sessions (`-s=verify-impl-TICK-45140`, `-s=verify-bug-TICK-45140-TH`) make collisions impossible and self-document which browser each line targets. The shared permission allowlist only covers `Bash(playwright-cli -s=* ...)` patterns; bare invocations trigger a permission prompt every time.

## No `wait-for` subcommand

The CLI does not implement a `wait-for` subcommand. Calling it returns "unknown command". Use the snapshot-grep poll documented in SKILL.md "Waiting for content".

## No `npx @playwright/cli`

`npx @playwright/cli@latest …` adds 1-3 s of latency per call (npm registry round-trip + cache check) and silently upgrades the version between runs. Pin via `npm i -g @playwright/cli@0.1.8` and call the installed `playwright-cli` binary directly.

## No paths outside cwd

The CLI denies file writes to `/tmp`, `$TMPDIR`, `~/Downloads`, and any absolute path outside the current working directory. Use `.playwright-cli/` (gitignored) for all artefacts.

## No screenshot for assertions

Screenshots are images — you can't grep them. Use `snapshot` (accessibility tree text) for element-presence checks; reserve `screenshot` for human-visible evidence attached to JIRA.

## No `--full-page` screenshots

`--full-page` images are 5-6× larger than viewport shots and add no extra evidence value when the proof element fits a single viewport. Use `playwright-cli hover <ref>` to scroll the proof into view, then take a normal viewport shot.

## No screenshot without prior `hover`

A viewport screenshot taken without first scrolling the proof element into view may show only the page header — the verified element sits below the fold. Always `hover <ref>` immediately before `screenshot`.

## No reusing a ref across snapshots

Element refs (`e123`, `e456`, …) are session-specific and may change between snapshots when the DOM re-renders. Always re-snapshot to get fresh refs before clicking, hovering, or filling. A stale ref produces a "ref not found" error halfway through a flow.

## No skipping `state-save` after login

The login dance (multi-account fallback, MFA, redirect) is expensive — 30-90 s. After a successful login, `state-save .playwright-cli/<scope>-auth.json` so subsequent runs `state-load` and skip directly to the authenticated app.

## No open without close

Orphaned sessions hold a Chromium process and a port — over time they leak state and exhaust the agent's session table. Always `playwright-cli close` at the end of every run, including failure paths.

## No skip console check

Console errors (hydration failures, chunk-load errors, uncaught promise rejections) often surface bugs that are invisible in the rendered UI. Run `playwright-cli console` after every navigation and include the count in `VERIFY_RESULT`.

## No committed auth state

`state-save` JSON contains live session cookies. Committing it would let any reader of the repo impersonate the test account. `.playwright-cli/` is in `.gitignore` for this reason — do not bypass with `git add -f`.

## No credentials on disk

Never write a password to a file (e.g. `echo "$PASSWORD" > .playwright-cli/pwd`). Pass credentials via shell env vars within a single Bash compound command, or re-grep from the env file each time. The only `.playwright-cli/*.json` allowed is `state-save` output, which is already gitignored.

## No variable PID

`$DEV_PID=$!` does not persist across separate Bash tool calls — each call gets a fresh shell. Save the dev server PID to `.playwright-cli/dev.pid` (a file) immediately after starting the server, then `kill $(cat .playwright-cli/dev.pid)` at teardown.

## No leftover dev/log files between runs

A stale `.playwright-cli/dev.pid` from a previous run causes the next run's liveness check (`kill -0 $(cat dev.pid)`) to either falsely report "dev server died" or kill an unrelated process that recycled the same PID. Always `rm -f .playwright-cli/dev.pid .playwright-cli/dev.log` at end of run.
