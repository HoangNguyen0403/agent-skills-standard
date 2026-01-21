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
        let branch = 'main';
        const repoInfo = await this.githubService.getRepoInfo(
          parsed.owner,
          parsed.repo,
        );
        if (repoInfo && repoInfo.default_branch) {
          branch = repoInfo.default_branch;
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

          const metaContent = await this.githubService.getRawFile(
            parsed.owner,
            parsed.repo,
            branch,
            'skills/metadata.json',
          );
          if (metaContent) {
            metadata = JSON.parse(metaContent) as RegistryMetadata;
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
