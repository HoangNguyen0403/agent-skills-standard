# Purge Cyber REA Reverse Engineering Skill

> Plan for removing `cyber-rea-reverse-engineering` across core skills, mirrors, documentation, and registry manifests to prevent cloud provider account suspensions and CSP/LLM policy violations.

## Context
Running or distributing automated binary disassembly / reverse-engineering tooling (`reverse-engineer-anything` / REA driver) exposes cloud workloads and accounts to automated AUP/ToS violations on major cloud providers and LLM Trust & Safety filters. The `cyber-rea-reverse-engineering` skill was accidentally included and must be purged cleanly from the registry, mirrors, documentation, and generated indices.

---

### Task 1: Delete skill directories and clean docs/changelog references

**Goal:** Remove the `cyber-rea-reverse-engineering` directory from source and mirrors, and remove references in documentation and changelog.

**Files:**
- Delete directory: `skills/cybersecurity/cyber-rea-reverse-engineering/`
- Delete mirror directory: `.agents/skills/cybersecurity/cyber-rea-reverse-engineering/`
- Delete mirror directory: `.claude/skills/cybersecurity/cyber-rea-reverse-engineering/`
- Delete mirror directory: `.codex/skills/cybersecurity/cyber-rea-reverse-engineering/`
- Delete mirror directory: `.github/skills/cybersecurity/cyber-rea-reverse-engineering/`
- Modify: `docs/mcp-integration-guide.md` (remove REA driver reference)
- Modify: `CHANGELOG.md` (record removal under security/cloud compliance note)

**Verification:**
- `test ! -d skills/cybersecurity/cyber-rea-reverse-engineering`
- `git status` shows deleted skill files and cleanly updated docs.

---

### Task 2: Regenerate registry indices, metadata, and run audit verification

**Goal:** Re-run registry generation scripts to ensure `index.json`, `metadata.json`, `_INDEX.md`, `README.md`, and capability documentation have zero remaining traces of the purged skill, and pass registry audit suites.

**Commands:**
- `pnpm generate-indices`
- `pnpm calculate-tokens`
- `pnpm docs:capabilities`
- `pnpm audit:skills`
- `pnpm test:trace`

**Verification:**
- `git grep -i "cyber-rea-reverse-engineering"` returns 0 matches (or only changelog/plan note).
- `pnpm audit:skills` exits 0.
- `pnpm test:trace` exits 0.
