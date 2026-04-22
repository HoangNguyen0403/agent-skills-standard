import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';
import { Agent, SUPPORTED_AGENTS } from '../constants';
import { SkillConfig } from '../models/config';
import { CollectedSkill } from '../models/types';
import { AgentBridgeService } from './AgentBridgeService';
import { ConfigService } from './ConfigService';
import { DetectionService } from './DetectionService';
import { GithubService } from './GithubService';
import { IndexGeneratorServiceImpl } from './IndexGeneratorServiceImpl';
import { SkillSyncService } from './SkillSyncService';
import { WorkflowSyncService } from './WorkflowSyncService';
import { MarkdownUtils } from './utils/MarkdownUtils';

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
    return this.workflowSyncService.reconcileWorkflows(config);
  }

  async assembleSkills(
    categories: string[],
    config: SkillConfig,
  ): Promise<CollectedSkill[]> {
    return this.skillSyncService.assembleSkills(categories, config);
  }

  async writeSkills(
    skills: CollectedSkill[],
    config: SkillConfig,
  ): Promise<void> {
    const agents = await this.resolveTargetAgents(config);
    return this.skillSyncService.writeSkills(skills, config, agents);
  }

  async assembleWorkflows(config: SkillConfig): Promise<CollectedSkill[]> {
    return this.workflowSyncService.assembleWorkflows(config);
  }

  async writeWorkflows(
    workflows: CollectedSkill[],
    config: SkillConfig,
  ): Promise<void> {
    const agents = await this.resolveTargetAgents(config);
    return this.workflowSyncService.writeWorkflows(workflows, config, agents);
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

      // Fetch metadata.json from the registry's default branch and inject it into the
      // generator in-memory. This gives assembleRouterIndex the file_routing, broad_globs,
      // and base_language_skills it needs without writing anything to disk.
      const githubMatch = config.registry
        ? GithubService.parseGitHubUrl(config.registry)
        : null;
      if (githubMatch) {
        const { owner, repo } = githubMatch;
        const repoInfo = await this.githubService.getRepoInfo(owner, repo);
        const ref = repoInfo?.default_branch || 'main';
        const metaRaw = await this.githubService.getRawFile(
          owner,
          repo,
          ref,
          'skills/metadata.json',
        );
        if (metaRaw) {
          try {
            generator.withMetadata(JSON.parse(metaRaw));
          } catch {
            // Malformed JSON — continue without remote metadata; router falls back to file
          }
        }
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
          await fs.outputFile(indexMdPath, indexContent);
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
      await MarkdownUtils.injectIndex(
        process.cwd(),
        ['AGENTS.md'],
        routerIndex,
      );
      console.log(pc.green('  ✅ AGENTS.md router index updated.'));

      // Apply to sub-projects if any
      const serverDir = path.join(process.cwd(), 'server');
      if (await fs.pathExists(serverDir)) {
        await MarkdownUtils.injectIndex(serverDir, ['AGENTS.md'], routerIndex);
        console.log(pc.green('  ✅ server/AGENTS.md router index updated.'));
      }

      const bridgeService = new AgentBridgeService();
      await bridgeService.bridge(process.cwd(), agents);
    } catch (error) {
      console.log(pc.yellow(`  ⚠️  Failed to update index: ${error}`));
    }
  }

  async checkForUpdates(config: SkillConfig): Promise<Record<string, string>> {
    const { owner, repo } = GithubService.parseGitHubUrl(config.registry) || {};
    if (!owner || !repo) return {};

    const info = await this.githubService.getRepoInfo(owner, repo);
    const ref = info?.default_branch || 'main';

    const metadataRaw = await this.githubService.getRawFile(
      owner,
      repo,
      ref,
      'skills/metadata.json',
    );
    if (!metadataRaw) return {};

    const remoteMeta = JSON.parse(metadataRaw);
    const updates: Record<string, string> = {};

    for (const [cat, catConfig] of Object.entries(config.skills)) {
      const remoteMetaCat = remoteMeta.categories?.[cat];
      if (!remoteMetaCat?.version) continue;

      const latestRef = `${remoteMetaCat.tag_prefix || ''}${remoteMetaCat.version}`;
      if (catConfig.ref !== latestRef) {
        updates[cat] = latestRef;
      }
    }

    return updates;
  }

  private async resolveTargetAgents(config: SkillConfig): Promise<Agent[]> {
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

    return [Agent.Cursor, Agent.Antigravity, Agent.Kiro];
  }
}
