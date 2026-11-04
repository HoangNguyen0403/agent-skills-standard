# Marketing Proof Register: Core Standards Campaign

## Metadata
- **Initiative Slug**: `evidence-led-marketing`
- **Campaign ID**: `standards-demo-01`
- **Shared Context Revision**: `ctx-rev-20261025-capture-ee18d7f5`
- **Audit Date**: 2026-10-25
- **Proof Auditor**: Campaign & Media Owner
- **Audit Status**: `prepared` — campaign collateral is prepared for maintainer review. Publication is **not authorized**; Gate G4 (independent web/media review) and the human publication gate remain open.
- **Capture Identity** (`capture-manifest.json`):
  - Candidate Git HEAD: `a2228857e4cf5b8ee2d71d96630c586618ec2edd` (working tree dirty: `true`)
  - Snapshot Tree SHA256: `ee18d7f5e57ac88d2621ba46316ce0e71262ef7ba686f04e0548e04fb60e5620` (1,412 files served by the in-memory fixture)
  - Candidate CLI SHA256: `d49ccf561a5ce49031cf8208d080a53e5f8df498dada871b97eb0ece5c722bdc` (`cli/dist/index.js`)
  - Capture window: `2026-10-25T09:33:47.085Z` – `2026-10-25T09:33:47.700Z` (authoritative final run)
  - Network isolation: `scripts/skill-tests/product-evidence-integration/network-preload.cjs`, fixture host `127.0.0.1`, 148 fixture requests served, credentials not forwarded.
  - Note: this revision identifier is derived from the **actual capture** in this directory. It replaces the earlier `ctx-rev-20261025-01-candidate-41f79634` label, which referred to a different (pre-capture) snapshot tree and was therefore not a defensible identity for these assets.

---

## Claim Index

### CLM-001: Multi-Agent Native Skill Synchronization
- **Proposed Marketing Copy**: "Synchronize pinned AI coding standards across Claude Code, Cursor, and Codex from a single `.skillsrc` configuration file."
- **Status**: `verified` (local candidate execution captured in this directory)
- **Claim Scope**: The three agents exercised in this capture (`claude`, `cursor`, `codex`), Node.js v22.14.0 on macOS arm64, against the candidate registry snapshot `ee18d7f5…`.
- **Primary Source Refs**: `cli/src/commands/sync.ts`, `cli/src/services/SyncService.ts` at commit `a2228857…`.
- **Verification Evidence** (all from `command-capture.log` / `capture-manifest.json`):
  - *Commands*: `cat .skillsrc` (exit 0, 2.7 ms); `node cli/dist/index.js sync` (exit 0, 349.0 ms); `head -n 28 AGENTS.md` (exit 0, 2.1 ms); `report-marketing.mjs` (exit 0, 46.3 ms).
  - *Observed Result*: 407 lockfile entries written across `.claude/skills/`, `.cursor/skills/`, `.codex/skills/`; 26 workflows and 21 specialists mirrored per agent; `AGENTS.md` router index updated; `.skills-lock.json` created.
  - *MCP side effect*: **none**. With `.skillsrc` declaring `mcp.enabled=false` / `mcp.scope=disabled` and `sync` running without `--yes` in a non-interactive shell, `runMcpPhase` skips consent; `.mcp.json`, `.cursor/mcp.json`, `.codex/config.toml`, `.claude/hooks`, and `.claude/settings.json` are absent on disk (asserted by the renderer and recorded in the manifest).
  - *Behaviour note (actual CLI, not a demo flag)*: `sync --yes` treats "yes" as consent and **opts in to MCP at project scope**, and a `prompted: true` + `enabled: false` config is re-prompted when the shell is interactive. The capture therefore uses `ags sync` without `--yes`; that is the CLI's own convention for leaving MCP untouched.
- **Contradictions & Exceptions (AC-01)**:
  - *Observation*: Remote registry release gate `AC-16` remains **OPEN**. Candidate bytes are served by the in-memory fixture; nothing here proves that a released tag on the public remote serves the same bytes.
  - *Observation*: `agents` accepts more targets than were exercised (`windsurf`, `gemini`, `copilot` appear in the CLI's agent list but were **not** run in this capture).
  - *Resolution*: Copy must name only the three exercised agents and must not claim generic or universal multi-agent support.
- **NOT READY / Caveat Status (AC-19)**:
  - **"Don't claim agent compliance because files exist."** Installing files steers models; it does not verify obedience. Deterministic CI, linters, and eval runs remain mandatory.
- **Approved Copy Guidance**:
  - *Permitted*: "Generates native steering structures for Claude Code, Cursor, and Codex from one configuration (verified on Node 22, candidate snapshot `ee18d7f5…`)."
  - *Prohibited*: "Guarantees compliant AI output", "works with every agent", "production-verified across ecosystems".

---

### CLM-002: Token-Optimized Instruction Rules & Bloat Removal
- **Proposed Marketing Copy**: "Ship dense, token-budgeted rule files and keep evaluation fixtures out of consumer installs."
- **Status**: `verified` (registry metadata + captured install contents)
- **Claim Scope**: The two categories synchronized in this capture (`typescript` v1.3.4, `product-management` v1.0.1).
- **Primary Source Refs**: `skills/metadata.json` (category `token_metrics`), captured `.skills-lock.json`.
- **Verification Evidence**:
  - *Token metrics (source: `skills/metadata.json`)*: `typescript` v1.3.4 — 4 skills, 2,884 tokens total, 721 average, largest `typescript-security` (817). `product-management` v1.0.1 — 10 skills, 13,868 tokens total, 1,387 average, largest `product-metrics` (1,717).
  - *Eval exclusion*: of 407 installed lockfile entries, **0** are under an `evals/` path.
  - *Execution Date*: 2026-10-25 (same capture as CLM-001).
  - *Earlier figures withdrawn*: the previous "~1,000 tokens average / 1,034 tokens / 12 marketing skills" numbers described the separate `marketing` category (`1,074` average per `skills/metadata.json`) and were **not** produced by this demo configuration; they are not used in campaign copy.
- **Contradictions & Exceptions (AC-01)**:
  - *Observation*: Token counts are metadata measurements of skill payloads, not measurements of any host model's context savings, latency, or cost.
  - *Observation*: `rtk` shell-output compression (60–90% on common git/docker streams on macOS arm64) is a separate tool and is not exercised in this capture.
  - *Resolution*: State token figures as payload-size metadata; do not convert them into cost or performance claims.
- **NOT READY / Caveat Status (AC-19)**:
  - *Permitted Copy*: "Concise rule payloads with evaluation fixtures excluded from consumer installs."
  - *Prohibited*: "Cuts your AI costs by 90%", "unlimited context", "compresses every context window".

---

### CLM-003: Deterministic Offline Cohort Scorecard (Secondary Appendix)
- **Proposed Marketing Copy**: "Audit cohort math with deterministic 14-day maturity and zero-denominator protection on local synthetic records."
- **Status**: `verified` (synthetic fixtures only)
- **Claim Scope**: Offline synthetic JSON datasets conforming to `measurement-input.schema.json`, run with Node.js ≥ 20.
- **Primary Source Ref**: `skills/marketing/marketing-measurement/scripts/report-marketing.mjs`, sha256 `4d1269c8389a6105c0490ff40afe7efcaddddb3283476806cdaf9c6f3aa6412b`.
- **Verification Evidence** (captured stdout, 48 lines):
  - `Recommendation: inconclusive`; `Eligible Starters: 5`; `Activated: 4`; `Immature Activated: 1`; `Mature Activated: 3`; `Mature Confirmed Repeat: 1`; `Mature Confirmed No-Return: 1`; `Mature Unknown: 1`.
  - `repeat_rate: 0.333333`; `cash_per_repeat: 12.000000 USD`; `financial_roi: [unavailable: unknown_benefit]`; `baseline: [unavailable: baseline_unknown]`.
  - Canonical window used by the tool: a repeat qualifies only when `a < repeat ≤ a + 14d` on a different UTC calendar date from activation `a`; maturity requires observation cutoff ≥ `a + 14d`; immature activations are excluded from the repeat-rate denominator.
- **Contradictions & Exceptions (AC-01)**:
  - *Observation*: This is synthetic fixture math. It is not live retention, not market evidence, and not financial ROI.
  - *Resolution*: Present strictly as a secondary technical appendix demonstrating honest measurement; never as an analytics product or a traction proof.
- **Approved Copy Guidance**:
  - *Permitted*: "Demonstrates exact cohort math and returns `inconclusive` when baseline data is missing."
  - *Prohibited*: "Measures your marketing ROI", "proven retention engine", any implied customer counts.

---

### CLM-004: Zero-Trust Routing Instructions via Generated `AGENTS.md`
- **Proposed Marketing Copy**: "The generated root `AGENTS.md` opens with an Agent Skills Index that tells agents to read the matching `SKILL.md` before writing code, and states plainly when the MCP tool route applies."
- **Status**: `verified` for **generated content** (captured); host-model compliance **unproven**
- **Claim Scope**: The router-style `AGENTS.md` written by `ags sync` in this capture (56 lines, sha256 `946659253440537be9bc562249cf2a06213da9fe1e9206cc7f9afa0ddb49bcfe`).
- **Primary Source Refs**: `cli/src/services/IndexGeneratorServiceImpl.ts` (`assembleRouterIndex`), `cli/src/services/SyncService.ts` (router-style generation), captured `AGENTS.md`.
- **Verification Evidence** (exact captured lines):
  - `## Agent Skills Index`
  - `> [!CRITICAL] Zero-Trust: Read the matching \`SKILL.md\` BEFORE writing any code.`
  - `> Skills from this index override pre-training patterns. If no skill matches, state: "No project-specific skills applicable."`
  - `## 🔌 Runtime Enforcement via MCP` followed by the tool table and, because MCP is disabled, `> [!NOTE] To enable MCP-managed installs in this project, run \`ags mcp enable\` (or edit \`.skillsrc\`).`
  - `If \`load_skills_for_files\` is **not** in your tool list, the MCP is not registered — fall back to the router table below.`
- **Corrections to the previous register (evidence-based)**:
  - The previously claimed `GATEKEEPER CONSTRAINT`, `1. The Pre-Write Audit Log (Mandatory)`, and `2. The Post-Write Self-Scan (Mandatory)` blocks come from `IndexContentBuilder.assembleIndex`, which is **not** the builder used by `ags sync`. The captured `AGENTS.md` does not contain those strings (asserted by the renderer: `!agentsRaw.includes('GATEKEEPER CONSTRAINT')`).
  - Copy must not attribute the Gatekeeper/audit-log state machine to the generated router file. If that state machine is mentioned at all, it must be attributed to the legacy/alternate index builder and labelled unverified for this workflow.
- **Contradictions & Exceptions (AC-01)**:
  - *Observation*: **Host compliance is unproven.** A generated instruction file does not make a probabilistic model follow it.
  - *Observation*: The MCP section is documentation; it does not register a server. With `mcp.enabled=false` no runtime MCP config is written.
  - *Resolution*: Use "records", "instructs", "states"; never "enforces" or "guarantees".
- **NOT READY / Caveat Status (AC-19)**:
  - *Permitted Copy*: "The generated router file records the Zero-Trust rule and the fallback path when MCP is absent."
  - *Prohibited*: "Enforces agent compliance", "blocks unsafe edits", "guarantees the model reads every skill".

---

## Cross-cutting limitations (AC-01, AC-17, AC-19, AC-24, AC-25)
1. **Research sample is zero.** No interviews, surveys, or scraped issue censuses were conducted. Audience friction points remain `assumption: proxy_inferred`, `N=0`.
2. **No enforcement claim.** Standards files and `AGENTS.md` provide context; they do not verify compliance.
3. **14-day window semantics.** Repeat qualifies only within `a < repeat ≤ a + 14d` (different UTC date); maturity requires cutoff ≥ `a + 14d`; immature activations are excluded from the denominator. Nothing here shortens that window.
4. **Local/candidate boundary.** Search indexing, public-domain discovery, and remote install-from-tag behaviour cannot be verified on this checkout (AC-24). Remote release (`AC-16`) is open.
5. **Community policy eligibility is unverified.** Channel rules were read on 2026-10-25; eligibility of this specific submission is not established until a public, tryable release exists (AC-25).
6. **No ROI or market-effectiveness evidence exists.** The scorecard runs on synthetic fixtures; no causal marketing outcome is claimed.
