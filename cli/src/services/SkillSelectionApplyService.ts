import path from 'path';
import { SkillConfig } from '../models/config';
import { CollectedSkill } from '../models/types';
import { ConfigService, ConfigSnapshot } from './ConfigService';
import { InstallPlan } from './install/OwnershipWriter';
import { ResolvedRefs } from './install/RefResolver';
import { SkillAssemblyError } from './SkillSyncService';
import { skillSelectionFingerprint } from './SkillSelectionService';
import { SyncService } from './SyncService';

/**
 * Fully prepared skill-selection change. Preparation resolves every selected
 * category ref to an explicit commit, assembles every package in memory, and
 * writes nothing. `config` already carries the `skills_mode` the manager
 * persists for a real selection change.
 */
export interface PreparedSkillChange {
  snapshot: ConfigSnapshot;
  config: SkillConfig;
  skills: CollectedSkill[];
  completedCategories: string[];
  resolvedRefs: ResolvedRefs;
}

export type SkillApplyResult =
  | { status: 'complete'; snapshot: ConfigSnapshot; plan: InstallPlan }
  | {
      status: 'incomplete';
      stage: 'saving' | 'installing';
      saved: boolean;
      snapshot: ConfigSnapshot;
      message: string;
    };

export interface SkillSelectionApplyDeps {
  configService?: ConfigService;
  syncService?: SyncService;
}

/**
 * Applies a reviewed skill-selection change: saves the desired configuration
 * and runs a scoped, source-commit-bound skill installation with index and
 * lock finalization. Workflows, specialists, MCP, hooks, and user-home
 * runtime configuration are outside this scope and are never touched.
 */
export class SkillSelectionApplyService {
  private configService: ConfigService;
  private syncService: SyncService;

  constructor(deps: SkillSelectionApplyDeps = {}) {
    this.configService = deps.configService ?? new ConfigService();
    this.syncService = deps.syncService ?? new SyncService();
  }

  /**
   * Validates the proposed selection and assembles every package without
   * mutating the project. Throws on any catalog, ref, tree, package, or
   * manifest failure; a failure can therefore never be mistaken for an empty
   * selection.
   */
  async prepare(
    snapshot: ConfigSnapshot,
    proposed: SkillConfig,
  ): Promise<PreparedSkillChange> {
    const selection = proposed.skills ?? {};
    const previousSelection = snapshot.config.skills ?? {};

    for (const [category, entry] of Object.entries(selection)) {
      const candidate = entry as {
        ref?: unknown;
        include?: unknown;
        exclude?: unknown;
      };
      const validLists = [candidate?.include, candidate?.exclude].every(
        (value) =>
          value === undefined ||
          (Array.isArray(value) &&
            value.every((item) => typeof item === 'string')),
      );
      if (
        !candidate ||
        typeof candidate !== 'object' ||
        !validLists ||
        (candidate.ref !== undefined && typeof candidate.ref !== 'string')
      ) {
        throw new SkillAssemblyError([`${category} (invalid selection)`]);
      }
      const isNew = !Object.prototype.hasOwnProperty.call(
        previousSelection,
        category,
      );
      if (isNew && !entry?.ref) {
        throw new SkillAssemblyError([`${category} (no resolved release ref)`]);
      }
    }

    const selectionChanged =
      skillSelectionFingerprint(previousSelection) !==
      skillSelectionFingerprint(selection);
    const config: SkillConfig = {
      ...proposed,
      skills: selection,
      // A real applied change pins explicit selection so later ordinary sync
      // cannot re-detect a removed category. No-op review never reaches apply.
      skills_mode: selectionChanged ? 'explicit' : proposed.skills_mode,
    };

    const prepared = await this.syncService.prepareSkillApplication(config);
    return {
      snapshot,
      config,
      skills: prepared.skills,
      completedCategories: prepared.completedCategories,
      resolvedRefs: prepared.resolvedRefs,
    };
  }

  /**
   * Saves the desired configuration, then installs and finalizes. Configuration
   * is saved before installation so an installation failure leaves the honest
   * desired state for an explicit Retry; the returned snapshot is exactly what
   * a retry must prepare from.
   */
  async apply(prepared: PreparedSkillChange): Promise<SkillApplyResult> {
    let saved: ConfigSnapshot;
    try {
      saved = await this.configService.saveSelection(
        prepared.snapshot,
        prepared.config,
        // Save beside the snapshot's own source path. Using the ambient cwd
        // can differ lexically (symlinked temp/home dirs) and would look like
        // an external edit to ConfigService's path/fingerprint guard.
        path.dirname(prepared.snapshot.sourcePath),
      );
    } catch (error) {
      return {
        status: 'incomplete',
        stage: 'saving',
        saved: false,
        snapshot: prepared.snapshot,
        message: error instanceof Error ? error.message : String(error),
      };
    }

    try {
      await this.syncService.beginInstall(prepared.config, {
        dryRun: false,
        force: [],
        scope: 'skills',
        resolvedRefs: prepared.resolvedRefs,
      });
      await this.syncService.writeSkills(prepared.skills, prepared.config);
      const plan = await this.syncService.completeInstall(prepared.config, {
        skills: prepared.skills,
        workflows: [],
        // Unused in skill scope: workflow/specialist entries are preserved.
        specialistsOk: false,
        refreshIndices: true,
        completedSkillCategories: prepared.completedCategories,
      });
      return { status: 'complete', snapshot: saved, plan };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return {
        status: 'incomplete',
        stage: 'installing',
        saved: true,
        snapshot: saved,
        message: `Installation failed after saving the selection: ${detail}`,
      };
    }
  }
}
