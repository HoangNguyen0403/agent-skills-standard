import pc from 'picocolors';
import { GitHubTreeResponse } from '../models/types';

export class GithubService {
  private baseUrl = 'https://api.github.com';
  private rawBaseUrl = 'https://raw.githubusercontent.com';

  constructor(private token?: string) {}

  private get headers() {
    const h: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (this.token) {
      h.Authorization = `token ${this.token}`;
    }
    return h;
  }

  async getRepoTree(
    owner: string,
    repo: string,
    ref: string,
  ): Promise<GitHubTreeResponse | null> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
    try {
      const res = await fetch(url, { headers: this.headers });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`GitHub API Error: ${res.status} ${res.statusText}`);
      }
      return (await res.json()) as GitHubTreeResponse;
    } catch (error) {
      console.error(pc.red(`Failed to fetch repo tree: ${error}`));
      return null;
    }
  }

  async getRawFile(
    owner: string,
    repo: string,
    ref: string,
    path: string,
  ): Promise<string | null> {
    const url = `${this.rawBaseUrl}/${owner}/${repo}/${ref}/${path}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.text();
    } catch (error) {
      console.error(pc.red(`Failed to fetch file ${path}: ${error}`));
      return null;
    }
  }

  async getLatestReleaseTag(
    owner: string,
    repo: string,
  ): Promise<string | null> {
    try {
      const res = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/releases/latest`,
        {
          headers: this.headers,
        },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { tag_name: string };
      return data.tag_name;
    } catch {
      return null;
    }
  }

  async getRepoInfo(
    owner: string,
    repo: string,
  ): Promise<{ default_branch: string } | null> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}`;
    try {
      const res = await fetch(url, { headers: this.headers });
      if (!res.ok) return null;
      return (await res.json()) as { default_branch: string };
    } catch (error) {
      console.error(pc.red(`Failed to fetch repo info: ${error}`));
      return null;
    }
  }

  /**
   * Downloads multiple files concurrently with a limit.
   */
  async downloadFilesConcurrent(
    tasks: { owner: string; repo: string; ref: string; path: string }[],
    concurrency: number = 10,
  ): Promise<{ path: string; content: string }[]> {
    const results: { path: string; content: string }[] = [];
    const pool = [...tasks];
    const executing: Promise<void>[] = [];

    const worker = async () => {
      while (pool.length > 0) {
        const task = pool.shift();
        if (!task) break;

        const content = await this.getRawFile(
          task.owner,
          task.repo,
          task.ref,
          task.path,
        );
        if (content !== null) {
          results.push({ path: task.path, content });
        }
      }
    };

    // Spawn workers
    for (let i = 0; i < Math.min(concurrency, tasks.length); i++) {
      executing.push(worker());
    }

    await Promise.all(executing);
    return results;
  }

  static parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    const m = url.match(/github\.com\/([^/]+)\/([^/]+)/i);
    if (!m) return null;
    return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
  }

  async getLatestPackageVersion(
    owner: string,
    repo: string,
  ): Promise<string | null> {
    const pkgJson = await this.getRawFile(
      owner,
      repo,
      'main',
      'cli/package.json',
    );
    if (!pkgJson) return null;
    try {
      const pkg = JSON.parse(pkgJson);
      return pkg.version;
    } catch {
      return null;
    }
  }
}
