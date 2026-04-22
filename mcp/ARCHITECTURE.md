# MCP Server Architecture

This document explains how `agent-skills-standard-mcp` works internally — for contributors, security reviewers, and integrators evaluating whether to ship it inside their stack.

For install + usage, see [`mcp/README.md`](./README.md). For the project-wide design context, see [`../ARCHITECTURE.md`](../ARCHITECTURE.md).

## 1. What This MCP Is (and Isn't)

**Is**: a thin, stateless-on-disk Model Context Protocol server that reads a project's already-installed skill files and serves them to AI agents on demand via 5 tool calls.

**Isn't**:

- A skill installer — that's the CLI's job (`agent-skills-standard sync`).
- A network service — it talks to ONE thing (the AI runtime that spawned it) over stdio.
- A persistence layer — no database, no cache file, no telemetry, no state survives the process.
- A code-execution surface — skills are pure markdown; the MCP just reads, matches, and returns.

The MCP exists because skills-as-files-on-disk is an honour-system protocol. Agents are supposed to read `AGENTS.md`, walk the router, then read matched `SKILL.md` files. In practice — especially for **sub-agents** that don't inherit `CLAUDE.md` — this step is silently skipped. The MCP turns that read into an explicit tool call, returns the matched content, and records it in an audit log.

## 2. Lifecycle

```bash
                 spawned by AI runtime
                          │
                          ▼
              ┌───────────────────────┐
              │  resolveConfig()      │ — find AGENTS.md + skills/
              │  (config.ts)          │
              └────────────┬──────────┘
                           │
                           ▼
              ┌───────────────────────┐
              │  SkillIndex.load()    │ — scan skills/, parse SKILL.md
              │  (services/SkillIndex)│   build in-memory index
              └────────────┬──────────┘
                           │
                           ▼
              ┌───────────────────────┐
              │  buildServer()        │ — register 5 tools + instructions
              │  (server.ts)          │
              └────────────┬──────────┘
                           │
                           ▼
              ┌───────────────────────┐
              │  StdioServerTransport │ — listen on stdin/stdout (JSON-RPC)
              └────────────┬──────────┘
                           │
                ┌──────────┴──────────┐
                ▼                     ▼
       initialize request   tools/call: load_skills_for_files
       returns instructions  → SkillIndex.matchFiles()
       (LLM workflow guide)  → read matched SKILL.md from disk
                             → SessionTracker.record()
                             → return as text content
```

All logging is to **stderr** — stdout is reserved for JSON-RPC frames per the MCP spec.

## 3. The Tier-Matching Algorithm

This is the most important piece of logic. It's faithful to the algorithm in `cli/src/services/IndexGeneratorService.ts` but implemented standalone (see ADR-MCP-001).

### Inputs

For each `load_skills_for_files(files)` call:

- `files`: list of project-relative paths (e.g. `["src/cart.dart", "internal/auth.go"]`)
- `metadata.json` (registry): `file_routing`, `broad_globs`, `base_language_skills`
- All `SKILL.md` files under `skills/<category>/<skill-id>/SKILL.md`, parsed for `metadata.triggers.{files, keywords, exclude}`

### Algorithm (per file)

1. **Extract extension** — `cart.dart` → `dart`
2. **Lookup categories** — `metadata.file_routing["dart"]` → `["flutter"]`
3. **For each candidate category**, iterate its skills:
   - **Apply exclude patterns** — if any glob in `triggers.exclude` matches the file, skip this skill entirely.
   - **For each glob in `triggers.files`**:
     - Try to match against the file path (minimatch with `matchBase: true`).
     - If matched AND the glob is NOT in `metadata.broad_globs`, return as `MatchResult{ matchedBy: 'file', reason: glob }`.
     - If matched AND the glob IS in `broad_globs`, return ONLY if the skill's id equals `metadata.base_language_skills[category]`. Otherwise, demote (skip).
4. **Deduplicate** — track `(category, skill-id)` so each skill appears at most once across all input files.

### Worked example

Input: `lib/cart/cart_bloc.dart`

```text
file_routing.dart       → ["flutter"]
broad_globs              → ["**/*.dart", ...]
base_language_skills.flutter → "flutter-language"

Candidates in flutter/:
  flutter-language        triggers.files: ["**/*.dart"]
    → glob is broad. Is base for flutter? YES → match (broad-base)
  flutter-bloc-state-management  triggers.files: ["**_bloc.dart", ...]
    → glob is narrow. matches → match (file)
  flutter-clean-architecture  triggers.files: ["**/*.dart"]
    → glob is broad. Is base? NO → demoted (no match)

Result: [flutter-language, flutter-bloc-state-management]
```

This prevents the "30 skills match every .dart file" problem. Broad-glob skills are still discoverable via `load_skills_for_keywords`.

### Keyword matching

`load_skills_for_keywords(keywords)` is simpler: case-insensitive substring match against each skill's `triggers.keywords`. No tier model — keyword triggers are inherently scoped because authors choose them deliberately.

### Composite-trigger expansion (foundational skills)

After both `matchFiles` and `matchKeywords` produce their initial result set, a second pass expands it with **composite-triggered foundational skills** declared in `metadata.foundational_composite_rules`:

```json
"foundational_composite_rules": {
  "common/best-practices":          ["architecture", "controllers-services", "api", "error-handling", ...],
  "common/security-standards":      ["security", "auth", "file-uploads", ...],
  "common/performance-engineering": ["performance", "caching", "rendering", ...]
}
```

Semantics: if any direct match's skill id contains any pattern substring (`String.includes`), the foundational skill is appended with `matchedBy: 'composite'` and `reason: 'via <triggering-skill-id>'`.

The expansion is **non-recursive** — composite-triggered skills cannot themselves trigger more composites, preventing infinite loops if rules are configured carelessly. Composites are deduped against the seed set so a foundational skill matched both directly and via composite appears only once.

**Why this matters**: skills like `common-best-practices` (broad globs `**/*.ts`, `**/*.go`, `**/*.dart`, ...) get demoted by the tier model since they are not the registered base for any category. Without composite expansion, they'd never surface from `load_skills_for_files`. The composite rules in `metadata.json` declare their intended cross-cutting nature; the matcher honors that declaration so foundational rules load whenever a relevant adjacent skill loads, exactly mirroring the static `_INDEX.md` semantics produced by the CLI's `IndexGeneratorService`. See ADR-MCP-007.

## 4. File System Contract

### What the MCP reads

| File | When | Why |
| --- | --- | --- |
| `AGENTS.md` (any ancestor) | Once at startup (in `findProjectRoot`) | Anchors the project root |
| `skills/metadata.json` (or empty) | Once at startup (in `SkillIndex.load`) | Loads `file_routing`, `broad_globs`, `base_language_skills` |
| `skills/<category>/<skill>/SKILL.md` | Once at startup for parsing; again per-tool-call for body delivery | Builds the index; serves matched content |

### What the MCP NEVER reads

- Source code files in the project
- Files outside the project root (no walking up beyond `AGENTS.md`)
- `.env`, secrets, dotfiles, anything else under `$HOME`
- The MCP config files in `~/.cursor/`, `~/.claude/`, etc. (those are the CLI's domain — see `McpConfigService`)

### What the MCP NEVER writes

- Anywhere on disk. The MCP is read-only.

## 5. Transport: Why stdio

stdio is the only transport this MCP supports today. The reasoning:

- **Universal across runtimes** — Claude Code, Cursor, Antigravity, Kiro, Continue, Gemini CLI all spawn MCP servers via subprocess + stdio.
- **No port management** — no firewall config, no port collisions, no auth needed (the runtime owns the lifetime).
- **Inherits sub-agent isolation correctly** — when a runtime spawns a sub-agent, the MCP tool surface is inherited by reference; the sub-agent talks to the same MCP process the orchestrator did.
- **Trivial security model** — only the spawning runtime can talk to the MCP. No network exposure.

HTTP transport would add an attack surface (port, auth, TLS, CSRF) for zero benefit in the agent-tooling use case. If a future user ships skills via a remote service, HTTP would be added as a separate transport without changing the tier model or tool surface.

## 6. Session State

```text
process start
   │
   ▼
SessionTracker (in-memory, RAM only)
   │
   ├── startedAt: ISO timestamp
   └── events: Array<LoadEvent>
                │
                ├── at: ISO timestamp
                ├── via: 'load_skills_for_files' | 'load_skills_for_keywords' | 'get_skill'
                ├── input: string[] (the args)
                └── loaded: string[] (category/skill-id pairs)
process exit ──→ all state lost
```

Why no persistence:

- Each AI session is independent. Cross-session audit data is the AI runtime's job (transcript logs), not the MCP's.
- Persisting would require a config dir, write permissions, and a privacy story we don't want to own.
- `audit_session_compliance()` reads from RAM. Fast, accurate, scoped.

## 7. Threat Model

### What a malicious actor could try

| Attack | Why it doesn't work here |
| --- | --- |
| Inject prompt content into a SKILL.md to manipulate the agent | Skills are user-provided files. The CLI applies `INJECTION_PATTERNS` sanitization to descriptions during sync. The MCP returns SKILL.md bodies verbatim — injection-via-skill is the user's responsibility (same as any prompt the user pastes). |
| Path traversal via crafted file path in `load_skills_for_files` | We never read the input file paths from disk — we only match them against globs as strings. The MCP doesn't open user code. |
| Read files outside the project | `findProjectRoot` walks up until `AGENTS.md` is found. Skill files are read via paths constructed from the configured `skillsDir` only. No string-templated path comes from user input. |
| DoS via huge skill files | Skills are ≤500 tokens by registry policy. Even at 100 categories × 50 skills, total scan is ~5MB at startup; per-call response is bounded by the number of matches. |
| Steal secrets from MCP config files | The MCP doesn't read MCP configs. The CLI does (and only the project-scoped ones unless the user explicitly opts in to user-scope). |
| Network exfiltration | The MCP makes zero network calls. Pure file I/O + stdio. |

### What the user must trust

- The AI runtime that spawned the MCP (it controls the stdio link and gets all responses).
- The skill content authors (`SKILL.md` is a prompt-able document; malicious authors could embed instructions).
- npm to deliver an unmodified package (mitigated via `npm audit`, `--ignore-scripts`, or pinned versions).

The MCP itself is ~17 KB of compiled code, no native bindings, no postinstall scripts, no telemetry.

## 8. Failure Modes

| Failure | Behavior | User experience |
| --- | --- | --- |
| `AGENTS.md` not found by walking up from cwd | Server starts; `setup.kind === 'no-agents-md'` | Tools return setup guidance: "run `init` then `sync`, then restart" |
| AGENTS.md found but no `skills/` directory | Server starts; `setup.kind === 'no-skills-dir'` | Tools return: "run `agent-skills-standard sync` to install skills" |
| `metadata.json` missing | Server starts with empty `file_routing` | `load_skills_for_files` returns "no routes for these extensions" + available categories |
| A `SKILL.md` is malformed (no frontmatter) | Skipped silently during scan; logged to stderr if `DEBUG=1` | Skill won't be discoverable — runs `validate` from CLI to catch |
| `tools/call` for unknown tool | MCP SDK returns method-not-found error | Standard MCP error response |
| Tool handler throws | Caught by SDK; returns error response | `isError: true` in the tool result |
| Process killed (SIGTERM/SIGKILL) | stdio closes; runtime detects disconnection | User restarts AI session |

The principle: **the server starts even when nothing is set up**. Tools are responsible for delivering helpful guidance instead of crashing.

## 9. Service Layout

| Module | Responsibility |
| :--- | :--- |
| `index.ts` | Bin entry. Resolves config, builds server, wires `StdioServerTransport`. |
| `config.ts` | Walks the file system to find `AGENTS.md` and the skills directory. Returns a `ResolvedConfig` with a `setup` hint that's never `throw`-y. |
| `services/SkillParser.ts` | Reads a single `SKILL.md` and extracts frontmatter `metadata.triggers`. Pure function. |
| `services/SkillIndex.ts` | Owns the in-memory index. Loads `metadata.json`, scans skills, exposes `matchFiles` / `matchKeywords` / `findSkill`. |
| `services/SessionTracker.ts` | Append-only log of tool calls in this process. Backs `audit_session_compliance`. |
| `tools/index.ts` | The 5 tool handlers. All graceful-empty-state checks live here. |
| `server.ts` | `McpServer` factory. Owns the `instructions` field and per-tool descriptions (use_case / aliases / important_notes). |

## 10. Decision Records

### ADR-MCP-001: Standalone parser, not coupled to the CLI's `MetadataReader`

**Decision**: The MCP package ships its own `SkillParser.ts` (~70 lines) instead of importing `cli/src/services/MetadataReader.ts`.

**Reason**: The MCP is published independently (`mcp-vX.Y.Z`) on a different cadence than the CLI (`cli-vX.Y.Z`). A workspace-internal import would couple their build / test / release cycles and force the CLI to expose a public API surface for what is effectively private utility code. The duplicated parser is small, well-tested, and matches the MetadataReader semantics for the subset the MCP needs.

**Trade-off**: Two implementations of frontmatter parsing must stay in sync if the SKILL.md format changes. Mitigated by the `mcp/test/SkillIndex.spec.ts` fixture exercising real SKILL.md shape.

### ADR-MCP-002: stdio over HTTP for v1

**Decision**: Only stdio transport is supported. No HTTP, no SSE, no WebSocket.

**Reason**: All current MCP-capable runtimes (Claude Code, Cursor, Antigravity, Kiro, Continue, Gemini CLI) spawn MCP servers as subprocess + stdio. HTTP introduces port management, auth, and a network attack surface for zero practical benefit. Future remote-skills use cases would add HTTP as a separate transport rather than replacing stdio.

### ADR-MCP-003: Tier model honors `base_language_skills`

**Decision**: When a skill's glob is in `metadata.broad_globs` (e.g. `**/*.dart`), the skill is matched on file ONLY if its id equals `metadata.base_language_skills[category]`. All other broad-glob skills are demoted to keyword-only matching.

**Reason**: Without this rule, a single `cart.dart` file matches every Flutter skill that uses `**/*.dart` as its trigger. Returning 30+ skills per file would blow the response size and confuse the LLM. The same algorithm is used by the CLI's `IndexGeneratorService` to generate `_INDEX.md` — the MCP must produce identical match sets so behavior is consistent whether the agent reads `_INDEX.md` directly or calls the MCP.

### ADR-MCP-004: Server-level `instructions` field

**Decision**: Pin a 1.9 KB workflow guide to `McpServer({...}, { instructions })` instead of repeating workflow guidance in each tool description.

**Reason**: Per [awesome-mcp-best-practices §2.1](https://github.com/lirantal/awesome-mcp-best-practices), `instructions` is delivered to the client during `initialize` and visible to every connecting agent (including sub-agents in the same runtime). It carries the cross-tool workflow ("load before edit, audit before done") that no single tool description can convey. Per-tool descriptions then focus on per-tool details (`<use_case>`, `<aliases>`, `<important_notes>`).

### ADR-MCP-005: Positive guidance instead of "not found"

**Decision**: When `load_skills_for_files` matches zero skills, return the available category list and a suggested next call — never the literal string "not found".

**Reason**: Per [awesome-mcp-best-practices §1.4](https://github.com/lirantal/awesome-mcp-best-practices), LLMs are disproportionately influenced by negative-framed responses. "Not found" causes the agent to give up; "Available categories: …" causes it to make a useful follow-up call. Same principle applied to `get_skill` (suggests closest matches in the same category).

### ADR-MCP-006: In-memory session tracker, no persistence

**Decision**: `SessionTracker` lives in process memory only. State is lost on restart.

**Reason**: Persistence would require a config directory, write permissions, a cleanup story, and a privacy story for what amounts to debug data. AI runtimes already persist their session transcripts — the MCP doesn't need to duplicate that. `audit_session_compliance` is scoped to the current MCP process, which exactly matches an AI session's lifetime.

### ADR-MCP-007: Composite-trigger expansion honoring `foundational_composite_rules`

**Decision**: After `matchFiles` and `matchKeywords` produce their initial result set, run a second pass that expands the set with foundational skills declared in `metadata.foundational_composite_rules`. The expansion is non-recursive and deduplicates against the seed set.

**Reason**: Without this rule, foundational skills like `common-best-practices`, `common-security-standards`, and `common-performance-engineering` are effectively invisible from `load_skills_for_files`. They use broad globs (`**/*.ts`, `**/*.go`, `**/*.dart`, etc.) which the tier model (ADR-MCP-003) demotes since they're not the registered base for any category. The CLI's `IndexGeneratorService` already bakes the same composite logic into the static `_INDEX.md` files; the MCP must produce a consistent result set whether the agent reads `_INDEX.md` directly or calls our tools. Audit results: 10 foundational skills are surfaced this way, including the 3 most-affected broad-glob skills that would otherwise never load via file routing.

**Trade-off**: Per-call response size grows by ~1-3 skills (~3-9 KB) when foundational rules trigger. This is the intended behavior — the cost is paying for content the agent should always have when working in the matched area.

**Non-recursive constraint**: A composite-triggered skill cannot trigger more composites. This avoids infinite loops if rules are configured to reference each other accidentally, and matches how the CLI's static index generator behaves.

## 11. Performance Notes

| Metric | Cost |
| --- | --- |
| Startup (load + parse 244 skills) | ~30-50 ms on a fast SSD |
| Tool schema delivered to client | ~500 tokens (5 tools, structured descriptions) |
| `load_skills_for_files` for typical Dart file | ~3-5 KB response (2 matched skills) |
| `audit_session_compliance` after 10 calls | ~1 KB response |
| Memory footprint at rest | ~5-10 MB (Node + parsed metadata) |

The tier model is the key performance lever: without it, a single `.ts` edit could return 50 KB of skill content. With it, the response stays bounded regardless of how many skills are installed.

## References

- [`mcp/README.md`](./README.md) — Install and configuration
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — Project-wide architecture
- [`../cli/ARCHITECTURE.md`](../cli/ARCHITECTURE.md) — CLI services that produce the files this MCP reads
- [Model Context Protocol spec](https://spec.modelcontextprotocol.io/) — Protocol authority
- [awesome-mcp-best-practices](https://github.com/lirantal/awesome-mcp-best-practices) — Tool design conventions referenced above
