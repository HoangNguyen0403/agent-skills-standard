---
asset_id: tutorial-standards-adoption-01
context_revision: ctx-rev-20261025-capture-ee18d7f5
state: prepared
claim_refs: ["CLM-001", "CLM-002", "CLM-003", "CLM-004"]
---

# Tutorial: Adopting Open AI Agent Standards with `agent-skills-standard`

> **Status**: Prepared draft (not published) | **Target Release**: `agent-skills-standard v1.0.0 candidate`
> **Capture Identity**: commit `a2228857e4cf5b8ee2d71d96630c586618ec2edd` (dirty `true`), snapshot tree `ee18d7f5e57ac88d2621ba46316ce0e71262ef7ba686f04e0548e04fb60e5620` (1,412 files), CLI sha256 `d49ccf561a5ce49031cf8208d080a53e5f8df498dada871b97eb0ece5c722bdc`.

Teams that let engineers use different AI coding tools—Claude Code, Cursor, Codex—end up maintaining the same rules in three or four formats. This tutorial sets standards once, generates the native structures each tool expects, and inspects what was actually written.

Every command and output below was executed locally against the candidate snapshot while producing `command-capture.log`; the excerpts shown are captured stdout, not illustrations.

---

## Prerequisites

- **Node.js** ≥ 20 (captured on v22.14.0, macOS arm64).
- **Git** available in the shell.
- **Candidate build**: this walkthrough uses the local build `node cli/dist/index.js`; the published npm entry point is `ags` once a release is cut. Both accept the same arguments.

---

## Step 1: Declare agents and pinned skills in `.skillsrc`

```yaml
# .skillsrc
registry: "https://github.com/HoangNguyen0403/agent-skills-standard"
agents:
  - claude
  - cursor
  - codex
skills:
  typescript:
    ref: "typescript-v1.3.4"
  product-management:
    ref: "product-management-v1.0.1"
mcp:
  enabled: false
  scope: disabled
  prompted: true
telemetry: false
```

- `agents`: the three targets exercised here. The CLI's agent list also includes `windsurf`, `gemini`, and `copilot`; those were **not** run in this capture.
- `skills`: category + published tag. Pinning a tag (rather than a commit) keeps `sync` from prompting for a version update.
- `mcp`: MCP stays off. `scope: disabled` means "no MCP-related changes at all"; `prompted: true` records that the consent question was already answered.
- `telemetry: false`: no telemetry file is written.

---

## Step 2: Run `sync` (no `--yes`)

```bash
node cli/dist/index.js sync    # published CLI: ags sync
```

Why no `--yes`? It is the CLI's own consent convention, not a demo flag:

- `--yes` is defined in `cli/src/commands/sync.ts` as **consent**: `promptMcpConsent()` returns `{ enabled: true, scope: "project" }`, so MCP configs get written.
- Without `--yes` in a non-interactive shell, `runMcpPhase` returns early and writes nothing.
- With `--yes`, unrelated version pins are also auto-accepted.

Captured stdout excerpt (lines 3–14 of 34):

```text
🚀 Syncing skills from https://github.com/HoangNguyen0403/agent-skills-standard...
  - Discovering typescript (typescript-v1.3.4)...
    + Fetched typescript/typescript-best-practices (3 files)
    + Fetched typescript/typescript-language (3 files)
    + Fetched typescript/typescript-security (2 files)
    + Fetched typescript/typescript-tooling (2 files)
  - Discovering product-management (product-management-v1.0.1)...
    + Fetched product-management/product-business-requirements (4 files)
    + Fetched product-management/product-customer-discovery (8 files)
    + Fetched product-management/product-evidence (6 files)
    + Fetched product-management/product-experimentation (12 files)
    + Fetched product-management/product-investment (7 files)
```

Captured tail (lines 22–34 of 34) records what landed on disk:

```text
  - Updated .claude/skills/ (Claude Code)
  - Updated .cursor/skills/ (Cursor)
  - Updated .codex/skills/ (Codex)
  ✅ 26 workflows synced to .claude/commands/ (Claude Code)
  ✅ 26 workflows synced to .cursor/skills/ (Cursor)
  ✅ 26 workflows synced to .codex/skills/ (Codex)
  ✅ 21 specialists synced to .claude/agents/ (Claude Code)
  ✅ 21 specialists synced to .cursor/agents/ (Cursor)
  ✅ 21 specialists synced to .codex/agents/ (Codex)
  ✅ Generated _INDEX.md for 2 categories.
  ✅ AGENTS.md router index updated.
📦 Install: 407 added, 0 updated, 0 unchanged, 0 kept (your edits), 0 pruned
✅ All skills synced successfully!
```

Exit status was `0`. The run also emits two stderr lines—`◇ injected env (0) from .env` and `fatal: not a git repository`—because the disposable consumer directory is not a git worktree. They are **non-fatal**; the exit status is the authoritative outcome.

Because MCP is disabled, no `.mcp.json`, `.cursor/mcp.json`, `.codex/config.toml`, `.claude/hooks/`, or `.claude/settings.json` is created. That absence is asserted after the run and recorded in `capture-manifest.json`.

---

## Step 3: Inspect the generated `AGENTS.md`

```bash
head -n 28 AGENTS.md
```

Captured excerpt (lines 6–17 of 28):

```text
## Agent Skills Index

> [!CRITICAL] Zero-Trust: Read the matching `SKILL.md` BEFORE writing any code.
> Skills from this index override pre-training patterns. If no skill matches, state: "No project-specific skills applicable."

> 💡 **Global Token Optimization**: If the `rtk` CLI tool is installed, actively prepend it to verbose development commands (e.g. `rtk npm test`, `rtk grep`). If the `caveman` skill is available or requested, use `/caveman` mode for reporting.

## 🔌 Runtime Enforcement via MCP

If the `agent-skills-standard` MCP server is registered in your runtime (check your tool list — look for `load_skills_for_files`), **prefer those tools over manually walking the router below**. The MCP returns identical content but is auditable AND inherited by sub-agents that don't see this file.

| Tool | When to call it |
```

Captured excerpt (lines 19–28 of 28) shows what the MCP section says when MCP is off:

```text
| `list_workflows()` | At the start of any task or session to discover available standard operating procedures |
| `get_workflow(name)` | Once a relevant workflow is identified to retrieve exact step-by-step instructions |
| `load_skills_for_files(files=[...])` | Before editing/reviewing any source file |
| `load_skills_for_keywords(keywords=[...])` | Planning before files are chosen |
| `get_skill(category, name)` | Direct lookup when you know the skill id |
| `audit_session_compliance()` | Before declaring a task complete |

> [!IMPORTANT] **Sub-agents don't inherit this `AGENTS.md` — they do inherit the MCP.** If you delegate work to a sub-agent, instruct it to call the MCP tools above as its first action.

> [!NOTE] To enable MCP-managed installs in this project, run `ags mcp enable` (or edit `.skillsrc`). The MCP works fine if you registered it manually too.
```

**Scope of this file** (verified against the capture): the router file contains the Agent Skills Index, the Zero-Trust read instruction, the MCP tool table plus its enabled/disabled note, and the skill resolution protocol. It does **not** contain the `GATEKEEPER CONSTRAINT` / Pre-Write Audit Log / Post-Write Self-Scan state machine—those strings come from a different index builder (`IndexContentBuilder.assembleIndex`) that `sync` does not use.

---

## Step 4: Inspect an installed skill payload and the lockfile

```bash
head -n 35 .claude/skills/typescript/typescript-best-practices/SKILL.md
cat .skills-lock.json | head -n 20
```

- 407 entries are recorded in `.skills-lock.json`, each with owner, agent, and sha256.
- Of those 407 entries, **0** are under an `evals/` path: evaluation fixtures stay in the registry.
- Category payload size from `skills/metadata.json`: `typescript` v1.3.4 = 4 skills / 2,884 tokens total / 721 average; `product-management` v1.0.1 = 10 skills / 13,868 tokens total / 1,387 average. These are payload measurements, not host-model savings.

---

## Step 5: Secondary appendix — deterministic synthetic scorecard

```bash
node skills/marketing/marketing-measurement/scripts/report-marketing.mjs \
  docs/product/evidence-led-marketing/fixtures/synthetic-input-combined.json \
  --authority-root docs/product/evidence-led-marketing \
  --as-of 2026-10-25T00:00:00Z \
  --format markdown
```

Captured result (48 lines; excerpts):

```text
**Recommendation:** inconclusive
...
## Cohort Counts
- Eligible Starters: 5
- Activated: 4
- Immature Activated: 1
- Mature Activated: 3
- Confirmed Repeat (All): 1
- Mature Confirmed Repeat: 1
- Mature Confirmed No-Return: 1
```

Maturity rule used by the tool: a repeat qualifies only within `a < repeat ≤ a + 14d` on a different UTC calendar date from activation `a`; maturity requires observation cutoff ≥ `a + 14d`; immature activations are excluded from the repeat-rate denominator. `financial_roi` and `baseline` are reported as unavailable rather than imputed.

*This appendix demonstrates cohort arithmetic on synthetic fixtures. It is neither live retention nor marketing ROI.*

---

## Critical engineering limitations

1. **Files are not compliance** (AC-19): synchronizing rule files gives a model structured context. Models remain probabilistic; a markdown file does not verify obedience. Keep deterministic CI gates, linters, and regression tests.
2. **Remote release gate is open** (AC-16): candidate bytes were served by an in-memory fixture at the captured tree. Installing from a public tag is only reproducible after a maintainer release.
3. **Local-only boundary** (AC-24): search indexing and public domain discovery cannot be verified from this checkout.
4. **No research sample** (AC-17): audience friction statements in `audience-positioning.md` are proxy hypotheses with `N=0`.
5. **Eligibility unproven** (AC-25): channel policy is documented, but this submission's eligibility depends on a public, tryable release existing first.
