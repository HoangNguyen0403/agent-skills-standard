import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LockfileService } from '../../services/LockfileService';
import { AuditCommand } from '../audit';

describe('AuditCommand', () => {
  let lockfileService: LockfileService;
  let command: AuditCommand;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    lockfileService = { load: vi.fn() } as unknown as LockfileService;
    command = new AuditCommand(undefined, lockfileService);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('constructs its own LockfileService when none is injected', () => {
    expect(() => new AuditCommand()).not.toThrow();
  });

  it('reports and sets exitCode 1 when no lockfile exists', async () => {
    vi.mocked(lockfileService.load).mockResolvedValue({
      lock: null,
      migratedFromV1: false,
    });

    await command.run();

    expect(process.exitCode).toBe(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('No .skills-lock.json found'),
    );
  });

  it('prints sources and entries grouped by source with owner, file count, and agents', async () => {
    vi.mocked(lockfileService.load).mockResolvedValue({
      lock: {
        version: 2,
        registry: 'https://github.com/o/r',
        generatedAt: '2026-09-27T00:00:00.000Z',
        sources: {
          'skills/typescript': { ref: 'typescript-v1.3.4', commit: null },
          workflows: { ref: 'default-branch', commit: null },
        },
        entries: {
          '.claude/skills/typescript/core/SKILL.md': {
            owner: 'skill',
            source: 'skill:typescript/core@typescript-v1.3.4',
            agent: 'claude',
            sha256: 'h1',
          },
          '.cursor/skills/typescript/core/SKILL.md': {
            owner: 'skill',
            source: 'skill:typescript/core@typescript-v1.3.4',
            agent: 'cursor',
            sha256: 'h2',
          },
          '.claude/commands/sdlc.md': {
            owner: 'workflow',
            source: 'workflow:sdlc',
            agent: 'claude',
            sha256: 'h3',
          },
        },
      },
      migratedFromV1: false,
    });

    await command.run();

    expect(process.exitCode).toBeUndefined();
    const logged = logSpy.mock.calls.flat().join('\n');
    expect(logged).toContain('skills/typescript: typescript-v1.3.4');
    expect(logged).toContain('workflows: default-branch');
    expect(logged).toContain('skill:typescript/core@typescript-v1.3.4');
    expect(logged).toContain('2 file(s) [claude, cursor]');
    expect(logged).toContain('workflow:sdlc');
    expect(logged).toContain('1 file(s) [claude]');
    expect(logged).toContain('2 item(s) total');
  });

  it('handles an empty (but present) lockfile without erroring', async () => {
    vi.mocked(lockfileService.load).mockResolvedValue({
      lock: {
        version: 2,
        registry: 'https://github.com/o/r',
        generatedAt: '2026-09-27T00:00:00.000Z',
        sources: {},
        entries: {},
      },
      migratedFromV1: false,
    });

    await command.run();

    expect(process.exitCode).toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('no entries recorded'),
    );
  });
});
