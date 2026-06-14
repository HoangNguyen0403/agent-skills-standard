# agent-skills-standard-mcp

MCP server that lets any AI agent — Claude Code, Cursor, Antigravity, Kiro, Continue, Gemini CLI — load and audit skills from [agent-skills-standard](../README.md) via Model Context Protocol tool calls.

Solves the **enforcement gap**: `AGENTS.md` and `_INDEX.md` are passive prompt context. Sub-agents in particular don't inherit them. This MCP exposes skill loading as explicit, auditable tool calls that work the same way across every MCP-compatible runtime.

**Current release:** `v0.4.2` — workflow-end telemetry helpers, richer session-cost inputs, and host-runtime integration guidance for SDLC reporting.

## High-Density Architecture (Zero-Trust)

This MCP follows the [Core Architecture](../ARCHITECTURE.md) inspired by **Rust Token Killer (RTK)** to achieve a "Zero-Trust" environment:

1. **Lazy Loading**: Skills are NOT pre-loaded into the AI's limited context. The MCP serves them on-demand via the `load_skills_for_files` tool.
2. **Tiered Resolution**: Implements the same router-index model used in the CLI. Broad globs match only for "Base" skills (e.g., `typescript-language`), while specialized skills (e.g., `nestjs-security`) must match specific keywords or path substrings.
3. **Cross-Agent Compatibility**: Maps to the "Integration Taxonomy" (VS Code Copilot instructions, Cursor hooks, Windsurf rule persistence, etc.) documented in [ARCHITECTURE.md](../ARCHITECTURE.md).

## What it does

| Tool                                 | What it returns                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `list_workflows()`                   | Returns available standard operating procedures (e.g. `dev-fix`, `plan-feature`).                 |
| `get_workflow(name)`                 | Returns exact step-by-step markdown instructions for a specific workflow.                         |
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

## Transport Modes

The server supports two transport modes: **stdio** (default) and **sse** (HTTP).

| Mode      | Transport    | Use Case                                                                                                      |
| --------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| **stdio** | Standard I/O | Desktop AI agents (Claude Code, Cursor, Antigravity, etc.) where the agent spawns the server as a subprocess. |
| **sse**   | HTTP (SSE)   | Remote or containerized agents (GoClaw, Cloud Run) that connect over the network.                             |

### Stdio Mode (Default)

Used by most IDE-based agents. No extra configuration required. The agent manages the process lifecycle.

### HTTP Mode (SSE)

To run the MCP as a standalone HTTP service (e.g., for GoClaw agents):

```bash
export MCP_TRANSPORT=sse
export PORT=8768
npx agent-skills-standard-mcp
```

#### GoClaw Configuration

Add to your `config.json`:

```json
{
  "tools": {
    "mcp_servers": {
      "skills": {
        "transport": "streamable-http",
        "url": "http://agent-skills-mcp:8768/sse",
        "tool_prefix": "ags_",
        "timeout_sec": 15
      }
    }
  }
}
```

_Note: GoClaw's `streamable-http` expects the SSE endpoint. Use the `/sse` path._

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

```text
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

## Workflow Telemetry Integration

`common-telemetry` defines the reporting contract, but the host runtime is what actually decides when a workflow starts and when it reaches a terminal state.

The reusable helper lives in [mcp/src/services/WorkflowTelemetry.ts](/Users/nguyenhuyhoang/OtherProjects/agent-skills-standard/mcp/src/services/WorkflowTelemetry.ts). It gives host runtimes a small adapter surface to:

- merge provider usage as it becomes available
- merge model pricing, cache discounts, reasoning rates, and other billed cost
- trigger `get_session_cost()` only when the active workflow ends in `completed`, `failed`, or `blocked`

For a concrete wiring example, see [mcp/examples/workflow-telemetry-adapter.ts](/Users/nguyenhuyhoang/OtherProjects/agent-skills-standard/mcp/examples/workflow-telemetry-adapter.ts). That sample is intended for Codex wrappers, OpenClaw, GoClaw, or any orchestration layer that already receives usage metadata from API responses, billing hooks, or runtime logs.

The MCP itself tracks only MCP-observed session telemetry. Exact workflow-end token cost becomes available when the host passes:

- `promptTokens`
- `cachedPromptTokens`
- `completionTokens`
- `reasoningTokens`
- `inputCostPer1M`
- `cachedInputCostPer1M`
- `outputCostPer1M`
- `reasoningCostPer1M`
- optional `otherCost`

Smoke test the built binary:

```bash
(printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'; sleep 1) \
  | node mcp/dist/index.js
```

## Token economics

- **Tool schemas**: ~800 tokens per session (8 tools, terse descriptions). Negligible vs typical multi-tool MCP baselines.
- **Per-load cost**: equivalent to the agent reading the matched `SKILL.md` or workflow files itself — the MCP saves round-trips by batching matches into one call.
- **Tier-model demotion**: prevents broad-glob skills from ballooning the response. A typical `.dart` file edit returns 2-3 skills (~3-5 KB), not the whole flutter category.

## Architecture

```bash
mcp/
├── src/
│   ├── index.ts                    # bin entry, stdio transport
│   ├── server.ts                   # MCP server + tool registration
│   ├── config.ts                   # project-root resolution
│   ├── services/
│   │   ├── SkillIndex.ts           # in-memory index + matcher (tier model)
│   │   ├── SkillParser.ts          # SKILL.md frontmatter parser
│   │   ├── WorkflowIndex.ts        # workflow discovery & markdown extraction
│   │   ├── SessionTracker.ts       # session telemetry + audit log
│   │   └── WorkflowTelemetry.ts    # host-side workflow cost helpers
│   └── tools/
│       └── index.ts                # 8 tool handlers
├── examples/
│   └── workflow-telemetry-adapter.ts # example host runtime integration
└── test/
    ├── SkillIndex.spec.ts          # 19 unit tests
    ├── Tools.spec.ts               # tool + telemetry unit tests
    ├── WorkflowTelemetry.spec.ts   # workflow-end telemetry helper tests
    └── WorkflowIndex.spec.ts       # 5 unit tests
```

## Best-practices alignment

This server is designed against the published MCP best-practices guides:

| Practice                                                                | Source                                                                                    | Implementation                                                                                               |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Server Instructions field                                               | [awesome-mcp-best-practices §2.1](https://github.com/lirantal/awesome-mcp-best-practices) | `SERVER_INSTRUCTIONS` block delivered to every connecting client via `McpServer({...}, { instructions })`    |
| Avoid "not found" responses                                             | [awesome §1.4](https://github.com/lirantal/awesome-mcp-best-practices)                    | No-match responses list available categories + suggest next call; `get_skill` misses suggest closest matches |
| Tool descriptions with `<use_case>` / `<aliases>` / `<important_notes>` | [awesome §1.3](https://github.com/lirantal/awesome-mcp-best-practices)                    | All tool descriptions structured                                                                             |
| Don't 1:1 map APIs to tools                                             | [awesome §3.2](https://github.com/lirantal/awesome-mcp-best-practices)                    | 8 high-level use-case tools, no raw filesystem primitives                                                    |
| Single Responsibility                                                   | [modelcontextprotocol.info](https://modelcontextprotocol.info/docs/best-practices/)       | Skills only — no auth/files/DB concerns mixed in                                                             |
| Inversion of control / transport-agnostic                               | awesome §3.1                                                                              | `buildServer()` returns server abstracted from transport; `index.ts` wires stdio                             |
| Configuration externalization                                           | mcp.info                                                                                  | `SKILLS_PROJECT_ROOT` env var + auto-detect across 10 candidate paths                                        |
| Cache costly operations                                                 | mcp.info                                                                                  | `SkillIndex` loaded once at startup, in-memory after                                                         |
| Stderr logging only (stdout = JSON-RPC)                                 | MCP transport spec                                                                        | All logs use `process.stderr.write`                                                                          |
| Graceful degradation when skills absent                                 | mcp.info §Fail-Safe                                                                       | Server starts even with no skills; tools return setup guidance instead of crashing                           |
| Sanitized error messages                                                | awesome security                                                                          | Error responses describe the gap functionally without leaking absolute paths                                 |

## License

MIT
