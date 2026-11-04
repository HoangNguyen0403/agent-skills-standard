import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Agent } from '../../constants';
import { SkillConfig } from '../../models/config';
import type {
  AttributionCatalog,
  AttributionPackageRecord,
} from '../../models/types';
import { LOCKFILE_NAME, sha256 } from '../LockfileService';
import { SyncService } from '../SyncService';

const REGISTRY = 'https://github.com/example/repo';
const LICENSE_BYTES = 'Apache License 2.0';
const LICENSE_DIGEST = sha256(LICENSE_BYTES);

function record(options: {
  declaringCategory: string;
  destinations: AttributionPackageRecord['files'][number]['destinations'];
}): AttributionPackageRecord {
  return {
    registry: REGISTRY,
    declaringCategory: options.declaringCategory,
    requestedRef: 'v1',
    resolvedCommit: 'a'.repeat(40),
    files: [
      {
        name: 'LICENSE',
        sourcePath: 'LICENSE',
        sourceKind: 'root',
        requestedRef: 'v1',
        resolvedCommit: 'a'.repeat(40),
        blobSha1: 'b'.repeat(40),
        sha256: LICENSE_DIGEST,
        basis: 'commit-tree-blob',
        destinations: options.destinations,
      },
    ],
  };
}

function destination(agent: string, packagePath: string) {
  return {
    agent,
    path: `${agent === Agent.Kiro ? '.kiro/skills' : `.${agent}/skills`}/${packagePath}/LICENSE`,
    sha256: LICENSE_DIGEST,
  };
}

function manifestEntry(agent: string, source: string) {
  return {
    owner: 'skill',
    source,
    agent,
    sha256: LICENSE_DIGEST,
  };
}

describe('SyncService attribution retention', () => {
  let syncService: SyncService;
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-attribution-retention-'));
    process.chdir(tempDir);
    syncService = new SyncService();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tempDir);
  });

  function config(overrides: Partial<SkillConfig> = {}): SkillConfig {
    return {
      registry: REGISTRY,
      agents: [Agent.Claude],
      skills: { c: { ref: 'v1' } },
      workflows: [],
      custom_overrides: [],
      ...overrides,
    };
  }

  async function seed(
    packages: Record<string, AttributionPackageRecord>,
    entries: Record<string, ReturnType<typeof manifestEntry>>,
  ): Promise<void> {
    await fs.writeJson(path.join(tempDir, LOCKFILE_NAME), {
      version: 2,
      registry: REGISTRY,
      generatedAt: '2026-11-04T00:00:00.000Z',
      sources: {},
      entries,
      attributionCatalog: { version: 1, packages } satisfies AttributionCatalog,
    });
  }

  async function run(
    cfg: SkillConfig,
    completedSkillCategories: string[],
  ): Promise<AttributionCatalog | undefined> {
    await syncService.beginInstall(cfg, { dryRun: false, force: [] });
    await syncService.completeInstall(cfg, {
      skills: [],
      workflows: [],
      specialistsOk: true,
      completedSkillCategories,
    });
    const lock = (await fs.readJson(path.join(tempDir, LOCKFILE_NAME))) as {
      attributionCatalog?: AttributionCatalog;
    };
    return lock.attributionCatalog;
  }

  // Test intent: an imported package owned by a configured, not-yet-completed
  // declaring category keeps both its real installed file and its record.
  it('retains an imported record while its declaring category is configured but incomplete', async () => {
    const importedDestination = destination(Agent.Claude, 'other/s');
    await fs.outputFile(
      path.join(tempDir, importedDestination.path),
      LICENSE_BYTES,
    );
    await seed(
      {
        'other/s': record({
          declaringCategory: 'c',
          destinations: [importedDestination],
        }),
      },
      {
        [importedDestination.path]: manifestEntry(
          Agent.Claude,
          'skill:other/s@v1',
        ),
      },
    );

    const catalog = await run(
      config({ skills: { c: { ref: 'v1' }, other: { ref: 'v1' } } }),
      [],
    );

    expect(catalog?.packages['other/s']).toBeDefined();
    expect(
      await fs.pathExists(path.join(tempDir, importedDestination.path)),
    ).toBe(true);
  });

  // Test intent: retention is not "not completed" alone — an unconfigured
  // declaring category drops the record even when another category's ownership
  // keeps the physical file.
  it('drops a record whose declaring category is no longer configured even if the file survives', async () => {
    const surviving = destination(Agent.Claude, 'c/s');
    await fs.outputFile(path.join(tempDir, surviving.path), LICENSE_BYTES);
    await seed(
      {
        'c/s': record({ declaringCategory: 'x', destinations: [surviving] }),
      },
      {
        [surviving.path]: manifestEntry(Agent.Claude, 'skill:c/s@v1'),
      },
    );

    const catalog = await run(config({ skills: { c: { ref: 'v1' } } }), []);

    expect(
      await fs.pathExists(path.join(tempDir, surviving.path)),
    ).toBe(true);
    expect(catalog?.packages['c/s']).toBeUndefined();
  });

  // Test intent: a removed category prunes its real files and its record; no
  // record may certify an absent destination.
  it('prunes files and drops the record for a removed declaring category', async () => {
    const removed = destination(Agent.Claude, 'c/s');
    await fs.outputFile(path.join(tempDir, removed.path), LICENSE_BYTES);
    await seed(
      {
        'c/s': record({ declaringCategory: 'c', destinations: [removed] }),
      },
      {
        [removed.path]: manifestEntry(Agent.Claude, 'skill:c/s@v1'),
      },
    );

    const catalog = await run(config({ skills: { d: { ref: 'v1' } } }), []);

    expect(await fs.pathExists(path.join(tempDir, removed.path))).toBe(false);
    expect(catalog?.packages['c/s']).toBeUndefined();
  });

  // Test intent: a removed agent's copy is pruned; the record is not retained
  // with a stale binding for a destination that no longer exists.
  it('drops the record when a removed agent prunes one of its destinations', async () => {
    const claudeCopy = destination(Agent.Claude, 'c/s');
    const cursorCopy = destination(Agent.Cursor, 'c/s');
    await fs.outputFile(path.join(tempDir, claudeCopy.path), LICENSE_BYTES);
    await fs.outputFile(path.join(tempDir, cursorCopy.path), LICENSE_BYTES);
    await seed(
      {
        'c/s': record({
          declaringCategory: 'c',
          destinations: [claudeCopy, cursorCopy],
        }),
      },
      {
        [claudeCopy.path]: manifestEntry(Agent.Claude, 'skill:c/s@v1'),
        [cursorCopy.path]: manifestEntry(Agent.Cursor, 'skill:c/s@v1'),
      },
    );

    const catalog = await run(config({ agents: [Agent.Cursor] }), []);

    expect(await fs.pathExists(path.join(tempDir, claudeCopy.path))).toBe(false);
    expect(await fs.pathExists(path.join(tempDir, cursorCopy.path))).toBe(true);
    expect(catalog?.packages['c/s']).toBeUndefined();
  });

  // Test intent: a surviving ownership entry whose bytes were edited on disk
  // does not certify the old catalog binding.
  it('drops the record when a surviving destination no longer matches its digest', async () => {
    const edited = destination(Agent.Claude, 'c/s');
    await fs.outputFile(path.join(tempDir, edited.path), 'user edited license');
    await seed(
      {
        'c/s': record({ declaringCategory: 'c', destinations: [edited] }),
      },
      {
        [edited.path]: manifestEntry(Agent.Claude, 'skill:c/s@v1'),
      },
    );

    const catalog = await run(config({ skills: { c: { ref: 'v1' } } }), []);

    expect(catalog?.packages['c/s']).toBeUndefined();
  });
});
