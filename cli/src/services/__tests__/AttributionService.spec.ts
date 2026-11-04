import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  AttributionCatalog,
  AttributionDestinationBinding,
  AttributionFileRecord,
  AttributionPackageRecord,
} from '../../models/types';
import {
  collectInstalledAttributionDigests,
  compareAttribution,
  mergeAttributionCatalog,
  validateAttributionCatalog,
} from '../AttributionService';
import type { InstalledAttributionState } from '../AttributionService';
import { sha256 } from '../LockfileService';

const COMMIT_A = 'a'.repeat(40);
const COMMIT_B = 'b'.repeat(40);
const BLOB_A = '1'.repeat(40);
const BLOB_B = '2'.repeat(40);

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => fs.remove(root)));
});

function bindingFor(
  agent: string,
  installedPath: string,
  bytes = 'apache text',
): AttributionDestinationBinding {
  return { agent, path: installedPath, sha256: sha256(bytes) };
}

function fileRecord(
  overrides: Partial<AttributionFileRecord> = {},
): AttributionFileRecord {
  const name = overrides.name ?? 'LICENSE';
  return {
    name,
    sourcePath: `skills/c/s/${name}`,
    sourceKind: 'package',
    requestedRef: 'c-v1.0.0',
    resolvedCommit: COMMIT_A,
    blobSha1: BLOB_A,
    sha256: sha256('apache text'),
    basis: 'release-manifest',
    destinations: [
      bindingFor('claude', `.claude/skills/c/s/${name}`, 'apache text'),
    ],
    ...overrides,
  };
}

function packageRecord(
  files: AttributionFileRecord[] = [fileRecord()],
  overrides: Partial<AttributionPackageRecord> = {},
): AttributionPackageRecord {
  return {
    registry: 'https://github.com/o/r',
    declaringCategory: 'c',
    requestedRef: 'c-v1.0.0',
    resolvedCommit: COMMIT_A,
    files,
    ...overrides,
  };
}

function catalog(
  packages: Record<string, AttributionPackageRecord>,
): AttributionCatalog {
  return { version: 1, packages };
}

/** Installed state that agrees with every recorded destination. */
function installedFor(
  packages: Record<string, AttributionPackageRecord>,
): InstalledAttributionState {
  const installed: InstalledAttributionState = {};
  for (const [id, record] of Object.entries(packages)) {
    installed[id] = {};
    for (const file of record.files) {
      installed[id][file.name] = file.destinations.map((destination) => ({
        ...destination,
      }));
    }
  }
  return installed;
}

function twoAgentFile(): AttributionFileRecord {
  // Distinct per-agent digests (an adapter transform differs), so a digest
  // swapped between destinations cannot accidentally still match.
  return fileRecord({
    destinations: [
      bindingFor('claude', '.claude/skills/c/s/LICENSE', 'apache text'),
      bindingFor('cursor', '.cursor/skills/c/s/LICENSE', 'converted apache'),
    ],
  });
}

describe('validateAttributionCatalog', () => {
  it('accepts a qualified version-1 catalog', () => {
    const valid = catalog({ 'c/s': packageRecord() });
    expect(validateAttributionCatalog(valid)).toEqual(valid);
  });

  it('accepts an empty catalog (no recorded attribution)', () => {
    expect(validateAttributionCatalog(catalog({}))).toEqual(catalog({}));
  });

  it('rejects an unknown catalog version instead of guessing', () => {
    expect(() =>
      validateAttributionCatalog({ version: 2, packages: {} }),
    ).toThrow(/unsupported version/i);
  });

  it('rejects a SHA-256 recorded as Git blob identity', () => {
    const invalid = catalog({
      'c/s': packageRecord([fileRecord({ blobSha1: sha256('apache text') })]),
    });
    expect(() => validateAttributionCatalog(invalid)).toThrow(/blobSha1/i);
  });

  it('rejects a non-commit resolvedCommit', () => {
    const invalid = catalog({
      'c/s': packageRecord([fileRecord({ resolvedCommit: 'main' })]),
    });
    expect(() => validateAttributionCatalog(invalid)).toThrow(
      /resolvedCommit/i,
    );
  });

  it('rejects unsafe source and destination paths', () => {
    expect(() =>
      validateAttributionCatalog(
        catalog({
          'c/s': packageRecord([fileRecord({ sourcePath: '../LICENSE' })]),
        }),
      ),
    ).toThrow(/sourcePath/i);
    expect(() =>
      validateAttributionCatalog(
        catalog({
          'c/s': packageRecord([
            fileRecord({
              destinations: [
                {
                  agent: 'claude',
                  path: '/etc/passwd',
                  sha256: sha256('x'),
                },
              ],
            }),
          ]),
        }),
      ),
    ).toThrow(/destination/i);
  });

  it('rejects duplicate installed filenames within one package', () => {
    const invalid = catalog({
      'c/s': packageRecord([fileRecord(), fileRecord()]),
    });
    expect(() => validateAttributionCatalog(invalid)).toThrow(/duplicate/i);
  });

  it('rejects extension fields on qualified records instead of tolerating them', () => {
    const invalid = catalog({
      'c/s': {
        ...packageRecord(),
        unexpected: true,
      } as unknown as AttributionPackageRecord,
    });
    expect(() => validateAttributionCatalog(invalid)).toThrow(/unexpected/i);
  });

  it('rejects a package id that is not a bounded category/skill key', () => {
    expect(() =>
      validateAttributionCatalog(catalog({ '../s': packageRecord() })),
    ).toThrow(/package/i);
  });

  it('requires an explicit bounded declaringCategory', () => {
    const missing = packageRecord();
    delete (missing as Partial<AttributionPackageRecord>).declaringCategory;
    expect(() =>
      validateAttributionCatalog(catalog({ 'other/s': missing })),
    ).toThrow(/declaringCategory/i);

    expect(() =>
      validateAttributionCatalog(
        catalog({
          'other/s': packageRecord(undefined, {
            declaringCategory: 'c/../x',
          }),
        }),
      ),
    ).toThrow(/declaringCategory/i);
  });
});

describe('compareAttribution consent predicate', () => {
  it('discloses origin on a first install without transition consent', () => {
    const planned = { 'c/s': packageRecord() };
    const comparison = compareAttribution({
      planned,
      hasExistingInstallation: false,
    });

    expect(comparison.firstInstall).toBe(true);
    expect(comparison.requiresConsent).toBe(false);
    expect(comparison.packages).toEqual([
      expect.objectContaining({
        packageId: 'c/s',
        status: 'added',
        reason: 'first-install',
        requiresConsent: false,
        planned: planned['c/s'],
      }),
    ]);
    expect(comparison.disclosures).toEqual([planned['c/s']]);
  });

  it('reports no consent when a qualified installation is byte-identical', () => {
    const planned = { 'c/s': packageRecord() };
    const comparison = compareAttribution({
      planned,
      previousCatalog: catalog(planned),
      hasExistingInstallation: true,
      installed: installedFor(planned),
    });

    expect(comparison.firstInstall).toBe(false);
    expect(comparison.requiresConsent).toBe(false);
    expect(comparison.packages).toEqual([
      expect.objectContaining({
        packageId: 'c/s',
        status: 'unchanged',
        requiresConsent: false,
      }),
    ]);
  });

  it('qualifies only when every recorded destination exists and matches its own digest', () => {
    const file = twoAgentFile();
    const planned = { 'c/s': packageRecord([file]) };
    const comparison = compareAttribution({
      planned,
      previousCatalog: catalog(planned),
      hasExistingInstallation: true,
      installed: installedFor(planned),
    });

    expect(comparison.requiresConsent).toBe(false);
    expect(comparison.packages[0].status).toBe('unchanged');
  });

  it('requires consent when any one agent copy was edited', () => {
    const file = twoAgentFile();
    const planned = { 'c/s': packageRecord([file]) };
    const installed = installedFor(planned);
    installed['c/s'].LICENSE[1].sha256 = sha256('user edited cursor copy');

    const comparison = compareAttribution({
      planned,
      previousCatalog: catalog(planned),
      hasExistingInstallation: true,
      installed,
    });

    expect(comparison.requiresConsent).toBe(true);
    expect(comparison.legacyUnqualified).toEqual(['c/s']);
    expect(comparison.packages[0]).toMatchObject({
      status: 'legacy-unqualified',
      reason: 'installed-bytes-mismatch',
      previous: null,
    });
    expect(
      comparison.packages[0].files[0].previous,
    ).toBeNull();
  });

  it('requires consent when a recorded destination is missing', () => {
    const file = twoAgentFile();
    const planned = { 'c/s': packageRecord([file]) };
    const installed = installedFor(planned);
    installed['c/s'].LICENSE[1].sha256 = null;

    const comparison = compareAttribution({
      planned,
      previousCatalog: catalog(planned),
      hasExistingInstallation: true,
      installed,
    });

    expect(comparison.requiresConsent).toBe(true);
    expect(comparison.packages[0]).toMatchObject({
      status: 'legacy-unqualified',
      reason: 'installed-bytes-mismatch',
    });
  });

  it('requires consent when agent digests were swapped between destinations', () => {
    const file = twoAgentFile();
    const planned = { 'c/s': packageRecord([file]) };
    const installed = installedFor(planned);
    const [claude, cursor] = installed['c/s'].LICENSE;
    installed['c/s'].LICENSE = [
      { ...claude, sha256: cursor.sha256 },
      { ...cursor, sha256: claude.sha256 },
    ];

    const comparison = compareAttribution({
      planned,
      previousCatalog: catalog(planned),
      hasExistingInstallation: true,
      installed,
    });

    expect(comparison.requiresConsent).toBe(true);
    expect(comparison.packages[0].status).toBe('legacy-unqualified');
  });

  it('requires consent for an existing installation whose legacy attribution has no catalog, even with identical bytes', () => {
    const planned = { 'c/s': packageRecord() };
    const comparison = compareAttribution({
      planned,
      hasExistingInstallation: true,
      installed: installedFor(planned),
    });

    expect(comparison.requiresConsent).toBe(true);
    expect(comparison.legacyUnqualified).toEqual(['c/s']);
    expect(comparison.packages[0]).toMatchObject({
      packageId: 'c/s',
      status: 'legacy-unqualified',
      requiresConsent: true,
      previous: null,
      planned: planned['c/s'],
    });
  });

  it('treats missing installed state as unqualified rather than trusting lock claims', () => {
    const previous = { 'c/s': packageRecord() };
    const comparison = compareAttribution({
      planned: previous,
      previousCatalog: catalog(previous),
      hasExistingInstallation: true,
    });

    expect(comparison.requiresConsent).toBe(true);
    expect(comparison.packages[0].status).toBe('legacy-unqualified');
  });

  it('previews added, changed and removed attribution with old/new digest and origin', () => {
    const previous = { 'c/s': packageRecord() };
    const changedFile = fileRecord({
      requestedRef: 'c-v2.0.0',
      resolvedCommit: COMMIT_B,
      blobSha1: BLOB_B,
      sha256: sha256('apache text v2'),
      destinations: [
        bindingFor('claude', '.claude/skills/c/s/LICENSE', 'apache text v2'),
      ],
    });
    const planned = {
      'c/s': packageRecord([changedFile], {
        requestedRef: 'c-v2.0.0',
        resolvedCommit: COMMIT_B,
      }),
      'c/extra': packageRecord(),
    };
    const previousAll = { ...previous, 'c/gone': packageRecord() };
    const comparison = compareAttribution({
      planned,
      previousCatalog: catalog(previousAll),
      hasExistingInstallation: true,
      installed: installedFor(previousAll),
    });

    const changed = comparison.packages.find((p) => p.packageId === 'c/s');
    expect(changed).toMatchObject({
      status: 'changed',
      reason: 'changed',
      requiresConsent: true,
    });
    expect(changed?.files[0]).toMatchObject({
      name: 'LICENSE',
      status: 'changed',
      previousSha256: sha256('apache text'),
      plannedSha256: sha256('apache text v2'),
    });
    expect(changed?.previous?.resolvedCommit).toBe(COMMIT_A);
    expect(changed?.planned?.resolvedCommit).toBe(COMMIT_B);

    const added = comparison.packages.find((p) => p.packageId === 'c/extra');
    expect(added).toMatchObject({
      status: 'added',
      reason: 'added',
      requiresConsent: true,
    });
    expect(added?.files[0]).toMatchObject({
      status: 'added',
      previousSha256: null,
      plannedSha256: sha256('apache text'),
    });

    const removed = comparison.packages.find((p) => p.packageId === 'c/gone');
    expect(removed).toMatchObject({
      status: 'removed',
      reason: 'removed',
      requiresConsent: true,
    });
    expect(removed?.files[0]).toMatchObject({
      status: 'removed',
      previousSha256: sha256('apache text'),
      plannedSha256: null,
    });
  });

  it('requires consent when only the recorded commit origin changes for identical bytes', () => {
    const previousFile = fileRecord();
    const replantedFile = fileRecord({
      requestedRef: 'c-v2.0.0',
      resolvedCommit: COMMIT_B,
      blobSha1: BLOB_B,
    });
    const previous = { 'c/s': packageRecord([previousFile]) };
    const planned = {
      'c/s': packageRecord([replantedFile], {
        requestedRef: 'c-v2.0.0',
        resolvedCommit: COMMIT_B,
      }),
    };
    const comparison = compareAttribution({
      planned,
      previousCatalog: catalog(previous),
      hasExistingInstallation: true,
      installed: installedFor(previous),
    });

    expect(comparison.packages[0]).toMatchObject({
      status: 'origin-changed',
      reason: 'origin-changed',
      requiresConsent: true,
    });
    expect(comparison.packages[0].files[0].status).toBe('origin-changed');
  });

  it('requires consent when only the registry origin changes for identical bytes', () => {
    const previous = { 'c/s': packageRecord() };
    const planned = {
      'c/s': packageRecord(undefined, {
        registry: 'https://github.com/other/fork',
      }),
    };
    const comparison = compareAttribution({
      planned,
      previousCatalog: catalog(previous),
      hasExistingInstallation: true,
      installed: installedFor(previous),
    });

    expect(comparison.requiresConsent).toBe(true);
    expect(comparison.packages[0]).toMatchObject({
      status: 'origin-changed',
      reason: 'origin-changed',
      requiresConsent: true,
      previous: expect.objectContaining({
        registry: 'https://github.com/o/r',
      }),
      planned: expect.objectContaining({
        registry: 'https://github.com/other/fork',
      }),
    });
    expect(comparison.packages[0].files[0].status).toBe('origin-changed');
  });
});

describe('collectInstalledAttributionDigests', () => {
  it('preserves agent/path identity and reports missing destinations as null', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-attribution-'));
    temporaryRoots.push(root);
    const installed = fileRecord({
      destinations: [
        bindingFor('claude', '.claude/skills/c/s/LICENSE', 'apache text'),
        bindingFor('cursor', '.cursor/skills/c/s/LICENSE', 'apache text'),
      ],
    });
    const missing = fileRecord({
      name: 'NOTICE',
      sourcePath: 'skills/c/s/NOTICE',
      destinations: [
        bindingFor('claude', '.claude/skills/c/s/NOTICE', 'notice text'),
      ],
    });
    await fs.outputFile(
      path.join(root, installed.destinations[0].path),
      'apache text',
    );
    // The cursor copy is edited on disk; identity is retained, digest differs.
    await fs.outputFile(
      path.join(root, installed.destinations[1].path),
      'edited cursor copy',
    );

    const digests = await collectInstalledAttributionDigests(root, {
      'c/s': packageRecord([installed, missing]),
    });

    expect(digests['c/s'].LICENSE).toEqual([
      {
        agent: 'claude',
        path: '.claude/skills/c/s/LICENSE',
        sha256: sha256('apache text'),
      },
      {
        agent: 'cursor',
        path: '.cursor/skills/c/s/LICENSE',
        sha256: sha256('edited cursor copy'),
      },
    ]);
    expect(digests['c/s'].NOTICE).toEqual([
      {
        agent: 'claude',
        path: '.claude/skills/c/s/NOTICE',
        sha256: null,
      },
    ]);
  });

  // Test intent: the collector must never follow a symlink to external bytes.
  // A terminal, parent, or dangling link is unqualified, not a match.
  it('fails closed for a symlinked destination file', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-attribution-'));
    const external = await fs.mkdtemp(
      path.join(os.tmpdir(), 'ags-attribution-ext-'),
    );
    temporaryRoots.push(root, external);
    const rel = '.claude/skills/c/s/LICENSE';
    const externalFile = path.join(external, 'LICENSE');
    await fs.outputFile(externalFile, 'apache text');
    await fs.ensureDir(path.dirname(path.join(root, rel)));
    await fs.symlink(externalFile, path.join(root, rel));

    const digests = await collectInstalledAttributionDigests(root, {
      'c/s': packageRecord([
        fileRecord({ destinations: [bindingFor('claude', rel)] }),
      ]),
    });

    expect(digests['c/s'].LICENSE).toEqual([
      { agent: 'claude', path: rel, sha256: null },
    ]);
  });

  it('fails closed for a symlinked parent directory', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-attribution-'));
    const external = await fs.mkdtemp(
      path.join(os.tmpdir(), 'ags-attribution-ext-'),
    );
    temporaryRoots.push(root, external);
    const rel = '.claude/skills/c/s/LICENSE';
    await fs.outputFile(path.join(external, 'skills/c/s/LICENSE'), 'apache text');
    await fs.symlink(external, path.join(root, '.claude'));

    const digests = await collectInstalledAttributionDigests(root, {
      'c/s': packageRecord([
        fileRecord({ destinations: [bindingFor('claude', rel)] }),
      ]),
    });

    expect(digests['c/s'].LICENSE[0].sha256).toBeNull();
  });

  it('fails closed for a dangling symlink', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-attribution-'));
    temporaryRoots.push(root);
    const rel = '.claude/skills/c/s/LICENSE';
    await fs.ensureDir(path.dirname(path.join(root, rel)));
    await fs.symlink(path.join(root, 'missing-target'), path.join(root, rel));

    const digests = await collectInstalledAttributionDigests(root, {
      'c/s': packageRecord([
        fileRecord({ destinations: [bindingFor('claude', rel)] }),
      ]),
    });

    expect(digests['c/s'].LICENSE[0].sha256).toBeNull();
  });
});

describe('mergeAttributionCatalog', () => {
  it('keeps untouched packages and lets the new run win per package', () => {
    const previous = catalog({
      'c/kept': packageRecord(),
      'c/replaced': packageRecord([fileRecord({ name: 'NOTICE' })]),
    });
    const next = catalog({ 'c/replaced': packageRecord() });

    const merged = mergeAttributionCatalog(
      previous,
      next,
      (packageId) => packageId === 'c/kept',
    );

    expect(Object.keys(merged.packages).sort()).toEqual(['c/kept', 'c/replaced']);
    expect(merged.packages['c/replaced'].files[0].name).toBe('LICENSE');
  });

  it('retains an imported package by its explicit declaring category', () => {
    const imported = packageRecord(undefined, { declaringCategory: 'c' });
    const previous = catalog({ 'other/s': imported });

    // An unrelated partial run (declaring category not completed) must not
    // drop the imported record because its physical key is a different,
    // unconfigured category.
    const retained = mergeAttributionCatalog(
      previous,
      catalog({}),
      (_packageId, record) => record.declaringCategory !== 'd',
    );
    expect(retained.packages['other/s']).toEqual(imported);

    const dropped = mergeAttributionCatalog(
      previous,
      catalog({}),
      (_packageId, record) => record.declaringCategory !== 'c',
    );
    expect(dropped).toEqual(catalog({}));
  });
});
