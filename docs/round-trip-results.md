# Round-Trip CLI Smoke Test Results

Date: 2026-09-28
Commit: cadfc7fc

| Check | Status | Tool | Version | Evidence |
|---|---|---|---|---|
| skills-installer | pass | skills@1.7.0 | - | Discovered all 300 registry skills with no leakage |
| gh-skill | skip | gh | 2.87.0 | gh version 2.87.0 < 2.90.0 (gh skill extension requires >= 2.90.0) |
| codex-mcp | pass | codex | - | agent-skills-standard discovered in codex mcp list |
| opencode-agents | pass | opencode | - | All 21 emitted specialists discovered by opencode |

## How to reproduce

```bash
pnpm harness:smoke
```
