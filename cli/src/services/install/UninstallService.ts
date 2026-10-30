import fs from 'fs-extra';
import path from 'path';
import { Agent, getAgentDefinition } from '../../constants';
import { SkillConfig } from '../../models/config';
import { HookService } from '../HookService';
import {
  LOCKFILE_NAME,
  LockfileService,
  ManifestEntry,
  sha256,
  type SkillsLockFile,
  type WorkflowCatalog,
} from '../LockfileService';
import { McpConfigService } from '../McpConfigService';
import { MarkdownUtils } from '../utils/MarkdownUtils';
import { BackupService, BackupSession } from './BackupService';
import { removeEmptyParents } from './fsUtil';

export interface UninstallSelection {
  all?: boolean;
  agents?: Agent[];
  categories?: string[];
}

export interface UninstallPlan {
  remove: string[]; // owned, unchanged -> delete
  keepEdited: string[]; // owned, edited -> leave, drop from manifest
  missing: string[]; // owned, already gone -> drop from manifest
  sharedKept: string[]; // path also owned by an unselected agent -> leave, keep entry
  /** Agents whose native workflow bindings are being removed by this plan. */
  removedAgents?: Agent[];
  integrations: {
    mcpAgents: Agent[];
    hookAgents: Agent[];
    clearAgentsIndex: boolean;
  };
  deleteLock: boolean; // true when --all
}

export interface UninstallDeps {
  mcpUninstall(rootDir: string, agents: Agent[]): Promise<void>;
  hooksUninstall(rootDir: string, agents: Agent[]): Promise<void>;
  clearAgentsIndex(rootDir: string): Promise<void>;
}

function categoryOf(source: string): string {
  return source
    .replace(/^(skill|index):/, '')
    .split('/')[0]
    .split('@')[0];
}

/**
 * A generation ledger grants authority only when it owns at least one path.
 * Plan and apply must agree on this: an empty ledger is no authority.
 */
function hasGenerationAuthority(
  lock: Pick<SkillsLockFile, 'generation'> | null | undefined,
): boolean {
  return Boolean(
    lock?.generation && Object.keys(lock.generation.entries).length > 0,
  );
}

/** Whether the generation ledger owns the root AGENTS.md router index. */
function ownsAgentsIndex(
  lock: Pick<SkillsLockFile, 'generation'> | null | undefined,
): boolean {
  return lock?.generation?.entries['AGENTS.md'] !== undefined;
}

export class UninstallService {
  private deps: UninstallDeps;
  private lockfile: LockfileService;
  private backups: BackupService;

  constructor(
    deps?: UninstallDeps,
    lockfile?: LockfileService,
    backups?: BackupService,
  ) {
    this.deps = deps || {
      mcpUninstall: async (rootDir, agents) => {
        await new McpConfigService().uninstall({
          rootDir,
          agents,
          from: 'project',
        });
      },
      hooksUninstall: async (rootDir, agents) => {
        await new HookService().uninstall({ rootDir, agents });
      },
      clearAgentsIndex: async (rootDir) => {
        await MarkdownUtils.injectIndex(rootDir, ['AGENTS.md'], '');
      },
    };
    this.lockfile = lockfile || new LockfileService();
    this.backups = backups || new BackupService();
  }

  async plan(
    rootDir: string,
    config: SkillConfig,
    selection: UninstallSelection,
  ): Promise<UninstallPlan> {
    const hasAll = !!selection.all;
    const hasAgents = !!(selection.agents && selection.agents.length > 0);
    const hasCategories = !!(
      selection.categories && selection.categories.length > 0
    );

    if (!hasAll && !hasAgents && !hasCategories) {
      throw new Error(
        'Choose --all, --agent <agent>, or --category <category>',
      );
    }

    if (hasAll && (hasAgents || hasCategories)) {
      throw new Error('--all cannot be combined with --agent or --category');
    }

    const { lock } = await this.lockfile.load(rootDir, config.agents || []);

    if (!lock) {
      return {
        remove: [],
        keepEdited: [],
        missing: [],
        sharedKept: [],
        removedAgents: [],
        integrations: {
          mcpAgents: [],
          hookAgents: [],
          clearAgentsIndex: false,
        },
        deleteLock: false,
      };
    }

    const integrations = {
      mcpAgents: hasAll
        ? config.agents || []
        : hasAgents && !hasCategories
          ? selection.agents || []
          : [],
      hookAgents: hasAll
        ? config.agents || []
        : hasAgents && !hasCategories
          ? selection.agents || []
          : [],
      clearAgentsIndex: hasAll && !ownsAgentsIndex(lock),
    };
    const deleteLock = hasAll && !hasGenerationAuthority(lock);

    const remove: string[] = [];
    const keepEdited: string[] = [];
    const missing: string[] = [];
    const sharedKept: string[] = [];

    const unselectedConfiguredAgents = (config.agents || []).filter(
      (a) => !selection.agents?.includes(a),
    );

    for (const [rel, entry] of Object.entries(lock.entries)) {
      let candidate = false;

      if (hasAll) {
        candidate = true;
      } else if (hasAgents && !hasCategories) {
        candidate = selection.agents!.includes(entry.agent as Agent);
      } else if (hasCategories && !hasAgents) {
        candidate =
          (entry.owner === 'skill' || entry.owner === 'index') &&
          selection.categories!.includes(categoryOf(entry.source));
      } else if (hasAgents && hasCategories) {
        candidate =
          selection.agents!.includes(entry.agent as Agent) &&
          (entry.owner === 'skill' || entry.owner === 'index') &&
          selection.categories!.includes(categoryOf(entry.source));
      }

      if (!candidate) continue;

      // Check if path is shared with an unselected configured agent
      if (hasAgents && !hasAll && unselectedConfiguredAgents.length > 0) {
        const entryAgent = entry.agent as Agent;
        const entryDef = getAgentDefinition(entryAgent);
        let isShared = false;

        if (entryDef) {
          for (const other of unselectedConfiguredAgents) {
            const otherDef = getAgentDefinition(other);
            if (!otherDef) continue;
            if (
              entry.owner === 'workflow' &&
              otherDef.workflowPath === entryDef.workflowPath
            ) {
              isShared = true;
              break;
            }
          }
        }

        if (isShared) {
          sharedKept.push(rel);
          continue;
        }
      }

      const absPath = path.join(rootDir, rel);
      if (!(await fs.pathExists(absPath))) {
        missing.push(rel);
        continue;
      }

      const content = await fs.readFile(absPath);
      if (sha256(content) === entry.sha256) {
        remove.push(rel);
      } else {
        keepEdited.push(rel);
      }
    }

    // Partial agent removal: the shared canonical body survives while any
    // verified or expected native binding still belongs to a survivor.
    const removedAgents = hasAgents ? [...selection.agents!] : [];
    if (hasAgents && !hasCategories && lock.workflowCatalog) {
      for (const wf of Object.values(lock.workflowCatalog.workflows)) {
        const hasSurvivingConsumer = [
          ...wf.nativeBindings,
          ...(wf.nativeConflicts ?? []),
        ].some((consumer) => !removedAgents.includes(consumer.agent as Agent));
        if (hasSurvivingConsumer) continue;
        const rel = wf.path;
        if (
          remove.includes(rel) ||
          keepEdited.includes(rel) ||
          missing.includes(rel)
        ) {
          continue;
        }
        const absPath = path.join(rootDir, rel);
        if (!(await fs.pathExists(absPath))) {
          missing.push(rel);
          continue;
        }
        const entry = lock.entries[rel];
        const content = await fs.readFile(absPath);
        if (entry && sha256(content) === entry.sha256) {
          remove.push(rel);
        } else {
          keepEdited.push(rel);
        }
      }
    }

    return {
      remove: remove.sort(),
      keepEdited: keepEdited.sort(),
      missing: missing.sort(),
      sharedKept: sharedKept.sort(),
      removedAgents,
      integrations,
      deleteLock,
    };
  }

  async apply(
    rootDir: string,
    config: SkillConfig,
    plan: UninstallPlan,
  ): Promise<{ removed: string[]; backupId: string | null }> {
    const { lock: currentLock } = await this.lockfile.load(
      rootDir,
      config.agents || [],
    );
    if (plan.deleteLock && hasGenerationAuthority(currentLock)) {
      throw new Error(
        'Uninstall plan is stale: repository-generation authority now exists',
      );
    }
    if (plan.integrations.clearAgentsIndex && ownsAgentsIndex(currentLock)) {
      throw new Error(
        'Uninstall plan is stale: AGENTS.md generation authority now exists',
      );
    }

    let backupId: string | null = null;
    const needsBackup = plan.remove.length > 0 || plan.deleteLock;
    let session: BackupSession | null = null;

    if (needsBackup) {
      session = await this.backups.begin(rootDir, 'uninstall');
      for (const rel of plan.remove) {
        await session.add(rel);
      }
      await session.add(LOCKFILE_NAME);
    }

    for (const rel of plan.remove) {
      const absPath = path.join(rootDir, rel);
      if (await fs.pathExists(absPath)) {
        await fs.remove(absPath);
        await removeEmptyParents(rootDir, path.dirname(absPath));
      }
    }

    if (plan.integrations.mcpAgents.length > 0) {
      await this.deps.mcpUninstall(rootDir, plan.integrations.mcpAgents);
    }
    if (plan.integrations.hookAgents.length > 0) {
      await this.deps.hooksUninstall(rootDir, plan.integrations.hookAgents);
    }
    if (plan.integrations.clearAgentsIndex) {
      await this.deps.clearAgentsIndex(rootDir);
    }

    if (plan.deleteLock) {
      const lockPath = path.join(rootDir, LOCKFILE_NAME);
      if (await fs.pathExists(lockPath)) {
        await fs.remove(lockPath);
      }
    } else {
      const { lock } = await this.lockfile.load(rootDir, config.agents || []);
      if (lock) {
        const dropSet = new Set([
          ...plan.remove,
          ...plan.missing,
          ...plan.keepEdited,
        ]);
        const newEntries: Record<string, ManifestEntry> = {};
        for (const [k, v] of Object.entries(lock.entries)) {
          if (!dropSet.has(k)) {
            newEntries[k] = v;
          }
        }
        lock.entries = newEntries;
        if (lock.workflowCatalog) {
          const removedAgents = new Set(plan.removedAgents ?? []);
          const workflows: WorkflowCatalog['workflows'] = {};
          let changed = false;
          for (const [name, wf] of Object.entries(
            lock.workflowCatalog.workflows,
          )) {
            if (dropSet.has(wf.path)) {
              changed = true;
              continue;
            }
            const nativeBindings = wf.nativeBindings.filter(
              (binding) =>
                !dropSet.has(binding.path) &&
                !removedAgents.has(binding.agent as Agent),
            );
            const nativeConflicts = (wf.nativeConflicts ?? []).filter(
              (conflict) =>
                !dropSet.has(conflict.path) &&
                !removedAgents.has(conflict.agent as Agent),
            );
            if (
              nativeBindings.length !== wf.nativeBindings.length ||
              nativeConflicts.length !== (wf.nativeConflicts ?? []).length
            ) {
              changed = true;
            }
            if (nativeBindings.length === 0 && nativeConflicts.length === 0) {
              changed = true;
              continue;
            }
            workflows[name] = { ...wf, nativeBindings, nativeConflicts };
          }
          if (changed) {
            lock.workflowCatalog = { version: 1, workflows };
          }
        }
        await this.lockfile.write(rootDir, lock);
      }
    }

    if (session) {
      backupId = await session.commit();
    }

    return { removed: plan.remove, backupId };
  }
}
