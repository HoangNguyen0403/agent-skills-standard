# Category-First Skill Manager Design

Date: 2026-10-24
Slug: category-skill-manager
Profile: technical; lane: direction
SNC: S=1 N=2 C=2 total=5 tier=high (managed-file/configuration integrity).

## Approval and ownership

The requester approved the category-first interaction, advanced nested customization, automatic version resolution, and one Apply action that saves and syncs. Their “Yes please continue” authorized documenting and planning this direction. The requester subsequently approved this plan and subagent-driven execution on 2026-10-24. Product flow approval: approved(requester, 2026-10-24). Technical decisions: approved with plan review (requester, 2026-10-24). Implementation status: complete in the current uncommitted worktree. Parent-observed integrated verification and scoped final-review outcomes are recorded separately; TypeScript retains exactly 20 baseline diagnostics and is not green. No commit, merge, release, or deployment is authorized. Activation status: not_required.

Product/acceptance owner: requester. Engineering/integration owner: orchestrating maintainer; bounded implementation workers own assigned components. QA owner: integration owner with an independent reviewer. Release approval remains with the maintainer. No named outside team or delivery commitment is assumed.

This document is the requirements and technical-design source for the linked implementation plan; the approved conversation supplies the brief. Do not create duplicate editable BRD/PRD/SRS records for the same requirements.

## Objective and users

OBJ-1: An existing project maintainer can add or remove supported guidance without remembering category release tags or editing YAML, and without separately running sync.

Normal maintainer story: As a project maintainer, I want to select categories and apply once, so that every configured agent receives the updated guidance.

Advanced maintainer story: As a maintainer with a tailored setup, I want to customize nested skills without losing my pins or overrides, so that the installed guidance reflects my explicit choices.

Success scenario: starting with an initialized project, add one category, remove another, optionally exclude one nested skill, confirm once, and observe the desired managed installation on every configured agent. This is a behavioral acceptance target, not a measured usability improvement. No conversion, latency, or adoption measurements have been collected.

## Scope inventory

All in-scope leaves reference the requirements below.

- Manage skills
  - Browse categories: in_scope, REQ-1.
  - Customize nested skills: in_scope, REQ-2.
  - Resolve category releases: in_scope, REQ-3.
  - Review and apply selections: in_scope, REQ-4.
  - Preserve user intent and files: in_scope, REQ-5.
  - Recover incomplete application: in_scope, REQ-6.
- Initialize a project: excluded; use existing init if no configuration exists.
- Select workflows or specialists: excluded from this manager; preserve their configuration and installations.
- Add third-party registries, install prerequisite packages, or grant MCP/hook consent: excluded.
- Build a website manager, add telemetry, or create a general transaction/rollback engine: excluded.

## Product requirements

All requirements are P0, owned by Engineering with requester acceptance, and proposed for implementation against the approved flow. Each traces to OBJ-1.

| ID | Required outcome |
| --- | --- |
| REQ-1 | `ags skills` opens a category-first manager using the configured registry, with existing category selections checked. Search and navigation retain selections, including configured categories not currently discoverable. |
| REQ-2 | Nested customization is optional. Category defaults remain defaults, not an implicit request for every optional skill. Preserve existing allowlist versus category-wide semantics and exclusions. |
| REQ-3 | Existing category refs stay unchanged. Newly enabled categories resolve to an available published release without requiring a typed ID/tag. A skill only available at a newer category release requires visible approval of that upgrade. |
| REQ-4 | One Apply confirmation validates the proposal, saves it, and synchronizes skill installations and managed indexes for all configured agents. No separate sync command or unrelated upgrade/consent prompts. |
| REQ-5 | Explicit removals remain effective during later ordinary sync. Unchanged obsolete managed files are removed under existing pruning policy; edited, overridden, or unowned files remain protected and clearly reported. Other configuration and installed workflows/specialists remain intact. |
| REQ-6 | Cancel/no-op performs no writes. Catalog/preflight failures are not interpreted as empty selections. Incomplete application is reported truthfully and offers an in-command Retry; successful completion requires installation finalization, not only configuration persistence. |

## Interaction

1. Read configuration without triggering migration writes. If missing, explain that init is required and exit without creating a project.
2. Load the registry category catalog. Show configured categories even if missing from current metadata; mark unavailable ones without silently unchecking them.
3. Present category selection. Category labels summarize customization, for example “React — 2 excluded.” Detection may recommend a category but must not act as selected/installed state.
4. Offer optional Customize skills for an enabled category. Load that category at its configured ref; enable skill-name/description search within that category. Keep selections outside the current search intact. New-category defaults use the same policy as init, including the two Product Management foundation skills. A global search over every remote skill body is not required.
5. Review additions, removals, customizations, any explicit category upgrade, and protected/prune-disabled consequences. Confirm Apply changes once. An upgrade displayed in this summary is approved by this confirmation, not by another generic sync update prompt.
6. Validate and prefetch selected skill packages, then save desired configuration and run the ownership-aware installation. Refresh managed skill indexes/router across configured agents. Do not invoke `sync --yes`, which has broader update semantics.
7. Show applied changes, retained edited/overridden files, and any remaining installation mismatch. Retry is offered only after a failure; normal successful operation has no additional prompt.

Keyboard operation uses existing Inquirer conventions. Returning from nested customization does not apply changes. Ctrl-C/Escape/cancel before Apply must not migrate or save configuration. Non-TTY invocation fails with a concise interactive-terminal requirement before any writes; scripting flags are outside this scope.

## Canonical selection and configuration rules

Engineering decision D1: add optional root `skills_mode: auto | explicit`; omitted means existing automatic reconciliation. The manager saves `explicit` on a real applied selection change. In explicit mode, absent categories remain absent and existing include/exclude choices are authoritative. Detection supplies recommendations only. Ordinary sync skips skill reconciliation for this mode, but retains its existing workflow handling. Existing projects that never use the manager retain automatic behavior. No per-category tombstone map is necessary.

D2: retain `skills.<category>.ref/include/exclude` as the category-owned selection representation. Share the folder-selection resolver between sync and the manager rather than implementing a second interpretation.

| Existing policy | Advanced action | Persisted intent |
| --- | --- | --- |
| Category-wide (no include) | Uncheck nested skill | Add exact exclusion; retain category-wide policy. |
| Explicit include list | Uncheck included skill | Remove it from include; never broaden to all skills. |
| Explicit include list | Check optional skill | Add it to include and remove its conflicting exclusion. |
| Any | Remove category | Remove its skills entry; explicit mode prevents re-detection from recreating it. |
| Any | Select zero nested skills | Retain an explicit empty include list; successful-empty assembly is eligible for safe cleanup. |
| Any | Cancel or unchanged choices | Preserve original bytes, path, and legacy filename; do not set skills_mode. |

Imported cross-category includes remain associated with their declaring category/ref. Preserve include expressions such as category/*; show qualified imported members in customization. Qualified exclusions must be applied after expansion so a user can disable an imported member without it being reintroduced. Excluding a local ID must not accidentally exclude a different category's identically named skill. No per-skill version field or implicit dependency installation is introduced.

D3: share category-default construction with init. Product Management starts with product-business-requirements and product-requirements; do not auto-select optional product skills or associated workflows. Show known prerequisite information where available, without claiming to have installed runtime capabilities.

D4: snapshot loading retains raw parsed configuration alongside the validated model. Persist only selected category/ref/filter changes plus skills_mode, merging into raw configuration so unrelated and extension fields survive. Existing legacy normalization is available in memory, but file migration/removal occurs only after Apply. YAML comments/formatting need not survive a real save; unknown field values must. Reject conflicting external changes to the source configuration before saving rather than overwriting them.

## Catalog and release rules

D5: category discovery uses the configured repository's reported default branch and real metadata, not fallback Flutter/Dart lists. A missing/failed/truncated tree is a failure, not an authoritative empty catalog. Discover selectable skills only from real SKILL.md entries.

Existing category customization reads its current ref. New categories use the metadata release tag, resolve it successfully, and verify the category exists there. Do not silently fall back to main. Without a published release, explain the missing prerequisite and keep the draft unchanged; existing manually pinned branch/SHA configurations remain usable. A configured ref with no value has legacy effective main semantics and is not silently upgraded.

If advanced users request newer optional skills, explicitly choose the published release in the category's advanced action; reflect its full category effect in the final review. Resolve and hold the prepared source commits/packages through Apply so review and installation do not silently fetch different content. Reuse existing integrity/manifest verification; do not bypass revoked-ref or package validation already enforced by the installer.

## Apply lifecycle and safety

D6: add a skill-selection application service, reusing SyncService's assembly, ownership writer, index generation, and lock finalization. Do not call the interactive SyncCommand as a subprocess or duplicate agent export logic. This manager syncs skills and skill-related indexes/bridges only; it preserves existing workflow/specialist entries and their source records, and does not register MCP, hooks, or write user-home runtime configuration.

States: editing -> reviewing -> preparing -> saving -> installing -> complete. Cancel/no-op exits from editing/reviewing. Preparation failure returns to the draft with no configuration/install mutation. Failure after save produces incomplete, with the saved desired state retained and clear stage information; Retry revalidates the configuration and reattempts the same desired selection. If configuration changed externally, return to reload/review rather than overwriting it.

Preflight must complete assembly for every requested category before the first managed installation write or configuration save. Current SkillAssemblyError already rejects partial skill assembly; retain and reuse it. Successful empty categories require explicit completion evidence rather than inference from nonempty packages. Failed assembly must never authorize pruning.

D7: completeInstall receives explicit successful category completion and an install scope. Skills-only application cannot prune or rewrite unrelated workflow/specialist entries or replace their lock provenance. Existing ordinary full-sync callers retain current behavior except the deliberately-empty-category cleanup correction. Keep existing ownership hashes, symlink/path protections, backups, custom overrides, and prune:false policy.

No promise of all-files atomic rollback is made. If a post-save filesystem failure leaves partial installation, report it, keep recovery information, and offer Retry. If protected files or prune:false prevent convergence, report “applied with retained files” and list the mismatch rather than claiming that all old content was deleted. A semantic no-op does not implicitly retry an earlier incomplete run; recovery is an explicit Retry action.

## Acceptance criteria

Platform: CLI only; no feature flag, market variant, web/mobile surface, new analytics, or external API.

| ID / requirement | Given | When | Then |
| --- | --- | --- | --- |
| AC-1 / REQ-1 | Initialized project with configured and unconfigured categories | Open manager and search/navigate | Existing choices stay checked and hidden choices are retained. |
| AC-2 / REQ-2 | New Product Management category | Select category without customization | Only its shared foundation defaults are enabled. |
| AC-3 / REQ-2 | Category-wide entry with existing exclusions | Disable one more local or imported nested member | Exact exclusions apply without converting the category-wide policy into a snapshot. |
| AC-4 / REQ-2 | Explicit allowlist, including an empty list | Toggle nested members | Only chosen skills are installed; empty means none, not all. |
| AC-5 / REQ-3 | Existing pinned category and new released category | Apply selection change | Existing pin stays and new category uses its validated release. |
| AC-6 / REQ-3 | Skill unavailable at the current pin | Choose a newer category release | The full ref change is shown for approval before save. |
| AC-7 / REQ-4 | Two configured agents and one real add/remove proposal | Confirm Apply once | Both installations, indexes, and lock inventory reflect the proposal without a separate sync command. |
| AC-8 / REQ-5 | Explicitly removed detected category or excluded detected skill | Run subsequent ordinary sync | Detection does not restore it. |
| AC-9 / REQ-5 | Last selected skill is unchanged and managed | Apply an empty selection | Its obsolete files are pruned and no stale index member remains. |
| AC-10 / REQ-5 | Edited, overridden, unowned files or prune:false | Apply removal | Protected files remain and retained content is reported. |
| AC-11 / REQ-5 | Existing workflow/specialist installations and extension configuration | Apply skill changes | Unrelated config values, installed files, and source records remain intact. |
| AC-12 / REQ-6 | Legacy or current config | Cancel or confirm no semantic change | Original config bytes/path and installation remain unchanged. |
| AC-13 / REQ-6 | Catalog, ref, package, or manifest failure | Prepare Apply | No configuration or installation changes occur and no false success/empty selection is reported. |
| AC-14 / REQ-6 | Filesystem failure after desired config save | Observe failure and choose Retry | Stage/state is truthful and retry can converge without leaving the manager. |
| AC-15 / REQ-6 | Config externally changed since opening | Apply or Retry | Conflicting config is not overwritten; reload/review is required. |
| AC-16 / REQ-6 | Non-TTY invocation | Run ags skills | Command exits nonzero without writes. |

## Evidence ledger

Confirmed from source, not executed behavior:

- cli/src/commands/list-skills.ts:31-98: current discovery prints dependency status and recommends manual exclude editing.
- cli/src/services/RegistryService.ts:22-128: fallback discovery and hardcoded main skill listing are not adequate for a strict manager catalog.
- cli/src/services/ConfigService.ts:30-65,277-423,438-527,568-678: current schema, normalization/load writes, defaults, and reconciliation.
- cli/src/models/config.ts:6-18,49-72: category refs/filter model and top-level settings.
- cli/src/services/SkillSyncService.ts:13-102,317-418: strict partial-assembly rejection exists; include expansion follows local exclusion filtering.
- cli/src/services/SyncService.ts:148-265: ownership lifecycle, fetched-category pruning gate, and source record construction.
- cli/src/services/install/OwnershipWriter.ts:120-156: edited orphans retained, unchanged owned files backed up/pruned.
- cli/src/commands/sync.ts:53-207: ordinary sync includes reconciliation and optional version updates, unsuitable as a blind sync --yes call.

The initial `rtk proxy pnpm --dir cli dev --help` smoke failed because local node_modules/tsx were absent. Later, the parent-observed actual built-CLI offline PTY walkthrough passed with 17 fixture requests across Claude and Cursor, covering category add/remove, nested exclusion, one Apply, reopen, and cancel without writes. Usability benefits remain assumptions pending separate user research.

## Verification, release, and handoff

Acceptance was exercised with deterministic temporary-project tests using a fake GitHub transport and real ownership/index/lock paths. Parent-observed integrated CLI suite: 68 files, 1,388 tests passed; lint and Vite production build passed. The actual built CLI completed an offline PTY walkthrough against the controlled fixture: 17 requests across Claude and Cursor, covering category add/remove, nested exclusion, one Apply, reopen, and cancel without writes. TypeScript retains exactly 20 baseline diagnostics with the same dependencies and is not green. A separate local SDD verification receipt records the run stages and review evidence. No generators were run.

Independent task review and final managed-file/security review are required before merge. Additive command/schema release; no forced migration before a real Apply. Update CLI/root README, CLI architecture, root architecture if contracts change, and CHANGELOG with observed verification only. No publication or deployment is authorized.

Next: implementation verification is recorded, and the scoped final spec and quality/security review approved. The work remains uncommitted; any commit, merge, release, or publication requires separate maintainer authorization.

## Planning review receipt

Independent builder check completed by Personal · Analysis & Review (openai-codex/gpt-6.1-sol, medium), agent 29dd5008-ec19-4315-910c-0277c83a8a2f. Result: “Nothing important left”; no further product decision was identified. This is a document buildability check, not code/security review, implementation approval, or runtime verification.
