import fs from 'fs-extra';
import inquirer from 'inquirer';
import yaml from 'js-yaml';
import fetch from 'node-fetch';
import path from 'path';
import pc from 'picocolors';
import { SUPPORTED_AGENTS } from '../constants';
import { SkillConfig } from '../models/config';
import { GitHubTreeItem, GitHubTreeResponse } from '../models/types';

interface CollectedSkill {
  category: string;
  skill: string;
  files: { name: string; content: string }[];
}

interface NPMRegistryResponse {
  version: string;
}

interface GitHubRepoResponse {
  default_branch: string;
}

interface RemoteMetadata {
  categories: {
    [key: string]: {
      version?: string;
      tag_prefix?: string;
    };
  };
}

export class SyncCommand {
  async run() {
    const configPath = path.join(process.cwd(), '.skillsrc');

    if (!(await fs.pathExists(configPath))) {
      console.log(
        pc.red('❌ Error: .skillsrc not found in current directory.'),
      );
      console.log(pc.yellow('Run `agent-skills init` first.'));
      return;
    }

    try {
      const fileContent = await fs.readFile(configPath, 'utf8');
      let config = yaml.load(fileContent) as SkillConfig;

      // 1. Check for CLI updates
      await this.checkCLIUpdate();

      // 2. Check for skill updates before syncing
      config = await this.checkForUpdates(config, configPath);

      console.log(pc.cyan(`🚀 Syncing skills from ${config.registry}...`));

      const enabledCategories = Object.entries(config.skills)
        .filter(([, value]) => value.enabled)
        .map(([key]) => key);

      const skills = await this.assembleFromRemote(enabledCategories, config);

      await this.writeToTargets(skills, config);

      console.log(pc.green('✅ All skills synced successfully!'));
    } catch (error) {
      console.error(pc.red('❌ Failed to sync skills:'), error);
    }
  }

  private async checkCLIUpdate() {
    try {
      const pkgPath = path.join(__dirname, '../../package.json');
      if (!fs.existsSync(pkgPath)) return;

      const pkg = await fs.readJson(pkgPath);
      const currentVersion = pkg.version;

      const res = await fetch(
        'https://registry.npmjs.org/agent-skills-standard/latest',
      );
      if (res.ok) {
        const remoteData = (await res.json()) as NPMRegistryResponse;
        const latestVersion = remoteData.version;

        if (currentVersion !== latestVersion) {
          console.log(
            pc.magenta(
              `\n🎁 A newer CLI version is available: ${currentVersion} -> ${latestVersion}`,
            ),
          );
          console.log(
            pc.magenta(
              `   Run ${pc.bold(
                'npm install -g agent-skills-standard',
              )} to update.\n`,
            ),
          );
        }
      }
    } catch {
      console.error(pc.yellow('⚠️ CLI update check failed (non-fatal):'));
    }
  }

  private async checkForUpdates(
    config: SkillConfig,
    configPath: string,
  ): Promise<SkillConfig> {
    const githubMatch = config.registry.match(
      /github\.com\/([^/]+)\/([^/.]+)(?:\.git)?/i,
    );
    if (!githubMatch) return config;

    const owner = githubMatch[1];
    const repo = githubMatch[2];
    if (!owner || !repo) return config;

    try {
      console.log(pc.gray('🔍 Checking for skill updates...'));

      // 1. Get default branch
      const repoRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
      );
      if (!repoRes.ok) return config;
      const repoData = (await repoRes.json()) as GitHubRepoResponse;
      const defaultBranch = repoData.default_branch || 'main';

      // 2. Fetch remote metadata.json
      const metaUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/skills/metadata.json`;
      const metaRes = await fetch(metaUrl);
      if (!metaRes.ok) return config;
      const remoteMeta = (await metaRes.json()) as RemoteMetadata;

      const updates: { category: string; from: string; to: string }[] = [];

      for (const [cat, catConfig] of Object.entries(config.skills)) {
        if (!catConfig.enabled) continue;

        const remoteCat = remoteMeta.categories?.[cat];
        if (!remoteCat || !remoteCat.version || !remoteCat.tag_prefix) continue;

        const latestTag = `${remoteCat.tag_prefix}${remoteCat.version}`;
        const currentRef = catConfig.ref || 'main';

        // Update if ref is different and doesn't explicitly contain the latest version string
        if (currentRef !== latestTag) {
          updates.push({
            category: cat,
            from: currentRef,
            to: latestTag,
          });
        }
      }

      if (updates.length > 0) {
        console.log(pc.yellow(`\n💡 ${updates.length} update(s) available:`));
        updates.forEach((u) => {
          console.log(
            pc.gray(
              `  - ${pc.cyan(u.category)}: ${u.from} -> ${pc.green(u.to)}`,
            ),
          );
        });

        const { updateAll } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'updateAll',
            message:
              'Would you like to update your .skillsrc to the latest versions?',
            default: true,
          },
        ]);

        if (updateAll) {
          for (const u of updates) {
            config.skills[u.category].ref = u.to;
          }

          // Save back to .skillsrc
          await fs.writeFile(configPath, yaml.dump(config));
          console.log(pc.green('✅ .skillsrc updated successfully.\n'));
        }
      } else {
        console.log(pc.gray('✨ All skills are up to date.\n'));
      }
    } catch {
      console.log(
        pc.gray(
          '  (Could not check for updates, proceeding with current versions)',
        ),
      );
    }

    return config;
  }

  private async assembleFromRemote(
    categories: string[],
    config: SkillConfig,
  ): Promise<CollectedSkill[]> {
    const collected: CollectedSkill[] = [];

    // Parse owner and repo from registry URL
    // Expected: https://github.com/owner/repo
    const githubMatch = config.registry.match(/github\.com\/([^/]+)\/([^/]+)/i);
    if (!githubMatch) {
      console.log(
        pc.red(
          'Error: Only GitHub registries are supported for auto-discovery.',
        ),
      );
      return [];
    }

    const [owner, repo] = githubMatch.slice(1);

    // We iterate categories individually to handle versioning (different refs)
    for (const category of categories) {
      const categoryConfig = config.skills[category];
      const ref = categoryConfig.ref || 'main';

      const rawBaseUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/skills/`;
      const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;

      try {
        console.log(
          pc.gray(
            `  - Discovering ${category} skills via GitHub API (${ref})...`,
          ),
        );
        const treeRes = await fetch(treeUrl, {
          headers: { Accept: 'application/vnd.github.v3+json' },
        });

        if (!treeRes.ok) {
          console.log(
            pc.red(
              `    ❌ Failed to fetch ${category}@${ref} (Status: ${treeRes.status}). Skipping.`,
            ),
          );
          continue;
        }

        const treeData = (await treeRes.json()) as GitHubTreeResponse;
        const allFiles = treeData.tree || [];

        // Find all skill folder names first
        const skillFolders = Array.from(
          new Set(
            allFiles
              .filter((f: GitHubTreeItem) =>
                f.path.startsWith(`skills/${category}/`),
              )
              .map((f: GitHubTreeItem) => {
                const parts = f.path.split('/');
                return parts[2]; // skills/category/SKILL_NAME/file.md
              })
              .filter(Boolean),
          ),
        );

        for (const skillFolderName of skillFolders) {
          if (
            categoryConfig.include &&
            !categoryConfig.include.includes(skillFolderName as string)
          )
            continue;
          if (
            categoryConfig.exclude &&
            categoryConfig.exclude.includes(skillFolderName as string)
          )
            continue;

          const skillFiles: { name: string; content: string }[] = [];

          // Find all files belonging to this specific skill
          const skillSourceFiles = allFiles.filter((f: GitHubTreeItem) =>
            f.path.startsWith(`skills/${category}/${skillFolderName}/`),
          );

          for (const fileItem of skillSourceFiles) {
            // Get relative path within the skill folder (e.g., "SKILL.md" or "references/REFERENCE.md")
            const relativePath = fileItem.path.replace(
              `skills/${category}/${skillFolderName}/`,
              '',
            );

            // Only sync supported files and directories based on standard
            const isSupported =
              relativePath === 'SKILL.md' ||
              relativePath.startsWith('references/') ||
              relativePath.startsWith('scripts/') ||
              relativePath.startsWith('assets/');

            if (isSupported && fileItem.type === 'blob') {
              const fileUrl = `${rawBaseUrl}${category}/${skillFolderName}/${relativePath}`;
              const fileRes = await fetch(fileUrl);

              if (fileRes.ok) {
                const content = await fileRes.text();
                skillFiles.push({ name: relativePath, content });
              }
            }
          }

          if (skillFiles.length > 0) {
            collected.push({
              category,
              skill: skillFolderName as string,
              files: skillFiles,
            });
            console.log(
              pc.gray(
                `    + Fetched ${category}/${skillFolderName} (${skillFiles.length} files)`,
              ),
            );
          }
        }
      } catch (error) {
        console.log(
          pc.red(
            `Error: Failed to fetch remote skills for ${category}. ${error}`,
          ),
        );
      }
    } // End category loop

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
        // We do NOT use emptyDir here because we want to preserve user's own custom skills
        await fs.ensureDir(basePath);

        for (const skill of skills) {
          // Use nested structure: category/skill (e.g. flutter/bloc)
          const skillPath = path.join(basePath, skill.category, skill.skill);
          await fs.ensureDir(skillPath);

          for (const fileItem of skill.files) {
            const targetFilePath = path.join(skillPath, fileItem.name);

            // Check if this specific file is in custom_overrides
            // Supports both specific files and entire folders
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
                pc.yellow(`    ⚠️  Skipping overridden item: ${relativePath}`),
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
