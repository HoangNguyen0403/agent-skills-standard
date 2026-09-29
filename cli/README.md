# Agent Skills Standard CLI

[![NPM Version](https://img.shields.io/npm/v/agent-skills-standard.svg?style=flat-square)](https://www.npmjs.com/package/agent-skills-standard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://github.com/HoangNguyen0403/agent-skills-standard/blob/main/LICENSE)

**Sync 242 AI coding standards to any project in one command.** Works with Cursor, Claude Code, GitHub Copilot, Gemini, Windsurf, Trae, Kiro, and Roo.

**Current release:** `v2.6.5` — `ags sync` manifest-check fix for repo-root LICENSE/NOTICE; skill validator accepts package directories under `scripts/`; SkillSpector security scanning, pull request evaluation gates, and verified release tags.

```bash
npx agent-skills-standard@latest init   # detect your stack
npx agent-skills-standard@latest sync   # install skills
```

If `ags -V` still shows an old version after reinstalling, check your PATH order. `~/Library/pnpm` must come before `~/Library/pnpm/bin`, then run `hash -r` and verify with `ags -V` again.

---

## What It Does

The CLI takes engineering standards from the [Agent Skills Standard registry](https://github.com/HoangNguyen0403/agent-skills-standard) and installs them into your AI agent's native format:

```bash
npx agent-skills-standard sync

  - Updated .cursor/skills/    (Cursor)
  - Updated .claude/skills/    (Claude Code)
  - Updated .github/skills/    (Copilot)
  - Generated _INDEX.md for 8 categories.
  - AGENTS.md router index updated.
```

The result: your AI agent reads `AGENTS.md`, follows the router to the right category, and loads only the skills that match what you're editing.

---

## Commands

| Command    | What it does                                                                                                                                                                                       |
| :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init`     | Detects your tech stack (Flutter, React, Go, etc.) and creates a `.skillsrc` config                                                                                                                |
| `sync`     | Fetches skills from the registry, writes to agent folders, generates `_INDEX.md` + `AGENTS.md`                                                                                                     |
| `mcp`      | Manage the optional MCP server integration (status / enable / disable / scope / install / uninstall / snippets) — see [Optional: MCP Runtime Enforcement](#optional-mcp-runtime-enforcement) below |
| `validate` | Checks your custom skills against format and token standards                                                                                                                                       |
| `feedback` | Submits improvement suggestions to the registry                                                                                                                                                    |
| `upgrade`  | Updates the CLI to the latest version                                                                                                                                                              |
| `doctor`   | Check installation health (config, agents, lock file, MCP, hooks, CLI version) with human or JSON output and safe repairs                                                                         |
| `restore`   | List backups in `.ags/backups` or restore one (replace-only)                                                                                                        |
| `uninstall` | Remove files ags installed (keeps files you edited); backs up first                                                                                               |
| `verify`    | Check installed files against `.skills-lock.json` (`--strict`, `--attestation`)                                                                                   |
| `policy`    | Manage and check project agent policies (status, check, validate, compile, adopt)                                                                                  |


### Install Safety & Sync Options

`ags sync` safely tracks owned files in `.skills-lock.json` v2 and preserves local user edits:

- **User-Edit Preservation**: If you edited a synced skill, workflow, specialist, or bridge file, sync keeps your version and warns instead of overwriting it.
- `--dry-run`: Preview additions, updates, kept edits, and prunes without writing anything to disk or modifying configs.
- `--dry-run --verbose`: List every affected file path by status.
- `--dry-run --json`: Emit the full install plan as machine-readable JSON (`schema_version: 1, kind: 'sync.plan'`).
- `--force <paths...>`: Overwrite specified user-edited files with upstream versions (a backup is created first).
- **Automatic Backups**: Destructive changes (pruning or forced overwrites) automatically snapshot previous files into `.ags/backups/<timestamp>/` (retaining the 3 most recent backups).

### Restore & Uninstall

- `ags restore [--list] [id]`: List backups or restore files from `.ags/backups/<id>` (replace-only; does not delete newer files or modify lockfile).
- `ags uninstall [--agent <agents...>] [--category <categories...>] [--all] [--dry-run] [-y, --yes]`:
  - Removes only manifest entries whose on-disk sha256 still matches (owned-unchanged).
  - Keeps user-edited files byte-identical.
  - Automatically creates a backup of removed files and `.skills-lock.json` before deleting.
  - `--all` removes all owned files, cleans MCP and hook registrations, clears `AGENTS.md` index block, and deletes `.skills-lock.json`. `CLAUDE.md` and `.skillsrc` are left unchanged.
  - Non-interactive environments without `--yes` exit 1 with a preview.

### Verification: `ags verify`

Check installed files against `.skills-lock.json` to detect tampering, partial writes, or manual drift:

- `ags verify`: Checks file integrity against the lockfile.
- `ags verify --strict`: In addition to file integrity, fails (exit 1) if any locked ref now resolves to a different commit (moved tag) or cannot be resolved.
- `ags verify --attestation`: Verifies build-provenance attestations using the GitHub CLI (`gh`). Requires `gh` on PATH; fails if any pinned source lacks `MANIFEST.json` or fails attestation.

### Policy Layer: `ags policy`

Prevents mistakes by cooperating agents; not a security boundary.

Manage and check deterministic project rules in `.ags/policy.json` (`protected_path`, `command`, `required_check`):

- `ags policy status [--json]`: Show policy rules in force and built-in rules (identity/secret deny-list).
- `ags policy check (--path <p> | --command <cmd> | --diff) [--no-bypass] [--json]`: Evaluate a path, command executable, or git diff against active policy rules.
- `ags policy validate [--fail-on-stale] [--json]`: Validate `.ags/policy.json` for schema errors, rule conflicts, and stale compiled rules.
- `ags policy compile [--json]`: Scan `AGENTS.md` and `CLAUDE.md` to propose candidate rules into `.ags/policy-candidates.json`. Compiled rules can only warn or rewrite.
- `ags policy adopt <ids...> [--json]`: Activate candidate rules into `.ags/policy.json` after conflict validation.

Set `AGS_POLICY_BYPASS=1` (or `AGS_POLICY_BYPASS=true`) to turn policy decisions into allow while reporting waived rules.
---

## Configuration

The `.skillsrc` file controls everything:

```yaml
registry: https://github.com/HoangNguyen0403/agent-skills-standard
agents: [cursor, copilot, claude]
workflows_ref: workflows-v1.0.0      # pinned workflows release tag
specialists_ref: specialists-v2.0.0  # pinned specialists release tag
skills:
  react:
    ref: react-v1.3.1
  golang:
    ref: golang-v1.3.1
    exclude: ['golang-tooling'] # skip skills you don't need
  common:
    ref: common-v2.0.1
    custom_overrides: ['common-tdd'] # protect your local edits
```

A project without pins gets `workflows_ref` and `specialists_ref` written once to `.skillsrc` on first sync from the registry's latest releases (`--dry-run` never writes them). If the registry does not publish releases, sync falls back to the default branch with a warning.

---

## What Gets Generated

After `sync`, your project contains:

```bash
project/
  AGENTS.md                           # Router table (~20 lines)
  .cursor/skills/
    golang/_INDEX.md                  # Trigger table for Go skills
    golang/golang-language/SKILL.md   # The actual skill
    golang/golang-testing/SKILL.md
    react/_INDEX.md                   # Trigger table for React skills
    react/react-hooks/SKILL.md
    ...
```

**`AGENTS.md`** maps file extensions to category indexes.
**`_INDEX.md`** has two sections: **File Match** (auto-check against your file) and **Keyword Match** (activates when you mention a concept).
**`SKILL.md`** is the skill itself — loaded on demand, averaging ~500 tokens.

---

## Optional: MCP Runtime Enforcement

The CLI **distributes** skills as static files. The companion [`agent-skills-standard-mcp`](https://www.npmjs.com/package/agent-skills-standard-mcp) server **serves** them at runtime as MCP tool calls — closing the gap where sub-agents skip skill loading because they don't inherit `AGENTS.md`.

`init` asks once whether to enable it and at what scope. Default is `project` (recommended). Change later with:

```bash
ags mcp status              # show current state + per-agent install
ags mcp scope project       # project | user | snippets-only | disabled
ags mcp install             # apply changes
ags mcp uninstall --from project   # remove our entry; siblings preserved
```

The CLI **never** modifies user-home files (`~/.cursor/mcp.json`, `~/.gemini/settings.json`, etc.) unless you explicitly choose `scope: user` AND confirm each write. See [`mcp/README.md`](../mcp/README.md) for full details and [`mcp/ARCHITECTURE.md`](../mcp/ARCHITECTURE.md) for the threat model.


## Installation Health: `ags doctor`

Run read-only health checks across seven subsystems: configuration (`.skillsrc`), detected/configured agents, skill-content lockfile (`.skills-lock.json`), MCP server registrations, pre-edit hooks, legacy folder migrations, and CLI version.

```bash
ags doctor                   # Human-readable health check report
ags doctor --offline         # Skip the network-backed CLI version check
ags doctor --json            # Emit a versioned JSON report (schema_version: 1, kind: 'doctor.report')
ags doctor --exit-on-fail    # Exit with code 1 when any check fails (default exit code is 0)
ags doctor --fix             # Apply available safe repairs interactively (prompts per fix)
ags doctor --fix --yes       # Apply repairs non-interactively
```

### JSON Envelope

When `--json` is supplied, `ags doctor` outputs a single JSON payload matching the `doctor.report` contract:

```json
{
  "schema_version": 1,
  "kind": "doctor.report",
  "data": {
    "schema_version": 1,
    "checks": [
      {
        "name": "config",
        "status": "ok",
        "evidence": ".skillsrc parsed",
        "fixable": false
      }
    ],
    "summary": {
      "total": 7,
      "ok": 7,
      "warn": 0,
      "fail": 0,
      "skip": 0
    },
    "healthy": true
  }
}
```

### Exit Behavior

`ags doctor` always exits with code `0` by default so it never unexpectedly breaks pipelines. When `--exit-on-fail` is passed, it exits with code `1` if any check produces a `fail` status (`healthy: false`).
---

## Privacy & Security

- **Text only** — the CLI downloads Markdown and JSON files, never binaries or scripts
- **No telemetry by default** — zero data collection unless you opt into the local usage log (see docs/FRESHNESS.md)
- **Transparent** — fetches from the [public registry](https://github.com/HoangNguyen0403/agent-skills-standard), nothing hidden
- **Override protection** — `custom_overrides` prevents the CLI from touching your local modifications
- **MCP consent model** — runtime configs in `$HOME` are only ever modified with explicit per-file consent

---

## Links

- [Registry & Skills](https://github.com/HoangNguyen0403/agent-skills-standard)
- [Architecture](./ARCHITECTURE.md)
- [Report an Issue](https://github.com/HoangNguyen0403/agent-skills-standard/issues)

### 📜 Benchmark History

| Version | Date | Skills | Avg Tokens | Savings (%) | Report |
| --- | --- | --- | --- | --- | --- |
| v2.6.0 | 2026-07-10 | 264 | 528 | 46% | [Report](benchmarks/archive/v2.6.0.md) |
| v2.4.7 | 2026-06-15 | 251 | 551 | 85% | [Report](benchmarks/archive/v2.4.7.md) |
| v2.4.6 | 2026-06-10 | 251 | 548 | 85% | [Report](benchmarks/archive/v2.4.6.md) |
| v2.4.1 | 2026-05-18 | 247 | 540 | 85% | [Report](benchmarks/archive/v2.4.1.md) |
| v2.4.0 | 2026-05-14 | 246 | 540 | 85% | [Report](benchmarks/archive/v2.4.0.md) |
| v2.3.0 | 2026-05-13 | 246 | 540 | 85% | [Report](benchmarks/archive/v2.3.0.md) |
| v2.2.2 | 2026-05-09 | 249 | 539 | 85% | [Report](benchmarks/archive/v2.2.2.md) |
| v2.2.0 | 2026-04-22 | 242 | 538 | 85% | [Report](benchmarks/archive/v2.2.0.md) |
| v2.1.2 | 2026-04-11 | 237 | 516 | 86% | [Report](benchmarks/archive/v2.1.2.md) |
| v2.1.1 | 2026-04-11 | 237 | 516 | 86% | [Report](benchmarks/archive/v2.1.1.md) |
