# JRN-CONSUMER-01 — Local Consumer Install, Discovery and Doctor

**Surfaces**: production `SyncService`, `ConfigService`, `LockfileService`,
`WorkflowTransformer` (`cli/src`), `WorkflowIndex` (`mcp/src`), and repo CLI
`cli/src/index.ts doctor --offline --json`
**Recipe**: `recipes/consumer-sync.json`
**Criteria**: `AC-01`–`AC-14`, `VER-001`–`VER-007` (referenced, not restated)

## Consumed inputs

`cli/src/index.ts`, `commands/doctor.ts`, `services/{DoctorService,SyncService,
LockfileService,ConfigService}.ts`, `services/utils/WorkflowTransformer.ts`,
`constants/{index,enums}.ts`, `capabilities/agentCapabilities.ts`,
`models/{config,types}.ts`, `mcp/src/services/WorkflowIndex.ts`, root `LICENSE`,
`skills/common/common-project-verification/{SKILL.md,references/*.md}`,
`.agents/workflows/{implementation-readiness,verify-work}.md`,
`recipes/consumer-sync.json`.

## Drive sequence (one uniquely created temp consumer)

1. Write `.skillsrc` via production `ConfigService.saveConfig`.
2. Seed an unrelated sentinel file and hash it.
3. Read candidate skill bytes from the working tree: `SKILL.md`,
   `references|scripts|assets/**`, and any package-local `LICENSE`/`NOTICE*`; also collect
   root `LICENSE`/`NOTICE*` files, unless the package already contains the same basename.
   This mirrors `SkillSyncService`'s collector without invoking it. Record each collected
   root attribution file's source SHA-256; derive expected install and lock paths from the
   collected files, not a fixed count.
4. `SyncService.beginInstall` → `writeSkills` → `writeWorkflows` → `completeInstall`.
5. Observe the returned `InstallPlan` and the real on-disk result.

## Oracles (all computed from observations)

- **Install plan**: `plan.added` contains every expected resource path (packaged skill
  files for both agents, the shared canonical workflow bodies, and the transformer
  outputs), with no unexpected additions and no `unknown`/`pruned`/`kept` side effects.
  This asserts concrete resources and ownership effects, not a length.
- **Installed bytes**: every packaged file is byte-identical under both agent trees.
- **Lockfile**: version 2, registry, `sources` refs equal the candidate ref, entry set is
  exactly the expected paths, each entry digest equals the on-disk `sha256`, and each
  entry carries `owner` (`skill` for skill trees, `workflow` for workflow trees),
  `source`, and `agent`.
- **Workflow catalog**: canonical body digest matches the lock catalog, no native
  conflicts, and each agent binding's path/output digest/match equals the
  `WorkflowTransformer` output written to disk.
- **MCP discovery**: `WorkflowIndex.listInstalledWorkflows` lists exactly the installed
  workflows; each `lookupWorkflow` returns `status=managed`, `nativeParity=true`, and the
  canonical digest.
- **Sentinel**: the unrelated consumer file digest is unchanged after install cycles.
- **CLI doctor**: exit 0, payload kind `doctor.report`, schema 1, `healthy=true`, and
  `config`/`lockfile`/`agents`/`legacy_folders` = `ok` with `cli_version` = `skip`
  (offline). Raw stdout/stderr and exit code are persisted.
- **Doctor read-only**: a full consumer-tree digest snapshot before and after the doctor
  run must be identical.

## Limits

- No registry or network acquisition; candidate bytes come from this working tree.
- Local canonical discovery is not evidence of native/provider invocation or agent
  behaviour.
- The doctor ran offline, so the network-backed `cli_version` check was skipped by design.
