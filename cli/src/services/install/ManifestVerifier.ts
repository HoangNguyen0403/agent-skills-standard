import { createHash } from 'node:crypto';
import { ReleaseManifest } from '../GithubService';

export class ManifestVerifier {
  constructor(private manifest: ReleaseManifest | null) {}

  /** Returns null when OK (or no manifest), else a rejection reason. */
  check(repoPath: string, content: Buffer | string): string | null {
    if (!this.manifest) {
      return null;
    }

    // Normalize path to posix relative path without leading slash or ./
    const normalized = repoPath.replace(/^(\.\/|\/)+/, '');

    if (
      !Object.prototype.hasOwnProperty.call(this.manifest.files, normalized)
    ) {
      return 'not listed in release MANIFEST.json';
    }

    const expectedSha = this.manifest.files[normalized];
    const actualSha = createHash('sha256')
      .update(content, Buffer.isBuffer(content) ? undefined : 'utf8')
      .digest('hex');

    if (actualSha !== expectedSha) {
      return 'sha256 does not match release MANIFEST.json';
    }

    return null;
  }
}
