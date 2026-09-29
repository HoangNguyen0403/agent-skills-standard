import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReleaseManifest } from '../../GithubService';
import { ManifestVerifier } from '../ManifestVerifier';

describe('ManifestVerifier', () => {
  const content = 'hello world\n';
  const sha256 = createHash('sha256').update(content, 'utf8').digest('hex');

  const sampleManifest: ReleaseManifest = {
    schema_version: 1,
    tag: 'workflows-v1.0.0',
    commit: 'a'.repeat(40),
    files: {
      '.agents/workflows/dev-fix.md': sha256,
    },
  };

  it('returns null when manifest is null (no manifest present)', () => {
    const verifier = new ManifestVerifier(null);
    expect(verifier.check('.agents/workflows/dev-fix.md', 'any content')).toBeNull();
  });

  it('returns null when file is listed and sha256 matches', () => {
    const verifier = new ManifestVerifier(sampleManifest);
    expect(verifier.check('.agents/workflows/dev-fix.md', content)).toBeNull();
  });

  it('returns "not listed in release MANIFEST.json" when file is missing from manifest', () => {
    const verifier = new ManifestVerifier(sampleManifest);
    expect(verifier.check('.agents/workflows/unlisted.md', content)).toBe(
      'not listed in release MANIFEST.json',
    );
  });

  it('returns "sha256 does not match release MANIFEST.json" on content mismatch', () => {
    const verifier = new ManifestVerifier(sampleManifest);
    expect(verifier.check('.agents/workflows/dev-fix.md', 'tampered content')).toBe(
      'sha256 does not match release MANIFEST.json',
    );
  });

  it('normalizes paths with leading slashes or dots', () => {
    const verifier = new ManifestVerifier(sampleManifest);
    expect(verifier.check('./.agents/workflows/dev-fix.md', content)).toBeNull();
    expect(verifier.check('/.agents/workflows/dev-fix.md', content)).toBeNull();
  });
});
