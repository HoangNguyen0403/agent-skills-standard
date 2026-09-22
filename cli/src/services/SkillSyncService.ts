import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import pc from 'picocolors';
import { Agent, SUPPORTED_AGENTS } from '../constants';
import { SkillConfig, SkillEntry } from '../models/config';
import { CollectedSkill, GitHubTreeItem } from '../models/types';
import { GithubService } from './GithubService';

/**
 * A selected registry category or package could not be assembled completely.
 * Callers must not write installations or lockfiles from this partial result.
 */
export class SkillAssemblyError extends Error {
  constructor(readonly failures: string[]) {
    super(`Failed to assemble selected skills: ${failures.join(', ')}`);
    this.name = 'SkillAssemblyError';
  }
}

/**
 * Service responsible for synchronizing agent skills from a remote registry.
 */
export class SkillSyncService {
  private readonly failedPackagesByCategory = new Map<string, Set<string>>();
  private readonly failedCategories = new Set<string>();

  constructor(private githubService: GithubService) {}

  /**
   * Assembles skills from the remote registry based on provided categories and configuration.
   */
  async assembleSkills(
    categories: string[],
    config: SkillConfig,
  ): Promise<CollectedSkill[]> {
    this.failedPackagesByCategory.clear();
    this.failedCategories.clear();

    const collected: CollectedSkill[] = [];
    const githubMatch = GithubService.parseGitHubUrl(config.registry);

    if (!githubMatch) {
      console.log(pc.red('Error: Only GitHub registries supported.'));
      throw new SkillAssemblyError(['registry is not a GitHub repository']);
    }

    const { owner, repo } = githubMatch;
    for (const category of categories) {
      const catConfig = config.skills[category];
      const ref = catConfig.ref || 'main';

      console.log(pc.gray(`  - Discovering ${category} (${ref})...`));
      const treeData = await this.githubService.getRepoTree(owner, repo, ref);
      if (!treeData) {
        this.failedCategories.add(category);
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
        if (skill) {
          collected.push(skill);
          continue;
        }

        const [sourceCategory, skillName] = absOrRelSkill.includes('/')
          ? absOrRelSkill.split('/')
          : [category, absOrRelSkill];
        if (sourceCategory && skillName) {
          this.markPackageFailed(sourceCategory, skillName);
        }
      }
    }
    const failures = [
      ...this.failedCategories,
      ...Array.from(this.failedPackagesByCategory).flatMap(
        ([category, skills]) =>
          Array.from(skills, (skill) => `${category}/${skill}`),
      ),
    ];
    if (failures.length > 0) throw new SkillAssemblyError(failures);

    return collected;
  }

  /**
   * Writes collected skills to target agent paths.
   */
  async writeSkills(
    skills: CollectedSkill[],
    config: SkillConfig,
    agents: Agent[],
  ): Promise<void> {
    const overrides = config.custom_overrides || [];
    const fetchedSkillsByCategory: Record<string, Set<string>> = {};
    for (const skill of skills) {
      (fetchedSkillsByCategory[skill.category] ??= new Set()).add(skill.skill);
    }

    for (const agentId of agents) {
      const agentDef = SUPPORTED_AGENTS.find((agent) => agent.id === agentId);
      if (!agentDef?.path) continue;

      const basePath = agentDef.path;
      await fs.ensureDir(basePath);
      for (const skill of skills) {
        const installed = await this.writeSkillForAgent(
          agentId,
          skill,
          overrides,
          basePath,
        );
        if (!installed) this.markPackageFailed(skill.category, skill.skill);
      }

      if (config.prune !== false) {
        await this.pruneOrphanedSkills(
          basePath,
          fetchedSkillsByCategory,
          overrides,
        );
      }
      console.log(pc.gray(`  - Updated ${basePath}/ (${agentDef.name})`));
    }
  }

  private async writeSkillForAgent(
    agentId: string,
    skill: CollectedSkill,
    overrides: string[],
    basePath: string,
  ): Promise<boolean> {
    const isKiro = agentId === Agent.Kiro;
    const skillPath = isKiro
      ? path.join(basePath, `${skill.category}-${skill.skill}`)
      : path.join(basePath, skill.category, skill.skill);
    if (!this.isPathSafe(skillPath, basePath)) {
      console.log(
        pc.red(
          `    ❌ Security Error: Invalid skill path ${skill.category}/${skill.skill}`,
        ),
      );
      throw new Error(`Invalid skill path ${skill.category}/${skill.skill}`);
    }

    for (const fileItem of skill.files) {
      const targetFilePath = path.join(skillPath, fileItem.name);
      if (!this.isPathSafe(targetFilePath, skillPath)) {
        console.log(
          pc.red(`    ❌ Security Error: Invalid path ${fileItem.name}`),
        );
        throw new Error(`Invalid path ${fileItem.name}`);
      }
    }

    const stagingPath = path.join(
      path.dirname(skillPath),
      `.${path.basename(skillPath)}.ags-staging`,
    );
    if (await fs.pathExists(stagingPath)) {
      throw new Error(
        `Refusing to replace ${skill.category}/${skill.skill}: staging path already exists at ${stagingPath}`,
      );
    }
    await fs.ensureDir(path.dirname(skillPath));

    try {
      if (this.hasOverridesInsideSkill(skillPath, overrides)) {
        await this.copyOverrides(skillPath, stagingPath, overrides);
      }
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

        const stagedFilePath = path.join(stagingPath, fileItem.name);
        let content: string | Buffer = fileItem.bytes ?? fileItem.content;
        if (isKiro && fileItem.name === 'SKILL.md') {
          content = this.transformSkillForKiro(
            fileItem.content,
            skill.category,
          );
        }
        await fs.outputFile(stagedFilePath, content);
      }

      await this.replaceSkillDirectory(stagingPath, skillPath);
      return true;
    } catch (error) {
      await fs.remove(stagingPath);
      throw error;
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
    if (!sourceCat || !skillName) return null;

    const prefix = `skills/${sourceCat}/${skillName}/`;
    const packageFiles = tree.filter(
      (file) =>
        file.type === 'blob' &&
        file.path.startsWith(prefix) &&
        this.isPackageResource(file.path.slice(prefix.length)),
    );
    const rootAttributionFiles = tree.filter(
      (file) =>
        file.type === 'blob' &&
        this.isRootAttributionFile(file.path) &&
        !packageFiles.some(
          (packageFile) =>
            packageFile.path.slice(prefix.length).toLowerCase() ===
            file.path.toLowerCase(),
        ),
    );
    const downloadTasks = [...packageFiles, ...rootAttributionFiles]
      .sort((left, right) => left.path.localeCompare(right.path))
      .map((file) => ({
        owner,
        repo,
        ref,
        path: file.path,
        sha: file.sha,
      }));

    const { ok: files, failed } =
      await this.githubService.downloadFilesConcurrentBytes(downloadTasks);
    for (const failure of failed) {
      console.log(
        pc.red(
          `    ❌ ${sourceCat}/${skillName}: ${failure.path} — ${failure.reason}`,
        ),
      );
    }

    const hasSkillDefinition = packageFiles.some(
      (file) => file.path === `${prefix}SKILL.md`,
    );
    if (
      !hasSkillDefinition ||
      failed.length > 0 ||
      files.length !== downloadTasks.length
    ) {
      return null;
    }

    console.log(
      pc.gray(
        `    + Fetched ${sourceCat}/${skillName} (${files.length} files)`,
      ),
    );
    return {
      category: sourceCat,
      skill: skillName,
      files: files.map((file) => ({
        name: file.path.startsWith(prefix)
          ? file.path.slice(prefix.length)
          : file.path,
        content: file.content.toString('utf8'),
        bytes: file.content,
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

  /**
   * Kiro has no file/keyword routing concept, so `metadata.triggers` is
   * intentionally dropped here (Kiro users get skills with no auto-routing
   * — a known, documented limitation, not a bug). Every other declared
   * field — including the optional Universal-Skill-Format fields
   * (version/risk_tier/allowed-tools/permissions/content_hash/signature) —
   * is preserved rather than silently discarded.
   *
   * Uses a real YAML parse + js-yaml dump (matching SpecialistTransformer)
   * instead of regex-extract-and-reinterpolate: the previous implementation
   * built `description: ${description}` via raw string interpolation, which
   * had the same YAML-key-injection exposure fixed elsewhere in this PR — a
   * description containing a quote+newline could inject a new top-level key
   * into the emitted Kiro frontmatter.
   */
  private transformSkillForKiro(content: string, category: string): string {
    const frontmatterMatch = content.match(
      /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/,
    );
    if (!frontmatterMatch) return content;

    let metadata: Record<string, unknown>;
    try {
      metadata =
        (yaml.load(frontmatterMatch[1]) as Record<string, unknown>) ?? {};
    } catch {
      return content;
    }

    const body = frontmatterMatch[2];
    const name = typeof metadata.name === 'string' ? metadata.name : '';
    const displayName = `${category.charAt(0).toUpperCase() + category.slice(1)} - ${name}`;

    const fm: Record<string, unknown> = {
      ...metadata,
      name: displayName,
      // Always present (even empty), matching the field this transform has
      // always emitted regardless of whether the source declared one.
      description:
        typeof metadata.description === 'string' ? metadata.description : '',
    };
    const kiroMetadata = fm.metadata;
    if (this.isRecord(kiroMetadata)) {
      const preservedMetadata = { ...kiroMetadata };
      delete preservedMetadata.triggers;
      fm.metadata = preservedMetadata;
    }
    return `---\n${yaml.dump(fm, { lineWidth: -1 }).trimEnd()}\n---\n\n${body}`;
  }

  private isPackageResource(relativePath: string): boolean {
    return (
      relativePath === 'SKILL.md' ||
      /^(references|scripts|assets)\//.test(relativePath) ||
      this.isRootAttributionFile(relativePath)
    );
  }

  private isRootAttributionFile(filePath: string): boolean {
    return (
      !filePath.includes('/') &&
      /^(LICENSE|NOTICE)(?:\.(?:md|txt))?$/i.test(filePath)
    );
  }

  private markPackageFailed(category: string, skill: string): void {
    let failedSkills = this.failedPackagesByCategory.get(category);
    if (!failedSkills) {
      failedSkills = new Set<string>();
      this.failedPackagesByCategory.set(category, failedSkills);
    }
    failedSkills.add(skill);
  }

  private async pruneOrphanedSkills(
    basePath: string,
    fetchedSkillsByCategory: Record<string, Set<string>>,
    overrides: string[],
  ): Promise<void> {
    for (const [category, fetchedSkills] of Object.entries(
      fetchedSkillsByCategory,
    )) {
      if (this.failedCategories.has(category)) continue;

      const categoryPath = path.join(basePath, category);
      if (!(await fs.pathExists(categoryPath))) continue;

      const failedSkills = this.failedPackagesByCategory.get(category);
      const existingDirs = await fs.readdir(categoryPath);
      for (const directory of existingDirs) {
        const fullPath = path.join(categoryPath, directory);
        if (
          fetchedSkills.has(directory) ||
          failedSkills?.has(directory) ||
          this.isOverridden(fullPath, overrides)
        ) {
          continue;
        }
        await fs.remove(fullPath);
      }
    }
  }

  private hasOverridesInsideSkill(
    skillPath: string,
    overrides: string[],
  ): boolean {
    const skillRelativePath = this.normalizePath(skillPath);
    const skillSuffix = skillRelativePath.split('/').slice(-2).join('/');
    return overrides.some((override) => {
      const normalizedOverride = override
        .replace(/\\/g, '/')
        .replace(/\/$/, '');
      return (
        this.isOverridden(skillPath, [override]) ||
        normalizedOverride.startsWith(`${skillRelativePath}/`) ||
        normalizedOverride.includes(`/${skillRelativePath}/`) ||
        normalizedOverride === skillSuffix ||
        normalizedOverride.startsWith(`${skillSuffix}/`) ||
        normalizedOverride.includes(`/${skillSuffix}/`)
      );
    });
  }

  private async copyOverrides(
    sourcePath: string,
    targetPath: string,
    overrides: string[],
  ): Promise<void> {
    if (!(await fs.pathExists(sourcePath))) return;

    const sourceStat = await fs.lstat(sourcePath);
    if (sourceStat.isSymbolicLink() || !sourceStat.isDirectory()) {
      console.log(
        pc.yellow(
          `    ⚠️  Skipping override copy outside installation root: ${this.normalizePath(sourcePath)}`,
        ),
      );
      return;
    }

    const entries = await fs.readdir(sourcePath, { withFileTypes: true });
    for (const entry of entries) {
      const source = path.join(sourcePath, entry.name);
      const target = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        await this.copyOverrides(source, target, overrides);
      } else if (entry.isFile() && this.isOverridden(source, overrides)) {
        await fs.copy(source, target);
      }
    }
  }

  private async replaceSkillDirectory(
    stagingPath: string,
    skillPath: string,
  ): Promise<void> {
    const backupPath = `${skillPath}.ags-backup`;
    if (await fs.pathExists(backupPath)) {
      throw new Error(
        `Refusing to replace ${this.normalizePath(skillPath)}: backup path already exists at ${backupPath}`,
      );
    }

    const hadExistingSkill = await fs.pathExists(skillPath);
    if (hadExistingSkill) {
      await fs.move(skillPath, backupPath, { overwrite: false });
    }

    try {
      await fs.move(stagingPath, skillPath, { overwrite: false });
    } catch (error) {
      if (hadExistingSkill) {
        await fs.move(backupPath, skillPath, { overwrite: false });
      }
      throw error;
    }

    if (hadExistingSkill) await fs.remove(backupPath);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
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
