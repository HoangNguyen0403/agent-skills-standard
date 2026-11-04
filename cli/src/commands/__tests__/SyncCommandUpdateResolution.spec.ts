import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../constants';
import { GitHubTreeItem } from '../../models/types';
import { ConfigService } from '../../services/ConfigService';
import { DetectionService } from '../../services/DetectionService';
import { GithubService, ReleaseManifest } from '../../services/GithubService';
import { LOCKFILE_NAME, sha256 } from '../../services/LockfileService';
import { SyncService } from '../../services/SyncService';
import { SyncCommand } from '../sync';

const COMMON_OLD = 'common-v2.9.0';
const COMMON_OLD_COMMIT = 'a'.repeat(40);
const COMMON_NEW = 'common-v2.9.4';
const COMMON_NEW_COMMIT = 'b'.repeat(40);
const WORKFLOWS_OLD = 'workflows-v1.0.0';
const WORKFLOWS_OLD_COMMIT = 'c'.repeat(40);
const WORKFLOWS_NEW = 'workflows-v1.0.2';
const WORKFLOWS_NEW_COMMIT = 'd'.repeat(40);
const SPECIALISTS_OLD = 'specialists-v1.0.0';
const SPECIALISTS_OLD_COMMIT = 'e'.repeat(40);
const SPECIALISTS_NEW = 'specialists-v1.0.1';
const SPECIALISTS_NEW_COMMIT = 'f'.repeat(40);

const WORKFLOW_PATH = '.agents/workflows/custom-flow.md';
const SPECIALIST_PATH = 'skills/specialists/reviewer/SKILL.md';
const ALPHA_PATH = 'skills/common/alpha/SKILL.md';
const BETA_PATH = 'skills/common/beta/SKILL.md';

const skillMarkdown = (name: string, body: string): string =>
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
    body,
    '',
  ].join('\n');

const workflowMarkdown = (body: string): string =>
  [
    '---',
    'name: custom-flow',
    'description: custom flow test workflow',
    '---',
    '',
    body,
    '',
  ].join('\n');

const specialistMarkdown = (body: string): string =>
  [
    '---',
    'name: specialist-reviewer',
    'description: reviewer specialist',
    '---',
    '',
    body,
    '',
  ].join('\n');

const metadataFor = (versions: {
  common: string;
  workflows: string;
  specialists: string;
}): string =>
  JSON.stringify({
    global: { author: 'test', repository: 'https://github.com/example/repo' },
    categories: {
      common: { version: versions.common, tag_prefix: 'common-v' },
      specialists: {
        version: versions.specialists,
        tag_prefix: 'specialists-v',
      },
    },
    releases: {
      workflows: { version: versions.workflows, tag_prefix: 'workflows-v' },
    },
    file_routing: { ts: ['common'] },
    broad_globs: ['**/*.ts'],
    base_language_skills: { common: 'alpha' },
  });

/**
 * Deterministic registry double. Trees are derived from published files, so
 * trees and content cannot drift; every ref resolves to a real commit; release
 * manifests are keyed by tag and record which tags consumers actually fetched.
 */
class FakeTransport {
  readonly refs = new Map<string, string>();
  readonly snapshots = new Map<string, Map<string, string>>();
  readonly manifests = new Map<string, ReleaseManifest>();
  readonly manifestTags: string[] = [];
  metadata = '{}';

  publish(ref: string, commit: string, files: Record<string, string>): void {
    this.refs.set(ref, commit);
    const snapshot = this.snapshots.get(commit) ?? new Map<string, string>();
    for (const [filePath, content] of Object.entries(files)) {
      snapshot.set(filePath, content);
    }
    this.snapshots.set(commit, snapshot);
  }

  publishManifest(ref: string, commit: string): void {
    const files = this.snapshots.get(commit) ?? new Map<string, string>();
    const digests: Record<string, string> = {};
    for (const [filePath, content] of files) {
      digests[filePath] = sha256(content);
    }
    this.manifests.set(ref, {
      schema_version: 1,
      tag: ref,
      commit,
      files: digests,
    });
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
    return {
      sha: sha256(ref).slice(0, 40),
      url: `fake://${ref}`,
      tree: [...items.values()],
      truncated: false,
    };
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
    ref: string,
    filePath: string,
  ): Promise<string | null> {
    if (filePath === 'skills/metadata.json') return this.metadata;
    return this.filesAt(ref)?.get(filePath) ?? null;
  }

  async getRepoInfo(): Promise<{ default_branch: string }> {
    return { default_branch: 'trunk' };
  }

  async getReleaseManifest(
    _owner: string,
    _repo: string,
    tag: string,
  ): Promise<ReleaseManifest | null> {
    this.manifestTags.push(tag);
    return this.manifests.get(tag) ?? null;
  }

  async downloadFilesConcurrent(
    tasks: Array<{ ref: string; path: string }>,
  ): Promise<{
    ok: Array<{ path: string; content: string }>;
    failed: Array<{ path: string; reason: string }>;
  }> {
    const ok: Array<{ path: string; content: string }> = [];
    const failed: Array<{ path: string; reason: string }> = [];
    for (const task of tasks) {
      const content = this.filesAt(task.ref)?.get(task.path);
      if (content === undefined) {
        failed.push({ path: task.path, reason: 'not found' });
        continue;
      }
      ok.push({ path: task.path, content });
    }
    return { ok, failed };
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
      if (content === undefined) {
        failed.push({ path: task.path, reason: 'not found' });
        continue;
      }
      ok.push({ path: task.path, content: Buffer.from(content) });
    }
    return { ok, failed };
  }
}

describe('SyncCommand version-update resolution refresh', () => {
  let tempDir: string;
  let originalCwd: string;
  let originalHome: string | undefined;
  let originalUserProfile: string | undefined;
  let originalIsTTYDescriptor: PropertyDescriptor | undefined;
  let transport: FakeTransport;

  const writeConfig = async (): Promise<void> => {
    await fs.outputFile(
      path.join(tempDir, '.skillsrc'),
      JSON.stringify(
        {
          registry: 'https://github.com/example/repo',
          agents: [Agent.Claude],
          skills_mode: 'explicit',
          skills: { common: { ref: COMMON_OLD } },
          workflows: ['custom-flow'],
          workflows_ref: WORKFLOWS_OLD,
          specialists_ref: SPECIALISTS_OLD,
          mcp: { enabled: false, scope: 'disabled', prompted: true },
          custom_overrides: [],
        },
        null,
        2,
      ),
    );
  };

  const runCommand = async (
    options: { yes?: boolean; dryRun?: boolean } = {},
  ): Promise<void> => {
    const command = new SyncCommand(
      new ConfigService(),
      new DetectionService(),
      new SyncService(transport as unknown as GithubService),
    );
    await command.run(options);
  };

  /**
   * Publishes the old and new release snapshots. `alpha`, the workflow and the
   * specialist change bytes in the new release; `beta` only exists there, so a
   * verifier loaded for the old release rejects it as "not listed".
   */
  const publishReleases = (options: { tamperNewRelease?: boolean } = {}) => {
    transport.publish(COMMON_OLD, COMMON_OLD_COMMIT, {
      [ALPHA_PATH]: skillMarkdown('alpha', 'alpha-v2.9.0'),
    });
    transport.publish(WORKFLOWS_OLD, WORKFLOWS_OLD_COMMIT, {
      [WORKFLOW_PATH]: workflowMarkdown('workflow-v1.0.0'),
    });
    transport.publish(SPECIALISTS_OLD, SPECIALISTS_OLD_COMMIT, {
      [SPECIALIST_PATH]: specialistMarkdown('specialist-v1.0.0'),
    });
    transport.publishManifest(COMMON_OLD, COMMON_OLD_COMMIT);
    transport.publishManifest(WORKFLOWS_OLD, WORKFLOWS_OLD_COMMIT);
    transport.publishManifest(SPECIALISTS_OLD, SPECIALISTS_OLD_COMMIT);

    transport.publish(COMMON_NEW, COMMON_NEW_COMMIT, {
      [ALPHA_PATH]: skillMarkdown('alpha', 'alpha-v2.9.4'),
      [BETA_PATH]: skillMarkdown('beta', 'beta-v2.9.4'),
    });
    transport.publish(WORKFLOWS_NEW, WORKFLOWS_NEW_COMMIT, {
      [WORKFLOW_PATH]: workflowMarkdown('workflow-v1.0.2'),
    });
    transport.publish(SPECIALISTS_NEW, SPECIALISTS_NEW_COMMIT, {
      [SPECIALIST_PATH]: specialistMarkdown('specialist-v1.0.1'),
    });
    // Manifests always describe the honest release bytes.
    transport.publishManifest(COMMON_NEW, COMMON_NEW_COMMIT);
    transport.publishManifest(WORKFLOWS_NEW, WORKFLOWS_NEW_COMMIT);
    transport.publishManifest(SPECIALISTS_NEW, SPECIALISTS_NEW_COMMIT);

    if (options.tamperNewRelease) {
      transport.publish(COMMON_NEW, COMMON_NEW_COMMIT, {
        [ALPHA_PATH]: skillMarkdown('alpha', 'tampered-alpha'),
        [BETA_PATH]: skillMarkdown('beta', 'tampered-beta'),
      });
    }
  };

  beforeEach(async () => {
    originalCwd = process.cwd();
    originalHome = process.env.HOME;
    originalUserProfile = process.env.USERPROFILE;
    originalIsTTYDescriptor = Object.getOwnPropertyDescriptor(
      process.stdin,
      'isTTY',
    );
    process.stdin.isTTY = false;
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-sync-refresh-'));
    process.chdir(tempDir);
    process.env.HOME = tempDir;
    process.env.USERPROFILE = tempDir;
    transport = new FakeTransport();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    if (originalUserProfile === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = originalUserProfile;
    }
    if (originalIsTTYDescriptor) {
      Object.defineProperty(process.stdin, 'isTTY', originalIsTTYDescriptor);
    } else {
      Reflect.deleteProperty(process.stdin, 'isTTY');
    }
    await fs.remove(tempDir);
    vi.restoreAllMocks();
  });

  it('verifies accepted version updates against the new release manifests and records new provenance', async () => {
    publishReleases();
    transport.metadata = metadataFor({
      common: '2.9.4',
      workflows: '1.0.2',
      specialists: '1.0.1',
    });
    await writeConfig();

    await runCommand({ yes: true });

    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining('Sync failed'),
      expect.anything(),
    );
    expect(
      await fs.readFile(
        path.join(tempDir, '.claude/skills/common/alpha/SKILL.md'),
        'utf8',
      ),
    ).toContain('alpha-v2.9.4');
    expect(
      await fs.readFile(
        path.join(tempDir, '.claude/skills/common/beta/SKILL.md'),
        'utf8',
      ),
    ).toContain('beta-v2.9.4');
    expect(
      await fs.readFile(
        path.join(tempDir, '.agents/workflows/custom-flow.md'),
        'utf8',
      ),
    ).toContain('workflow-v1.0.2');
    expect(
      await fs.readFile(
        path.join(tempDir, '.claude/agents/reviewer.md'),
        'utf8',
      ),
    ).toContain('specialist-v1.0.1');

    const lock = await fs.readJson(path.join(tempDir, LOCKFILE_NAME));
    expect(lock.sources['skills/common']).toEqual({
      ref: COMMON_NEW,
      commit: COMMON_NEW_COMMIT,
    });
    expect(lock.sources.workflows).toEqual({
      ref: WORKFLOWS_NEW,
      commit: WORKFLOWS_NEW_COMMIT,
    });
    expect(lock.sources.specialists).toEqual({
      ref: SPECIALISTS_NEW,
      commit: SPECIALISTS_NEW_COMMIT,
    });

    // The accepted refs were resolved and their manifests fetched, so assembly
    // verified the new release with its own manifest.
    expect(transport.manifestTags).toContain(COMMON_NEW);
    expect(transport.manifestTags).toContain(WORKFLOWS_NEW);
    expect(transport.manifestTags).toContain(SPECIALISTS_NEW);
  });

  it('still rejects tampered new-release bytes before anything is published', async () => {
    publishReleases({ tamperNewRelease: true });
    transport.metadata = metadataFor({
      common: '2.9.4',
      workflows: '1.0.2',
      specialists: '1.0.1',
    });
    await writeConfig();

    await runCommand({ yes: true });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Sync failed'),
      expect.anything(),
    );
    // The refreshed release manifest — not the stale one — is what rejected the
    // bytes: assert the new tag was fetched and that the rejection names the
    // digest mismatch for the tampered file, so this cannot pass vacuously.
    expect(transport.manifestTags).toContain(COMMON_NEW);
    const loggedOutput = vi
      .mocked(console.log)
      .mock.calls.map((call) => call.join(' '))
      .join('\n');
    expect(loggedOutput).toContain(
      'sha256 does not match release MANIFEST.json',
    );
    expect(loggedOutput).toContain('skills/common/alpha/SKILL.md');
    expect(await fs.pathExists(path.join(tempDir, '.claude/skills'))).toBe(
      false,
    );
    expect(await fs.pathExists(path.join(tempDir, '.agents/workflows'))).toBe(
      false,
    );
    expect(await fs.pathExists(path.join(tempDir, LOCKFILE_NAME))).toBe(false);
  });

  it('does not re-resolve when the user declines the update', async () => {
    publishReleases();
    transport.metadata = metadataFor({
      common: '2.9.4',
      workflows: '1.0.2',
      specialists: '1.0.1',
    });
    await writeConfig();

    // Non-interactive without --yes declines version updates.
    await runCommand();

    expect(
      await fs.readFile(
        path.join(tempDir, '.claude/skills/common/alpha/SKILL.md'),
        'utf8',
      ),
    ).toContain('alpha-v2.9.0');
    expect(
      await fs.pathExists(
        path.join(tempDir, '.claude/skills/common/beta/SKILL.md'),
      ),
    ).toBe(false);
    expect(transport.manifestTags).toEqual([
      COMMON_OLD,
      WORKFLOWS_OLD,
      SPECIALISTS_OLD,
    ]);
    const lock = await fs.readJson(path.join(tempDir, LOCKFILE_NAME));
    expect(lock.sources['skills/common']).toEqual({
      ref: COMMON_OLD,
      commit: COMMON_OLD_COMMIT,
    });
  });

  it('does not re-resolve when no update is available', async () => {
    publishReleases();
    transport.metadata = metadataFor({
      common: '2.9.0',
      workflows: '1.0.0',
      specialists: '1.0.0',
    });
    await writeConfig();

    await runCommand({ yes: true });

    expect(
      await fs.readFile(
        path.join(tempDir, '.claude/skills/common/alpha/SKILL.md'),
        'utf8',
      ),
    ).toContain('alpha-v2.9.0');
    expect(transport.manifestTags).toEqual([
      COMMON_OLD,
      WORKFLOWS_OLD,
      SPECIALISTS_OLD,
    ]);
  });

  it('does not re-resolve or write state in dry-run mode', async () => {
    publishReleases();
    transport.metadata = metadataFor({
      common: '2.9.4',
      workflows: '1.0.2',
      specialists: '1.0.1',
    });
    await writeConfig();

    await runCommand({ dryRun: true, yes: true });

    // Dry run never accepts versions, so one resolution is the whole cost.
    expect(transport.manifestTags).toEqual([
      COMMON_OLD,
      WORKFLOWS_OLD,
      SPECIALISTS_OLD,
    ]);
    expect(await fs.pathExists(path.join(tempDir, '.claude'))).toBe(false);
    expect(await fs.pathExists(path.join(tempDir, LOCKFILE_NAME))).toBe(false);
    const config = await fs.readJson(path.join(tempDir, '.skillsrc'));
    expect(config.skills.common.ref).toBe(COMMON_OLD);
    expect(config.workflows_ref).toBe(WORKFLOWS_OLD);
    expect(config.specialists_ref).toBe(SPECIALISTS_OLD);
  });
});
