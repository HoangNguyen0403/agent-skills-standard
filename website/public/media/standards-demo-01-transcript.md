# Video Transcript: agent-skills-standard: Multi-Agent AI Standards Walkthrough
Campaign: `standards-demo-01` | Context Revision: `ctx-rev-20261025-capture-ee18d7f5`
Capture Identity: commit `a2228857e4cf5b8ee2d71d96630c586618ec2edd` (dirty: true) | snapshot tree `ee18d7f5e57ac88d2621ba46316ce0e71262ef7ba686f04e0548e04fb60e5620` (1412 files) | CLI sha256 `d49ccf561a5ce49031cf8208d080a53e5f8df498dada871b97eb0ece5c722bdc`
Rights License Assertion: Apache-2.0 | Audio Provenance: Clean synthesized audio silence track generated via ffmpeg lavfi; zero third-party commercial audio; no spoken narration or synthetic voiceover; synchronized visual subtitles provided for accessibility
Synthetic Contract: No — every terminal excerpt below is captured stdout from an actual local execution.

Output shown in the video is an excerpt of captured stdout, labelled with its line range. The complete,
sanitized capture is `command-capture.log`; raw output hashes are in `capture-manifest.json`.
Caption times are scene-local offsets resolved onto the global timeline (HH:MM:SS.mmm).

## Scene Breakdown

### Configuring .skillsrc for Multi-Agent Projects (7s, starts at 00:00:00.000)

```bash
$ cat .skillsrc
```
*Captured Output (actual, sanitized excerpt — lines 1–15 of 15):*
```
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

**Captions (global timeline):**
- [00:00:00.500 - 00:00:06.000]: "Define the target agents and pinned skill versions once in .skillsrc."

### Synchronizing Pinned Skills with ags sync (8s, starts at 00:00:07.000)

```bash
$ ags sync
```
*exact invocation: node cli/dist/index.js sync (candidate build)*
*Captured Output (actual, sanitized excerpt — lines 3–14 of 34):*
```
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

**Captions (global timeline):**
- [00:00:07.500 - 00:00:14.000]: "ags sync fetches only the pinned categories and writes native mirrors for each agent."

### Native Mirrors, Lockfile, and No MCP Writes (8s, starts at 00:00:15.000)

```bash
$ ags sync
```
*same execution as scene-02*
*Captured Output (actual, sanitized excerpt — lines 22–34 of 34):*
```
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
*Non-fatal stderr (retained verbatim from the capture; exit status 0 is authoritative):*
```
◇ injected env (0) from .env
fatal: not a git repository (or any of the parent directories): .git
```

**Captions (global timeline):**
- [00:00:15.500 - 00:00:22.000]: "Native directories and lockfile are written; no MCP runtime config is touched while MCP stays disabled."

### Generated AGENTS.md: Agent Skills Index (8s, starts at 00:00:23.000)

```bash
$ head -n 28 AGENTS.md
```
*Captured Output (actual, sanitized excerpt — lines 6–17 of 28):*
```
## Agent Skills Index

> [!CRITICAL] Zero-Trust: Read the matching `SKILL.md` BEFORE writing any code.
> Skills from this index override pre-training patterns. If no skill matches, state: "No project-specific skills applicable."

> 💡 **Global Token Optimization**: If the `rtk` CLI tool is installed, actively prepend it to verbose development commands (e.g. `rtk npm test`, `rtk grep`). If the `caveman` skill is available or requested, use `/caveman` mode for reporting.

## 🔌 Runtime Enforcement via MCP

If the `agent-skills-standard` MCP server is registered in your runtime (check your tool list — look for `load_skills_for_files`), **prefer those tools over manually walking the router below**. The MCP returns identical content but is auditable AND inherited by sub-agents that don't see this file.

| Tool | When to call it |
```

**Captions (global timeline):**
- [00:00:23.500 - 00:00:30.000]: "Generated AGENTS.md opens with the Agent Skills Index and the Zero-Trust rule to read matching SKILL.md files."

### Generated AGENTS.md: MCP Section (Disabled) (8s, starts at 00:00:31.000)

```bash
$ head -n 28 AGENTS.md
```
*same execution as scene-04*
*Captured Output (actual, sanitized excerpt — lines 19–28 of 28):*
```
| `list_workflows()` | At the start of any task or session to discover available standard operating procedures |
| `get_workflow(name)` | Once a relevant workflow is identified to retrieve exact step-by-step instructions |
| `load_skills_for_files(files=[...])` | Before editing/reviewing any source file |
| `load_skills_for_keywords(keywords=[...])` | Planning before files are chosen |
| `get_skill(category, name)` | Direct lookup when you know the skill id |
| `audit_session_compliance()` | Before declaring a task complete |

> [!IMPORTANT] **Sub-agents don't inherit this `AGENTS.md` — they do inherit the MCP.** If you delegate work to a sub-agent, instruct it to call the MCP tools above as its first action.

> [!NOTE] To enable MCP-managed installs in this project, run `ags mcp enable` (or edit `.skillsrc`). The MCP works fine if you registered it manually too.
```

**Captions (global timeline):**
- [00:00:31.500 - 00:00:38.000]: "The MCP section states when it applies and, with MCP disabled, tells you to enable it explicitly."

### Secondary Appendix: Synthetic Cohort Scorecard (10s, starts at 00:00:39.000)

```bash
$ node skills/marketing/marketing-measurement/scripts/report-marketing.mjs … --format markdown
```
*Captured Output (actual, sanitized excerpt — lines 1–8 of 48):*
```
# Marketing Scorecard

> Synthetic offline contract scorecard (as of 2026-10-25T00:00:00Z)

**Campaign ID:** standards-demo-01
**Input Revision:** syn-r1
**Attribution:** descriptive
**Recommendation:** inconclusive
```
*Captured Output (actual, sanitized excerpt — lines 17–24 of 48):*
```
## Cohort Counts
- Eligible Starters: 5
- Activated: 4
- Immature Activated: 1
- Mature Activated: 3
- Confirmed Repeat (All): 1
- Mature Confirmed Repeat: 1
- Mature Confirmed No-Return: 1
```

**Captions (global timeline):**
- [00:00:39.500 - 00:00:48.000]: "The scorecard reports synthetic cohort counts and recommendation: inconclusive — no ROI is fabricated."

### Compliance Caveat and Prepared State (7s, starts at 00:00:49.000)

> 🎙️ **Narration**: Standards files provide structured context, but AI models remain probabilistic. CI test gates remain essential.

**Captions (global timeline):**
- [00:00:49.500 - 00:00:55.000]: "Standards files provide context, but AI models remain probabilistic. CI test gates remain essential."

## Limitations

- This is a local candidate execution against an in-memory registry snapshot; the remote release gate (AC-16) is open.
- Standards files instruct agents; they do not enforce LLM compliance. CI gates remain mandatory.
- The measurement scorecard runs on synthetic fixtures only; it is not retention, market, or ROI evidence.