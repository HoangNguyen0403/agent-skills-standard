# Remote Consumer Acceptance Verification Report

**Initiative**: `evidence-led-marketing` (PR #263)  
**Date**: 2026-10-26  
**Candidate Commit SHA**: `703f750bc65bf87a764041a26dc12e32eaf0c60a`  
**Remote Registry**: `https://github.com/HoangNguyen0403/agent-skills-standard`  
**Host Runtime**: Node `v22.14.0` (darwin arm64)  
**CLI Entrypoint**: `cli/dist/index.js` (SHA-256: `d49ccf561a5ce49031cf8208d080a53e5f8df498dada871b97eb0ece5c722bdc`)  
**Current Status**: `PASS — SIX GENUINE REMOTE-CONSUMER SCENARIOS`  
**AC-016 Disposition**: `PASS (PUBLISHED CANDIDATE SHA); VERSION-TAG PUBLICATION SEPARATE`

---

## 1. Executive Summary & Verification Boundaries

This report records normal synchronization, installed runtime behavior and MCP lookup in a disposable consumer using the built delivery CLI and MCP server against published candidate SHA `703f750bc65bf87a764041a26dc12e32eaf0c60a`.

The parent independently exercised the original four scenarios (sync `20,442 ms`) and then the repaired fail-closed six-scenario verifier (sync exit `0`, `22,486 ms`). A prior rate-limited attempt substituted local fixture assembly and is **rejected as remote acceptance evidence**; its downstream MCP result is not admitted. The successful new run used genuine remote assembly and the delivery MCP build, with no fixture fallback. The [structured receipt](remote-consumer-acceptance.json) records the latest observed execution and separates the historical checkpoint.

### Bounded Provenance
- **Genuine Remote Network Execution**: No in-memory registry fixtures, local proxy servers, or preloaded network caches were used. The CLI connected directly to `https://api.github.com` (tree queries) and `https://raw.githubusercontent.com` (byte-validated Git blob downloads).
- **Disposable Consumer Isolation**: Verification executed in unique temporary directories (`os.tmpdir()` / `fs.mkdtemp`) with temporary isolated `HOME` and `XDG_CONFIG_HOME`. No developer home or global configuration was modified. Throwaway directories were purged immediately after verification.
- **Clean CLI Execution**: Executed non-interactively without `--yes` (`stdio: ['ignore', 'pipe', 'pipe']`). Per `cli/src/commands/sync.ts` lines 107–168, non-TTY execution without `--yes` skips version upgrade prompts and stays on pinned SHA references, preventing unexpected mutation of configuration pins.

---

## 2. Consumer Configuration (`.skillsrc`)

The consumer was initialized with the documented YAML schema specifying the Codex agent, pinned SHA references, explicit product-management dependencies, and the thin optional workflow:

```yaml
registry: "https://github.com/HoangNguyen0403/agent-skills-standard"
agents:
  - codex
skills:
  marketing:
    ref: "703f750bc65bf87a764041a26dc12e32eaf0c60a"
  product-management:
    ref: "703f750bc65bf87a764041a26dc12e32eaf0c60a"
    include:
      - product-customer-discovery
      - product-evidence
      - product-experimentation
      - product-investment
      - product-market-research
      - product-metrics
      - product-strategy
workflows_ref: "703f750bc65bf87a764041a26dc12e32eaf0c60a"
workflows:
  - marketing-campaign
mcp:
  enabled: false
  scope: disabled
  prompted: true
telemetry: false
```

---

## 3. Detailed Verification Scenarios

### Scenario 1: Live Remote GitHub Sync Assembly
- **Command**: `node <CLI_PATH> sync` (Non-TTY, without `--yes`)
- **Exit Code**: `0` (latest parent six-scenario run: `22,486 ms`; original parent four-scenario checkpoint: `20,442 ms`).
- **Lockfile**: `.skills-lock.json` successfully written with package ownership records.
- **Assembled Marketing Skills (12/12 present in `.codex/skills/marketing/`)**:
  1. `marketing-audience-research`
  2. `marketing-community`
  3. `marketing-content-strategy`
  4. `marketing-copywriting`
  5. `marketing-demo-video`
  6. `marketing-landing`
  7. `marketing-launch`
  8. `marketing-measurement`
  9. `marketing-positioning`
  10. `marketing-proof`
  11. `marketing-search-discovery`
  12. `marketing-strategy`
- **Assembled PM Dependencies (7/7 present in `.codex/skills/product-management/`)**:
  - `product-customer-discovery`, `product-evidence`, `product-experimentation`, `product-investment`, `product-market-research`, `product-metrics`, `product-strategy`
- **Package Integrity & Boundary Checks**:
  - `evals/` directories: **Strictly excluded** from all installed skills (no benchmark data leaked into consumer).
  - `SKILL.md`: Present and non-empty for all 12 skills.
  - `scripts/` and `assets/`: Present and verified for `marketing-demo-video` and `marketing-measurement`.
  - Supporting PM scripts & schemas: Present for `product-evidence` (`validate-product-evidence.mjs`) and `product-investment` (`evaluate-investment.mjs`).
- **Codex Workflow Installation**:
  - Installed at `.codex/skills/marketing-campaign/SKILL.md`.
  - Satisfies workflow contract: includes preflight dependency verification, proposal-only collateral constraints (`state: "prepared"`, `outcome: "propose"`), and portable cost reporting (`get_session_cost`).
- **Conditional Router Generation**:
  - `AGENTS.md` generated with the conditional marketing router row:
    `| Marketing campaign, audience research, positioning, copy, proof, demo video, or measurement request | <SKILLS>/marketing/_INDEX.md |`

### Scenario 2: Canonical Source Byte Parity
- **Total Package Files Compared**: 40 files across all 12 marketing skills.
- **Comparison Method**: Full cryptographic SHA-256 comparison between canonical working-tree source files (`skills/marketing/*`) and remote GitHub installed files (`.codex/skills/marketing/*`).
- **Outcome**: 40 installed resource files matched their canonical source bytes (0 mismatches). This does not assert completeness of the entire monorepo source tree; internal evals and repository tooling are outside this comparison.

### Scenario 3: Runtime Companion Execution on Copied Public Synthetic Fixtures
- **Fixture Containment**: Public synthetic authority fixtures from `docs/product/evidence-led-marketing/` (`evidence.json` and `fixtures/`) were copied into a throwaway fixture folder inside the disposable consumer, ensuring execution was self-contained without monorepo parent fallbacks.
- **Companion 1 — Storyboard Validator (`validate-demo-storyboard.mjs`)**:
  - Executed on installed `fixture-storyboard.json` with `--format json`:
    - Exit Code: `0`
    - `valid`: `true`
    - `synthetic`: `true`
    - `issues`: `[]`
  - Executed with `--format vtt`:
    - Exit Code: `0`
    - Output: Compiles valid `WEBVTT` track with timestamped cue identifiers.
- **Companion 2 — Marketing Measurement Scorecard CLI (`report-marketing.mjs`)**:
  - Executed with `--authority-root <throwawayAuthority> --as-of 2026-10-25T00:00:00Z --format json`:
    - Exit Code: `0`
    - `valid`: `true`
    - `synthetic`: `true`
    - `calculation.sha256`: `4d1269c8389a6105c0490ff40afe7efcaddddb3283476806cdaf9c6f3aa6412b`
    - Metric counts: `activated = 4`, `mature_activated = 3`, `confirmed_repeat_all = 1`
    - Exact synthetic ratios:
      - `repeat_rate`: `0.333333`
      - `cash_per_repeat`: `12.000000 USD/repeat`
      - `cash_per_activation`: `3.000000 USD/activation`
      - `hours_per_repeat`: `6.000000 hours/repeat`
      - `recommendation`: `inconclusive`

### Scenario 4: Fail-Closed Dependency Enforcement
- **Isolated Package Run**: `marketing-measurement` was copied to an isolated directory lacking `product-management/product-evidence` and `product-management/product-investment`.
- **Outcome**:
  - Exit Code: `2`
  - `valid`: `false`
  - Issue: `{ "code": "CAPABILITY_GAP", "message": "Installed dependency capability gap." }`
  - Confirms runtime companions fail closed without silent fallback imports or monorepo leaks.


### Scenario 5: Configuration and Installed Integrity
- Parsed `.skillsrc` and `.skills-lock.json` retain the exact candidate SHA for marketing, the seven selected product-management dependencies and workflows.
- Normal CLI `verify` exited `0`: all **168 tracked files** matched the installed manifest.
- `list-skills --framework marketing` exited `1` because that command accepts programming frameworks only. This diagnostic is **not** a successful marketing lookup and is not counted as one.

### Scenario 6: Normal MCP Lookup of Remotely Installed Skills
- Actual delivery `mcp/dist/index.js` (SHA-256 `55041b26a77e75aced414b4d86a76b8be7b926198fb05a2fe228b5dc51b1ba27`) ran over stdio with `SKILLS_PROJECT_ROOT` pointing to the genuine remote consumer.
- `list_categories` found the installed categories. `get_skill` returned `marketing/marketing-proof` with a body exactly matching its installed `SKILL.md` bytes. `load_skills_for_keywords` discovered that skill for `marketing proof review`.
- The MCP child was closed and disposable consumer directories were cleaned. No evaluator, analytics provider or original host-runtime access was involved.
---

## 4. AC-016 Remote Release Gate Disposition

- **Disposition**: `PASS (PUBLISHED CANDIDATE SHA); VERSION-TAG PUBLICATION SEPARATE`
- **Technical Grounding**:
  1. Live remote GitHub synchronization against the published candidate commit SHA `703f750bc65bf87a764041a26dc12e32eaf0c60a` is proven end-to-end.
  2. Candidate SHA assembly is **not** a formal version tag release (`marketing-v1.0.0`) or signed release manifest attestation.
  3. No native host agent execution or live marketing causal effectiveness/ROI is claimed.
  4. Repository root `.skillsrc` was not modified; configuration belonged only to the disposable consumer.
  5. AC-016's normal synchronization and lookup behavior is verified for this published candidate SHA, with explicit product-management dependencies. Formal version-tag publication and release-manifest attestation remain separate open release actions; this evidence does not establish whole-T12 acceptance, causal efficacy or production approval.
