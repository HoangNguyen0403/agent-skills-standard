// scripts/freshness/sources.ts
import type { UpstreamEntry } from "./types";
import { compareVersions, parseVersion } from "./versions";

/** Newest upstream version resolved for a pin. */
export interface LatestRelease {
  /** Normalized version, e.g. "16.2.0" or "18.1". */
  version: string;
  /** Raw tag name as published upstream. */
  tag: string;
  /** ISO timestamp when known (Releases API); null for bare tags. */
  publishedAt: string | null;
  /** Human-facing release or tag page. */
  url: string;
}

/**
 * Resolves the latest upstream version for a pin. Returns null when there
 * is nothing to compare (manual pins, no matching tag). Throws on transport
 * or API errors so the caller can report `fetch-failed`.
 */
export interface UpstreamSource {
  latest(entry: UpstreamEntry): Promise<LatestRelease | null>;
}

/**
 * Turns a tag into a comparable version. With a pattern, every capture
 * group is joined with "."; without one, a leading "v" is stripped and the
 * remainder must be 1-3 numeric parts. Returns null when the tag does not
 * qualify (prereleases, unrelated tags).
 */
export function extractVersionFromTag(
  tag: string,
  tagPattern: string | undefined,
): string | null {
  if (tagPattern) {
    const match = tag.match(new RegExp(tagPattern));
    if (!match || match.length < 2) return null;
    const version = match.slice(1).filter((g) => g !== undefined).join(".");
    return parseVersion(version) ? version : null;
  }
  const bare = tag.replace(/^v/i, "");
  return parseVersion(bare) ? bare : null;
}

interface GithubSourceOptions {
  /** Injectable fetch for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Personal/Actions token; sent as a Bearer header when present. */
  token?: string;
  /** API origin; defaults to https://api.github.com. */
  baseUrl?: string;
  /** How many 100-tag pages to scan when falling back to tags; default 10 (1,000 tags). */
  maxTagPages?: number;
}

/** GitHub releases/latest with a tags fallback for repos that publish no Releases. */
export class GithubSource implements UpstreamSource {
  private readonly fetchImpl: typeof fetch;
  private readonly token: string | undefined;
  private readonly baseUrl: string;
  private readonly maxTagPages: number;

  constructor(options: GithubSourceOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.token = options.token;
    this.baseUrl = options.baseUrl ?? "https://api.github.com";
    this.maxTagPages = options.maxTagPages ?? 10;
  }

  /** See UpstreamSource.latest. */
  async latest(entry: UpstreamEntry): Promise<LatestRelease | null> {
    if (entry.source !== "github" || !entry.repo) return null;
    const fromRelease = await this.latestRelease(entry);
    if (fromRelease) return fromRelease;
    return this.latestTag(entry);
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "agent-skills-standard-freshness",
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    return headers;
  }

  private async get(path: string, repo: string): Promise<{ status: number; json: unknown }> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, { headers: this.headers() });
    if (res.status === 404) return { status: 404, json: null };
    if (!res.ok) throw new Error(`GitHub ${res.status} for ${repo}: ${res.statusText}`);
    return { status: res.status, json: await res.json() };
  }

  private async latestRelease(entry: UpstreamEntry): Promise<LatestRelease | null> {
    const repo = entry.repo as string;
    const { status, json } = await this.get(`/repos/${repo}/releases/latest`, repo);
    if (status === 404 || !json || typeof json !== "object") return null;
    const data = json as { tag_name?: string; published_at?: string | null; html_url?: string };
    if (!data.tag_name) return null;
    const version = extractVersionFromTag(data.tag_name, entry.tag_pattern);
    if (!version) return null;
    return {
      version,
      tag: data.tag_name,
      publishedAt: data.published_at ?? null,
      url: data.html_url ?? `https://github.com/${repo}/releases/tag/${data.tag_name}`,
    };
  }

  private async latestTag(entry: UpstreamEntry): Promise<LatestRelease | null> {
    const repo = entry.repo as string;
    let best: { version: string; parts: number[]; tag: string } | null = null;
    for (let page = 1; page <= this.maxTagPages; page++) {
      const { status, json } = await this.get(`/repos/${repo}/tags?per_page=100&page=${page}`, repo);
      if (status === 404 || !Array.isArray(json) || json.length === 0) break;
      for (const item of json as { name?: string }[]) {
        if (!item.name) continue;
        const version = extractVersionFromTag(item.name, entry.tag_pattern);
        const parts = version ? parseVersion(version) : null;
        if (!version || !parts) continue;
        if (!best || compareVersions(parts, best.parts) > 0) best = { version, parts, tag: item.name };
      }
    }
    if (!best) return null;
    return {
      version: best.version,
      tag: best.tag,
      publishedAt: null,
      url: `https://github.com/${repo}/releases/tag/${best.tag}`,
    };
  }
}

/** Pins with `source: manual` are never fetched; only their review age is audited. */
export class ManualSource implements UpstreamSource {
  /** Always null: nothing to compare. */
  async latest(): Promise<LatestRelease | null> {
    return null;
  }
}

const MANUAL = new ManualSource();

/** Picks the source implementation for an entry. */
export function resolveSource(entry: UpstreamEntry, github: GithubSource): UpstreamSource {
  return entry.source === "github" ? github : MANUAL;
}
