---
asset_id: announcement-github-01
context_revision: ctx-rev-20261025-capture-ee18d7f5
state: prepared
claim_refs: ["CLM-001", "CLM-002", "CLM-004"]
---

### Proposal: GitHub Announcement — Open AI Agent Standards Synchronization

> **Publication Gate**: Status: `prepared` | Action: `propose`
> *Requires formal repository lead approval prior to public posting.*

---

**Title**: One config, three agents: synchronizing AI coding standards with `agent-skills-standard`

Maintaining consistent coding rules across a team is fragmented once engineers use different AI assistants. Keeping `.cursorrules`, `CLAUDE.md`, and Codex configuration in sync by hand causes rule drift and wasted context.

This is candidate work on **`agent-skills-standard` (`ags`)**, an open-source standard and CLI that generates native steering structures for your coding assistants from a single configuration file.

#### Key Capabilities

1. **Multi-agent native synchronization (`CLM-001`)**
   Declare agents and pinned skill tags once in `.skillsrc`; `ags sync` writes the paths each tool expects:
   - Claude Code: `.claude/skills/` (plus `.claude/commands/`, `.claude/agents/`)
   - Cursor: `.cursor/skills/`, `.cursor/agents/`
   - Codex: `.codex/skills/`, `.codex/agents/`
   *Verification*: captured local run on Node v22.14.0 against candidate snapshot `ee18d7f5e57ac88d2621ba46316ce0e71262ef7ba686f04e0548e04fb60e5620` — exit status 0, 407 lockfile entries, 26 workflows and 21 specialists mirrored per agent. Only these three agents were exercised; the CLI's agent list also contains `windsurf`, `gemini`, and `copilot`, which were not run here.

2. **Token-dense payloads, no evaluation bloat (`CLM-002`)**
   Category payload sizes from `skills/metadata.json`: `typescript` v1.3.4 — 4 skills, 2,884 tokens total (721 average); `product-management` v1.0.1 — 10 skills, 13,868 tokens total (1,387 average). In the captured install, 0 of 407 installed files were under an `evals/` path, so benchmark fixtures stay in the registry.
   *Scope*: these are payload measurements, not host-model cost or latency savings.

3. **A generated router file, not an enforcement layer (`CLM-004`)**
   The generated root `AGENTS.md` opens with an Agent Skills Index and the rule *"Read the matching `SKILL.md` BEFORE writing any code."* It then documents when the MCP tool route applies and, when MCP is disabled, says so explicitly: *"To enable MCP-managed installs in this project, run `ags mcp enable`."*
   *Correction carried from review*: this router file does **not** contain the `GATEKEEPER CONSTRAINT` / Pre-Write Audit Log / Post-Write Self-Scan state machine — that content belongs to a different index builder that `sync` does not use.

#### Verification Command

```bash
# candidate build; published CLI: ags sync
node cli/dist/index.js sync

# then inspect what was generated
head -n 28 AGENTS.md
```

`sync` is intentionally shown without `--yes`: in this CLI, `--yes` is consent for MCP wiring at project scope. Omitting it in a non-interactive shell leaves MCP runtime configs untouched.

#### Engineering Limitations & Boundaries (AC-19)

- **"Don't claim agent compliance because files exist."** Rule files give models structured context; models remain probabilistic. Generated files do not verify obedience. Deterministic CI checks, linters, and regression suites remain essential.
- **Release status**: candidate snapshot only. Remote registry installation (`AC-16`) is open pending a maintainer release; nothing here proves a public tag serves the same bytes.
- **No telemetry, no SaaS**: Apache-2.0, no dashboard, no account. `telemetry: false` in the captured run.
- **No effectiveness claims**: the accompanying measurement scorecard runs on synthetic fixtures and returns `inconclusive`; it is not retention, market, or ROI evidence.
