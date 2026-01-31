import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';
import { Agent, SUPPORTED_AGENTS } from '../constants';
import { SkillConfig, SkillEntry } from '../models/config';
import { CollectedSkill, GitHubTreeItem } from '../models/types';
import { ConfigService } from './ConfigService';
import { GithubService } from './GithubService';
import { IndexGeneratorService } from './IndexGeneratorService';

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
    const agents = config.agents || SUPPORTED_AGENTS.map((a) => a.id);
    const overrides = config.custom_overrides || [];

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
   * Automatically applies framework-specific indices to AGENTS.md.
   * @param config The skill configuration
   * @param syncedSkills Optional list of skills that were just synced. If provided, only these will be indexed.
   */
  async applyIndices(
    config: SkillConfig,
    syncedSkills?: CollectedSkill[],
    enabledAgents: Agent[] = [],
  ) {
    const githubMatch = GithubService.parseGitHubUrl(config.registry);
    if (!githubMatch) return;

    const { owner, repo } = githubMatch;
    // Extract ref from first available skill category or default to main
    const firstCategory = Object.keys(config.skills)[0];
    const ref =
      (firstCategory ? config.skills[firstCategory].ref : null) || 'main';

    console.log(pc.cyan('🔍 Updating Agent Skills index...'));

    try {
      // 1. Fetch pre-generated indices
      const indexJson = await this.githubService.getRawFile(
        owner,
        repo,
        ref,
        'skills/index.json',
      );

      if (!indexJson) {
        console.log(
          pc.yellow('  ⚠️  No pre-generated index found on registry.'),
        );
        return;
      }

      const frameworkIndices = JSON.parse(indexJson) as Record<string, string>;
      const enabledCategories = Object.keys(config.skills);
      const entries: string[] = [];

      // 2. Aggregate and Filter entries
      for (const category of enabledCategories) {
        if (frameworkIndices[category]) {
          const lines = frameworkIndices[category]
            .split('\n')
            .filter((l) => l.trim().length > 0);

          if (syncedSkills) {
            // Filter: Only include lines if the skill ID (first column) was synced
            const syncedIds = new Set(
              syncedSkills
                .filter((s) => s.category === category)
                .map((s) => `${s.category}/${s.skill}`),
            );
            const filteredLines = lines.filter((line) => {
              const skillId = line.split('|')[1]?.trim(); // Rows start with | ID | ...
              return syncedIds.has(skillId);
            });
            entries.push(...filteredLines);
          } else {
            entries.push(...lines);
          }
        }
      }

      if (entries.length === 0) {
        console.log(pc.gray('  - No matching skills found to index.'));
        return;
      }

      // 3. Assemble and Inject
      const generator = new IndexGeneratorService();
      const header = [
        '# Agent Skills Index',
        '',
        'IMPORTANT: Prefer retrieval-led reasoning. Consult skill files before acting.',
        '',
        '| Skill ID | Triggers | Description |',
        '| :--- | :--- | :--- |',
      ].join('\n');

      const indexContent = `${header}\n${entries.join('\n')}\n`;
      await generator.inject(process.cwd(), indexContent);
      await generator.bridge(process.cwd(), enabledAgents);

      console.log(
        pc.green(`  ✅ AGENTS.md index updated (${entries.length} skills).`),
      );
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
