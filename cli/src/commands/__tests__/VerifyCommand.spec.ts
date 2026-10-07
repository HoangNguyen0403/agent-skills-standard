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
    syncService = { verifyInstall: vi.fn() } as unknown as SyncService;
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
    expect(syncService.verifyInstall).not.toHaveBeenCalled();
  });

  it('reports warning and sets exitCode 1 when lockfile not found', async () => {
    vi.mocked(configService.loadConfig).mockResolvedValue(makeConfig());
    vi.mocked(syncService.verifyInstall).mockResolvedValue({
      found: false,
      checked: 0,
      result: { ok: false, mismatches: [], missing: [] },
    });

    await command.run();

    expect(process.exitCode).toBe(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('.skills-lock.json not found'),
    );
  });

  it('prints success and leaves exitCode unset when everything matches', async () => {
    vi.mocked(configService.loadConfig).mockResolvedValue(makeConfig());
    vi.mocked(syncService.verifyInstall).mockResolvedValue({
      found: true,
      checked: 2,
      result: { ok: true, mismatches: [], missing: [] },
    });

    await command.run();

    expect(process.exitCode).toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Checked 2 tracked file(s)'),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('All tracked files match the manifest'),
    );
  });

  it('reports mismatches/missing and sets exitCode 1', async () => {
    vi.mocked(configService.loadConfig).mockResolvedValue(makeConfig());
    vi.mocked(syncService.verifyInstall).mockResolvedValue({
      found: true,
      checked: 2,
      result: {
        ok: false,
        mismatches: ['.claude/skills/ts/SKILL.md'],
        missing: ['.claude/skills/common/SKILL.md'],
      },
    });

    await command.run();

    expect(process.exitCode).toBe(1);
    const logged = logSpy.mock.calls.flat().join('\n');
    expect(logged).toContain(
      '~ .claude/skills/ts/SKILL.md (edited or tampered)',
    );
    expect(logged).toContain('- .claude/skills/common/SKILL.md');
  });

  it('reports only missing files when there are no content mismatches', async () => {
    vi.mocked(configService.loadConfig).mockResolvedValue(makeConfig());
    vi.mocked(syncService.verifyInstall).mockResolvedValue({
      found: true,
      checked: 1,
      result: {
        ok: false,
        mismatches: [],
        missing: ['.claude/skills/common/SKILL.md'],
      },
    });

    await command.run();

    const logged = logSpy.mock.calls.flat().join('\n');
    expect(logged).toContain('- .claude/skills/common/SKILL.md');
    expect(logged).not.toContain('(edited or tampered)');
  });

  it('reports only content mismatches when there are no missing files', async () => {
    vi.mocked(configService.loadConfig).mockResolvedValue(makeConfig());
    vi.mocked(syncService.verifyInstall).mockResolvedValue({
      found: true,
      checked: 1,
      result: {
        ok: false,
        mismatches: ['.claude/skills/ts/SKILL.md'],
        missing: [],
      },
    });

    await command.run();

    const logged = logSpy.mock.calls.flat().join('\n');
    expect(logged).toContain(
      '~ .claude/skills/ts/SKILL.md (edited or tampered)',
    );
    expect(logged).not.toContain('  - ');
  });

  it('passes an explicit --agent through to verifyInstall', async () => {
    vi.mocked(configService.loadConfig).mockResolvedValue(makeConfig());
    vi.mocked(syncService.verifyInstall).mockResolvedValue({
      found: true,
      checked: 1,
      result: { ok: true, mismatches: [], missing: [] },
    });

    await command.run({ agent: 'cursor' });

    expect(syncService.verifyInstall).toHaveBeenCalledWith(
      expect.anything(),
      'cursor',
    );
  });

  describe('--strict', () => {
    it('sets exitCode 1 and reports moved ref when commit differs', async () => {
      vi.mocked(configService.loadConfig).mockResolvedValue(makeConfig());
      vi.mocked(syncService.verifyInstall).mockResolvedValue({
        found: true,
        checked: 1,
        result: { ok: true, mismatches: [], missing: [] },
      });
      syncService.checkSourceCommits = vi.fn().mockResolvedValue([
        {
          key: 'workflows',
          ref: 'workflows-v1.0.0',
          locked: '1111111111111111111111111111111111111111',
          current: '2222222222222222222222222222222222222222',
        },
      ]);

      await command.run({ strict: true });

      expect(process.exitCode).toBe(1);
      const logged = logSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(logged).toContain(
        '✗ workflows@workflows-v1.0.0 now resolves to 2222222 (locked 1111111)',
      );
    });

    it('sets exitCode 1 and reports resolution failure when current commit is null', async () => {
      vi.mocked(configService.loadConfig).mockResolvedValue(makeConfig());
      vi.mocked(syncService.verifyInstall).mockResolvedValue({
        found: true,
        checked: 1,
        result: { ok: true, mismatches: [], missing: [] },
      });
      syncService.checkSourceCommits = vi.fn().mockResolvedValue([
        {
          key: 'workflows',
          ref: 'workflows-v1.0.0',
          locked: '1111111111111111111111111111111111111111',
          current: null,
        },
      ]);

      await command.run({ strict: true });

      expect(process.exitCode).toBe(1);
      const logged = logSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(logged).toContain(
        '? workflows@workflows-v1.0.0 could not be resolved',
      );
    });

    it('leaves exitCode unset when strict check passes', async () => {
      vi.mocked(configService.loadConfig).mockResolvedValue(makeConfig());
      vi.mocked(syncService.verifyInstall).mockResolvedValue({
        found: true,
        checked: 1,
        result: { ok: true, mismatches: [], missing: [] },
      });
      syncService.checkSourceCommits = vi.fn().mockResolvedValue([]);

      await command.run({ strict: true });

      expect(process.exitCode).toBeUndefined();
    });
  });

  describe('--attestation', () => {
    it('prints ok line when attestation succeeds', async () => {
      vi.mocked(configService.loadConfig).mockResolvedValue(makeConfig());
      vi.mocked(syncService.verifyInstall).mockResolvedValue({
        found: true,
        checked: 1,
        result: { ok: true, mismatches: [], missing: [] },
      });
      syncService.verifyAttestations = vi.fn().mockResolvedValue([
        {
          key: 'workflows',
          ref: 'workflows-v1.0.0',
          ok: true,
          detail: 'attestation verified',
        },
      ]);

      await command.run({ attestation: true });

      expect(process.exitCode).toBeUndefined();
      const logged = logSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(logged).toContain(
        'workflows@workflows-v1.0.0: attestation verified',
      );
    });

    it('sets exitCode 1 when attestation fails or manifest missing', async () => {
      vi.mocked(configService.loadConfig).mockResolvedValue(makeConfig());
      vi.mocked(syncService.verifyInstall).mockResolvedValue({
        found: true,
        checked: 1,
        result: { ok: true, mismatches: [], missing: [] },
      });
      syncService.verifyAttestations = vi.fn().mockResolvedValue([
        {
          key: 'workflows',
          ref: 'workflows-v1.0.0',
          ok: false,
          detail: 'no MANIFEST.json for this release',
        },
      ]);

      await command.run({ attestation: true });

      expect(process.exitCode).toBe(1);
      const logged = logSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(logged).toContain(
        '✗ workflows@workflows-v1.0.0: no MANIFEST.json for this release',
      );
    });

    it('sets exitCode 1 and prints clear message when gh CLI is missing', async () => {
      vi.mocked(configService.loadConfig).mockResolvedValue(makeConfig());
      vi.mocked(syncService.verifyInstall).mockResolvedValue({
        found: true,
        checked: 1,
        result: { ok: true, mismatches: [], missing: [] },
      });
      syncService.verifyAttestations = vi
        .fn()
        .mockRejectedValue(
          new Error(
            'gh CLI not found; install GitHub CLI to verify attestations',
          ),
        );

      await command.run({ attestation: true });

      expect(process.exitCode).toBe(1);
      const logged = logSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(logged).toContain(
        'gh CLI not found; install GitHub CLI to verify attestations',
      );
    });
  });
});
