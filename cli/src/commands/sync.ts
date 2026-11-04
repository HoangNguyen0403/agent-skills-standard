import inquirer from 'inquirer';
import pc from 'picocolors';
import { Agent } from '../constants';
import { McpScope, SkillConfig } from '../models/config';
import { ConfigValidationError, ConfigService } from '../services/ConfigService';
import type { ConfigSnapshot } from '../services/ConfigService';
import { DetectionService } from '../services/DetectionService';
import {
  McpConfigService,
  defaultMcpConfig,
} from '../services/McpConfigService';
import { CLAUDE_MCP_PERMISSION, HookService } from '../services/HookService';
import { SyncService } from '../services/SyncService';
import type { AttributionPlan } from '../services/SyncService';
import type { AttributionComparison } from '../services/AttributionService';
import { GithubRequestError, IntegrityError } from '../services/GithubService';
import type { GithubRequestErrorProjection } from '../services/GithubService';
import { InstallPlan } from '../services/install/OwnershipWriter';

export interface SyncOptions {
  yes?: boolean;
  snippets?: boolean;
  dryRun?: boolean;
  force?: string[];
  verbose?: boolean;
  json?: boolean;
  /**
   * Explicit consent to publish the computed attribution changes. Ordinary
   * `--yes` accepts version prompts only and never authorizes this.
   */
  acceptAttributionChanges?: boolean;
}

export type SyncFailureCode =
  | 'rate-limited'
  | 'access-denied'
  | 'attribution-consent-required'
  | 'config-invalid'
  | 'integrity'
  | 'sync-failed';

/** Safe, structured failure outcome. Never carries tokens, headers, or causes. */
export interface SyncFailure {
  code: SyncFailureCode;
  message: string;
  hint?: string;
  github?: GithubRequestErrorProjection;
  details?: Record<string, unknown>;
}

export type SyncOutcome =
  | { status: 'success'; plan: InstallPlan }
  | { status: 'dry-run'; plan: InstallPlan }
  | { status: 'cancelled'; failure: SyncFailure }
  | { status: 'failure'; failure: SyncFailure };

/** A classified command failure; `cancelled` marks a declined required consent. */
class SyncFailureError extends Error {
  constructor(
    readonly failure: SyncFailure,
    readonly cancelled = false,
  ) {
    super(failure.message);
    this.name = 'SyncFailureError';
  }
}

/**
 * Command for synchronizing skills and workflows from the remote registry to the local workspace.
 *
 * Publication order is preflight-first: configuration and pins are reconciled
 * in memory, every selected source is resolved and acquired, and the
 * attribution plan is computed before any managed file, lock entry, or saved
 * ref is written. A preflight failure therefore preserves the installed bytes,
 * the lock, and the saved refs.
 */
export class SyncCommand {
  private configService: ConfigService;
  private detectionService: DetectionService;
  private syncService: SyncService;
  private mcpService: McpConfigService;
  private hookService: HookService;

  constructor(
    configService?: ConfigService,
    detectionService?: DetectionService,
    syncService?: SyncService,
    mcpService?: McpConfigService,
    hookService?: HookService,
  ) {
    this.configService = configService || new ConfigService();
    this.detectionService = detectionService || new DetectionService();
    this.syncService = syncService || new SyncService();
    this.mcpService = mcpService || new McpConfigService();
    this.hookService = hookService || new HookService();
  }

  /**
   * Executes the synchronization flow and returns a discriminated outcome.
   * The CLI boundary owns `process.exitCode`; services never exit the process.
   */
  async run(options: SyncOptions = {}): Promise<SyncOutcome> {
    const restoreOutput = options.json
      ? this.redirectProgressToStderr()
      : () => {};
    try {
      return await this.execute(options);
    } catch (error) {
      const failure = this.classify(error);
      const cancelled = error instanceof SyncFailureError && error.cancelled;
      this.reportFailure(failure, options, cancelled);
      return cancelled
        ? { status: 'cancelled', failure }
        : { status: 'failure', failure };
    } finally {
      restoreOutput();
    }
  }

  private async execute(options: SyncOptions): Promise<SyncOutcome> {
    // Read-only snapshot: the configuration parser must not publish a
    // migration before the preflight gates below.
    const snapshot = await this.configService.readSnapshot();
    if (!snapshot) {
      throw new SyncFailureError({
        code: 'config-invalid',
        message: '❌ Error: .skillsrc not found. Run `init` first.',
      });
    }
    // The snapshot must stay immutable: the publisher diffs the reviewed
    // configuration against `snapshot.config` to decide which known root fields
    // changed. Mutating that baseline in place would make accepted pins, refs
    // and MCP consent look unchanged and silently drop them from the file.
    const config = structuredClone(snapshot.config);
    let configChanged = false;

    // 1. Reconcile dependencies in memory only.
    const projectDeps = await this.detectionService.getProjectDeps();
    const skillsChanged = await this.syncService.reconcileConfig(
      config,
      projectDeps,
    );
    const workflowsChanged =
      await this.syncService.reconcileWorkflows(config);
    configChanged = skillsChanged || workflowsChanged;

    // 2. Resolve the final identities for every selected source.
    const resolvedRefs = await this.syncService.resolvePins(config);

    const pinEntries = Object.entries(resolvedRefs.newPins);
    if (pinEntries.length > 0) {
      const pinnedList = [
        resolvedRefs.newPins.workflows_ref,
        resolvedRefs.newPins.specialists_ref,
      ]
        .filter(Boolean)
        .join(', ');

      if (!options.dryRun) {
        if (resolvedRefs.newPins.workflows_ref) {
          config.workflows_ref = resolvedRefs.newPins.workflows_ref;
        }
        if (resolvedRefs.newPins.specialists_ref) {
          config.specialists_ref = resolvedRefs.newPins.specialists_ref;
        }
        configChanged = true;
        console.log(pc.green(`📌 Pinned ${pinnedList} in .skillsrc`));
      } else {
        console.log(
          pc.gray(`  (dry-run) would pin ${pinnedList} in .skillsrc`),
        );
      }
    }

    for (const warning of resolvedRefs.warnings) {
      console.log(pc.yellow(warning));
    }

    // 3. Offer only comparable, strictly newer releases.
    const updates = await this.syncService.checkForUpdates(config);
    let refsChanged = false;

    if (updates && Object.keys(updates).length > 0) {
      if (options.dryRun) {
        if (!options.json) {
          for (const [cat, ref] of Object.entries(updates)) {
            console.log(pc.gray(`  (dry-run) would offer: ${cat} -> ${ref}`));
          }
        }
      } else {
        console.log(pc.yellow('\n🚀 New skill versions detected:'));
        for (const [cat, ref] of Object.entries(updates)) {
          const currentRef =
            cat === 'workflows'
              ? config.workflows_ref
              : cat === 'specialists'
                ? config.specialists_ref
                : config.skills[cat]?.ref;
          console.log(pc.gray(`  - ${cat}: ${currentRef} -> ${ref}`));
        }

        let update = options.yes;
        if (update === undefined) {
          if (options.json || !process.stdin.isTTY) {
            console.log(
              pc.cyan(
                'ℹ️  Non-interactive environment detected. Skipping version updates. Use --yes to auto-confirm.',
              ),
            );
            update = false;
          } else {
            const answer = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'update',
                message: 'Do you want to update .skillsrc with these versions?',
                default: true,
              },
            ]);
            update = answer.update;
          }
        }

        if (update) {
          for (const [cat, ref] of Object.entries(updates)) {
            if (cat === 'workflows') {
              config.workflows_ref = ref;
              refsChanged = true;
            } else if (cat === 'specialists') {
              config.specialists_ref = ref;
              refsChanged = true;
            } else if (config.skills[cat]) {
              config.skills[cat].ref = ref;
              refsChanged = true;
            }
          }
          configChanged = true;
          console.log(pc.green('✅ .skillsrc updated.'));
        } else {
          console.log(
            pc.cyan('ℹ️  Skipping version updates, staying on pinned refs.'),
          );
        }
      }
    }

    // Accepted version changes move the config off the refs and release
    // manifests pinned above. Assembly and lock provenance must describe the
    // refs actually downloaded, so re-resolve before installation: otherwise
    // the previous release manifests reject the new bytes as tampered.
    if (refsChanged) {
      await this.syncService.resolvePins(config);
    }

    if (!options.json) {
      console.log(pc.cyan(`🚀 Syncing skills from ${config.registry}...`));
    }

    // 4. Read-only ownership state, then acquire everything before publishing.
    await this.syncService.beginInstall(config, {
      dryRun: Boolean(options.dryRun),
      force: options.force ?? [],
    });

    const enabledCategories = Object.keys(config.skills);
    const skillCategories = enabledCategories.filter(
      (category) => category !== 'specialists',
    );
    const skills = await this.syncService.assembleSkills(
      skillCategories,
      config,
    );

    const workflowAcquisition =
      await this.syncService.acquireWorkflows(config);
    if (workflowAcquisition.status === 'incomplete') {
      throw new SyncFailureError({
        code: 'sync-failed',
        message:
          'Workflow acquisition incomplete; existing files, lock and saved refs were preserved.',
        details: { workflowFailures: workflowAcquisition.failures },
      });
    }
    const workflows = workflowAcquisition.workflows;

    const specialistAcquisition =
      await this.syncService.acquireSpecialists(config);
    if (specialistAcquisition.status === 'incomplete') {
      throw new SyncFailureError({
        code: 'sync-failed',
        message:
          'Specialist acquisition incomplete; existing files, lock and saved refs were preserved.',
        details: { specialistFailures: specialistAcquisition.failures },
      });
    }

    // A latched throttle must never be reported as a successful acquisition,
    // even if every selected package happened to be served by the cache.
    const latched = this.syncService.rateLimitFailure;
    if (latched) throw latched;

    // 5. Attribution plan/consent gate (no writes yet).
    let attribution: AttributionComparison | null = null;
    let attributionRequiresConsent = false;
    if (!options.dryRun) {
      const plan = await this.syncService.planAttribution(skills, config);
      attribution = plan.comparison;
      attributionRequiresConsent =
        plan.comparison.requiresConsent || plan.installedOnly.length > 0;
      this.printAttributionPreview(plan);
      await this.ensureAttributionConsent(plan, options);
    }

    // 6. Configuration publication is the first write of the run. It is a
    // compare-and-swap against the snapshot read at preflight, so a stale
    // `.skillsrc` is refused before any managed file changes. An unchanged
    // configuration performs the same identity check read-only.
    let publishedSnapshot = snapshot;
    if (!options.dryRun) {
      publishedSnapshot = configChanged
        ? await this.configService.saveReviewedConfig(snapshot, config)
        : await this.assertSnapshotUnchanged(snapshot);
    }

    // 7. Publish managed files through the existing ownership writer.
    await this.syncService.writeSkills(skills, config);
    await this.syncService.writeWorkflows(workflows, config);
    const specialistsOk = await this.syncService.writeSpecialists(
      specialistAcquisition,
      config,
    );

    // Finalize ownership before refreshing indices so pruned members do not
    // remain in the generated category indexes or router.
    const plan = await this.syncService.completeInstall(config, {
      skills,
      workflows,
      specialistsOk,
      refreshIndices: true,
      completedSkillCategories: skillCategories,
      workflowAcquisition,
    });

    if (options.dryRun) {
      if (options.json) {
        this.writeJson({
          schema_version: 1,
          kind: 'sync.plan',
          data: plan,
        });
      } else {
        console.log(pc.cyan('🔍 Dry run — no files written'));
        this.printPlanCounts(plan);
        if (options.verbose) {
          this.printVerbosePlan(plan);
        }
        console.log(
          pc.gray(
            '  (dry-run) skipped: MCP registration, hooks, capability notes',
          ),
        );
      }
      return { status: 'dry-run', plan };
    }

    this.printSummary(plan);

    await this.syncService.discloseCapabilities(config);
    console.log(pc.green('✅ All skills synced successfully!'));

    // 7. MCP integration (consent-respecting — see McpConfigService).
    await this.runMcpPhase(config, options, publishedSnapshot);

    // 8. Hook installation — always runs; idempotent.
    await this.runHookPhase(config, options);
    // Emitted last so a post-publication failure still produces exactly one
    // failure envelope instead of a success followed by an error.
    if (options.json) {
      this.writeJson({
        schema_version: 1,
        kind: 'sync.result',
        data: {
          status: 'success',
          added: plan.added.length,
          updated: plan.updated.length,
          unchanged: plan.unchanged.length,
          kept: plan.kept.length,
          unknown: plan.unknown.length,
          pruned: plan.pruned.length,
          keptOrphans: plan.keptOrphans.length,
          attribution: attribution
            ? {
                required: attributionRequiresConsent,
                changes: attribution.packages.filter(
                  (change) => change.requiresConsent,
                ).length,
              }
            : null,
        },
      });
    }

    return { status: 'success', plan };
  }

  /**
   * Confirms the configuration on disk is still the snapshot read at preflight
   * without writing anything. Runs immediately before the first managed write.
   */
  private async assertSnapshotUnchanged(
    snapshot: ConfigSnapshot,
  ): Promise<ConfigSnapshot> {
    const current = await this.configService.readSnapshot();
    if (
      !current ||
      current.sourcePath !== snapshot.sourcePath ||
      current.fingerprint !== snapshot.fingerprint
    ) {
      throw new SyncFailureError({
        code: 'config-invalid',
        message:
          '❌ .skillsrc changed after preflight; nothing was published. Re-run `ags sync`.',
      });
    }
    return snapshot;
  }

  /**
   * In JSON mode stdout carries exactly one envelope. Every progress line,
   * including service-level logging, is redirected to stderr for the run.
   */
  private redirectProgressToStderr(): () => void {
    const originalLog = console.log;
    const originalInfo = console.info;
    console.log = (...args: unknown[]) => console.error(...args);
    console.info = (...args: unknown[]) => console.error(...args);
    return () => {
      console.log = originalLog;
      console.info = originalInfo;
    };
  }

  private writeJson(value: unknown): void {
    process.stdout.write(`${JSON.stringify(value)}\n`);
  }

  /** Maps a thrown value to a stable, caller-visible failure contract. */
  private classify(error: unknown): SyncFailure {
    if (error instanceof SyncFailureError) return error.failure;

    const latched = this.syncService.rateLimitFailure;
    if (latched) return this.githubError(latched);

    if (error instanceof GithubRequestError) {
      return this.githubError(error);
    }
    if (error instanceof ConfigValidationError) {
      return {
        code: 'config-invalid',
        message: `❌ Invalid .skillsrc: ${error.message}`,
        details: {
          configPath: error.configPath,
          logicalPath: error.logicalPath,
        },
      };
    }
    if (error instanceof IntegrityError) {
      return { code: 'integrity', message: error.message };
    }
    if (error instanceof Error) {
      return { code: 'sync-failed', message: error.message };
    }
    return { code: 'sync-failed', message: String(error) };
  }

  private githubError(error: GithubRequestError): SyncFailure {
    const auth = error.authenticated
      ? 'a GitHub token was sent'
      : 'no GitHub token was sent';
    const code: SyncFailureCode =
      error.kind === 'rate-limited' || error.kind === 'access-denied'
        ? error.kind
        : error.kind === 'integrity'
          ? 'integrity'
          : 'sync-failed';

    let hint: string;
    if (error.kind === 'rate-limited') {
      const timing = error.resetAt
        ? ` It resets at ${error.resetAt}.`
        : error.retryAfterSeconds !== undefined
          ? ` Retry after ${error.retryAfterSeconds}s.`
          : '';
      hint = `GitHub ${error.rateLimitKind ?? 'primary'} rate limit reached; no further requests were scheduled.${timing} ${auth}; set GITHUB_TOKEN for a higher limit.`;
    } else if (error.kind === 'access-denied') {
      hint = `GitHub denied access to ${error.endpoint}. ${auth}; verify repository access or set GITHUB_TOKEN.`;
    } else if (error.kind === 'integrity') {
      hint =
        'A downloaded source failed integrity verification; nothing was published.';
    } else {
      hint = `GitHub request failed at ${error.endpoint}. ${auth}; retry when the network or the reference is available.`;
    }

    return {
      code,
      message: error.message,
      hint,
      github: error.toJSON(),
    };
  }

  private reportFailure(
    failure: SyncFailure,
    options: SyncOptions,
    cancelled: boolean,
  ): void {
    if (options.json) {
      this.writeJson({
        schema_version: 1,
        kind: 'sync.error',
        data: {
          code: failure.code,
          message: failure.message,
          ...(failure.hint ? { hint: failure.hint } : {}),
          ...(failure.github ? { github: failure.github } : {}),
          ...(failure.details ? { details: failure.details } : {}),
          ...(cancelled ? { cancelled: true } : {}),
        },
      });
      return;
    }

    console.error(pc.red('❌ Sync failed:'), failure.message);
    if (failure.hint) console.error(pc.yellow(`   ${failure.hint}`));
    const acquisitionFailures =
      failure.details?.workflowFailures ?? failure.details?.specialistFailures;
    if (Array.isArray(acquisitionFailures)) {
      for (const item of acquisitionFailures as Array<{
        path?: unknown;
        reason?: unknown;
      }>) {
        console.error(pc.red(`   ❌ ${String(item.path)} — ${String(item.reason)}`));
      }
    }
  }

  /**
   * Discloses a first installation and previews every transition with both
   * origins, the installed digest, explicitly unknown old origins, and
   * installed-only attribution files that no candidate/catalog record covers.
   */
  private printAttributionPreview(plan: AttributionPlan): void {
    const { comparison, installed, installedOnly } = plan;

    if (comparison.firstInstall && installedOnly.length === 0) {
      for (const record of comparison.disclosures) {
        const files = record.files
          .map(
            (file) =>
              `${file.name} (${file.basis}, ${file.resolvedCommit.slice(0, 12)})`,
          )
          .join(', ');
        console.error(
          pc.gray(
            `  ℹ️  First install — attribution disclosed from ${record.registry}@${record.requestedRef}: ${files}`,
          ),
        );
      }
      return;
    }

    const relevant = comparison.packages.filter(
      (change) =>
        change.status !== 'unchanged' ||
        change.requiresConsent ||
        change.files.some((file) => file.previous === null),
    );
    if (relevant.length === 0 && installedOnly.length === 0) return;

    console.error(pc.yellow('\n⚠️  Attribution changes require consent:'));
    for (const change of relevant) {
      console.error(
        pc.yellow(`  ${change.status} ${change.packageId} (${change.reason})`),
      );
      for (const file of change.files.slice(0, 12)) {
        const installedNow = installed[change.packageId]?.[file.name] ?? [];
        const installedDigest =
          installedNow.find((binding) => binding.sha256 !== null)?.sha256 ??
          null;
        console.error(pc.gray(`    ${file.status} ${file.name}`));
        console.error(
          pc.gray(
            `      old: ${this.describeAttributionOrigin(
              file.previous,
              file.previousSha256 ?? installedDigest,
              'old',
            )}`,
          ),
        );
        console.error(
          pc.gray(
            `      new: ${this.describeAttributionOrigin(file.planned, file.plannedSha256, 'new')}`,
          ),
        );
        console.error(
          pc.gray(
            `      installed: ${
              installedNow.length === 0
                ? 'not recorded'
                : installedNow
                    .map(
                      (binding) =>
                        `${binding.agent}:${binding.path} sha256=${
                          binding.sha256
                            ? binding.sha256.slice(0, 12)
                            : 'unreadable'
                        }`,
                    )
                    .join('; ')
            }`,
          ),
        );
      }
      if (change.files.length > 12) {
        console.error(pc.gray(`    … +${change.files.length - 12} more files`));
      }
    }

    for (const variant of installedOnly.slice(0, 12)) {
      console.error(
        pc.yellow(
          `  installed-only ${variant.name} @ ${variant.path} (${variant.agent}): origin unknown, installed sha256 ${variant.sha256 ? variant.sha256.slice(0, 12) : 'unreadable'}`,
        ),
      );
    }
    if (installedOnly.length > 12) {
      console.error(
        pc.gray(`  … +${installedOnly.length - 12} more installed-only files`),
      );
    }
  }

  private describeAttributionOrigin(
    record: { sourcePath: string; requestedRef: string; resolvedCommit: string; basis: string; sha256: string } | null,
    digest: string | null,
    kind: 'old' | 'new',
  ): string {
    if (record) {
      return `${record.sourcePath}@${record.requestedRef}/${record.resolvedCommit.slice(0, 12)} basis=${record.basis} sha256=${record.sha256.slice(0, 12)}`;
    }
    if (digest) {
      return `unknown origin (qualified record unavailable) sha256=${digest.slice(0, 12)}`;
    }
    return kind === 'new' ? 'not shipped by the selected source' : 'none';
  }

  /**
   * Requires separate attribution consent for any computed transition or any
   * installed attribution file that cannot be qualified. Ordinary `--yes` is
   * not consent; a non-interactive run without the flag fails preflight, and an
   * interactive decline cancels the run, both before any publication.
   */
  private async ensureAttributionConsent(
    plan: AttributionPlan,
    options: SyncOptions,
  ): Promise<void> {
    const { comparison, installed, installedOnly } = plan;
    const requiresConsent =
      comparison.requiresConsent || installedOnly.length > 0;
    if (!requiresConsent) return;

    const details = {
      legacyUnqualified: comparison.legacyUnqualified,
      installedOnly: installedOnly.map((variant) => ({
        packageId: variant.packageId,
        name: variant.name,
        agent: variant.agent,
        path: variant.path,
        sha256: variant.sha256,
      })),
      packages: comparison.packages
        .filter(
          (change) =>
            change.requiresConsent ||
            installedOnly.some(
              (variant) => variant.packageId === change.packageId,
            ),
        )
        .map((change) => ({
          packageId: change.packageId,
          status: change.status,
          reason: change.reason,
          files: change.files.map((file) => ({
            name: file.name,
            status: file.status,
            previousSha256: file.previousSha256,
            plannedSha256: file.plannedSha256,
            previous: file.previous
              ? {
                  sourcePath: file.previous.sourcePath,
                  sourceKind: file.previous.sourceKind,
                  requestedRef: file.previous.requestedRef,
                  resolvedCommit: file.previous.resolvedCommit,
                  blobSha1: file.previous.blobSha1,
                  basis: file.previous.basis,
                  sha256: file.previous.sha256,
                }
              : null,
            planned: file.planned
              ? {
                  sourcePath: file.planned.sourcePath,
                  sourceKind: file.planned.sourceKind,
                  requestedRef: file.planned.requestedRef,
                  resolvedCommit: file.planned.resolvedCommit,
                  blobSha1: file.planned.blobSha1,
                  basis: file.planned.basis,
                  sha256: file.planned.sha256,
                }
              : null,
            installed: (installed[change.packageId]?.[file.name] ?? []).map(
              (binding) => ({
                agent: binding.agent,
                path: binding.path,
                sha256: binding.sha256,
              }),
            ),
          })),
        })),
    };

    if (options.acceptAttributionChanges) return;

    const message =
      'Attribution changes require explicit consent; re-run with --accept-attribution-changes (ordinary --yes does not authorize attribution changes).';

    if (options.json || !process.stdin.isTTY) {
      throw new SyncFailureError({
        code: 'attribution-consent-required',
        message,
        hint: 'Review the preview above, then re-run with --accept-attribution-changes.',
        details,
      });
    }

    await this.promptAttributionConsent(details);
  }

  private async promptAttributionConsent(
    details: Record<string, unknown>,
  ): Promise<void> {
    const answer = await inquirer.prompt<{ accept: boolean }>([
      {
        type: 'confirm',
        name: 'accept',
        message: 'Apply these attribution changes to the installed files?',
        default: false,
      },
    ]);
    if (answer.accept) return;
    throw new SyncFailureError(
      {
        code: 'attribution-consent-required',
        message: 'Attribution changes were declined; nothing was published.',
        details,
      },
      true,
    );
  }

  /**
   * Phase 7 — MCP integration. Three paths:
   *   A. Never prompted yet: ask once now (with full value-prop), persist decision.
   *   B. Already prompted, mcp.enabled=true: dispatch install at the configured scope.
   *   C. Already prompted, mcp.enabled=false: skip silently.
   *
   * In non-interactive mode (no TTY) and never-prompted: skip with a hint, do
   * not assume consent. Users can opt in later via `ags mcp enable`.
   */
  private async runMcpPhase(
    config: SkillConfig,
    options: { yes?: boolean; snippets?: boolean; json?: boolean },
    snapshot: ConfigSnapshot,
  ): Promise<void> {
    const mcp = config.mcp ? { ...config.mcp } : defaultMcpConfig();
    const agents = config.agents ?? [];

    const snippetOnlyOverride =
      options.snippets === true && (!mcp.enabled || mcp.scope === 'disabled');
    if (snippetOnlyOverride) {
      mcp.enabled = true;
      mcp.scope = 'snippets-only';
      mcp.snippets = true;
    } else if (options.snippets !== undefined) {
      mcp.snippets = options.snippets;
    }

    if (
      !snippetOnlyOverride &&
      (!mcp.prompted || (!mcp.enabled && mcp.prompted))
    ) {
      if ((options.json || !process.stdin.isTTY) && !options.yes) {
        if (!mcp.prompted) {
          console.log(
            pc.gray(
              '\nℹ️  MCP integration not yet configured. Run `ags mcp enable` (or `ags mcp scope project`) when ready.',
            ),
          );
        }
        return;
      }

      // If already prompted but disabled, we ask again if they want to enable it now.
      // This ensures they aren't "stuck" in a disabled state just because they said no once.
      // Pass true for wasDisabled only if it was already prompted AND it is currently disabled.
      const decided = await this.promptMcpConsent(
        options,
        mcp.prompted && !mcp.enabled,
      );
      // Publish the consent decision on top of the snapshot this run already
      // persisted, so unknown root/category/MCP extension fields survive. The
      // reviewed config is cloned so the retained snapshot stays an immutable
      // baseline for the publisher's change detection.
      const reviewed = structuredClone(config);
      reviewed.mcp = {
        enabled: decided.enabled,
        scope: decided.enabled ? decided.scope : 'disabled',
        prompted: true,
      };
      config.mcp = reviewed.mcp;
      await this.configService.saveReviewedConfig(snapshot, reviewed);
    }

    const finalMcp = config.mcp ? { ...config.mcp } : defaultMcpConfig();
    if (snippetOnlyOverride) {
      finalMcp.enabled = true;
      finalMcp.scope = 'snippets-only';
      finalMcp.snippets = true;
    } else if (options.snippets !== undefined) {
      finalMcp.snippets = options.snippets;
    }

    if (!finalMcp.enabled || finalMcp.scope === 'disabled') {
      return;
    }

    const userScopePrompt = options.yes
      ? async () => true
      : async (agent: Agent, file: string): Promise<boolean> => {
          if (options.json || !process.stdin.isTTY) {
            // No explicit authorization and no interactive terminal: never
            // write user-scope configs, and never block on a prompt.
            console.log(
              pc.gray(
                `  ℹ️  Skipping user-scope MCP config for ${agent} (${file}); re-run interactively or with --yes to authorize.`,
              ),
            );
            return false;
          }
          const { ok } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'ok',
              message: `Write user-scope MCP config for ${pc.cyan(agent)} at ${pc.gray(file)}?`,
              default: false,
            },
          ]);
          return ok;
        };

    console.log(pc.cyan('\n🔌 Wiring MCP server...'));
    const report = await this.mcpService.install({
      rootDir: process.cwd(),
      agents,
      mcp: finalMcp,
      userScopePrompt,
    });

    for (const w of report.projectWrites) {
      const tag =
        w.action === 'added'
          ? pc.green('  + added   ')
          : w.action === 'updated'
            ? pc.cyan('  ~ updated ')
            : pc.gray('  = up-to-date');
      console.log(`${tag} ${w.agent.padEnd(12)} ${pc.gray(w.file)}`);
    }
    for (const w of report.userWrites) {
      console.log(
        `  ${pc.green('+ wrote   ')} ${w.agent.padEnd(12)} ${pc.gray(w.file)}`,
      );
    }
    for (const d of report.declined) {
      console.log(
        `  ${pc.gray('-         ')} ${d.agent.padEnd(12)} ${pc.gray(d.file)} (declined)`,
      );
    }
    if (report.snippets.length > 0) {
      console.log(
        pc.gray(
          `  ${report.snippets.length} snippet(s) written to ./mcp-config-snippets/`,
        ),
      );
    }
    if (report.unsupported.length > 0) {
      console.log(
        pc.gray(
          `  (skipped — no MCP support yet: ${report.unsupported.join(', ')})`,
        ),
      );
    }
  }

  private async promptMcpConsent(
    options: {
      yes?: boolean;
    },
    wasDisabled = false,
  ): Promise<{ enabled: boolean; scope: McpScope }> {
    if (options.yes) {
      // Conservative default for --yes: opt in at project scope (the recommended choice).
      return { enabled: true, scope: 'project' };
    }
    console.log(pc.bold('\n🔌 MCP server setup\n'));
    if (wasDisabled) {
      console.log(
        pc.yellow(
          'MCP integration is currently disabled. Would you like to enable it now?',
        ),
      );
    }
    console.log(
      'agent-skills-standard ships an optional MCP server that serves your skills',
    );
    console.log('to AI agents at runtime. Quick comparison:\n');
    console.log(
      pc.bold('  WITHOUT MCP:') +
        ' sub-agents skip skill loading; no audit trail',
    );
    console.log(
      pc.bold('  WITH MCP:   ') +
        ' every sub-agent can call load_skills_for_files; auditable\n',
    );

    const decision = await inquirer.prompt<{
      enabled: boolean;
      scope: McpScope;
    }>([
      {
        type: 'confirm',
        name: 'enabled',
        message: 'Enable MCP server integration?',
        default: true,
      },
      {
        type: 'rawlist',
        name: 'scope',
        message: 'Where should sync write MCP configs?',
        when: (a) => a.enabled === true,
        choices: [
          {
            name: 'project (recommended)  — only files inside this project',
            value: 'project',
          },
          {
            name: 'user                    — also $HOME files (sync prompts each)',
            value: 'user',
          },
          {
            name: 'snippets-only           — never edits any runtime config',
            value: 'snippets-only',
          },
        ],
        default: 'project',
      },
    ]);
    return decision;
  }

  /**
   * Phase 8 — Hook installation.
   * Idempotent: registers the Claude PreToolUse entry and keeps managed hook
   * files up to date. Claude's script is preserved if already customized; Kiro's
   * markdown hook is kept in sync with the embedded template.
   */
  private async runHookPhase(
    config: SkillConfig,
    options: { yes?: boolean; json?: boolean } = {},
  ): Promise<void> {
    const agents = config.agents ?? [];
    if (agents.length === 0) return;

    const mcp = config.mcp ?? defaultMcpConfig();
    if (!mcp.enabled || mcp.scope === 'disabled') {
      await this.hookService.uninstall({ rootDir: process.cwd(), agents });
      return;
    }

    const promptPermission = options.yes
      ? async () => true
      : async (agent: Agent): Promise<boolean> => {
          if (options.json || !process.stdin.isTTY) {
            console.log(
              pc.gray(
                `\nℹ️  Skipping MCP permission grant for ${agent} (non-interactive; use --yes to auto-confirm).`,
              ),
            );
            return false;
          }
          const { ok } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'ok',
              message: `Allow ${pc.cyan(agent)} to auto-run the agent-skills-standard MCP tools (adds "${CLAUDE_MCP_PERMISSION}" to permissions.allow)?`,
              default: true,
            },
          ]);
          return ok;
        };

    const report = await this.hookService.install({
      rootDir: process.cwd(),
      agents,
      promptPermission,
    });

    const writes = report.writes.filter((w) => w.action !== 'skipped-existing');
    if (writes.length === 0) return;

    console.log(pc.cyan('\n🪝 Updating skill-loader hooks...'));
    for (const w of writes) {
      const tag =
        w.action === 'added' ? pc.green('+ added   ') : pc.cyan('~ updated ');
      console.log(`  ${tag} ${w.agent.padEnd(12)} ${pc.gray(w.file)}`);
    }
  }

  private printPlanCounts(plan: InstallPlan): void {
    console.log(
      `📦 Install: ${plan.added.length} added, ${plan.updated.length} updated, ${plan.unchanged.length} unchanged, ${plan.kept.length} kept (your edits), ${plan.pruned.length} pruned`,
    );
  }

  private printSummary(plan: InstallPlan): void {
    this.printPlanCounts(plan);

    const allKept = [...plan.kept, ...plan.keptOrphans];
    if (allKept.length > 0) {
      const preview = allKept.slice(0, 3).join(', ');
      const more = allKept.length > 3 ? `, +${allKept.length - 3} more` : '';
      console.log(
        pc.yellow(
          `   Kept your edits: ${preview}${more} — overwrite with ags sync --force <path>`,
        ),
      );
    }

    const legacyCopilot = allKept.filter((p) =>
      p.startsWith('.github/copilot-agents/'),
    );
    if (legacyCopilot.length > 0) {
      console.log(
        pc.yellow(
          `   ⚠️  ${legacyCopilot.length} legacy Copilot instruction export(s) kept; Copilot may still discover them as instructions next to .github/agents/*.agent.md.`,
        ),
      );
    }

    if (plan.unknown.length > 0) {
      const preview = plan.unknown.slice(0, 3).join(', ');
      const more =
        plan.unknown.length > 3 ? `, +${plan.unknown.length - 3} more` : '';
      console.log(
        pc.gray(
          `   Left ${plan.unknown.length} existing file(s) ags does not own: ${preview}${more}`,
        ),
      );
    }

    if (plan.backupId) {
      console.log(
        pc.gray(
          `   Backup: .ags/backups/${plan.backupId} (undo with ags restore ${plan.backupId})`,
        ),
      );
    }
  }

  private printVerbosePlan(plan: InstallPlan): void {
    for (const p of plan.added) console.log(pc.green(`  + ${p}`));
    for (const p of plan.updated) console.log(pc.cyan(`  ~ ${p}`));
    for (const p of plan.kept) console.log(pc.yellow(`  = ${p}`));
    for (const p of plan.unknown) console.log(pc.gray(`  ? ${p}`));
    for (const p of plan.pruned) console.log(pc.red(`  - ${p}`));
    for (const p of plan.keptOrphans) console.log(pc.yellow(`  ! ${p}`));
  }
}
