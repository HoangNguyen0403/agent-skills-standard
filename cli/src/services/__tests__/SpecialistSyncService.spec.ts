import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs-extra';
import type { Stats } from 'node:fs';
import path from 'path';
import { SpecialistSyncService } from '../SpecialistSyncService';
import { Agent } from '../../constants';
import type { GithubService } from '../GithubService';
import type { ManifestVerifier } from '../install/ManifestVerifier';

vi.mock('fs-extra');

describe('SpecialistSyncService', () => {
  const service = new SpecialistSyncService();
  const rootDir = '/root';

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

    await service.syncSpecialists(rootDir, [Agent.Claude]);

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
    const count = await service.syncCollectedSpecialists(
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

    const specialists = await remoteService.assembleSpecialists({
      registry: 'https://github.com/owner/repo',
      agents: [Agent.Codex],
      skills: {},
    });

    expect(specialists).toHaveLength(2);
    expect(specialists[0].category).toBe('specialists');

    await remoteService.syncCollectedSpecialists(
      rootDir,
      [Agent.Codex],
      specialists,
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

    await service.syncSpecialists(rootDir, [Agent.Claude, Agent.Codex]);

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

    await service.syncSpecialists(rootDir, [Agent.Cursor]);

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

    await service.syncSpecialists(rootDir, [Agent.Copilot]);

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

    await service.syncSpecialists(rootDir, [Agent.Codex]); // Codex

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

    await service.syncSpecialists(rootDir, [Agent.Codex]);

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

    await service.syncSpecialists(rootDir, [Agent.OpenCode]);

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

    await service.syncSpecialists(rootDir, [Agent.Gemini]);

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

    await service.syncSpecialists(rootDir, [Agent.Kiro]);

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
    await service.syncSpecialists(rootDir, [Agent.Claude]);
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

    await service.syncSpecialists(rootDir, [Agent.Claude]);
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('should not log if zero specialists were synced', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(fs.readdir).mockResolvedValue([] as any);
    const logSpy = vi.spyOn(console, 'log');

    await service.syncSpecialists(rootDir, [Agent.Claude]);
    expect(logSpy).not.toHaveBeenCalled();
  });

  describe('assembleSpecialists github failures (Lines 24-28)', () => {
    it('should fetch tree at the passed ref and not call getRepoInfo', async () => {
      const githubService = {
        getRepoInfo: vi.fn(),
        getRepoTree: vi.fn().mockResolvedValue({ tree: [] }),
      };
      const remoteService = new SpecialistSyncService(
        githubService as unknown as GithubService,
      );
      await remoteService.assembleSpecialists(
        {
          registry: 'https://github.com/owner/repo',
          agents: [],
          skills: {},
        },
        'specialists-v2.0.0',
      );
      expect(githubService.getRepoTree).toHaveBeenCalledWith(
        'owner',
        'repo',
        'specialists-v2.0.0',
      );
      expect(githubService.getRepoInfo).not.toHaveBeenCalled();
    });

    it('should drop rejected specialist files and keep valid ones when verifier rejects a file', async () => {
      const githubService = {
        getRepoInfo: vi.fn(),
        getRepoTree: vi.fn().mockResolvedValue({
          tree: [
            {
              path: 'skills/specialists/specialist-one/SKILL.md',
              type: 'blob',
            },
            {
              path: 'skills/specialists/specialist-bad/SKILL.md',
              type: 'blob',
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
      const result = await remoteService.assembleSpecialists(
        {
          registry: 'https://github.com/owner/repo',
          agents: [],
          skills: {},
        },
        'specialists-v2.0.0',
        fakeVerifier as unknown as ManifestVerifier,
      );
      expect(result).toHaveLength(1);
      expect(result[0].skill).toBe('specialist-one');
    });

    it('should return empty if getRepoTree returns null', async () => {
      const githubService = {
        getRepoInfo: vi.fn().mockResolvedValue({ default_branch: 'develop' }),
        getRepoTree: vi.fn().mockResolvedValue(null),
      } as any;
      const remoteService = new SpecialistSyncService(githubService);
      const result = await remoteService.assembleSpecialists({
        registry: 'https://github.com/owner/repo',
        agents: [],
        skills: {},
      });
      expect(result).toEqual([]);
    });
  });

  describe('assembleSpecialists filtering and content check (Lines 41-49)', () => {
    it('should skip file if specialistName is falsy or getRawFile returns empty', async () => {
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
      const result = await remoteService.assembleSpecialists({
        registry: 'https://github.com/owner/repo',
        agents: [],
        skills: {},
      });
      expect(result).toEqual([]);
    });
  });

  describe('syncCollectedSpecialists edge cases (Lines 70-95)', () => {
    it('should skip unrecognized agent IDs or agents without agentPath', async () => {
      const specialists = [
        {
          category: 'specialists',
          skill: 'specialist-security-reviewer',
          files: [{ name: 'SKILL.md', content: 'content' }],
        },
      ];
      await service.syncCollectedSpecialists(
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
      await service.syncCollectedSpecialists(
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
      await service.syncCollectedSpecialists(
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
      await service.syncCollectedSpecialists(
        rootDir,
        [Agent.Claude],
        specialists,
      );
      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
