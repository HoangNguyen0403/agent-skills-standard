import fetch from 'node-fetch';
import { GitHubTreeItem, RegistryMetadata } from '../models/types';
import { fetchRepoTree, parseRegistryUrl } from '../utils/github';

export class RegistryService {
  async discoverRegistry(
    registryUrl: string,
  ): Promise<{ categories: string[]; metadata: Partial<RegistryMetadata> }> {
    let categories: string[] = ['flutter', 'dart'];
    let metadata: Partial<RegistryMetadata> = {};

    try {
      const parsed = parseRegistryUrl(registryUrl);
      if (parsed) {
        const treeResult = await fetchRepoTree(parsed.owner, parsed.repo);
        if (treeResult && Array.isArray(treeResult.data.tree)) {
          const allFiles = treeResult.data.tree || [];
          const foundCategories = new Set<string>();
          allFiles.forEach((f: GitHubTreeItem) => {
            if (f.path.startsWith('skills/') && f.type === 'tree') {
              const parts = f.path.split('/');
              if (parts.length === 2) foundCategories.add(parts[1]);
            }
          });
          if (foundCategories.size > 0)
            categories = Array.from(foundCategories);

          const metaUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${treeResult.branch}/skills/metadata.json`;
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
}
