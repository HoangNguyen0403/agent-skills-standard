# Developer Audience Research & Positioning Canvas

## Metadata
- **Initiative**: `evidence-led-marketing`
- **Campaign ID**: `standards-demo-01`
- **Shared Context Revision**: `ctx-rev-20261025-capture-ee18d7f5`
- **Date**: 2026-10-25
- **Research Classification**: `proxy_inferred` (Documented developer issues & ecosystem analysis; zero fabricated interviews)
- **Positioning Status**: `proposal_hypothesis` (Prepared for maintainer review; pending live exposure)
- **Primary Source Candidate**: Git commit `a2228857e4cf5b8ee2d71d96630c586618ec2edd` (captured snapshot tree `ee18d7f5e57ac88d2621ba46316ce0e71262ef7ba686f04e0548e04fb60e5620`, 1,412 files)

---

## 1. Target Segment Definition

### Primary Target Segment: `seg-multi-agent-teams`
- **Profile**: Lead engineers, repository maintainers, and platform architects managing multi-developer TypeScript, Go, Python, or polyglot codebases where engineers use different AI coding assistants (Claude Code, Cursor, GitHub Copilot, Codex, Windsurf).
- **Workflow Context**: Teams attempting to establish consistent project conventions (error handling, testing patterns, token budgets, security gates) across varied local AI development workflows without forcing everyone onto a single proprietary editor.
- **Explicit Non-Targets**:
  - Individual hobbyists seeking single-shot "build my app from scratch" prompt generators.
  - Non-technical product managers looking for no-code natural language interfaces.
  - Teams exclusively committed to a single closed proprietary agent platform with mandatory vendor-managed rules.

---

## 2. Developer Friction & Evidence Classification

### Consented Primary Research & Customer Interviews
- **Status**: **No customer research conducted**. Zero external developer interviews, user surveys, private recordings, or scraped issue censuses were conducted in this authorized phase. Factual claims rely strictly on reproducible codebase and CLI execution evidence.
### Proxy Assumptions (Secondary Documented Trends)
- **ASM-001 [assumption: proxy_inferred]**: Multi-agent fragmentation friction. Teams want consistent rules, but maintaining separate `.cursorrules`, `CLAUDE.md`, `.github/copilot-instructions.md`, and `.windsurfrules` leads to rule drift, conflicting patterns, and stale documentation.
- **ASM-002 [assumption: proxy_inferred]**: Context window bloat. When developers paste massive 5,000-line markdown guides into agent prompts, token costs explode, latency degrades, and models suffer instruction dilution.
- **ASM-003 [assumption: proxy_inferred]**: Vendor lock-in skepticism. Engineering teams resist paying recurring monthly SaaS subscriptions for what fundamentally amounts to directory configuration and prompt curation.

### Contradictions & Dissenting Workflows (AC-01)
- **CON-001**: Some developers prefer monolithic single-file system prompts (e.g., massive `CLAUDE.md`) because "everything is in one place," even though it costs tokens on every turn.
  - *Resolution*: `agent-skills-standard` supports both selective category syncing and unified `AGENTS.md` indexing, allowing teams to choose their level of granularity.

### Sample Limitations & Unvalidated Hypothesis Disclosure (AC-17)
- **Sample Bounds ($N=0$)**: Zero external participants surveyed.
- **Methodological Disclosure**: All stated developer friction points (`ASM-001`, `ASM-002`, `ASM-003`) are unvalidated proxy hypotheses (`assumption: proxy_inferred`) based on the repository's open-source architecture goals (multi-agent format sprawl and prompt token bloat). They are explicitly labeled as hypotheses to be verified in future live pilot phases, NOT as established empirical market facts.
---

## 3. Competitive Alternatives Matrix (AC-18)

| Alternative Category | Alternative Name | Why Developers Choose It | Evidenced Limitations & Drawbacks | Evidence Reference |
|---|---|---|---|---|
| **DIY / Ad-hoc Rule Files** | Custom `.cursorrules` / `CLAUDE.md` hand-copied per repo | Zero setup tooling required; instant to paste into a new repository | Brittle maintenance; high copy-paste drift; rules quickly become stale and bloat token consumption | ASM-001, ASM-002 [assumption: proxy_inferred] |
| **Do Nothing / Status Quo** | Rely on LLM pre-training defaults and ad-hoc chat prompting | Requires zero maintenance or repository configuration | Inconsistent code patterns; recurrent hallucinations; repetitive manual prompting by every team member | ASM-001 [assumption: proxy_inferred] |
| **Commercial Centralized Platforms** | Proprietary SaaS agent management platforms | Central web dashboard, team analytics, automatic enterprise sync | Closed proprietary format; monthly subscription fee; vendor lock-in; requires telemetry exfiltration | ASM-003 [assumption: proxy_inferred] |
| **agent-skills-standard** | Open standard CLI & registry (`ags`) | Open source (Apache-2.0); single `.skillsrc` generates native mirrors; token-optimized rules; zero SaaS fees | Candidate categories require release publishing (remote AC-16 gate); models remain probabilistic | CLM-001, CLM-002; verified via the captured sync in `command-capture.log` |

---

## 4. Differentiating Value Drivers (Evidence-Qualified)

1. **Single Source of Truth $\to$ Multi-Agent Native Mirrors (CLM-001)**:
   - Configure `.skillsrc` once with your team's skills and target agents (`claude`, `cursor`, `codex` — the three exercised in the capture).
   - `ags sync` generates the exact native directory structure expected by each tool (`.claude/skills/`, `.cursor/skills/`, etc.), eliminating manual sync drift.
   - *Scope Limitation*: verified on local candidate checkout (Node 22, snapshot `ee18d7f5…`); `windsurf`, `gemini`, and `copilot` are listed by the CLI but were not run; unreleased categories require candidate snapshot or release publication (AC-16 gate).
2. **Token-Dense Payloads & No Evaluation Bloat (CLM-002)**:
   - Payload sizes from `skills/metadata.json`: `typescript` v1.3.4 = 4 skills / 2,884 tokens (721 average); `product-management` v1.0.1 = 10 skills / 13,868 tokens (1,387 average).
   - Consumer synchronization excludes evaluation fixtures: 0 of 407 installed lockfile entries were under `evals/`.
   - *Scope Limitation*: payload measurements, not host-model context or cost savings; terminal stream savings require `rtk` proxying on supported platforms.
3. **Zero-Trust Routing Instructions via `AGENTS.md` (CLM-004)**:
   - The generated root `AGENTS.md` records the Agent Skills Index, the rule to read the matching `SKILL.md` before writing code, the router table, and the MCP section that states plainly when MCP-managed installs are off.
   - *Scope Limitation & Caveat*: **Instructs, does not enforce**. Large language models remain probabilistic. The Gatekeeper / Pre-Write Audit Log / Post-Write Self-Scan state machine is produced by a different index builder and is **not** part of the `sync`-generated router file; deterministic CI test gates and evaluation benchmarks remain mandatory.

---

## 5. Critical Compliance Caveat (AC-19)

> **"Don't claim agent compliance because files exist."**
> 
> Distributing structured, token-optimized skill files to `.claude/skills/` or `.cursor/skills/` provides models with clear, high-priority context. However, Large Language Models are inherently probabilistic. The physical presence of a markdown rule file does not mathematically guarantee model compliance during complex code generation. Teams must maintain deterministic test suites, linting gates, and automated evaluation workflows.

---

## 6. Secondary Appendix: Honest Deterministic Measurement

As a secondary demonstration of the project's engineering philosophy, the repository includes an offline measurement tool (`report-marketing.mjs` from `marketing-measurement`):
- Operates on immutable local synthetic JSON fixtures.
- Enforces strict 14-day cohort maturity boundaries.
- Returns explicit BigInt rational metrics (e.g. `repeat_rate: 0.333333`) and returns `inconclusive` recommendations when baseline data or costs are missing.
- Refuses to fabricate ROI or convert developer labor capacity into fictional cash margins.

---

## 7. Positioning Statement

> For **lead engineers and open-source maintainers** who struggle with **inconsistent AI agent behaviors and redundant rule maintenance across Cursor, Claude, and Codex**, **agent-skills-standard** is an **open-source CLI and skill registry** that **synchronizes token-optimized, high-priority coding standards into native agent formats from a single configuration file**.
> 
> Unlike **ad-hoc `.cursorrules` copy-pasting or expensive proprietary SaaS platforms**, **agent-skills-standard** provides **open Apache-2.0 native mirrors, evaluation-fixture exclusion, and a generated Zero-Trust routing file**, backed by **reproducible local CLI verification** as evidenced by `CLM-001` and `CLM-002`.
