import * as yaml from 'js-yaml';
import path from 'path';
import pc from 'picocolors';
import { Agent, SUPPORTED_AGENTS } from '../constants';
import { SkillConfig, SkillEntry } from '../models/config';
import { CollectedSkill, GitHubTreeItem } from '../models/types';
import { GithubService } from './GithubService';
import { isOverriddenRel, toPosixRel } from './install/pathMatch';
import { InstallWriter, PassthroughWriter } from './install/OwnershipWriter';
import { ManifestVerifier } from './install/ManifestVerifier';

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
    verifiers: Record<string, ManifestVerifier> = {},
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
          verifiers,
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
    writer: InstallWriter = new PassthroughWriter(),
  ): Promise<void> {
    const overrides = config.custom_overrides || [];

    for (const agentId of agents) {
      const agentDef = SUPPORTED_AGENTS.find((agent) => agent.id === agentId);
      if (!agentDef?.path) continue;

      const basePath = agentDef.path;

      for (const skill of skills) {
        await this.writeSkillForAgent(
          agentId,
          skill,
          overrides,
          basePath,
          writer,
          config,
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
    writer: InstallWriter,
    config: SkillConfig,
  ): Promise<void> {
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

    // Validate every path and prepare every payload before the first write, so
    // an unsafe package never partially lands. Writes then go through the
    // ownership writer file by file (ADR-014): user-edited and unknown files
    // are preserved instead of the whole package directory being replaced.
    const source = `skill:${skill.category}/${skill.skill}@${config.skills?.[skill.category]?.ref ?? 'main'}`;
    const pending: Array<{ target: string; content: string | Buffer }> = [];
    for (const fileItem of skill.files) {
      const targetFilePath = path.join(skillPath, fileItem.name);
      if (!this.isPathSafe(targetFilePath, skillPath)) {
        console.log(
          pc.red(`    ❌ Security Error: Invalid path ${fileItem.name}`),
        );
        throw new Error(`Invalid path ${fileItem.name}`);
      }
      if (this.isOverridden(targetFilePath, overrides)) {
        console.log(
          pc.yellow(
            `    ⚠️  Skipping overridden: ${this.normalizePath(targetFilePath)}`,
          ),
        );
        continue;
      }
      // Raw download bytes unless an adapter transform needs the text.
      const content =
        isKiro && fileItem.name === 'SKILL.md'
          ? this.transformSkillForKiro(fileItem.content, skill.category)
          : (fileItem.bytes ?? fileItem.content);
      pending.push({ target: targetFilePath, content });
    }

    for (const { target, content } of pending) {
      await writer.write(target, content, {
        owner: 'skill',
        source,
        agent: agentId,
      });
    }
  }

  private async fetchSkill(
    owner: string,
    repo: string,
    ref: string,
    category: string,
    absOrRelSkill: string,
    tree: GitHubTreeItem[],
    verifiers: Record<string, ManifestVerifier> = {},
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

    const verifier = verifiers[sourceCat] ?? verifiers[category];
    if (verifier) {
      for (const f of files) {
        const rejection = verifier.check(f.path, f.content);
        if (rejection) failed.push({ path: f.path, reason: rejection });
      }
    }
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
    const hasSkillMd = tree.some(
      (f) =>
        f.type === 'blob' &&
        f.path.startsWith(`skills/${category}/`) &&
        f.path.endsWith('/SKILL.md'),
    );

    const skillFolders = new Set(
      tree
        .filter((f) => {
          if (!f.path.startsWith(`skills/${category}/`)) return false;
          if (hasSkillMd) {
            return f.type === 'blob' && f.path.endsWith('/SKILL.md');
          }
          // Fallback for mocked trees or subtrees without explicit SKILL.md
          const rel = f.path.slice(`skills/${category}/`.length);
          return (
            !rel.startsWith('references/') &&
            rel !== 'references' &&
            rel !== '_INDEX.md'
          );
        })
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
      const hasTargetSkillMd = tree.some(
        (f) =>
          f.type === 'blob' &&
          f.path.startsWith(`skills/${targetCat}/`) &&
          f.path.endsWith('/SKILL.md'),
      );
      const catSkills = new Set(
        tree
          .filter((f) => {
            if (!f.path.startsWith(`skills/${targetCat}/`)) return false;
            if (hasTargetSkillMd) {
              return f.type === 'blob' && f.path.endsWith('/SKILL.md');
            }
            const rel = f.path.slice(`skills/${targetCat}/`.length);
            return (
              !rel.startsWith('references/') &&
              rel !== 'references' &&
              rel !== '_INDEX.md'
            );
          })
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

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isOverridden(targetPath: string, overrides: string[]): boolean {
    return isOverriddenRel(this.normalizePath(targetPath), overrides);
  }

  private isPathSafe(targetPath: string, skillPath: string): boolean {
    const resolvedBase = path.resolve(skillPath) + path.sep;
    return path.resolve(targetPath).startsWith(resolvedBase);
  }

  private normalizePath(p: string): string {
    return toPosixRel(process.cwd(), p);
  }
}
