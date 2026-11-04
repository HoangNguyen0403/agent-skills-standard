import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs-extra';
import { createHash } from 'node:crypto';
import type { Stats } from 'node:fs';
import path from 'path';
import fetch from 'cross-fetch';
import { SpecialistSyncService } from '../SpecialistSyncService';
import { Agent } from '../../constants';
import { GithubService, IntegrityError } from '../GithubService';
import { ManifestVerifier } from '../install/ManifestVerifier';

vi.mock('fs-extra');
vi.mock('cross-fetch', () => ({ default: vi.fn() }));

const gitBlobSha1 = (content: string): string => {
  const body = Buffer.from(content, 'utf8');
  return createHash('sha1')
    .update(Buffer.from(`blob ${body.byteLength}\0`, 'utf8'))
    .update(body)
    .digest('hex');
};

describe('SpecialistSyncService', () => {
  const service = new SpecialistSyncService();
  const rootDir = '/root';

  const syncLocal = async (agents: Agent[]): Promise<number> =>
    service.writeSpecialists(
      rootDir,
      agents,
      await service.readLocalSpecialists(
        path.join(rootDir, 'skills/specialists'),
      ),
    );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.lstat as (path: string) => Promise<Stats>).mockResolvedValue({
      isSymbolicLink: () => false,
    } as Stats);
  });

  it('should sync specialists to Claude agents folder', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    vi.mocked(fs.pathExists).mockImplementation(
      async (p: any) => p === specialistsDir || p.endsWith('SKILL.md'),
    );
    vi.mocked(fs.readdir).mockResolvedValue([
      'specialist-security-reviewer',
    ] as any);
    vi.mocked(fs.readFile).mockResolvedValue(
      `---
name: specialist-security-reviewer
description: "Review security"
---
# Rules
Check OWASP.` as any,
    );
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

    await syncLocal([Agent.Claude]);

    const targetFile = path.join(
      rootDir,
      '.claude/agents/security-reviewer.md',
    );
    expect(fs.outputFile).toHaveBeenCalledWith(
      targetFile,
      expect.stringContaining('name: security-reviewer'),
    );
    expect(fs.outputFile).toHaveBeenCalledWith(
      targetFile,
      expect.stringContaining('Check OWASP.'),
    );
  });
  it('routes whole-file writes through injected InstallWriter with expected meta and returns count', async () => {
    const specialists = [
      {
        category: 'specialists',
        skill: 'specialist-security-reviewer',
        files: [
          {
            name: 'SKILL.md',
            content:
              '---\nname: specialist-security-reviewer\ndescription: "Review security"\n---\n# Rules\nCheck OWASP.',
          },
        ],
      },
    ];
    const fakeWriter = { write: vi.fn() };
    const count = await service.writeSpecialists(
      rootDir,
      [Agent.Claude],
      specialists,
      fakeWriter as unknown as any,
    );
    expect(count).toBe(1);
    expect(fakeWriter.write).toHaveBeenCalledWith(
      expect.stringContaining('.claude/agents/security-reviewer.md'),
      expect.stringContaining('name: security-reviewer'),
      {
        owner: 'specialist',
        source: 'specialist:specialist-security-reviewer',
        agent: 'claude',
      },
    );
  });

  it('should fetch specialists from registry and sync them without writing skill folders', async () => {
    const githubService = {
      getRepoInfo: vi.fn().mockResolvedValue({ default_branch: 'main' }),
      getRepoTree: vi.fn().mockResolvedValue({
        tree: [
          {
            path: 'skills/specialists/specialist-security-reviewer/SKILL.md',
            type: 'blob',
          },
          {
            path: 'skills/specialists/specialist-tdd-implementer/SKILL.md',
            type: 'blob',
          },
          {
            path: 'skills/common/common-tdd/SKILL.md',
            type: 'blob',
          },
        ],
      }),
      getRawFile: vi
        .fn()
        .mockImplementation(async (_owner, _repo, _ref, filePath) => {
          if (filePath.includes('specialist-security-reviewer')) {
            return `---
name: specialist-security-reviewer
description: "Review security"
---
# Rules
Check OWASP.`;
          }
          return `---
name: specialist-tdd-implementer
description: "Implement TDD"
---
# Rules
Red green refactor.`;
        }),
    } as any;
    const remoteService = new SpecialistSyncService(githubService);

    const acquired = await remoteService.acquireSpecialists(
      {
        registry: 'https://github.com/owner/repo',
        agents: [Agent.Codex],
        skills: {},
      },
      'specialists-v1.0.0',
      undefined,
      'c'.repeat(40),
    );

    expect(acquired.status).toBe('complete');
    expect(acquired.specialists).toHaveLength(2);
    expect(acquired.specialists[0].category).toBe('specialists');
    // Acquisition is bound to the resolved commit when one is supplied.
    expect(githubService.getRepoTree).toHaveBeenCalledWith(
      'owner',
      'repo',
      'specialists-v1.0.0',
      { commit: 'c'.repeat(40) },
    );
    expect(githubService.getRawFile).toHaveBeenCalledWith(
      'owner',
      'repo',
      'specialists-v1.0.0',
      'skills/specialists/specialist-security-reviewer/SKILL.md',
      { commit: 'c'.repeat(40) },
    );

    await remoteService.writeSpecialists(
      rootDir,
      [Agent.Codex],
      acquired.specialists,
    );

    expect(fs.outputFile).toHaveBeenCalledWith(
      path.join(rootDir, '.codex/agents/security-reviewer.toml'),
      expect.stringContaining('Check OWASP.'),
    );
    expect(fs.outputFile).toHaveBeenCalledWith(
      path.join(rootDir, '.codex/agents/tdd-implementer.toml'),
      expect.stringContaining('Red green refactor.'),
    );
    expect(fs.outputFile).not.toHaveBeenCalledWith(
      expect.stringContaining('.codex/skills/specialists'),
      expect.any(String),
    );
  });

  it('should export expanded specialists as native Claude and Codex agents only', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    const specialistNames = [
      'specialist-architecture-guard',
      'specialist-ac-verifier',
      'specialist-test-gap-finder',
    ];
    vi.mocked(fs.pathExists).mockImplementation(async (p: any) => {
      return p === specialistsDir || p.endsWith('SKILL.md');
    });
    vi.mocked(fs.readdir).mockResolvedValue(specialistNames as any);
    vi.mocked(fs.readFile).mockImplementation(async (p: any) => {
      const folder = path.basename(path.dirname(p));
      return `---
name: ${folder}
description: "${folder} description"
---
# Rules
Follow ${folder}.` as any;
    });
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

    await syncLocal([Agent.Claude, Agent.Codex]);

    expect(fs.outputFile).toHaveBeenCalledWith(
      path.join(rootDir, '.claude/agents/architecture-guard.md'),
      expect.stringContaining('name: architecture-guard'),
    );
    expect(fs.outputFile).toHaveBeenCalledWith(
      path.join(rootDir, '.codex/agents/architecture-guard.toml'),
      expect.stringContaining('name = "architecture-guard"'),
    );
    expect(fs.outputFile).not.toHaveBeenCalledWith(
      expect.stringContaining('.codex/skills/specialists'),
      expect.any(String),
    );
  });

  it('should sync specialists to Cursor agents folder', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    vi.mocked(fs.pathExists).mockImplementation(
      async (p: any) => p === specialistsDir || p.endsWith('SKILL.md'),
    );
    vi.mocked(fs.readdir).mockResolvedValue([
      'specialist-security-reviewer',
    ] as any);
    vi.mocked(fs.readFile).mockResolvedValue(
      `---
name: specialist-security-reviewer
description: "Review security"
---
# Rules
Check OWASP.` as any,
    );
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

    await syncLocal([Agent.Cursor]);

    const targetFile = path.join(
      rootDir,
      '.cursor/agents/specialist-security-reviewer.mdc',
    );
    expect(fs.outputFile).toHaveBeenCalledWith(
      targetFile,
      expect.stringContaining('description: Review security'),
    );
    expect(fs.outputFile).toHaveBeenCalledWith(
      targetFile,
      // Emitted via js-yaml (block-style array), not a hand-built template.
      expect.stringContaining("globs:\n  - '**/*'"),
    );
  });

  it('should sync specialists to Copilot native custom agents', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    vi.mocked(fs.pathExists).mockImplementation(
      async (p: any) => p === specialistsDir || p.endsWith('SKILL.md'),
    );
    vi.mocked(fs.readdir).mockResolvedValue([
      'specialist-security-reviewer',
    ] as any);
    vi.mocked(fs.readFile).mockResolvedValue(
      `---
name: specialist-security-reviewer
description: "Review security"
---
# Rules
Check OWASP.` as any,
    );
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

    await syncLocal([Agent.Copilot]);

    const targetFile = path.join(
      rootDir,
      '.github/agents/security-reviewer.agent.md',
    );
    expect(fs.outputFile).toHaveBeenCalledWith(
      targetFile,
      // js-yaml uses the plain (unquoted) scalar style when a value needs
      // no quoting — semantically identical to the old hand-quoted output.
      expect.stringContaining('description: Review security'),
    );

    const written = vi
      .mocked(fs.outputFile)
      .mock.calls.map(([p, c]) => [String(p), String(c)] as const);
    const entry = written.find(([p]) => p === targetFile);
    expect(entry).toBeDefined();
    expect(entry?.[1] ?? '').not.toContain('applyTo');
    expect(fs.outputFile).not.toHaveBeenCalledWith(
      expect.stringContaining('.github/copilot-agents/'),
      expect.any(String),
    );
  });

  it('should sync specialists to Codex agents folder in TOML format', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    vi.mocked(fs.pathExists).mockImplementation(
      async (p: any) => p === specialistsDir || p.endsWith('SKILL.md'),
    );
    vi.mocked(fs.readdir).mockResolvedValue([
      'specialist-security-reviewer',
    ] as any);
    vi.mocked(fs.readFile).mockResolvedValue(
      `---
name: specialist-security-reviewer
description: "Review security"
---
# Rules
Check OWASP.` as any,
    );
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

    await syncLocal([Agent.Codex]); // Codex

    const targetFile = path.join(
      rootDir,
      '.codex/agents/security-reviewer.toml',
    );
    expect(fs.outputFile).toHaveBeenCalledWith(
      targetFile,
      expect.stringContaining('name = "security-reviewer"'),
    );
    expect(fs.outputFile).toHaveBeenCalledWith(
      targetFile,
      expect.stringContaining('developer_instructions = """'),
    );
  });

  it('does not write a Codex sandbox claim that the agent file cannot enforce', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    vi.mocked(fs.pathExists).mockImplementation(
      async (p: string) => p === specialistsDir || p.endsWith('SKILL.md'),
    );
    vi.mocked(
      fs.readdir as unknown as (path: string) => Promise<string[]>,
    ).mockResolvedValue([
      'specialist-tdd-implementer',
      'specialist-security-reviewer',
    ]);
    vi.mocked(fs.readFile).mockImplementation(async (p: unknown) => {
      const pathStr = typeof p === 'string' ? p : String(p);
      if (pathStr.includes('specialist-tdd-implementer')) {
        return `---
name: specialist-tdd-implementer
description: "TDD Implementer"
risk_tier: L2
---
# Rules
Implement tests.`;
      }
      return `---
name: specialist-security-reviewer
description: "Security Reviewer"
---
# Rules
Review security.`;
    });
    vi.mocked(fs.statSync).mockReturnValue({
      isDirectory: () => true,
    } as unknown as Stats);

    await syncLocal([Agent.Codex]);

    const codexAgentsDir = `${path.join(rootDir, '.codex/agents')}${path.sep}`;
    const written = vi
      .mocked(fs.outputFile)
      .mock.calls.map(([p, c]) => [String(p), String(c)] as const)
      .filter(([p]) => p.startsWith(codexAgentsDir));

    expect(written.map(([p]) => path.basename(p)).sort()).toEqual([
      'security-reviewer.toml',
      'tdd-implementer.toml',
    ]);
    for (const [, content] of written) {
      expect(content).not.toContain('sandbox_mode');
      expect(content).not.toContain('danger-full-access');
    }

    // The declared risk tier is disclosed instead of silently dropped.
    const writerEntry = written.find(([p]) =>
      p.endsWith('tdd-implementer.toml'),
    );
    expect(writerEntry?.[1] ?? '').toContain('risk_tier');
  });

  it('should sync specialists to OpenCode agents folder', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    vi.mocked(fs.pathExists).mockImplementation(
      async (p: any) => p === specialistsDir || p.endsWith('SKILL.md'),
    );
    vi.mocked(fs.readdir).mockResolvedValue([
      'specialist-security-reviewer',
    ] as any);
    vi.mocked(fs.readFile).mockResolvedValue(
      `---
name: specialist-security-reviewer
description: "Review security"
---
# Rules
Check OWASP.` as any,
    );
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

    await syncLocal([Agent.OpenCode]);

    const targetFile = path.join(
      rootDir,
      '.opencode/agents/security-reviewer.md',
    );
    expect(fs.outputFile).toHaveBeenCalledWith(
      targetFile,
      expect.stringContaining('mode: subagent'),
    );
  });

  it('should sync specialists to Gemini agents folder', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    vi.mocked(fs.pathExists).mockImplementation(
      async (p: any) => p === specialistsDir || p.endsWith('SKILL.md'),
    );
    vi.mocked(fs.readdir).mockResolvedValue([
      'specialist-security-reviewer',
    ] as any);
    vi.mocked(fs.readFile).mockResolvedValue(
      `---
name: specialist-security-reviewer
description: "Review security"
---
# Rules
Check OWASP.` as any,
    );
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

    await syncLocal([Agent.Gemini]);

    const targetFile = path.join(
      rootDir,
      '.gemini/agents/security-reviewer.md',
    );
    expect(fs.outputFile).toHaveBeenCalledWith(
      targetFile,
      expect.stringContaining('kind: local'),
    );
  });

  it('should sync specialists to Kiro agents folder', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    vi.mocked(fs.pathExists).mockImplementation(
      async (p: any) => p === specialistsDir || p.endsWith('SKILL.md'),
    );
    vi.mocked(fs.readdir).mockResolvedValue([
      'specialist-security-reviewer',
    ] as any);
    vi.mocked(fs.readFile).mockResolvedValue(
      `---
name: specialist-security-reviewer
description: "Review security"
---
# Rules
Check OWASP.` as any,
    );
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

    await syncLocal([Agent.Kiro]);

    const targetFile = path.join(rootDir, '.kiro/agents/security-reviewer.md');
    expect(fs.outputFile).toHaveBeenCalledWith(
      targetFile,
      expect.stringContaining('name: security-reviewer'),
    );
  });

  it('should NOT sync to agents without sub-agent support', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    vi.mocked(fs.pathExists).mockImplementation(
      async (p: any) => p === specialistsDir || p.endsWith('SKILL.md'),
    );
    vi.mocked(fs.readdir).mockResolvedValue([
      'specialist-security-reviewer',
    ] as any);
    vi.mocked(fs.readFile).mockResolvedValue(
      `---
name: specialist-security-reviewer
description: "Review security"
---
# Rules` as any,
    );
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

    expect(fs.outputFile).not.toHaveBeenCalled();
  });

  it('should return early if specialists directory does not exist', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    await syncLocal([Agent.Claude]);
    expect(fs.readdir).not.toHaveBeenCalled();
  });

  it('should skip folders without SKILL.md', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    vi.mocked(fs.pathExists).mockImplementation(async (p: any) => {
      if (p === specialistsDir) return true;
      if (p.endsWith('SKILL.md')) return false; // Missing SKILL.md
      return false;
    });
    vi.mocked(fs.readdir).mockResolvedValue(['some-folder'] as any);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

    await syncLocal([Agent.Claude]);
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('should not log if zero specialists were synced', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(fs.readdir).mockResolvedValue([] as any);
    const logSpy = vi.spyOn(console, 'log');

    await syncLocal([Agent.Claude]);
    expect(logSpy).not.toHaveBeenCalled();
  });

  describe('acquireSpecialists failures', () => {
    it('should fetch tree at the passed ref without options when no commit is resolved', async () => {
      const githubService = {
        getRepoInfo: vi.fn(),
        getRepoTree: vi.fn().mockResolvedValue({ tree: [] }),
      };
      const remoteService = new SpecialistSyncService(
        githubService as unknown as GithubService,
      );
      const acquired = await remoteService.acquireSpecialists(
        {
          registry: 'https://github.com/owner/repo',
          agents: [],
          skills: {},
        },
        'specialists-v2.0.0',
      );
      expect(acquired.status).toBe('complete');
      expect(acquired.specialists).toEqual([]);
      expect(githubService.getRepoTree).toHaveBeenCalledWith(
        'owner',
        'repo',
        'specialists-v2.0.0',
        undefined,
      );
      expect(githubService.getRepoInfo).not.toHaveBeenCalled();
    });

    it('rejects the selection when a verifier rejects a specialist file', async () => {
      const githubService = {
        getRepoTree: vi.fn().mockResolvedValue({
          tree: [
            {
              path: 'skills/specialists/specialist-one/SKILL.md',
              type: 'blob',
              sha: 'a'.repeat(40),
            },
            {
              path: 'skills/specialists/specialist-bad/SKILL.md',
              type: 'blob',
              sha: 'b'.repeat(40),
            },
          ],
        }),
        getRawFile: vi
          .fn()
          .mockImplementation((_o, _r, _ref, filePath: string) => {
            if (filePath.includes('specialist-one')) return 'good content';
            return 'bad content';
          }),
      };
      const fakeVerifier = {
        check: vi.fn().mockImplementation((filePath: string) => {
          if (filePath.includes('specialist-bad')) {
            return 'sha256 does not match release MANIFEST.json';
          }
          return null;
        }),
      };
      const remoteService = new SpecialistSyncService(
        githubService as unknown as GithubService,
      );

      const failure = await remoteService
        .acquireSpecialists(
          {
            registry: 'https://github.com/owner/repo',
            agents: [],
            skills: {},
          },
          'specialists-v2.0.0',
          fakeVerifier as unknown as ManifestVerifier,
        )
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(IntegrityError);
      expect((failure as Error).message).toContain(
        'skills/specialists/specialist-bad/SKILL.md',
      );
    });

    it('should report an unavailable tree as incomplete', async () => {
      const githubService = {
        getRepoInfo: vi.fn().mockResolvedValue({ default_branch: 'develop' }),
        getRepoTree: vi.fn().mockResolvedValue(null),
      } as any;
      const remoteService = new SpecialistSyncService(githubService);
      const acquired = await remoteService.acquireSpecialists({
        registry: 'https://github.com/owner/repo',
        agents: [],
        skills: {},
      });
      expect(acquired.status).toBe('incomplete');
      expect(acquired.specialists).toEqual([]);
      expect(acquired.failures).toHaveLength(1);
    });
    it('rejects a manifest describing a different resolved commit even with identical bytes', async () => {
      const githubService = {
        getRepoTree: vi.fn().mockResolvedValue({
          tree: [
            {
              path: 'skills/specialists/reviewer/SKILL.md',
              type: 'blob',
              sha: gitBlobSha1('reviewer body'),
            },
          ],
        }),
      };
      const remoteService = new SpecialistSyncService(
        githubService as unknown as GithubService,
      );
      const verifier = new ManifestVerifier({
        schema_version: 1,
        tag: 'specialists-v1.0.0',
        commit: 'a'.repeat(40),
        files: {
          'skills/specialists/reviewer/SKILL.md': 'b'.repeat(64),
        },
      });

      await expect(
        remoteService.acquireSpecialists(
          { registry: 'https://github.com/owner/repo', agents: [], skills: {} },
          'specialists-v1.0.0',
          verifier,
          'c'.repeat(40),
        ),
      ).rejects.toBeInstanceOf(IntegrityError);
      expect(githubService.getRepoTree).not.toHaveBeenCalled();
    });

    it('rejects a specialist whose bytes fail explicit manifest verification', async () => {
      const githubService = {
        getRepoTree: vi.fn().mockResolvedValue({
          tree: [
            {
              path: 'skills/specialists/reviewer/SKILL.md',
              type: 'blob',
              sha: gitBlobSha1('honest body'),
            },
          ],
        }),
        getRawFile: vi.fn().mockResolvedValue('tampered body'),
      };
      const remoteService = new SpecialistSyncService(
        githubService as unknown as GithubService,
      );
      const verifier = new ManifestVerifier({
        schema_version: 1,
        tag: 'specialists-v1.0.0',
        commit: 'c'.repeat(40),
        files: {
          'skills/specialists/reviewer/SKILL.md': 'b'.repeat(64),
        },
      });

      const failure = await remoteService
        .acquireSpecialists(
          { registry: 'https://github.com/owner/repo', agents: [], skills: {} },
          'specialists-v1.0.0',
          verifier,
          'c'.repeat(40),
        )
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(IntegrityError);
      expect((failure as Error).message).toContain(
        'skills/specialists/reviewer/SKILL.md',
      );
      expect((failure as Error).message).toContain(
        'sha256 does not match release MANIFEST.json',
      );
    });

    it('binds raw specialist downloads to the tree blob sha', async () => {
      const githubService = {
        getRepoTree: vi.fn().mockResolvedValue({
          tree: [
            {
              path: 'skills/specialists/reviewer/SKILL.md',
              type: 'blob',
              sha: 'd'.repeat(40),
            },
          ],
        }),
        getRawFile: vi.fn().mockResolvedValue('reviewer body'),
      };
      const remoteService = new SpecialistSyncService(
        githubService as unknown as GithubService,
      );

      await remoteService.acquireSpecialists(
        { registry: 'https://github.com/owner/repo', agents: [], skills: {} },
        'specialists-v1.0.0',
        undefined,
        'c'.repeat(40),
      );

      expect(githubService.getRawFile).toHaveBeenCalledWith(
        'owner',
        'repo',
        'specialists-v1.0.0',
        'skills/specialists/reviewer/SKILL.md',
        { expectedSha: 'd'.repeat(40), commit: 'c'.repeat(40) },
      );
    });

    it('rejects tampered raw bytes through the real HTTP boundary even without a manifest', async () => {
      const honest = 'honest specialist body';
      const tampered = 'tampered specialist body';
      const treeSha = gitBlobSha1(honest);
      vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/git/trees/')) {
          return {
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => ({
              sha: 'e'.repeat(40),
              url: 'fixture://tree',
              truncated: false,
              tree: [
                {
                  path: 'skills/specialists/reviewer/SKILL.md',
                  type: 'blob',
                  sha: treeSha,
                  url: 'fixture://blob',
                },
              ],
            }),
          } as unknown as Response;
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          arrayBuffer: async () => Buffer.from(tampered, 'utf8'),
        } as unknown as Response;
      });
      const remoteService = new SpecialistSyncService(new GithubService());

      await expect(
        remoteService.acquireSpecialists(
          { registry: 'https://github.com/owner/repo', agents: [], skills: {} },
          'specialists-v1.0.0',
          undefined,
          'e'.repeat(40),
        ),
      ).rejects.toBeInstanceOf(IntegrityError);
      vi.mocked(fetch).mockReset();
    });
  });

  describe('acquireSpecialists filtering and content check', () => {
    it('should fail closed on an empty specialist name or missing content', async () => {
      const githubService = {
        getRepoInfo: vi.fn().mockResolvedValue({ default_branch: 'main' }),
        getRepoTree: vi.fn().mockResolvedValue({
          tree: [
            { path: 'skills/specialists//SKILL.md', type: 'blob' },
            {
              path: 'skills/specialists/specialist-empty/SKILL.md',
              type: 'blob',
            },
          ],
        }),
        getRawFile: vi.fn().mockResolvedValue(null),
      } as any;
      const remoteService = new SpecialistSyncService(githubService);
      const acquired = await remoteService.acquireSpecialists({
        registry: 'https://github.com/owner/repo',
        agents: [],
        skills: {},
      });
      expect(acquired.specialists).toEqual([]);
      expect(acquired.status).toBe('incomplete');
      expect(acquired.failures.map((failure) => failure.path)).toEqual([
        'skills/specialists//SKILL.md',
        'skills/specialists/specialist-empty/SKILL.md',
      ]);
    });
  });

  describe('writeSpecialists edge cases', () => {
    it('should skip unrecognized agent IDs or agents without agentPath', async () => {
      const specialists = [
        {
          category: 'specialists',
          skill: 'specialist-security-reviewer',
          files: [{ name: 'SKILL.md', content: 'content' }],
        },
      ];
      await service.writeSpecialists(
        rootDir,
        ['non-existent-agent' as any],
        specialists,
      );
      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    it('should skip specialists without SKILL.md', async () => {
      const specialists = [
        {
          category: 'specialists',
          skill: 'specialist-security-reviewer',
          files: [{ name: 'other.md', content: 'content' }],
        },
      ];
      await service.writeSpecialists(
        rootDir,
        [Agent.Claude],
        specialists,
      );
      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    it('should skip if SpecialistTransformer returns null', async () => {
      const specialists = [
        {
          category: 'specialists',
          skill: 'invalid-name',
          files: [{ name: 'SKILL.md', content: 'content' }],
        },
      ];
      await service.writeSpecialists(
        rootDir,
        [Agent.Claude],
        specialists,
      );
      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    it('should not log if syncedCount is 0', async () => {
      const logSpy = vi.spyOn(console, 'log');
      const specialists = [
        {
          category: 'specialists',
          skill: 'invalid-name',
          files: [{ name: 'SKILL.md', content: 'content' }],
        },
      ];
      await service.writeSpecialists(
        rootDir,
        [Agent.Claude],
        specialists,
      );
      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
