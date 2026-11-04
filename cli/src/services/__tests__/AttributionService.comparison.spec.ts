import { describe, expect, it } from 'vitest';
import type {
  AttributionCatalog,
  AttributionFileRecord,
  AttributionPackageRecord,
} from '../../models/types';
import {
  compareAttribution,
  type InstalledAttributionState,
} from '../AttributionService';

const ID = 'demo/alpha';
const COMMIT = 'c'.repeat(40);
const BLOB = 'b'.repeat(40);
const LICENSE_SHA = 'a'.repeat(64);
const NOTICE_SHA = 'd'.repeat(64);
const EDITED_SHA = 'e'.repeat(64);

function fileRecord(name: string, sha256: string): AttributionFileRecord {
  return {
    name,
    sourcePath: `skills/demo/alpha/${name}`,
    sourceKind: 'package',
    requestedRef: 'demo-v1.0.0',
    resolvedCommit: COMMIT,
    blobSha1: BLOB,
    sha256,
    basis: 'release-manifest',
    destinations: [
      { agent: 'claude', path: `.claude/skills/${ID}/${name}`, sha256 },
    ],
  };
}

function packageRecord(
  files: AttributionFileRecord[],
): AttributionPackageRecord {
  return {
    registry: 'https://github.com/o/r',
    declaringCategory: 'demo',
    requestedRef: 'demo-v1.0.0',
    resolvedCommit: COMMIT,
    files,
  };
}

function catalog(record: AttributionPackageRecord): AttributionCatalog {
  return { version: 1, packages: { [ID]: record } };
}

/** Installed state that matches the recorded digests, minus any overrides. */
function installedFor(
  record: AttributionPackageRecord,
  overrides: Record<string, string | null> = {},
): InstalledAttributionState {
  const byName: InstalledAttributionState[string] = {};
  for (const file of record.files) {
    byName[file.name] = file.destinations.map((destination) => ({
      agent: destination.agent,
      path: destination.path,
      sha256:
        file.name in overrides
          ? (overrides[file.name] ?? null)
          : destination.sha256,
    }));
  }
  return { [ID]: byName };
}

const license = () => fileRecord('LICENSE', LICENSE_SHA);
const notice = () => fileRecord('NOTICE', NOTICE_SHA);

describe('compareAttribution on an existing, qualified installation', () => {
  it('requires consent when a file is added to a package', () => {
    const previous = packageRecord([license()]);
    const planned = packageRecord([license(), notice()]);

    const result = compareAttribution({
      planned: { [ID]: planned },
      previousCatalog: catalog(previous),
      hasExistingInstallation: true,
      installed: installedFor(previous),
    });

    expect(result.requiresConsent).toBe(true);
    expect(result.packages).toHaveLength(1);
    expect(result.packages[0]).toMatchObject({
      status: 'changed',
      reason: 'added',
      requiresConsent: true,
    });
    expect(
      result.packages[0].files.map((file) => [file.name, file.status]),
    ).toEqual([
      ['LICENSE', 'unchanged'],
      ['NOTICE', 'added'],
    ]);
  });

  it('requires consent when a file is dropped from a package', () => {
    const previous = packageRecord([license(), notice()]);
    const planned = packageRecord([license()]);

    const result = compareAttribution({
      planned: { [ID]: planned },
      previousCatalog: catalog(previous),
      hasExistingInstallation: true,
      installed: installedFor(previous),
    });

    expect(result.requiresConsent).toBe(true);
    expect(result.packages[0]).toMatchObject({
      status: 'changed',
      reason: 'removed',
    });
    const dropped = result.packages[0].files.find(
      (file) => file.name === 'NOTICE',
    );
    expect(dropped).toMatchObject({
      status: 'removed',
      previousSha256: NOTICE_SHA,
      plannedSha256: null,
    });
    expect(dropped?.previous).toEqual(notice());
  });

  it('does not require consent when nothing changed', () => {
    const previous = packageRecord([license()]);

    const result = compareAttribution({
      planned: { [ID]: packageRecord([license()]) },
      previousCatalog: catalog(previous),
      hasExistingInstallation: true,
      installed: installedFor(previous),
    });

    expect(result.requiresConsent).toBe(false);
    expect(result.packages[0].status).toBe('unchanged');
  });

  it('keeps the old record for a removed package only while its bytes still qualify', () => {
    const previous = packageRecord([license(), notice()]);

    const intact = compareAttribution({
      planned: {},
      previousCatalog: catalog(previous),
      hasExistingInstallation: true,
      installed: installedFor(previous),
    });
    expect(intact.requiresConsent).toBe(true);
    expect(intact.packages[0]).toMatchObject({
      status: 'removed',
      previous,
    });

    const edited = compareAttribution({
      planned: {},
      previousCatalog: catalog(previous),
      hasExistingInstallation: true,
      installed: installedFor(previous, { NOTICE: EDITED_SHA }),
    });
    expect(edited.requiresConsent).toBe(true);
    expect(edited.packages[0].previous).toBeNull();
    const byName = Object.fromEntries(
      edited.packages[0].files.map((file) => [file.name, file.previous]),
    );
    expect(byName.LICENSE).toEqual(license());
    expect(byName.NOTICE).toBeNull();
  });
});

describe('compareAttribution when recorded provenance cannot be qualified', () => {
  it('flags edited installed bytes as legacy-unqualified, even with identical planned bytes', () => {
    const previous = packageRecord([license()]);

    const result = compareAttribution({
      planned: { [ID]: packageRecord([license()]) },
      previousCatalog: catalog(previous),
      hasExistingInstallation: true,
      installed: installedFor(previous, { LICENSE: EDITED_SHA }),
    });

    expect(result.requiresConsent).toBe(true);
    expect(result.legacyUnqualified).toEqual([ID]);
    expect(result.packages[0]).toMatchObject({
      status: 'legacy-unqualified',
      reason: 'installed-bytes-mismatch',
      previous: null,
    });
    expect(result.packages[0].files[0].previous).toBeNull();
  });

  it('reports an unqualified origin when installed bytes were never inspected', () => {
    const previous = packageRecord([license()]);

    const result = compareAttribution({
      planned: { [ID]: packageRecord([license()]) },
      previousCatalog: catalog(previous),
      hasExistingInstallation: true,
    });

    expect(result.packages[0]).toMatchObject({
      status: 'legacy-unqualified',
      reason: 'unqualified-origin',
    });
  });
});

describe('compareAttribution on a first installation', () => {
  it('discloses planned packages without requiring transition consent', () => {
    const planned = packageRecord([license()]);

    const result = compareAttribution({
      planned: { [ID]: planned },
      hasExistingInstallation: false,
    });

    expect(result.firstInstall).toBe(true);
    expect(result.requiresConsent).toBe(false);
    expect(result.disclosures).toEqual([planned]);
  });

  it('ignores a stale catalog package that is not part of this run', () => {
    const result = compareAttribution({
      planned: {},
      previousCatalog: catalog(packageRecord([license()])),
      hasExistingInstallation: false,
    });

    expect(result.packages).toEqual([]);
    expect(result.disclosures).toEqual([]);
    expect(result.requiresConsent).toBe(false);
  });
});
