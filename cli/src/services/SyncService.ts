import fs from 'fs-extra';
import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'path';
import pc from 'picocolors';
import { Agent, SUPPORTED_AGENTS } from '../constants';
import { disclosureLines } from '../capabilities/agentCapabilities';
import { SkillConfig } from '../models/config';
import {
  CollectedSkill,
  GitHubTreeResponse,
  RegistryMetadata,
} from '../models/types';
import { AgentBridgeService } from './AgentBridgeService';
import { ConfigService } from './ConfigService';
import { DetectionService } from './DetectionService';
import { GithubService, ReleaseManifest } from './GithubService';
import { IndexGeneratorServiceImpl } from './IndexGeneratorServiceImpl';
import { SkillAssemblyError, SkillSyncService } from './SkillSyncService';
import { WorkflowSyncService } from './WorkflowSyncService';
import type {
  WorkflowAcquisition,
  WorkflowWriteResult,
} from './WorkflowSyncService';
import { SpecialistSyncService } from './SpecialistSyncService';
import { GitService } from './GitService';
import {
  LockfileService,
  SHARED_WORKFLOW_AGENT,
  sha256,
} from './LockfileService';
import type {
  SkillsLockFile,
  WorkflowCatalog,
  WorkflowCatalogWorkflow,
} from './LockfileService';
import { MarkdownUtils } from './utils/MarkdownUtils';
import { BackupService } from './install/BackupService';
import {
  InstallPlan,
  InstallWriter,
  OwnershipWriter,
  PassthroughWriter,
} from './install/OwnershipWriter';
import { SourceRef, VerifyResult } from './LockfileService';
import { ManifestVerifier } from './install/ManifestVerifier';
import {
  RefResolver,
  ResolvedRefs,
  ResolvedSource,
} from './install/RefResolver';

const defaultExec = (
  cmd: string,
  args: string[],
): Promise<{ code: number; stderr: string }> => {
  const { promise, resolve, reject } = Promise.withResolvers<{
    code: number;
    stderr: string;
  }>();
  execFile(cmd, args, (error, _stdout, stderr) => {
    if (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return reject(error);
      }
      return resolve({
        code: typeof error.code === 'number' ? error.code : 1,
        stderr: stderr || error.message,
      });
    }
    resolve({ code: 0, stderr: stderr || '' });
  });
  return promise;
};

/**
 * Rejects an incomplete or malformed repository tree. A truncated or shaped
 * differently response must never be interpreted as an authoritative source
 * for a user-initiated apply.
 */
function assertCompleteTree(
  label: string,
  response: GitHubTreeResponse | null,
): GitHubTreeResponse {
  if (!response) {
    throw new SkillAssemblyError([`${label} (tree unavailable)`]);
  }
  if (
    response.truncated !== false ||
    typeof response.sha !== 'string' ||
    !/^[0-9a-f]{40}$/i.test(response.sha) ||
    typeof response.url !== 'string' ||
    response.url.length === 0
  ) {
    throw new SkillAssemblyError([`${label} (incomplete or malformed tree)`]);
  }
  if (!Array.isArray(response.tree)) {
    throw new SkillAssemblyError([`${label} (malformed tree)`]);
  }
  for (const item of response.tree) {
    if (!item || typeof item !== 'object') {
      throw new SkillAssemblyError([`${label} (malformed tree entry)`]);
    }
    const safePath =
      typeof item.path === 'string' &&
      item.path.length > 0 &&
      !item.path.startsWith('/') &&
      !item.path.endsWith('/') &&
      !item.path.includes('\\') &&
      item.path
        .split('/')
        .every(
          (segment) =>
            segment.length > 0 && segment !== '.' && segment !== '..',
        );
    const shaOk =
      typeof item.sha === 'string' && /^[0-9a-f]{40}$/i.test(item.sha);
    const typeOk = item.type === 'blob' || item.type === 'tree';
    const urlOk = typeof item.url === 'string' && item.url.length > 0;
    if (!safePath || !shaOk || !typeOk || !urlOk) {
      throw new SkillAssemblyError([
        `${label} (malformed tree entry ${String(item.path)})`,
      ]);
    }
  }
  return response;
}

/** Reject requests that would otherwise look like successful-empty assembly. */
function validateRequestedIncludes(
  category: string,
  includes: string[] | undefined,
  tree: GitHubTreeResponse,
): void {
  for (const expression of includes ?? []) {
    validateRequestedInclude(category, expression, tree);
  }
}

function validateRequestedInclude(
  category: string,
  expression: string,
  tree: GitHubTreeResponse,
): void {
  const separator = expression.indexOf('/');
  const targetCategory =
    separator < 0 ? category : expression.slice(0, separator);
  const targetSkill =
    separator < 0 ? expression : expression.slice(separator + 1);
  if (!targetCategory || !targetSkill) {
    throw new SkillAssemblyError([
      `${category} include ${expression} (invalid skill identity)`,
    ]);
  }
  const qualifiedWildcard = separator >= 0 && targetSkill === '*';
  assertIncludeTargetExists(
    category,
    expression,
    targetCategory,
    targetSkill,
    qualifiedWildcard,
    tree,
  );
}

function assertIncludeTargetExists(
  category: string,
  expression: string,
  targetCategory: string,
  targetSkill: string,
  qualifiedWildcard: boolean,
  tree: GitHubTreeResponse,
): void {
  const categoryPath = `skills/${targetCategory}`;
  const categoryExists = tree.tree.some(
    (item) => item.type === 'tree' && item.path === categoryPath,
  );
  if (!categoryExists) {
    throw new SkillAssemblyError([
      `${category} include ${expression} (referenced category missing)`,
    ]);
  }
  if (qualifiedWildcard) return;
  const skillPath = `${categoryPath}/${targetSkill}/SKILL.md`;
  if (
    !tree.tree.some((item) => item.type === 'blob' && item.path === skillPath)
  ) {
    throw new SkillAssemblyError([
      `${category} include ${expression} (requested skill missing)`,
    ]);
  }
}

/**
 * Service responsible for coordinating the synchronization of agent skills and workflows.
 * It acts as a facade, delegating specialized synchronization tasks to SkillSyncService
 * and WorkflowSyncService.
 */
export class SyncService {
  private configService = new ConfigService();
  private detectionService = new DetectionService();
  private githubService: GithubService;
  private skillSyncService: SkillSyncService;
  private workflowSyncService: WorkflowSyncService;
  private specialistSyncService = new SpecialistSyncService();
  private gitService = new GitService();
  private lockfileService = new LockfileService();
  private writer: InstallWriter = new PassthroughWriter(process.cwd());
  private ownership: OwnershipWriter | null = null;
  private dryRun = false;
  private cachedRegistryMetadata: RegistryMetadata | null | undefined =
    undefined;
  private resolvedRefs: ResolvedRefs | null = null;
  private manifestVerifiers: {
    skills: Record<string, ManifestVerifier>;
    workflows?: ManifestVerifier;
    specialists?: ManifestVerifier;
  } = { skills: {} };
  private previousLockSources: Record<string, SourceRef> | null = null;
  private previousLock: SkillsLockFile | null = null;
  private pendingWorkflowWrites: WorkflowWriteResult = {
    canonical: [],
    bindings: [],
  };
  private warnedMovedTags = new Set<string>();
  private installScope: 'all' | 'skills' = 'all';

  constructor(
    githubService: GithubService = new GithubService(process.env.GITHUB_TOKEN),
  ) {
    this.githubService = githubService;
    this.skillSyncService = new SkillSyncService(githubService);
    this.workflowSyncService = new WorkflowSyncService(githubService);
  }

  async reconcileConfig(
    config: SkillConfig,
    projectDeps: Set<string>,
  ): Promise<boolean> {
    const reenabled = this.configService.reconcileDependencies(
      config,
      projectDeps,
    );
    if (reenabled.length > 0) {
      console.log(pc.cyan('\n🔄 Dependencies changed, re-enabling skills:'));
      for (const skill of reenabled) {
        console.log(pc.gray(`  - ${skill}`));
      }
      return true;
    }
    return false;
  }

  async reconcileWorkflows(config: SkillConfig): Promise<boolean> {
    const ref =
      this.resolvedRefs?.workflows.ref || config.workflows_ref || 'main';
    return this.workflowSyncService.reconcileWorkflows(config, ref);
  }

  async assembleSkills(
    categories: string[],
    config: SkillConfig,
    trees?: Record<string, GitHubTreeResponse>,
    origins?: Record<string, { ref: string; commit: string | null }>,
    requireSkillDefinition = false,
  ): Promise<CollectedSkill[]> {
    await this.warnIfSyncingFromSameRepo(config);
    const skillCategories = categories.filter(
      (category) => category !== 'specialists',
    );
    return this.skillSyncService.assembleSkills(
      skillCategories,
      config,
      this.manifestVerifiers.skills,
      trees,
      origins,
      requireSkillDefinition,
    );
  }

  /**
   * Prefetches only the skill sources for a scoped apply. Resolves every
   * selected category ref to an explicit commit, verifies the category exists
   * at that commit, and assembles every requested package in memory. No
   * configuration, installation, lock, or index write happens here, and
   * workflow/specialist pins are never fetched or resolved.
   */
  async prepareSkillApplication(config: SkillConfig): Promise<{
    resolvedRefs: ResolvedRefs;
    skills: CollectedSkill[];
    completedCategories: string[];
  }> {
    const githubMatch = GithubService.parseGitHubUrl(config.registry);
    if (!githubMatch) {
      throw new SkillAssemblyError(['registry is not a GitHub repository']);
    }
    const { owner, repo } = githubMatch;
    const categories = Object.keys(config.skills ?? {}).filter(
      (category) => category !== 'specialists',
    );

    const resolvedSkills: Record<string, ResolvedSource> = {};
    const failures: string[] = [];
    for (const category of categories) {
      const entry = config.skills[category];
      const ref = entry?.ref || 'main';
      const commit = await this.githubService.resolveCommit(owner, repo, ref);
      if (!commit) {
        failures.push(`${category}@${ref} (unresolved ref)`);
        continue;
      }
      resolvedSkills[category] = {
        ref,
        commit,
        pinned: Boolean(entry?.ref),
      };
    }
    if (failures.length > 0) throw new SkillAssemblyError(failures);

    const manifests: Record<string, ManifestVerifier> = {};
    const trees: Record<string, GitHubTreeResponse> = {};
    const sourceFailures: string[] = [];
    for (const category of categories) {
      const source = resolvedSkills[category];
      const label = `${category}@${source.ref}`;
      let tree: GitHubTreeResponse;
      try {
        tree = assertCompleteTree(
          label,
          await this.githubService.getRepoTree(owner, repo, source.commit!),
        );
      } catch (error) {
        sourceFailures.push(
          error instanceof SkillAssemblyError
            ? error.failures.join(', ')
            : `${label} (${String(error)})`,
        );
        continue;
      }
      trees[category] = tree;
      if (
        !tree.tree.some(
          (item) => item.type === 'tree' && item.path === `skills/${category}`,
        )
      ) {
        sourceFailures.push(`${label} (category missing at source commit)`);
        continue;
      }
      validateRequestedIncludes(
        category,
        config.skills[category].include,
        tree,
      );
      let manifest: ReleaseManifest | null = null;
      if (source.pinned) {
        try {
          manifest = await this.githubService.getReleaseManifest(
            owner,
            repo,
            source.ref,
          );
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          sourceFailures.push(`${label} (manifest unavailable: ${detail})`);
          continue;
        }
      }
      manifests[category] = new ManifestVerifier(manifest);
    }
    if (sourceFailures.length > 0) {
      throw new SkillAssemblyError(sourceFailures);
    }

    this.manifestVerifiers.skills = manifests;
    // Cache registry metadata in memory so index generation does not need a
    // second network round trip after the configuration is saved.
    const remoteMeta = await this.fetchRegistryMetadata(config);
    if (remoteMeta) this.warnAboutRevokedRefs(config, remoteMeta);

    const fetchConfig: SkillConfig = {
      ...config,
      skills: Object.fromEntries(
        categories.map((category) => [
          category,
          { ...config.skills[category], ref: resolvedSkills[category].commit! },
        ]),
      ),
    };
    const skills = await this.assembleSkills(
      categories,
      fetchConfig,
      trees,
      Object.fromEntries(
        Object.entries(resolvedSkills).map(([category, source]) => [
          category,
          { ref: source.ref, commit: source.commit },
        ]),
      ),
      true,
    );

    return {
      resolvedRefs: {
        workflows: {
          ref: config.workflows_ref ?? '',
          commit: null,
          pinned: Boolean(config.workflows_ref),
        },
        specialists: {
          ref: config.specialists_ref ?? '',
          commit: null,
          pinned: Boolean(config.specialists_ref),
        },
        skills: resolvedSkills,
        newPins: {},
        warnings: [],
      },
      skills,
      completedCategories: categories,
    };
  }

  private async warnIfSyncingFromSameRepo(config: SkillConfig) {
    const remoteUrl = this.gitService.getRemoteUrl(process.cwd());
    if (!remoteUrl) return;

    const remoteMatch = GithubService.parseGitHubUrl(remoteUrl);
    const registryMatch = GithubService.parseGitHubUrl(config.registry);

    if (
      remoteMatch &&
      registryMatch &&
      remoteMatch.owner === registryMatch.owner &&
      remoteMatch.repo === registryMatch.repo
    ) {
      console.log(
        pc.yellow(
          `\n⚠️  Note: You are syncing from the registry repository itself (${remoteMatch.owner}/${remoteMatch.repo}).`,
        ),
      );
      console.log(
        pc.gray(
          `   'ags sync' pulls from GitHub. If you have unpushed local changes, they will be overwritten by the remote versions.`,
        ),
      );
    }
  }

  async beginInstall(
    config: SkillConfig,
    opts: {
      dryRun: boolean;
      force: string[];
      /**
       * `skills` limits finalization and lock provenance to skill/index files:
       * existing workflow and specialist entries and source records are kept
       * verbatim. Defaults to the full sync scope.
       */
      scope?: 'all' | 'skills';
      /** Pre-resolved skill commits held from a prepared selection. */
      resolvedRefs?: ResolvedRefs;
    },
  ): Promise<void> {
    const agents = await this.resolveTargetAgents(config);
    const { lock, migratedFromV1 } = await this.lockfileService.load(
      process.cwd(),
      agents,
    );
    this.dryRun = opts.dryRun;
    this.previousLock = lock;
    this.pendingWorkflowWrites = { canonical: [], bindings: [] };
    this.installScope = opts.scope ?? 'all';
    if (opts.resolvedRefs) {
      this.resolvedRefs = opts.resolvedRefs;
    }
    if (this.installScope === 'skills') {
      // Scoped lock writes must not invent provenance for unrelated sources.
      this.previousLockSources = lock?.sources ?? null;
    }
    this.ownership = new OwnershipWriter({
      rootDir: process.cwd(),
      previous: lock?.entries ?? {},
      dryRun: this.dryRun,
      force: new Set(
        opts.force.map((p) => p.replace(/\\/g, '/').replace(/^\.\//, '')),
      ),
      adoptUnknown: migratedFromV1,
      overrides: config.custom_overrides ?? [],
      backups: new BackupService(),
    });
    this.writer = this.ownership;
  }

  async completeInstall(
    config: SkillConfig,
    run: {
      skills: CollectedSkill[];
      workflows: CollectedSkill[];
      specialistsOk: boolean;
      refreshIndices?: boolean;
      localMetadata?: RegistryMetadata;
      /**
       * Categories whose assembly provably completed, including categories
       * that legitimately assembled zero packages. When provided it is the
       * only pruning evidence; package count is never treated as success.
       */
      completedSkillCategories?: string[];
      workflowAcquisition?: WorkflowAcquisition;
    },
  ): Promise<InstallPlan> {
    if (!this.ownership) {
      throw new Error('beginInstall() must run before completeInstall()');
    }
    const resolvedAgents = await this.resolveTargetAgents(config);
    const agents = new Set<string>(resolvedAgents);
    const configured = new Set(Object.keys(config.skills));
    const withDesiredSkills = new Set(run.skills.map((s) => s.category));
    const completed = run.completedSkillCategories
      ? new Set(run.completedSkillCategories)
      : withDesiredSkills;
    const desiredSkillIds: Record<string, string[]> = {};
    for (const skill of run.skills) {
      (desiredSkillIds[skill.category] ??= []).push(skill.skill);
    }
    const workflowsOk =
      run.workflowAcquisition?.status !== 'incomplete' &&
      (run.workflowAcquisition !== undefined ||
        run.workflows.length > 0 ||
        (Array.isArray(config.workflows) && config.workflows.length === 0));
    const pruneEnabled = config.prune !== false;
    const scope = this.installScope;
    const refreshIndices = !run.refreshIndices
      ? undefined
      : scope === 'skills'
        ? () =>
            this.applyIndices(
              config,
              resolvedAgents,
              run.localMetadata,
              desiredSkillIds,
              { strict: true },
            )
        : () => this.applyIndices(config, resolvedAgents, run.localMetadata);
    const categoryOf = (source: string) =>
      source
        .replace(/^(skill|index):/, '')
        .split('/')[0]
        .split('@')[0];
    const { plan, entries } = await this.ownership.finalize((_rel, e) => {
      if (!pruneEnabled) return false;
      // In a skill-only apply, workflow/specialist installations belong to
      // another lifecycle entirely — including those of agents that are no
      // longer in the target set.
      if (
        scope === 'skills' &&
        (e.owner === 'workflow' || e.owner === 'specialist')
      ) {
        return false;
      }
      // The shared canonical body is not owned by a provider; handle it
      // before the per-agent gate so it is never treated as an unknown agent.
      if (e.owner === 'workflow' && e.agent === SHARED_WORKFLOW_AGENT) {
        return workflowsOk;
      }
      if (!agents.has(e.agent)) return true;
      switch (e.owner) {
        case 'skill': {
          const cat = categoryOf(e.source);
          return !configured.has(cat) || completed.has(cat);
        }
        case 'index': {
          const cat = categoryOf(e.source);
          if (run.refreshIndices && configured.has(cat)) {
            // A completed category with no desired skill has no index
            // content; keeping the old file would advertise pruned skills.
            return completed.has(cat) && !withDesiredSkills.has(cat);
          }
          return !configured.has(cat) || completed.has(cat);
        }
        case 'workflow':
          return workflowsOk;
        case 'specialist':
          return run.specialistsOk;
        case 'bridge':
          return !run.refreshIndices;
      }
    }, refreshIndices);
    if (!this.dryRun) {
      // Publish the lock last; the workflow catalog is derived from the actual
      // post-reconciliation bytes, never from the intended download only.
      const catalog = await this.buildWorkflowCatalog(
        config,
        run.workflowAcquisition,
        entries,
      );
      const lock: SkillsLockFile = {
        version: 2,
        registry: config.registry,
        generatedAt: new Date().toISOString(),
        sources: this.buildSources(config),
        entries,
      };
      if (catalog) lock.workflowCatalog = catalog;
      await this.lockfileService.write(process.cwd(), lock);
    }
    return plan;
  }

  /**
   * Builds the catalog from files that survived ownership reconciliation.
   * Canonical bodies that were kept edited/overridden and native exports whose
   * on-disk bytes differ from the deterministic output are omitted rather than
   * falsely certified.
   */
  private async buildWorkflowCatalog(
    config: SkillConfig,
    acquisition: WorkflowAcquisition | undefined,
    entries: Record<string, { owner: string; agent: string }>,
  ): Promise<WorkflowCatalog | undefined> {
    const previous = this.previousLock?.workflowCatalog;
    if (acquisition?.status === 'incomplete') {
      // Retain prior provenance for still-valid prior bytes; never re-stamp.
      return previous;
    }

    if (this.pendingWorkflowWrites.canonical.length === 0) {
      if (previous) return { version: 1, workflows: {} };
      if (!config.workflows) return undefined;
      return { version: 1, workflows: {} };
    }

    const workflowSource = this.buildSources(config)['workflows'] ?? {
      ref: config.workflows_ref ?? 'default-branch',
      commit: null,
    };
    const workflows: Record<string, WorkflowCatalogWorkflow> = {};

    for (const planned of this.pendingWorkflowWrites.canonical) {
      const manifest = entries[planned.path];
      if (
        !manifest ||
        manifest.owner !== 'workflow' ||
        manifest.agent !== SHARED_WORKFLOW_AGENT
      ) {
        continue;
      }
      const canonicalPath = path.join(process.cwd(), planned.path);
      let canonicalBytes: Buffer;
      try {
        canonicalBytes = await fs.readFile(canonicalPath);
      } catch {
        continue;
      }
      const digest = sha256(canonicalBytes);
      if (digest !== planned.digest) {
        // Preserved user edit/override: conflict, not a new revision.
        continue;
      }

      const nativeBindings: WorkflowCatalogWorkflow['nativeBindings'] = [];
      const nativeConflicts: NonNullable<
        WorkflowCatalogWorkflow['nativeConflicts']
      > = [];
      for (const binding of this.pendingWorkflowWrites.bindings) {
        if (binding.name !== planned.name) continue;
        const outputPath = path.join(process.cwd(), binding.path);
        let outputBytes: Buffer | null = null;
        try {
          outputBytes = await fs.readFile(outputPath);
        } catch {
          // Missing/unreadable export is recorded as a conflict below.
        }
        if (
          outputBytes === null ||
          sha256(outputBytes) !== binding.outputDigest
        ) {
          // The expected export exists (or should exist) but its actual bytes
          // differ; record the provider conflict so parity is never certified
          // from the remaining verified bindings alone.
          nativeConflicts.push({
            agent: binding.agent,
            path: binding.path,
          });
          continue;
        }
        nativeBindings.push({
          agent: binding.agent,
          path: binding.path,
          outputDigest: binding.outputDigest,
          canonicalDigest: binding.canonicalDigest,
        });
      }

      const priorEntry = previous?.workflows[planned.name];
      const provenance = priorEntry?.digest === digest ? priorEntry : null;
      workflows[planned.name] = {
        path: planned.path,
        digest,
        registry: provenance?.registry ?? config.registry,
        requestedRef: provenance?.requestedRef ?? workflowSource.ref,
        resolvedCommit: provenance?.resolvedCommit ?? workflowSource.commit,
        nativeBindings,
        nativeConflicts,
      };
    }

    return { version: 1, workflows };
  }

  private buildSources(config: SkillConfig): Record<string, SourceRef> {
    const sources: Record<string, SourceRef> = {};
    if (this.resolvedRefs) {
      for (const [cat, res] of Object.entries(this.resolvedRefs.skills)) {
        sources[`skills/${cat}`] = {
          ref: res.ref,
          commit: res.commit,
        };
      }
      if (this.installScope === 'skills') {
        // A skill-only apply must not rewrite provenance it never resolved.
        const previous = this.previousLockSources ?? {};
        for (const key of ['workflows', 'specialists']) {
          if (previous[key]) sources[key] = previous[key];
        }
      } else {
        sources['workflows'] = {
          ref: this.resolvedRefs.workflows.ref,
          commit: this.resolvedRefs.workflows.commit,
        };
        sources['specialists'] = {
          ref: this.resolvedRefs.specialists.ref,
          commit: this.resolvedRefs.specialists.commit,
        };
      }
    } else {
      for (const [cat, entry] of Object.entries(config.skills || {})) {
        sources[`skills/${cat}`] = {
          ref: entry?.ref || 'main',
          commit: null,
        };
      }
      sources['workflows'] = {
        ref: config.workflows_ref || 'default-branch',
        commit: null,
      };
      sources['specialists'] = {
        ref: config.specialists_ref || 'default-branch',
        commit: null,
      };
    }
    return sources;
  }

  private async fetchRegistryMetadata(
    config: SkillConfig,
  ): Promise<RegistryMetadata | null> {
    if (this.cachedRegistryMetadata !== undefined) {
      return this.cachedRegistryMetadata;
    }
    const { owner, repo } = GithubService.parseGitHubUrl(config.registry) || {};
    if (!owner || !repo) {
      this.cachedRegistryMetadata = null;
      return null;
    }
    const info = await this.githubService.getRepoInfo(owner, repo);
    const ref = info?.default_branch || 'main';
    const metadataRaw = await this.githubService.getRawFile(
      owner,
      repo,
      ref,
      'skills/metadata.json',
    );
    if (!metadataRaw) {
      this.cachedRegistryMetadata = null;
      return null;
    }
    try {
      this.cachedRegistryMetadata = JSON.parse(metadataRaw) as RegistryMetadata;
      return this.cachedRegistryMetadata;
    } catch {
      this.cachedRegistryMetadata = null;
      return null;
    }
  }

  async resolvePins(config: SkillConfig): Promise<ResolvedRefs> {
    const githubMatch = GithubService.parseGitHubUrl(config.registry);
    if (!githubMatch) {
      const fallback: ResolvedRefs = {
        workflows: { ref: 'main', commit: null, pinned: false },
        specialists: { ref: 'main', commit: null, pinned: false },
        skills: {},
        newPins: {},
        warnings: [],
      };
      this.resolvedRefs = fallback;
      return fallback;
    }

    const { owner, repo } = githubMatch;
    const meta = await this.fetchRegistryMetadata(config);
    const resolver = new RefResolver(this.githubService);
    const resolved = await resolver.resolve(config, owner, repo, meta);
    this.resolvedRefs = resolved;

    // Fetch release manifests for pinned sources
    const skillManifestPromises = Object.entries(resolved.skills).map(
      async ([cat, source]) => {
        if (!source.pinned) return [cat, null] as const;
        const manifest = await this.githubService.getReleaseManifest(
          owner,
          repo,
          source.ref,
        );
        return [cat, manifest] as const;
      },
    );

    const [skillManifests, workflowsManifest, specialistsManifest] =
      await Promise.all([
        Promise.all(skillManifestPromises),
        resolved.workflows.pinned
          ? this.githubService.getReleaseManifest(
              owner,
              repo,
              resolved.workflows.ref,
            )
          : Promise.resolve(null),
        resolved.specialists.pinned
          ? this.githubService.getReleaseManifest(
              owner,
              repo,
              resolved.specialists.ref,
            )
          : Promise.resolve(null),
      ]);

    this.manifestVerifiers.skills = {};
    for (const [cat, manifest] of skillManifests) {
      this.manifestVerifiers.skills[cat] = new ManifestVerifier(manifest);
    }
    this.manifestVerifiers.workflows = new ManifestVerifier(workflowsManifest);
    this.manifestVerifiers.specialists = new ManifestVerifier(
      specialistsManifest,
    );

    await this.checkMovedTags();

    return resolved;
  }

  private async checkMovedTags(): Promise<void> {
    if (!this.previousLockSources) {
      try {
        const { lock } = await this.lockfileService.load(process.cwd(), []);
        if (lock?.sources) {
          this.previousLockSources = lock.sources;
        }
      } catch {
        return;
      }
    }
    if (!this.previousLockSources || !this.resolvedRefs) return;

    const currentSources = this.buildSources({} as SkillConfig);
    for (const [key, current] of Object.entries(currentSources)) {
      if (this.warnedMovedTags.has(key)) continue;
      const prev = this.previousLockSources[key];
      if (
        prev &&
        prev.ref === current.ref &&
        prev.commit &&
        current.commit &&
        prev.commit !== current.commit
      ) {
        this.warnedMovedTags.add(key);
        console.log(
          pc.yellow(
            `⚠️  ${key}@${current.ref} moved: ${prev.commit.slice(0, 7)} → ${current.commit.slice(0, 7)}`,
          ),
        );
      }
    }
  }

  async writeSkills(
    skills: CollectedSkill[],
    config: SkillConfig,
  ): Promise<void> {
    if (!this.dryRun && this.installScope !== 'skills') {
      await this.cleanupOldFolders();
    }
    const agents = await this.resolveTargetAgents(config);
    await this.skillSyncService.writeSkills(
      skills,
      config,
      agents,
      this.writer,
    );
  }

  async assembleWorkflows(config: SkillConfig): Promise<CollectedSkill[]> {
    const ref =
      this.resolvedRefs?.workflows.ref || config.workflows_ref || 'main';
    return this.workflowSyncService.assembleWorkflows(
      config,
      ref,
      this.manifestVerifiers.workflows,
    );
  }

  async acquireWorkflows(config: SkillConfig): Promise<WorkflowAcquisition> {
    const ref =
      this.resolvedRefs?.workflows.ref || config.workflows_ref || 'main';
    return this.workflowSyncService.acquireWorkflows(
      config,
      ref,
      this.manifestVerifiers.workflows,
    );
  }

  async writeWorkflows(
    workflows: CollectedSkill[],
    config: SkillConfig,
  ): Promise<void> {
    const agents = await this.resolveTargetAgents(config);
    this.pendingWorkflowWrites = await this.workflowSyncService.writeWorkflows(
      workflows,
      config,
      agents,
      this.writer,
    );
  }

  async syncSpecialists(config: SkillConfig): Promise<boolean> {
    const agents = await this.resolveTargetAgents(config);
    if (agents.length === 0) return true;

    const localRegistrySource = path.join(process.cwd(), 'skills/specialists');
    if (await fs.pathExists(localRegistrySource)) {
      const count = await this.specialistSyncService.syncSpecialists(
        process.cwd(),
        agents,
        localRegistrySource,
        this.writer,
      );
      return count > 0;
    }

    const ref =
      this.resolvedRefs?.specialists.ref || config.specialists_ref || 'main';
    const specialists = await this.specialistSyncService.assembleSpecialists(
      config,
      ref,
      this.manifestVerifiers.specialists,
    );
    const count = await this.specialistSyncService.syncCollectedSpecialists(
      process.cwd(),
      agents,
      specialists,
      this.writer,
    );
    return count > 0;
  }

  async applyIndices(
    config: SkillConfig,
    targetAgents?: Agent[],
    localMetadata?: RegistryMetadata,
    /**
     * Desired installed skill ids per category. When provided, indexes are
     * generated from this selection so retained (edited, overridden, or
     * prune-disabled) files outside the selection are not advertised.
     */
    desiredSkillIds?: Record<string, string[]>,
    options?: {
      /**
       * Scoped applies cannot claim success when a required index/bridge write
       * failed; ordinary sync keeps its report-and-continue behavior.
       */
      strict?: boolean;
    },
  ): Promise<void> {
    const agents = targetAgents || (await this.resolveTargetAgents(config));
    if (agents.length === 0) return;

    const agentDef = SUPPORTED_AGENTS.find((a) => a.id === agents[0]);
    if (!agentDef) {
      console.log(
        pc.yellow(`  ⚠️  Agent definition not found for ${agents[0]}.`),
      );
    }

    try {
      const generator = new IndexGeneratorServiceImpl();
      // Use agent path if available, otherwise fallback to .cursor/skills as a reasonable default
      const baseDir = agentDef
        ? path.join(process.cwd(), agentDef.path)
        : path.join(process.cwd(), '.cursor/skills');

      const allowedCategories = desiredSkillIds
        ? Array.from(
            new Set([
              ...Object.keys(config.skills || {}),
              ...Object.keys(desiredSkillIds),
            ]),
          )
        : Object.keys(config.skills || {});
      const selectedSkills = desiredSkillIds
        ? Object.fromEntries(
            allowedCategories.map((category) => [
              category,
              desiredSkillIds[category] ?? [],
            ]),
          )
        : undefined;

      // Use cached/fetched metadata.json from the registry and inject it into the
      // generator in-memory. This gives assembleRouterIndex the file_routing, broad_globs,
      // and base_language_skills it needs without writing anything to disk.
      const meta = localMetadata ?? (await this.fetchRegistryMetadata(config));
      if (meta) {
        generator.withMetadata(meta);
      }

      // Generate per-category _INDEX.md files for all target agents
      const categoryIndices = await generator.generateAllCategoryIndices(
        baseDir,
        allowedCategories,
        selectedSkills,
      );
      for (const agentId of agents) {
        const def = SUPPORTED_AGENTS.find((a) => a.id === agentId);
        if (!def) continue;
        const agentBase = path.join(process.cwd(), def.path);
        for (const [category, indexContent] of Object.entries(
          categoryIndices as Record<string, string>,
        )) {
          const indexMdPath = path.join(agentBase, category, '_INDEX.md');
          await this.writer.write(indexMdPath, indexContent, {
            owner: 'index',
            source: `index:${category}`,
            agent: agentId,
          });
        }
        if (!selectedSkills) continue;
        // A retained index (prune disabled, or a directory with protected
        // files) must not keep advertising skills nobody selected. Empty the
        // managed file instead of deleting protected content.
        const existingCategories = (await fs.pathExists(agentBase))
          ? await fs.readdir(agentBase)
          : [];
        for (const category of existingCategories) {
          if (category.startsWith('.') || category === '_INDEX.md') continue;
          if (Object.prototype.hasOwnProperty.call(categoryIndices, category)) {
            continue;
          }
          if ((selectedSkills[category]?.length ?? 0) > 0) continue;
          const indexMdPath = path.join(agentBase, category, '_INDEX.md');
          if (!(await fs.pathExists(indexMdPath))) continue;
          await this.writer.write(indexMdPath, '', {
            owner: 'index',
            source: `index:${category}`,
            agent: agentId,
          });
        }
      }
      if (Object.keys(categoryIndices).length > 0) {
        console.log(
          pc.green(
            `  ✅ Generated _INDEX.md for ${Object.keys(categoryIndices).length} categories.`,
          ),
        );
      }

      // Generate router-style AGENTS.md (compact, scalable). When MCP is
      // enabled in .skillsrc, the router gets a "Runtime Enforcement via MCP"
      // section so AI agents (and sub-agents that read AGENTS.md) are told to
      // prefer the MCP tool calls.
      const mcpEnabled = config.mcp?.enabled === true;
      const routerIndex = await generator.assembleRouterIndex(
        baseDir,
        allowedCategories,
        mcpEnabled,
        selectedSkills,
      );
      if (this.dryRun) {
        console.log(pc.gray('  (dry-run) would update AGENTS.md router index'));
      } else {
        const updatedAgentsFiles = await MarkdownUtils.injectIndex(
          process.cwd(),
          ['AGENTS.md'],
          routerIndex,
        );

        if (updatedAgentsFiles.length > 0) {
          console.log(pc.green('  ✅ AGENTS.md router index updated.'));
        } else {
          console.log(
            pc.yellow(
              '  ⚠️  Skipped AGENTS.md update: index markers <!-- SKILLS_INDEX_START --> … <!-- SKILLS_INDEX_END --> are missing or out of order. Opt-in by adding these markers to your file.',
            ),
          );
        }

        // Apply to sub-projects if any
        const serverDir = path.join(process.cwd(), 'server');
        if (await fs.pathExists(serverDir)) {
          const updatedServerFiles = await MarkdownUtils.injectIndex(
            serverDir,
            ['AGENTS.md'],
            routerIndex,
          );
          if (updatedServerFiles.length > 0) {
            console.log(
              pc.green('  ✅ server/AGENTS.md router index updated.'),
            );
          } else {
            console.log(
              pc.yellow(
                '  ⚠️  Skipped server/AGENTS.md update: index markers <!-- SKILLS_INDEX_START --> … <!-- SKILLS_INDEX_END --> are missing or out of order in server/AGENTS.md. Opt-in via markers.',
              ),
            );
          }
        }
      }

      const bridgeService = new AgentBridgeService();
      await bridgeService.bridge(process.cwd(), agents, this.writer, {
        dryRun: this.dryRun,
      });
    } catch (error) {
      if (options?.strict) throw error;
      console.log(pc.yellow(`  ⚠️  Failed to update index: ${error}`));
    }
  }

  async discloseCapabilities(config: SkillConfig): Promise<void> {
    const agents = await this.resolveTargetAgents(config);
    const previous = await this.lockfileService.readDisclosed(process.cwd());
    const { lines, next } = disclosureLines(agents, previous);
    for (const line of lines) console.log(pc.gray(`  ℹ️  ${line}`));
    await this.lockfileService.writeDisclosed(process.cwd(), next);
  }

  async checkForUpdates(config: SkillConfig): Promise<Record<string, string>> {
    const { owner, repo } = GithubService.parseGitHubUrl(config.registry) || {};
    if (!owner || !repo) return {};

    const remoteMeta = await this.fetchRegistryMetadata(config);
    if (!remoteMeta) return {};

    const candidates: Array<{ key: string; ref: string }> = [];

    for (const [cat, catConfig] of Object.entries(config.skills)) {
      const remoteMetaCat = remoteMeta.categories?.[cat];
      if (!remoteMetaCat?.version) continue;

      const latestRef = `${remoteMetaCat.tag_prefix || ''}${remoteMetaCat.version}`;
      if (catConfig.ref !== latestRef) {
        candidates.push({ key: cat, ref: latestRef });
      }
    }

    if (remoteMeta.releases?.workflows?.version) {
      const latestWorkflowsRef = `${remoteMeta.releases.workflows.tag_prefix || ''}${remoteMeta.releases.workflows.version}`;
      if (config.workflows_ref && config.workflows_ref !== latestWorkflowsRef) {
        candidates.push({ key: 'workflows', ref: latestWorkflowsRef });
      }
    }

    if (remoteMeta.categories?.specialists?.version) {
      const latestSpecialistsRef = `${remoteMeta.categories.specialists.tag_prefix || ''}${remoteMeta.categories.specialists.version}`;
      if (
        config.specialists_ref &&
        config.specialists_ref !== latestSpecialistsRef
      ) {
        candidates.push({ key: 'specialists', ref: latestSpecialistsRef });
      }
    }

    const updates: Record<string, string> = {};
    if (candidates.length > 0) {
      const resolvedCommits = await Promise.all(
        candidates.map((c) =>
          this.githubService.resolveCommit(owner, repo, c.ref),
        ),
      );
      candidates.forEach((c, idx) => {
        if (resolvedCommits[idx]) {
          updates[c.key] = c.ref;
        }
      });
    }
    this.warnAboutRevokedRefs(config, remoteMeta);

    return updates;
  }

  /**
   * Prints a warning (does not block sync) for any installed category ref
   * that appears in the registry's `revocations` list — e.g. a version
   * later found to carry a vulnerability. Checked against the *live*
   * registry metadata.json (fetched above), not this repo's own local copy,
   * so a revocation recorded after a consumer's initial sync is still seen
   * on their next sync/update check.
   */
  private warnAboutRevokedRefs(
    config: SkillConfig,
    remoteMeta: RegistryMetadata,
  ): void {
    const revocations = remoteMeta.revocations ?? [];
    if (revocations.length === 0) return;

    for (const [cat, catConfig] of Object.entries(config.skills)) {
      if (!catConfig.ref) continue;
      const hit = revocations.find(
        (r) => r.category === cat && r.refs.includes(catConfig.ref!),
      );
      if (!hit) continue;

      console.log(
        pc.red(`\n🚨 ${cat}@${catConfig.ref} has been revoked: ${hit.reason}`),
      );
      if (hit.advisory) {
        console.log(pc.gray(`   Advisory: ${hit.advisory}`));
      }
      console.log(
        pc.yellow(
          '   Run `ags sync --yes` to update to a non-revoked version.',
        ),
      );
    }
  }

  public async resolveTargetAgents(config: SkillConfig): Promise<Agent[]> {
    if (config.agents && config.agents.length > 0) {
      return config.agents;
    }

    const detectedMap = await this.detectionService.detectAgents();
    const detected = Object.entries(detectedMap)
      .filter(([, enabled]) => enabled)
      .map(([id]) => id as Agent);

    if (detected.length > 0) {
      return detected;
    }

    // Return empty if no agents are detected and none are configured.
    // This ensures we never create "ghost" directories in the workspace.
    return [];
  }

  /**
   * Verifies installed skill files against `.skills-lock.json`. Checks the
   * first configured agent's skill directory by default (or `agentId` if
   * given) — the standard `<agentPath>/<category>/<skill>/<file>` layout;
   * Kiro's flattened `<category>-<skill>/` layout isn't supported yet.
   */
  async verifyInstall(
    config: SkillConfig,
    agent?: Agent,
  ): Promise<{ found: boolean; checked: number; result: VerifyResult }> {
    const agents = await this.resolveTargetAgents(config);
    const { lock } = await this.lockfileService.load(process.cwd(), agents);
    if (!lock) {
      return {
        found: false,
        checked: 0,
        result: { ok: false, mismatches: [], missing: [] },
      };
    }
    const entries = agent
      ? Object.values(lock.entries).filter((e) => e.agent === agent)
      : Object.values(lock.entries);
    const result = await this.lockfileService.verifyEntries(
      process.cwd(),
      lock.entries,
      agent,
    );
    return {
      found: true,
      checked: entries.length,
      result,
    };
  }

  private async cleanupOldFolders(): Promise<void> {
    const oldPath = path.join(process.cwd(), '.agent');

    // Conservative preservation (H03): Ordinary install/writeSkills migration must NEVER
    // delete or mutate unknown active data in .agent (e.g. .agent/sdd, transcripts, receipts).
    // Preserving user data wins over naming cleanup. Automatic cleanup and deletion of .agent
    // is completely stopped.
    if (await fs.pathExists(oldPath)) {
      if (process.env.DEBUG) {
        console.debug(
          pc.gray(
            'Preserved existing .agent folder untouched; automatic removal disabled to protect active evidence.',
          ),
        );
      }
    }
  }

  async checkSourceCommits(
    config: SkillConfig,
  ): Promise<
    Array<{ key: string; ref: string; locked: string; current: string | null }>
  > {
    const githubMatch = GithubService.parseGitHubUrl(config.registry);
    if (!githubMatch) return [];
    const { owner, repo } = githubMatch;

    const { lock } = await this.lockfileService.load(process.cwd(), []);
    if (!lock?.sources) return [];

    const entries = Object.entries(lock.sources).filter(
      ([, s]) => s.commit !== null,
    );

    const checks = await Promise.all(
      entries.map(async ([key, source]) => {
        const current = await this.githubService.resolveCommit(
          owner,
          repo,
          source.ref,
        );
        return {
          key,
          ref: source.ref,
          locked: source.commit!,
          current,
        };
      }),
    );

    return checks.filter((c) => c.current !== c.locked);
  }

  async verifyAttestations(
    config: SkillConfig,
    exec: (
      cmd: string,
      args: string[],
    ) => Promise<{ code: number; stderr: string }> = defaultExec,
  ): Promise<Array<{ key: string; ref: string; ok: boolean; detail: string }>> {
    const githubMatch = GithubService.parseGitHubUrl(config.registry);
    if (!githubMatch) return [];
    const { owner, repo } = githubMatch;

    const { lock } = await this.lockfileService.load(process.cwd(), []);
    if (!lock?.sources) return [];

    const unpinnedRefs = new Set(['main', 'master', 'default-branch']);
    const pinnedEntries = Object.entries(lock.sources).filter(
      ([, s]) => s.ref && !unpinnedRefs.has(s.ref),
    );

    const results: Array<{
      key: string;
      ref: string;
      ok: boolean;
      detail: string;
    }> = [];

    for (const [key, source] of pinnedEntries) {
      let manifest: ReleaseManifest | null;
      try {
        manifest = await this.githubService.getReleaseManifest(
          owner,
          repo,
          source.ref,
        );
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        results.push({
          key,
          ref: source.ref,
          ok: false,
          detail: `MANIFEST unavailable: ${detail}`,
        });
        continue;
      }
      if (!manifest) {
        results.push({
          key,
          ref: source.ref,
          ok: false,
          detail: 'no MANIFEST.json for this release',
        });
        continue;
      }

      const tmpFile = path.join(
        os.tmpdir(),
        `manifest-${key.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}.json`,
      );
      await fs.writeJson(tmpFile, manifest);

      try {
        const { code, stderr } = await exec('gh', [
          'attestation',
          'verify',
          tmpFile,
          '--repo',
          `${owner}/${repo}`,
        ]);
        if (code === 0) {
          results.push({
            key,
            ref: source.ref,
            ok: true,
            detail: 'attestation verified',
          });
        } else {
          results.push({
            key,
            ref: source.ref,
            ok: false,
            detail:
              stderr.trim() || `verification failed with exit code ${code}`,
          });
        }
      } catch (err: unknown) {
        const errorObj = err as { code?: string; message?: string };
        if (
          errorObj.code === 'ENOENT' ||
          (typeof errorObj.message === 'string' &&
            errorObj.message.includes('ENOENT'))
        ) {
          throw new Error(
            'gh CLI not found; install GitHub CLI to verify attestations',
            { cause: err },
          );
        }
        results.push({
          key,
          ref: source.ref,
          ok: false,
          detail: errorObj.message || String(err),
        });
      } finally {
        await fs.remove(tmpFile).catch(() => {});
      }
    }

    return results;
  }
}
