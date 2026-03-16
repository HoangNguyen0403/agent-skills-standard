import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';
import { DEFAULT_WORKFLOWS } from '../constants';
import { SkillConfig } from '../models/config';
import { CollectedSkill } from '../models/types';
import { GithubService } from './GithubService';

/**
 * Service responsible for synchronizing agent workflows from a remote registry.
 */
export class WorkflowSyncService {
  constructor(private githubService: GithubService) {}

  /**
   * Reconciles workflows by discovering new ones in the registry and adding them to the config.
   */
  async reconcileWorkflows(config: SkillConfig): Promise<boolean> {
    if (config.workflows === false) return false;

    const githubMatch = GithubService.parseGitHubUrl(config.registry);
    if (!githubMatch) return false;

    const { owner, repo } = githubMatch;
    const ref =
      (await this.githubService.getRepoInfo(owner, repo))?.default_branch ||
      'main';

    const treeData = await this.githubService.getRepoTree(owner, repo, ref);
    if (!treeData) return false;

    const availableWorkflows = treeData.tree
      .filter(
        (f) => f.path.startsWith('.agent/workflows/') && f.path.endsWith('.md'),
      )
      .map((f) => path.basename(f.path, '.md'));

    if (availableWorkflows.length === 0) return false;

    let changed = false;

    if (Array.isArray(config.workflows)) {
      const currentWorkflows = config.workflows as string[];
      const newWorkflows = availableWorkflows.filter(
        (wf) =>
          !currentWorkflows.includes(wf) && DEFAULT_WORKFLOWS.includes(wf),
      );

      if (newWorkflows.length > 0) {
        config.workflows = [...currentWorkflows, ...newWorkflows];
        console.log(
          pc.yellow(
            `✨ Workflows Discovered: Adding [${newWorkflows.join(', ')}] to .skillsrc.`,
          ),
        );
        changed = true;
      }
    } else if (config.workflows === undefined || config.workflows === true) {
      const defaultWorkflows = availableWorkflows.filter((wf) =>
        DEFAULT_WORKFLOWS.includes(wf),
      );
      config.workflows = defaultWorkflows;
      console.log(
        pc.yellow(
          `✨ Workflows Initialized: Adding [${defaultWorkflows.join(', ')}] to .skillsrc.`,
        ),
      );
      changed = true;
    }

    return changed;
  }

  /**
   * Assembles workflows from the remote registry.
   */
  async assembleWorkflows(config: SkillConfig): Promise<CollectedSkill[]> {
    if (!config.workflows) return [];

    const githubMatch = GithubService.parseGitHubUrl(config.registry);
    if (!githubMatch) return [];

    const { owner, repo } = githubMatch;
    const ref =
      (await this.githubService.getRepoInfo(owner, repo))?.default_branch ||
      'main';

    console.log(pc.gray(`  - Discovering workflows (${ref})...`));

    const treeData = await this.githubService.getRepoTree(owner, repo, ref);
    if (!treeData) {
      console.log(pc.red(`    ❌ Failed to fetch workflows@${ref}.`));
      return [];
    }

    const workflowFiles = treeData.tree.filter((f) => {
      if (!f.path.startsWith('.agent/workflows/') || !f.path.endsWith('.md'))
        return false;

      if (typeof config.workflows === 'boolean') return config.workflows;
      if (Array.isArray(config.workflows)) {
        return config.workflows.includes(path.basename(f.path, '.md'));
      }
      return false;
    });

    const files = await this.githubService.downloadFilesConcurrent(
      workflowFiles.map((f) => ({ owner, repo, ref, path: f.path })),
    );

    if (files.length > 0) {
      console.log(pc.gray(`    + Fetched ${files.length} workflows`));
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
  async writeWorkflows(workflows: CollectedSkill[], config: SkillConfig) {
    if (workflows.length === 0) return;

    const workflowPath = path.join(process.cwd(), '.agent', 'workflows');
    const overrides = config.custom_overrides || [];
    await fs.ensureDir(workflowPath);

    for (const wf of workflows) {
      if (wf.skill !== 'workflows') continue;

      for (const fileItem of wf.files) {
        const targetFilePath = path.join(workflowPath, fileItem.name);

        if (!this.isPathSafe(targetFilePath, workflowPath)) {
          console.log(
            pc.red(`    ❌ Security Error: Invalid path ${fileItem.name}`),
          );
          continue;
        }

        if (this.isOverridden(targetFilePath, overrides)) {
          console.log(
            pc.yellow(
              `    ⚠️  Skipping overridden: ${this.normalizePath(targetFilePath)}`,
            ),
          );
          continue;
        }

        await fs.outputFile(targetFilePath, fileItem.content);
        console.log(pc.gray(`    + Wrote ${fileItem.name}`));
      }
    }
    console.log(pc.green(`  ✅ Workflows synced to .agent/workflows/`));
  }

  private isPathSafe(targetPath: string, subPath: string): boolean {
    return path.resolve(targetPath).startsWith(path.resolve(subPath));
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

  private normalizePath(p: string): string {
    return path.relative(process.cwd(), p).replace(/\\/g, '/');
  }
}
