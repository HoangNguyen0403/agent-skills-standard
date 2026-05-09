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
    vi.mocked(fs.pathExists).mockImplementation(async (p: any) => p === specialistsDir || p.endsWith('SKILL.md'));
    vi.mocked(fs.readdir).mockResolvedValue(['specialist-security-reviewer'] as any);
    vi.mocked(fs.readFile).mockResolvedValue(`---
name: specialist-security-reviewer
description: "Review security"
---
# Rules
Check OWASP.` as any);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

    await service.syncSpecialists(rootDir, [Agent.Claude]);

    const targetFile = path.join(rootDir, '.claude/agents/security-reviewer.md');
    expect(fs.outputFile).toHaveBeenCalledWith(targetFile, expect.stringContaining('name: security-reviewer'));
    expect(fs.outputFile).toHaveBeenCalledWith(targetFile, expect.stringContaining('Check OWASP.'));
  });

  it('should sync specialists to Cursor agents folder', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    vi.mocked(fs.pathExists).mockImplementation(async (p: any) => p === specialistsDir || p.endsWith('SKILL.md'));
    vi.mocked(fs.readdir).mockResolvedValue(['specialist-security-reviewer'] as any);
    vi.mocked(fs.readFile).mockResolvedValue(`---
name: specialist-security-reviewer
description: "Review security"
---
# Rules
Check OWASP.` as any);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

    await service.syncSpecialists(rootDir, [Agent.Cursor]);

    const targetFile = path.join(rootDir, '.cursor/agents/specialist-security-reviewer.mdc');
    expect(fs.outputFile).toHaveBeenCalledWith(targetFile, expect.stringContaining('description: Review security'));
    expect(fs.outputFile).toHaveBeenCalledWith(targetFile, expect.stringContaining('globs: ["**/*"]'));
  });

  it('should sync specialists to Copilot agents folder', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    vi.mocked(fs.pathExists).mockImplementation(async (p: any) => p === specialistsDir || p.endsWith('SKILL.md'));
    vi.mocked(fs.readdir).mockResolvedValue(['specialist-security-reviewer'] as any);
    vi.mocked(fs.readFile).mockResolvedValue(`---
name: specialist-security-reviewer
description: "Review security"
---
# Rules
Check OWASP.` as any);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

    await service.syncSpecialists(rootDir, [Agent.Copilot]);

    const targetFile = path.join(rootDir, '.github/copilot-agents/specialist-security-reviewer.instructions.md');
    expect(fs.outputFile).toHaveBeenCalledWith(targetFile, expect.stringContaining('description: "Review security"'));
    expect(fs.outputFile).toHaveBeenCalledWith(targetFile, expect.stringContaining('applyTo: "**/*"'));
  });

  it('should sync specialists to Codex agents folder in TOML format', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    vi.mocked(fs.pathExists).mockImplementation(async (p: any) => p === specialistsDir || p.endsWith('SKILL.md'));
    vi.mocked(fs.readdir).mockResolvedValue(['specialist-security-reviewer'] as any);
    vi.mocked(fs.readFile).mockResolvedValue(`---
name: specialist-security-reviewer
description: "Review security"
---
# Rules
Check OWASP.` as any);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

    await service.syncSpecialists(rootDir, [Agent.OpenAI]); // Codex

    const targetFile = path.join(rootDir, '.codex/agents/security-reviewer.toml');
    expect(fs.outputFile).toHaveBeenCalledWith(targetFile, expect.stringContaining('name = "security-reviewer"'));
    expect(fs.outputFile).toHaveBeenCalledWith(targetFile, expect.stringContaining('developer_instructions = """'));
  });

  it('should sync specialists to OpenCode agents folder', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    vi.mocked(fs.pathExists).mockImplementation(async (p: any) => p === specialistsDir || p.endsWith('SKILL.md'));
    vi.mocked(fs.readdir).mockResolvedValue(['specialist-security-reviewer'] as any);
    vi.mocked(fs.readFile).mockResolvedValue(`---
name: specialist-security-reviewer
description: "Review security"
---
# Rules
Check OWASP.` as any);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

    await service.syncSpecialists(rootDir, [Agent.OpenCode]);

    const targetFile = path.join(rootDir, '.opencode/agents/security-reviewer.md');
    expect(fs.outputFile).toHaveBeenCalledWith(targetFile, expect.stringContaining('mode: subagent'));
  });

  it('should sync specialists to Gemini agents folder', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    vi.mocked(fs.pathExists).mockImplementation(async (p: any) => p === specialistsDir || p.endsWith('SKILL.md'));
    vi.mocked(fs.readdir).mockResolvedValue(['specialist-security-reviewer'] as any);
    vi.mocked(fs.readFile).mockResolvedValue(`---
name: specialist-security-reviewer
description: "Review security"
---
# Rules
Check OWASP.` as any);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

    await service.syncSpecialists(rootDir, [Agent.Gemini]);

    const targetFile = path.join(rootDir, '.gemini/agents/security-reviewer.md');
    expect(fs.outputFile).toHaveBeenCalledWith(targetFile, expect.stringContaining('kind: local'));
  });

  it('should sync specialists to Kiro agents folder', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    vi.mocked(fs.pathExists).mockImplementation(async (p: any) => p === specialistsDir || p.endsWith('SKILL.md'));
    vi.mocked(fs.readdir).mockResolvedValue(['specialist-security-reviewer'] as any);
    vi.mocked(fs.readFile).mockResolvedValue(`---
name: specialist-security-reviewer
description: "Review security"
---
# Rules
Check OWASP.` as any);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

    await service.syncSpecialists(rootDir, [Agent.Kiro]);

    const targetFile = path.join(rootDir, '.kiro/agents/security-reviewer.md');
    expect(fs.outputFile).toHaveBeenCalledWith(targetFile, expect.stringContaining('name: security-reviewer'));
  });

  it('should NOT sync to agents without sub-agent support', async () => {
    const specialistsDir = path.join(rootDir, 'skills/specialists');
    vi.mocked(fs.pathExists).mockImplementation(async (p: any) => p === specialistsDir || p.endsWith('SKILL.md'));
    vi.mocked(fs.readdir).mockResolvedValue(['specialist-security-reviewer'] as any);
    vi.mocked(fs.readFile).mockResolvedValue(`---
name: specialist-security-reviewer
description: "Review security"
---
# Rules` as any);
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
