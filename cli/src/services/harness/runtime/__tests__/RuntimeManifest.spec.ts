import crypto from 'crypto';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  computeFileSha256,
  createRuntimeManifest,
  isPinnedImageDigest,
  RuntimeManifestInput,
  verifyRuntimeManifest,
} from '../RuntimeManifest';
import { FleetRuntimeConfig } from '../RuntimeTypes';

const workerAssetFixture = vi.hoisted(() => ({ path: '' }));

vi.mock('../RunnerAssets', async (importOriginal) => {
  const actual = (await importOriginal()) as {
    WORKER_ASSET_ID: string;
  } & Record<string, unknown>;
  return {
    ...actual,
    resolveWorkerAssetPath: async () => workerAssetFixture.path,
    readWorkerAsset: async () => {
      const [nodeFs, crypto] = await Promise.all([
        import('fs-extra'),
        import('crypto'),
      ]);
      const stat = await nodeFs.lstat(workerAssetFixture.path);
      return {
        id: actual.WORKER_ASSET_ID,
        path: workerAssetFixture.path,
        sha256: crypto
          .createHash('sha256')
          .update(await nodeFs.readFile(workerAssetFixture.path))
          .digest('hex'),
        bytes: stat.size,
      };
    },
  };
});

const IMAGE = `ags-runtime-worker@sha256:${'a'.repeat(64)}`;

interface Fixture {
  root: string;
  sdkDir: string;
  entryPath: string;
  dependencyPath: string;
  binaryPath: string;
  versionFile: string;
  manifestPath: string;
  runtime: FleetRuntimeConfig;
}

const VERSION_SCRIPT = `#!/bin/sh
if [ "$1" = "--version" ]; then
  cat "$(dirname "$0")/../versions/version.txt"
  exit 0
fi
exit 0
`;

function runtimeManifestInput(
  runtime: FleetRuntimeConfig,
  expectedManifestDigest?: string,
): RuntimeManifestInput {
  const { sdkDigest, manifestDigest, ...input } = runtime;
  void sdkDigest;
  void manifestDigest;
  return expectedManifestDigest ? { ...input, expectedManifestDigest } : input;
}
async function sha256File(filePath: string): Promise<string> {
  return crypto
    .createHash('sha256')
    .update(await fs.readFile(filePath))
    .digest('hex');
}

async function createFixture(options?: {
  packageMode?: boolean;
  withLock?: boolean;
}): Promise<Fixture> {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), 'ags-runtime-manifest-'),
  );
  const packagedWorker = path.join(root, 'packaged', 'OmpWorkerScript.mjs');
  await fs.ensureDir(path.dirname(packagedWorker));
  await fs.copyFile(
    path.resolve(__dirname, '../../../../../dist/OmpWorkerScript.mjs'),
    packagedWorker,
  );
  workerAssetFixture.path = await fs.realpath(packagedWorker);
  const sdkDir = options?.packageMode
    ? path.join(root, 'pkg')
    : path.join(root, 'sdk');
  const binDir = path.join(root, 'bin');
  const versionsDir = path.join(root, 'versions');
  await fs.ensureDir(sdkDir);
  await fs.ensureDir(binDir);
  await fs.ensureDir(versionsDir);

  const entryPath = path.join(sdkDir, 'index.js');
  const dependencyPath = path.join(sdkDir, 'dependency.js');
  await fs.writeFile(entryPath, 'export { value } from "./dependency.js";\n');
  await fs.writeFile(dependencyPath, 'export const value = "trusted";\n');
  if (options?.packageMode) {
    await fs.writeFile(
      path.join(sdkDir, 'package.json'),
      JSON.stringify({ name: 'fixture-sdk', version: '1.0.0' }, null, 2),
    );
  }
  if (options?.withLock) {
    await fs.writeFile(
      path.join(sdkDir, 'package-lock.json'),
      '{"lockfileVersion":3}\n',
    );
  }

  const binaryPath = path.join(binDir, 'tool');
  await fs.writeFile(binaryPath, VERSION_SCRIPT, { mode: 0o755 });
  await fs.chmod(binaryPath, 0o755);
  await fs.writeFile(path.join(versionsDir, 'version.txt'), 'ags-test-1.0.0\n');

  const manifestPath = path.join(root, 'manifest.json');
  const runtime: FleetRuntimeConfig = {
    nodeCommand: binaryPath,
    bunCommand: binaryPath,
    gitCommand: binaryPath,
    dockerCommand: binaryPath,
    sdkModule: entryPath,
    image: IMAGE,
    ompVersion: options?.packageMode ? '1.0.0' : '18.12.6',
    sdkDigest: await sha256File(entryPath),
    manifestFile: manifestPath,
    manifestDigest: '',
  };

  return {
    root,
    sdkDir,
    entryPath,
    dependencyPath,
    binaryPath,
    versionFile: path.join(versionsDir, 'version.txt'),
    manifestPath,
    runtime,
  };
}

async function pinManifest(fixture: Fixture): Promise<void> {
  const result = await createRuntimeManifest(
    runtimeManifestInput(fixture.runtime),
  );
  fixture.runtime = result.runtime;
  await fs.writeFile(
    fixture.manifestPath,
    JSON.stringify(result.manifest, null, 2),
  );
}

describe('RuntimeManifest installed-closure integrity', () => {
  let roots: string[] = [];

  beforeEach(() => {
    roots = [];
  });

  afterEach(async () => {
    for (const root of roots) {
      await fs.remove(root);
    }
    workerAssetFixture.path = '';
  });
  it('rejects unpinned Docker images', async () => {
    expect(isPinnedImageDigest(IMAGE)).toBe(true);
    expect(isPinnedImageDigest('alpine:latest')).toBe(false);
    expect(isPinnedImageDigest(`alpine@sha256:${'A'.repeat(64)}`)).toBe(false);

    const fixture = await createFixture();
    roots.push(fixture.root);
    await expect(
      createRuntimeManifest(
        runtimeManifestInput({ ...fixture.runtime, image: 'alpine:latest' }),
      ),
    ).rejects.toThrow(/IMAGE_NOT_PINNED_DIGEST/);
  });

  it('rejects symlinked digests and non-regular targets', async () => {
    const fixture = await createFixture();
    roots.push(fixture.root);
    const linkPath = path.join(fixture.root, 'link.js');
    await fs.symlink(fixture.entryPath, linkPath);
    await expect(computeFileSha256(linkPath)).rejects.toThrow(
      /SYMLINK_NOT_ALLOWED/,
    );
    await expect(computeFileSha256(fixture.sdkDir)).rejects.toThrow(
      /NOT_A_REGULAR_FILE/,
    );
  });

  it('pins a valid closure and rejects mutation of an imported dependency', async () => {
    const fixture = await createFixture();
    roots.push(fixture.root);
    await pinManifest(fixture);

    const before = await verifyRuntimeManifest(
      fixture.manifestPath,
      fixture.runtime,
      fixture.runtime.manifestDigest,
    );
    expect(before.valid).toBe(true);
    expect(before.reasonCodes).toEqual([]);

    await fs.writeFile(
      fixture.dependencyPath,
      'export const value = "tampered";\n',
    );
    const after = await verifyRuntimeManifest(
      fixture.manifestPath,
      fixture.runtime,
      fixture.runtime.manifestDigest,
    );
    expect(after.valid).toBe(false);
    expect(after.reasonCodes).toContain('CLOSURE_FILE_HASH_MISMATCH');

    const stricter = await verifyRuntimeManifest(
      fixture.manifestPath,
      fixture.runtime,
      'b'.repeat(64),
    );
    expect(stricter.reasonCodes).toContain('EXPECTED_RUNTIME_DIGEST_MISMATCH');
  });

  it('detects added and removed closure members', async () => {
    const fixture = await createFixture();
    roots.push(fixture.root);
    await pinManifest(fixture);

    await fs.writeFile(
      path.join(fixture.sdkDir, 'injected.js'),
      'export const x = 1;\n',
    );
    const added = await verifyRuntimeManifest(
      fixture.manifestPath,
      fixture.runtime,
    );
    expect(added.valid).toBe(false);
    expect(added.reasonCodes).toContain('CLOSURE_FILE_SET_MISMATCH');

    await fs.remove(path.join(fixture.sdkDir, 'injected.js'));
    await fs.remove(fixture.dependencyPath);
    const removed = await verifyRuntimeManifest(
      fixture.manifestPath,
      fixture.runtime,
    );
    expect(removed.valid).toBe(false);
    expect(removed.reasonCodes).toContain('CLOSURE_FILE_SET_MISMATCH');
  });

  it('binds lockfile bytes and package identities', async () => {
    const fixture = await createFixture({ withLock: true });
    roots.push(fixture.root);
    await pinManifest(fixture);

    const manifest = JSON.parse(
      await fs.readFile(fixture.manifestPath, 'utf8'),
    );
    expect(manifest.locks).toHaveLength(1);
    expect(manifest.locks[0].relPath).toBe('package-lock.json');

    await fs.writeFile(
      path.join(fixture.sdkDir, 'package-lock.json'),
      '{"lockfileVersion":2}\n',
    );
    const result = await verifyRuntimeManifest(
      fixture.manifestPath,
      fixture.runtime,
    );
    expect(result.valid).toBe(false);
    expect(result.reasonCodes).toContain('CLOSURE_LOCK_SET_MISMATCH');
  });

  it('binds the declared SDK package identity and omp version', async () => {
    const fixture = await createFixture({ packageMode: true });
    roots.push(fixture.root);
    await pinManifest(fixture);

    const manifest = JSON.parse(
      await fs.readFile(fixture.manifestPath, 'utf8'),
    );
    expect(manifest.sdk.packageName).toBe('fixture-sdk');
    expect(manifest.sdk.packageVersion).toBe('1.0.0');

    await expect(
      createRuntimeManifest(
        runtimeManifestInput(
          { ...fixture.runtime, ompVersion: '2.0.0' },
          fixture.runtime.manifestDigest,
        ),
      ),
    ).rejects.toThrow(/SDK_VERSION_MISMATCH/);

    await fs.writeFile(
      path.join(fixture.sdkDir, 'package.json'),
      JSON.stringify({ name: 'fixture-sdk', version: '9.9.9' }, null, 2),
    );
    const result = await verifyRuntimeManifest(
      fixture.manifestPath,
      fixture.runtime,
    );
    expect(result.valid).toBe(false);
    expect(result.reasonCodes).toContain('CLOSURE_PACKAGE_SET_MISMATCH');
  });

  it('rejects binary path substitution, binary mutation and version drift', async () => {
    const fixture = await createFixture();
    roots.push(fixture.root);
    await pinManifest(fixture);

    const substitute = path.join(fixture.root, 'bin', 'other-tool');
    await fs.writeFile(substitute, VERSION_SCRIPT, { mode: 0o755 });
    await fs.chmod(substitute, 0o755);
    const pathResult = await verifyRuntimeManifest(fixture.manifestPath, {
      ...fixture.runtime,
      dockerCommand: substitute,
    });
    expect(pathResult.reasonCodes).toContain('DOCKER_BINARY_MISMATCH_PATH');

    const originalBinary = await fs.readFile(fixture.binaryPath);
    await fs.writeFile(
      fixture.binaryPath,
      `${originalBinary.toString('utf8')}# mutated\n`,
      {
        mode: 0o755,
      },
    );
    await fs.chmod(fixture.binaryPath, 0o755);
    const hashResult = await verifyRuntimeManifest(
      fixture.manifestPath,
      fixture.runtime,
    );
    expect(hashResult.reasonCodes).toContain('NODE_BINARY_MISMATCH_HASH');
    await fs.writeFile(fixture.binaryPath, originalBinary, { mode: 0o755 });
    await fs.chmod(fixture.binaryPath, 0o755);

    await fs.writeFile(fixture.versionFile, 'ags-test-2.0.0\n');
    const versionResult = await verifyRuntimeManifest(
      fixture.manifestPath,
      fixture.runtime,
    );
    expect(versionResult.valid).toBe(false);
    expect(versionResult.reasonCodes).toContain('NODE_BINARY_MISMATCH_VERSION');
    expect(versionResult.reasonCodes).not.toContain(
      'CLOSURE_FILE_HASH_MISMATCH',
    );
  });

  it('rejects manifest self-digest changes and unknown properties', async () => {
    const fixture = await createFixture();
    roots.push(fixture.root);
    await pinManifest(fixture);

    const manifest = JSON.parse(
      await fs.readFile(fixture.manifestPath, 'utf8'),
    );
    manifest.runtimeDigest = 'c'.repeat(64);
    await fs.writeFile(fixture.manifestPath, JSON.stringify(manifest, null, 2));
    const digestResult = await verifyRuntimeManifest(
      fixture.manifestPath,
      fixture.runtime,
    );
    expect(digestResult.reasonCodes).toContain('MANIFEST_DIGEST_MISMATCH');

    manifest.runtimeDigest = fixture.runtime.manifestDigest;
    manifest.monetaryCapUsd = 5;
    await fs.writeFile(fixture.manifestPath, JSON.stringify(manifest, null, 2));
    const schemaResult = await verifyRuntimeManifest(
      fixture.manifestPath,
      fixture.runtime,
    );
    expect(schemaResult.valid).toBe(false);
    expect(schemaResult.reasonCodes).toContain('MANIFEST_SCHEMA_INVALID');
  });

  it('reports missing and unbounded manifest files without trusting them', async () => {
    const fixture = await createFixture();
    roots.push(fixture.root);
    const missing = await verifyRuntimeManifest(
      path.join(fixture.root, 'absent.json'),
      fixture.runtime,
    );
    expect(missing.valid).toBe(false);
    expect(missing.reasonCodes).toContain('MANIFEST_FILE_NOT_FOUND');

    const symlinkManifest = path.join(fixture.root, 'manifest-link.json');
    await fs.writeFile(fixture.manifestPath, '{}');
    await fs.symlink(fixture.manifestPath, symlinkManifest);
    const linked = await verifyRuntimeManifest(
      symlinkManifest,
      fixture.runtime,
    );
    expect(linked.reasonCodes).toContain('MANIFEST_NOT_REGULAR_FILE');
  });

  it('binds symlink alias topology even when both target bytes stay pinned', async () => {
    const fixture = await createFixture();
    roots.push(fixture.root);
    const alternatePath = path.join(fixture.sdkDir, 'alternate.js');
    await fs.writeFile(alternatePath, 'export const value = "alternate";\n');
    const aliasPath = path.join(fixture.sdkDir, 'alias.js');
    await fs.symlink('dependency.js', aliasPath);

    await pinManifest(fixture);
    const manifest = JSON.parse(
      await fs.readFile(fixture.manifestPath, 'utf8'),
    );
    expect(manifest.symlinks).toEqual([
      { relPath: 'alias.js', targetRelPath: 'dependency.js', kind: 'file' },
    ]);
    const before = await verifyRuntimeManifest(
      fixture.manifestPath,
      fixture.runtime,
    );
    expect(before.valid).toBe(true);

    await fs.remove(aliasPath);
    await fs.symlink('alternate.js', aliasPath);
    const after = await verifyRuntimeManifest(
      fixture.manifestPath,
      fixture.runtime,
    );
    expect(after.valid).toBe(false);
    expect(after.reasonCodes).toContain('CLOSURE_SYMLINK_TOPOLOGY_MISMATCH');
    expect(after.reasonCodes).not.toContain('CLOSURE_FILE_HASH_MISMATCH');
  });

  it('pins the standalone packaged worker as one emitted module', async () => {
    const fixture = await createFixture();
    roots.push(fixture.root);
    await pinManifest(fixture);

    const manifest = JSON.parse(
      await fs.readFile(fixture.manifestPath, 'utf8'),
    );
    expect(path.basename(manifest.assets.worker.path)).toBe(
      'OmpWorkerScript.mjs',
    );
    expect(manifest.assets.worker.modules).toEqual([
      expect.objectContaining({ path: manifest.assets.worker.path }),
    ]);
    const verification = await verifyRuntimeManifest(
      fixture.manifestPath,
      fixture.runtime,
    );
    expect(verification.valid).toBe(true);
  });

  it('does not execute any binary probe when manifest authority already failed', async () => {
    const fixture = await createFixture();
    roots.push(fixture.root);
    const markerPath = path.join(fixture.root, 'marker.txt');
    await fs.writeFile(
      fixture.binaryPath,
      `#!/bin/sh\necho probe >> "${markerPath}"\necho "tool 1.0.0"\nexit 0\n`,
      { mode: 0o755 },
    );
    await fs.chmod(fixture.binaryPath, 0o755);
    fixture.runtime.sdkDigest = await sha256File(fixture.entryPath);
    await pinManifest(fixture);
    await fs.remove(markerPath);

    const mismatched = await verifyRuntimeManifest(
      fixture.manifestPath,
      fixture.runtime,
      'd'.repeat(64),
    );
    expect(mismatched.valid).toBe(false);
    expect(mismatched.reasonCodes).toContain(
      'EXPECTED_RUNTIME_DIGEST_MISMATCH',
    );
    expect(await fs.pathExists(markerPath)).toBe(false);

    const manifest = JSON.parse(
      await fs.readFile(fixture.manifestPath, 'utf8'),
    );
    manifest.runtimeDigest = 'e'.repeat(64);
    await fs.writeFile(fixture.manifestPath, JSON.stringify(manifest, null, 2));
    const tampered = await verifyRuntimeManifest(
      fixture.manifestPath,
      fixture.runtime,
    );
    expect(tampered.reasonCodes).toContain('MANIFEST_DIGEST_MISMATCH');
    expect(await fs.pathExists(markerPath)).toBe(false);
  });
});
