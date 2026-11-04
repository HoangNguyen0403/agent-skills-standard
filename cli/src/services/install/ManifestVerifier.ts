import { createHash } from 'node:crypto';
import { ReleaseManifest } from '../GithubService';

function normalizeRepoPath(repoPath: string): string {
  return repoPath.replace(/^(\.\/|\/)+/, '');
}

function sha256(content: Buffer | string): string {
  return createHash('sha256')
    .update(content, Buffer.isBuffer(content) ? undefined : 'utf8')
    .digest('hex');
}

function isListed(manifest: ReleaseManifest, repoPath: string): boolean {
  return Object.prototype.hasOwnProperty.call(manifest.files, repoPath);
}

export class ManifestVerifier {
  constructor(private manifest: ReleaseManifest | null) {}

  /** Resolved commit this manifest claims, or null when no manifest exists. */
  get commit(): string | null {
    return this.manifest?.commit ?? null;
  }

  /**
   * A manifest used for selected-source verification must describe the exact
   * resolved commit. A syntactically valid but different commit is an
   * integrity failure, never a silently skipped verification.
   */
  checkSourceCommit(expected: string): string | null {
    if (!this.manifest) return null;
    if (this.manifest.commit === expected) return null;
    return `release MANIFEST.json commit '${this.manifest.commit}' does not match the resolved source commit '${expected}'`;
  }

  /**
   * Whether the schema-1 files map binds this exact repo path. Root LICENSE
   * and NOTICE entries are ordinary files-map entries, not a separate
   * namespace.
   */
  hasManifestEntry(repoPath: string): boolean {
    if (!this.manifest) return false;
    return isListed(this.manifest, normalizeRepoPath(repoPath));
  }

  /** Returns null when OK (or no manifest), else a rejection reason. */
  check(repoPath: string, content: Buffer | string): string | null {
    if (!this.manifest) {
      return null;
    }

    const normalized = normalizeRepoPath(repoPath);

    if (!isListed(this.manifest, normalized)) {
      return 'not listed in release MANIFEST.json';
    }

    const expectedSha = this.manifest.files[normalized];

    if (sha256(content) !== expectedSha) {
      return 'sha256 does not match release MANIFEST.json';
    }

    return null;
  }

  /**
   * Root LICENSE/NOTICE live outside every category release scope, so legacy
   * manifests do not list them. A listed root entry is always enforced; an
   * unlisted one leaves the caller's verified commit-tree/blob basis intact
   * instead of inventing a manifest verification that never happened.
   */
  checkRootAttribution(
    repoPath: string,
    content: Buffer | string,
  ): string | null {
    if (!this.manifest) return null;
    const normalized = normalizeRepoPath(repoPath);
    if (!isListed(this.manifest, normalized)) return null;
    if (sha256(content) !== this.manifest.files[normalized]) {
      return 'sha256 does not match release MANIFEST.json root attribution';
    }
    return null;
  }
}
