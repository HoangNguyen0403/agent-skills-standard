import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';
import { Agent, DEFAULT_WORKFLOWS, SUPPORTED_AGENTS } from '../constants';
import { SkillConfig } from '../models/config';
import { CollectedSkill } from '../models/types';
import { GithubService } from './GithubService';
import { WorkflowTransformer } from './utils/WorkflowTransformer';

/**
 * Service responsible for synchronizing agent workflows from a remote registry.
 */
export class WorkflowSyncService {
  constructor(private githubService: GithubService) { }

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
        (f) => f.path.startsWith('.agents/workflows/') && f.path.endsWith('.md'),
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
      if (!f.path.startsWith('.agents/workflows/') || !f.path.endsWith('.md'))
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
          category: '.agents',
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
   * Writes collected workflows to each active agent's native format.
    * - Antigravity/Kiro: .agents/workflows/*.md (native)
   * - Claude/Gemini: .<agent>/agents/workflow-*.md (agent definition)
   * - Cursor/Windsurf/Trae: .<agent>/rules/workflow-*.mdc (rule)
   * - Copilot: .github/instructions/workflow-*.instructions.md (instruction)
   */
  async writeWorkflows(
    workflows: CollectedSkill[],
    config: SkillConfig,
    agents?: Agent[],
  ) {
    if (workflows.length === 0) return;

    const overrides = config.custom_overrides || [];
    const targetAgents = agents || [Agent.Antigravity];

    for (const agentId of targetAgents) {
      const agentDef = SUPPORTED_AGENTS.find((a) => a.id === agentId);
      if (!agentDef || agentDef.workflowFormat === 'none') continue;

      const workflowDir = path.join(process.cwd(), agentDef.workflowPath);
      await fs.ensureDir(workflowDir);

      // Calculate relative path from workflow dir to skills dir
      const skillsDir = path.join(process.cwd(), agentDef.path);
      const skillsRelative = path.relative(workflowDir, skillsDir);

      let written = 0;
      for (const wf of workflows) {
        if (wf.skill !== 'workflows') continue;

        for (const fileItem of wf.files) {
          const transformed = WorkflowTransformer.transform(
            { name: fileItem.name, content: fileItem.content },
            agentDef.workflowFormat,
            skillsRelative,
          );
          if (!transformed) continue;

          let targetFilePath: string;
          if (agentDef.workflowFormat === 'skill') {
            const workflowName = fileItem.name.replace(/\.md$/, '');
            targetFilePath = path.join(
              workflowDir,
              workflowName,
              transformed.name,
            );
          } else {
            targetFilePath = path.join(workflowDir, transformed.name);
          }

          if (!this.isPathSafe(targetFilePath, workflowDir)) {
            console.log(
              pc.red(`    ❌ Security Error: Invalid path ${targetFilePath}`),
            );
            continue;
          }

          if (this.isOverridden(targetFilePath, overrides)) {
            continue;
          }

          await fs.outputFile(targetFilePath, transformed.content);
          written++;
        }
      }

      if (written > 0) {
        console.log(
          pc.green(
            `  ✅ ${written} workflows synced to ${agentDef.workflowPath}/ (${agentDef.name})`,
          ),
        );
      }
    }
  }

  private isPathSafe(targetPath: string, subPath: string): boolean {
    const resolvedBase = path.resolve(subPath) + path.sep;
    return path.resolve(targetPath).startsWith(resolvedBase);
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
