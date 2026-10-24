import { z } from 'zod';
import { GitHubTreeItem, RegistryMetadata } from '../models/types';
import { GithubService } from './GithubService';
import { parseFrontmatter } from './validation/interopRules';

/**
 * A registry catalog could not be read or is not authoritative.
 * Callers must not treat this as "no categories/skills selected".
 */
export class SkillCatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkillCatalogError';
  }
}

/** A selectable skill discovered from a real SKILL.md at a specific ref. */
export interface CatalogSkill {
  /** Always qualified as `category/name`. */
  id: string;
  category: string;
  name: string;
  description: string;
}

/** Categories discovered on the registry's reported default branch. */
export interface CategoryCatalog {
  registry: string;
  categories: string[];
  metadata: Partial<RegistryMetadata>;
}

/** A published category release resolved to an exact commit. */
export interface ResolvedCategoryRelease {
  category: string;
  ref: string;
  commit: string;
}

/** Metadata path inside the registry repository. */
const METADATA_PATH = 'skills/metadata.json';
const SKILLS_PREFIX = 'skills/';

type CatalogTransport = Pick<
  GithubService,
  | 'getRepoInfo'
  | 'getRepoTree'
  | 'getRawFile'
  | 'resolveCommit'
  | 'downloadFilesConcurrent'
>;

/**
 * Only the metadata fields the catalog consumes are validated; everything else
 * in a real `metadata.json` passes through untouched.
 */
const categoryReleaseShape = z
  .object({
    version: z.string().optional(),
    tag_prefix: z.string().optional(),
  })
  .passthrough();

const registryMetadataShape = z
  .object({
    global: z.record(z.string(), z.unknown()).optional(),
    categories: z.record(z.string(), categoryReleaseShape).optional(),
    releases: z
      .record(z.string(), z.record(z.string(), z.unknown()))
      .optional(),
    revocations: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

const GIT_SHA_RE = /^[0-9a-f]{40}$/i;
const INVALID_TREE_SEGMENTS = new Set(['', '.', '..']);

/** Repository-relative POSIX path with no traversal or empty segments. */
const treePathShape = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !value.startsWith('/') &&
      !value.endsWith('/') &&
      !value.includes('\\') &&
      !value.includes('\0'),
    { message: 'must be a relative POSIX repository path' },
  )
  .refine(
    (value) =>
      value
        .split('/')
        .every((segment) => !INVALID_TREE_SEGMENTS.has(segment)),
    { message: 'must not contain empty, "." or ".." segments' },
  );

const treeItemShape = z
  .object({
    path: treePathShape,
    type: z.enum(['blob', 'tree']),
    // Every GitHub tree entry carries a 40-character git object sha; without
    // it a blob download could not be integrity-checked against the tree.
    sha: z
      .string()
      .regex(GIT_SHA_RE, 'must be a 40-character git object sha'),
    size: z.number().int().nonnegative().optional(),
    url: z.string().min(1),
  })
  .passthrough();

const treeResponseShape = z
  .object({
    sha: z.string().min(1).optional(),
    url: z.string().min(1).optional(),
    tree: z.array(treeItemShape),
    // Must be explicitly false: a missing flag is not a complete response.
    truncated: z.literal(false),
  })
  .passthrough();

/**
 * Strict, ref-aware reader for the registry skill catalog.
 *
 * Unlike RegistryService's loose discovery (which falls back to a hardcoded
 * category list and `main`), every failure here throws SkillCatalogError so
 * the manager never mistakes a failed fetch for an empty catalog.
 */
export class SkillCatalogService {
  private readonly skillCache = new Map<string, CatalogSkill[]>();
  private readonly releaseCache = new Map<string, ResolvedCategoryRelease>();

  constructor(
    private readonly github: CatalogTransport = new GithubService(
      process.env.GITHUB_TOKEN,
    ),
  ) {}

  /**
   * Loads category discovery plus registry metadata from the configured
   * repository's reported default branch.
   */
  async load(registry: string): Promise<CategoryCatalog> {
    const { owner, repo, branch, tree } = await this.readDefaultBranchTree(
      registry,
    );
    const metadata = await this.readMetadata(owner, repo, branch, registry);

    const categories = Array.from(
      new Set(
        tree
          .filter((item) => item.type === 'tree')
          .map((item) => item.path.split('/'))
          .filter((parts) => parts.length === 2 && parts[0] === 'skills')
          .map((parts) => parts[1]),
      ),
    ).sort((left, right) => left.localeCompare(right));

    return { registry, categories, metadata };
  }

  /**
   * Resolves a category's published release tag from registry metadata and
   * verifies that release actually contains the category. Never falls back to
   * the default branch.
   */
  async resolveRelease(
    catalog: CategoryCatalog,
    category: string,
  ): Promise<ResolvedCategoryRelease> {
    const parsed = this.parseRegistry(catalog.registry);
    const cacheKey = `${catalog.registry}::${category}`;
    const cached = this.releaseCache.get(cacheKey);
    if (cached) return cached;

    const entry = catalog.metadata.categories?.[category];
    if (!entry?.version) {
      throw new SkillCatalogError(
        `Category "${category}" has no published release in ${METADATA_PATH}; refusing to fall back to the default branch`,
      );
    }

    const ref = `${entry.tag_prefix ?? ''}${entry.version}`;
    const commit = await this.github.resolveCommit(
      parsed.owner,
      parsed.repo,
      ref,
    );
    if (!commit) {
      throw new SkillCatalogError(
        `Release ${ref} for category "${category}" does not resolve to a commit in ${catalog.registry}`,
      );
    }

    const tree = await this.readCompleteTree(
      parsed.owner,
      parsed.repo,
      commit,
      `${catalog.registry}@${ref}`,
    );
    const categoryPath = `${SKILLS_PREFIX}${category}`;
    const present = tree.some(
      (item) => item.type === 'tree' && item.path === categoryPath,
    );
    if (!present) {
      throw new SkillCatalogError(
        `Release ${ref} does not contain category "${category}"`,
      );
    }

    const resolved: ResolvedCategoryRelease = { category, ref, commit };
    this.releaseCache.set(cacheKey, resolved);
    return resolved;
  }

  /**
   * Lists the skills that actually exist as `skills/<category>/<skill>/SKILL.md`
   * at the given ref, with frontmatter name/description. Results are cached per
   * run so navigating the manager does not re-download the same ref.
   */
  async listSkills(
    registry: string,
    category: string,
    ref: string,
  ): Promise<CatalogSkill[]> {
    const cacheKey = `${registry}::${category}::${ref}`;
    const cached = this.skillCache.get(cacheKey);
    if (cached) return cached;

    const parsed = this.parseRegistry(registry);
    const tree = await this.readCompleteTree(
      parsed.owner,
      parsed.repo,
      ref,
      `${registry}@${ref}`,
    );
    const prefix = `${SKILLS_PREFIX}${category}/`;
    const entries = tree
      .filter((item) => this.isSkillDefinition(item, prefix))
      .map((item) => ({
        folder: item.path.split('/')[2],
        path: item.path,
        sha: item.sha,
      }))
      .sort((left, right) => left.folder.localeCompare(right.folder));

    if (entries.length === 0) {
      this.skillCache.set(cacheKey, []);
      return [];
    }

    const { ok, failed } = await this.github.downloadFilesConcurrent(
      entries.map((entry) => ({
        owner: parsed.owner,
        repo: parsed.repo,
        ref,
        path: entry.path,
        sha: entry.sha,
      })),
    );
    if (failed.length > 0 || ok.length !== entries.length) {
      const reasons = failed
        .map((failure) => `${failure.path}: ${failure.reason}`)
        .join('; ');
      throw new SkillCatalogError(
        `Could not read every SKILL.md in "${category}" at ${ref}` +
          (reasons ? ` (${reasons})` : ''),
      );
    }

    const contentByPath = new Map(
      ok.map((file) => [file.path, file.content]),
    );
    const skills = entries.map((entry) =>
      this.toCatalogSkill(category, entry.folder, entry.path, contentByPath),
    );

    this.skillCache.set(cacheKey, skills);
    return skills;
  }

  private isSkillDefinition(item: GitHubTreeItem, prefix: string): boolean {
    if (item.type !== 'blob' || !item.path.startsWith(prefix)) return false;
    const parts = item.path.split('/');
    // Only direct skill folders: skills/<category>/<skill>/SKILL.md
    return parts.length === 4 && parts[3] === 'SKILL.md';
  }

  private toCatalogSkill(
    category: string,
    folder: string,
    filePath: string,
    contentByPath: Map<string, string>,
  ): CatalogSkill {
    const id = `${category}/${folder}`;
    const content = contentByPath.get(filePath);
    const frontmatter =
      content === undefined ? null : parseFrontmatter(content);
    if (!frontmatter) {
      throw new SkillCatalogError(
        `Skill "${id}" has no parseable frontmatter; the catalog cannot be treated as complete`,
      );
    }

    const name = frontmatter.name;
    const description = frontmatter.description;
    if (typeof name !== 'string' || name.length === 0) {
      throw new SkillCatalogError(
        `Skill "${id}" is missing a frontmatter name`,
      );
    }
    if (typeof description !== 'string') {
      throw new SkillCatalogError(
        `Skill "${id}" is missing a frontmatter description`,
      );
    }

    return { id, category, name, description };
  }

  private parseRegistry(registry: string): { owner: string; repo: string } {
    const parsed = GithubService.parseGitHubUrl(registry);
    if (!parsed) {
      throw new SkillCatalogError(
        `Registry "${registry}" is not a GitHub repository URL`,
      );
    }
    return parsed;
  }

  private async readDefaultBranchTree(registry: string): Promise<{
    owner: string;
    repo: string;
    branch: string;
    tree: GitHubTreeItem[];
  }> {
    const { owner, repo } = this.parseRegistry(registry);
    const info = await this.github.getRepoInfo(owner, repo);
    const branch = info?.default_branch;
    if (!branch) {
      throw new SkillCatalogError(
        `Could not read the default branch of ${registry}`,
      );
    }

    const tree = await this.readCompleteTree(
      owner,
      repo,
      branch,
      `${registry}@${branch}`,
    );
    return { owner, repo, branch, tree };
  }

  private async readCompleteTree(
    owner: string,
    repo: string,
    ref: string,
    label: string,
  ): Promise<GitHubTreeItem[]> {
    const response = await this.github.getRepoTree(owner, repo, ref);
    if (!response) {
      throw new SkillCatalogError(
        `Could not read the repository tree for ${label}`,
      );
    }

    // GitHub always reports `truncated` explicitly. Requiring `false` (rather
    // than "not true") keeps an incomplete response from masquerading as an
    // authoritative empty catalog, and every entry is validated so a
    // malformed item is a failure, never a silently dropped skill.
    const result = treeResponseShape.safeParse(response);
    if (!result.success) {
      throw new SkillCatalogError(
        `Repository tree for ${label} is not a complete GitHub tree response: ${result.error.issues
          .map((issue) => `${issue.path.join('.') || 'root'} ${issue.message}`)
          .join('; ')}`,
      );
    }
    return result.data.tree;
  }

  private async readMetadata(
    owner: string,
    repo: string,
    branch: string,
    registry: string,
  ): Promise<Partial<RegistryMetadata>> {
    const raw = await this.github.getRawFile(
      owner,
      repo,
      branch,
      METADATA_PATH,
    );
    if (raw === null) {
      throw new SkillCatalogError(
        `Registry metadata ${METADATA_PATH} is missing at ${registry}@${branch}`,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new SkillCatalogError(
        `Registry metadata ${METADATA_PATH} is not valid JSON at ${registry}@${branch}`,
      );
    }

    const result = registryMetadataShape.safeParse(parsed);
    if (!result.success) {
      throw new SkillCatalogError(
        `Registry metadata ${METADATA_PATH} is malformed at ${registry}@${branch}: ${result.error.issues
          .map((issue) => `${issue.path.join('.') || 'root'} ${issue.message}`)
          .join('; ')}`,
      );
    }

    // The schema validates the fields the catalog consumes; the parsed value
    // keeps every other registry field intact for downstream consumers.
    return parsed as Partial<RegistryMetadata>;
  }
}
