import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';
import { SUPPORTED_AGENTS } from '../constants';
import { SkillConfig } from '../models/config';
import { ConfigService } from '../services/ConfigService';
import { DetectionService } from '../services/DetectionService';
import { GithubService } from '../services/GithubService';

interface CollectedSkill {
  category: string;
  skill: string;
  files: { name: string; content: string }[];
}

export class SyncCommand {
  private configService = new ConfigService();
  private githubService = new GithubService(process.env.GITHUB_TOKEN);

  async run() {
    try {
      // 1. Load Config
      let config = await this.configService.loadConfig();
      if (!config) {
        console.log(pc.red('❌ Error: .skillsrc not found. Run `init` first.'));
        return;
      }

      // --- DYNAMIC RE-DETECTION ---
      const detectionService = new DetectionService();
      const projectDeps = await detectionService.getProjectDeps();
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
      // ----------------------------

      // 2. Check for updates
      config = await this.checkForUpdates(config);

      console.log(pc.cyan(`🚀 Syncing skills from ${config.registry}...`));

      // 3. Assemble skills (concurrently)
      const enabledCategories = Object.keys(config.skills);
      const skills = await this.assembleFromRemote(enabledCategories, config);

      // 4. Write to disk
      await this.writeToTargets(skills, config);

      console.log(pc.green('✅ All skills synced successfully!'));
    } catch (error) {
      if (error instanceof Error) {
        console.error(pc.red('❌ Sync failed:'), error.message);
      } else {
        console.error(pc.red('❌ Sync failed:'), String(error));
      }
    }
  }

  private async checkForUpdates(config: SkillConfig): Promise<SkillConfig> {
    // Simplified implementation for now
    return config;
  }

  private async assembleFromRemote(
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

      // Identify skill folders
      const skillFolders = new Set<string>();
      treeData.tree.forEach((f) => {
        if (f.path.startsWith(`skills/${category}/`)) {
          const parts = f.path.split('/');
          if (parts[2]) skillFolders.add(parts[2]);
        }
      });

      // Filter included/excluded
      const foldersToSync = Array.from(skillFolders).filter((folder) => {
        if (catConfig.include && !catConfig.include.includes(folder))
          return false;
        if (catConfig.exclude && catConfig.exclude.includes(folder))
          return false;
        return true;
      });

      for (const skill of foldersToSync) {
        // Gather files for this skill
        const skillSourceFiles = treeData.tree.filter(
          (f) =>
            f.path.startsWith(`skills/${category}/${skill}/`) &&
            f.type === 'blob',
        );

        // Prepare download tasks
        const downloadTasks = skillSourceFiles
          .map((f) => ({
            owner,
            repo,
            ref,
            path: f.path,
          }))
          .filter((t) => {
            const relative = t.path.replace(`skills/${category}/${skill}/`, '');
            return (
              relative === 'SKILL.md' ||
              relative.startsWith('references/') ||
              relative.startsWith('scripts/') ||
              relative.startsWith('assets/')
            );
          });

        // DOWNLOAD CONCURRENTLY
        const files =
          await this.githubService.downloadFilesConcurrent(downloadTasks);

        if (files.length > 0) {
          collected.push({
            category,
            skill,
            files: files.map((f) => ({
              name: f.path.replace(`skills/${category}/${skill}/`, ''),
              content: f.content,
            })),
          });
          console.log(
            pc.gray(
              `    + Fetched ${category}/${skill} (${files.length} files)`,
            ),
          );
        }
      }
    }
    return collected;
  }

  private async writeToTargets(skills: CollectedSkill[], config: SkillConfig) {
    const agents = config.agents || SUPPORTED_AGENTS.map((a) => a.id);
    const overrides = config.custom_overrides || [];

    for (const agentId of agents) {
      const agentDef = SUPPORTED_AGENTS.find((a) => a.id === agentId);
      if (!agentDef) continue;

      const basePath = agentDef.path;

      if (basePath) {
        await fs.ensureDir(basePath);

        for (const skill of skills) {
          const skillPath = path.join(basePath, skill.category, skill.skill);
          await fs.ensureDir(skillPath);

          for (const fileItem of skill.files) {
            const targetFilePath = path.join(skillPath, fileItem.name);

            const relativePath = path
              .relative(process.cwd(), targetFilePath)
              .replace(/\\/g, '/');

            const isOverridden = overrides.some((o) => {
              const overridePath = o.replace(/\\/g, '/');
              return (
                relativePath === overridePath ||
                relativePath.startsWith(`${overridePath.replace(/\/$/, '')}/`)
              );
            });

            if (isOverridden) {
              console.log(
                pc.yellow(`    ⚠️  Skipping overridden: ${relativePath}`),
              );
              continue;
            }

            // SECURITY: Path Traversal Check
            const resolvedTarget = path.resolve(targetFilePath);
            const resolvedBase = path.resolve(skillPath);
            if (!resolvedTarget.startsWith(resolvedBase)) {
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
  }
}
