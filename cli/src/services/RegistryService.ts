import { GitHubTreeItem, RegistryMetadata } from '../models/types';
import { GithubService } from './GithubService';

export class RegistryService {
  private githubService: GithubService;

  constructor() {
    this.githubService = new GithubService(process.env.GITHUB_TOKEN);
  }

  async discoverRegistry(
    registryUrl: string,
  ): Promise<{ categories: string[]; metadata: Partial<RegistryMetadata> }> {
    let categories: string[] = ['flutter', 'dart'];
    let metadata: Partial<RegistryMetadata> = {};

    try {
      const parsed = this.parseRegistryUrl(registryUrl);
      if (parsed) {
        // Use GithubService to get the tree
        // We need a ref (branch), but discoverRegistry assumes getting default branch logic
        // which was inside fetchRepoTree.
        // GithubService.getRepoTree requires a ref.
        // We should add a resolveBranch method to GithubService or RegistryService?
        // fetchRepoTree in github.ts handled default branch resolution.
        // Let's implement that logic here or in GithubService.
        // Actually, GithubService.getRepoTree requires ref.
        // I will implement a helper 'getRepoTreeWithDefault' or similar logic here using GithubService primitives?
        // Or better, let's just do the default branch check here using GithubService.

        // Wait, fetchRepoTree in github.ts did: if !ref, fetch repo info -> get default_branch.
        // GithubService doesn't have "getDefaultBranch".
        // Use 'main' as default for now or fetch repo info.
        // Let's add strict 'main' fallback if no ref provided,
        // to simplify, as GithubService.getRepoTree expects a ref.
        // But previously it fetched the default branch.
        // Let's implement a small fetch for default branch here.

        let branch = 'main';
        // Try to get default branch from repo info
        try {
          const repoInfo = await fetch(
            `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
          );
          if (repoInfo.ok) {
            const data = (await repoInfo.json()) as { default_branch?: string };
            if (data.default_branch) branch = data.default_branch;
          }
        } catch {
          // ignore
        }

        const treeResult = await this.githubService.getRepoTree(
          parsed.owner,
          parsed.repo,
          branch,
        );

        if (treeResult && Array.isArray(treeResult.tree)) {
          const allFiles = treeResult.tree || [];
          const foundCategories = new Set<string>();
          allFiles.forEach((f: GitHubTreeItem) => {
            if (f.path.startsWith('skills/') && f.type === 'tree') {
              const parts = f.path.split('/');
              if (parts.length === 2) foundCategories.add(parts[1]);
            }
          });
          if (foundCategories.size > 0)
            categories = Array.from(foundCategories);

          const metaUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${branch}/skills/metadata.json`;
          const metaRes = await fetch(metaUrl);
          if (metaRes.ok) {
            metadata = (await metaRes.json()) as RegistryMetadata;
          }
        }
      }
    } catch {
      // Return defaults on error
    }

    return { categories, metadata };
  }

  private parseRegistryUrl(registryUrl: string) {
    const m = registryUrl.match(/github\.com\/([^/]+)\/([^/]+)/i);
    if (!m) return null;
    return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
  }
}
