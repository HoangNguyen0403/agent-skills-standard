import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Agent } from '../../constants';
import {
  LockfileService,
  LOCKFILE_NAME,
  ManifestEntry,
  SkillsLockFile,
  sha256,
  type WorkflowCatalog,
  type WorkflowCatalogBindingConflict,
} from '../LockfileService';

describe('LockfileService v2', () => {
  let service: LockfileService;
  let root: string;

  beforeEach(async () => {
    service = new LockfileService();
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-lock-test-'));
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  it('load with no file returns lock: null, migratedFromV1: false', async () => {
    const loaded = await service.load(root, [Agent.Claude]);
    expect(loaded).toEqual({ lock: null, migratedFromV1: false });
  });

  it('load rejects a lock file missing a version field', async () => {
    await fs.writeJson(path.join(root, LOCKFILE_NAME), {
      registry: 'https://github.com/test/repo',
      generatedAt: '2026-10-23T00:00:00.000Z',
      sources: {},
      entries: {},
    });

    await expect(service.load(root, [Agent.Claude])).rejects.toThrow(
      'Invalid .skills-lock.json: missing version',
    );
  });

  it('load of a v1 file migrates to v2 format with entries and sources', async () => {
    const v1Content = {
      version: 1,
      registry: 'r',
      generatedAt: 't',
      skills: {
        'typescript/typescript-core': {
          ref: 'typescript-v1.0.0',
          files: {
            'SKILL.md': 'h1',
            'references/a.md': 'h2',
          },
          contentHash: 'x',
        },
      },
    };
    await fs.writeJson(path.join(root, LOCKFILE_NAME), v1Content);

    const loaded = await service.load(root, [Agent.Claude, Agent.Kiro]);
    expect(loaded.migratedFromV1).toBe(true);
    expect(loaded.lock).toBeDefined();
    expect(loaded.lock?.version).toBe(2);
    expect(loaded.lock?.registry).toBe('r');
    expect(loaded.lock?.generatedAt).toBe('t');
    expect(loaded.lock?.sources).toEqual({
      'skills/typescript': { ref: 'typescript-v1.0.0', commit: null },
    });

    const entries = loaded.lock?.entries ?? {};
    expect(Object.keys(entries).sort()).toEqual([
      '.claude/skills/typescript/typescript-core/SKILL.md',
      '.claude/skills/typescript/typescript-core/references/a.md',
    ]);
    expect(
      entries['.claude/skills/typescript/typescript-core/SKILL.md'],
    ).toEqual({
      owner: 'skill',
      source: 'skill:typescript/typescript-core@typescript-v1.0.0',
      agent: 'claude',
      sha256: 'h1',
    });
    expect(
      entries['.claude/skills/typescript/typescript-core/references/a.md'],
    ).toEqual({
      owner: 'skill',
      source: 'skill:typescript/typescript-core@typescript-v1.0.0',
      agent: 'claude',
      sha256: 'h2',
    });
  });

  it('write then load round-trips v2 entries and isolated generation ownership', async () => {
    const wholeMetadataDigest = sha256('complete metadata document');
    const tokenMetricsDigest = sha256('owned token metrics projection');
    expect(tokenMetricsDigest).not.toBe(wholeMetadataDigest);
    const lock: SkillsLockFile = {
      version: 2,
      registry: 'https://github.com/test/repo',
      generatedAt: '2026-09-27T00:00:00.000Z',
      sources: {
        'skills/typescript': { ref: 'v1.0.0', commit: null },
      },
      entries: {
        'z/file.md': {
          owner: 'skill',
          source: 'skill:typescript/z@v1.0.0',
          agent: 'claude',
          sha256: 'hz',
        },
        'a/file.md': {
          owner: 'skill',
          source: 'skill:typescript/a@v1.0.0',
          agent: 'claude',
          sha256: 'ha',
        },
      },
      generation: {
        version: 1,
        entries: {
          'skills/metadata.json': {
            source: 'index:skills/metadata.json',
            sha256: wholeMetadataDigest,
            scope: {
              kind: 'category-token-metrics',
              sha256: tokenMetricsDigest,
            },
          },
          'README.md': {
            source: 'index:README.md',
            sha256: sha256('readme'),
          },
        },
      },
    };

    await service.write(root, lock);
    const loaded = await service.load(root, [Agent.Claude]);
    expect(loaded.migratedFromV1).toBe(false);
    expect(loaded.lock).toEqual(lock);

    const raw = await fs.readJson(path.join(root, LOCKFILE_NAME));
    expect(Object.keys(raw.entries)).toEqual(['a/file.md', 'z/file.md']);
    expect(Object.keys(raw.generation.entries)).toEqual([
      'README.md',
      'skills/metadata.json',
    ]);
    expect(raw.generation.entries['skills/metadata.json'].scope).toEqual(
      lock.generation?.entries['skills/metadata.json'].scope,
    );
  });

  it('preserves the scoped generation ledger when a normal CLI writer omits it', async () => {
    const generation = {
      version: 1 as const,
      entries: {
        'AGENTS.md': {
          source: 'index:AGENTS.md',
          sha256: sha256('agents'),
        },
        'skills/metadata.json': {
          source: 'index:skills/metadata.json',
          sha256: sha256('whole metadata'),
          scope: {
            kind: 'category-token-metrics' as const,
            sha256: sha256('owned metrics'),
          },
        },
      },
    };
    const sources = {
      'skills/common': { ref: 'common-v1', commit: null },
    };
    const lock: SkillsLockFile = {
      version: 2,
      registry: 'r',
      generatedAt: 'before',
      sources,
      entries: {
        '.github/skills/typescript/core/SKILL.md': {
          owner: 'skill',
          source: 'skill:typescript/core@v1',
          agent: 'copilot',
          sha256: sha256('old'),
        },
      },
      generation,
      disclosed: { copilot: ['hooks'] },
    };
    await service.write(root, lock);
    await service.write(root, {
      ...lock,
      generatedAt: 'after',
      entries: {},
      generation: undefined,
    });

    const loaded = await service.load(root, [Agent.Copilot]);
    expect(loaded.lock?.generation).toEqual(generation);
    expect(loaded.lock?.entries).toEqual({});
    expect(loaded.lock?.sources).toEqual(sources);
    expect(loaded.lock?.disclosed).toEqual({ copilot: ['hooks'] });
  });

  it('rejects unsupported generation ledger versions instead of granting authority', async () => {
    await fs.writeJson(path.join(root, LOCKFILE_NAME), {
      version: 2,
      registry: 'r',
      generatedAt: 't',
      sources: {},
      entries: {},
      generation: { version: 2, entries: {} },
    });

    await expect(service.load(root, [Agent.Copilot])).rejects.toThrow(
      'Unsupported repository-generation lock namespace',
    );
  });
  it.each([
    {
      caseName: 'null descriptor',
      relPath: 'skills/metadata.json',
      scope: null,
    },
    {
      caseName: 'array descriptor',
      relPath: 'skills/metadata.json',
      scope: [],
    },
    {
      caseName: 'unsupported kind',
      relPath: 'skills/metadata.json',
      scope: { kind: 'future-kind', sha256: sha256('metrics') },
    },
    {
      caseName: 'malformed digest',
      relPath: 'skills/metadata.json',
      scope: { kind: 'category-token-metrics', sha256: 'not-a-digest' },
    },
    {
      caseName: 'unknown descriptor key',
      relPath: 'skills/metadata.json',
      scope: {
        kind: 'category-token-metrics',
        sha256: sha256('metrics'),
        extra: true,
      },
    },
    {
      caseName: 'missing descriptor digest',
      relPath: 'skills/metadata.json',
      scope: { kind: 'category-token-metrics' },
    },
    {
      caseName: 'scope on another output',
      relPath: 'README.md',
      scope: { kind: 'category-token-metrics', sha256: sha256('metrics') },
    },
  ])(
    'rejects $caseName without changing the invalid ledger',
    async ({ relPath, scope }) => {
      const file = path.join(root, LOCKFILE_NAME);
      const invalidLock = {
        version: 2,
        registry: 'r',
        generatedAt: 't',
        sources: {},
        entries: {},
        generation: {
          version: 1,
          entries: {
            [relPath]: {
              source: `index:${relPath}`,
              sha256: sha256('whole file'),
              scope,
            },
          },
        },
      };
      await fs.writeJson(file, invalidLock);
      const before = await fs.readFile(file);
      const error = `Invalid repository-generation ownership entry: ${relPath}`;
      await expect(service.load(root, [Agent.Copilot])).rejects.toThrow(error);
      const incoming: SkillsLockFile = {
        version: 2,
        registry: 'r',
        generatedAt: 'replacement',
        sources: {},
        entries: {},
        generation: {
          version: 1,
          entries: {
            'skills/metadata.json': {
              source: 'index:skills/metadata.json',
              sha256: sha256('replacement bytes'),
              scope: {
                kind: 'category-token-metrics',
                sha256: sha256('replacement metrics'),
              },
            },
          },
        },
      };
      await expect(service.write(root, incoming)).rejects.toThrow(error);
      await expect(
        service.writeDisclosed(root, { copilot: ['capabilities'] }),
      ).rejects.toThrow(error);
      expect(await fs.readFile(file)).toEqual(before);
      await fs.remove(file);
      await service.write(root, incoming);
      const validBefore = await fs.readFile(file);
      await expect(
        service.write(root, {
          ...incoming,
          generation: invalidLock.generation,
        } as unknown as SkillsLockFile),
      ).rejects.toThrow(error);
      expect(await fs.readFile(file)).toEqual(validBefore);
    },
  );

  it('rejects explicit null generation input instead of preserving or downgrading scope', async () => {
    const lock: SkillsLockFile = {
      version: 2,
      registry: 'r',
      generatedAt: 'before',
      sources: {},
      entries: {},
      generation: {
        version: 1,
        entries: {
          'skills/metadata.json': {
            source: 'index:skills/metadata.json',
            sha256: sha256('whole metadata'),
            scope: {
              kind: 'category-token-metrics',
              sha256: sha256('owned metrics'),
            },
          },
        },
      },
    };
    await service.write(root, lock);
    const file = path.join(root, LOCKFILE_NAME);
    const before = await fs.readFile(file);

    await expect(
      service.write(root, {
        ...lock,
        generation: null,
      } as unknown as SkillsLockFile),
    ).rejects.toThrow('Unsupported repository-generation lock namespace');
    expect(await fs.readFile(file)).toEqual(before);
  });

  it('disclosed handling: write preserves existing disclosed, writeDisclosed behavior', async () => {
    // writeDisclosed on missing file creates nothing
    await service.writeDisclosed(root, { claude: ['hooks'] });
    expect(await fs.pathExists(path.join(root, LOCKFILE_NAME))).toBe(false);
    expect(await service.readDisclosed(root)).toBeUndefined();

    // writeDisclosed on a v1 file keeps version: 1 content and adds disclosed
    const v1Content = {
      version: 1,
      registry: 'r',
      generatedAt: 't',
      skills: {},
    };
    await fs.writeJson(path.join(root, LOCKFILE_NAME), v1Content);
    await service.writeDisclosed(root, { claude: ['hooks'] });
    const rawV1 = await fs.readJson(path.join(root, LOCKFILE_NAME));
    expect(rawV1.version).toBe(1);
    expect(rawV1.disclosed).toEqual({ claude: ['hooks'] });
    expect(await service.readDisclosed(root)).toEqual({ claude: ['hooks'] });

    // write keeps existing disclosed when new lock has none
    const lock: SkillsLockFile = {
      version: 2,
      registry: 'r',
      generatedAt: 't2',
      sources: {},
      entries: {},
    };
    await service.write(root, lock);
    const rawV2 = await fs.readJson(path.join(root, LOCKFILE_NAME));
    expect(rawV2.disclosed).toEqual({ claude: ['hooks'] });
  });
  it('writeDisclosed preserves scoped generation and unrelated lock data', async () => {
    const scope = {
      kind: 'category-token-metrics' as const,
      sha256: sha256('metric projection'),
    };
    const lock: SkillsLockFile = {
      version: 2,
      registry: 'https://github.com/test/repo',
      generatedAt: 'created',
      sources: {
        'skills/common': { ref: 'common-v1', commit: 'a'.repeat(40) },
      },
      entries: {
        '.github/skills/common/core/SKILL.md': {
          owner: 'skill',
          source: 'skill:common/core@common-v1',
          agent: Agent.Copilot,
          sha256: sha256('ordinary host file'),
        },
      },
      generation: {
        version: 1,
        entries: {
          'skills/metadata.json': {
            source: 'index:skills/metadata.json',
            sha256: sha256('whole metadata'),
            scope,
          },
        },
      },
      disclosed: { copilot: ['old-capability'] },
    };
    await service.write(root, lock);

    await service.writeDisclosed(root, {
      copilot: ['capabilities', 'hooks'],
    });

    const loaded = await service.load(root, [Agent.Copilot]);
    expect(loaded.lock?.generation).toEqual(lock.generation);
    expect(loaded.lock?.entries).toEqual(lock.entries);
    expect(loaded.lock?.sources).toEqual(lock.sources);
    expect(loaded.lock?.disclosed).toEqual({
      copilot: ['capabilities', 'hooks'],
    });
  });

  it('verifyEntries checks matching, edited, and missing files, filtering by agent', async () => {
    const fileA = 'a.md';
    const fileB = 'b.md';
    const fileC = 'c.md';
    const fileD = 'd.md';

    await fs.outputFile(path.join(root, fileA), 'content-a');
    await fs.outputFile(path.join(root, fileB), 'content-b-edited');
    await fs.outputFile(path.join(root, fileD), 'content-d');
    // fileC is not created -> missing

    const hashA = sha256('content-a');
    const hashBOrig = sha256('content-b-original');
    const hashC = sha256('content-c');
    const hashD = sha256('content-d');

    const entries: Record<string, ManifestEntry> = {
      [fileA]: { owner: 'skill', source: 's', agent: 'claude', sha256: hashA },
      [fileB]: {
        owner: 'skill',
        source: 's',
        agent: 'claude',
        sha256: hashBOrig,
      },
      [fileC]: { owner: 'skill', source: 's', agent: 'claude', sha256: hashC },
      [fileD]: { owner: 'skill', source: 's', agent: 'cursor', sha256: hashD },
    };

    // All agents
    const resultAll = await service.verifyEntries(root, entries);
    expect(resultAll.ok).toBe(false);
    expect(resultAll.mismatches).toEqual([fileB]);
    expect(resultAll.missing).toEqual([fileC]);

    // Filtered to cursor: only fileD which matches
    const resultCursor = await service.verifyEntries(
      root,
      entries,
      Agent.Cursor,
    );
    expect(resultCursor.ok).toBe(true);
    expect(resultCursor.mismatches).toEqual([]);
    expect(resultCursor.missing).toEqual([]);

    // Filtered to claude: fileB mismatches, fileC missing
    const resultClaude = await service.verifyEntries(
      root,
      entries,
      Agent.Claude,
    );
    expect(resultClaude.ok).toBe(false);
    expect(resultClaude.mismatches).toEqual([fileB]);
    expect(resultClaude.missing).toEqual([fileC]);
  });

  // Test intent: raw resource bytes, not UTF-8 replacement characters, define
  // lock integrity; 0xff and 0xfe must produce a real tamper mismatch.
  it('reports a binary resource mismatch when only an invalid UTF-8 byte changes', async () => {
    const rel = '.claude/skills/typescript/typescript-core/assets/payload.bin';
    const entries: Record<string, ManifestEntry> = {
      [rel]: {
        owner: 'skill',
        source: 's',
        agent: 'claude',
        sha256: sha256(Buffer.from([0xff])),
      },
    };
    await fs.outputFile(path.join(root, rel), Buffer.from([0xfe]));

    await expect(service.verifyEntries(root, entries)).resolves.toEqual({
      ok: false,
      mismatches: [rel],
      missing: [],
    });
  });

  describe('workflowCatalog', () => {
    const canonicalDigest = sha256('canonical-body');
    const nativeDigest = sha256('native-output');

    function baseLock(): SkillsLockFile {
      return {
        version: 2,
        registry: 'https://github.com/test/repo',
        generatedAt: '2026-10-23T00:00:00.000Z',
        sources: {},
        entries: {},
      };
    }

    function catalog(
      overrides: Partial<WorkflowCatalog> = {},
    ): WorkflowCatalog {
      return {
        version: 1,
        workflows: {
          'dev-fix': {
            path: '.agents/workflows/dev-fix.md',
            digest: canonicalDigest,
            registry: 'https://github.com/test/repo',
            requestedRef: 'workflows-v1.0.0',
            resolvedCommit: 'abc123',
            nativeBindings: [
              {
                agent: 'claude',
                path: '.claude/commands/dev-fix.md',
                outputDigest: nativeDigest,
                canonicalDigest,
              },
            ],
          },
        },
        ...overrides,
      };
    }

    it('round-trips an optional versioned workflow catalog with native bindings', async () => {
      const lock = baseLock();
      lock.workflowCatalog = catalog();

      await service.write(root, lock);
      const loaded = await service.load(root, []);

      expect(loaded.lock?.workflowCatalog).toEqual(catalog());
    });

    it('rejects a malformed catalog at load instead of treating it as a legacy lock', async () => {
      const lock = baseLock();
      await fs.writeJson(path.join(root, LOCKFILE_NAME), {
        ...lock,
        workflowCatalog: { version: 2, workflows: {} },
      });

      await expect(service.load(root, [])).rejects.toThrow(/workflowCatalog/i);
    });

    it.each([
      ['null', null],
      ['an array', []],
      ['a primitive string', 'not-an-object'],
    ])('rejects a catalog root that is %s', async (_label, invalidCatalog) => {
      await fs.writeJson(path.join(root, LOCKFILE_NAME), {
        ...baseLock(),
        workflowCatalog: invalidCatalog,
      });

      await expect(service.load(root, [])).rejects.toThrow(
        'Invalid .skills-lock.json workflowCatalog: expected an object',
      );
    });

    it('rejects a catalog whose workflows collection is not an object', async () => {
      await fs.writeJson(path.join(root, LOCKFILE_NAME), {
        ...baseLock(),
        workflowCatalog: { version: 1, workflows: [] },
      });

      await expect(service.load(root, [])).rejects.toThrow(
        /workflows must be an object/i,
      );
    });

    it('allows aliased providers to share one output path when their digests agree', async () => {
      const aliased = catalog();
      const [binding] = aliased.workflows['dev-fix'].nativeBindings;
      aliased.workflows['dev-fix'].nativeBindings = [
        binding,
        { ...binding, agent: 'kiro' },
      ];

      await service.write(root, { ...baseLock(), workflowCatalog: aliased });
      const loaded = await service.load(root, []);

      expect(
        loaded.lock?.workflowCatalog?.workflows['dev-fix'].nativeBindings,
      ).toHaveLength(2);
    });

    it.each([
      [
        'an unsupported version',
        { version: 2, workflows: {} } as unknown as WorkflowCatalog,
      ],
      [
        'a non-object catalog root (array)',
        [] as unknown as WorkflowCatalog,
      ],
      [
        'a null catalog root',
        null as unknown as WorkflowCatalog,
      ],
      [
        'a traversal canonical path',
        catalog({
          workflows: {
            'dev-fix': {
              ...catalog().workflows['dev-fix'],
              path: '../outside.md',
            },
          },
        }),
      ],
      [
        'an absolute canonical path',
        catalog({
          workflows: {
            'dev-fix': {
              ...catalog().workflows['dev-fix'],
              path: '/tmp/dev-fix.md',
            },
          },
        }),
      ],
      [
        'a malformed digest',
        catalog({
          workflows: {
            'dev-fix': {
              ...catalog().workflows['dev-fix'],
              digest: 'not-a-digest',
            },
          },
        }),
      ],
      [
        'conflicting native bindings for one output path',
        catalog({
          workflows: {
            'dev-fix': {
              ...catalog().workflows['dev-fix'],
              nativeBindings: [
                ...catalog().workflows['dev-fix'].nativeBindings,
                {
                  ...catalog().workflows['dev-fix'].nativeBindings[0],
                  agent: 'kiro',
                  outputDigest: sha256('different-bytes'),
                },
              ],
            },
          },
        }),
      ],
    ])(
      'rejects %s before publishing and preserves the previous lock',
      async (_label, bad) => {
        const lock = baseLock();
        await service.write(root, lock);
        const lockPath = path.join(root, LOCKFILE_NAME);
        const previous = await fs.readFile(lockPath);

        await expect(
          service.write(root, { ...baseLock(), workflowCatalog: bad }),
        ).rejects.toThrow(/workflowCatalog/i);

        expect(await fs.readFile(lockPath)).toEqual(previous);
      },
    );

    it('rejects workflow names outside the canonical identifier contract', async () => {
      await service.write(root, baseLock());
      const lockPath = path.join(root, LOCKFILE_NAME);
      const previous = await fs.readFile(lockPath);
      const validWorkflow = catalog().workflows['dev-fix'];
      const invalidCatalog = catalog({
        workflows: { '../dev-fix': validWorkflow },
      });

      await expect(
        service.write(root, {
          ...baseLock(),
          workflowCatalog: invalidCatalog,
        }),
      ).rejects.toThrow(/invalid workflow name/i);
      expect(await fs.readFile(lockPath)).toEqual(previous);
    });

    it('rejects duplicate provider and output-path identity even when bytes agree', async () => {
      const duplicate = catalog();
      const [binding] = duplicate.workflows['dev-fix'].nativeBindings;
      duplicate.workflows['dev-fix'].nativeBindings.push({ ...binding });

      await expect(
        service.write(root, {
          ...baseLock(),
          workflowCatalog: duplicate,
        }),
      ).rejects.toThrow(/duplicate native binding/i);
    });

    it('rejects duplicate JSON keys before ordinary parsing', async () => {
      const text = `{"version":2,"registry":"r","generatedAt":"t","sources":{},"entries":{},"workflowCatalog":{"version":1,"workflows":{"dev-fix":{},"dev-fix":{}}}}`;
      await fs.writeFile(path.join(root, LOCKFILE_NAME), text);

      await expect(service.load(root, [])).rejects.toThrow(
        /duplicate JSON keys/i,
      );
    });

    it('disclosure updates publish atomically and preserve the catalog', async () => {
      await service.write(root, { ...baseLock(), workflowCatalog: catalog() });

      await service.writeDisclosed(root, { claude: ['hooks'] });

      const loaded = await service.load(root, []);
      expect(loaded.lock?.disclosed).toEqual({ claude: ['hooks'] });
      expect(loaded.lock?.workflowCatalog).toEqual(catalog());
    });

    it('a failed disclosure publication preserves the previous lock bytes', async () => {
      await service.write(root, { ...baseLock(), workflowCatalog: catalog() });
      const lockPath = path.join(root, LOCKFILE_NAME);
      const previous = await fs.readFile(lockPath);

      await fs.chmod(root, 0o500);
      try {
        await expect(
          service.writeDisclosed(root, { claude: ['hooks'] }),
        ).rejects.toThrow();
      } finally {
        await fs.chmod(root, 0o700);
      }

      expect(await fs.readFile(lockPath)).toEqual(previous);
    });

    it('round-trips a workflow catalog with recorded native conflicts', async () => {
      const lock = baseLock();
      const withConflicts = catalog();
      withConflicts.workflows['dev-fix'].nativeConflicts = [
        {
          agent: 'claude',
          path: '.claude/commands/dev-fix.md',
        },
      ];
      lock.workflowCatalog = withConflicts;

      await service.write(root, lock);
      const loaded = await service.load(root, []);

      expect(loaded.lock?.workflowCatalog).toEqual(withConflicts);
    });

    it.each([
      [
        'a non-array nativeConflicts value',
        'not-an-array' as unknown as WorkflowCatalogBindingConflict[],
        /has an invalid nativeConflicts value/i,
      ],
      [
        'a null conflict entry',
        [null] as unknown as WorkflowCatalogBindingConflict[],
        /has an invalid native conflict/i,
      ],
      [
        'an empty conflict agent',
        [{ agent: '', path: '.claude/commands/dev-fix.md' }],
        /has an invalid conflict agent/i,
      ],
      [
        'a traversal conflict path',
        [{ agent: 'claude', path: '../outside.md' }],
        /has an unsafe conflict path/i,
      ],
      [
        'an absolute conflict path',
        [{ agent: 'claude', path: '/tmp/dev-fix.md' }],
        /has an unsafe conflict path/i,
      ],
      [
        'duplicate conflict entries for the same agent and path',
        [
          { agent: 'claude', path: '.claude/commands/dev-fix.md' },
          { agent: 'claude', path: '.claude/commands/dev-fix.md' },
        ],
        /has a duplicate native conflict for/i,
      ],
    ])(
      'rejects %s before publishing and preserves the previous lock',
      async (_label, conflicts, expectedError) => {
        const lock = baseLock();
        await service.write(root, lock);
        const lockPath = path.join(root, LOCKFILE_NAME);
        const previous = await fs.readFile(lockPath);

        const badCatalog = catalog({
          workflows: {
            'dev-fix': {
              ...catalog().workflows['dev-fix'],
              nativeConflicts: conflicts,
            },
          },
        });

        await expect(
          service.write(root, { ...baseLock(), workflowCatalog: badCatalog }),
        ).rejects.toThrow(expectedError);

        expect(await fs.readFile(lockPath)).toEqual(previous);
      },
    );
  });
});
