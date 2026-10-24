# Category-First Skill Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let existing project maintainers select categories, optionally customize nested skills, and apply the configuration and managed installation in one operation.

**Architecture:** Add a category-first interactive command over a strict registry catalog and a shared selection resolver. Apply through a skills-scoped SyncService lifecycle, retaining ownership, integrity, indexes, and locks rather than invoking the broader interactive sync command. Persist explicit-selection intent so subsequent dependency detection cannot reverse removals.

**Tech Stack:** Existing TypeScript, Commander, Inquirer, js-yaml, Zod, fs-extra, Vitest; no new runtime dependency is planned.

**Spec:** `docs/superpowers/specs/2026-10-24-category-skill-manager-design.md` (read before implementation).

## Global Constraints

- Product flow and technical execution were approved on 2026-10-24. Implementation is complete in the current uncommitted worktree. Parent-observed verification: 68 CLI test files / 1,388 tests passed; lint and Vite build passed; the built CLI completed the offline two-agent PTY walkthrough; scoped final spec and quality/security review approved. TypeScript retains exactly 20 diagnostics established on the baseline with the same dependencies; `tsc` is not green. No commit, merge, release, or deployment is authorized.
- SNC: S=1 N=2 C=2 total=5 tier=high. Independent managed-file/security review is required before merge.
- Existing initialized projects only; category selection is normal, nested skill customization advanced.
- One Apply confirms the proposal, saves `.skillsrc`, and syncs every configured agent. Do not ask the maintainer to run sync separately.
- Existing pins remain unchanged; new categories require validated published releases; explicit upgrades appear in the review. No implicit main fallback for newly added categories.
- Use `skills_mode: auto | explicit` with omitted meaning existing automatic behavior; manager changes save explicit mode. No-op does not change modes.
- Retain existing category-wide versus allowlist intent and imported include expressions; apply qualified exclusions after expansion.
- Cancel/no-op/preparation failure makes no writes, including legacy-config migration. Preserve unrelated values and unknown extension fields on a real save.
- Protect edits, overrides, unowned files, path/symlink restrictions, backups, and prune:false. Report retained content, not a false full-convergence claim.
- Skills-only application preserves workflow/specialist files and lock source records; no MCP/hook/user-home registration or unrelated upgrade prompts.
- Do not introduce a generic rollback engine, third-party registries, package installs, analytics, scripting flags, or website work.
- Prefix shell commands with rtk. Provision dependencies only after execution is authorized; earlier CLI smoke failed because node_modules/tsx were absent.
- Workers load applicable skills, do not delegate, do not commit, and skip broad checks/formatters mid-flight. For TDD, use only the owning task's focused RED/GREEN target; run integrated checks once after integration. Record expected versus infrastructure RED honestly.
- Before changing existing exported signatures, use available LSP references and migrate every caller. New optional fields are not a reason to introduce alternate legacy implementations.

## Review Focus

1. An allowlist selecting zero skills must not broaden into all skills or be treated as a failed download; Task 1 selection and Task 3 pruning tests own it.
2. Imported category/* entries must not reintroduce excluded members or couple unrelated same-named IDs; Task 1 owns final exclusion precedence.
3. Reading a legacy config, filtering a picker, or canceling must not migrate files or drop hidden selections; Tasks 1 and 4 own it.
4. Skill-only sync must not overwrite unrelated lock provenance, run broad old-folder cleanup, register runtimes, or silently accept partial assembly; Task 3 owns it.
5. Retry after a post-save write failure and external config edits must preserve the user's newer state rather than replay stale configuration; Tasks 3 and 4 own it.

## Ownership and dependency graph

The orchestrator owns this plan, final interfaces, integration verification, and release evidence. Task 1 owns configuration/selection semantics; Task 2 owns strict catalog discovery; these can execute in parallel because their file scopes do not overlap. Task 3 depends on both. Task 4 depends on all prior tasks and owns command/docs integration. Each has a separate task review; perform a whole-change review at the end.

No commits are required during planning. At execution, the orchestrator may create task commits only if repository/user commit policy allows; workers leave changes uncommitted.

## File structure

New files below are planned names, not existing files or implemented APIs. Existing files were identified from source investigation.

| Owner | Files | Responsibility |
| --- | --- | --- |
| Task 1 | `cli/src/models/config.ts`, `cli/src/services/ConfigService.ts`, new `CategoryDefaults.ts`, new `SkillSelectionService.ts`, `SkillSyncService.ts`, focused specs | Explicit configuration intent, read-only snapshot/save, shared defaults and selection resolution. |
| Task 2 | `cli/src/services/RegistryService.ts`, new `SkillCatalogService.ts`, focused specs | Strict category/release discovery and ref-correct nested skill catalog. |
| Task 3 | `cli/src/services/SyncService.ts`, new `SkillSelectionApplyService.ts`, install/lock seams only as necessary, lifecycle/apply specs, `cli/src/commands/sync.ts` | Prepared skills-scoped apply, successful-empty pruning, retryable result and preservation of unrelated install records. |
| Task 4 | new `cli/src/commands/skills.ts`, `cli/src/index.ts`, command/integration specs, README/architecture/changelog | Actual interactive flow, registration, final end-to-end proof and user-facing documentation. |

## Task 1: Durable selection and safe configuration persistence

**Requirements:** REQ-2, REQ-5, REQ-6; AC-2/3/4/8/12/15.

**Files:**
- Modify `cli/src/models/config.ts` and `cli/src/services/ConfigService.ts`.
- Create `cli/src/services/CategoryDefaults.ts` and `cli/src/services/SkillSelectionService.ts`.
- Modify `cli/src/services/SkillSyncService.ts` to call the shared resolver rather than retain a second filtering implementation.
- Modify `cli/src/services/__tests__/ConfigService.spec.ts` and `SkillSyncService.spec.ts`.
- Create `cli/src/services/__tests__/SkillSelectionService.spec.ts`.

**Interfaces produced:**
- `SkillConfig.skills_mode?: 'auto' | 'explicit'` (model, Zod, normalization and save).
- Export `ConfigSnapshot { config: SkillConfig; raw: Record<string, unknown>; sourcePath: string; fingerprint: string }` from ConfigService.
- `ConfigService.readSnapshot(cwd?: string): Promise<ConfigSnapshot | null>`: validates/migrates in memory only; no filesystem writes.
- `ConfigService.saveSelection(snapshot: ConfigSnapshot, next: SkillConfig, cwd?: string): Promise<ConfigSnapshot>`: verifies original source/fingerprint, merges only skills + skills_mode into raw values, saves normalized current filename only after Apply, and returns the new snapshot. Fail on conflicting external changes; do not change unrelated raw fields. Preserve extension fields in surviving category records.
- `defaultCategorySelection(category: string, ref: string): CategoryConfig` in CategoryDefaults: foundation allowlist for Product Management, category-wide otherwise. Refactor init config construction to reuse it without changing init's companion-category/exclusion behavior.
- `resolveSkillFolders(category: string, entry: SkillEntry, tree: GitHubTreeItem[]): string[]` in SkillSelectionService: shared local/imported selection, preserving order/deduplication, applying exclusions after expansion with qualified-ID identity.
- `setSkillSelection(category: string, entry: SkillEntry, qualifiedId: string, selected: boolean): SkillEntry`: pure intent update; preserve policy and expressions, remove conflicting excludes when selecting, preserve explicit empty include.

- [ ] **Step 1: Add focused behavioral regressions.** Assert `skills_mode: explicit` prevents re-adding a detected removed category and stripping a detected exclusion, while omitted mode retains existing auto behavior. Verify readSnapshot on legacy YAML does not rename/write; saveSelection retains a root extension object and category extension value, and rejects a changed source fingerprint.
- [ ] **Step 2: Prove selection boundaries.** Assert `resolveSkillFolders('react', {include: []}, tree)` equals `[]`; category-wide toggles retain absent include; allowlist toggles retain only chosen IDs; imported `common/*` plus exclusion `common/common-tdd` omits that member without removing an identically named local skill. Test foundation defaults via resulting selected IDs, not merely a helper mock.
- [ ] **Step 3: Run the focused RED target.** `rtk proxy pnpm --dir cli exec vitest run src/services/__tests__/ConfigService.spec.ts src/services/__tests__/SkillSelectionService.spec.ts src/services/__tests__/SkillSyncService.spec.ts`. New behaviors must fail for the intended missing contract; missing tools are infrastructure failure, not RED.
- [ ] **Step 4: Implement the interfaces.** Keep legacy loadConfig callers compatible; add the read-only snapshot path by sharing parsing/normalization rather than duplicating it. Make reconcileDependencies return unchanged for explicit mode. Extract defaults/resolver, remove superseded filtering code, and preserve package validation/path handling.
- [ ] **Step 5: Run the same focused target to GREEN.** Return changed paths, observable cases passed, and risks. An independent reviewer checks no-op writes, source conflict protection, and imported-ID precedence before integration.

## Task 2: Strict registry catalog and ref-aware discovery

**Requirements:** REQ-1, REQ-3, REQ-6; AC-1/5/6/13.

**Files:**
- Modify `cli/src/services/RegistryService.ts` only for strict ref-aware APIs shared with the new catalog.
- Create `cli/src/services/SkillCatalogService.ts`.
- Create `cli/src/services/__tests__/SkillCatalogService.spec.ts`; reuse the existing GithubService fake transport conventions.

**Interfaces produced (export from SkillCatalogService):**
- `CatalogSkill { id: string; category: string; name: string; description: string }`; id is always qualified category/name.
- `CategoryCatalog { registry: string; categories: string[]; metadata: Partial<RegistryMetadata> }`.
- `ResolvedCategoryRelease { category: string; ref: string; commit: string }`.
- `SkillCatalogService.load(registry: string): Promise<CategoryCatalog>`: strict default-branch tree + metadata; reject transport, malformed or truncated responses rather than return fabricated fallback categories.
- `SkillCatalogService.resolveRelease(catalog: CategoryCatalog, category: string): Promise<ResolvedCategoryRelease>`: validate metadata release tag resolves and contains the category; no new-category main fallback.
- `SkillCatalogService.listSkills(registry: string, category: string, ref: string): Promise<CatalogSkill[]>`: only actual SKILL.md entries at that ref; parse frontmatter using existing schema/parser conventions, reject incomplete authoritative lists. Keep per-run ref-keyed data in memory to avoid repeat downloads during navigation.

- [ ] **Step 1: Add deterministic registry tests.** A fake repository whose default branch is trunk must return its real categories. Distinct v1/v2 fixtures must produce distinct skill lists; non-skill reference folders must not appear. A truncated tree, network failure, missing release ref, and no published category release must fail explicitly, not return a fallback list. A valid empty tree is distinct from a failed fetch.
- [ ] **Step 2: Run RED.** `rtk proxy pnpm --dir cli exec vitest run src/services/__tests__/SkillCatalogService.spec.ts`.
- [ ] **Step 3: Implement strict APIs.** Reuse GithubService for URL/tree/raw/ref access, use the configured repository rather than default public registry assumptions, and do not change read-only list-skills output merely to introduce the manager. Existing loose discovery can remain for its existing callers; the new manager must never use its fallback as authoritative data.
- [ ] **Step 4: Run the same target to GREEN.** Return exact fixtures and results. Independent review checks source/ref correctness and failures-as-empty hazards. This task can run alongside Task 1.

## Task 3: Prepared automatic apply and safe empty-selection cleanup

**Requirements:** REQ-3/4/5/6; AC-5/7/8/9/10/11/13/14/15.

**Files:**
- Create `cli/src/services/SkillSelectionApplyService.ts` and `cli/src/services/__tests__/SkillSelectionApplyService.spec.ts`.
- Modify `cli/src/services/SyncService.ts` and `cli/src/services/__tests__/SyncInstallLifecycle.spec.ts`.
- Modify `cli/src/commands/sync.ts` only to carry successful-category evidence after assembly; preserve its standalone interaction.
- Modify install/lock classes only when the scoped source-preservation contract cannot be achieved in SyncService. Do not duplicate OwnershipWriter.

**Interfaces consumed:** Task 1 ConfigSnapshot/saveSelection and Task 2 release/catalog results. Existing `SkillAssemblyError`, `CollectedSkill`, `InstallPlan`, and SyncService lifecycle.

**Interfaces produced (export from SkillSelectionApplyService):**
- `PreparedSkillChange { snapshot: ConfigSnapshot; config: SkillConfig; skills: CollectedSkill[]; completedCategories: string[]; resolvedRefs: ResolvedRefs }`.
- `SkillApplyResult = { status: 'complete'; snapshot: ConfigSnapshot; plan: InstallPlan } | { status: 'incomplete'; stage: 'saving' | 'installing'; saved: boolean; snapshot: ConfigSnapshot; message: string }`.
- `SkillSelectionApplyService.prepare(snapshot: ConfigSnapshot, proposed: SkillConfig): Promise<PreparedSkillChange>`: validates refs/selection and fully assembles packages without writes; throws on preflight failure. Ref/commit context remains associated with the prepared operation.
- `SkillSelectionApplyService.apply(prepared: PreparedSkillChange): Promise<SkillApplyResult>`: saveSelection, then skills-only installation, indexes and lock finalization. No reconciliation, update confirmation, MCP or hook phase. A complete result can still contain retained files; CLI must report them.
- Extend SyncService lifecycle with `scope?: 'all' | 'skills'` (default all) and `completedSkillCategories?: string[]` in the completion input. Begin-install context must retain prior lock sources for scoped preservation. Carry exact signatures through all callers after LSP reference inspection.

- [ ] **Step 1: Add real-filesystem apply tests.** Use a temp project, two configured agents, fake remote transport, real ownership/index/lock code. Seed a skill and a workflow/specialist source record; apply one addition and one removal and assert exact new contents/obsolete path absence in both agents, index membership, and lock source preservation. Do not mock the installer and merely assert it was called.
- [ ] **Step 2: Cover intentional empty versus failed assembly.** An explicit empty include after previously installing one member must prune its unchanged package and stale index entry. Package/manifest/tree failure must leave config bytes, installed content and lock unchanged. Preserve edited/overridden/unowned files; prune:false must retain content and appear in result/reporting, not be called complete deletion.
- [ ] **Step 3: Cover failure/retry boundaries.** Inject a write failure after desired config save; assert incomplete stage/installing and saved=true. A fresh preparation from the saved snapshot must retry successfully. Modify the config externally between preparation and save; assert conflict without overwriting it. Preserve unrelated configuration/source records even when all skills are removed.
- [ ] **Step 4: Run RED.** `rtk proxy pnpm --dir cli exec vitest run src/services/__tests__/SkillSelectionApplyService.spec.ts src/services/__tests__/SyncInstallLifecycle.spec.ts`.
- [ ] **Step 5: Implement prepared scoped installation.** Reuse SkillAssemblyError (already present; do not reinvent partial-result acceptance). Resolve selected sources at explicit commits for fetching while persisting human-readable refs and correct commit provenance. Do not fetch or rewrite unrelated workflow/specialist pins in this scope. Assemble all selected packages before configuration/install writes. Pass explicit successful-empty categories to finalization; never infer success from package count. Preserve unrelated manifest entries and source records. Avoid broad cleanupOldFolders in the skills-only path; generate indexes from desired selection so retained excluded content is not advertised as enabled. Keep all existing writer safety checks.
- [ ] **Step 6: Update ordinary sync integration narrowly.** After successful assembleSkills, pass its requested categories as completed evidence so empty-selection pruning is correct. Leave automatic versus explicit reconciliation controlled by Task 1. Do not make standalone SyncCommand catch/exit behavior a separate refactor.
- [ ] **Step 7: Run the same focused target to GREEN.** Return failure-stage evidence and the actual inventory outcomes. Independent review must specifically inspect locks, filesystem boundaries, source commits, and zero/failure distinction.

## Task 4: Category-first CLI, advanced customization, and integrated delivery

**Requirements:** REQ-1 through REQ-6; AC-1 through AC-16.

**Files:**
- Create `cli/src/commands/skills.ts` and `cli/src/commands/__tests__/SkillsCommand.spec.ts`.
- Register command in `cli/src/index.ts` alongside list-skills (existing discovery remains useful; it is not an obsolete alias).
- Update `cli/README.md`, `README.md`, `cli/ARCHITECTURE.md`, `ARCHITECTURE.md`, and `CHANGELOG.md` for the additive command and explicit selection contract. Do not regenerate skill mirrors or indices in this repository.

**Interfaces consumed:** Tasks 1-3; no new registry/config interpretation in the command.

**Interface produced:** `SkillsCommand.run(): Promise<void>` with injectable ConfigService, SkillCatalogService, and SkillSelectionApplyService in the constructor, following existing command test conventions. The command sets a nonzero exit status for terminal failure without terminating the test process. Interactive state remains command-local; no new persistent session database.

- [ ] **Step 1: Add observable command scenarios.** Drive Inquirer answers while running real config/selection/apply behavior against temp files and fake transport: category selection without advanced prompts; optional nested changes; search/navigation retaining hidden selections; current unavailable category remaining checked; Product Management defaults; explicit release-upgrade summary; cancel/no-op preserving original bytes; non-TTY exit with no writes. Assert resulting files/selection/error outcome, not prompt-call counts or copied strings.
- [ ] **Step 2: Cover Retry through the command.** Inject one installer failure after save, choose Retry, and assert eventual two-agent convergence with no external sync command. A config conflict must return to reload/review; terminal refusal to retry exits nonzero and retains honest saved/incomplete state. Never let a cancel/no-op implicitly replay an incomplete apply.
- [ ] **Step 3: Run RED.** `rtk proxy pnpm --dir cli exec vitest run src/commands/__tests__/SkillsCommand.spec.ts`.
- [ ] **Step 4: Implement the interaction.** Category list is the default. Advanced action opens the nested catalog at its effective current ref, supports searching names/descriptions and selecting the published category release, and changes only draft intent. Diff/review displays resolved refs, removals and protection/prune consequences. Prepare before saving; one final Apply triggers save/install. Skip unrelated consent and generic update prompts. Use typed results for complete versus incomplete; surface retained-file caveats, not blanket success.
- [ ] **Step 5: Run GREEN and update user docs.** Explain normal and advanced flows, automatic sync, category defaults, explicit-mode compatibility, pin preservation, protected files/prune:false, and retry/failure state. Changelog evidence states checks actually run, not planned outcomes.
- [ ] **Step 6: Orchestrator runs integrated checks once.** From repository root: `rtk proxy pnpm --dir cli exec vitest run src/services/__tests__/ConfigService.spec.ts src/services/__tests__/SkillSelectionService.spec.ts src/services/__tests__/SkillCatalogService.spec.ts src/services/__tests__/SkillSyncService.spec.ts src/services/__tests__/SyncInstallLifecycle.spec.ts src/services/__tests__/SkillSelectionApplyService.spec.ts src/commands/__tests__/SyncCommand.spec.ts src/commands/__tests__/SkillsCommand.spec.ts`; then `rtk proxy pnpm --dir cli lint:check` and `rtk proxy pnpm --dir cli build`. Do not install dependencies or claim these pass during planning.
- [ ] **Step 7: Smoke the actual CLI surface.** In an isolated temporary initialized project with two configured agents and a controlled transport/registry fixture, launch the built CLI in a PTY, select a category, remove another, customize one nested exclusion, and Apply once. Verify resulting actual files, indexes, saved refs/mode, and lock inventory, then reopen the manager and observe persisted state. If fake transport requires a temporary preload harness, use a throwaway fixture driver against the built command; remove it after evidence capture. No real GitHub mutation, user-home configuration, or repository skill regeneration. Record any remaining visual/driver limit instead of calling tests a PTY walkthrough.
- [ ] **Step 8: Independent final review and handoff.** Verify all ACs, especially later ordinary sync honoring opt-outs, no migrations before Apply, managed-path protections, and unrelated lock provenance. Fix findings through component owners, then report observed checks and remaining risks. Do not publish or merge automatically.

## Requirement trace and readiness

| Requirement | Task owners | Verification |
| --- | --- | --- |
| REQ-1 | 2, 4 | Catalog fixtures + command navigation/reopen. |
| REQ-2 | 1, 4 | Selection boundary tests + nested command flow. |
| REQ-3 | 2, 3, 4 | Ref fixtures + prepared commit provenance + review/apply results. |
| REQ-4 | 3, 4 | Real two-agent filesystem integration + built CLI walkthrough. |
| REQ-5 | 1, 3, 4 | Later-sync opt-out regression + empty/protected pruning + unrelated preservation. |
| REQ-6 | 1, 2, 3, 4 | No-write snapshots/cancel/failures, conflict and Retry transitions, non-TTY. |

Engineering owner: orchestrator with bounded task workers. Acceptance owner: requester. Independent reviewer: eligible non-implementing analysis/review agent; no premium escalation is authorized. Tasks 1/2 are M, Task 3 L, Task 4 M (relative sizes, medium confidence); these are not calendar or cost commitments.

- Implementation status: complete in the current uncommitted worktree. Stage-specific integrated verification and review are recorded in the local SDD evidence receipt; the observed TypeScript baseline diagnostics remain unresolved and are not represented as a green check.
- Historical planning checkpoint: the builder check found no planning gaps, and no code or runtime scenario had run at that point. That statement describes the planning stage only; it is superseded for current implementation status by the later verification receipt.
