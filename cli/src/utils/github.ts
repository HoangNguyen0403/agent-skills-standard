import fetch from 'node-fetch';
import { GitHubTreeResponse } from '../models/types';

export function parseRegistryUrl(registryUrl: string) {
  const m = registryUrl.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
}

export async function fetchRepoTree(
  owner: string,
  repo: string,
  ref?: string,
): Promise<{ data: GitHubTreeResponse; branch: string } | null> {
  try {
    let branch = ref;

    if (!branch) {
      // Resolve default branch
      const repoRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
      );
      if (!repoRes.ok) return null;
      const repoData = (await repoRes.json()) as { default_branch?: string };
      branch = repoData.default_branch || 'main';
    }

    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    const res = await fetch(treeUrl, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as GitHubTreeResponse;
    return { data, branch };
  } catch {
    return null;
  }
}

export default fetchRepoTree;
