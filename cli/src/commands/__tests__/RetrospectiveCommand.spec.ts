import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import {
  MCP_COMPATIBLE_VERSION,
  RETROSPECTIVE_MIN_MCP_VERSION,
} from '../../constants/mcp';
import {
  defaultSpawn,
  isVersionAtLeast,
  RetrospectiveCommand,
  SpawnFn,
} from '../retrospective';

describe('RetrospectiveCommand', () => {
  let logs: string[];
  let originalExitCode: typeof process.exitCode;
  let mockSpawn: Mock<SpawnFn>;

  beforeEach(() => {
    vi.clearAllMocks();
    logs = [];
    originalExitCode = process.exitCode;
    process.exitCode = undefined;

    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    });

    mockSpawn = vi.fn<SpawnFn>().mockResolvedValue({ code: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = originalExitCode;
  });

  describe('isVersionAtLeast', () => {
    it('correctly compares semver triples numerically', () => {
      expect(isVersionAtLeast('0.8.0', '0.8.0')).toBe(true);
      expect(isVersionAtLeast('0.8.1', '0.8.0')).toBe(true);
      expect(isVersionAtLeast('0.9.0', '0.8.0')).toBe(true);
      expect(isVersionAtLeast('1.0.0', '0.8.0')).toBe(true);
      expect(isVersionAtLeast('0.6.1', '0.8.0')).toBe(false);
      expect(isVersionAtLeast('0.7.99', '0.8.0')).toBe(false);
      expect(isVersionAtLeast('invalid', '0.8.0')).toBe(false);
    });
  });

  describe('version guard', () => {
    it('ships a pinned MCP version that satisfies the retrospective minimum', () => {
      expect(
        isVersionAtLeast(MCP_COMPATIBLE_VERSION, RETROSPECTIVE_MIN_MCP_VERSION),
      ).toBe(true);
    });

    it('refuses without spawning when pinned < min and no override', async () => {
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: {},
        mcpVersion: '0.6.1',
      });

      await command.run('status');

      expect(mockSpawn).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
      expect(logs.join('\n')).toBe(
        `Session retrospectives need agent-skills-standard-mcp ${RETROSPECTIVE_MIN_MCP_VERSION} or newer, but this ags is pinned to 0.6.1. Upgrade ags (ags upgrade), or set AGS_MCP_PACKAGE_SPEC to a newer package for testing.`,
      );
    });

    it('spawns the shipped MCP pin by default', async () => {
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: {},
      });

      await command.run('status');

      expect(mockSpawn).toHaveBeenCalledTimes(1);
      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        [
          '-y',
          '--prefer-offline',
          `agent-skills-standard-mcp@${MCP_COMPATIBLE_VERSION}`,
          'retrospective',
          'consent-status',
        ],
        { stdio: 'inherit' },
      );
      expect(process.exitCode).toBe(0);
    });

    it('override env skips the guard', async () => {
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: { AGS_MCP_PACKAGE_SPEC: 'agent-skills-standard-mcp@0.8.0' },
      });

      await command.run('status');

      expect(mockSpawn).toHaveBeenCalledTimes(1);
      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        [
          '-y',
          '--prefer-offline',
          'agent-skills-standard-mcp@0.8.0',
          'retrospective',
          'consent-status',
        ],
        { stdio: 'inherit' },
      );
      expect(logs.join('\n')).not.toContain('Session retrospectives need');
    });
  });

  describe('action mapping', () => {
    it('maps status to consent-status', async () => {
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      await command.run('status');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        [
          '-y',
          '--prefer-offline',
          'pkg@test',
          'retrospective',
          'consent-status',
        ],
        { stdio: 'inherit' },
      );
    });

    it('forwards enable, disable, and index as-is', async () => {
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      await command.run('enable');
      expect(mockSpawn).toHaveBeenLastCalledWith(
        'npx',
        ['-y', '--prefer-offline', 'pkg@test', 'retrospective', 'enable'],
        { stdio: 'inherit' },
      );

      await command.run('disable');
      expect(mockSpawn).toHaveBeenLastCalledWith(
        'npx',
        ['-y', '--prefer-offline', 'pkg@test', 'retrospective', 'disable'],
        { stdio: 'inherit' },
      );

      await command.run('index');
      expect(mockSpawn).toHaveBeenLastCalledWith(
        'npx',
        ['-y', '--prefer-offline', 'pkg@test', 'retrospective', 'index'],
        { stdio: 'inherit' },
      );
    });
  });

  describe('forwarded argv', () => {
    it('forwards argv exactly for enable with repeatable source-root', async () => {
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@x' },
      });

      await command.run('enable', {
        storeRoot: '/a',
        sourceRoot: ['/b', '/c'],
      });

      expect(mockSpawn).toHaveBeenCalledTimes(1);
      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        [
          '-y',
          '--prefer-offline',
          'pkg@x',
          'retrospective',
          'enable',
          '--store-root',
          '/a',
          '--source-root',
          '/b',
          '--source-root',
          '/c',
        ],
        { stdio: 'inherit' },
      );
    });

    it('forwards argv for index options', async () => {
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@x' },
      });

      await command.run('index', {
        since: '2026-01-01',
        until: '2026-02-01',
        folder: 'my-folder',
      });

      expect(mockSpawn).toHaveBeenCalledTimes(1);
      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        [
          '-y',
          '--prefer-offline',
          'pkg@x',
          'retrospective',
          'index',
          '--since',
          '2026-01-01',
          '--until',
          '2026-02-01',
          '--folder',
          'my-folder',
        ],
        { stdio: 'inherit' },
      );
    });
  });

  describe('unknown action', () => {
    it('exits 2 without spawn when action is unknown and echoes safe action', async () => {
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      await command.run('unknown-act');

      expect(mockSpawn).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(2);
      expect(logs.join('\n')).toBe(
        'Unknown action "unknown-act". Use: enable | disable | status | index',
      );
    });

    it('exits 2 without spawn and does not echo action when action fails character pattern', async () => {
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      await command.run('bad;action$with#special');

      expect(mockSpawn).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(2);
      expect(logs.join('\n')).toBe(
        'Unknown action. Use: enable | disable | status | index',
      );
    });
  });

  describe('unknown option', () => {
    it('refuses unknown option on enable with exit 2 without spawn', async () => {
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      await command.run('enable', { since: '2026-01-01' });

      expect(mockSpawn).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(2);
      expect(logs.join('\n')).toContain(
        'Unexpected option or argument for action "enable"',
      );
    });

    it('refuses options on disable with exit 2 without spawn', async () => {
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      await command.run('disable', { storeRoot: '/a' });

      expect(mockSpawn).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(2);
      expect(logs.join('\n')).toContain(
        'Unexpected option or argument for action "disable"',
      );
    });

    it('refuses options on status with exit 2 without spawn', async () => {
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      await command.run('status', { folder: 'xyz' });

      expect(mockSpawn).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(2);
      expect(logs.join('\n')).toContain(
        'Unexpected option or argument for action "status"',
      );
    });

    it('refuses extra positional arguments with exit 2 without spawn', async () => {
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      await command.run('enable', {}, ['--unexpected-token']);

      expect(mockSpawn).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(2);
      expect(logs.join('\n')).toContain(
        'Unexpected option or argument for action "enable"',
      );
    });
  });

  describe('Windows validation and shell security', () => {
    it('rejects a & b style values on win32 without spawning', async () => {
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'win32',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      await command.run('enable', { storeRoot: 'a & b' });

      expect(mockSpawn).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(2);
      expect(logs.join('\n')).toContain(
        'Invalid argument for Windows execution',
      );
      expect(logs.join('\n')).toContain('a & b');
    });

    it('the spawn function never receives a value with a shell metacharacter on win32', async () => {
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'win32',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      const metacharacters = [
        'foo;bar',
        'foo|bar',
        'foo>bar',
        'foo<bar',
        'foo^bar',
        'foo"bar',
        "foo'bar",
        'foo%bar',
        'foo`bar',
      ];

      for (const dangerousValue of metacharacters) {
        process.exitCode = undefined;
        await command.run('enable', { storeRoot: dangerousValue });

        expect(mockSpawn).not.toHaveBeenCalled();
        expect(process.exitCode).toBe(2);
      }
    });

    it('uses npx.cmd with shell: true on win32 when arguments are valid', async () => {
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'win32',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      await command.run('enable', {
        storeRoot: 'C:\\valid\\store_root-1',
        sourceRoot: ['C:\\valid\\source_root-2'],
      });

      expect(mockSpawn).toHaveBeenCalledTimes(1);
      expect(mockSpawn).toHaveBeenCalledWith(
        'npx.cmd',
        [
          '-y',
          '--prefer-offline',
          'pkg@test',
          'retrospective',
          'enable',
          '--store-root',
          'C:\\valid\\store_root-1',
          '--source-root',
          'C:\\valid\\source_root-2',
        ],
        { stdio: 'inherit', shell: true },
      );
    });

    it('never uses shell on non-Windows platforms', async () => {
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'darwin',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      await command.run('status');

      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        [
          '-y',
          '--prefer-offline',
          'pkg@test',
          'retrospective',
          'consent-status',
        ],
        { stdio: 'inherit' },
      );
    });
  });

  describe('exit code propagation and error handling', () => {
    it('propagates exit code from child process when successful (code 0)', async () => {
      mockSpawn.mockResolvedValue({ code: 0 });
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      await command.run('status');

      expect(process.exitCode).toBe(0);
    });

    it('propagates exit code from child process when child exits nonzero', async () => {
      mockSpawn.mockResolvedValue({ code: 42 });
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      await command.run('status');

      expect(process.exitCode).toBe(42);
    });

    it('exits with 1 when child process code is null', async () => {
      mockSpawn.mockResolvedValue({ code: null });
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      await command.run('status');

      expect(process.exitCode).toBe(1);
    });

    it('prints Could not run npx: <error.code> and exits 1 when child cannot be started', async () => {
      mockSpawn.mockRejectedValue({ code: 'ENOENT' });
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      await command.run('status');

      expect(process.exitCode).toBe(1);
      expect(logs.join('\n')).toBe('Could not run npx: ENOENT');
    });

    it('handles generic Error when child cannot be started', async () => {
      mockSpawn.mockRejectedValue(new Error('spawn failed'));
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      await command.run('status');

      expect(process.exitCode).toBe(1);
      expect(logs.join('\n')).toBe('Could not run npx: spawn failed');
    });

    it('stringifies a non-Error rejection when child cannot be started', async () => {
      mockSpawn.mockRejectedValue('plain failure');
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      await command.run('status');

      expect(process.exitCode).toBe(1);
      expect(logs.join('\n')).toBe('Could not run npx: plain failure');
    });
  });

  describe('exit handler injection', () => {
    it('invokes the injected exit handler for refusals and unknown actions', async () => {
      const exitCodes: number[] = [];
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: {},
        mcpVersion: '0.6.1',
        exit: (code) => exitCodes.push(code),
      });

      await command.run('status');
      expect(exitCodes).toEqual([1]);

      await command.run('not-an-action');
      expect(exitCodes).toEqual([1, 2]);
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('uses process defaults when optional dependencies are omitted', async () => {
      const command = new RetrospectiveCommand();

      await command.run('not an action');

      expect(process.exitCode).toBe(2);
      expect(logs.join('\n')).toBe(
        'Unknown action. Use: enable | disable | status | index',
      );
    });
  });

  describe('option filtering', () => {
    it('skips undefined and empty option values without forwarding them', async () => {
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      await command.run('enable', { storeRoot: undefined, sourceRoot: [] });
      expect(mockSpawn).toHaveBeenLastCalledWith(
        'npx',
        ['-y', '--prefer-offline', 'pkg@test', 'retrospective', 'enable'],
        { stdio: 'inherit' },
      );

      await command.run('enable', { storeRoot: '', sourceRoot: '' });
      expect(mockSpawn).toHaveBeenLastCalledWith(
        'npx',
        ['-y', '--prefer-offline', 'pkg@test', 'retrospective', 'enable'],
        { stdio: 'inherit' },
      );

      await command.run('index', { since: '', until: '', folder: '' });
      expect(mockSpawn).toHaveBeenLastCalledWith(
        'npx',
        ['-y', '--prefer-offline', 'pkg@test', 'retrospective', 'index'],
        { stdio: 'inherit' },
      );
    });

    it('forwards a single scalar sourceRoot', async () => {
      const command = new RetrospectiveCommand({
        spawnFn: mockSpawn,
        platform: 'linux',
        env: { AGS_MCP_PACKAGE_SPEC: 'pkg@test' },
      });

      await command.run('enable', { sourceRoot: '/only-root' });

      expect(mockSpawn).toHaveBeenLastCalledWith(
        'npx',
        [
          '-y',
          '--prefer-offline',
          'pkg@test',
          'retrospective',
          'enable',
          '--source-root',
          '/only-root',
        ],
        { stdio: 'inherit' },
      );
    });
  });

  describe('defaultSpawn', () => {
    it('resolves the child process exit code', async () => {
      await expect(
        defaultSpawn(process.execPath, ['-e', 'process.exit(0)'], {
          stdio: 'inherit',
        }),
      ).resolves.toEqual({ code: 0 });
    });

    it('rejects with the spawn error when the binary does not exist', async () => {
      await expect(
        defaultSpawn('ags-definitely-missing-binary', [], {
          stdio: 'inherit',
        }),
      ).rejects.toMatchObject({ code: 'ENOENT' });
    });
  });
});
