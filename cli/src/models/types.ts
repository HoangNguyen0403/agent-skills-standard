export interface GitHubTreeItem {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export interface CategoryMetadata {
  version?: string;
  last_updated?: string;
  tag_prefix?: string;
}

export interface RegistryMetadata {
  global: {
    author: string;
    repository: string;
  };
  categories: {
    [key: string]: CategoryMetadata;
  };
}
