import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LockfileService } from '../../services/LockfileService';
import { AuditCommand } from '../audit';

describe('AuditCommand', () => {
  let lockfileService: LockfileService;
  let command: AuditCommand;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    lockfileService = { read: vi.fn() } as unknown as LockfileService;
    command = new AuditCommand(lockfileService);
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
    vi.mocked(lockfileService.read).mockResolvedValue(null);

    await command.run();

    expect(process.exitCode).toBe(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('No .skills-lock.json found'),
    );
  });

  it('prints each skill with its ref and file count', async () => {
    vi.mocked(lockfileService.read).mockResolvedValue({
      version: 1,
      registry: 'https://github.com/o/r',
      generatedAt: '2026-08-22T00:00:00.000Z',
      skills: {
        'typescript/typescript-core': {
          ref: 'typescript-v1.3.4',
          files: { 'SKILL.md': 'a'.repeat(64) },
          contentHash: 'b'.repeat(64),
        },
        'common/common-owasp': {
          ref: 'common-v2.4.0',
          files: {
            'SKILL.md': 'c'.repeat(64),
            'references/REFERENCE.md': 'd'.repeat(64),
          },
          contentHash: 'e'.repeat(64),
        },
      },
    });

    await command.run();

    expect(process.exitCode).toBeUndefined();
    const logged = logSpy.mock.calls.flat().join('\n');
    expect(logged).toContain('typescript/typescript-core');
    expect(logged).toContain('typescript-v1.3.4');
    expect(logged).toContain('1 file');
    expect(logged).toContain('common/common-owasp');
    expect(logged).toContain('2 files');
    expect(logged).toContain('2 skill(s) total');
  });

  it('handles an empty (but present) lockfile without erroring', async () => {
    vi.mocked(lockfileService.read).mockResolvedValue({
      version: 1,
      registry: 'https://github.com/o/r',
      generatedAt: '2026-08-22T00:00:00.000Z',
      skills: {},
    });

    await command.run();

    expect(process.exitCode).toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('no skills recorded'),
    );
  });
});
