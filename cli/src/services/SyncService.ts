import fs from 'fs-extra';
import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'path';
import pc from 'picocolors';
import { Agent, SUPPORTED_AGENTS } from '../constants';
import { disclosureLines } from '../capabilities/agentCapabilities';
import { SkillConfig } from '../models/config';
import { CollectedSkill, RegistryMetadata } from '../models/types';
import { AgentBridgeService } from './AgentBridgeService';
import { ConfigService } from './ConfigService';
import { DetectionService } from './DetectionService';
import { GithubService } from './GithubService';
import { IndexGeneratorServiceImpl } from './IndexGeneratorServiceImpl';
import { SkillSyncService } from './SkillSyncService';
import { WorkflowSyncService } from './WorkflowSyncService';
import { SpecialistSyncService } from './SpecialistSyncService';
import { GitService } from './GitService';
import { LockfileService } from './LockfileService';
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
import { RefResolver, ResolvedRefs } from './install/RefResolver';

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
 * Service responsible for coordinating the synchronization of agent skills and workflows.
 * It acts as a facade, delegating specialized synchronization tasks to SkillSyncService
 * and WorkflowSyncService.
 */
export class SyncService {
  private configService = new ConfigService();
  private detectionService = new DetectionService();
  private githubService = new GithubService(process.env.GITHUB_TOKEN);
  private skillSyncService = new SkillSyncService(this.githubService);
  private workflowSyncService = new WorkflowSyncService(this.githubService);
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
  private warnedMovedTags = new Set<string>();

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
  ): Promise<CollectedSkill[]> {
    await this.warnIfSyncingFromSameRepo(config);
    const skillCategories = categories.filter(
      (category) => category !== 'specialists',
    );
    return this.skillSyncService.assembleSkills(
      skillCategories,
      config,
      this.manifestVerifiers.skills,
    );
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
    opts: { dryRun: boolean; force: string[] },
  ): Promise<void> {
    const agents = await this.resolveTargetAgents(config);
    const { lock, migratedFromV1 } = await this.lockfileService.load(
      process.cwd(),
      agents,
    );
    this.dryRun = opts.dryRun;
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
    },
  ): Promise<InstallPlan> {
    if (!this.ownership) {
      throw new Error('beginInstall() must run before completeInstall()');
    }
    const agents = new Set<string>(await this.resolveTargetAgents(config));
    const configured = new Set(Object.keys(config.skills));
    const fetched = new Set(run.skills.map((s) => s.category));
    const workflowsOk =
      run.workflows.length > 0 ||
      (Array.isArray(config.workflows) && config.workflows.length === 0);
    const pruneEnabled = config.prune !== false;
    const categoryOf = (source: string) =>
      source
        .replace(/^(skill|index):/, '')
        .split('/')[0]
        .split('@')[0];
    const { plan, entries } = await this.ownership.finalize((_rel, e) => {
      if (!pruneEnabled) return false;
      if (!agents.has(e.agent)) return true;
      switch (e.owner) {
        case 'skill':
        case 'index': {
          const cat = categoryOf(e.source);
          return !configured.has(cat) || fetched.has(cat);
        }
        case 'workflow':
          return workflowsOk;
        case 'specialist':
          return run.specialistsOk;
        case 'bridge':
          return true;
      }
    });
    if (!this.dryRun) {
      await this.lockfileService.write(process.cwd(), {
        version: 2,
        registry: config.registry,
        generatedAt: new Date().toISOString(),
        sources: this.buildSources(config),
        entries,
      });
    }
    return plan;
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
      sources['workflows'] = {
        ref: this.resolvedRefs.workflows.ref,
        commit: this.resolvedRefs.workflows.commit,
      };
      sources['specialists'] = {
        ref: this.resolvedRefs.specialists.ref,
        commit: this.resolvedRefs.specialists.commit,
      };
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
    if (!this.dryRun) {
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

  async writeWorkflows(
    workflows: CollectedSkill[],
    config: SkillConfig,
  ): Promise<void> {
    const agents = await this.resolveTargetAgents(config);
    return this.workflowSyncService.writeWorkflows(
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

      const allowedCategories = Object.keys(config.skills || {});

      // Use cached/fetched metadata.json from the registry and inject it into the
      // generator in-memory. This gives assembleRouterIndex the file_routing, broad_globs,
      // and base_language_skills it needs without writing anything to disk.
      const meta = await this.fetchRegistryMetadata(config);
      if (meta) {
        generator.withMetadata(meta);
      }

      // Generate per-category _INDEX.md files for all target agents
      const categoryIndices = await generator.generateAllCategoryIndices(
        baseDir,
        allowedCategories,
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

    const updates: Record<string, string> = {};

    for (const [cat, catConfig] of Object.entries(config.skills)) {
      const remoteMetaCat = remoteMeta.categories?.[cat];
      if (!remoteMetaCat?.version) continue;

      const latestRef = `${remoteMetaCat.tag_prefix || ''}${remoteMetaCat.version}`;
      if (catConfig.ref !== latestRef) {
        updates[cat] = latestRef;
      }
    }

    if (remoteMeta.releases?.workflows?.version) {
      const latestWorkflowsRef = `${remoteMeta.releases.workflows.tag_prefix || ''}${remoteMeta.releases.workflows.version}`;
      if (config.workflows_ref && config.workflows_ref !== latestWorkflowsRef) {
        updates['workflows'] = latestWorkflowsRef;
      }
    }

    if (remoteMeta.categories?.specialists?.version) {
      const latestSpecialistsRef = `${remoteMeta.categories.specialists.tag_prefix || ''}${remoteMeta.categories.specialists.version}`;
      if (
        config.specialists_ref &&
        config.specialists_ref !== latestSpecialistsRef
      ) {
        updates['specialists'] = latestSpecialistsRef;
      }
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
    const newPath = path.join(process.cwd(), '.agents');

    if (await fs.pathExists(oldPath)) {
      try {
        // Merge old content into the new folder without overwriting user files.
        await fs.copy(oldPath, newPath, {
          overwrite: false,
          errorOnExist: false,
        });

        await fs.remove(oldPath);
        console.log(pc.gray('  - Migrated and cleaned up old .agent folder.'));
      } catch (error) {
        if (process.env.DEBUG) {
          console.debug(
            `Failed to migrate/cleanup old .agent folder: ${error}`,
          );
        }
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
      const manifest = await this.githubService.getReleaseManifest(
        owner,
        repo,
        source.ref,
      );
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
