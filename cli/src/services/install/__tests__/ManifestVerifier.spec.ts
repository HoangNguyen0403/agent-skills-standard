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
    expect(
      verifier.check('.agents/workflows/dev-fix.md', 'any content'),
    ).toBeNull();
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
    expect(
      verifier.check('.agents/workflows/dev-fix.md', 'tampered content'),
    ).toBe('sha256 does not match release MANIFEST.json');
  });

  it('normalizes paths with leading slashes or dots', () => {
    const verifier = new ManifestVerifier(sampleManifest);
    expect(
      verifier.check('./.agents/workflows/dev-fix.md', content),
    ).toBeNull();
    expect(verifier.check('/.agents/workflows/dev-fix.md', content)).toBeNull();
  });

  it('exposes the manifest commit and rejects a different resolved commit', () => {
    const verifier = new ManifestVerifier(sampleManifest);
    expect(verifier.commit).toBe('a'.repeat(40));
    expect(verifier.checkSourceCommit('a'.repeat(40))).toBeNull();
    expect(verifier.checkSourceCommit('b'.repeat(40))).toMatch(
      /does not match the resolved source commit/i,
    );
    expect(
      new ManifestVerifier(null).checkSourceCommit('b'.repeat(40)),
    ).toBeNull();
  });

  it('reports whether a path is covered by a manifest entry', () => {
    const verifier = new ManifestVerifier({
      ...sampleManifest,
      files: { ...sampleManifest.files, LICENSE: sha256 },
    });
    expect(verifier.hasManifestEntry('.agents/workflows/dev-fix.md')).toBe(
      true,
    );
    expect(verifier.hasManifestEntry('LICENSE')).toBe(true);
    expect(verifier.hasManifestEntry('NOTICE')).toBe(false);
  });

  it('enforces a root file the schema-1 files map binds and allows an unbound legacy manifest', () => {
    const withRoot = new ManifestVerifier({
      ...sampleManifest,
      files: { ...sampleManifest.files, LICENSE: sha256 },
    });
    expect(withRoot.checkRootAttribution('LICENSE', content)).toBeNull();
    expect(withRoot.checkRootAttribution('LICENSE', 'apache text')).toMatch(
      /root attribution/,
    );
    // A manifest that binds one root file does not reject another root file it
    // does not list; those stay commit-tree verified.
    expect(withRoot.checkRootAttribution('NOTICE', content)).toBeNull();

    const legacy = new ManifestVerifier(sampleManifest);
    expect(legacy.checkRootAttribution('LICENSE', 'apache text')).toBeNull();
  });

  it('enforces every applicable root binding, never skipping a listed conflict', () => {
    const verifier = new ManifestVerifier({
      ...sampleManifest,
      files: {
        ...sampleManifest.files,
        LICENSE: sha256,
        NOTICE: sha256,
      },
    });
    expect(verifier.checkRootAttribution('LICENSE', content)).toBeNull();
    expect(verifier.checkRootAttribution('NOTICE', content)).toBeNull();
    expect(verifier.checkRootAttribution('NOTICE', 'other notice')).toMatch(
      /root attribution/,
    );
  });
});
