import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { SpecialistSyncService } from '../SpecialistSyncService';
import { Agent } from '../../constants';

vi.mock('fs-extra');

describe('SpecialistSyncService', () => {
  const service = new SpecialistSyncService();
  const rootDir = '/root';

  beforeEach(() => {
    vi.clearAllMocks();
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
      expect.stringContaining('globs: ["**/*"]'),
    );
  });

  it('should sync specialists to Copilot agents folder', async () => {
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
      '.github/copilot-agents/specialist-security-reviewer.instructions.md',
    );
    expect(fs.outputFile).toHaveBeenCalledWith(
      targetFile,
      expect.stringContaining('description: "Review security"'),
    );
    expect(fs.outputFile).toHaveBeenCalledWith(
      targetFile,
      expect.stringContaining('applyTo: "**/*"'),
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
});
