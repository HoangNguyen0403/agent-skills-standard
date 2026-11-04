import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import inquirer from 'inquirer';
import * as yaml from 'js-yaml';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../constants';
import { GitHubTreeItem } from '../../models/types';
import { ConfigService } from '../../services/ConfigService';
import { DetectionService } from '../../services/DetectionService';
import {
  GithubRequestError,
  GithubService,
  ReleaseManifest,
} from '../../services/GithubService';
import { LOCKFILE_NAME, sha256 } from '../../services/LockfileService';
import { SyncService } from '../../services/SyncService';
import { SyncCommand, SyncOutcome } from '../sync';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

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
  rateLimitFailure: GithubRequestError | null = null;
  /** Test seam: runs after a tree is served, e.g. to simulate a concurrent edit. */
  onGetRepoTree?: () => void | Promise<void>;
  private readonly faults = new Map<string, GithubRequestError>();

  failOn(method: string, error: GithubRequestError): void {
    this.faults.set(method, error);
    if (error.kind === 'rate-limited') this.rateLimitFailure = error;
  }

  clearFaults(): void {
    this.faults.clear();
    this.rateLimitFailure = null;
  }

  private maybeFail(method: string): void {
    const fault = this.faults.get(method);
    if (fault) throw fault;
  }

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
    this.maybeFail('getRepoTree');
    const files = this.filesAt(ref);
    if (!files) return null;
    if (this.onGetRepoTree) await this.onGetRepoTree();
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
    this.maybeFail('resolveCommit');
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
    this.maybeFail('getReleaseManifest');
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
    options: {
      yes?: boolean;
      dryRun?: boolean;
      json?: boolean;
      acceptAttributionChanges?: boolean;
    } = {},
  ): Promise<SyncOutcome> => {
    const command = new SyncCommand(
      new ConfigService(),
      new DetectionService(),
      new SyncService(transport as unknown as GithubService),
    );
    return command.run(options);
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

  describe('preflight, consent, and command outcome contract', () => {
    const ALPHA = skillMarkdown('alpha', 'alpha-v2.9.0');
    const LICENSE_V1 = 'MIT License\n\nversion one\n';
    const LICENSE_V2 = 'MIT License\n\nversion two\n';
    const PACKAGE_LICENSE_PATH = 'skills/common/alpha/LICENSE';

    const publishOutcomeReleases = (): void => {
      transport.publish(COMMON_OLD, COMMON_OLD_COMMIT, {
        'skills/common/alpha/SKILL.md': ALPHA,
        [PACKAGE_LICENSE_PATH]: LICENSE_V1,
      });
      transport.publish(WORKFLOWS_OLD, WORKFLOWS_OLD_COMMIT, {
        'README.md': '# no workflows here\n',
      });
      transport.publish(SPECIALISTS_OLD, SPECIALISTS_OLD_COMMIT, {
        'README.md': '# no specialists here\n',
      });
      transport.publishManifest(COMMON_OLD, COMMON_OLD_COMMIT);
      transport.publishManifest(WORKFLOWS_OLD, WORKFLOWS_OLD_COMMIT);
      transport.publishManifest(SPECIALISTS_OLD, SPECIALISTS_OLD_COMMIT);
    };

    const writeOutcomeConfig = async (
      skillsRef: string = COMMON_OLD,
    ): Promise<void> => {
      await fs.outputFile(
        path.join(tempDir, '.skillsrc'),
        JSON.stringify(
          {
            registry: 'https://github.com/example/repo',
            agents: [Agent.Claude],
            skills: { common: { ref: skillsRef } },
            workflows: false,
            workflows_ref: WORKFLOWS_OLD,
            specialists_ref: SPECIALISTS_OLD,
            custom_overrides: [],
            mcp: { enabled: false, scope: 'disabled', prompted: true },
          },
          null,
          2,
        ),
      );
    };

    const typedError = (
      kind: 'rate-limited' | 'access-denied',
    ): GithubRequestError =>
      new GithubRequestError({
        kind,
        message: `GitHub request failed (${kind})`,
        endpoint: 'https://api.github.com/repos/example/repo/commits/main',
        authenticated: false,
        status: kind === 'rate-limited' ? 429 : 403,
        ...(kind === 'rate-limited'
          ? { rateLimitKind: 'primary' as const, resetAt: '2030-01-01T00:00:00.000Z' }
          : {}),
      });

    /** Narrows a JSON object without trusting an inline shape assertion. */
    const asRecord = (value: unknown): Record<string, unknown> | null =>
      value && typeof value === 'object' && !Array.isArray(value)
        ? // Object values come from JSON.parse of the command's own output.
          (value as Record<string, unknown>)
        : null;

    const parseEnvelope = (
      stdout: string,
    ): {
      schema_version: unknown;
      kind: unknown;
      code: unknown;
      githubKind: unknown;
    } => {
      const envelope = asRecord(JSON.parse(stdout));
      if (!envelope) throw new Error('stdout is not a JSON object');
      const data = asRecord(envelope.data) ?? {};
      const github = asRecord(data.github);
      return {
        schema_version: envelope.schema_version,
        kind: envelope.kind,
        code: data.code,
        githubKind: github?.kind,
      };
    };

    const captureStdout = async <T>(
      fn: () => Promise<T>,
    ): Promise<{ result: T; stdout: string }> => {
      const chunks: string[] = [];
      const spy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation((chunk: string | Uint8Array) => {
          chunks.push(String(chunk));
          return true;
        });
      try {
        const result = await fn();
        return { result, stdout: chunks.join('') };
      } finally {
        spy.mockRestore();
      }
    };

    const readProject = async (relativePath: string): Promise<Buffer | null> =>
      (await fs.pathExists(path.join(tempDir, relativePath)))
        ? fs.readFile(path.join(tempDir, relativePath))
        : null;

    const snapshotState = async () => ({
      config: await readProject('.skillsrc'),
      lock: await readProject(LOCKFILE_NAME),
      license: await readProject('.claude/skills/common/alpha/LICENSE'),
      skill: await readProject('.claude/skills/common/alpha/SKILL.md'),
    });

    it('fails with one sync.error envelope on a primary rate limit and preserves installed state', async () => {
      publishOutcomeReleases();
      await writeOutcomeConfig();
      expect((await runCommand()).status).toBe('success');
      const before = await snapshotState();

      transport.failOn('resolveCommit', typedError('rate-limited'));
      const { result, stdout } = await captureStdout(() =>
        runCommand({ json: true, yes: true }),
      );

      expect(result.status).toBe('failure');
      expect(stdout.trim().split('\n')).toHaveLength(1);
      const envelope = parseEnvelope(stdout);
      expect(envelope.schema_version).toBe(1);
      expect(envelope.kind).toBe('sync.error');
      expect(envelope.code).toBe('rate-limited');
      expect(envelope.githubKind).toBe('rate-limited');
      expect(await snapshotState()).toEqual(before);
    });

    it('reports ordinary access denial as access-denied, not throttling', async () => {
      publishOutcomeReleases();
      await writeOutcomeConfig();
      expect((await runCommand()).status).toBe('success');
      const before = await snapshotState();

      transport.failOn('resolveCommit', typedError('access-denied'));
      const { result, stdout } = await captureStdout(() =>
        runCommand({ json: true, yes: true }),
      );

      expect(result.status).toBe('failure');
      expect(parseEnvelope(stdout).code).toBe('access-denied');
      expect(await snapshotState()).toEqual(before);
    });

    it('requires separate attribution consent for changed bytes and publishes only when supplied', async () => {
      publishOutcomeReleases();
      await writeOutcomeConfig();
      expect((await runCommand()).status).toBe('success');
      expect(await readProject('.claude/skills/common/alpha/LICENSE')).toEqual(
        Buffer.from(LICENSE_V1),
      );

      // Same tag and commit, changed LICENSE bytes, honest manifest.
      transport.publish(COMMON_OLD, COMMON_OLD_COMMIT, {
        'skills/common/alpha/SKILL.md': ALPHA,
        [PACKAGE_LICENSE_PATH]: LICENSE_V2,
      });
      transport.publishManifest(COMMON_OLD, COMMON_OLD_COMMIT);
      const before = await snapshotState();

      const denied = await captureStdout(() =>
        runCommand({ json: true, yes: true }),
      );
      expect(denied.result.status).toBe('failure');
      const deniedEnvelope = parseEnvelope(denied.stdout);
      expect(deniedEnvelope.kind).toBe('sync.error');
      expect(deniedEnvelope.code).toBe('attribution-consent-required');
      expect(await snapshotState()).toEqual(before);

      const accepted = await captureStdout(() =>
        runCommand({
          json: true,
          yes: true,
          acceptAttributionChanges: true,
        }),
      );
      expect(accepted.result.status).toBe('success');
      expect(parseEnvelope(accepted.stdout).kind).toBe('sync.result');
      expect(await readProject('.claude/skills/common/alpha/LICENSE')).toEqual(
        Buffer.from(LICENSE_V2),
      );
      const lock = await fs.readJson(path.join(tempDir, LOCKFILE_NAME));
      const record = lock.attributionCatalog.packages['common/alpha'];
      expect(record.files[0].sha256).toBe(sha256(LICENSE_V2));
    });

    it('requires consent for a stripped legacy catalog even when bytes are identical', async () => {
      publishOutcomeReleases();
      await writeOutcomeConfig();
      expect((await runCommand()).status).toBe('success');

      const lockPath = path.join(tempDir, LOCKFILE_NAME);
      const lock = await fs.readJson(lockPath);
      expect(lock.attributionCatalog?.version).toBe(1);
      delete lock.attributionCatalog;
      await fs.writeJson(lockPath, lock, { spaces: 2 });
      const before = await snapshotState();

      const denied = await captureStdout(() =>
        runCommand({ json: true, yes: true }),
      );
      expect(denied.result.status).toBe('failure');
      expect(parseEnvelope(denied.stdout).code).toBe(
        'attribution-consent-required',
      );
      expect(await snapshotState()).toEqual(before);

      const accepted = await runCommand({
        yes: true,
        acceptAttributionChanges: true,
      });
      expect(accepted.status).toBe('success');
      const rewritten = await fs.readJson(lockPath);
      expect(rewritten.attributionCatalog?.version).toBe(1);
      expect(rewritten.attributionCatalog.packages['common/alpha']).toBeDefined();
    });

    it('cancels without publishing when the interactive attribution prompt is declined', async () => {
      publishOutcomeReleases();
      await writeOutcomeConfig();
      expect((await runCommand()).status).toBe('success');

      transport.publish(COMMON_OLD, COMMON_OLD_COMMIT, {
        'skills/common/alpha/SKILL.md': ALPHA,
        [PACKAGE_LICENSE_PATH]: LICENSE_V2,
      });
      transport.publishManifest(COMMON_OLD, COMMON_OLD_COMMIT);
      const before = await snapshotState();

      process.stdin.isTTY = true;
      vi.mocked(inquirer.prompt).mockResolvedValue({ accept: false });

      const outcome = await runCommand({ yes: true });

      expect(outcome.status).toBe('cancelled');
      expect(await snapshotState()).toEqual(before);
    });

    it('persists accepted workflow/specialist pins without dropping root extensions', async () => {
      publishOutcomeReleases();
      await fs.outputFile(
        path.join(tempDir, '.skillsrc'),
        JSON.stringify(
          {
            registry: 'https://github.com/example/repo',
            agents: [Agent.Claude],
            skills: { common: { ref: COMMON_OLD } },
            workflows: false,
            custom_overrides: [],
            x_root_extension: { keep: true },
            mcp: {
              enabled: false,
              scope: 'disabled',
              prompted: true,
              vendor_field: 'keep-mcp',
            },
          },
          null,
          2,
        ),
      );
      // No configured workflow/specialist refs: the resolver pins the
      // advertised releases in memory, and those pins must reach the file.
      transport.metadata = metadataFor({
        common: '2.9.0',
        workflows: '1.0.0',
        specialists: '1.0.0',
      });

      const outcome = await runCommand();
      expect(outcome.status).toBe('success');

      const persisted: unknown = yaml.load(
        await fs.readFile(path.join(tempDir, '.skillsrc'), 'utf8'),
      );
      const root = asRecord(persisted);
      expect(root?.workflows_ref).toBe(WORKFLOWS_OLD);
      expect(root?.specialists_ref).toBe(SPECIALISTS_OLD);
      expect(root?.x_root_extension).toEqual({ keep: true });
      expect(asRecord(root?.mcp)?.vendor_field).toBe('keep-mcp');
    });

    it('persists MCP consent over the immutable baseline and keeps MCP extensions', async () => {
      publishOutcomeReleases();
      await fs.outputFile(
        path.join(tempDir, '.skillsrc'),
        JSON.stringify(
          {
            registry: 'https://github.com/example/repo',
            agents: [Agent.Claude],
            skills: { common: { ref: COMMON_OLD } },
            workflows: false,
            workflows_ref: WORKFLOWS_OLD,
            specialists_ref: SPECIALISTS_OLD,
            custom_overrides: [],
            x_root_extension: { keep: true },
            mcp: {
              enabled: false,
              scope: 'disabled',
              prompted: false,
              vendor_field: 'keep-mcp',
            },
          },
          null,
          2,
        ),
      );

      const outcome = await runCommand({ yes: true });
      expect(outcome.status).toBe('success');

      const persisted: unknown = yaml.load(
        await fs.readFile(path.join(tempDir, '.skillsrc'), 'utf8'),
      );
      const root = asRecord(persisted);
      const mcp = asRecord(root?.mcp);
      expect(mcp?.enabled).toBe(true);
      expect(mcp?.scope).toBe('project');
      expect(mcp?.prompted).toBe(true);
      expect(mcp?.vendor_field).toBe('keep-mcp');
      expect(root?.x_root_extension).toEqual({ keep: true });
    });

    it('refuses a no-lock legacy removal of an installed attribution file before publishing', async () => {
      publishOutcomeReleases();
      await writeOutcomeConfig();
      expect((await runCommand()).status).toBe('success');
      await fs.remove(path.join(tempDir, LOCKFILE_NAME));
      const before = await snapshotState();
      expect(before.license).toEqual(Buffer.from(LICENSE_V1));

      // The selected source no longer ships LICENSE at all.
      transport.publish(COMMON_OLD, 'ab'.repeat(20), {
        'skills/common/alpha/SKILL.md': ALPHA,
      });
      transport.publishManifest(COMMON_OLD, 'ab'.repeat(20));

      const denied = await captureStdout(() =>
        runCommand({ json: true, yes: true }),
      );
      expect(denied.result.status).toBe('failure');
      const envelope = asRecord(JSON.parse(denied.stdout));
      const data = asRecord(envelope?.data) ?? {};
      expect(data.code).toBe('attribution-consent-required');
      const details = asRecord(data.details) ?? {};
      const variants = Array.isArray(details.installedOnly)
        ? details.installedOnly
        : [];
      const licenseVariant = asRecord(
        variants.find(
          (variant) =>
            asRecord(variant)?.name === 'LICENSE' &&
            String(asRecord(variant)?.path).endsWith(
              '.claude/skills/common/alpha/LICENSE',
            ),
        ),
      );
      expect(licenseVariant?.sha256).toBe(sha256(LICENSE_V1));
      expect(licenseVariant?.packageId).toBe('common/alpha');
      expect(await snapshotState()).toEqual(before);
      expect(await fs.pathExists(path.join(tempDir, LOCKFILE_NAME))).toBe(
        false,
      );
    });

    it('refuses a no-lock legacy rename and keeps both installed copies explicit', async () => {
      publishOutcomeReleases();
      await writeOutcomeConfig();
      expect((await runCommand()).status).toBe('success');
      await fs.remove(path.join(tempDir, LOCKFILE_NAME));
      const before = await snapshotState();

      // The selected source renames LICENSE to LICENSE.md with identical bytes.
      transport.publish(COMMON_OLD, 'cd'.repeat(20), {
        'skills/common/alpha/SKILL.md': ALPHA,
        'skills/common/alpha/LICENSE.md': LICENSE_V1,
      });
      transport.publishManifest(COMMON_OLD, 'cd'.repeat(20));

      const denied = await captureStdout(() =>
        runCommand({ json: true, yes: true }),
      );
      expect(denied.result.status).toBe('failure');
      const envelope = asRecord(JSON.parse(denied.stdout));
      const data = asRecord(envelope?.data) ?? {};
      expect(data.code).toBe('attribution-consent-required');
      const details = asRecord(data.details) ?? {};
      const variants = Array.isArray(details.installedOnly)
        ? details.installedOnly
        : [];
      expect(
        variants.some(
          (variant) => asRecord(variant)?.name === 'LICENSE',
        ),
      ).toBe(true);
      const packages = Array.isArray(details.packages)
        ? details.packages
        : [];
      expect(
        packages.some((item) => asRecord(item)?.packageId === 'common/alpha'),
      ).toBe(true);
      expect(await snapshotState()).toEqual(before);
    });

    it('does not report a preserved override as a removal and keeps its provenance', async () => {
      publishOutcomeReleases();
      await writeOutcomeConfig();
      expect((await runCommand()).status).toBe('success');
      const lockBefore = await fs.readJson(
        path.join(tempDir, LOCKFILE_NAME),
      );
      expect(
        lockBefore.attributionCatalog.packages['common/alpha'].files[0].name,
      ).toBe('LICENSE');
      const licenseBefore = await readProject(
        '.claude/skills/common/alpha/LICENSE',
      );

      // The user now overrides the installed attribution destination.
      const configPath = path.join(tempDir, '.skillsrc');
      const config = asRecord(
        JSON.parse(await fs.readFile(configPath, 'utf8')),
      );
      await fs.outputFile(
        configPath,
        JSON.stringify(
          {
            ...config,
            custom_overrides: ['.claude/skills/common/alpha/LICENSE'],
          },
          null,
          2,
        ),
      );
      vi.mocked(console.error).mockClear();

      const outcome = await runCommand({ json: true, yes: true });

      expect(outcome.status).toBe('success');
      const stderrText = vi
        .mocked(console.error)
        .mock.calls.flat()
        .join('\n');
      expect(stderrText).not.toContain('Attribution changes require consent');
      expect(
        await readProject('.claude/skills/common/alpha/LICENSE'),
      ).toEqual(licenseBefore);
      const lockAfter = await fs.readJson(path.join(tempDir, LOCKFILE_NAME));
      const record = lockAfter.attributionCatalog.packages['common/alpha'];
      expect(record.files[0].name).toBe('LICENSE');
      expect(record.files[0].sha256).toBe(sha256(LICENSE_V1));
      expect(record.files[0].destinations[0].path).toBe(
        '.claude/skills/common/alpha/LICENSE',
      );
    });

    it('previews both origins and the installed digest for an unqualified legacy file', async () => {
      publishOutcomeReleases();
      await writeOutcomeConfig();
      expect((await runCommand()).status).toBe('success');

      // The installed copy no longer matches its recorded digest, so the
      // previous origin can no longer be qualified; the actual bytes remain
      // evidence and must be shown.
      const editedLicense = `${LICENSE_V1}locally edited\n`;
      await fs.outputFile(
        path.join(tempDir, '.claude/skills/common/alpha/LICENSE'),
        editedLicense,
      );
      vi.mocked(console.error).mockClear();

      const denied = await captureStdout(() =>
        runCommand({ json: true, yes: true }),
      );
      expect(denied.result.status).toBe('failure');

      const stderrText = vi
        .mocked(console.error)
        .mock.calls.flat()
        .join('\n');
      expect(stderrText).toContain('old: unknown origin');
      expect(stderrText).toContain('unchanged LICENSE');
      expect(stderrText).toContain('installed: claude:');
      expect(stderrText).toContain('sha256=');

      const envelope = asRecord(JSON.parse(denied.stdout));
      const data = asRecord(envelope?.data) ?? {};
      const details = asRecord(data.details) ?? {};
      const packages = Array.isArray(details.packages)
        ? details.packages
        : [];
      const alpha = asRecord(
        packages.find(
          (item) => asRecord(item)?.packageId === 'common/alpha',
        ),
      );
      const files = Array.isArray(alpha?.files) ? alpha.files : [];
      const license = asRecord(
        files.find((file) => asRecord(file)?.name === 'LICENSE'),
      );
      expect(license?.previous).toBeNull();
      expect(license?.previousSha256).toBe(sha256(LICENSE_V1));
      expect(asRecord(license?.planned)?.resolvedCommit).toBe(COMMON_OLD_COMMIT);
      const installed = Array.isArray(license?.installed)
        ? license.installed
        : [];
      expect(asRecord(installed[0])?.sha256).toBe(sha256(editedLicense));
    });

    it('keeps .skillsrc bytes identical when a run changes no configuration', async () => {
      publishOutcomeReleases();
      await writeOutcomeConfig();
      const configBefore = await readProject('.skillsrc');
      expect((await runCommand()).status).toBe('success');
      expect(await readProject('.skillsrc')).toEqual(configBefore);
    });

    it('preserves unrelated root, category and MCP extension fields on an accepted update', async () => {
      publishOutcomeReleases();
      await fs.outputFile(
        path.join(tempDir, '.skillsrc'),
        JSON.stringify(
          {
            registry: 'https://github.com/example/repo',
            agents: [Agent.Claude],
            skills: {
              common: { ref: COMMON_OLD, custom_category_field: 'keep-me' },
            },
            x_root_extension: { keep: true },
            workflows: false,
            workflows_ref: WORKFLOWS_OLD,
            specialists_ref: SPECIALISTS_OLD,
            custom_overrides: [],
            mcp: {
              enabled: false,
              scope: 'disabled',
              prompted: true,
              vendor_field: 'keep-mcp',
            },
          },
          null,
          2,
        ),
      );
      expect((await runCommand()).status).toBe('success');

      transport.publish(COMMON_NEW, COMMON_NEW_COMMIT, {
        'skills/common/alpha/SKILL.md': skillMarkdown(
          'alpha',
          'alpha-v2.9.4',
        ),
        [PACKAGE_LICENSE_PATH]: LICENSE_V1,
      });
      transport.publishManifest(COMMON_NEW, COMMON_NEW_COMMIT);
      transport.metadata = metadataFor({
        common: '2.9.4',
        workflows: '1.0.0',
        specialists: '1.0.0',
      });

      const outcome = await runCommand({
        yes: true,
        acceptAttributionChanges: true,
      });
      expect(outcome.status).toBe('success');

      const persisted = await fs.readFile(
        path.join(tempDir, '.skillsrc'),
        'utf8',
      );
      const parsed: unknown = yaml.load(persisted);
      const root = asRecord(parsed);
      expect(root?.x_root_extension).toEqual({ keep: true });
      expect(asRecord(root?.mcp)?.vendor_field).toBe('keep-mcp');
      const skills = asRecord(root?.skills);
      expect(asRecord(skills?.common)?.custom_category_field).toBe('keep-me');
      expect(asRecord(skills?.common)?.ref).toBe(COMMON_NEW);
    });

    it('refuses an origin-only attribution transition under ordinary --yes and preserves state', async () => {
      publishOutcomeReleases();
      await writeOutcomeConfig();
      expect((await runCommand()).status).toBe('success');
      const licenseBefore = await readProject(
        '.claude/skills/common/alpha/LICENSE',
      );
      expect(licenseBefore).toEqual(Buffer.from(LICENSE_V1));

      // Same LICENSE bytes, new ref and commit: origin-only change.
      transport.publish(COMMON_NEW, COMMON_NEW_COMMIT, {
        'skills/common/alpha/SKILL.md': skillMarkdown(
          'alpha',
          'alpha-v2.9.4',
        ),
        [PACKAGE_LICENSE_PATH]: LICENSE_V1,
      });
      transport.publishManifest(COMMON_NEW, COMMON_NEW_COMMIT);
      transport.metadata = metadataFor({
        common: '2.9.4',
        workflows: '1.0.0',
        specialists: '1.0.0',
      });
      const before = await snapshotState();

      const denied = await captureStdout(() =>
        runCommand({ json: true, yes: true }),
      );
      expect(denied.result.status).toBe('failure');
      expect(parseEnvelope(denied.stdout).code).toBe(
        'attribution-consent-required',
      );
      expect(await snapshotState()).toEqual(before);

      const accepted = await runCommand({
        yes: true,
        acceptAttributionChanges: true,
      });
      expect(accepted.status).toBe('success');
      expect(
        await readProject('.claude/skills/common/alpha/LICENSE'),
      ).toEqual(Buffer.from(LICENSE_V1));
      const lock = await fs.readJson(path.join(tempDir, LOCKFILE_NAME));
      expect(lock.sources['skills/common']).toEqual({
        ref: COMMON_NEW,
        commit: COMMON_NEW_COMMIT,
      });
      expect(
        lock.attributionCatalog.packages['common/alpha'].requestedRef,
      ).toBe(COMMON_NEW);
      expect(
        lock.attributionCatalog.packages['common/alpha'].resolvedCommit,
      ).toBe(COMMON_NEW_COMMIT);
    });

    it('refuses publication when .skillsrc changes during preflight, before any managed write', async () => {
      publishOutcomeReleases();
      await writeOutcomeConfig();
      const configPath = path.join(tempDir, '.skillsrc');

      transport.onGetRepoTree = async () => {
        const current: unknown = JSON.parse(await fs.readFile(configPath, 'utf8'));
        const record = asRecord(current) ?? {};
        await fs.outputFile(
          configPath,
          JSON.stringify({ ...record, edited_during_sync: true }, null, 2),
        );
      };

      const preflightRun = await captureStdout(() => runCommand({ json: true }));
      expect(preflightRun.result.status).toBe('failure');
      expect(parseEnvelope(preflightRun.stdout).code).toBe('config-invalid');

      const editedRaw = await fs.readFile(configPath, 'utf8');
      const edited: unknown = JSON.parse(editedRaw);
      expect(asRecord(edited)?.edited_during_sync).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, '.claude'))).toBe(false);
      expect(await fs.pathExists(path.join(tempDir, LOCKFILE_NAME))).toBe(
        false,
      );
    });
  });
});
