# Security Policy

## OWASP Agentic Skills Top 10 coverage

This repository tracks its posture against the [OWASP Agentic Skills Top 10 v1.0](https://owasp.org/www-project-agentic-skills-top-10/) (AST), the community security standard for the agent-skill ecosystem. "Status" reflects what actually runs in this repo's CI/CLI today, not aspiration — update this table in the same PR that changes the control it describes.

| AST   | Risk                            | Control in this repo                                                                                                                                                                                                                                              | Status   |
| ----- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| AST01 | Malicious Skills                | SkillSpector CI scan (below) + [`scripts/scan-injection.ts`](../scripts/scan-injection.ts) (description + body + `references/`)                                                                                                                                   | Partial  |
| AST02 | Supply Chain Compromise         | Blob-sha + size-cap verification on every skill/workflow download ([`GithubService.getRawFile`](../cli/src/services/GithubService.ts)); anchored registry-URL parsing; `npm publish --provenance`; gitleaks secret scan; blocking `dependency-review`; Dependabot | Partial  |
| AST03 | Over-Privileged Skills          | `SpecialistTransformer` no longer lets a crafted `description` inject a `tools:`/permission key into emitted agent files                                                                                                                                          | Partial  |
| AST04 | Insecure Metadata               | Anchored frontmatter parsing (no `split('---')`); js-yaml-based safe emission instead of string interpolation; `FrontmatterRule`/`TriggersRule` validation                                                                                                        | Partial  |
| AST05 | Untrusted External Instructions | `scan-injection.ts` body/reference scan (zero-width/bidi chars, imperative HTML comments, base64 blobs, curl\|sh pipelines); trust-review-policy guidance                                                                                                         | Partial  |
| AST06 | Weak Isolation                  | Codex specialists get `sandbox_mode = "read-only"`; PreToolUse hook is advisory-only elsewhere                                                                                                                                                                    | Guidance |
| AST07 | Update Drift                    | MCP server pinned to `MCP_COMPATIBLE_VERSION` by default (no more unversioned `npx -y`); download integrity check aborts a skill if `SKILL.md` fails                                                                                                              | Partial  |
| AST08 | Poor Scanning                   | SkillSpector (static + optional LLM semantic pass) + independent `scan-injection.ts` pattern set + gitleaks; weekly drift-detection cron                                                                                                                          | Partial  |
| AST09 | No Governance                   | [CODEOWNERS](../.github/CODEOWNERS); per-category `owners` in `skills/metadata.json`; `ags audit` skill inventory; `revocations` list checked on every sync                                                                                                       | Partial  |
| AST10 | Cross-Platform Reuse            | `scan-injection.ts --roots` can scan CLI-emitted mirrors (`.claude/`, `.agents/`, `.codex/`, ...); per-platform permission projection not yet implemented                                                                                                         | Planned  |

**What "Partial" means concretely**: each row above is a real, running control — not every sub-case AST describes is covered. Known follow-up work, not yet implemented: a skill-content lockfile with `ags verify`, a declared `risk_tier`/`permissions` frontmatter field enforced at sync time, Sigstore-signed release manifests, and per-category ownership delegation (see [CHANGELOG.md](../CHANGELOG.md) for what has actually landed).

---

## SkillSpector Verified

[![SkillSpector Verified](https://img.shields.io/badge/SkillSpector-Verified-76b900?logo=nvidia&logoColor=white)](https://github.com/HoangNguyen0403/agent-skills-standard/security/code-scanning)

All skills in this repository are automatically scanned by **[NVIDIA SkillSpector](https://github.com/nvidia/skillspector)** — a security scanner purpose-built for AI agent skills. A passing scan is required before any skill category can be published.
This repository is considered **Verified by SkillSpector** whenever the automated scan passes and the dated `skillspector-verified-vYYYYMMDD` tag is created on `main`.

---

## What We Scan For

SkillSpector checks **64 vulnerability patterns across 16 categories**:

| Category                  | Patterns | Key Risks                                                       |
| ------------------------- | -------- | --------------------------------------------------------------- |
| **Prompt Injection**      | 5        | Instruction overrides, hidden directives, behavior manipulation |
| **Data Exfiltration**     | 4        | External transmission, env variable harvesting, context leakage |
| **Privilege Escalation**  | 3        | Excessive permissions, sudo/root, credential access             |
| **Supply Chain**          | 6        | Dependency confusion, malicious updates, version pinning        |
| **Excessive Agency**      | 4        | Unauthorized actions, scope creep, autonomous decision-making   |
| **Output Handling**       | 3        | Unsanitized output, injection via responses                     |
| **System Prompt Leakage** | 3        | Revealing internal instructions                                 |
| **Memory Poisoning**      | 4        | Corrupting agent memory/context                                 |
| **Tool Misuse**           | 5        | Abusing granted tools beyond intent                             |
| **Rogue Agent**           | 4        | Creating sub-agents without authorization                       |
| **Trigger Abuse**         | 3        | Activating on unintended inputs                                 |
| **Dangerous Code (AST)**  | 6        | Static AST analysis of embedded code                            |
| **Taint Tracking**        | 4        | Tracing untrusted data through skill logic                      |
| **YARA Signatures**       | 5        | Known malware pattern matching                                  |
| **MCP Least Privilege**   | 3        | MCP tools requesting excessive permissions                      |
| **MCP Tool Poisoning**    | 2        | Malicious MCP tool descriptions                                 |

---

## Risk Score Threshold

| Score    | Status        | Meaning                                |
| -------- | ------------- | -------------------------------------- |
| 0 – 25   | ✅ **PASS**   | Skills are safe to install             |
| 26 – 50  | ⚠️ **REVIEW** | Moderate risk — manual review required |
| 51 – 100 | ❌ **FAIL**   | High risk — blocked from publishing    |

**Any CRITICAL-severity finding automatically fails the gate**, regardless of the overall score.

---

## Verification Tags

When a scan on the `main` branch successfully passes (triggered by push, schedule, or manual dispatch), the CI pipeline automatically creates a dated Git tag:

```
skillspector-verified-v20260622
```

This tag is created only by the automated pipeline — never manually. The tag is annotated but not GPG-signed. You can verify authenticity by checking that the tagger is `github-actions[bot]` and verifying the associated [GitHub Actions run](https://github.com/HoangNguyen0403/agent-skills-standard/actions/workflows/skillspector-scan.yml).

---

## Running the Scanner Locally

Before submitting a PR that modifies skills, run SkillSpector locally to catch issues early:

### Option A — Docker (recommended, no Python install needed)

```bash
# Clone SkillSpector
git clone https://github.com/NVIDIA/skillspector /tmp/skillspector
docker build -t skillspector /tmp/skillspector

# Scan your skill directory
docker run --rm -v "$PWD:/scan" skillspector scan ./skills/ --no-llm

# Or scan a single skill
docker run --rm -v "$PWD:/scan" skillspector scan ./skills/react/react-hooks/ --no-llm

# Generate a Markdown report
docker run --rm -v "$PWD:/scan" skillspector scan ./skills/ --no-llm --format markdown --output report.md
```

### Option B — Python (uv or pip)

```bash
git clone https://github.com/NVIDIA/skillspector
cd skillspector
uv venv .venv && source .venv/bin/activate
make install

# Scan
skillspector scan /path/to/agent-skills-standard/skills/ --no-llm
```

### Interpreting results

```
Risk Score: 0/100  ← 0 is perfect
Severity: INFO
Findings: 0
```

A score of **0** with no findings means your skill is clean. If you see findings:

1. Read the pattern description — most findings in skill files are `INFO` or `LOW` (false positives from keywords)
2. MEDIUM/HIGH findings in a skill file should be investigated — ensure the instructions don't accidentally look like injection patterns
3. Never include executable code, secret patterns, or external URLs with credentials in a `SKILL.md`

---

## Reporting a Security Vulnerability

If you discover a security issue **in the skills themselves** (e.g., a skill that could instruct an agent to perform malicious actions):

1. **Do not open a public issue.**
2. Report it via [GitHub Private Security Advisories](https://github.com/HoangNguyen0403/agent-skills-standard/security/advisories/new).
3. Include: the skill path, the problematic instruction, and the potential impact.

We aim to respond within **48 hours** and remediate within **7 days** for HIGH/CRITICAL issues.

---

## Governance

[CODEOWNERS](../.github/CODEOWNERS) requires review on: security-guidance skill content, code paths that emit prompts/config into every consumer's machine, and registry integrity records (`skills/metadata.json`, the skill lockfile). Every skill category also has an explicit CODEOWNERS entry so ownership can be delegated per-category later without restructuring the file — today they all resolve to the single maintainer, which is the starting point, not the end state.

Each category in `skills/metadata.json` also carries an `owners` field (GitHub handles) — informational today, mirroring but not replacing CODEOWNERS, which is what GitHub actually enforces.

### Skill inventory

Run `ags audit` in a synced project to print what's installed: every skill's category/id, the ref it was fetched at, and its file count, read from `.skills-lock.json`.

### Revocation process

If a previously-released category/ref combination turns out to be unsafe (e.g. a disclosed vulnerability, an accidentally-shipped secret pattern), a maintainer adds an entry to the top-level `revocations` array in `skills/metadata.json`:

```json
{
  "category": "typescript",
  "refs": ["typescript-v1.3.3"],
  "reason": "short human-readable description",
  "advisory": "https://github.com/HoangNguyen0403/agent-skills-standard/security/advisories/GHSA-xxxx",
  "date": "2026-08-22"
}
```

`ags sync`/`ags update` fetch the registry's live `metadata.json` on every run (already required for version-update checks) and print a warning — pointing at the advisory and suggesting `ags sync --yes` — for any installed category ref that matches a revocation entry. This is advisory only: it does not block sync or delete the affected files, since the consumer may be mid-remediation already.

**SLA**: aim to record a revocation entry within 24 hours of confirming a HIGH/CRITICAL issue in a released version, alongside the private-advisory process above.

---

## CI Pipeline Integration

The security scan is wired into the pipeline as follows:

```
PR touches skills/** (or a transformer/hook/bridge service — see below)
    → skillspector-scan.yml triggered
    → SkillSpector Docker image built (cached, exact-commit key only)
    → Filtered directory created (SKILL.md/_INDEX.md files only)
    → SKILL.md files scanned (64 patterns, --no-llm) — including the 7
      security-guidance skills listed below
    → references/, evals/, scripts/ directories excluded (contain
      educational examples that trigger false positives)
    → SARIF uploaded → GitHub Security tab
    → Score evaluated: pass/fail gate
    → PR comment posted with results

Push to main (scan passes)
    → skillspector-verified-vYYYYMMDD tag created
    → GitHub Release created
```

The scan also re-triggers on changes to the code paths that emit prompts/config into every consumer's machine (`SpecialistTransformer.ts`, `WorkflowTransformer.ts`, `HookService.ts`, `AgentBridgeService.ts`) — a bug there reaches every user the same way a compromised skill body would, even though those files live outside `skills/`.

### Scan Scope

- ✅ **Scanned**: every `SKILL.md` and `_INDEX.md` — including the 7 security-guidance skills below; nothing is skipped based on which skill it is.
- ❌ **Excluded**: `references/`, `evals/`, `scripts/` subdirectories (supporting docs/code with educational examples that are a known false-positive source across the whole registry, not specific to any one skill).

### Security-guidance skills

These skills intentionally contain exploit patterns, penetration-testing examples, and prompt-injection reference material as part of teaching security practices:

- `common-pentest-methodology`, `common-dast-tooling`, `common-exploit-verification`, `common-owasp`, `common-llm-security`, `common-security-audit`, `common-security-standards`

Their `SKILL.md` **is scanned** like every other skill's — only their `references/`/`evals/` false-positive sources are excluded, same as for any other category. They also carry a [CODEOWNERS](../.github/CODEOWNERS) requirement, since a compromised edit here is the highest-value target in the registry. If a scan produces a false positive specifically from `SKILL.md` prose (not `references/`), fix the wording rather than suppressing the finding — a SkillSpector `--baseline` suppression file is a documented follow-up (see the OWASP AST table above, AST01/AST08) but isn't wired into CI yet.

See the [workflow file](../.github/workflows/skillspector-scan.yml) for full implementation details.

---

## Other automated checks

Alongside SkillSpector, this repo runs:

- **[`scripts/scan-injection.ts`](../scripts/scan-injection.ts)** (`pnpm audit:injection`, in `ci.yml`) — regex-based prompt-injection scan. The frontmatter `description` field is always error-level; the SKILL.md body and `references/*.md` are warn-level by default (pass `--strict` to promote to error-level once a corpus cleanup pass has landed), and `--roots` can additionally scan CLI-emitted mirrors.
- **Secret scanning** — a pinned, checksum-verified [gitleaks](https://github.com/gitleaks/gitleaks) CLI run in `ci.yml`.
- **[`dependency-review`](../.github/workflows/dependency-review.yml)** — blocks (`fail-on-severity: high`) PRs into `main`/`develop` that introduce a known-vulnerable dependency.
- **[Dependabot](../.github/dependabot.yml)** — weekly dependency-update PRs for every workspace package plus GitHub Actions.
- **`npm publish --provenance`** — both published npm packages (`agent-skills-standard`, `agent-skills-standard-mcp`) carry a verifiable link back to the GitHub Actions run and source commit that built them.
