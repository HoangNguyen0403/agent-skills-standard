import crypto from 'crypto';
import os from 'os';
import path from 'path';
import { Command } from 'commander';
import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  HarnessCommand,
  registerHarnessCommands,
  sanitizeError,
} from '../harness';
import type {
  HarnessDiscoveryService,
  HarnessInventory,
} from '../../services/harness/HarnessDiscoveryService';

describe('HarnessCommand', () => {
  let tempStateDir: string;
  let exitCode: number | undefined;
  let printedLogs: string[];

  const mockExit = (code: number) => {
    exitCode = code;
  };

  const mockPrint = (msg: string) => {
    printedLogs.push(msg);
  };

  const parseLastJson = <T = unknown>(): T => {
    expect(printedLogs.length).toBeGreaterThan(0);
    return JSON.parse(printedLogs[printedLogs.length - 1]) as T;
  };

  const createProgram = (customCommand?: HarnessCommand) => {
    const program = new Command();
    program.name('ags');
    registerHarnessCommands(program, customCommand, mockExit, mockPrint);
    return program;
  };

  beforeEach(async () => {
    tempStateDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'ags-harness-test-'),
    );
    exitCode = undefined;
    printedLogs = [];
  });

  afterEach(async () => {
    if (tempStateDir && (await fs.pathExists(tempStateDir))) {
      await fs.remove(tempStateDir);
    }
  });

  describe('sanitizeError', () => {
    it('redacts URL credentials, bearer tokens, and password fields', () => {
      const err = new Error(
        'Failed to connect to https://user:secret123@paseo.internal/api with Bearer eyJhbGciOiJIUzI1Ni. Token: secret_token_xyz',
      );
      const sanitized = sanitizeError(err);
      expect(sanitized).not.toContain('secret123');
      expect(sanitized).not.toContain('secret_token_xyz');
      expect(sanitized).toContain('https://[REDACTED]@paseo.internal/api');
      expect(sanitized).toContain('Bearer [REDACTED]');
    });
  });

  describe('Parser and Validation Fail-Closed Handling', () => {
    it('fails closed and creates no config when required --paseo-command is missing', async () => {
      const program = createProgram();

      await expect(
        program.parseAsync([
          'node',
          'ags',
          'harness',
          'setup',
          '--state-dir',
          tempStateDir,
        ]),
      ).rejects.toThrow();

      expect(exitCode).toBe(1);
      const output = parseLastJson<{ error: string }>();
      expect(typeof output.error).toBe('string');
      expect(await fs.pathExists(path.join(tempStateDir, 'config.json'))).toBe(
        false,
      );
      expect(await fs.pathExists(path.join(tempStateDir, 'receipt.json'))).toBe(
        false,
      );
    });

    it('fails closed and creates no config when unknown option is provided', async () => {
      const program = createProgram();

      await expect(
        program.parseAsync([
          'node',
          'ags',
          'harness',
          'setup',
          '--paseo-command',
          '/usr/bin/paseo',
          '--unknown-flag',
          '--state-dir',
          tempStateDir,
        ]),
      ).rejects.toThrow();

      expect(exitCode).toBe(1);
      const output = parseLastJson<{ error: string }>();
      expect(typeof output.error).toBe('string');
      expect(await fs.pathExists(path.join(tempStateDir, 'config.json'))).toBe(
        false,
      );
    });

    it('fails closed and creates no config when option value is missing', async () => {
      const program = createProgram();

      await expect(
        program.parseAsync([
          'node',
          'ags',
          'harness',
          'setup',
          '--state-dir',
          tempStateDir,
          '--paseo-command',
        ]),
      ).rejects.toThrow();

      expect(exitCode).toBe(1);
      const output = parseLastJson<{ error: string }>();
      expect(typeof output.error).toBe('string');
      expect(await fs.pathExists(path.join(tempStateDir, 'config.json'))).toBe(
        false,
      );
    });

    it('fails closed and creates no config when --paseo-command is relative', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'setup',
        '--paseo-command',
        './relative/paseo',
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBe(1);
      const output = parseLastJson<{ error: string }>();
      expect(typeof output.error).toBe('string');
      expect(await fs.pathExists(path.join(tempStateDir, 'config.json'))).toBe(
        false,
      );
    });

    it('fails closed and creates no config when explicit --origin is empty', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'setup',
        '--paseo-command',
        '/usr/bin/paseo',
        '--origin',
        '',
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBe(1);
      const output = parseLastJson<{ error: string }>();
      expect(typeof output.error).toBe('string');
      expect(await fs.pathExists(path.join(tempStateDir, 'config.json'))).toBe(
        false,
      );
    });

    it('fails closed and creates no config when --origin contains credentials', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'setup',
        '--paseo-command',
        '/usr/bin/paseo',
        '--origin',
        'user:secret@remote-host',
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBe(1);
      const output = parseLastJson<{ error: string }>();
      expect(typeof output.error).toBe('string');
      expect(await fs.pathExists(path.join(tempStateDir, 'config.json'))).toBe(
        false,
      );
    });
  });

  describe('Full Real Lifecycle (setup -> status -> uninstall)', () => {
    const fakePaseo = '/usr/bin/paseo';

    it('creates valid config and receipt files with matching hash and exit code 0', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'setup',
        '--paseo-command',
        fakePaseo,
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBeUndefined();

      const configPath = path.join(tempStateDir, 'config.json');
      const receiptPath = path.join(tempStateDir, 'receipt.json');

      expect(await fs.pathExists(configPath)).toBe(true);
      expect(await fs.pathExists(receiptPath)).toBe(true);

      const config = await fs.readJson(configPath);
      expect(config).toEqual({
        schemaVersion: 1,
        paseoCommand: fakePaseo,
      });

      const receipt = await fs.readJson(receiptPath);
      expect(receipt.schemaVersion).toBe(1);
      expect(receipt.owner).toBe('agent-skills-standard/harness');

      const configRaw = await fs.readFile(configPath, 'utf8');
      const expectedHash = crypto
        .createHash('sha256')
        .update(configRaw, 'utf8')
        .digest('hex');
      expect(receipt.configSha256).toBe(expectedHash);

      const output = parseLastJson<{ created: boolean; configPath: string }>();
      expect(output.created).toBe(true);
      expect(output.configPath).toBe(configPath);
    });

    it('succeeds idempotently with created: false when re-run with identical configuration', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'setup',
        '--paseo-command',
        fakePaseo,
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBeUndefined();
      printedLogs = [];

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'setup',
        '--paseo-command',
        fakePaseo,
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBeUndefined();
      const output = parseLastJson<{ created: boolean; configPath: string }>();
      expect(output.created).toBe(false);
    });

    it('returns configured: true and exit code 0 from status when configured', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'setup',
        '--paseo-command',
        fakePaseo,
        '--state-dir',
        tempStateDir,
      ]);

      printedLogs = [];
      exitCode = undefined;

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'status',
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBeUndefined();
      const output = parseLastJson<{ configured: boolean }>();
      expect(output.configured).toBe(true);
    });

    it('uninstalls owned files cleanly, leaving stateDir without config or receipt', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'setup',
        '--paseo-command',
        fakePaseo,
        '--state-dir',
        tempStateDir,
      ]);

      const configPath = path.join(tempStateDir, 'config.json');
      const receiptPath = path.join(tempStateDir, 'receipt.json');

      printedLogs = [];
      exitCode = undefined;

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'uninstall',
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBeUndefined();
      const output = parseLastJson<{ removed: boolean; configPath: string }>();
      expect(output.removed).toBe(true);

      expect(await fs.pathExists(configPath)).toBe(false);
      expect(await fs.pathExists(receiptPath)).toBe(false);
      expect(await fs.pathExists(tempStateDir)).toBe(true);
    });

    it('returns configured: false and exit code 1 when status is run after uninstall', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'setup',
        '--paseo-command',
        fakePaseo,
        '--state-dir',
        tempStateDir,
      ]);

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'uninstall',
        '--state-dir',
        tempStateDir,
      ]);

      printedLogs = [];
      exitCode = undefined;

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'status',
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBe(1);
      const output = parseLastJson<{ configured: boolean }>();
      expect(output.configured).toBe(false);
    });

    it('returns removed: false and exit code 1 when uninstall is run on absent state', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'uninstall',
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBe(1);
      const output = parseLastJson<{ removed: boolean }>();
      expect(output.removed).toBe(false);
    });
  });

  describe('Discovery Command Behavior', () => {
    const fakePaseo = '/usr/bin/paseo';

    it('returns complete: false and exit code 1 when harness is not configured', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'discover',
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBe(1);
      const output = parseLastJson<HarnessInventory & { error: string }>();
      expect(output.complete).toBe(false);
      expect(typeof output.error).toBe('string');
    });

    it('returns complete inventory and exit code 0 when discovery succeeds', async () => {
      const fakeInventory: HarnessInventory = {
        schemaVersion: 1,
        complete: true,
        hosts: [
          {
            hostKey: 'local',
            status: 'reachable',
            projects: [
              {
                projectId: 'p1',
                name: 'agent-skills-standard',
                path: '/path/to/project',
                kind: 'repo',
              },
            ],
          },
        ],
      };

      const fakeDiscoveryService = {
        discover: async () => fakeInventory,
      } as unknown as HarnessDiscoveryService;

      const harnessCommand = new HarnessCommand(
        undefined,
        () => fakeDiscoveryService,
        mockExit,
        mockPrint,
      );

      const program = createProgram(harnessCommand);

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'setup',
        '--paseo-command',
        fakePaseo,
        '--state-dir',
        tempStateDir,
      ]);

      printedLogs = [];
      exitCode = undefined;

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'discover',
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBeUndefined();
      const output = parseLastJson<HarnessInventory>();
      expect(output.complete).toBe(true);
      expect(output.hosts).toHaveLength(1);
      expect(output.hosts[0].status).toBe('reachable');
    });

    it('returns complete: false and exit code 1 when discovery is partial', async () => {
      const fakeInventory: HarnessInventory = {
        schemaVersion: 1,
        complete: false,
        hosts: [
          {
            hostKey: 'remote-2',
            status: 'unreachable',
            projects: [],
            error: 'HOST_UNREACHABLE',
          },
        ],
      };

      const fakeDiscoveryService = {
        discover: async () => fakeInventory,
      } as unknown as HarnessDiscoveryService;

      const harnessCommand = new HarnessCommand(
        undefined,
        () => fakeDiscoveryService,
        mockExit,
        mockPrint,
      );

      const program = createProgram(harnessCommand);

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'setup',
        '--paseo-command',
        fakePaseo,
        '--state-dir',
        tempStateDir,
      ]);

      printedLogs = [];
      exitCode = undefined;

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'discover',
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBe(1);
      const output = parseLastJson<HarnessInventory>();
      expect(output.complete).toBe(false);
      expect(output.hosts[0].status).toBe('unreachable');
    });
  });
});
