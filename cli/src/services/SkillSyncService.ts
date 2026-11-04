import * as yaml from 'js-yaml';
import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';
import { Agent, SUPPORTED_AGENTS } from '../constants';
import { SkillConfig } from '../models/config';
import {
  AttributionDestinationBinding,
  AttributionFileRecord,
  AttributionPackageRecord,
  AttributionSourceRecord,
  AttributionVerificationBasis,
  CollectedSkill,
  GitHubTreeItem,
  GitHubTreeResponse,
  SkillOrigin,
} from '../models/types';
import { sha256 } from './LockfileService';
import { GithubService, IntegrityError } from './GithubService';
import { resolveSkillFolders } from './SkillSelectionService';
import { isOverriddenRel, toPosixRel } from './install/pathMatch';
import { InstallWriter, PassthroughWriter } from './install/OwnershipWriter';
import { ManifestVerifier } from './install/ManifestVerifier';
import { assertNoSymlinksUnderRoot } from './install/safePath';

const GIT_BLOB_SHA1_RE = /^[0-9a-f]{40}$/;
const ATTRIBUTION_FAMILY_RE = /^(LICENSE|NOTICE)(?:\.(?:md|txt))?$/i;

interface WrittenAttributionBinding {
  name: string;
  binding: AttributionDestinationBinding;
}

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
  private readonly failureDetails = new Map<string, string>();

  constructor(private githubService: GithubService) {}

  /**
   * Assembles skills from the remote registry based on provided categories and configuration.
   */
  async assembleSkills(
    categories: string[],
    config: SkillConfig,
    verifiers: Record<string, ManifestVerifier> = {},
    /**
     * Pre-validated trees for the exact resolved commits. When supplied, these
     * are the authoritative source and no second fetch may replace them.
     */
    trees: Record<string, GitHubTreeResponse> = {},
    /**
     * Declaring category -> resolved source. When supplied, every collected
     * package records its declaring ref/commit and a physical package selected
     * from incompatible sources is rejected instead of silently overwritten.
     */
    origins: Record<string, { ref: string; commit: string | null }> = {},
    requireSkillDefinition = false,
  ): Promise<CollectedSkill[]> {
    this.failedPackagesByCategory.clear();
    this.failedCategories.clear();
    this.failureDetails.clear();

    const collected: CollectedSkill[] = [];
    const collectedOrigins = new Map<string, SkillOrigin>();
    const conflicts: string[] = [];
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
      const resolvedSource = origins[category];
      const commit =
        resolvedSource?.commit &&
        GIT_BLOB_SHA1_RE.test(resolvedSource.commit)
          ? resolvedSource.commit
          : undefined;
      const verifier = verifiers[category];
      if (verifier && commit) {
        const rejection = verifier.checkSourceCommit(commit);
        if (rejection) {
          // A manifest that does not describe the resolved commit is an
          // integrity failure, not a recoverable assembly/package failure.
          throw new IntegrityError(`${category}@${ref}: ${rejection}`);
        }
      }
      // Acquisition is bound to the resolved commit when known, so a tag that
      // moved after resolution cannot supply bytes for a different commit.
      const treeData =
        trees[category] ??
        (commit
          ? await this.githubService.getRepoTree(owner, repo, ref, { commit })
          : await this.githubService.getRepoTree(owner, repo, ref));
      if (!treeData) {
        this.failedCategories.add(category);
        console.log(pc.red(`    ❌ Failed to fetch ${category}@${ref}.`));
        continue;
      }

      const origin: SkillOrigin | undefined = resolvedSource
        ? {
            category,
            ref: resolvedSource.ref,
            commit: resolvedSource.commit,
          }
        : undefined;
      const source =
        commit && resolvedSource
          ? { requestedRef: resolvedSource.ref, resolvedCommit: commit }
          : undefined;

      const foldersToSync = resolveSkillFolders(
        category,
        catConfig,
        treeData.tree,
        requireSkillDefinition,
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
          source,
        );
        if (skill) {
          const collectedSkill = origin ? { ...skill, origin } : skill;
          if (origin) {
            const key = `${skill.category}/${skill.skill}`;
            const previous = collectedOrigins.get(key);
            if (previous) {
              const sameSource =
                previous.commit !== null
                  ? previous.commit === origin.commit
                  : origin.commit === null && previous.ref === origin.ref;
              if (!sameSource) {
                conflicts.push(
                  `${key} (conflicting sources ${previous.category}@${previous.ref} vs ${origin.category}@${origin.ref})`,
                );
              }
              continue;
            }
            collectedOrigins.set(key, origin);
          }
          collected.push(collectedSkill);
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
      ...conflicts,
      ...Array.from(this.failedPackagesByCategory).flatMap(
        ([category, skills]) =>
          Array.from(skills, (skill) => {
            const key = `${category}/${skill}`;
            const detail = this.failureDetails.get(key);
            return detail ? `${key} (${detail})` : key;
          }),
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
    writer: InstallWriter = new PassthroughWriter(process.cwd()),
    rootDir: string = process.cwd(),
  ): Promise<Record<string, AttributionPackageRecord>> {
    const overrides = config.custom_overrides || [];
    const written = new Map<string, AttributionDestinationBinding[]>();

    // Inspect every selected destination before writing the first agent's copy.
    for (const agentId of agents) {
      const basePath = SUPPORTED_AGENTS.find(
        (agent) => agent.id === agentId,
      )?.path;
      if (!basePath) continue;
      for (const skill of skills) {
        await this.writeSkillForAgent(
          agentId,
          skill,
          overrides,
          basePath,
          writer,
          config,
          true,
          rootDir,
        );
      }
    }

    for (const agentId of agents) {
      const agentDef = SUPPORTED_AGENTS.find((agent) => agent.id === agentId);
      if (!agentDef?.path) continue;

      const basePath = agentDef.path;

      for (const skill of skills) {
        const bindings = await this.writeSkillForAgent(
          agentId,
          skill,
          overrides,
          basePath,
          writer,
          config,
          false,
          rootDir,
        );
        for (const { name, binding } of bindings) {
          const key = `${skill.category}/${skill.skill}\0${name}`;
          const existing = written.get(key) ?? [];
          if (
            !existing.some(
              (current) =>
                current.agent === binding.agent &&
                current.path === binding.path,
            )
          ) {
            existing.push(binding);
          }
          written.set(key, existing);
        }
      }
      console.log(pc.gray(`  - Updated ${basePath}/ (${agentDef.name})`));
    }

    const registry = config.registry ?? '';
    const packages: Record<string, AttributionPackageRecord> = {};
    for (const skill of skills) {
      const origin = skill.origin;
      if (!origin?.commit || !GIT_BLOB_SHA1_RE.test(origin.commit)) continue;
      const files: AttributionFileRecord[] = [];
      for (const file of skill.files) {
        if (!file.attribution) continue;
        const destinations = written.get(
          `${skill.category}/${skill.skill}\0${file.name}`,
        );
        // Only bytes actually published keep qualified metadata; overridden or
        // otherwise skipped files are never stamped.
        if (!destinations || destinations.length === 0) continue;
        files.push({
          ...file.attribution,
          name: file.name,
          destinations,
        });
      }
      if (files.length === 0) continue;
      packages[`${skill.category}/${skill.skill}`] = {
        registry,
        declaringCategory: origin.category,
        requestedRef: origin.ref,
        resolvedCommit: origin.commit,
        files,
      };
    }
    return packages;
  }

  private async writeSkillForAgent(
    agentId: string,
    skill: CollectedSkill,
    overrides: string[],
    basePath: string,
    writer: InstallWriter,
    config: SkillConfig,
    preflightOnly = false,
    rootDir: string = basePath,
  ): Promise<WrittenAttributionBinding[]> {
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
    const source = `skill:${skill.category}/${skill.skill}@${
      skill.origin?.ref ?? config.skills?.[skill.category]?.ref ?? 'main'
    }`;
    const pending: Array<{
      target: string;
      content: string | Buffer;
      name: string;
      attributed: boolean;
    }> | null = preflightOnly ? null : [];
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
      await assertNoSymlinksUnderRoot(rootDir, targetFilePath);
      if (pending === null) continue;
      // Raw download bytes unless an adapter transform needs the text.
      const content =
        isKiro && fileItem.name === 'SKILL.md'
          ? this.transformSkillForKiro(fileItem.content, skill.category)
          : (fileItem.bytes ?? fileItem.content);
      pending.push({
        target: targetFilePath,
        content,
        name: fileItem.name,
        attributed: fileItem.attribution !== undefined,
      });
    }
    if (pending === null) return [];

    const bindings: WrittenAttributionBinding[] = [];
    for (const { target, content, name, attributed } of pending) {
      await writer.write(target, content, {
        owner: 'skill',
        source,
        agent: agentId,
      });
      if (!attributed) continue;
      // The writer may have refused the write (user-edited owned file,
      // unknown file, or an ownership conflict). Provenance is only recorded
      // for bytes that are actually installed now; consent never overrides
      // ownership protection.
      const installedDigest = await this.readInstalledDigest(target);
      const writtenDigest = sha256(content);
      if (installedDigest !== writtenDigest) continue;
      // The installed digest is derived from the bytes actually written for
      // this agent, so an adapter transform is recorded instead of assumed.
      bindings.push({
        name,
        binding: {
          agent: agentId,
          path: toPosixRel(rootDir, target),
          sha256: writtenDigest,
        },
      });
    }
    return bindings;
  }

  /** Digest of the file as it exists on disk, or null when unreadable. */
  private async readInstalledDigest(absPath: string): Promise<string | null> {
    try {
      return sha256(await fs.readFile(absPath));
    } catch {
      return null;
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
    source?: { requestedRef: string; resolvedCommit: string },
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
    // LICENSE and NOTICE are separate families: any package-local member of a
    // family supersedes the repository-root member, regardless of extension
    // variant. This never drops the other family.
    const localFamilies = new Set(
      packageFiles
        .map((file) =>
          this.attributionFamily(file.path.slice(prefix.length)),
        )
        .filter((family): family is 'license' | 'notice' => family !== null),
    );
    const rootAttributionFiles = tree.filter((file) => {
      if (file.type !== 'blob' || !this.isRootAttributionFile(file.path)) {
        return false;
      }
      const family = this.attributionFamily(file.path);
      if (!family || localFamilies.has(family)) return false;
      return !packageFiles.some(
        (packageFile) =>
          packageFile.path.slice(prefix.length).toLowerCase() ===
          file.path.toLowerCase(),
      );
    });
    const selectedFiles = [...packageFiles, ...rootAttributionFiles].sort(
      (left, right) => left.path.localeCompare(right.path),
    );
    const downloadTasks = selectedFiles.map((file) => ({
      owner,
      repo,
      ref,
      path: file.path,
      sha: file.sha,
      ...(source ? { commit: source.resolvedCommit } : {}),
    }));

    const { ok: files, failed } =
      await this.githubService.downloadFilesConcurrentBytes(downloadTasks);

    // The selected category owns the fetched tree/ref; a physical category's
    // unrelated release manifest cannot verify an imported package.
    const verifier = verifiers[category];
    let integrityFailure: { path: string; reason: string } | undefined;
    if (verifier) {
      for (const f of files) {
        if (this.isRootAttributionFile(f.path)) {
          // Repo-root LICENSE/NOTICE sit outside every category scope; a
          // manifest that binds them must be enforced, and a legacy manifest
          // without a root entry leaves the commit-tree/blob basis.
          const rejection = verifier.checkRootAttribution(f.path, f.content);
          if (rejection) {
            failed.push({ path: f.path, reason: rejection });
            integrityFailure ??= { path: f.path, reason: rejection };
          }
          continue;
        }
        const rejection = verifier.check(f.path, f.content);
        if (rejection) {
          failed.push({ path: f.path, reason: rejection });
          integrityFailure ??= { path: f.path, reason: rejection };
        }
      }
    }
    for (const failure of failed) {
      console.log(
        pc.red(
          `    ❌ ${sourceCat}/${skillName}: ${failure.path} — ${failure.reason}`,
        ),
      );
    }
    if (integrityFailure) {
      // An explicit manifest rejection is content-integrity evidence, not a
      // missing/incomplete package: surface the detailed path and digest
      // diagnostic as a typed IntegrityError the command can classify.
      throw new IntegrityError(
        `Release manifest verification failed for ${sourceCat}/${skillName}: ${integrityFailure.path} — ${integrityFailure.reason}`,
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
      this.markPackageFailed(
        sourceCat,
        skillName,
        failed[0]?.reason ??
          (hasSkillDefinition ? 'downloaded file count mismatch' : 'missing SKILL.md'),
      );
      return null;
    }

    const blobShaByPath = new Map(
      selectedFiles.map((file) => [file.path, file.sha]),
    );
    const records = new Map<string, AttributionSourceRecord>();
    if (source) {
      for (const file of files) {
        const isPackageFile = file.path.startsWith(prefix);
        const name = isPackageFile
          ? file.path.slice(prefix.length)
          : file.path;
        if (this.attributionFamily(name) === null) continue;
        const blobSha1 = blobShaByPath.get(file.path);
        if (!blobSha1 || !GIT_BLOB_SHA1_RE.test(blobSha1)) {
          // A Git blob SHA-1 is required source evidence; a missing or
          // non-SHA-1 tree identity is an integrity failure, not a fallback to
          // a content digest.
          this.markPackageFailed(
            sourceCat,
            skillName,
            `missing Git blob identity for ${file.path}`,
          );
          return null;
        }
        // The exact bytes that were written define attribution; text decoding
        // is never used to re-encode them.
        const basis: AttributionVerificationBasis = verifier?.hasManifestEntry(
          file.path,
        )
          ? 'release-manifest'
          : 'commit-tree-blob';
        records.set(name, {
          sourcePath: file.path,
          sourceKind: isPackageFile ? 'package' : 'root',
          requestedRef: source.requestedRef,
          resolvedCommit: source.resolvedCommit,
          blobSha1,
          sha256: sha256(file.content),
          basis,
        });
      }
    }

    console.log(
      pc.gray(
        `    + Fetched ${sourceCat}/${skillName} (${files.length} files)`,
      ),
    );
    return {
      category: sourceCat,
      skill: skillName,
      files: files.map((file) => {
        const name = file.path.startsWith(prefix)
          ? file.path.slice(prefix.length)
          : file.path;
        const attribution = records.get(name);
        return {
          name,
          content: file.content.toString('utf8'),
          bytes: file.content,
          ...(attribution ? { attribution } : {}),
        };
      }),
    };
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

  private attributionFamily(filePath: string): 'license' | 'notice' | null {
    // Only a top-level LICENSE/NOTICE is attribution. A nested file such as
    // references/LICENSE is an ordinary package resource: it is neither a
    // family override nor a recordable attribution file.
    if (filePath.includes('/')) return null;
    const match = ATTRIBUTION_FAMILY_RE.exec(filePath);
    if (!match) return null;
    return match[1].toLowerCase() === 'license' ? 'license' : 'notice';
  }

  private isRootAttributionFile(filePath: string): boolean {
    return this.attributionFamily(filePath) !== null;
  }

  private markPackageFailed(
    category: string,
    skill: string,
    detail?: string,
  ): void {
    let failedSkills = this.failedPackagesByCategory.get(category);
    if (!failedSkills) {
      failedSkills = new Set<string>();
      this.failedPackagesByCategory.set(category, failedSkills);
    }
    failedSkills.add(skill);
    const key = `${category}/${skill}`;
    if (detail && !this.failureDetails.has(key)) {
      this.failureDetails.set(key, detail);
    }
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
