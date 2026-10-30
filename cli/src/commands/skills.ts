import inquirer from 'inquirer';
import pc from 'picocolors';
import { CategoryConfig, SkillConfig } from '../models/config';
import { defaultCategorySelection } from '../services/CategoryDefaults';
import { ConfigService, ConfigSnapshot } from '../services/ConfigService';
import {
  CatalogSkill,
  CategoryCatalog,
  SkillCatalogService,
} from '../services/SkillCatalogService';
import {
  PreparedSkillChange,
  SkillApplyResult,
  SkillSelectionApplyService,
} from '../services/SkillSelectionApplyService';
import {
  isSkillSelected,
  setSkillSelection,
  skillSelectionFingerprint,
} from '../services/SkillSelectionService';

/** The service surface the command depends on; the real service is the default. */
type ApplyService = Pick<SkillSelectionApplyService, 'prepare' | 'apply'>;

type NextAction = 'review' | 'customize' | 'cancel';
type CategoryAction = 'toggle' | 'search' | 'release' | 'back';

/** Non-skill directories that can appear under `skills/` but are not selectable. */
const NON_SELECTABLE_CATEGORIES: Record<string, true> = {
  specialists: true,
};

/**
 * Legacy categories without a configured ref are interpreted as `main` by
 * existing sync code. The manager lists them at that effective ref and never
 * silently upgrades them to a release.
 */
const LEGACY_DEFAULT_REF = 'main';

interface ManagerState {
  snapshot: ConfigSnapshot;
  draft: SkillConfig;
}

interface SkillRow {
  name: string;
  value: string;
  checked: boolean;
}

interface SearchCandidate {
  id: string;
  name: string;
  description: string;
}

const INTERACTIVE_REQUIRED =
  '`ags skills` requires an interactive terminal. No files were read or written.';
const INIT_REQUIRED =
  '.skillsrc not found. Run `agent-skills-standard init` before managing skills.';

/**
 * `ags skills` — category-first manager for skill selection.
 *
 * Reads the configuration and catalog without writing, lets the maintainer
 * change the draft selection (categories, nested skills, category release),
 * reviews the exact effect, and then performs one Apply that saves the
 * configuration and installs it for every configured agent. No separate
 * `sync` step is needed, and cancel/no-op never writes.
 */
export class SkillsCommand {
  private readonly configService: ConfigService;
  private readonly catalogService: SkillCatalogService;
  private readonly applyService: ApplyService;
  private readonly isTTY: () => boolean;

  constructor(
    configService?: ConfigService,
    catalogService?: SkillCatalogService,
    applyService?: ApplyService,
    isTTY?: () => boolean,
  ) {
    this.configService = configService ?? new ConfigService();
    this.catalogService = catalogService ?? new SkillCatalogService();
    this.applyService = applyService ?? new SkillSelectionApplyService();
    this.isTTY =
      isTTY ?? (() => Boolean(process.stdin.isTTY && process.stdout.isTTY));
  }

  async run(): Promise<void> {
    if (!this.isTTY()) {
      console.error(pc.red(INTERACTIVE_REQUIRED));
      process.exitCode = 1;
      return;
    }

    let snapshot: ConfigSnapshot | null;
    try {
      snapshot = await this.configService.readSnapshot();
    } catch (error) {
      this.reportError('Could not read .skillsrc', error);
      process.exitCode = 1;
      return;
    }
    if (!snapshot) {
      console.error(pc.red(INIT_REQUIRED));
      process.exitCode = 1;
      return;
    }

    let catalog: CategoryCatalog;
    try {
      catalog = await this.catalogService.load(snapshot.config.registry);
    } catch (error) {
      this.reportError('Could not read the registry catalog', error);
      process.exitCode = 1;
      return;
    }

    await this.manage(
      { snapshot, draft: cloneConfig(snapshot.config) },
      catalog,
    );
  }

  private async manage(
    state: ManagerState,
    catalog: CategoryCatalog,
  ): Promise<void> {
    for (;;) {
      const selected = await this.promptCategories(state, catalog);
      if (selected === null) return;
      await this.applyCategorySelection(state, catalog, selected);

      for (;;) {
        const next = await this.promptNextAction();
        if (next === null || next === 'cancel') {
          console.log(pc.gray('No changes applied.'));
          return;
        }
        if (next === 'review') break;

        const category = await this.promptCategoryToCustomize(state);
        if (category === null) return;
        if (!category) continue;
        const exited = await this.customizeCategory(state, catalog, category);
        if (exited === null) return;
      }

      if (
        canonicalSelection(state.draft) ===
        canonicalSelection(state.snapshot.config)
      ) {
        console.log(pc.gray('No selection changes to apply.'));
        return;
      }

      const prepared = await this.tryPrepare(state.snapshot, state.draft);
      if (!prepared) continue;
      this.printReview(state, prepared);
      const confirmation = await this.ask(() =>
        inquirer.prompt<{ apply: boolean }>([
          {
            type: 'confirm',
            name: 'apply',
            message: 'Apply these skill selection changes?',
            default: false,
          },
        ]),
      );
      if (confirmation === null || !confirmation.apply) {
        console.log(pc.gray('No changes applied.'));
        return;
      }

      const outcome = await this.applyPrepared(state, prepared);
      if (outcome !== 'edit') return;
    }
  }

  /**
   * Applies the exact prepared source shown in the authoritative review.
   * Retry refreshes only the verified config snapshot, never the source.
   */
  private async applyPrepared(
    state: ManagerState,
    originalPrepared: PreparedSkillChange,
  ): Promise<'complete' | 'stop' | 'edit'> {
    let prepared = originalPrepared;
    let result = await this.tryApply(prepared);
    if (!result) return 'stop';

    for (;;) {
      if (result.status === 'complete') {
        this.printComplete(result, result.snapshot.config);
        return 'complete';
      }

      this.printIncomplete(result);
      const retry = await this.ask(() =>
        inquirer.prompt<{ retry: boolean }>([
          {
            type: 'confirm',
            name: 'retry',
            message: 'Retry the installation now?',
            default: true,
          },
        ]),
      );
      if (retry === null || !retry.retry) {
        const recovery = result.saved
          ? 'The saved selection is kept. After fixing the reported failure, run `agent-skills-standard sync`; when asked “Do you want to update .skillsrc with these versions?”, answer No to keep the saved refs.'
          : 'The attempted selection was not saved. After fixing the reported failure, reopen `ags skills`, review the selection, and Apply again.';
        console.log(
          pc.yellow(`Stopped with an incomplete installation. ${recovery}`),
        );
        process.exitCode = 1;
        return 'stop';
      }

      const fresh = await this.configService.readSnapshot().catch(() => null);
      if (!fresh) {
        this.reportError(
          'Could not reload .skillsrc for the retry',
          new Error('configuration is no longer readable'),
        );
        process.exitCode = 1;
        return 'stop';
      }
      if (fresh.fingerprint !== result.snapshot.fingerprint) {
        console.log(
          pc.yellow(
            'Configuration changed on disk since it was opened; reloaded the saved selection. Review the changes again before applying.',
          ),
        );
        state.snapshot = fresh;
        state.draft = cloneConfig(fresh.config);
        return 'edit';
      }

      prepared = { ...prepared, snapshot: fresh };
      result = await this.tryApply(prepared);
      if (!result) return 'stop';
    }
  }

  private async tryPrepare(
    snapshot: ConfigSnapshot,
    proposed: SkillConfig,
  ): Promise<PreparedSkillChange | null> {
    try {
      return await this.applyService.prepare(snapshot, proposed);
    } catch (error) {
      this.reportError(
        'Could not prepare the selection; nothing was saved or installed',
        error,
      );
      return null;
    }
  }

  private async tryApply(
    prepared: PreparedSkillChange,
  ): Promise<SkillApplyResult | null> {
    try {
      return await this.applyService.apply(prepared);
    } catch (error) {
      this.reportError('Applying the selection failed', error);
      process.exitCode = 1;
      return null;
    }
  }

  private async promptCategories(
    state: ManagerState,
    catalog: CategoryCatalog,
  ): Promise<string[] | null> {
    const selectable = selectableCategories(catalog);
    const selectableSet = new Set(selectable);
    const selected = new Set(Object.keys(state.draft.skills));
    const choices: {
      name: string;
      value: string;
      checked: boolean;
    }[] = selectable.map((category) => ({
      name: `${category}${describeFilters(state.draft.skills[category])}`,
      value: category,
      checked: selected.has(category),
    }));

    // Unavailable configured categories remain visible and checked from the
    // current draft, but a maintainer can explicitly remove them.
    for (const category of Object.keys(state.draft.skills).sort()) {
      if (selectableSet.has(category)) continue;
      choices.push({
        name: `${category} — not in the current catalog`,
        value: category,
        checked: selected.has(category),
      });
    }

    const answers = await this.ask(() =>
      inquirer.prompt<{ categories: string[] }>([
        {
          type: 'checkbox',
          name: 'categories',
          message: 'Select skill categories',
          choices,
          pageSize: 20,
        },
      ]),
    );
    return answers?.categories ?? null;
  }

  private async promptNextAction(): Promise<NextAction | null> {
    const answers = await this.ask(() =>
      inquirer.prompt<{ next: NextAction }>([
        {
          type: 'select',
          name: 'next',
          message: 'Skill selection',
          choices: [
            { name: 'Review and apply', value: 'review' },
            { name: 'Customize skills in a category', value: 'customize' },
            { name: 'Cancel without changes', value: 'cancel' },
          ],
        },
      ]),
    );
    return answers?.next ?? null;
  }

  private async promptCategoryToCustomize(
    state: ManagerState,
  ): Promise<string | null> {
    const categories = Object.keys(state.draft.skills).sort();
    if (categories.length === 0) {
      console.log(pc.gray('Select at least one category before customizing.'));
      return '';
    }
    const answers = await this.ask(() =>
      inquirer.prompt<{ category: string }>([
        {
          type: 'select',
          name: 'category',
          message: 'Customize which category?',
          choices: categories.map((category) => ({
            name: category,
            value: category,
          })),
        },
      ]),
    );
    return answers?.category ?? null;
  }

  /** Returns null only when the prompt session was cancelled. */
  private async customizeCategory(
    state: ManagerState,
    catalog: CategoryCatalog,
    category: string,
  ): Promise<null | undefined> {
    let skills: CatalogSkill[] | null = null;
    let importedSkills: CatalogSkill[] = [];
    let listedRef = '';

    for (;;) {
      const entry = state.draft.skills[category];
      if (!entry) return;
      const ref = effectiveRef(entry);

      if (!skills || listedRef !== ref) {
        try {
          skills = await this.catalogService.listSkills(
            catalog.registry,
            category,
            ref,
          );
          importedSkills = await this.loadImportedSkills(
            catalog,
            category,
            entry,
            ref,
          );
          listedRef = ref;
        } catch (error) {
          this.reportError(
            `Could not read the skills in "${category}" at ${ref}`,
            error,
          );
          return;
        }
      }

      if (!skills) return;
      const liveEntry = state.draft.skills[category];
      const rows = buildSkillRows(category, liveEntry, skills, importedSkills);
      const action = await this.promptCategoryAction(category, ref);
      if (action === null) return null;
      if (action === 'back') return;
      if (action === 'toggle') {
        const cancelled = await this.toggleSkills(state, category, rows);
        if (cancelled) return null;
      }
      if (action === 'search') {
        const cancelled = await this.searchSkill(
          state,
          category,
          buildSearchCandidates(skills, importedSkills),
        );
        if (cancelled) return null;
      }
      if (action === 'release') {
        await this.chooseRelease(state, catalog, category);
      }
    }
  }

  /**
   * Imported includes are resolved against the declaring category's ref, the
   * same tree sync fetches, so the qualified members shown here are exactly
   * the ones the resolver expands.
   */
  private async loadImportedSkills(
    catalog: CategoryCatalog,
    category: string,
    entry: CategoryConfig,
    ref: string,
  ): Promise<CatalogSkill[]> {
    const importedCategories = new Set<string>();
    for (const expression of entry.include ?? []) {
      if (!expression.includes('/')) continue;
      const [importedCategory] = expression.split('/');
      if (importedCategory !== category)
        importedCategories.add(importedCategory);
    }

    const members: CatalogSkill[] = [];
    for (const importedCategory of importedCategories) {
      members.push(
        ...(await this.catalogService.listSkills(
          catalog.registry,
          importedCategory,
          ref,
        )),
      );
    }
    return members;
  }

  private async promptCategoryAction(
    category: string,
    ref: string,
  ): Promise<CategoryAction | null> {
    const answers = await this.ask(() =>
      inquirer.prompt<{ action: CategoryAction }>([
        {
          type: 'select',
          name: 'action',
          message: `${category} @ ${ref}`,
          choices: [
            { name: 'Toggle skills', value: 'toggle' },
            { name: 'Search skills', value: 'search' },
            {
              name: 'Use the published category release',
              value: 'release',
            },
            { name: 'Back', value: 'back' },
          ],
        },
      ]),
    );
    return answers?.action ?? null;
  }

  private async toggleSkills(
    state: ManagerState,
    category: string,
    rows: SkillRow[],
  ): Promise<boolean> {
    const entry = state.draft.skills[category];
    const answers = await this.ask(() =>
      inquirer.prompt<{ skills: string[] }>([
        {
          type: 'checkbox',
          name: 'skills',
          message: `Skills in ${category} @ ${effectiveRef(entry)}`,
          choices: rows.map((row) => ({
            name: row.name,
            value: row.value,
            checked: row.checked,
          })),
          pageSize: 20,
        },
      ]),
    );
    if (!answers) return true;

    // Apply only the rows that changed so unchecked hidden selections and
    // the category-wide versus allowlist policy are preserved exactly.
    for (const row of rows) {
      const desired = answers.skills.includes(row.value);
      if (desired === row.checked) continue;
      state.draft.skills[category] = setSkillSelection(
        category,
        state.draft.skills[category],
        row.value,
        desired,
      );
    }
    return false;
  }

  private async searchSkill(
    state: ManagerState,
    category: string,
    candidates: SearchCandidate[],
  ): Promise<boolean> {
    const answers = await this.ask(() =>
      inquirer.prompt<{ skill: string }>([
        {
          type: 'search',
          name: 'skill',
          message: `Search ${category} skills (name or description)`,
          source: (term: string | undefined) => {
            const query = (term ?? '').trim().toLowerCase();
            const matches = query
              ? candidates.filter(
                  (candidate) =>
                    candidate.name.toLowerCase().includes(query) ||
                    candidate.description.toLowerCase().includes(query) ||
                    candidate.id.toLowerCase().includes(query),
                )
              : candidates;
            return matches.map((candidate) => ({
              name: `${candidate.id} — ${candidate.name} — ${candidate.description}`,
              value: candidate.id,
            }));
          },
        },
      ]),
    );
    if (answers === null) return true;
    if (!answers.skill) return false;

    const candidate = candidates.find((item) => item.id === answers.skill);
    if (!candidate) {
      console.log(pc.red(`Unknown skill "${answers.skill}" in ${category}.`));
      return false;
    }

    const current = isSkillSelected(
      category,
      state.draft.skills[category],
      candidate.id,
    );
    const confirmation = await this.ask(() =>
      inquirer.prompt<{ include: boolean }>([
        {
          type: 'confirm',
          name: 'include',
          message: `Install "${candidate.name}" (${candidate.id})?`,
          default: !current,
        },
      ]),
    );
    if (!confirmation) return true;
    state.draft.skills[category] = setSkillSelection(
      category,
      state.draft.skills[category],
      candidate.id,
      confirmation.include,
    );
    return false;
  }

  private async chooseRelease(
    state: ManagerState,
    catalog: CategoryCatalog,
    category: string,
  ): Promise<void> {
    const entry = state.draft.skills[category];
    if (!entry) return;
    const metadata = catalog.metadata.categories?.[category];
    if (!metadata?.version) {
      console.log(
        pc.yellow(
          `"${category}" has no published release yet; keeping its current ref.`,
        ),
      );
      return;
    }

    try {
      const release = await this.catalogService.resolveRelease(
        catalog,
        category,
      );
      const currentRef = effectiveRef(entry);
      if (release.ref === currentRef) {
        console.log(pc.gray(`"${category}" already uses ${release.ref}.`));
        return;
      }
      state.draft.skills[category] = { ...entry, ref: release.ref };
      console.log(
        pc.cyan(
          `"${category}" now targets ${release.ref} (was ${currentRef}). The review shows this full category ref change before anything is saved.`,
        ),
      );
    } catch (error) {
      this.reportError(
        `Could not use a published release for "${category}"; the draft is unchanged`,
        error,
      );
    }
  }

  private async applyCategorySelection(
    state: ManagerState,
    catalog: CategoryCatalog,
    enabled: string[],
  ): Promise<void> {
    const selectable = selectableCategories(catalog);
    const wanted = new Set(enabled);

    for (const category of Object.keys(state.draft.skills)) {
      if (!wanted.has(category)) delete state.draft.skills[category];
    }

    for (const category of [...wanted].sort()) {
      if (state.draft.skills[category]) continue;
      if (!selectable.includes(category)) continue;
      const existing = state.snapshot.config.skills[category];
      if (existing) {
        state.draft.skills[category] = JSON.parse(
          JSON.stringify(existing),
        ) as CategoryConfig;
        continue;
      }
      try {
        const release = await this.catalogService.resolveRelease(
          catalog,
          category,
        );
        state.draft.skills[category] = defaultCategorySelection(
          category,
          release.ref,
        );
      } catch (error) {
        this.reportError(
          `Cannot enable "${category}"; it was left unselected`,
          error,
        );
      }
    }
  }

  private printReview(
    state: ManagerState,
    prepared: PreparedSkillChange,
  ): void {
    const before = state.snapshot.config;
    const after = state.draft;
    console.log(pc.bold('\nReview'));
    console.log(
      pc.gray(
        '  Existing pins and customizations are preserved; only the selection below is saved.',
      ),
    );

    const added = Object.keys(after.skills)
      .filter((category) => !before.skills[category])
      .sort();
    const removed = Object.keys(before.skills)
      .filter((category) => !after.skills[category])
      .sort();

    for (const category of Object.keys(after.skills).sort()) {
      const next = after.skills[category];
      const previous = before.skills[category];
      const note = !previous
        ? ` (new @ ${effectiveRef(next)})`
        : effectiveRef(previous) !== effectiveRef(next)
          ? ` (was ${effectiveRef(previous)})`
          : '';
      console.log(
        `  ${category} @ ${effectiveRef(next)}${note}${describeFilters(next)}`,
      );
    }
    console.log(pc.bold('  Prepared source commits and selected packages:'));
    for (const category of Object.keys(after.skills).sort()) {
      const source = prepared.resolvedRefs.skills[category];
      if (source) {
        console.log(
          pc.gray(
            `    ${category}: ${source.ref} → ${source.commit ?? 'unresolved'}`,
          ),
        );
      }
      const packages = prepared.skills
        .filter((skill) => skill.origin?.category === category)
        .map((skill) => `${skill.category}/${skill.skill}`)
        .sort();
      console.log(
        `    ${category} effective packages: ${
          packages.length ? packages.join(', ') : '(empty)'
        }`,
      );
    }
    if (added.length > 0) {
      console.log(pc.green(`  Categories added: ${added.join(', ')}`));
    }
    if (removed.length > 0) {
      console.log(pc.red(`  Categories removed: ${removed.join(', ')}`));
    }

    if (after.prune === false) {
      console.log(
        pc.yellow(
          '  prune is false: obsolete managed files are retained and reported, not deleted.',
        ),
      );
    }
    if ((after.custom_overrides ?? []).length > 0) {
      console.log(
        pc.yellow(
          `  protected paths: ${(after.custom_overrides ?? []).join(', ')} keep local edits and are not overwritten.`,
        ),
      );
    }
    console.log(
      pc.gray(
        '  skills_mode: explicit — later ordinary sync will not re-add removed categories.',
      ),
    );
  }

  private printComplete(
    result: Extract<SkillApplyResult, { status: 'complete' }>,
    config: SkillConfig,
  ): void {
    const { plan } = result;
    console.log(pc.green('\n✅ Skill selection applied.'));
    console.log(
      pc.gray(
        `  ${plan.added.length} added, ${plan.updated.length} updated, ${plan.unchanged.length} unchanged, ${plan.kept.length} kept, ${plan.pruned.length} pruned, ${plan.unknown.length} unowned`,
      ),
    );
    for (const path of plan.kept) {
      console.log(
        pc.yellow(`  kept (edited by you, not overwritten): ${path}`),
      );
    }
    for (const path of plan.keptOrphans) {
      console.log(pc.yellow(`  kept (edited, no longer selected): ${path}`));
    }
    for (const path of plan.unknown) {
      console.log(pc.yellow(`  left untouched (not owned by ags): ${path}`));
    }
    for (const path of plan.pruned) {
      console.log(pc.gray(`  pruned: ${path}`));
    }
    if (
      plan.kept.length > 0 ||
      plan.keptOrphans.length > 0 ||
      plan.unknown.length > 0
    ) {
      console.log(
        pc.yellow(
          '  Applied with retained files: the paths above were left in place, so not every path was replaced.',
        ),
      );
    }
    if (config.prune === false) {
      console.log(
        pc.yellow(
          '  prune is false: obsolete managed files were retained and were not deleted.',
        ),
      );
    }
  }

  private printIncomplete(
    result: Extract<SkillApplyResult, { status: 'incomplete' }>,
  ): void {
    console.log(pc.red('\n⚠️  The skill selection did not finish.'));
    console.log(
      pc.red(
        `  Failed while ${result.stage === 'saving' ? 'saving .skillsrc' : 'installing skill files'}.`,
      ),
    );
    console.log(
      result.saved
        ? pc.yellow(
            '  Your desired selection was saved; installation is incomplete.',
          )
        : pc.yellow(
            '  Your configuration was not changed; the previous selection remains on disk.',
          ),
    );
    console.log(pc.gray(`  ${result.message}`));
    if (!result.saved) {
      console.log(
        pc.gray(
          `  Desired selection in the failed run: ${describeSavedSelection(result.snapshot.config)}`,
        ),
      );
    }
    if (result.snapshot.config.prune === false) {
      console.log(
        pc.gray(
          '  prune is false: obsolete managed files are retained; a retry will not delete them.',
        ),
      );
    }
  }

  private reportError(context: string, error: unknown): void {
    console.error(pc.red(`\n❌ ${context}: ${errorMessage(error)}`));
  }

  private async ask<T>(run: () => Promise<T>): Promise<T | null> {
    try {
      return await run();
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        console.log(pc.gray('\nCancelled. No changes applied.'));
        return null;
      }
      throw error;
    }
  }
}

function selectableCategories(catalog: CategoryCatalog): string[] {
  return catalog.categories.filter(
    (category) => !NON_SELECTABLE_CATEGORIES[category],
  );
}

function describeFilters(entry?: CategoryConfig): string {
  if (!entry) return '';
  const parts: string[] = [];
  if (entry.include) {
    parts.push(
      entry.include.length === 0
        ? 'no skills selected'
        : `${entry.include.length} allowed`,
    );
  }
  if ((entry.exclude ?? []).length > 0) {
    parts.push(`${entry.exclude?.length} excluded`);
  }
  return parts.length > 0 ? ` — ${parts.join(', ')}` : '';
}

function effectiveRef(entry: CategoryConfig): string {
  return entry.ref ?? LEGACY_DEFAULT_REF;
}

/** Declared include expressions that name another category. */
function foreignIncludeExpressions(
  category: string,
  entry: CategoryConfig,
): string[] {
  const seen = new Set<string>();
  const foreign: string[] = [];
  for (const expression of entry.include ?? []) {
    if (!expression.includes('/')) continue;
    const [expressionCategory] = expression.split('/');
    if (expressionCategory === category) continue;
    if (seen.has(expression)) continue;
    seen.add(expression);
    foreign.push(expression);
  }
  return foreign;
}

function buildSkillRows(
  category: string,
  entry: CategoryConfig,
  skills: CatalogSkill[],
  importedSkills: CatalogSkill[],
): SkillRow[] {
  const rows: SkillRow[] = skills.map((skill) => ({
    name: `${skill.id} — ${skill.name} — ${skill.description}`,
    value: skill.id,
    checked: isSkillSelected(category, entry, skill.id),
  }));
  const seen = new Set(rows.map((row) => row.value));

  // Imported members are individual rows identified by their folder id, so a
  // `category/*` expression can be tightened with one qualified exclusion
  // while the wildcard expression itself stays declared.
  for (const member of importedSkills) {
    if (seen.has(member.id)) continue;
    rows.push({
      name: `imported: ${member.id} — ${member.name} — ${member.description}`,
      value: member.id,
      checked: isSkillSelected(category, entry, member.id),
    });
    seen.add(member.id);
  }

  // Keep declared imports visible even when their category could not expose
  // that member at this ref (for example an exact pin to a missing skill).
  for (const expression of foreignIncludeExpressions(category, entry)) {
    if (seen.has(expression)) continue;
    const importedCategory = expression.split('/')[0];
    const covered = expression.endsWith('/*')
      ? importedSkills.some((member) => member.category === importedCategory)
      : importedSkills.some((member) => member.id === expression);
    if (covered) continue;
    rows.push({
      name: `imported: ${expression}`,
      value: expression,
      checked: isSkillSelected(category, entry, expression),
    });
    seen.add(expression);
  }
  return rows;
}

function buildSearchCandidates(
  skills: CatalogSkill[],
  importedSkills: CatalogSkill[],
): SearchCandidate[] {
  const seen = new Set<string>();
  const candidates: SearchCandidate[] = [];
  for (const skill of [...skills, ...importedSkills]) {
    if (seen.has(skill.id)) continue;
    seen.add(skill.id);
    candidates.push({
      id: skill.id,
      name: skill.name,
      description: skill.description,
    });
  }
  return candidates;
}

function describeSavedSelection(config: SkillConfig): string {
  const categories = Object.keys(config.skills).sort();
  return categories.length > 0
    ? categories
        .map(
          (category) => `${category}@${effectiveRef(config.skills[category])}`,
        )
        .join(', ')
    : 'no categories';
}

function canonicalSelection(config: SkillConfig): string {
  return JSON.stringify({
    skills: skillSelectionFingerprint(config.skills),
    skills_mode: config.skills_mode ?? 'auto',
  });
}

function cloneConfig(config: SkillConfig): SkillConfig {
  return JSON.parse(JSON.stringify(config)) as SkillConfig;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
