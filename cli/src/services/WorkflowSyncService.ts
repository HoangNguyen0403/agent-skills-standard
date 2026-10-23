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
import { SHARED_WORKFLOW_AGENT, sha256 } from './LockfileService';
import { WorkflowTransformer } from './utils/WorkflowTransformer';

import { isOverriddenRel, toPosixRel } from './install/pathMatch';
import { InstallWriter, PassthroughWriter } from './install/OwnershipWriter';
import { ManifestVerifier } from './install/ManifestVerifier';

export type WorkflowAcquisitionStatus = 'complete' | 'disabled' | 'incomplete';

export interface WorkflowAcquisitionFailure {
  path: string;
  reason: string;
}

/**
 * Explicit outcome of workflow acquisition. `incomplete` must never be treated
 * as "the desired set is empty": absence-based deletion is only allowed for
 * `complete` and deliberate `disabled` selections.
 */
export interface WorkflowAcquisition {
  status: WorkflowAcquisitionStatus;
  workflows: CollectedSkill[];
  failures: WorkflowAcquisitionFailure[];
}

export interface PlannedWorkflowBinding {
  name: string;
  agent: Agent;
  /** Project-relative native output path. */
  path: string;
  /** Digest of the deterministic generated export. */
  outputDigest: string;
  /** Digest of the canonical body that generated the export. */
  canonicalDigest: string;
}

export interface PlannedWorkflowCanonical {
  name: string;
  /** Project-relative canonical path. */
  path: string;
  digest: string;
}

/**
 * What the writer attempted for this run. Publication still re-reads the bytes
 * from disk, because an ownership write may have preserved a user edit.
 */
export interface WorkflowWriteResult {
  canonical: PlannedWorkflowCanonical[];
  bindings: PlannedWorkflowBinding[];
}

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
   * Assembles workflows from the remote registry. Kept for callers that only
   * need the collected files; new callers must use `acquireWorkflows` so an
   * incomplete fetch is distinguishable from a deliberate empty selection.
   */
  async assembleWorkflows(
    config: SkillConfig,
    ref: string = 'main',
    verifier?: ManifestVerifier,
  ): Promise<CollectedSkill[]> {
    return (await this.acquireWorkflows(config, ref, verifier)).workflows;
  }

  /**
   * Acquires the selected canonical workflows and reports whether the desired
   * set is complete. Partial discovery/download/integrity failures are
   * `incomplete` and never authorize absence-based pruning.
   */
  async acquireWorkflows(
    config: SkillConfig,
    ref: string = 'main',
    verifier?: ManifestVerifier,
  ): Promise<WorkflowAcquisition> {
    if (config.workflows === false || config.workflows === undefined) {
      return { status: 'disabled', workflows: [], failures: [] };
    }
    if (Array.isArray(config.workflows) && config.workflows.length === 0) {
      return { status: 'disabled', workflows: [], failures: [] };
    }

    const githubMatch = GithubService.parseGitHubUrl(config.registry);
    if (!githubMatch) {
      return {
        status: 'incomplete',
        workflows: [],
        failures: [
          {
            path: 'registry',
            reason: `Unsupported registry URL '${config.registry}'.`,
          },
        ],
      };
    }

    const { owner, repo } = githubMatch;
    console.log(pc.gray(`  - Discovering workflows (${ref})...`));

    const treeData = await this.githubService.getRepoTree(owner, repo, ref);
    if (!treeData) {
      console.log(pc.red(`    ❌ Failed to fetch workflows@${ref}.`));
      return {
        status: 'incomplete',
        workflows: [],
        failures: [
          { path: 'workflows', reason: `Failed to fetch workflows@${ref}.` },
        ],
      };
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

    // A successfully discovered tree with no matching files is a complete
    // empty set (including a selected workflow that was removed upstream).
    if (workflowFiles.length === 0) {
      console.log(pc.gray(`    ℹ️  No matching workflows found in registry.`));
      return { status: 'complete', workflows: [], failures: [] };
    }

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

    const status: WorkflowAcquisitionStatus =
      failed.length > 0 ? 'incomplete' : 'complete';
    if (okFiles.length === 0) {
      if (failed.length === 0) {
        console.log(
          pc.gray(`    ℹ️  No matching workflows found in registry.`),
        );
      }
      return {
        status,
        workflows: [],
        failures: failed.map((f) => ({ path: f.path, reason: f.reason })),
      };
    }

    console.log(pc.gray(`    + Fetched ${okFiles.length} workflows`));
    return {
      status,
      failures: failed.map((f) => ({ path: f.path, reason: f.reason })),
      workflows: [
        {
          category: '.agents',
          skill: 'workflows',
          files: okFiles.map((f) => ({
            name: path.basename(f.path),
            content: f.content,
          })),
        },
      ],
    };
  }

  /**
   * Installs each selected canonical workflow once at `.agents/workflows/*.md`
   * and derives every native export from the same collected content.
   * - Antigravity/Kiro: canonical markdown path (native == canonical)
   * - Claude/Roo/OpenCode: markdown command files
   * - Gemini: TOML command files
   * - Copilot: prompt files
   * - Cursor/Trae/Codex: skill folders with SKILL.md
   */
  async writeWorkflows(
    workflows: CollectedSkill[],
    config: SkillConfig,
    agents?: Agent[],
    writer: InstallWriter = new PassthroughWriter(process.cwd()),
  ): Promise<WorkflowWriteResult> {
    const result: WorkflowWriteResult = { canonical: [], bindings: [] };
    if (workflows.length === 0) return result;

    const overrides = config.custom_overrides || [];
    const targetAgents = agents || [Agent.Antigravity];
    // One physical write per path; every provider that aliases it still keeps
    // its own binding record so uninstall/prune ownership is complete.
    const writtenDigests = new Map<string, string>();
    const canonicalDir = path.join(process.cwd(), '.agents', 'workflows');

    // Canonical pass: the shared installed catalog, independent of provider.
    for (const wf of workflows) {
      if (wf.skill !== 'workflows') continue;
      for (const fileItem of wf.files) {
        if (path.basename(fileItem.name) !== fileItem.name) {
          console.log(
            pc.red(
              `    ❌ Security Error: workflow file names must be flat (${fileItem.name})`,
            ),
          );
          continue;
        }
        const workflowName = fileItem.name.replace(/\.md$/, '');
        const canonicalPath = path.join(canonicalDir, fileItem.name);
        if (!this.isPathSafe(canonicalPath, canonicalDir)) {
          console.log(
            pc.red(`    ❌ Security Error: Invalid path ${canonicalPath}`),
          );
          continue;
        }
        if (this.isOverridden(canonicalPath, overrides)) continue;

        await writer.write(canonicalPath, fileItem.content, {
          owner: 'workflow',
          source: `workflow:${workflowName}`,
          agent: SHARED_WORKFLOW_AGENT,
        });
        const canonicalDigest = sha256(fileItem.content);
        writtenDigests.set(canonicalPath, canonicalDigest);
        result.canonical.push({
          name: workflowName,
          path: this.normalizePath(canonicalPath),
          digest: canonicalDigest,
        });
      }
    }

    for (const agentId of targetAgents) {
      const agentDef = SUPPORTED_AGENTS.find((a) => a.id === agentId);
      if (!agentDef || agentDef.workflowFormat === 'none') continue;

      const workflowDir = path.join(process.cwd(), agentDef.workflowPath);
      let written = 0;
      for (const wf of workflows) {
        if (wf.skill !== 'workflows') continue;

        for (const fileItem of wf.files) {
          const workflowName = fileItem.name.replace(/\.md$/, '');
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
          if (this.isOverridden(targetFilePath, overrides)) continue;

          const outputDigest = sha256(transformed.content);
          const existingDigest = writtenDigests.get(targetFilePath);
          if (existingDigest === undefined) {
            await writer.write(targetFilePath, transformed.content, {
              owner: 'workflow',
              source: `workflow:${workflowName}`,
              agent: agentId,
            });
            writtenDigests.set(targetFilePath, outputDigest);
            written++;
          } else if (existingDigest !== outputDigest) {
            // Two surfaces map to one path but disagree on bytes; refuse to
            // certify either alias instead of picking a winner silently.
            console.log(
              pc.red(
                `    ❌ Conflicting same-path native outputs for ${targetFilePath}`,
              ),
            );
            continue;
          }

          result.bindings.push({
            name: workflowName,
            agent: agentId,
            path: this.normalizePath(targetFilePath),
            outputDigest,
            canonicalDigest: sha256(fileItem.content),
          });
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

    return result;
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
