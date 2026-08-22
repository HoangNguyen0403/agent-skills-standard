import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../constants';
import { SkillConfig } from '../../models/config';
import { ConfigService } from '../../services/ConfigService';
import { SyncService } from '../../services/SyncService';
import { VerifyCommand } from '../verify';

function makeConfig(): SkillConfig {
  return {
    registry: 'https://github.com/o/r',
    agents: [Agent.Claude],
    skills: {},
  };
}

describe('VerifyCommand', () => {
  let configService: ConfigService;
  let syncService: SyncService;
  let command: VerifyCommand;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    configService = { loadConfig: vi.fn() } as unknown as ConfigService;
    syncService = { verifyLockfile: vi.fn() } as unknown as SyncService;
    command = new VerifyCommand(configService, syncService);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('errors and sets exitCode when .skillsrc is missing', async () => {
    vi.mocked(configService.loadConfig).mockResolvedValue(null);

    await command.run();

    expect(process.exitCode).toBe(1);
    expect(syncService.verifyLockfile).not.toHaveBeenCalled();
  });

  it('prints success and leaves exitCode unset when everything matches', async () => {
    vi.mocked(configService.loadConfig).mockResolvedValue(makeConfig());
    vi.mocked(syncService.verifyLockfile).mockResolvedValue({
      agent: Agent.Claude,
      result: { ok: true, mismatches: [], missing: [] },
    });

    await command.run();

    expect(process.exitCode).toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('All installed skill files match'),
    );
  });

  it('reports mismatches/missing and sets exitCode 1', async () => {
    vi.mocked(configService.loadConfig).mockResolvedValue(makeConfig());
    vi.mocked(syncService.verifyLockfile).mockResolvedValue({
      agent: Agent.Claude,
      result: {
        ok: false,
        mismatches: ['typescript/typescript-core/SKILL.md'],
        missing: ['common/common-api-design/SKILL.md'],
      },
    });

    await command.run();

    expect(process.exitCode).toBe(1);
    const logged = logSpy.mock.calls.flat().join('\n');
    expect(logged).toContain('typescript/typescript-core/SKILL.md');
    expect(logged).toContain('common/common-api-design/SKILL.md');
  });

  it('passes an explicit --agent through to verifyLockfile', async () => {
    vi.mocked(configService.loadConfig).mockResolvedValue(makeConfig());
    vi.mocked(syncService.verifyLockfile).mockResolvedValue({
      agent: Agent.Cursor,
      result: { ok: true, mismatches: [], missing: [] },
    });

    await command.run({ agent: 'cursor' });

    expect(syncService.verifyLockfile).toHaveBeenCalledWith(
      expect.anything(),
      'cursor',
    );
  });
});
