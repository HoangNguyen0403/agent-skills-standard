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
      const parsed = GithubService.parseGitHubUrl(registryUrl);
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
    } catch (error) {
      if (process.env.DEBUG) {
        console.warn(`[RegistryService] Registry discovery failed: ${error}`);
      }
    }

    return { categories, metadata };
  }

  async getFrameworkSkills(
    registryUrl: string,
    framework: string,
  ): Promise<string[]> {
    try {
      const parsed = GithubService.parseGitHubUrl(registryUrl);
      if (!parsed) return [];

      const treeResult = await this.githubService.getRepoTree(
        parsed.owner,
        parsed.repo,
        'main',
      );

      if (!treeResult || !Array.isArray(treeResult.tree)) return [];

      return Array.from(
        new Set(
          treeResult.tree
            .filter((f: GitHubTreeItem) =>
              f.path.startsWith(`skills/${framework}/`),
            )
            .map((f: GitHubTreeItem) => f.path.split('/')[2])
            .filter(Boolean),
        ),
      );
    } catch {
      return [];
    }
  }
}
