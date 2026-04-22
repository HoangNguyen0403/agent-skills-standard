# agent-skills-standard-mcp

MCP server that lets any AI agent — Claude Code, Cursor, Antigravity, Kiro, Continue, Gemini CLI — load and audit skills from [agent-skills-standard](../README.md) via Model Context Protocol tool calls.

Solves the **enforcement gap**: `AGENTS.md` and `_INDEX.md` are passive prompt context. Sub-agents in particular don't inherit them. This MCP exposes skill loading as explicit, auditable tool calls that work the same way across every MCP-compatible runtime.

## What it does

| Tool                                 | What it returns                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `load_skills_for_files(files)`       | Matches files against the router and returns the matched `SKILL.md` content. Call before editing. |
| `load_skills_for_keywords(keywords)` | Matches concept words against keyword triggers. Use for tasks that don't reference a file yet.    |
| `get_skill(category, name)`          | Direct lookup for a known skill.                                                                  |
| `list_categories()`                  | Returns categories, file extensions they handle, and skill counts.                                |
| `audit_session_compliance()`         | Returns which skills were loaded this session and the tool calls that loaded them.                |

The server honours the same tier model as `agent-skills-standard`'s index generator: broad globs (`**/*.dart`) only match if the skill is the registered `base_language_skills` for that category. Everything else is demoted to keyword match.

## Install

The easiest path is to let the CLI wire it for you:

```bash
npx agent-skills-standard@latest init    # asks about MCP during setup
npx agent-skills-standard@latest sync    # installs MCP at the chosen scope
```

Or manage afterwards via the `mcp` subcommand:

```bash
ags mcp status              # Show current state
ags mcp enable              # Turn on
ags mcp scope project       # Project-only writes (recommended)
ags mcp install             # Apply changes
```

To install or run the MCP standalone:

```bash
npx agent-skills-standard-mcp

# Or build from source
pnpm install && pnpm mcp:build
node mcp/dist/index.js
```

## Configure your AI agent

The server uses **stdio transport** — every MCP-capable runtime supports it.

### Claude Code

Add to `.mcp.json` (project-local) or `~/.claude/.mcp.json` (global):

```json
{
  "mcpServers": {
    "agent-skills-standard": {
      "command": "npx",
      "args": ["-y", "agent-skills-standard-mcp"]
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "agent-skills-standard": {
      "command": "npx",
      "args": ["-y", "agent-skills-standard-mcp"]
    }
  }
}
```

### Continue

Add to `~/.continue/config.json` under `experimental.modelContextProtocolServers`:

```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "transport": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "agent-skills-standard-mcp"]
        }
      }
    ]
  }
}
```

### Gemini CLI

Add to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "agent-skills-standard": {
      "command": "npx",
      "args": ["-y", "agent-skills-standard-mcp"]
    }
  }
}
```

### Antigravity / Kiro / Windsurf / Trae

All accept the same stdio config. Consult each runtime's MCP docs for the exact file path; the `command`/`args` shape is identical.

## How an agent uses it

Recommended sub-agent prompt addition (works in every runtime):

```text
Before editing any file, you MUST call load_skills_for_files(files=[...])
on the MCP server "agent-skills-standard". Use the returned SKILL.md content as
authoritative project rules — they override your pre-training patterns.

Before claiming a task complete, call audit_session_compliance() and
verify the relevant skills were loaded.
```

## Walkthrough — NestJS backend feature

Picture a developer in Cursor or Claude Code asking:

> _"Add a POST /orders endpoint that validates the body and returns 201."_

Here's what happens **with** the MCP, step by step.

### 1. Agent identifies the file it will touch

```
src/orders/orders.controller.ts
```

### 2. Agent calls the MCP — BEFORE writing any code

```jsonc
// Tool call from the agent
{
  "name": "load_skills_for_files",
  "arguments": { "files": ["src/orders/orders.controller.ts"] },
}
```

### 3. The MCP returns 11 skills — direct + composite

```text
matched-by                                   skill
──────────────────────────────────────────  ─────────────────────────────────────
file:**/*.ts                                 typescript/typescript-language
file:**/*.controller.ts                      nestjs/nestjs-api-standards
file:**/*.controller.ts                      nestjs/nestjs-controllers-services
file:**/*.controller.ts                      nestjs/nestjs-file-uploads
file:**/*.controller.ts                      nestjs/nestjs-real-time
file:**/*.controller.ts                      nestjs/nestjs-transport
composite via typescript/typescript-language common/common-best-practices
composite via nestjs/nestjs-api-standards    common/common-api-design
composite via nestjs/nestjs-file-uploads     common/common-security-standards
composite via nestjs/nestjs-real-time        common/common-performance-engineering
composite via nestjs/nestjs-transport        common/common-system-design
```

### 4. The agent now has these team rules in context

| From skill                       | Rule the agent now follows                                     |
| -------------------------------- | -------------------------------------------------------------- |
| `typescript-language`            | Strict typing, `unknown` over `any`, satisfies operator        |
| `nestjs-controllers-services`    | Controllers stay thin; logic lives in services                 |
| `nestjs-api-standards`           | DTOs with `class-validator`, consistent error envelopes        |
| `nestjs-transport`               | `@HttpCode(201)`, ParseUUIDPipe, response shape                |
| `common-best-practices`          | Functions < 30 lines, guard clauses, intention-revealing names |
| `common-api-design`              | Status codes, pagination, idempotency, OpenAPI conventions     |
| `common-security-standards`      | Authn/authz, input sanitization, secret handling               |
| `common-system-design`           | Module boundaries, coupling rules                              |
| `common-performance-engineering` | Async patterns, N+1 query checks                               |

### 5. The agent writes the code AND calls the audit before claiming done

```jsonc
{ "name": "audit_session_compliance" }
```

```text
# Session compliance
Skills loaded: 11
- common/common-api-design
- common/common-best-practices
- common/common-performance-engineering
- common/common-security-standards
- common/common-system-design
- nestjs/nestjs-api-standards
- nestjs/nestjs-controllers-services
- nestjs/nestjs-file-uploads
- nestjs/nestjs-real-time
- nestjs/nestjs-transport
- typescript/typescript-language
```

### What the same scenario looks like WITHOUT the MCP

The agent reads `AGENTS.md` (maybe), walks the router (maybe), reads the matched `_INDEX.md` (maybe), and reads matched `SKILL.md` files (often skipped — especially in sub-agents that don't inherit `CLAUDE.md`). Result:

|                                                                        | With MCP                      | Without MCP                           |
| ---------------------------------------------------------------------- | ----------------------------- | ------------------------------------- |
| `typescript-language` rules                                            | ✅ Loaded                     | ⚠️ Sometimes                          |
| `nestjs-*` framework rules                                             | ✅ All 5 loaded               | ⚠️ One or two if lucky                |
| `common-best-practices` (function size, naming, guard clauses)         | ✅ Loaded via composite       | ❌ Almost never                       |
| `common-api-design` (status codes, pagination)                         | ✅ Loaded via composite       | ❌ Almost never                       |
| `common-security-standards` (input validation, auth)                   | ✅ Loaded via composite       | ❌ Almost never                       |
| Provable audit log of what informed the code                           | ✅ `audit_session_compliance` | ❌ None                               |
| Behavior in sub-agents (`tdd-implementer`, `architecture-guard`, etc.) | ✅ Same as orchestrator       | ❌ Worse — sub-agents inherit nothing |

That's the reason the MCP exists: the rules **automatically reach the working context** every time, in every runtime, including sub-agents.

## Project resolution

The server looks for skills in this order:

1. `SKILLS_PROJECT_ROOT` environment variable
2. The current working directory (must contain `AGENTS.md`)
3. Walks up from cwd until it finds `AGENTS.md`

Within that root, it auto-detects the skills directory by checking:
`skills/`, `.claude/skills/`, `.cursor/skills/`, `.gemini/skills/`, `.kiro/skills/`, `.windsurf/skills/`, `.continue/skills/`, `.antigravity/skills/`, `.trae/skills/`, `.roo/skills/`.

## Development

```bash
pnpm mcp:dev    # tsx watch mode
pnpm mcp:test   # vitest
pnpm mcp:build  # tsup → mcp/dist/
```

Smoke test the built binary:

```bash
(printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'; sleep 1) \
  | node mcp/dist/index.js
```

## Token economics

- **Tool schemas**: ~500 tokens per session (5 tools, terse descriptions). Negligible vs typical multi-tool MCP baselines.
- **Per-load cost**: equivalent to the agent reading the matched `SKILL.md` files itself — the MCP saves round-trips by batching matches into one call.
- **Tier-model demotion**: prevents broad-glob skills from ballooning the response. A typical `.dart` file edit returns 2-3 skills (~3-5 KB), not the whole flutter category.

## Architecture

```
mcp/
├── src/
│   ├── index.ts                    # bin entry, stdio transport
│   ├── server.ts                   # MCP server + tool registration
│   ├── config.ts                   # project-root resolution
│   ├── services/
│   │   ├── SkillIndex.ts           # in-memory index + matcher (tier model)
│   │   ├── SkillParser.ts          # SKILL.md frontmatter parser
│   │   └── SessionTracker.ts       # audit log
│   └── tools/
│       └── index.ts                # 5 tool handlers
└── test/
    └── SkillIndex.spec.ts          # 9 unit tests
```

## Best-practices alignment

This server is designed against the published MCP best-practices guides:

| Practice                                                                | Source                                                                                    | Implementation                                                                                               |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Server Instructions field                                               | [awesome-mcp-best-practices §2.1](https://github.com/lirantal/awesome-mcp-best-practices) | `SERVER_INSTRUCTIONS` block delivered to every connecting client via `McpServer({...}, { instructions })`    |
| Avoid "not found" responses                                             | [awesome §1.4](https://github.com/lirantal/awesome-mcp-best-practices)                    | No-match responses list available categories + suggest next call; `get_skill` misses suggest closest matches |
| Tool descriptions with `<use_case>` / `<aliases>` / `<important_notes>` | [awesome §1.3](https://github.com/lirantal/awesome-mcp-best-practices)                    | All 5 tool descriptions structured                                                                           |
| Don't 1:1 map APIs to tools                                             | [awesome §3.2](https://github.com/lirantal/awesome-mcp-best-practices)                    | 5 high-level use-case tools, no raw filesystem primitives                                                    |
| Single Responsibility                                                   | [modelcontextprotocol.info](https://modelcontextprotocol.info/docs/best-practices/)       | Skills only — no auth/files/DB concerns mixed in                                                             |
| Inversion of control / transport-agnostic                               | awesome §3.1                                                                              | `buildServer()` returns server abstracted from transport; `index.ts` wires stdio                             |
| Configuration externalization                                           | mcp.info                                                                                  | `SKILLS_PROJECT_ROOT` env var + auto-detect across 10 candidate paths                                        |
| Cache costly operations                                                 | mcp.info                                                                                  | `SkillIndex` loaded once at startup, in-memory after                                                         |
| Stderr logging only (stdout = JSON-RPC)                                 | MCP transport spec                                                                        | All logs use `process.stderr.write`                                                                          |
| Graceful degradation when skills absent                                 | mcp.info §Fail-Safe                                                                       | Server starts even with no skills; tools return setup guidance instead of crashing                           |
| Sanitized error messages                                                | awesome security                                                                          | Error responses describe the gap functionally without leaking absolute paths                                 |

## License

MIT
