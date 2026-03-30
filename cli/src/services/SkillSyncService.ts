import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';
import { Agent, SUPPORTED_AGENTS } from '../constants';
import { SkillConfig, SkillEntry } from '../models/config';
import { CollectedSkill, GitHubTreeItem } from '../models/types';
import { GithubService } from './GithubService';

/**
 * Service responsible for synchronizing agent skills from a remote registry.
 */
export class SkillSyncService {
  constructor(private githubService: GithubService) {}

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
  async writeSkills(
    skills: CollectedSkill[],
    config: SkillConfig,
    agents: Agent[],
  ) {
    const overrides = config.custom_overrides || [];

    // Group skills by category to know which folders to prune
    const fetchedSkillsByCategory: Record<string, Set<string>> = {};
    for (const skill of skills) {
      if (!fetchedSkillsByCategory[skill.category]) {
        fetchedSkillsByCategory[skill.category] = new Set();
      }
      fetchedSkillsByCategory[skill.category].add(skill.skill);
    }

    for (const agentId of agents) {
      const agentDef = SUPPORTED_AGENTS.find((a) => a.id === agentId);
      if (!agentDef || !agentDef.path) continue;

      const basePath = agentDef.path;
      await fs.ensureDir(basePath);

      // Clean up orphaned skills inside categories we are syncing
      // Default to prune: true if not specified
      const shouldPrune = config.prune !== false;

      if (shouldPrune) {
        for (const category of Object.keys(fetchedSkillsByCategory)) {
          const categoryPath = path.join(basePath, category);
          if (await fs.pathExists(categoryPath)) {
            const existingDirs = await fs.readdir(categoryPath);
            for (const dir of existingDirs) {
              // If the folder is not in the newly fetched list, it might be orphaned
              if (!fetchedSkillsByCategory[category].has(dir)) {
                const fullPath = path.join(categoryPath, dir);
                // Do not delete if it's protected by custom_overrides
                if (!this.isOverridden(fullPath, overrides)) {
                  await fs.remove(fullPath);
                }
              }
            }
          }
        }
      }

      for (const skill of skills) {
        await this.writeSkillForAgent(agentId, skill, overrides, basePath);
      }
      console.log(pc.gray(`  - Updated ${basePath}/ (${agentDef.name})`));
    }
  }

  private async writeSkillForAgent(
    agentId: string,
    skill: CollectedSkill,
    overrides: string[],
    basePath: string,
  ) {
    const isKiro = agentId === Agent.Kiro;
    const kiroFolder = `${skill.category}-${skill.skill}`;
    const skillPath = isKiro
      ? path.join(basePath, kiroFolder)
      : path.join(basePath, skill.category, skill.skill);

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

      let content = fileItem.content;
      if (isKiro && fileItem.name === 'SKILL.md') {
        content = this.transformSkillForKiro(content, skill.category);
      }

      await fs.outputFile(targetFilePath, content);
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
    const [sourceCat, skillName] = absOrRelSkill.includes('/')
      ? absOrRelSkill.split('/')
      : [category, absOrRelSkill];

    const prefix = `skills/${sourceCat}/${skillName}/`;
    const skillSourceFiles = tree.filter(
      (f) => f.path.startsWith(prefix) && f.type === 'blob',
    );

    const downloadTasks = skillSourceFiles
      .filter((f) => {
        const rel = f.path.replace(prefix, '');
        return rel === 'SKILL.md' || /^(references|scripts|assets)\//.test(rel);
      })
      .map((f) => ({ owner, repo, ref, path: f.path }));

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
        name: f.path.replace(prefix, ''),
        content: f.content,
      })),
    };
  }

  private identifyFoldersToSync(
    category: string,
    catConfig: SkillEntry,
    tree: GitHubTreeItem[],
  ): string[] {
    const skillFolders = new Set(
      tree
        .filter((f) => f.path.startsWith(`skills/${category}/`))
        .map((f) => f.path.split('/')[2])
        .filter(Boolean),
    );

    const folders = Array.from(skillFolders).filter((folder) => {
      if (catConfig.include && !catConfig.include.includes(folder))
        return false;
      if (catConfig.exclude && catConfig.exclude.includes(folder)) return false;
      return true;
    });

    if (catConfig.include) {
      catConfig.include
        .filter((i) => i.includes('/'))
        .forEach((absSkill) =>
          this.expandAbsoluteInclude(absSkill, folders, tree),
        );
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
      const catSkills = new Set(
        tree
          .filter((f) => f.path.startsWith(`skills/${targetCat}/`))
          .map((f) => f.path.split('/')[2])
          .filter(Boolean),
      );

      catSkills.forEach((s) => {
        const fullPath = `${targetCat}/${s}`;
        if (!folders.includes(fullPath)) folders.push(fullPath);
      });
    } else if (!folders.includes(absSkill)) {
      if (
        tree.some((f) =>
          f.path.startsWith(`skills/${targetCat}/${targetSkill}/`),
        )
      ) {
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

  private transformSkillForKiro(content: string, category: string): string {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return content;

    const [fullMatch, frontmatter] = frontmatterMatch;
    const body = content.slice(fullMatch.length);

    const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1].trim() || '';
    const description =
      frontmatter.match(/^description:\s*(.+)$/m)?.[1].trim() || '';
    const displayName = `${category.charAt(0).toUpperCase() + category.slice(1)} - ${name}`;

    return `---\nname: ${displayName}\ndescription: ${description}\n---` + body;
  }

  private isOverridden(targetPath: string, overrides: string[]): boolean {
    const rel = this.normalizePath(targetPath);
    return overrides.some((o) => {
      const op = o.replace(/\\/g, '/').replace(/\/$/, '');
      return (
        rel === op ||
        rel.startsWith(`${op}/`) ||
        rel.includes(`/${op}/`) ||
        rel.endsWith(`/${op}`)
      );
    });
  }

  private isPathSafe(targetPath: string, skillPath: string): boolean {
    const resolvedBase = path.resolve(skillPath) + path.sep;
    return path.resolve(targetPath).startsWith(resolvedBase);
  }

  private normalizePath(p: string): string {
    return path.relative(process.cwd(), p).replace(/\\/g, '/');
  }
}
