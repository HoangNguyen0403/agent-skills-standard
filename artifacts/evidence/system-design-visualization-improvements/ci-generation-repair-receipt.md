# CI generation repair receipt — PR298 / run 42212640377

Status: APPLIED + machine-verified by the coordinator. Generation `--check` NOT RUN here (parent-owned, post-freeze).

## Defect

CI `validate-skills` failed at `node --import tsx scripts/generation/index.ts --check`:

```
Prepared generator outputs are stale; differing generated outputs lack trusted ownership or explicit base proof:
skills/README.md, skills/database/_INDEX.md, skills/index.json, skills/metadata.json.
```

Cause: feature commit `e493837d8` edited canonical skill bodies/keywords/descriptions
(`skills/common/common-architecture-diagramming`, `system-design-*`, `database/database-query-performance`)
without republishing generated derivatives. No `.skills-lock.json` existed, so the four
config-independent repository-generation outputs were unowned and check-mode refused
(HEAD-blob equality shortcut applies only to CLI-managed paths).

## Authorization and mechanism

- Bounded coordinator apply only; no source logic, feature contract, CI, or guard changes.
- Command (supported mechanism, adopt mode):

```
rtk pnpm generate-indices --adopt-base 52671cf9ed6a1c376dfaaae7e621dbc51a4c8765
```

- Base = reviewed pre-feature release commit `52671cf9ed6a1c376dfaaae7e621dbc51a4c8765` (ancestor of HEAD `e493837d8`).
- Preconditions verified before run, independent of the tool's own gates:
  - all four differing outputs byte-identical between base and HEAD
    (`git diff --stat <base> HEAD -- <4 paths>` empty);
  - `.skillsrc` byte- and index-identical to base (`git diff` empty), so adopt-mode
    config equality rather than recover-mode differential applied;
  - no `.skills-lock.json` in the tree; it is `.gitignore`d (`/.skills-lock.json`).
- Proof produced by the coordinator, not asserted by this receipt:
  108 adopted paths, each `currentWorktreeSha256 == baseBlobSha256` and reproduced by the
  pinned-base producer (`git archive <base>` + real `calculate-tokens` → `generate-indices`
  → `generate-capabilities-doc` phases). Adoption not used as a byte override: publication
  bytes come only from the current-config producer run.

Result line: `✅ Isolated generation completed successfully. Copied back: 125 files`.

## Evidence (preserved, actual paths)

- Attempt receipt: `artifacts/generation-logs/attempt-2026-11-06T12-01-27-401Z-236abd/receipt.json`
  (`status: APPLIED`, `copiedBackFiles: 125`, `verifiedFiles: 125`, `declaredFiles: 2246`, `retiredFiles: 0`, `preservedOrphans: 0`)
- Run log: `artifacts/generation-logs/attempt-2026-11-06T12-01-27-401Z-236abd/generation.log`
  - `Snapshot captured for 2246 declared targets across 4 configured host(s).`
  - `Seeded 16 absent mirror resources in stage from canonical input.`
  - `Canonical and host parity checks passed.`
  - `Pinned-base producer outputs reconstructed and verified for 108 paths at 52671cf9e...`
  - `Published & verified:` per-file lines for all 125 outputs, including the four canonical indices last.
- Adoption proof: `artifacts/generation-logs/attempt-2026-11-06T12-01-27-401Z-236abd/adoption/proof.json`
  (`base`, `producer: "git archive + real generator phases"`, per-path `sha256`/`baseSha256` pairs)
- Before-bytes snapshots: `.../adoption/before/`, `.../publication-before/`
- Ownership ledger written last: `.skills-lock.json` (38340 bytes, gitignored, not committed)
- Full changed-path enumeration: see "Changed paths" below.

## Changed paths (124, generated derivatives only)

All paths obtained from `git status --porcelain`, excluding 7 unrelated `scripts/`
files owned by the parent formatter worker and 14 pre-existing `.playwright-cli/` evidence files.

- `skills/index.json`, `skills/metadata.json`, `skills/README.md`, `skills/database/_INDEX.md`
  (the four check-mode offenders; metadata `token_metrics` only, two-space JSON + final newline preserved)
- 4 hosts × `skills/common/common-architecture-diagramming` and `system-design` mirrors:
  - 104 modified mirrors under `.agents/`, `.claude/`, `.codex/`, `.github/`
  - 16 newly created mirrors (4 hosts × `references/offline-export.md`, `scripts/text_layout.py`,
    `scripts/export_html.py`, `scripts/test_export_html.py`) — absent in destination, seeded in stage from canonical input
- Untouched (verified by empty diff): `AGENTS.md`, `server/AGENTS.md`, `docs/agent-capabilities.md`,
  `README.md`, `cli/README.md`, all canonical `skills/**/SKILL.md` sources.

Diff character: index/README/`_INDEX` rows are the feature's `database-query-performance`
description and keyword propagation; `skills/index.json` description strings match the edited
canonical frontmatter; metadata deltas are `common` 49281→49341 tokens / 1071→1073 avg,
`system-design` 16813→17005 / 1293→1308 (largest `system-design-review` 1935→2010),
`database` 3914→4269 / 489→534.

Independent spot-parity check (canonical vs each host mirror for `SKILL.md`,
`references/offline-export.md`, `scripts/text_layout.py`, `assets/fixtures/erd.drawio`): 16/16 identical.

## Digests (sha256)

| path | before (== base `52671cf9`) | after |
| --- | --- | --- |
| `skills/index.json` | `ab41ccc56d41b6d7d70fd866bf0a44ba56aacd6994225ebf3ca840136e19c930` | `fe753ecdad7d6aaa16d015792b255a8e9ba30d6f08d0f8103079f6deab8fd44c` |
| `skills/metadata.json` | `5ff7335a5d414943176a22466006be2ab659de357329bf87ec143c3aab20e3d7` | `e1c6ee91dea5797479ee57713072232f549b65282a0803b0fb62700d4a4de2f3` |
| `skills/README.md` | `48366fa4da7a1aea5693245b067cdc60b97e5c64697cc539f7eb34cfaadeb6c6` | `a534925f13da6c61fd04c9ebade1b8725072c1d5819d5c260f67adeae417e64a` |
| `skills/database/_INDEX.md` | `b6d51f76f12b3e3b1ea1b0357c840de3209da96e6a429f5c49345e3a8ded6615` | `d23ed4474cf9d856687be33c17fa8ae14dc1a32660e78ec203102d17e350e06f` |

## Residual risks / open items

1. `--check` and full/native suites NOT RUN by this worker (parent-owned post-freeze). No claim of green CI.
2. Adopt mode does not run recover-mode's runtime config differential. Mitigated by
   `.skillsrc` byte/index equality with the base recorded here and by the pinned-base producer proof;
   this is weaker evidence than `--recover-provenance` and is stated, not hidden.
3. `.skills-lock.json` is new local untracked-but-gitignored state. CI has no lock, so CI
   check re-derives ownership the same way it did before; it does not inherit this run's adoption proof.
4. Node runtime here is local v26.0.0 (parent-owned install). CI native Node 22 already passed
   other suites; generation result is byte-deterministic output, not runtime-version dependent,
   but this run's runtime is recorded as v26.0.0 only.
5. Government of the four outputs now rests on committed bytes matching the current producer;
   any future hand-edit will again fail closed — intended.
