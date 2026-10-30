import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { GitHubTreeItem, GitHubTreeResponse } from '../../models/types';
import { GithubService } from '../GithubService';
import {
  CategoryCatalog,
  SkillCatalogError,
  SkillCatalogService,
} from '../SkillCatalogService';

const REGISTRY = 'https://github.com/acme/registry';
const RELEASE_COMMIT = 'a'.repeat(40);
/** Second commit used to prove the release tree is read at the commit, not the tag. */
const OTHER_COMMIT = 'b'.repeat(40);
const TAGLESS_METADATA: CategoryCatalog['metadata'] = {
  categories: { typescript: { tag_prefix: 'typescript-v' } },
};

const skillMarkdown = (name: string, description: string) =>
  `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\nBody.\n`;

/**
 * Deterministic fake GitHub transport. Trees are derived from the `ref:path`
 * keys in `files`, so a fixture's content and its tree cannot drift apart.
 */
interface FakeRepo {
  defaultBranch: string;
  /** `ref:path` -> file contents */
  files: Record<string, string>;
  /** refs whose tree fetch fails (network error or 404) */
  failedRefs?: string[];
  /** refs whose tree response is flagged truncated */
  truncatedRefs?: string[];
  /** ref -> commit sha reported by resolveCommit */
  commits?: Record<string, string>;
  repoInfoFails?: boolean;
  /** `ref:path` entries listed in the tree whose download fails */
  unreadablePaths?: string[];
  /** raw tree response override, for malformed-envelope/entry tests */
  treeResponses?: Record<string, unknown>;
}

interface FakeGithub extends Pick<
  GithubService,
  | 'getRepoInfo'
  | 'getRepoTree'
  | 'getRawFile'
  | 'resolveCommit'
  | 'downloadFilesConcurrent'
> {
  treeCalls: string[];
  rawCalls: string[];
  commitCalls: string[];
}

const BASE_FILES: Record<string, string> = {
  'trunk:skills/metadata.json': JSON.stringify({
    global: { author: 'acme', repository: REGISTRY },
    categories: {
      react: { version: '1.2.0', tag_prefix: 'react-v' },
      // Present in metadata but with no release version on purpose: a manager
      // must refuse to invent a default-branch fallback for it.
      typescript: { tag_prefix: 'typescript-v' },
      flutter: { version: '0.1.0', tag_prefix: 'flutter-v' },
    },
  }),
  'trunk:skills/react/hooks/SKILL.md': skillMarkdown(
    'React Hooks',
    'Use when building React hooks.',
  ),
  'trunk:skills/react/state/SKILL.md': skillMarkdown(
    'React State',
    'Use when picking a state library.',
  ),
  'trunk:skills/react/references/guide.md': 'reference material, not a skill',
  'trunk:skills/typescript/strict-mode/SKILL.md':
    '---\nname: Strict Mode\ndescription: >\n  Use when tightening tsconfig.\n---\n\nBody.\n',

  'react-v1.0.0:skills/react/hooks/SKILL.md': skillMarkdown(
    'React Hooks',
    'Use when building React hooks.',
  ),
  'react-v1.0.0:skills/react/state/SKILL.md': skillMarkdown(
    'React State (legacy)',
    'Use before signals landed.',
  ),

  'react-v1.1.0:skills/react/hooks/SKILL.md': skillMarkdown(
    'React Hooks',
    'Use when building React hooks.',
  ),
  'react-v1.1.0:skills/react/signals/SKILL.md': skillMarkdown(
    'React Signals',
    'Use when adopting signals.',
  ),

  [`${RELEASE_COMMIT}:skills/react/hooks/SKILL.md`]: skillMarkdown(
    'React Hooks',
    'Use when building React hooks.',
  ),
  [`${RELEASE_COMMIT}:skills/react/state/SKILL.md`]: skillMarkdown(
    'React State',
    'Use when picking a state library.',
  ),

  'react-empty:skills/react/references/guide.md': 'reference material only',

  'react-broken:skills/react/broken/SKILL.md': '# no frontmatter here\n',

  'react-unreadable:skills/react/hooks/SKILL.md': skillMarkdown(
    'React Hooks',
    'Use when building React hooks.',
  ),
  'react-unreadable:skills/react/signals/SKILL.md': skillMarkdown(
    'React Signals',
    'Use when adopting signals.',
  ),
};

/** Same identity `git hash-object` would compute for the file contents. */
function gitBlobSha(content: string): string {
  return createHash('sha1')
    .update(`blob ${Buffer.byteLength(content)}\0${content}`)
    .digest('hex');
}

function gitObjectSha(seed: string): string {
  return createHash('sha1').update(seed).digest('hex');
}

function treeFor(repo: FakeRepo, ref: string): GitHubTreeItem[] | null {
  const prefix = `${ref}:`;
  const paths = Object.keys(repo.files)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length))
    .sort();
  if (paths.length === 0) return null;

  const directories = new Set<string>();
  for (const filePath of paths) {
    const parts = filePath.split('/');
    for (let index = 1; index < parts.length; index += 1) {
      directories.add(parts.slice(0, index).join('/'));
    }
  }

  return [
    ...Array.from(directories)
      .sort()
      .map((dir) => ({
        path: dir,
        type: 'tree' as const,
        sha: gitObjectSha(`tree:${dir}`),
        url: `https://api.github.test/tree/${dir}`,
      })),
    ...paths.map((filePath) => ({
      path: filePath,
      type: 'blob' as const,
      sha: gitBlobSha(repo.files[`${ref}:${filePath}`] ?? ''),
      url: `https://api.github.test/blob/${filePath}`,
    })),
  ];
}

function createGithub(repo: FakeRepo): FakeGithub {
  const github: FakeGithub = {
    treeCalls: [],
    rawCalls: [],
    commitCalls: [],
    async getRepoInfo() {
      if (repo.repoInfoFails) return null;
      return { default_branch: repo.defaultBranch };
    },
    async getRepoTree(_owner, _repo, ref) {
      github.treeCalls.push(ref);
      if (repo.failedRefs?.includes(ref)) return null;
      const overridden = repo.treeResponses?.[ref];
      if (overridden !== undefined) {
        // Deliberately malformed payloads are passed through untouched.
        return overridden as unknown as GitHubTreeResponse;
      }
      const tree = treeFor(repo, ref);
      if (!tree) return null;
      return {
        sha: gitObjectSha(`tree:${ref}`),
        url: `https://api.github.test/tree/${ref}`,
        tree,
        truncated: repo.truncatedRefs?.includes(ref) ?? false,
      };
    },
    async getRawFile(_owner, _repo, ref, path) {
      const key = `${ref}:${path}`;
      github.rawCalls.push(key);
      if (repo.unreadablePaths?.includes(key)) return null;
      return repo.files[key] ?? null;
    },
    async resolveCommit(_owner, _repo, ref) {
      github.commitCalls.push(ref);
      return repo.commits?.[ref] ?? null;
    },
    async downloadFilesConcurrent(tasks) {
      const ok: { path: string; content: string }[] = [];
      const failed: { path: string; reason: string }[] = [];
      for (const task of tasks) {
        const key = `${task.ref}:${task.path}`;
        const content = repo.files[key];
        if (content === undefined || repo.unreadablePaths?.includes(key)) {
          failed.push({ path: task.path, reason: 'not found' });
        } else {
          ok.push({ path: task.path, content });
        }
      }
      return { ok, failed };
    },
  };
  return github;
}

function makeRepo(overrides: Partial<FakeRepo> = {}): FakeRepo {
  return {
    defaultBranch: 'trunk',
    files: { ...BASE_FILES },
    commits: { 'react-v1.2.0': RELEASE_COMMIT },
    ...overrides,
  };
}

function createService(repo: FakeRepo = makeRepo()) {
  const github = createGithub(repo);
  return { service: new SkillCatalogService(github), github };
}

describe('SkillCatalogService.load', () => {
  it('discovers the real categories on the reported default branch', async () => {
    const { service, github } = createService();

    const catalog = await service.load(REGISTRY);

    expect(catalog.registry).toBe(REGISTRY);
    // `flutter` is only in metadata, not in the repository tree: it is not
    // selectable and must not be fabricated.
    expect(catalog.categories).toEqual(['react', 'typescript']);
    expect(catalog.metadata.categories?.react).toMatchObject({
      version: '1.2.0',
      tag_prefix: 'react-v',
    });
    expect(github.treeCalls).toEqual(['trunk']);
  });

  it('fails when the default branch cannot be read', async () => {
    const { service } = createService(makeRepo({ repoInfoFails: true }));

    await expect(service.load(REGISTRY)).rejects.toBeInstanceOf(
      SkillCatalogError,
    );
  });

  it('fails on a truncated tree instead of returning a partial category list', async () => {
    const { service } = createService(makeRepo({ truncatedRefs: ['trunk'] }));

    await expect(service.load(REGISTRY)).rejects.toThrow(/truncated/);
  });

  it('fails on a transport error instead of falling back to a default list', async () => {
    const { service } = createService(makeRepo({ failedRefs: ['trunk'] }));

    await expect(service.load(REGISTRY)).rejects.toThrow(
      /repository tree for https:\/\/github.com\/acme\/registry@trunk/,
    );
  });

  it('fails when registry metadata is missing', async () => {
    const { 'trunk:skills/metadata.json': _omitted, ...filesWithoutMetadata } =
      BASE_FILES;
    const { service } = createService(
      makeRepo({ files: filesWithoutMetadata }),
    );

    await expect(service.load(REGISTRY)).rejects.toThrow(/metadata.json/);
  });

  it('fails when registry metadata is not valid JSON', async () => {
    const { service } = createService(
      makeRepo({
        files: {
          ...BASE_FILES,
          'trunk:skills/metadata.json': '{not json',
        },
      }),
    );

    await expect(service.load(REGISTRY)).rejects.toThrow(/not valid JSON/);
  });

  it('fails when registry metadata has the wrong shape', async () => {
    const { service } = createService(
      makeRepo({
        files: {
          ...BASE_FILES,
          'trunk:skills/metadata.json': JSON.stringify({
            categories: { react: '1.2.0' },
          }),
        },
      }),
    );

    await expect(service.load(REGISTRY)).rejects.toThrow(/malformed/);
  });

  it('accepts a valid empty tree, which is distinct from a failed fetch', async () => {
    const { service } = createService(
      makeRepo({
        files: { 'trunk:skills/metadata.json': '{}' },
      }),
    );

    const catalog = await service.load(REGISTRY);

    expect(catalog.categories).toEqual([]);
    expect(catalog.metadata).toEqual({});
  });

  it('rejects a registry URL that is not a GitHub repository', async () => {
    const { service } = createService();

    await expect(
      service.load('https://gitlab.com/acme/registry'),
    ).rejects.toBeInstanceOf(SkillCatalogError);
  });
});

describe('SkillCatalogService tree validation', () => {
  const treeUrl = 'https://api.github.test/tree/trunk';
  const entries = (tree: unknown[]) => ({
    sha: 'a'.repeat(40),
    url: treeUrl,
    tree,
    truncated: false,
  });

  it('rejects a response that omits the truncated flag', async () => {
    const { service } = createService(
      makeRepo({
        treeResponses: {
          trunk: { sha: 'a'.repeat(40), url: treeUrl, tree: [] },
        },
      }),
    );

    await expect(service.load(REGISTRY)).rejects.toThrow(
      /not a complete GitHub tree response: truncated/,
    );
  });

  it('rejects a malformed entry instead of dropping it', async () => {
    const { service } = createService(
      makeRepo({ treeResponses: { trunk: entries([{}]) } }),
    );

    await expect(service.load(REGISTRY)).rejects.toThrow(
      /not a complete GitHub tree response: tree\.0/,
    );
  });

  it('rejects a blob entry without a git blob sha', async () => {
    const { service } = createService(
      makeRepo({
        treeResponses: {
          trunk: entries([
            {
              path: 'skills/react/hooks/SKILL.md',
              type: 'blob',
              url: treeUrl,
            },
          ]),
        },
      }),
    );

    await expect(service.load(REGISTRY)).rejects.toThrow(/tree\.0\.sha/);
  });

  it('rejects a blob entry whose sha is not a git object sha', async () => {
    const { service } = createService(
      makeRepo({
        treeResponses: {
          trunk: entries([
            {
              path: 'skills/react/hooks/SKILL.md',
              type: 'blob',
              sha: 'blob:skills/react/hooks/SKILL.md',
              url: treeUrl,
            },
          ]),
        },
      }),
    );

    await expect(service.load(REGISTRY)).rejects.toThrow(/tree\.0\.sha/);
  });

  it.each(['skills//react', 'skills/./react', 'skills/../react'])(
    'rejects unsafe path segments in %s',
    async (path) => {
      const { service } = createService(
        makeRepo({
          treeResponses: {
            trunk: entries([
              {
                path,
                type: 'tree',
                sha: 'b'.repeat(40),
                url: treeUrl,
              },
            ]),
          },
        }),
      );

      await expect(service.load(REGISTRY)).rejects.toThrow(/tree\.0\.path/);
    },
  );

  it('accepts prototype-named path segments', async () => {
    const { service } = createService(
      makeRepo({
        treeResponses: {
          trunk: entries([
            {
              path: 'skills/constructor',
              type: 'tree',
              sha: 'b'.repeat(40),
              url: treeUrl,
            },
          ]),
        },
      }),
    );

    const catalog = await service.load(REGISTRY);

    expect(catalog.categories).toEqual(['constructor']);
  });

  it('accepts a complete envelope with an empty tree', async () => {
    const { service } = createService(
      makeRepo({ treeResponses: { trunk: entries([]) } }),
    );

    const catalog = await service.load(REGISTRY);

    expect(catalog.categories).toEqual([]);
  });
});

describe('SkillCatalogService.resolveRelease', () => {
  it('resolves the metadata release tag to its exact commit', async () => {
    const { service, github } = createService();

    const resolved = await service.resolveRelease(
      await service.load(REGISTRY),
      'react',
    );

    expect(resolved).toEqual({
      category: 'react',
      ref: 'react-v1.2.0',
      commit: RELEASE_COMMIT,
    });
    expect(github.commitCalls).toEqual(['react-v1.2.0']);
    // The release contents are verified at the resolved commit, not the tag.
    expect(github.treeCalls).toContain(RELEASE_COMMIT);
  });

  it('fails when the category has no published release and never falls back to the default branch', async () => {
    const { service, github } = createService();

    await expect(
      service.resolveRelease(
        {
          registry: REGISTRY,
          categories: ['react', 'typescript'],
          metadata: TAGLESS_METADATA,
        },
        'typescript',
      ),
    ).rejects.toThrow(/no published release/);
    expect(github.commitCalls).toEqual([]);
    expect(github.treeCalls).toEqual([]);
  });

  it('fails when the release tag does not resolve to a commit', async () => {
    const { service } = createService(makeRepo({ commits: {} }));

    await expect(
      service.resolveRelease(await service.load(REGISTRY), 'react'),
    ).rejects.toThrow(/does not resolve/);
  });

  it('fails when the resolved release does not contain the category', async () => {
    // The tag resolves to OTHER_COMMIT, whose tree carries another category.
    const { service } = createService(
      makeRepo({
        commits: { 'react-v1.2.0': OTHER_COMMIT },
        files: {
          ...BASE_FILES,
          [`${OTHER_COMMIT}:skills/typescript/strict-mode/SKILL.md`]:
            BASE_FILES['trunk:skills/typescript/strict-mode/SKILL.md']!,
        },
      }),
    );

    await expect(
      service.resolveRelease(await service.load(REGISTRY), 'react'),
    ).rejects.toThrow(/does not contain category "react"/);
  });

  it('fails on a truncated release tree', async () => {
    const { service } = createService(
      makeRepo({ truncatedRefs: [RELEASE_COMMIT] }),
    );

    await expect(
      service.resolveRelease(await service.load(REGISTRY), 'react'),
    ).rejects.toThrow(/truncated/);
  });

  it('reuses the resolved release within one run', async () => {
    const { service, github } = createService();
    const catalog = await service.load(REGISTRY);

    await service.resolveRelease(catalog, 'react');
    await service.resolveRelease(catalog, 'react');

    expect(github.commitCalls).toEqual(['react-v1.2.0']);
  });
});

describe('SkillCatalogService.listSkills', () => {
  it('lists only real SKILL.md entries at the requested ref', async () => {
    const { service } = createService();

    const skills = await service.listSkills(REGISTRY, 'react', 'react-v1.0.0');

    expect(skills).toEqual([
      {
        id: 'react/hooks',
        category: 'react',
        name: 'React Hooks',
        description: 'Use when building React hooks.',
      },
      {
        id: 'react/state',
        category: 'react',
        name: 'React State (legacy)',
        description: 'Use before signals landed.',
      },
    ]);
  });

  it('returns the skills that exist at each ref, not the default branch', async () => {
    const { service } = createService();

    const v1 = await service.listSkills(REGISTRY, 'react', 'react-v1.0.0');
    const v2 = await service.listSkills(REGISTRY, 'react', 'react-v1.1.0');

    expect(v1.map((skill) => skill.id)).toEqual(['react/hooks', 'react/state']);
    expect(v2.map((skill) => skill.id)).toEqual([
      'react/hooks',
      'react/signals',
    ]);
  });

  it('parses block-scalar frontmatter descriptions', async () => {
    const { service } = createService();

    const skills = await service.listSkills(REGISTRY, 'typescript', 'trunk');

    expect(skills).toEqual([
      {
        id: 'typescript/strict-mode',
        category: 'typescript',
        name: 'Strict Mode',
        description: 'Use when tightening tsconfig.\n',
      },
    ]);
  });

  it('fails instead of returning a partial list when a SKILL.md cannot be read', async () => {
    const { service } = createService(
      makeRepo({
        unreadablePaths: ['react-unreadable:skills/react/signals/SKILL.md'],
      }),
    );

    await expect(
      service.listSkills(REGISTRY, 'react', 'react-unreadable'),
    ).rejects.toThrow(/Could not read every SKILL.md/);
  });

  it('fails on a truncated tree at the requested ref', async () => {
    const { service } = createService(
      makeRepo({ truncatedRefs: ['react-v1.0.0'] }),
    );

    await expect(
      service.listSkills(REGISTRY, 'react', 'react-v1.0.0'),
    ).rejects.toThrow(/truncated/);
  });

  it('returns an empty list for a ref with no SKILL.md, which is distinct from a failure', async () => {
    const { service } = createService();

    await expect(
      service.listSkills(REGISTRY, 'react', 'react-empty'),
    ).resolves.toEqual([]);
  });

  it('fails when a listed SKILL.md has no parseable frontmatter', async () => {
    const { service } = createService();

    await expect(
      service.listSkills(REGISTRY, 'react', 'react-broken'),
    ).rejects.toThrow(/no parseable frontmatter/);
  });

  it('caches the skill list per registry/category/ref within one run', async () => {
    const { service, github } = createService();

    const first = await service.listSkills(REGISTRY, 'react', 'react-v1.0.0');
    const second = await service.listSkills(REGISTRY, 'react', 'react-v1.0.0');

    expect(second).toEqual(first);
    expect(github.treeCalls).toEqual(['react-v1.0.0']);
  });

  it('fails when the ref tree cannot be read', async () => {
    const { service } = createService();

    await expect(
      service.listSkills(REGISTRY, 'react', 'react-missing'),
    ).rejects.toThrow(/Could not read the repository tree/);
  });
});
