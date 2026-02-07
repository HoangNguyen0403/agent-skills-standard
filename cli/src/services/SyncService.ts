import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';
import { Agent, SUPPORTED_AGENTS } from '../constants';
import { SkillConfig, SkillEntry } from '../models/config';
import { CollectedSkill, GitHubTreeItem } from '../models/types';
import { ConfigService } from './ConfigService';
import { GithubService } from './GithubService';
import { IndexGeneratorService } from './IndexGeneratorService';

/**
 * Service responsible for synchronizing agent skills and workflows from a remote registry
 * to the local workspace. It handles dependency reconciliation, folder identification,
 * and writing files to appropriate agent search paths.
 */
export class SyncService {
  private configService = new ConfigService();
  private githubService = new GithubService(process.env.GITHUB_TOKEN);

  /**
   * Reconciles configuration based on detected project dependencies.
   * Returns true if the configuration was changed and saved.
   */
  async reconcileConfig(
    config: SkillConfig,
    projectDeps: Set<string>,
  ): Promise<boolean> {
    let configChanged = false;
    const categoriesToReconcile = Object.keys(config.skills);

    for (const cat of categoriesToReconcile) {
      const reenabled = this.configService.reconcileDependencies(
        config,
        cat,
        projectDeps,
      );
      if (reenabled.length > 0) {
        console.log(
          pc.yellow(
            `✨ Dynamic Re-detection: Re-enabling [${reenabled.join(', ')}] in '${cat}' category.`,
          ),
        );
        configChanged = true;
      }
    }

    if (configChanged) {
      await this.configService.saveConfig(config);
    }

    return configChanged;
  }

  /**
   * Assembles skills from the remote registry based on provided categories and configuration.
   */
  async assembleSkills(
    categories: string[],
    config: SkillConfig,
  ): Promise<CollectedSkill[]> {
    const collected: CollectedSkill[] = [];
    const githubMatch = GithubService.parseGitHubUrl(config.registry);

    if (!githubMatch) {
      console.log(pc.red('Error: Only GitHub registries supported.'));
      return [];
    }

    const { owner, repo } = githubMatch;

    for (const category of categories) {
      const catConfig = config.skills[category];
      const ref = catConfig.ref || 'main';

      console.log(pc.gray(`  - Discovering ${category} (${ref})...`));

      const treeData = await this.githubService.getRepoTree(owner, repo, ref);
      if (!treeData) {
        console.log(pc.red(`    ❌ Failed to fetch ${category}@${ref}.`));
        continue;
      }

      const foldersToSync = this.identifyFoldersToSync(
        category,
        catConfig,
        treeData.tree,
      );

      for (const absOrRelSkill of foldersToSync) {
        const skill = await this.fetchSkill(
          owner,
          repo,
          ref,
          category,
          absOrRelSkill,
          treeData.tree,
        );
        if (skill) collected.push(skill);
      }
    }

    return collected;
  }

  /**
   * Writes collected skills to target agent paths.
   */
  async writeSkills(skills: CollectedSkill[], config: SkillConfig) {
    let agents = config.agents;
    const overrides = config.custom_overrides || [];

    // If no agents explicitly configured, fallback to content-based detection
    // We only sync to agents that ALREADY have a directory created.
    if (!agents || agents.length === 0) {
      agents = [];
      for (const def of SUPPORTED_AGENTS) {
        if (def.path && (await fs.pathExists(def.path))) {
          agents.push(def.id);
        }
      }

      if (
        agents.length === 0 &&
        (!config.agents || config.agents.length === 0)
      ) {
        // If detection failed and config is empty, we default to ALL (Bootstrap mode)
        // OR we warn. Given 'ags sync' might be first run, maybe we should respect .skillsrc?
        // But invalid config shouldn't blow up workspace.
        // Let's default to primary supported agents if truly nothing exists,
        // but typically 'init' sets the config.
        // For safety/strictness:
        agents = SUPPORTED_AGENTS.map((a) => a.id);
      }
    }

    for (const agentId of agents) {
      const agentDef = SUPPORTED_AGENTS.find((a) => a.id === agentId);
      if (!agentDef || !agentDef.path) continue;

      const basePath = agentDef.path;
      await fs.ensureDir(basePath);

      for (const skill of skills) {
        const skillPath = path.join(basePath, skill.category, skill.skill);
        await fs.ensureDir(skillPath);

        for (const fileItem of skill.files) {
          const targetFilePath = path.join(skillPath, fileItem.name);

          if (this.isOverridden(targetFilePath, overrides)) {
            console.log(
              pc.yellow(
                `    ⚠️  Skipping overridden: ${this.normalizePath(targetFilePath)}`,
              ),
            );
            continue;
          }

          if (!this.isPathSafe(targetFilePath, skillPath)) {
            console.log(
              pc.red(`    ❌ Security Error: Invalid path ${fileItem.name}`),
            );
            continue;
          }

          await fs.outputFile(targetFilePath, fileItem.content);
        }
      }
      console.log(pc.gray(`  - Updated ${basePath}/ (${agentDef.name})`));
    }
  }

  /**
   * Assembles workflows from the remote registry.
   */
  async assembleWorkflows(config: SkillConfig): Promise<CollectedSkill[]> {
    if (!config.workflows) return [];

    const githubMatch = GithubService.parseGitHubUrl(config.registry);
    if (!githubMatch) return [];

    const { owner, repo } = githubMatch;
    // Use the ref from the first skill category or default to main
    const firstCategory = Object.keys(config.skills)[0];
    const ref =
      (firstCategory ? config.skills[firstCategory].ref : null) || 'main';

    console.log(pc.gray(`  - Discovering workflows (${ref})...`));

    const treeData = await this.githubService.getRepoTree(owner, repo, ref);
    if (!treeData) {
      console.log(pc.red(`    ❌ Failed to fetch workflows@${ref}.`));
      return [];
    }

    const workflowFiles = treeData.tree.filter((f) => {
      if (!f.path.startsWith('.agent/workflows/') || !f.path.endsWith('.md'))
        return false;

      // Filter based on config
      if (typeof config.workflows === 'boolean') return config.workflows;

      if (Array.isArray(config.workflows)) {
        const fileName = path.basename(f.path, '.md');
        return config.workflows.includes(fileName);
      }

      return false;
    });

    const downloadTasks = workflowFiles.map((f) => ({
      owner,
      repo,
      ref,
      path: f.path,
    }));

    const files =
      await this.githubService.downloadFilesConcurrent(downloadTasks);

    if (files.length > 0) {
      console.log(pc.gray(`    + Fetched ${files.length} workflows`));
      // Treat workflows as a special "skill" for easier writing
      return [
        {
          category: '.agent',
          skill: 'workflows',
          files: files.map((f) => ({
            name: path.basename(f.path),
            content: f.content,
          })),
        },
      ];
    }

    return [];
  }

  /**
   * Writes collected workflows to the .agent/workflows directory.
   */
  async writeWorkflows(workflows: CollectedSkill[]) {
    if (workflows.length === 0) return;

    const workflowPath = path.join(process.cwd(), '.agent', 'workflows');
    await fs.ensureDir(workflowPath);

    for (const wf of workflows) {
      if (wf.skill !== 'workflows') continue;

      for (const fileItem of wf.files) {
        const targetFilePath = path.join(workflowPath, fileItem.name);
        await fs.outputFile(targetFilePath, fileItem.content);
        console.log(pc.gray(`    + Wrote ${fileItem.name}`));
      }
    }
    console.log(pc.green(`  ✅ Workflows synced to .agent/workflows/`));
  }

  /**
   * Automatically applies framework-specific indices to AGENTS.md.
   * @param config The skill configuration
   * @param enabledAgents Optional list of agents to generate index for. Defaults to config agents.
   */
  async applyIndices(config: SkillConfig, enabledAgents: Agent[] = []) {
    let agents =
      enabledAgents && enabledAgents.length > 0
        ? enabledAgents
        : config.agents && config.agents.length > 0
          ? config.agents
          : [];

    // Auto-detect if no agents specified
    if (agents.length === 0) {
      for (const def of SUPPORTED_AGENTS) {
        if (def.path && (await fs.pathExists(def.path))) {
          agents.push(def.id);
        }
      }
      // If still empty, default to all (bootstrap)
      if (agents.length === 0) {
        agents = SUPPORTED_AGENTS.map((a) => a.id);
      }
    }

    if (agents.length === 0) {
      console.log(
        pc.yellow('  ⚠️  No agents enabled, skipping index generation.'),
      );
      return;
    }

    console.log(pc.cyan('🔍 Updating Agent Skills index...'));

    // We use the path of the first enabled agent as the source of truth for generating the index.
    // Since sync writes the same content to all agents, any one of them represents the complete set of skills.
    const primaryAgentId = agents[0];
    const agentDef = SUPPORTED_AGENTS.find((a) => a.id === primaryAgentId);

    if (!agentDef) {
      console.log(
        pc.yellow(`  ⚠️  Agent definition not found for ${primaryAgentId}.`),
      );
      return;
    }

    const baseDir = path.join(process.cwd(), agentDef.path);
    const enabledCategories = Object.keys(config.skills);

    try {
      // Generate index from local files (includes both synced and existing user skills)
      const generator = new IndexGeneratorService();

      const indexContent = await generator.generate(baseDir, enabledCategories);

      // Inject into AGENTS.md
      await generator.inject(process.cwd(), indexContent);
      await generator.bridge(process.cwd(), agents);

      console.log(pc.green(`  ✅ AGENTS.md index updated.`));
    } catch (error) {
      console.log(pc.yellow(`  ⚠️  Failed to update index: ${error}`));
    }
  }

  async checkForUpdates(config: SkillConfig): Promise<SkillConfig> {
    // Simplified implementation for now
    return config;
  }

  // --- Helper Methods ---

  private identifyFoldersToSync(
    category: string,
    catConfig: SkillEntry,
    tree: GitHubTreeItem[],
  ): string[] {
    const skillFolders = new Set<string>();
    tree.forEach((f) => {
      if (f.path.startsWith(`skills/${category}/`)) {
        const parts = f.path.split('/');
        if (parts[2]) skillFolders.add(parts[2]);
      }
    });

    const folders = Array.from(skillFolders).filter((folder) => {
      if (catConfig.include && !catConfig.include.includes(folder))
        return false;
      if (catConfig.exclude && catConfig.exclude.includes(folder)) return false;
      return true;
    });

    // Handle Cross-category Absolute Includes
    if (catConfig.include) {
      const absIncludes = catConfig.include.filter((i) => i.includes('/'));
      for (const absSkill of absIncludes) {
        this.expandAbsoluteInclude(absSkill, folders, tree);
      }
    }

    return folders;
  }

  private expandAbsoluteInclude(
    absSkill: string,
    folders: string[],
    tree: GitHubTreeItem[],
  ) {
    const [targetCat, targetSkill] = absSkill.split('/');
    if (!targetCat || !targetSkill) return;

    if (targetSkill === '*') {
      const catSkills = Array.from(
        new Set(
          tree
            .filter((f) => f.path.startsWith(`skills/${targetCat}/`))
            .map((f) => f.path.split('/')[2])
            .filter(Boolean),
        ),
      );

      for (const s of catSkills) {
        const fullPath = `${targetCat}/${s}`;
        if (!folders.includes(fullPath)) folders.push(fullPath);
      }
    } else if (!folders.includes(absSkill)) {
      const exists = tree.some((f) =>
        f.path.startsWith(`skills/${targetCat}/${targetSkill}/`),
      );
      if (exists) {
        folders.push(absSkill);
      } else {
        console.log(
          pc.yellow(
            `    ⚠️  Absolute include ${absSkill} not found in repository.`,
          ),
        );
      }
    }
  }

  private async fetchSkill(
    owner: string,
    repo: string,
    ref: string,
    category: string,
    absOrRelSkill: string,
    tree: GitHubTreeItem[],
  ): Promise<CollectedSkill | null> {
    const isAbsolute = absOrRelSkill.includes('/');
    const [sourceCat, skillName] = isAbsolute
      ? absOrRelSkill.split('/')
      : [category, absOrRelSkill];

    const skillSourceFiles = tree.filter(
      (f) =>
        f.path.startsWith(`skills/${sourceCat}/${skillName}/`) &&
        f.type === 'blob',
    );

    const downloadTasks = skillSourceFiles
      .map((f) => ({ owner, repo, ref, path: f.path }))
      .filter((t) => {
        const rel = t.path.replace(`skills/${sourceCat}/${skillName}/`, '');
        return (
          rel === 'SKILL.md' ||
          rel.startsWith('references/') ||
          rel.startsWith('scripts/') ||
          rel.startsWith('assets/')
        );
      });

    const files =
      await this.githubService.downloadFilesConcurrent(downloadTasks);
    if (files.length === 0) return null;

    console.log(
      pc.gray(
        `    + Fetched ${sourceCat}/${skillName} (${files.length} files)`,
      ),
    );

    return {
      category: sourceCat,
      skill: skillName,
      files: files.map((f) => ({
        name: f.path.replace(`skills/${sourceCat}/${skillName}/`, ''),
        content: f.content,
      })),
    };
  }

  private isOverridden(targetPath: string, overrides: string[]): boolean {
    const rel = this.normalizePath(targetPath);
    return overrides.some((o) => {
      const op = o.replace(/\\/g, '/');
      return rel === op || rel.startsWith(`${op.replace(/\/$/, '')}/`);
    });
  }

  private isPathSafe(targetPath: string, skillPath: string): boolean {
    const resolvedTarget = path.resolve(targetPath);
    const resolvedBase = path.resolve(skillPath);
    return resolvedTarget.startsWith(resolvedBase);
  }

  private normalizePath(p: string): string {
    return path.relative(process.cwd(), p).replace(/\\/g, '/');
  }
}
