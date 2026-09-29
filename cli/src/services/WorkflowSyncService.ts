import path from 'path';
import pc from 'picocolors';
import {
  Agent,
  DEFAULT_WORKFLOWS,
  INTERNAL_ONLY_WORKFLOWS,
  SUPPORTED_AGENTS,
} from '../constants';
import { SkillConfig } from '../models/config';
import { CollectedSkill } from '../models/types';
import { GithubService } from './GithubService';
import { WorkflowTransformer } from './utils/WorkflowTransformer';

import { isOverriddenRel, toPosixRel } from './install/pathMatch';
import { InstallWriter, PassthroughWriter } from './install/OwnershipWriter';
import { ManifestVerifier } from './install/ManifestVerifier';
/**
 * Service responsible for synchronizing agent workflows from a remote registry.
 */
export class WorkflowSyncService {
  constructor(private githubService: GithubService) {}

  /**
   * Reconciles workflows by discovering new ones in the registry and adding them to the config.
   */
  async reconcileWorkflows(
    config: SkillConfig,
    ref: string = 'main',
  ): Promise<boolean> {
    if (config.workflows === false) return false;

    const githubMatch = GithubService.parseGitHubUrl(config.registry);
    if (!githubMatch) return false;

    const { owner, repo } = githubMatch;
    const treeData = await this.githubService.getRepoTree(owner, repo, ref);
    if (!treeData) return false;

    const availableWorkflows = treeData.tree
      .filter((f) => this.isWorkflowMarkdownPath(f.path))
      .map((f) => this.workflowNameFromPath(f.path))
      .filter((wf) => !INTERNAL_ONLY_WORKFLOWS.includes(wf));

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
    } else if (config.workflows === undefined) {
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
    } else if (config.workflows === true) {
      // If it's true, we keep it true to sync everything from the registry.
      // We don't overwrite it with the default list.
      const newWorkflows = availableWorkflows.filter(
        (wf) => !DEFAULT_WORKFLOWS.includes(wf),
      );
      if (newWorkflows.length > 0) {
        console.log(
          pc.cyan(
            `ℹ️  Registry has ${availableWorkflows.length} workflows (including ${newWorkflows.length} non-default). Syncing all because 'workflows: true' is set.`,
          ),
        );
      }
    }

    return changed;
  }

  /**
   * Assembles workflows from the remote registry.
   */
  async assembleWorkflows(
    config: SkillConfig,
    ref: string = 'main',
    verifier?: ManifestVerifier,
  ): Promise<CollectedSkill[]> {
    if (!config.workflows) return [];

    const githubMatch = GithubService.parseGitHubUrl(config.registry);
    if (!githubMatch) return [];

    const { owner, repo } = githubMatch;
    console.log(pc.gray(`  - Discovering workflows (${ref})...`));

    const treeData = await this.githubService.getRepoTree(owner, repo, ref);
    if (!treeData) {
      console.log(pc.red(`    ❌ Failed to fetch workflows@${ref}.`));
      return [];
    }

    const workflowFiles = treeData.tree.filter((f) => {
      if (!this.isWorkflowMarkdownPath(f.path)) return false;
      // Internal-only workflows are never synced to a consumer project, even
      // with `workflows: true` or an explicit entry in the array — they
      // depend on this monorepo's own root tooling and would be non-functional
      // anywhere else.
      if (INTERNAL_ONLY_WORKFLOWS.includes(this.workflowNameFromPath(f.path))) {
        return false;
      }

      if (typeof config.workflows === 'boolean') return config.workflows;
      if (Array.isArray(config.workflows)) {
        return config.workflows.includes(this.workflowNameFromPath(f.path));
      }
      return false;
    });

    const { ok: files, failed } =
      await this.githubService.downloadFilesConcurrent(
        workflowFiles.map((f) => ({
          owner,
          repo,
          ref,
          path: f.path,
          sha: f.sha,
        })),
      );

    const okFiles: typeof files = [];
    for (const f of files) {
      const rejection = verifier?.check(f.path, f.content);
      if (rejection) {
        failed.push({ path: f.path, reason: rejection });
      } else {
        okFiles.push(f);
      }
    }

    for (const failure of failed) {
      console.log(pc.red(`    ❌ ${failure.path} — ${failure.reason}`));
    }

    if (okFiles.length > 0) {
      console.log(pc.gray(`    + Fetched ${okFiles.length} workflows`));
      return [
        {
          category: '.agents',
          skill: 'workflows',
          files: okFiles.map((f) => ({
            name: path.basename(f.path),
            content: f.content,
          })),
        },
      ];
    } else {
      if (workflowFiles.length > 0) {
        console.log(
          pc.red(
            `    ❌ Failed to download ${workflowFiles.length} matched workflows.`,
          ),
        );
      } else {
        console.log(
          pc.gray(`    ℹ️  No matching workflows found in registry.`),
        );
      }
    }

    return [];
  }

  /**
   * Writes collected workflows from `.agents/workflows/*.md` to each active
   * agent's native invocation surface.
   * - Antigravity/Kiro: keep native markdown workflows
   * - Claude/Roo/OpenCode: markdown command files
   * - Gemini: TOML command files
   * - Copilot: prompt files
   * - Cursor/Trae/Codex: skill folders with SKILL.md
   */
  async writeWorkflows(
    workflows: CollectedSkill[],
    config: SkillConfig,
    agents?: Agent[],
    writer: InstallWriter = new PassthroughWriter(),
  ) {
    if (workflows.length === 0) return;

    const overrides = config.custom_overrides || [];
    const targetAgents = agents || [Agent.Antigravity];

    for (const agentId of targetAgents) {
      const agentDef = SUPPORTED_AGENTS.find((a) => a.id === agentId);
      if (!agentDef || agentDef.workflowFormat === 'none') continue;

      const workflowDir = path.join(process.cwd(), agentDef.workflowPath);

      // Calculate relative path from workflow dir to the source workflow files (.agents/workflows)
      // This is used by Gemini (TOML) to reference the canonical markdown source.
      let written = 0;
      for (const wf of workflows) {
        if (wf.skill !== 'workflows') continue;

        for (const fileItem of wf.files) {
          const parsed = WorkflowTransformer.parse({
            name: fileItem.name,
            content: fileItem.content,
          });
          const transformed = WorkflowTransformer.transformParsed(
            parsed,
            agentDef.workflowFormat,
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

          await writer.write(targetFilePath, transformed.content, {
            owner: 'workflow',
            source: `workflow:${fileItem.name.replace(/\.md$/, '')}`,
            agent: agentId,
          });
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

  private isWorkflowMarkdownPath(workflowPath: string): boolean {
    return (
      path.posix.dirname(workflowPath) === '.agents/workflows' &&
      workflowPath.endsWith('.md')
    );
  }

  private workflowNameFromPath(workflowPath: string): string {
    return path.basename(workflowPath, '.md');
  }

  private isOverridden(targetPath: string, overrides: string[]): boolean {
    return isOverriddenRel(this.normalizePath(targetPath), overrides);
  }

  private normalizePath(p: string): string {
    return toPosixRel(process.cwd(), p);
  }
}
