# Security Policy

## SkillSpector Verified

[![SkillSpector Verified](https://img.shields.io/badge/SkillSpector-Verified-76b900?logo=nvidia&logoColor=white)](https://github.com/HoangNguyen0403/agent-skills-standard/security/code-scanning)

All skills in this repository are automatically scanned by **[NVIDIA SkillSpector](https://github.com/nvidia/skillspector)** — a security scanner purpose-built for AI agent skills. A passing scan is required before any skill category can be published.

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

This tag is created only by the automated pipeline — never manually. You can verify authenticity by checking that the tagger is `github-actions[bot]` and verifying the associated [GitHub Actions run](https://github.com/HoangNguyen0403/agent-skills-standard/actions/workflows/skillspector-scan.yml).

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

## CI Pipeline Integration

The security scan is wired into the pipeline as follows:

```
PR touches skills/**
    → skillspector-scan.yml triggered
    → SkillSpector Docker image built (cached)
    → Security documentation skills temporarily excluded
    → ./skills/ scanned (64 patterns, --no-llm)
    → SARIF uploaded → GitHub Security tab
    → Score evaluated: pass/fail gate
    → PR comment posted with results

Push to main (scan passes)
    → skillspector-verified-vYYYYMMDD tag created
    → GitHub Release created
```

### Excluded Skills

The following skills are **excluded from automated scanning** because they contain educational security content and penetration testing examples (XSS payloads, code injection examples, etc.):

- `common-pentest-methodology` — Penetration testing methodology and exploit examples
- `common-dast-tooling` — Dynamic application security testing tools and usage
- `common-exploit-verification` — Exploit verification techniques
- `common-owasp` — OWASP Top 10 vulnerabilities with examples
- `common-llm-security` — LLM security patterns (contains prompt injection examples)
- `common-security-audit` — Security audit methodology (contains vulnerability patterns)
- `common-security-standards` — Security standards documentation (contains vulnerability remediation examples)

These skills are **safe** — they teach security testing practices and contain documented examples of vulnerabilities for educational purposes. They are excluded to prevent false positives in the automated scan.

See the [workflow file](../.github/workflows/skillspector-scan.yml) for full implementation details.
