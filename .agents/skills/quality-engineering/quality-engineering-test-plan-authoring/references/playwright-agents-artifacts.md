# Playwright Test Agents — Artifact Conventions

Playwright ships an official Plan/Generate/Heal agent trio, initialised with:

```bash
npx playwright init-agents --loop=claude
# also supports: --loop=vscode | --loop=codex | --loop=opencode
```

This creates `specs/` (Markdown test plans) and `tests/seed.spec.ts` (a
bootstrap test with pre-configured page context). This skill's
`docs/srs/test-plan-[slug].md` format is compatible with that `specs/`
convention — when a target repo has Playwright agents initialised, mirror the
plan into `specs/[slug].md` as well, so the vendor generator/healer agents
remain usable directly by a developer working locally.
