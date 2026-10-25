import crypto from 'crypto';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HarnessConfig,
  HarnessError,
  HarnessSetupService,
  validateHarnessOrigin,
} from '../HarnessSetupService';

describe('validateHarnessOrigin', () => {
  it('accepts valid host aliases and localhost with ports', () => {
    expect(() => validateHarnessOrigin('laptop')).not.toThrow();
    expect(() => validateHarnessOrigin('server-1')).not.toThrow();
    expect(() => validateHarnessOrigin('mac-mini.local')).not.toThrow();
    expect(() => validateHarnessOrigin('192.168.1.100')).not.toThrow();
    expect(() => validateHarnessOrigin('10.0.0.1:8080')).not.toThrow();
    expect(() => validateHarnessOrigin('localhost:3000')).not.toThrow();
    expect(() => validateHarnessOrigin('cluster_node_2')).not.toThrow();
  });

  it('accepts valid HTTP, HTTPS, WS, and WSS URLs without credentials', () => {
    expect(() => validateHarnessOrigin('http://127.0.0.1:8080')).not.toThrow();
    expect(() =>
      validateHarnessOrigin('https://remote.paseo.dev'),
    ).not.toThrow();
    expect(() => validateHarnessOrigin('ws://127.0.0.1:9000')).not.toThrow();
    expect(() =>
      validateHarnessOrigin('wss://paseo.example.com/ws'),
    ).not.toThrow();
  });

  it('rejects empty, non-string, or whitespace origins with sanitized code', () => {
    expect(() => validateHarnessOrigin('')).toThrowError(/INVALID_ORIGIN/);
    expect(() => validateHarnessOrigin('   ')).toThrowError(/INVALID_ORIGIN/);
    expect(() => validateHarnessOrigin('server name')).toThrowError(
      /INVALID_ORIGIN/,
    );
  });

  it('rejects option-like origins to prevent CLI flag injection', () => {
    expect(() => validateHarnessOrigin('--host')).toThrowError(
      /INVALID_ORIGIN.*hyphen/,
    );
    expect(() => validateHarnessOrigin('-H')).toThrowError(
      /INVALID_ORIGIN.*hyphen/,
    );
    expect(() => validateHarnessOrigin('--port=8080')).toThrowError(
      /INVALID_ORIGIN.*hyphen/,
    );
  });

  it('rejects control characters, NUL, and shell metacharacters', () => {
    expect(() => validateHarnessOrigin('server\0')).toThrowError(
      /INVALID_ORIGIN/,
    );
    expect(() => validateHarnessOrigin('server\n')).toThrowError(
      /INVALID_ORIGIN/,
    );
    expect(() => validateHarnessOrigin('server; rm -rf /')).toThrowError(
      /INVALID_ORIGIN/,
    );
    expect(() => validateHarnessOrigin('server && ls')).toThrowError(
      /INVALID_ORIGIN/,
    );
    expect(() => validateHarnessOrigin('server`id`')).toThrowError(
      /INVALID_ORIGIN/,
    );
    expect(() => validateHarnessOrigin('server$FOO')).toThrowError(
      /INVALID_ORIGIN/,
    );
  });

  it('rejects origins with credentials', () => {
    expect(() =>
      validateHarnessOrigin('http://user:pass@127.0.0.1:8080'),
    ).toThrowError(/INVALID_ORIGIN.*credential/i);
    expect(() =>
      validateHarnessOrigin('http://user@127.0.0.1:8080'),
    ).toThrowError(/INVALID_ORIGIN.*credential/i);
    expect(() => validateHarnessOrigin('user@host')).toThrowError(
      /INVALID_ORIGIN.*credential/i,
    );
  });

  it('rejects unsupported protocols', () => {
    expect(() =>
      validateHarnessOrigin('ftp://remote.example.com'),
    ).toThrowError(/INVALID_ORIGIN.*Unsupported/);
    expect(() => validateHarnessOrigin('file:///etc/passwd')).toThrowError(
      /INVALID_ORIGIN.*Unsupported/,
    );
    expect(() => validateHarnessOrigin('ssh://host')).toThrowError(
      /INVALID_ORIGIN.*Unsupported/,
    );
  });
});

describe('HarnessSetupService', () => {
  let tempBase: string;
  let stateDir: string;
  const originalEnv = process.env.AGS_HARNESS_HOME;

  beforeEach(async () => {
    const rawTemp = await fs.mkdtemp(
      path.join(os.tmpdir(), 'ags-harness-setup-test-'),
    );
    tempBase = await fs.realpath(rawTemp);
    stateDir = path.join(tempBase, 'harness-state');
    delete process.env.AGS_HARNESS_HOME;
  });

  afterEach(async () => {
    if (originalEnv !== undefined) {
      process.env.AGS_HARNESS_HOME = originalEnv;
    } else {
      delete process.env.AGS_HARNESS_HOME;
    }
    if (tempBase && (await fs.pathExists(tempBase))) {
      await fs.remove(tempBase);
    }
  });

  describe('Constructor and Path Validation', () => {
    it('uses injected stateDir with priority', () => {
      process.env.AGS_HARNESS_HOME = path.join(tempBase, 'env-state');
      const service = new HarnessSetupService(stateDir);
      expect(service.stateDir).toBe(stateDir);
      expect(service.configPath).toBe(path.join(stateDir, 'config.json'));
      expect(service.receiptPath).toBe(path.join(stateDir, 'receipt.json'));
    });

    it('falls back to AGS_HARNESS_HOME if absolute', () => {
      const envDir = path.join(tempBase, 'env-state');
      process.env.AGS_HARNESS_HOME = envDir;
      const service = new HarnessSetupService();
      expect(service.stateDir).toBe(envDir);
    });

    it('rejects relative AGS_HARNESS_HOME', () => {
      process.env.AGS_HARNESS_HOME = './relative/path';
      expect(() => new HarnessSetupService()).toThrowError(
        /INVALID_STATE_DIR.*absolute/,
      );
    });

    it('rejects relative constructor stateDir', () => {
      expect(() => new HarnessSetupService('relative/state')).toThrowError(
        /INVALID_STATE_DIR.*absolute/,
      );
    });

    it('rejects filesystem root as stateDir', () => {
      const root = path.parse(process.cwd()).root;
      expect(() => new HarnessSetupService(root)).toThrowError(
        /INVALID_STATE_DIR.*root/,
      );
    });

    it('rejects user home directory as stateDir', () => {
      expect(() => new HarnessSetupService(os.homedir())).toThrowError(
        /INVALID_STATE_DIR.*home/,
      );
    });
  });

  describe('setup() and receipt generation', () => {
    it('creates private 0700 dir, 0600 config and receipt on clean setup', async () => {
      const service = new HarnessSetupService(stateDir);
      const validConfig: HarnessConfig = {
        schemaVersion: 1,
        paseoCommand: '/usr/local/bin/paseo',
        origin: 'laptop',
      };

      const result = await service.setup(validConfig);
      expect(result.created).toBe(true);
      expect(result.configPath).toBe(path.join(stateDir, 'config.json'));

      // Check directory permissions
      const dirStat = await fs.stat(stateDir);
      expect(dirStat.mode & 0o777).toBe(0o700);

      // Check config permissions and content
      const configStat = await fs.stat(service.configPath);
      expect(configStat.mode & 0o777).toBe(0o600);
      const configRaw = await fs.readFile(service.configPath, 'utf8');
      expect(JSON.parse(configRaw)).toEqual(validConfig);

      // Check receipt permissions and content
      const receiptStat = await fs.stat(service.receiptPath);
      expect(receiptStat.mode & 0o777).toBe(0o600);
      const receiptRaw = await fs.readFile(service.receiptPath, 'utf8');
      const receipt = JSON.parse(receiptRaw);
      expect(receipt.schemaVersion).toBe(1);
      expect(receipt.owner).toBe('agent-skills-standard/harness');

      // Verify receipt digest matches config bytes exactly
      const expectedSha = crypto
        .createHash('sha256')
        .update(configRaw, 'utf8')
        .digest('hex');
      expect(receipt.configSha256).toBe(expectedSha);
    });

    it('rejects invalid schemaVersion, relative paseoCommand, and unknown fields', async () => {
      const service = new HarnessSetupService(stateDir);

      // Unknown fields
      await expect(
        service.setup({
          schemaVersion: 1,
          paseoCommand: '/usr/local/bin/paseo',
          extra: 'bad',
        } as unknown as HarnessConfig),
      ).rejects.toThrowError(/INVALID_CONFIG.*Unknown/);

      // Invalid schemaVersion
      await expect(
        service.setup({
          schemaVersion: 2 as unknown as 1,
          paseoCommand: '/usr/local/bin/paseo',
        }),
      ).rejects.toThrowError(/INVALID_CONFIG.*schemaVersion/);

      // Relative paseoCommand
      await expect(
        service.setup({
          schemaVersion: 1,
          paseoCommand: 'paseo',
        }),
      ).rejects.toThrowError(/INVALID_CONFIG.*absolute/);

      // Control characters in paseoCommand
      await expect(
        service.setup({
          schemaVersion: 1,
          paseoCommand: '/usr/local/bin/paseo\0',
        }),
      ).rejects.toThrowError(/INVALID_CONFIG.*control/);
    });

    it('is idempotent when re-run with exact same config', async () => {
      const service = new HarnessSetupService(stateDir);
      const validConfig: HarnessConfig = {
        schemaVersion: 1,
        paseoCommand: '/usr/local/bin/paseo',
      };

      const first = await service.setup(validConfig);
      expect(first.created).toBe(true);

      const second = await service.setup(validConfig);
      expect(second.created).toBe(false);
      expect(second.configPath).toBe(service.configPath);
      const dirStat = await fs.stat(stateDir);
      expect(dirStat.mode & 0o777).toBe(0o700);
    });

    it('refuses to overwrite when existing config differs', async () => {
      const service = new HarnessSetupService(stateDir);
      await service.setup({
        schemaVersion: 1,
        paseoCommand: '/usr/local/bin/paseo',
        origin: 'laptop',
      });

      await expect(
        service.setup({
          schemaVersion: 1,
          paseoCommand: '/usr/local/bin/paseo',
          origin: 'server-2',
        }),
      ).rejects.toThrowError(/CONFIG_CONFLICT/);
    });

    it('rejects existing 0755 foreign directory with unrelated config and absent receipt, preserving mode/content without creating receipt or lock', async () => {
      const foreignDir = path.join(tempBase, 'foreign-0755');
      await fs.mkdir(foreignDir, { recursive: true, mode: 0o755 });
      if (process.platform !== 'win32') {
        await fs.chmod(foreignDir, 0o755);
      }

      const foreignConfigFile = path.join(foreignDir, 'config.json');
      const foreignContent = JSON.stringify(
        { unrelatedTool: 'active', version: 2 },
        null,
        2,
      );
      await fs.writeFile(foreignConfigFile, foreignContent, 'utf8');

      const service = new HarnessSetupService(foreignDir);
      const validConfig: HarnessConfig = {
        schemaVersion: 1,
        paseoCommand: '/usr/local/bin/paseo',
      };

      if (process.platform !== 'win32') {
        await expect(service.setup(validConfig)).rejects.toMatchObject({
          code: 'STATE_PERMISSIONS',
        });

        // Invariants: mode preserved
        const dirStat = await fs.stat(foreignDir);
        expect(dirStat.mode & 0o777).toBe(0o755);

        // Invariants: unrelated content preserved
        const configAfter = await fs.readFile(foreignConfigFile, 'utf8');
        expect(configAfter).toBe(foreignContent);

        // Invariants: receipt and lock are absent
        expect(await fs.pathExists(service.receiptPath)).toBe(false);
        expect(await fs.pathExists(path.join(foreignDir, '.lock'))).toBe(false);
      }
    });

    it('rejects existing empty 0755 directory with STATE_PERMISSIONS, leaving directory unchanged and empty without receipt or lock', async () => {
      const emptyDir = path.join(tempBase, 'empty-0755');
      await fs.mkdir(emptyDir, { recursive: true, mode: 0o755 });
      if (process.platform !== 'win32') {
        await fs.chmod(emptyDir, 0o755);
      }

      const service = new HarnessSetupService(emptyDir);
      const validConfig: HarnessConfig = {
        schemaVersion: 1,
        paseoCommand: '/usr/local/bin/paseo',
      };

      if (process.platform !== 'win32') {
        await expect(service.setup(validConfig)).rejects.toMatchObject({
          code: 'STATE_PERMISSIONS',
        });

        // Invariants: mode preserved
        const dirStat = await fs.stat(emptyDir);
        expect(dirStat.mode & 0o777).toBe(0o755);

        // Invariants: directory remains empty
        const entries = await fs.readdir(emptyDir);
        expect(entries).toEqual([]);

        // Invariants: receipt and lock are absent
        expect(await fs.pathExists(service.receiptPath)).toBe(false);
        expect(await fs.pathExists(path.join(emptyDir, '.lock'))).toBe(false);
      }
    });
  });

  describe('load() and status() integrity checks', () => {
    it('load() returns validated config when intact', async () => {
      const service = new HarnessSetupService(stateDir);
      const validConfig: HarnessConfig = {
        schemaVersion: 1,
        paseoCommand: '/usr/local/bin/paseo',
        origin: 'laptop',
      };
      await service.setup(validConfig);

      const loaded = await service.load();
      expect(loaded).toEqual(validConfig);
    });

    it('load() throws CONFIG_NOT_FOUND when config does not exist', async () => {
      const service = new HarnessSetupService(stateDir);
      await expect(service.load()).rejects.toThrowError(/CONFIG_NOT_FOUND/);
    });

    it('load() throws CONFIG_TAMPERED if config.json is modified after receipt was generated', async () => {
      const service = new HarnessSetupService(stateDir);
      await service.setup({
        schemaVersion: 1,
        paseoCommand: '/usr/local/bin/paseo',
      });

      // Tamper with config.json
      const tamperedConfig: HarnessConfig = {
        schemaVersion: 1,
        paseoCommand: '/opt/other/paseo',
      };
      await fs.writeFile(
        service.configPath,
        JSON.stringify(tamperedConfig, null, 2) + '\n',
        'utf8',
      );

      await expect(service.load()).rejects.toThrowError(/CONFIG_TAMPERED/);
    });

    it('load() throws STATE_CORRUPT if receipt.json has wrong owner or invalid format', async () => {
      const service = new HarnessSetupService(stateDir);
      await service.setup({
        schemaVersion: 1,
        paseoCommand: '/usr/local/bin/paseo',
      });

      // Tamper with receipt.json owner
      const receiptRaw = await fs.readFile(service.receiptPath, 'utf8');
      const receipt = JSON.parse(receiptRaw);
      receipt.owner = 'malicious/unknown';
      await fs.writeFile(
        service.receiptPath,
        JSON.stringify(receipt, null, 2) + '\n',
        'utf8',
      );

      await expect(service.load()).rejects.toThrowError(/STATE_CORRUPT/);
    });

    it('status() reports configured: false without creating directory when unconfigured', async () => {
      const service = new HarnessSetupService(stateDir);
      const result = await service.status();
      expect(result.configured).toBe(false);
      expect(result.configPath).toBe(service.configPath);
      expect(result.config).toBeUndefined();
      // Verifies invariant: status missing config does not create directories
      expect(await fs.pathExists(stateDir)).toBe(false);
    });

    it('status() reports configured: true with config when valid', async () => {
      const service = new HarnessSetupService(stateDir);
      const config: HarnessConfig = {
        schemaVersion: 1,
        paseoCommand: '/usr/local/bin/paseo',
      };
      await service.setup(config);

      const result = await service.status();
      expect(result.configured).toBe(true);
      expect(result.config).toEqual(config);
    });

    it('status() detects corrupt partial state (receipt exists without config)', async () => {
      const service = new HarnessSetupService(stateDir);
      await fs.mkdir(stateDir, { recursive: true, mode: 0o700 });
      if (process.platform !== 'win32') {
        await fs.chmod(stateDir, 0o700);
      }
      await fs.writeFile(
        service.receiptPath,
        JSON.stringify({
          schemaVersion: 1,
          owner: 'agent-skills-standard/harness',
          configSha256: 'abc',
        }),
        'utf8',
      );

      await expect(service.status()).rejects.toThrowError(/STATE_CORRUPT/);
    });
    it('load() throws STATE_CORRUPT if config.json is a directory', async () => {
      const service = new HarnessSetupService(stateDir);
      await fs.mkdir(stateDir, { recursive: true, mode: 0o700 });
      if (process.platform !== 'win32') {
        await fs.chmod(stateDir, 0o700);
      }
      await fs.mkdir(service.configPath);
      await expect(service.load()).rejects.toThrowError(
        /STATE_CORRUPT.*regular file/,
      );
    });

    it('load() throws STATE_CORRUPT if receipt.json is a directory', async () => {
      const service = new HarnessSetupService(stateDir);
      await service.setup({
        schemaVersion: 1,
        paseoCommand: '/usr/local/bin/paseo',
      });
      await fs.unlink(service.receiptPath);
      await fs.mkdir(service.receiptPath);
      await expect(service.load()).rejects.toThrowError(
        /STATE_CORRUPT.*regular file/,
      );
    });

    it('throws STATE_CORRUPT if an ancestor component is a file instead of a directory', async () => {
      const fileParent = path.join(tempBase, 'file-parent');
      await fs.writeFile(fileParent, 'not a directory', 'utf8');
      const invalidStateDir = path.join(fileParent, 'harness');
      const service = new HarnessSetupService(invalidStateDir);
      await expect(
        service.setup({
          schemaVersion: 1,
          paseoCommand: '/usr/local/bin/paseo',
        }),
      ).rejects.toMatchObject({
        code: 'STATE_CORRUPT',
      });
    });
  });

  describe('uninstall() safety boundaries', () => {
    it('returns removed: false when nothing is configured', async () => {
      const service = new HarnessSetupService(stateDir);
      const result = await service.uninstall();
      expect(result.removed).toBe(false);
      expect(result.configPath).toBe(service.configPath);
    });

    it('removes only owned config and receipt, preserving unrelated files and state directory', async () => {
      const service = new HarnessSetupService(stateDir);
      await service.setup({
        schemaVersion: 1,
        paseoCommand: '/usr/local/bin/paseo',
      });

      // Add foreign user file in stateDir
      const foreignFile = path.join(stateDir, 'custom-note.txt');
      await fs.writeFile(foreignFile, 'important user data', 'utf8');

      const result = await service.uninstall();
      expect(result.removed).toBe(true);
      expect(await fs.pathExists(service.configPath)).toBe(false);
      expect(await fs.pathExists(service.receiptPath)).toBe(false);

      // Verifies invariant: does not remove foreign files or state dir recursively
      expect(await fs.pathExists(foreignFile)).toBe(true);
      expect(await fs.pathExists(stateDir)).toBe(true);
    });

    it('refuses uninstall if config has been modified or tampered', async () => {
      const service = new HarnessSetupService(stateDir);
      await service.setup({
        schemaVersion: 1,
        paseoCommand: '/usr/local/bin/paseo',
      });

      // Tamper with config
      await fs.writeFile(
        service.configPath,
        JSON.stringify({ schemaVersion: 1, paseoCommand: '/modified/paseo' }),
        'utf8',
      );

      await expect(service.uninstall()).rejects.toThrowError(/CONFIG_TAMPERED/);
      // Ensure file was not deleted
      expect(await fs.pathExists(service.configPath)).toBe(true);
    });

    it('refuses uninstall if receipt is missing (corrupt state)', async () => {
      const service = new HarnessSetupService(stateDir);
      await service.setup({
        schemaVersion: 1,
        paseoCommand: '/usr/local/bin/paseo',
      });

      await fs.unlink(service.receiptPath);
      await expect(service.uninstall()).rejects.toThrowError(/STATE_CORRUPT/);
      expect(await fs.pathExists(service.configPath)).toBe(true);
    });
  });

  describe('Symlink protection', () => {
    it('rejects symlink stateDir ancestors', async () => {
      const realParent = path.join(tempBase, 'real-ancestor');
      const symlinkParent = path.join(tempBase, 'symlink-ancestor');
      await fs.mkdir(realParent, { recursive: true });
      await fs.symlink(realParent, symlinkParent);

      const symlinkedStateDir = path.join(symlinkParent, 'harness');
      const service = new HarnessSetupService(symlinkedStateDir);

      await expect(
        service.setup({
          schemaVersion: 1,
          paseoCommand: '/usr/local/bin/paseo',
        }),
      ).rejects.toThrowError(/SYMLINK_FORBIDDEN.*symbolic link/);
    });

    it('rejects setup if configPath is a symlink', async () => {
      await fs.mkdir(stateDir, { recursive: true, mode: 0o700 });
      if (process.platform !== 'win32') {
        await fs.chmod(stateDir, 0o700);
      }
      const targetFile = path.join(tempBase, 'target-config.json');
      await fs.writeFile(targetFile, '{}', 'utf8');

      const service = new HarnessSetupService(stateDir);
      await fs.symlink(targetFile, service.configPath);

      await expect(
        service.setup({
          schemaVersion: 1,
          paseoCommand: '/usr/local/bin/paseo',
        }),
      ).rejects.toThrowError(/SYMLINK_FORBIDDEN/);
    });

    it('rejects load if receiptPath is a symlink', async () => {
      const service = new HarnessSetupService(stateDir);
      await service.setup({
        schemaVersion: 1,
        paseoCommand: '/usr/local/bin/paseo',
      });

      const targetReceipt = path.join(tempBase, 'target-receipt.json');
      await fs.move(service.receiptPath, targetReceipt);
      await fs.symlink(targetReceipt, service.receiptPath);

      await expect(service.load()).rejects.toThrowError(/SYMLINK_FORBIDDEN/);
    });
  });

  describe('Concurrency and Exclusive Lock', () => {
    it('serializes concurrent setup calls without race condition failures', async () => {
      const service = new HarnessSetupService(stateDir);
      const validConfig: HarnessConfig = {
        schemaVersion: 1,
        paseoCommand: '/usr/local/bin/paseo',
        origin: 'cluster-node-1',
      };

      // Run multiple concurrent setup invocations
      const promises = [
        service.setup(validConfig),
        service.setup(validConfig),
        service.setup(validConfig),
      ];

      const results = await Promise.all(promises);
      const createdCount = results.filter((r) => r.created).length;
      const idempotentCount = results.filter((r) => !r.created).length;

      expect(createdCount).toBe(1);
      expect(idempotentCount).toBe(2);

      const loaded = await service.load();
      expect(loaded).toEqual(validConfig);
    });

    it('does not remove lock owned by another process or token', async () => {
      const service = new HarnessSetupService(stateDir);
      await fs.mkdir(stateDir, { recursive: true, mode: 0o700 });
      if (process.platform !== 'win32') {
        await fs.chmod(stateDir, 0o700);
      }
      const lockPath = path.join(stateDir, '.lock');
      const foreignData = JSON.stringify({
        pid: 99999,
        token: 'foreign-token',
      });
      await fs.writeFile(lockPath, foreignData, 'utf8');

      let now = 0;
      const clock = vi.spyOn(Date, 'now').mockImplementation(() => {
        now += 1000;
        return now;
      });
      try {
        await expect(
          service.setup({
            schemaVersion: 1,
            paseoCommand: '/usr/local/bin/paseo',
          }),
        ).rejects.toMatchObject({ code: 'LOCK_TIMEOUT' });
      } finally {
        clock.mockRestore();
      }

      expect(await fs.pathExists(lockPath)).toBe(true);
      expect(await fs.readFile(lockPath, 'utf8')).toBe(foreignData);
    });
  });
});
