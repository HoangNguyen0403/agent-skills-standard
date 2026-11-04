/**
 * Item representing a file or directory in a GitHub Git Tree.
 */
export interface GitHubTreeItem {
  /** Path relative to the repository root */
  path: string;
  /** Type of the item: blob (file) or tree (directory) */
  type: 'blob' | 'tree';
  /** Git SHA hash of the item */
  sha: string;
  /** Size in bytes (only for blobs) */
  size?: number;
  /** GitHub API URL for the item */
  url: string;
}

/**
 * Response from the GitHub Get Tree API.
 */
export interface GitHubTreeResponse {
  /** Git SHA of the requested tree */
  sha: string;
  /** GitHub API URL of the tree */
  url: string;
  /** Array of items in the tree */
  tree: GitHubTreeItem[];
  /** Whether the tree data was truncated by the API */
  truncated: boolean;
}

/**
 * Upstream dependency pin used by the freshness audit
 * (scripts/freshness). Mirrors `upstreamEntrySchema` in
 * cli/src/schemas/skill-frontmatter.ts.
 */
export interface UpstreamEntry {
  name: string;
  source: 'github' | 'manual';
  repo?: string;
  pinned: string;
  tag_pattern?: string;
  reviewed: string;
  /** Newest known upstream version not yet reviewed against; drift up to it reports low. */
  acknowledged?: string;
}

/**
 * Metadata for a specific skill category.
 */
export interface CategoryMetadata {
  /** Current version of the category */
  version?: string;
  /** ISO timestamp of the last update */
  last_updated?: string;
  /** Prefix used for Git tags in this category */
  tag_prefix?: string;
  /**
   * GitHub handles responsible for reviewing changes to this category.
   * Informational today (mirrors, but does not replace, .github/CODEOWNERS
   * — a real per-category CODEOWNERS entry is what GitHub actually
   * enforces); this field exists so the ownership record travels with the
   * published registry metadata itself, not only this repo's local config.
   */
  owners?: string[];
  /** Upstream pins the category's skills were reviewed against. */
  upstream?: UpstreamEntry[];
}

/**
 * A category/ref pair a consumer should stop trusting — e.g. a version that
 * turned out to carry a vulnerability disclosed after release. `ags sync`/
 * `ags update` check the installed ref for each category against this list.
 */
export interface RevocationEntry {
  /** Category this revocation applies to. */
  category: string;
  /** Exact ref(s) affected (e.g. ["typescript-v1.3.3"]). */
  refs: string[];
  /** Human-readable reason, shown to the user. */
  reason: string;
  /** Link to a security advisory, if one exists. */
  advisory?: string;
  /** ISO date the revocation was recorded. */
  date: string;
}

/**
 * Root metadata structure for the skill registry (metadata.json).
 */
export interface RegistryMetadata {
  /** Global registry settings */
  global: {
    /** Registry author/owner */
    author: string;
    /** Original repository URL */
    repository: string;
  };
  /** Map of category IDs and their metadata */
  categories: {
    [key: string]: CategoryMetadata;
  };
  /** Non-skill release tracks published with this registry (e.g. workflows). */
  releases?: Record<string, { version: string; tag_prefix: string }>;
  /** Category/ref combinations consumers should no longer trust. See docs/SECURITY.md's revocation process. */
  revocations?: RevocationEntry[];
}

/**
 * Represents a skill that has been fetched from the registry and is ready to be written.
 */
export interface CollectedSkillFile {
  /** Path relative to the installed skill directory */
  name: string;
  /** UTF-8 content for text transforms and legacy consumers */
  content: string;
  /** Original download bytes; written when no adapter transform is required */
  bytes?: Buffer;
  /**
   * Declaring-source identity of this exact file. Present only when the
   * acquisition was bound to a resolved commit; never synthesized from the
   * current branch or a lockfile default.
   */
  attribution?: AttributionSourceRecord;
}

/**
 * Where an attribution file came from: inside the selected package tree or the
 * repository root of the same selected source.
 */
export type AttributionSourceKind = 'package' | 'root';

/**
 * How the downloaded bytes were verified. `release-manifest` means the digest
 * was checked against a release manifest bound to the resolved commit;
 * `commit-tree-blob` means only the pinned commit tree's blob identity and the
 * downloaded bytes were checked.
 */
export type AttributionVerificationBasis =
  'release-manifest' | 'commit-tree-blob';

/**
 * Source identity of one attribution file captured at download time.
 */
export interface AttributionSourceRecord {
  /** Bounded repository-relative source path of the exact bytes. */
  sourcePath: string;
  sourceKind: AttributionSourceKind;
  /** Requested ref of the declaring source (tag or branch). */
  requestedRef: string;
  /** Commit actually fetched for the declaring source. */
  resolvedCommit: string;
  /** Git blob SHA-1 from the pinned tree; never a truncated SHA-256. */
  blobSha1: string;
  /** SHA-256 of the exact source bytes. */
  sha256: string;
  basis: AttributionVerificationBasis;
}

/**
 * One installed copy of an attribution file for a specific agent.
 */
export interface AttributionDestinationBinding {
  agent: string;
  /** Bounded project-relative installed path. */
  path: string;
  /** SHA-256 of the bytes actually written for this agent. */
  sha256: string;
}

/**
 * Qualified attribution record for one installed file.
 */
export interface AttributionFileRecord extends AttributionSourceRecord {
  /** Filename relative to the installed skill directory. */
  name: string;
  destinations: AttributionDestinationBinding[];
}

/**
 * Qualified attribution record for one physical package (`<category>/<skill>`).
 */
export interface AttributionPackageRecord {
  registry: string;
  /** Category whose configuration selected this physical package. */
  declaringCategory: string;
  requestedRef: string;
  resolvedCommit: string;
  files: AttributionFileRecord[];
}

/**
 * Additive provenance namespace inside the version-2 lock. Missing is valid
 * legacy state and must never be read as an invented origin.
 */
export interface AttributionCatalog {
  version: 1;
  packages: Record<string, AttributionPackageRecord>;
}

/**
 * Declaring source of a collected package. A category may install a skill from
 * another category via a qualified include; provenance keeps the declaring
 * category's ref/commit attached to the physical package.
 */
export interface SkillOrigin {
  /** Declaring category whose configuration selected the package */
  category: string;
  /** Human-readable pinned ref of the declaring category */
  ref: string;
  /** Commit actually fetched for the declaring category */
  commit: string | null;
}

/**
 * Represents a skill that has been fetched from the registry and is ready to be written.
 */
export interface CollectedSkill {
  /** Category ID of the skill */
  category: string;
  /** Name/ID of the skill */
  skill: string;
  /** List of package files belonging to the skill */
  files: CollectedSkillFile[];
  /** Declaring source when assembled by a prepared, source-bound apply. */
  origin?: SkillOrigin;
}
