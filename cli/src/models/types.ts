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
