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
  /** Category/ref combinations consumers should no longer trust. See docs/SECURITY.md's revocation process. */
  revocations?: RevocationEntry[];
}

/**
 * Represents a skill that has been fetched from the registry and is ready to be written.
 */
export interface CollectedSkill {
  /** Category ID of the skill */
  category: string;
  /** Name/ID of the skill */
  skill: string;
  /** List of files (relative path and content) belonging to the skill */
  files: { name: string; content: string }[];
}
