import fs from 'fs-extra';
import * as yaml from 'js-yaml';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SkillConfig } from '../../models/config';
import { CollectedSkill, GitHubTreeItem } from '../../models/types';
import { ConfigService, ConfigSnapshot } from '../ConfigService';
import { GithubService, ReleaseManifest } from '../GithubService';
import { LOCKFILE_NAME, sha256 } from '../LockfileService';
import { SkillAssemblyError } from '../SkillSyncService';
import {
  PreparedSkillChange,
  SkillSelectionApplyService,
} from '../SkillSelectionApplyService';
import { SyncService } from '../SyncService';

const COMMON_V1 = 'common-v1.0.0';
const COMMON_V1_COMMIT = 'b'.repeat(40);
const PM_V1 = 'product-management-v1.0.0';
const PM_V1_COMMIT = 'c'.repeat(40);
const REACT_V1 = 'react-v1.0.0';
const REACT_V1_COMMIT = 'a'.repeat(40);

const skillMarkdown = (name: string): string =>
  [
    '---',
    `name: ${name}`,
    `description: ${name} test skill`,
    'metadata:',
    '  triggers:',
    '    files: []',
    '    keywords: []',
    '---',
    '## **Priority: P1**',
    '',
    `Use ${name}.`,
    '',
  ].join('\n');

const collected = (
  category: string,
  skill: string,
  files: Record<string, string> = { 'SKILL.md': skillMarkdown(skill) },
): CollectedSkill => ({
  category,
  skill,
  files: Object.entries(files).map(([name, content]) => ({ name, content })),
});

/**
 * Deterministic transport double. Trees are derived from published files, so
 * tree and content cannot drift, and every ref resolves to a real commit.
 */
class FakeTransport {
  readonly refs = new Map<string, string>();
  readonly snapshots = new Map<string, Map<string, string>>();
  readonly unavailableTrees = new Set<string>();
  readonly truncatedTrees = new Set<string>();
  readonly malformedTrees = new Set<string>();
  readonly unavailableDownloads = new Set<string>();
  readonly manifestFailures = new Set<string>();
  readonly treeCalls: string[] = [];
  readonly manifests = new Map<string, ReleaseManifest>();
  metadata = JSON.stringify({
    file_routing: { ts: ['common'], tsx: ['react'] },
    broad_globs: ['**/*.ts'],
    base_language_skills: { common: 'alpha' },
  });

  publish(ref: string, commit: string, files: Record<string, string>): void {
    this.refs.set(ref, commit);
    const snapshot = this.snapshots.get(commit) ?? new Map<string, string>();
    for (const [filePath, content] of Object.entries(files)) {
      snapshot.set(filePath, content);
    }
    this.snapshots.set(commit, snapshot);
  }

  publishCategory(
    ref: string,
    commit: string,
    category: string,
    skills: Record<string, Record<string, string>>,
  ): void {
    const files: Record<string, string> = {};
    for (const [skill, skillFiles] of Object.entries(skills)) {
      for (const [name, content] of Object.entries(skillFiles)) {
        files[`skills/${category}/${skill}/${name}`] = content;
      }
    }
    this.publish(ref, commit, files);
  }

  private filesAt(ref: string): Map<string, string> | undefined {
    return this.snapshots.get(this.refs.get(ref) ?? ref);
  }

  async getRepoTree(
    _owner: string,
    _repo: string,
    ref: string,
  ): Promise<{
    sha: string;
    url: string;
    tree: GitHubTreeItem[];
    truncated: boolean;
  } | null> {
    this.treeCalls.push(ref);
    if (this.unavailableTrees.has(ref)) return null;
    const files = this.filesAt(ref);
    if (!files) return null;
    const items = new Map<string, GitHubTreeItem>();
    for (const [filePath, content] of files) {
      const segments = filePath.split('/');
      for (let depth = 1; depth < segments.length; depth += 1) {
        const dir = segments.slice(0, depth).join('/');
        if (!items.has(dir)) {
          items.set(dir, {
            path: dir,
            type: 'tree',
            sha: sha256(dir).slice(0, 40),
            url: `fake://${dir}`,
          });
        }
      }
      items.set(filePath, {
        path: filePath,
        type: 'blob',
        sha: sha256(content).slice(0, 40),
        url: `fake://${filePath}`,
      });
    }
    const response = {
      sha: sha256(ref).slice(0, 40),
      url: `fake://${ref}`,
      tree: [...items.values()],
      truncated: this.truncatedTrees.has(ref),
    };
    if (this.malformedTrees.has(ref)) {
      return { ...response, sha: 'not-a-tree-sha' };
    }
    return response;
  }

  async resolveCommit(
    _owner: string,
    _repo: string,
    ref: string,
  ): Promise<string | null> {
    if (this.refs.has(ref)) return this.refs.get(ref)!;
    return /^[0-9a-f]{40}$/.test(ref) ? ref : null;
  }

  async getRawFile(
    _owner: string,
    _repo: string,
    _ref: string,
    filePath: string,
  ): Promise<string | null> {
    return filePath === 'skills/metadata.json' ? this.metadata : null;
  }

  async getRepoInfo(): Promise<{ default_branch: string }> {
    return { default_branch: 'trunk' };
  }

  async getReleaseManifest(
    _owner: string,
    _repo: string,
    tag: string,
  ): Promise<ReleaseManifest | null> {
    if (this.manifestFailures.has(tag)) {
      throw new Error(`HTTP 500 for ${tag}`);
    }
    return this.manifests.get(tag) ?? null;
  }

  async downloadFilesConcurrentBytes(
    tasks: Array<{ ref: string; path: string }>,
  ): Promise<{
    ok: Array<{ path: string; content: Buffer }>;
    failed: Array<{ path: string; reason: string }>;
  }> {
    const ok: Array<{ path: string; content: Buffer }> = [];
    const failed: Array<{ path: string; reason: string }> = [];
    for (const task of tasks) {
      const content = this.filesAt(task.ref)?.get(task.path);
      if (content === undefined || this.unavailableDownloads.has(task.path)) {
        failed.push({ path: task.path, reason: 'not found' });
        continue;
      }
      ok.push({ path: task.path, content: Buffer.from(content) });
    }
    return { ok, failed };
  }
}

const asGithub = (transport: FakeTransport): GithubService =>
  transport as unknown as GithubService;

describe('SkillSelectionApplyService', () => {
  let tempDir: string;
  let originalCwd: string;
  let transport: FakeTransport;
  let configService: ConfigService;
  let syncService: SyncService;
  let applyService: SkillSelectionApplyService;
  const projectPath = (...segments: string[]): string =>
    path.join(tempDir, ...segments);

  const readConfigBytes = (): Promise<string> =>
    fs.readFile(projectPath('.skillsrc'), 'utf8');

  const readLock = async (): Promise<{
    sources: Record<string, { ref: string; commit: string | null }>;
    entries: Record<string, { owner: string; source: string; sha256: string }>;
  }> => fs.readJson(path.join(tempDir, LOCKFILE_NAME));

  const rawConfig = (): Record<string, unknown> => ({
    registry: 'https://github.com/example/registry',
    agents: ['claude', 'codex'],
    workflows: ['sdlc'],
    workflows_ref: 'workflows-v1',
    specialists_ref: 'specialists-v1',
    skills: { common: { ref: COMMON_V1, include: ['alpha'] } },
    top_extension: { keep: true },
  });

  async function writeProjectConfig(
    raw: Record<string, unknown>,
  ): Promise<void> {
    await fs.outputFile(projectPath('.skillsrc'), yaml.dump(raw));
  }

  async function seedInstall(
    config: SkillConfig,
    skills: CollectedSkill[],
  ): Promise<void> {
    const sync = new SyncService(asGithub(transport));
    await sync.beginInstall(config, { dryRun: false, force: [] });
    await sync.writeSkills(skills, config);
    await sync.completeInstall(config, {
      skills,
      workflows: [],
      specialistsOk: true,
      refreshIndices: true,
      completedSkillCategories: Object.keys(config.skills),
    });
  }

  /** Adds unrelated workflow/specialist entries and source records. */
  async function seedUnrelatedOwnership(): Promise<void> {
    const lockPath = path.join(tempDir, LOCKFILE_NAME);
    const lock = await fs.readJson(lockPath);
    const workflowRel = '.claude/commands/sdlc.md';
    const workflowContent = '# SDLC workflow';
    await fs.outputFile(path.join(tempDir, workflowRel), workflowContent);
    lock.entries[workflowRel] = {
      owner: 'workflow',
      source: 'workflow:sdlc',
      agent: 'claude',
      sha256: sha256(workflowContent),
    };
    const specialistRel = '.claude/agents/reviewer.md';
    const specialistContent = '# Reviewer specialist';
    await fs.outputFile(path.join(tempDir, specialistRel), specialistContent);
    lock.entries[specialistRel] = {
      owner: 'specialist',
      source: 'specialist:reviewer',
      agent: 'claude',
      sha256: sha256(specialistContent),
    };
    lock.sources['workflows'] = {
      ref: 'workflows-v1',
      commit: 'e'.repeat(40),
    };
    lock.sources['specialists'] = {
      ref: 'specialists-v1',
      commit: 'f'.repeat(40),
    };
    await fs.writeJson(lockPath, lock, { spaces: 2 });
  }

  async function snapshot(): Promise<ConfigSnapshot> {
    const read = await configService.readSnapshot(tempDir);
    if (!read) throw new Error('missing .skillsrc');
    return read;
  }

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-apply-test-'));
    process.chdir(tempDir);
    transport = new FakeTransport();
    transport.publishCategory(COMMON_V1, COMMON_V1_COMMIT, 'common', {
      alpha: { 'SKILL.md': skillMarkdown('alpha') },
      beta: { 'SKILL.md': skillMarkdown('beta') },
    });
    transport.publishCategory(PM_V1, PM_V1_COMMIT, 'product-management', {
      'product-requirements': {
        'SKILL.md': skillMarkdown('product-requirements'),
      },
    });
    transport.publishCategory(REACT_V1, REACT_V1_COMMIT, 'react', {
      'react-core': { 'SKILL.md': skillMarkdown('react-core') },
    });
    // Imported packages: same physical skill reachable from several sources.
    transport.publishCategory(COMMON_V1, COMMON_V1_COMMIT, 'react', {
      'react-core': { 'SKILL.md': skillMarkdown('react-core') },
    });
    transport.publishCategory(PM_V1, PM_V1_COMMIT, 'react', {
      'react-core': { 'SKILL.md': skillMarkdown('react-core') },
    });
    transport.publishCategory(
      COMMON_V1,
      COMMON_V1_COMMIT,
      'product-management',
      {
        'product-requirements': {
          'SKILL.md': skillMarkdown('product-requirements'),
        },
      },
    );
    configService = new ConfigService();
    syncService = new SyncService(asGithub(transport));
    applyService = new SkillSelectionApplyService({
      configService,
      syncService,
    });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tempDir);
  });

  it('applies an addition and a removal across both agents, indexes and lock', async () => {
    await writeProjectConfig({
      ...rawConfig(),
      skills: { common: { ref: COMMON_V1, include: ['alpha', 'beta'] } },
    });
    const initial = await snapshot();
    await seedInstall(initial.config, [
      collected('common', 'alpha'),
      collected('common', 'beta'),
    ]);
    await seedUnrelatedOwnership();

    const proposed: SkillConfig = {
      ...initial.config,
      skills: {
        common: { ref: COMMON_V1, include: ['alpha'] },
        'product-management': { ref: PM_V1 },
      },
    };
    const prepared = await applyService.prepare(initial, proposed);
    expect(prepared.completedCategories).toEqual([
      'common',
      'product-management',
    ]);
    expect(prepared.resolvedRefs.skills.common).toEqual({
      ref: COMMON_V1,
      commit: COMMON_V1_COMMIT,
      pinned: true,
    });

    const result = await applyService.apply(prepared);
    expect(result.status).toBe('complete');
    if (result.status !== 'complete') return;

    for (const agentPath of ['.claude/skills', '.codex/skills']) {
      expect(
        await fs.readFile(
          projectPath(agentPath, 'common/alpha/SKILL.md'),
          'utf8',
        ),
      ).toBe(skillMarkdown('alpha'));
      expect(
        await fs.pathExists(projectPath(agentPath, 'common/beta/SKILL.md')),
      ).toBe(false);
      expect(
        await fs.readFile(
          projectPath(
            agentPath,
            'product-management/product-requirements/SKILL.md',
          ),
          'utf8',
        ),
      ).toBe(skillMarkdown('product-requirements'));
    }

    const commonIndex = await fs.readFile(
      projectPath('.claude/skills/common/_INDEX.md'),
      'utf8',
    );
    expect(commonIndex).toContain('alpha');
    expect(commonIndex).not.toContain('beta');
    expect(
      await fs.pathExists(
        projectPath(
          '.codex/skills/product-management/_INDEX.md',
        ),
      ),
    ).toBe(true);

    expect(result.plan.pruned).toContain(
      '.claude/skills/common/beta/SKILL.md',
    );
    expect(result.plan.pruned).toContain(
      '.codex/skills/common/beta/SKILL.md',
    );

    const saved = yaml.load(await readConfigBytes()) as Record<
      string,
      unknown
    >;
    expect(saved.skills).toEqual({
      common: { ref: COMMON_V1, include: ['alpha'] },
      'product-management': { ref: PM_V1 },
    });
    expect(saved.skills_mode).toBe('explicit');
    expect(saved.workflows).toEqual(['sdlc']);
    expect(saved.top_extension).toEqual({ keep: true });

    const lock = await readLock();
    expect(lock.sources['skills/common']).toEqual({
      ref: COMMON_V1,
      commit: COMMON_V1_COMMIT,
    });
    expect(lock.sources['skills/product-management']).toEqual({
      ref: PM_V1,
      commit: PM_V1_COMMIT,
    });
    expect(lock.sources['workflows']).toEqual({
      ref: 'workflows-v1',
      commit: 'e'.repeat(40),
    });
    expect(lock.sources['specialists']).toEqual({
      ref: 'specialists-v1',
      commit: 'f'.repeat(40),
    });
    expect(lock.entries['.claude/commands/sdlc.md']).toBeDefined();
    expect(lock.entries['.claude/agents/reviewer.md']).toBeDefined();
    expect(await fs.readFile(projectPath('.claude/commands/sdlc.md'), 'utf8')).toBe(
      '# SDLC workflow',
    );
  });
  it('writes imported packages under their physical category with declaring provenance', async () => {
    await writeProjectConfig({
      ...rawConfig(),
      skills: { common: { ref: COMMON_V1, include: ['react/react-core'] } },
    });
    await fs.outputFile(
      projectPath('AGENTS.md'),
      '<!-- SKILLS_INDEX_START -->\nold\n<!-- SKILLS_INDEX_END -->\n',
    );
    const initial = await snapshot();
    const prepared = await applyService.prepare(initial, {
      ...initial.config,
      skills: { common: { ref: COMMON_V1, include: ['react/react-core'] } },
    });
    expect(prepared.skills).toHaveLength(1);
    expect(prepared.skills[0].origin).toEqual({
      category: 'common',
      ref: COMMON_V1,
      commit: COMMON_V1_COMMIT,
    });

    const result = await applyService.apply(prepared);
    expect(result.status).toBe('complete');
    for (const agentPath of ['.claude/skills', '.codex/skills']) {
      expect(
        await fs.readFile(
          projectPath(agentPath, 'react/react-core/SKILL.md'),
          'utf8',
        ),
      ).toBe(skillMarkdown('react-core'));
      expect(
        await fs.readFile(
          projectPath(agentPath, 'react/_INDEX.md'),
          'utf8',
        ),
      ).toContain('react-core');
    }
    expect(await fs.readFile(projectPath('AGENTS.md'), 'utf8')).toContain(
      '<SKILLS>/react/_INDEX.md',
    );
    const lock = await readLock();
    expect(lock.sources['skills/common']).toEqual({
      ref: COMMON_V1,
      commit: COMMON_V1_COMMIT,
    });
    expect(
      lock.entries['.claude/skills/react/react-core/SKILL.md'].source,
    ).toBe(`skill:react/react-core@${COMMON_V1}`);
  });
  it('validates imported bytes against the declaring category release manifest', async () => {
    const packagePath = 'skills/react/react-core/SKILL.md';
    const declaringContent = skillMarkdown('declaring-source');
    const physicalContent = skillMarkdown('physical-source');
    transport.publish(COMMON_V1, COMMON_V1_COMMIT, {
      [packagePath]: declaringContent,
    });
    transport.publish(REACT_V1, REACT_V1_COMMIT, {
      [packagePath]: physicalContent,
    });
    transport.manifests.set(COMMON_V1, {
      schema_version: 1,
      tag: COMMON_V1,
      commit: COMMON_V1_COMMIT,
      files: { [packagePath]: sha256(declaringContent) },
    });
    transport.manifests.set(REACT_V1, {
      schema_version: 1,
      tag: REACT_V1,
      commit: REACT_V1_COMMIT,
      files: { [packagePath]: sha256(physicalContent) },
    });
    await writeProjectConfig({
      ...rawConfig(),
      skills: {
        common: { ref: COMMON_V1, include: ['react/react-core'] },
        react: { ref: REACT_V1, include: [] },
      },
    });
    const initial = await snapshot();
    const proposed: SkillConfig = {
      ...initial.config,
      skills: {
        common: { ref: COMMON_V1, include: ['react/react-core'] },
        react: { ref: REACT_V1, include: [] },
      },
    };

    const prepared = await applyService.prepare(initial, proposed);
    expect(prepared.skills).toHaveLength(1);
    expect(prepared.skills[0].origin).toEqual({
      category: 'common',
      ref: COMMON_V1,
      commit: COMMON_V1_COMMIT,
    });
    expect(
      prepared.skills[0].files.find((file) => file.name === 'SKILL.md')
        ?.content,
    ).toBe(declaringContent);

    const configBytes = await readConfigBytes();
    transport.publish(COMMON_V1, COMMON_V1_COMMIT, {
      [packagePath]: skillMarkdown('tampered-source'),
    });
    await expect(
      applyService.prepare(initial, proposed),
    ).rejects.toBeInstanceOf(SkillAssemblyError);
    expect(await readConfigBytes()).toBe(configBytes);
    expect(await fs.pathExists(projectPath('.claude/skills'))).toBe(false);
  });


  it('rejects one physical package selected from different commits before writing', async () => {
    await writeProjectConfig(rawConfig());
    const initial = await snapshot();
    const configBytes = await readConfigBytes();
    await expect(
      applyService.prepare(initial, {
        ...initial.config,
        skills: {
          common: { ref: COMMON_V1, include: ['react/react-core'] },
          'product-management': {
            ref: PM_V1,
            include: ['react/react-core'],
          },
        },
      }),
    ).rejects.toBeInstanceOf(SkillAssemblyError);
    expect(await readConfigBytes()).toBe(configBytes);
    expect(await fs.pathExists(projectPath('.claude/skills'))).toBe(false);
  });
  it('deduplicates an imported package selected from the same commit', async () => {
    transport.publishCategory(
      COMMON_V1,
      COMMON_V1_COMMIT,
      'product-management',
      {
        'product-requirements': {
          'SKILL.md': skillMarkdown('product-requirements'),
        },
      },
    );
    await writeProjectConfig(rawConfig());
    const initial = await snapshot();
    const prepared = await applyService.prepare(initial, {
      ...initial.config,
      skills: {
        common: { ref: COMMON_V1, include: ['react/react-core'] },
        'product-management': {
          ref: COMMON_V1,
          include: ['react/react-core'],
        },
      },
    });
    expect(prepared.skills).toHaveLength(1);
    expect(prepared.skills[0]).toMatchObject({
      category: 'react',
      skill: 'react-core',
      origin: {
        category: 'common',
        ref: COMMON_V1,
        commit: COMMON_V1_COMMIT,
      },
    });
  });

  it('rejects a malformed tree envelope before using its contents', async () => {
    await writeProjectConfig(rawConfig());
    const initial = await snapshot();
    transport.malformedTrees.add(COMMON_V1_COMMIT);
    await expect(
      applyService.prepare(initial, {
        ...initial.config,
        skills: { common: { ref: COMMON_V1, include: ['alpha'] } },
      }),
    ).rejects.toBeInstanceOf(SkillAssemblyError);
    expect(await fs.pathExists(projectPath('.claude/skills'))).toBe(false);
  });

  it('prunes an unchanged package and stale index for an intentional empty selection', async () => {
    await writeProjectConfig(rawConfig());
    const initial = await snapshot();
    await seedInstall(initial.config, [collected('common', 'alpha')]);
    expect(
      await fs.pathExists(
        projectPath('.claude/skills/common/_INDEX.md'),
      ),
    ).toBe(true);

    const prepared = await applyService.prepare(initial, {
      ...initial.config,
      skills: { common: { ref: COMMON_V1, include: [] } },
    });
    const result = await applyService.apply(prepared);
    expect(result.status).toBe('complete');

    for (const agentPath of ['.claude/skills', '.codex/skills']) {
      expect(
        await fs.pathExists(projectPath(agentPath, 'common/alpha/SKILL.md')),
      ).toBe(false);
      expect(
        await fs.pathExists(projectPath(agentPath, 'common/_INDEX.md')),
      ).toBe(false);
    }

    const lock = await readLock();
    expect(lock.sources['skills/common']).toEqual({
      ref: COMMON_V1,
      commit: COMMON_V1_COMMIT,
    });
    expect(
      Object.keys(lock.entries).filter((rel) => rel.includes('/common/')),
    ).toEqual([]);

    const saved = yaml.load(await readConfigBytes()) as {
      skills: Record<string, unknown>;
    };
    expect(saved.skills).toEqual({ common: { ref: COMMON_V1, include: [] } });
  });

  it('keeps configuration, installations and lock untouched when a category tree fails', async () => {
    await writeProjectConfig(rawConfig());
    const initial = await snapshot();
    await seedInstall(initial.config, [collected('common', 'alpha')]);
    await seedUnrelatedOwnership();

    const configBytes = await readConfigBytes();
    const lockBytes = await fs.readFile(path.join(tempDir, LOCKFILE_NAME));
    transport.unavailableTrees.add(REACT_V1_COMMIT);

    await expect(
      applyService.prepare(initial, {
        ...initial.config,
        skills: {
          common: { ref: COMMON_V1, include: ['alpha'] },
          react: { ref: REACT_V1 },
        },
      }),
    ).rejects.toBeInstanceOf(SkillAssemblyError);

    expect(await readConfigBytes()).toBe(configBytes);
    expect(await fs.readFile(path.join(tempDir, LOCKFILE_NAME))).toEqual(
      lockBytes,
    );
    expect(
      await fs.readFile(
        projectPath('.claude/skills/common/alpha/SKILL.md'),
        'utf8',
      ),
    ).toBe(skillMarkdown('alpha'));
    expect(await fs.pathExists(projectPath('.claude/skills/react'))).toBe(
      false,
    );
  });

  it('treats a failed package download as preflight failure, not an empty selection', async () => {
    await writeProjectConfig(rawConfig());
    const initial = await snapshot();
    await seedInstall(initial.config, [collected('common', 'alpha')]);
    const configBytes = await readConfigBytes();
    transport.unavailableDownloads.add(
      'skills/react/react-core/SKILL.md',
    );

    await expect(
      applyService.prepare(initial, {
        ...initial.config,
        skills: {
          common: { ref: COMMON_V1, include: ['alpha'] },
          react: { ref: REACT_V1 },
        },
      }),
    ).rejects.toBeInstanceOf(SkillAssemblyError);

    expect(await readConfigBytes()).toBe(configBytes);
    expect(
      await fs.pathExists(projectPath('.claude/skills/common/alpha/SKILL.md')),
    ).toBe(true);
  });

  it('retains an edited excluded file but stops advertising it in the index', async () => {
    await writeProjectConfig({
      ...rawConfig(),
      skills: { common: { ref: COMMON_V1, include: ['alpha', 'beta'] } },
    });
    const initial = await snapshot();
    await seedInstall(initial.config, [
      collected('common', 'alpha'),
      collected('common', 'beta'),
    ]);
    const editedPath = projectPath('.claude/skills/common/beta/SKILL.md');
    await fs.outputFile(editedPath, 'user edited beta');

    const result = await applyService.apply(
      await applyService.prepare(initial, {
        ...initial.config,
        skills: { common: { ref: COMMON_V1, include: ['alpha'] } },
      }),
    );
    expect(result.status).toBe('complete');
    if (result.status !== 'complete') return;

    expect(await fs.readFile(editedPath, 'utf8')).toBe('user edited beta');
    expect(
      await fs.pathExists(
        projectPath('.codex/skills/common/beta/SKILL.md'),
      ),
    ).toBe(false);
    expect(result.plan.keptOrphans).toContain(
      '.claude/skills/common/beta/SKILL.md',
    );

    const index = await fs.readFile(
      projectPath('.claude/skills/common/_INDEX.md'),
      'utf8',
    );
    expect(index).toContain('alpha');
    expect(index).not.toContain('beta');

    const lock = await readLock();
    expect(
      lock.entries['.claude/skills/common/beta/SKILL.md'],
    ).toBeUndefined();
    expect(
      lock.entries['.claude/skills/common/alpha/SKILL.md'],
    ).toBeDefined();
  });

  it('retains content and prunes nothing when prune is disabled', async () => {
    await writeProjectConfig({ ...rawConfig(), prune: false });
    const initial = await snapshot();
    await seedInstall(initial.config, [collected('common', 'alpha')]);
    const alphaPath = projectPath('.claude/skills/common/alpha/SKILL.md');

    const result = await applyService.apply(
      await applyService.prepare(initial, {
        ...initial.config,
        skills: { common: { ref: COMMON_V1, include: [] } },
      }),
    );
    expect(result.status).toBe('complete');
    if (result.status !== 'complete') return;

    expect(result.plan.pruned).toEqual([]);
    expect(await fs.readFile(alphaPath, 'utf8')).toBe(
      skillMarkdown('alpha'),
    );
    const lock = await readLock();
    expect(lock.entries['.claude/skills/common/alpha/SKILL.md']).toBeDefined();

    // Protected content stays, but the retained managed index must stop
    // advertising the deselected skill.
    for (const agentPath of ['.claude/skills', '.codex/skills']) {
      const index = await fs.readFile(
        projectPath(agentPath, 'common/_INDEX.md'),
        'utf8',
      );
      expect(index.trim()).toBe('');
    }
    expect(
      lock.entries['.claude/skills/common/_INDEX.md'].sha256,
    ).toBe(sha256(''));
  });

  it('blanks retained indexes when the category itself is removed under prune:false', async () => {
    await writeProjectConfig({ ...rawConfig(), prune: false });
    const initial = await snapshot();
    await seedInstall(initial.config, [collected('common', 'alpha')]);

    const result = await applyService.apply(
      await applyService.prepare(initial, { ...initial.config, skills: {} }),
    );
    expect(result.status).toBe('complete');
    if (result.status !== 'complete') return;

    expect(result.plan.pruned).toEqual([]);
    expect(
      await fs.readFile(
        projectPath('.claude/skills/common/alpha/SKILL.md'),
        'utf8',
      ),
    ).toBe(skillMarkdown('alpha'));
    for (const agentPath of ['.claude/skills', '.codex/skills']) {
      const index = await fs.readFile(
        projectPath(agentPath, 'common/_INDEX.md'),
        'utf8',
      );
      expect(index.trim()).toBe('');
      expect(index).not.toContain('alpha');
    }
  });

  it('shows the live revocation advisory without changing the configured pin', async () => {
    transport.metadata = JSON.stringify({
      categories: { common: { version: '1.0.0' } },
      revocations: [
        {
          category: 'common',
          refs: [COMMON_V1],
          reason: 'contains a compromised credential',
          advisory: 'https://example.test/advisory',
        },
      ],
    });
    await writeProjectConfig(rawConfig());
    const initial = await snapshot();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const prepared = await applyService.prepare(initial, {
      ...initial.config,
      skills: {
        common: { ref: COMMON_V1, include: ['alpha', 'beta'] },
      },
    });

    const output = log.mock.calls.flat().join('\n');
    expect(output).toContain('common@common-v1.0.0 has been revoked');
    expect(output).toContain('contains a compromised credential');
    expect(output).toContain('https://example.test/advisory');
    expect(prepared.config.skills.common.ref).toBe(COMMON_V1);
    log.mockRestore();
  });

  it.each([
    ['missing local member', ['missing-local']],
    ['missing imported member', ['react/missing-import']],
    ['missing wildcard category', ['absent/*']],
  ] as const)(
    'rejects a %s without changing managed state',
    async (_label, include) => {
      await writeProjectConfig(rawConfig());
      const initial = await snapshot();
      await seedInstall(initial.config, [collected('common', 'alpha')]);
      const configBytes = await readConfigBytes();
      const lockBytes = await fs.readFile(projectPath(LOCKFILE_NAME));
      const managedPath = projectPath(
        '.claude/skills/common/alpha/SKILL.md',
      );
      const indexPath = projectPath('.claude/skills/common/_INDEX.md');
      const contentBefore = await fs.readFile(managedPath, 'utf8');
      const indexBefore = await fs.readFile(indexPath);

      await expect(
        applyService.prepare(initial, {
          ...initial.config,
          skills: { common: { ref: COMMON_V1, include: [...include] } },
        }),
      ).rejects.toBeInstanceOf(SkillAssemblyError);

      expect(await readConfigBytes()).toBe(configBytes);
      expect(await fs.readFile(projectPath(LOCKFILE_NAME))).toEqual(lockBytes);
      expect(await fs.readFile(managedPath, 'utf8')).toBe(contentBefore);
      expect(await fs.readFile(indexPath)).toEqual(indexBefore);
    },
  );

  it('accepts a wildcard for an existing category with no skill packages', async () => {
    const emptyRef = 'empty-common-v1.0.0';
    const emptyCommit = 'e'.repeat(40);
    transport.publish(emptyRef, emptyCommit, {
      'skills/common/README.md': '# Declaring category',
      'skills/react/README.md': '# Empty skill category',
    });
    await writeProjectConfig(rawConfig());
    const initial = await snapshot();

    const prepared = await applyService.prepare(initial, {
      ...initial.config,
      skills: { common: { ref: emptyRef, include: ['react/*'] } },
    });

    expect(prepared.skills).toEqual([]);
    expect(prepared.completedCategories).toEqual(['common']);
  });

  it('installs the prepared commit when a configured ref moves before Apply', async () => {
    await writeProjectConfig(rawConfig());
    const initial = await snapshot();
    await seedInstall(initial.config, [collected('common', 'alpha')]);
    const prepared = await applyService.prepare(initial, {
      ...initial.config,
      skills: {
        common: { ref: COMMON_V1, include: ['alpha', 'beta'] },
      },
    });
    const movedCommit = 'd'.repeat(40);
    transport.publishCategory('moved-common', movedCommit, 'common', {
      alpha: { 'SKILL.md': skillMarkdown('moved-alpha') },
      beta: { 'SKILL.md': skillMarkdown('moved-beta') },
    });
    transport.refs.set(COMMON_V1, movedCommit);

    const result = await applyService.apply(prepared);
    expect(result.status).toBe('complete');
    if (result.status !== 'complete') return;
    expect(
      await fs.readFile(
        projectPath('.claude/skills/common/beta/SKILL.md'),
        'utf8',
      ),
    ).toBe(skillMarkdown('beta'));
    const lock = await readLock();
    expect(lock.sources['skills/common']).toEqual({
      ref: COMMON_V1,
      commit: COMMON_V1_COMMIT,
    });
  });

  it('rejects a truncated source tree and does not refetch it during assembly', async () => {
    await writeProjectConfig(rawConfig());
    const initial = await snapshot();
    await seedInstall(initial.config, [collected('common', 'alpha')]);
    const configBytes = await readConfigBytes();
    transport.treeCalls.length = 0;
    transport.truncatedTrees.add(COMMON_V1_COMMIT);

    await expect(
      applyService.prepare(initial, {
        ...initial.config,
        skills: { common: { ref: COMMON_V1, include: ['alpha'] } },
      }),
    ).rejects.toBeInstanceOf(SkillAssemblyError);

    expect(
      transport.treeCalls.filter((ref) => ref === COMMON_V1_COMMIT),
    ).toHaveLength(1);
    expect(await readConfigBytes()).toBe(configBytes);
  });

  it('treats a failing MANIFEST fetch as preflight failure, not absent verification', async () => {
    await writeProjectConfig(rawConfig());
    const initial = await snapshot();
    const configBytes = await readConfigBytes();
    transport.manifestFailures.add(COMMON_V1);

    await expect(
      applyService.prepare(initial, {
        ...initial.config,
        skills: { common: { ref: COMMON_V1, include: ['alpha'] } },
      }),
    ).rejects.toBeInstanceOf(SkillAssemblyError);

    expect(await readConfigBytes()).toBe(configBytes);
    expect(await fs.pathExists(projectPath('.claude/skills'))).toBe(false);
  });

  it('reports and retries a real index write failure after saving', async () => {
    await writeProjectConfig(rawConfig());
    const initial = await snapshot();
    await seedInstall(initial.config, [collected('common', 'alpha')]);
    const prepared = await applyService.prepare(initial, {
      ...initial.config,
      skills: { common: { ref: COMMON_V1, include: ['alpha', 'beta'] } },
    });
    const indexPath = projectPath('.codex/skills/common/_INDEX.md');
    await fs.remove(indexPath);
    await fs.ensureDir(indexPath);

    const failed = await applyService.apply(prepared);
    expect(failed.status).toBe('incomplete');
    if (failed.status !== 'incomplete') return;
    expect(failed.stage).toBe('installing');
    expect(failed.saved).toBe(true);

    const savedConfig = yaml.load(
      await fs.readFile(failed.snapshot.sourcePath, 'utf8'),
    ) as { skills: Record<string, { include?: string[] }> };
    expect(savedConfig.skills.common.include).toEqual(['alpha', 'beta']);

    await fs.remove(indexPath);
    const retried = await applyService.apply(
      await applyService.prepare(failed.snapshot, prepared.config),
    );
    expect(retried.status).toBe('complete');
    expect(
      await fs.readFile(
        projectPath('.codex/skills/common/_INDEX.md'),
        'utf8',
      ),
    ).toContain('beta');
  });

  it('reports an installation failure after save and retries from the saved snapshot', async () => {
    await writeProjectConfig(rawConfig());
    const initial = await snapshot();
    await seedInstall(initial.config, [collected('common', 'alpha')]);
    const prepared = await applyService.prepare(initial, {
      ...initial.config,
      skills: { common: { ref: COMMON_V1, include: ['alpha', 'beta'] } },
    });
    // A directory where the target file belongs makes the real write fail.
    await fs.ensureDir(projectPath('.codex/skills/common/beta/SKILL.md'));

    const failed = await applyService.apply(prepared);
    expect(failed.status).toBe('incomplete');
    if (failed.status !== 'incomplete') return;
    expect(failed.stage).toBe('installing');
    expect(failed.saved).toBe(true);
    const savedConfig = yaml.load(
      await fs.readFile(failed.snapshot.sourcePath, 'utf8'),
    ) as { skills: Record<string, { include?: string[] }> };
    expect(savedConfig.skills.common.include).toEqual(['alpha', 'beta']);

    await fs.remove(projectPath('.codex/skills/common/beta'));
    const retried = await applyService.apply(
      await applyService.prepare(failed.snapshot, prepared.config),
    );
    expect(retried.status).toBe('complete');
    for (const agentPath of ['.claude/skills', '.codex/skills']) {
      expect(
        await fs.readFile(
          projectPath(agentPath, 'common/beta/SKILL.md'),
          'utf8',
        ),
      ).toBe(skillMarkdown('beta'));
    }
  });

  it('reports a save-stage conflict without overwriting externally changed configuration', async () => {
    await writeProjectConfig(rawConfig());
    const initial = await snapshot();
    await seedInstall(initial.config, [collected('common', 'alpha')]);
    const prepared = await applyService.prepare(initial, {
      ...initial.config,
      skills: { common: { ref: COMMON_V1, include: ['alpha', 'beta'] } },
    });
    const external = yaml.dump({ ...rawConfig(), external_change: true });
    await fs.outputFile(projectPath('.skillsrc'), external);

    const result = await applyService.apply(prepared);
    expect(result.status).toBe('incomplete');
    if (result.status !== 'incomplete') return;
    expect(result.stage).toBe('saving');
    expect(result.saved).toBe(false);
    expect(result.message).toContain('Configuration changed on disk');
    expect(await readConfigBytes()).toBe(external);
    expect(
      await fs.pathExists(
        projectPath('.claude/skills/common/beta/SKILL.md'),
      ),
    ).toBe(false);
  });

  it('preserves unrelated configuration and source records when every skill is removed', async () => {
    await writeProjectConfig(rawConfig());
    const initial = await snapshot();
    await seedInstall(initial.config, [collected('common', 'alpha')]);
    await seedUnrelatedOwnership();

    const result = await applyService.apply(
      await applyService.prepare(initial, { ...initial.config, skills: {} }),
    );
    expect(result.status).toBe('complete');
    if (result.status !== 'complete') return;

    const saved = yaml.load(await readConfigBytes()) as Record<
      string,
      unknown
    >;
    expect(saved.skills).toEqual({});
    expect(saved.skills_mode).toBe('explicit');
    expect(saved.workflows).toEqual(['sdlc']);
    expect(saved.workflows_ref).toBe('workflows-v1');
    expect(saved.top_extension).toEqual({ keep: true });

    expect(
      await fs.readFile(projectPath('.claude/commands/sdlc.md'), 'utf8'),
    ).toBe('# SDLC workflow');
    expect(
      await fs.readFile(projectPath('.claude/agents/reviewer.md'), 'utf8'),
    ).toBe('# Reviewer specialist');

    const lock = await readLock();
    expect(lock.sources['workflows']).toEqual({
      ref: 'workflows-v1',
      commit: 'e'.repeat(40),
    });
    expect(lock.sources['specialists']).toEqual({
      ref: 'specialists-v1',
      commit: 'f'.repeat(40),
    });
    expect(lock.sources['skills/common']).toBeUndefined();
    expect(
      Object.values(lock.entries).filter(
        (entry) => entry.owner === 'skill' || entry.owner === 'index',
      ),
    ).toEqual([]);
  });

  it('rejects a newly added category that has no resolved release ref', async () => {
    await writeProjectConfig(rawConfig());
    const initial = await snapshot();
    await expect(
      applyService.prepare(initial, {
        ...initial.config,
        skills: {
          common: { ref: COMMON_V1, include: ['alpha'] },
          react: {},
        },
      }),
    ).rejects.toBeInstanceOf(SkillAssemblyError);
    expect(await readConfigBytes()).toBe(
      yaml.dump(rawConfig()),
    );
  });

  it.each([
    ['null category entry', { common: null }],
    ['non-object category entry', { common: 'invalid' }],
    [
      'non-string include member',
      { common: { ref: COMMON_V1, include: ['alpha', 3] } },
    ],
    [
      'non-array include list',
      { common: { ref: COMMON_V1, include: 'alpha' } },
    ],
    [
      'non-string exclude member',
      { common: { ref: COMMON_V1, exclude: ['obsolete', 3] } },
    ],
    ['non-string ref', { common: { ref: 3 } }],
  ] as const)(
    'rejects a %s without changing the saved configuration',
    async (_description, skills) => {
      await writeProjectConfig(rawConfig());
      const initial = await snapshot();
      const configBytes = await readConfigBytes();

      await expect(
        applyService.prepare(initial, {
          ...initial.config,
          skills,
        } as unknown as SkillConfig),
      ).rejects.toBeInstanceOf(SkillAssemblyError);

      expect(await readConfigBytes()).toBe(configBytes);
    },
  );

  it('returns a prepared change whose config is the desired selection', async () => {
    await writeProjectConfig(rawConfig());
    const initial = await snapshot();
    const prepared: PreparedSkillChange = await applyService.prepare(
      initial,
      { ...initial.config, skills: { common: { ref: COMMON_V1 } } },
    );
    expect(prepared.config.skills).toEqual({ common: { ref: COMMON_V1 } });
    expect(prepared.skills.map((skill) => skill.skill).sort()).toEqual([
      'alpha',
      'beta',
    ]);
    expect(prepared.snapshot).toBe(initial);
  });

  it('does not install when saving rejects with a non-Error value', async () => {
    await writeProjectConfig(rawConfig());
    const initial = await snapshot();
    const configBytes = await readConfigBytes();
    const prepared = await applyService.prepare(initial, {
      ...initial.config,
      skills: { common: { ref: COMMON_V1, include: ['alpha', 'beta'] } },
    });
    vi.spyOn(configService, 'saveSelection').mockRejectedValue(
      'read-only filesystem',
    );

    const result = await applyService.apply(prepared);

    expect(result.status).toBe('incomplete');
    if (result.status !== 'incomplete') return;
    expect(result.stage).toBe('saving');
    expect(result.saved).toBe(false);
    expect(result.message).toBe('read-only filesystem');
    expect(await readConfigBytes()).toBe(configBytes);
    expect(
      await fs.pathExists(
        projectPath('.claude/skills/common/beta/SKILL.md'),
      ),
    ).toBe(false);
  });

  it('reports a non-Error install rejection after preserving the saved selection', async () => {
    await writeProjectConfig(rawConfig());
    const initial = await snapshot();
    const prepared = await applyService.prepare(initial, {
      ...initial.config,
      skills: { common: { ref: COMMON_V1, include: ['alpha', 'beta'] } },
    });
    vi.spyOn(syncService, 'beginInstall').mockRejectedValue(
      'install lock unavailable',
    );

    const result = await applyService.apply(prepared);

    expect(result.status).toBe('incomplete');
    if (result.status !== 'incomplete') return;
    expect(result.stage).toBe('installing');
    expect(result.saved).toBe(true);
    expect(result.message).toContain('install lock unavailable');
    const saved = yaml.load(await readConfigBytes()) as {
      skills: Record<string, { include?: string[] }>;
    };
    expect(saved.skills.common.include).toEqual(['alpha', 'beta']);
    expect(
      await fs.pathExists(
        projectPath('.claude/skills/common/beta/SKILL.md'),
      ),
    ).toBe(false);
  });
});
