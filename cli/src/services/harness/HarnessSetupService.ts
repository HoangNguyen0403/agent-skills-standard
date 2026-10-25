import crypto from 'crypto';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { setTimeout as sleep } from 'timers/promises';

export interface HarnessConfig {
  schemaVersion: 1;
  paseoCommand: string;
  origin?: string;
}

export interface HarnessReceipt {
  schemaVersion: 1;
  owner: 'agent-skills-standard/harness';
  configSha256: string;
}

export class HarnessError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = 'HarnessError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Validates a Paseo origin string according to strict security boundaries.
 * Throws a sanitized HarnessError with code 'INVALID_ORIGIN' on invalid input.
 */
export function validateHarnessOrigin(origin: unknown): void {
  if (typeof origin !== 'string' || origin.trim().length === 0) {
    throw new HarnessError(
      'INVALID_ORIGIN',
      'Origin must be a non-empty string',
    );
  }

  // Reject CLI option-like values (prevent argument injection)
  if (origin.startsWith('-')) {
    throw new HarnessError(
      'INVALID_ORIGIN',
      'Origin cannot start with a hyphen',
    );
  }

  // Reject control characters, NUL, or whitespace
  if (
    /\s/.test(origin) ||
    Array.from(origin).some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  ) {
    throw new HarnessError(
      'INVALID_ORIGIN',
      'Origin contains forbidden control characters or whitespace',
    );
  }

  // Reject shell metacharacters
  if (/[;&|`$"'\\]/.test(origin)) {
    throw new HarnessError(
      'INVALID_ORIGIN',
      'Origin contains forbidden shell characters',
    );
  }

  // Reject credentials (e.g. user:pass@host or user@host)
  if (origin.includes('@')) {
    throw new HarnessError(
      'INVALID_ORIGIN',
      'Origin cannot contain credentials',
    );
  }

  // If formatted as a URL
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(origin)) {
    try {
      const parsed = new URL(origin);
      if (parsed.username || parsed.password) {
        throw new HarnessError(
          'INVALID_ORIGIN',
          'Origin URL cannot contain user credentials',
        );
      }
      if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) {
        throw new HarnessError(
          'INVALID_ORIGIN',
          `Unsupported origin protocol "${parsed.protocol}"`,
        );
      }
    } catch (e: unknown) {
      if (e instanceof HarnessError) {
        throw e;
      }
      throw new HarnessError('INVALID_ORIGIN', 'Malformed origin URL format');
    }
  } else {
    // Host alias: alphanumeric, dots, hyphens, underscores, optional :port
    if (!/^[a-zA-Z0-9_.-]+(:[0-9]+)?$/.test(origin)) {
      throw new HarnessError(
        'INVALID_ORIGIN',
        `Unsupported host alias format "${origin}"`,
      );
    }
  }
}

/**
 * Validates config object shape and fields.
 */
function validateHarnessConfig(
  config: unknown,
): asserts config is HarnessConfig {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new HarnessError(
      'INVALID_CONFIG',
      'Configuration must be a plain object',
    );
  }

  const allowedKeys = ['schemaVersion', 'paseoCommand', 'origin'];
  const keys = Object.keys(config);
  const unknownKeys = keys.filter((k) => !allowedKeys.includes(k));
  if (unknownKeys.length > 0) {
    throw new HarnessError(
      'INVALID_CONFIG',
      `Unknown configuration fields: ${unknownKeys.join(', ')}`,
    );
  }

  const { schemaVersion, paseoCommand, origin } = config as Record<
    string,
    unknown
  >;

  if (schemaVersion !== 1) {
    throw new HarnessError('INVALID_CONFIG', 'schemaVersion must be 1');
  }

  if (typeof paseoCommand !== 'string' || paseoCommand.trim().length === 0) {
    throw new HarnessError(
      'INVALID_CONFIG',
      'paseoCommand must be a non-empty string',
    );
  }

  if (
    Array.from(paseoCommand).some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  ) {
    throw new HarnessError(
      'INVALID_CONFIG',
      'paseoCommand contains forbidden control characters',
    );
  }

  if (!path.isAbsolute(paseoCommand)) {
    throw new HarnessError(
      'INVALID_CONFIG',
      `paseoCommand must be an absolute path: "${paseoCommand}"`,
    );
  }

  if (origin !== undefined) {
    validateHarnessOrigin(origin);
  }
}

class ExclusiveLock {
  private fd: fs.promises.FileHandle | null = null;
  private lockToken: string | null = null;
  constructor(private readonly lockPath: string) {}

  async acquire(timeoutMs = 5000): Promise<void> {
    const start = Date.now();
    const token = `${process.pid}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    while (Date.now() - start < timeoutMs) {
      try {
        this.fd = await fs.promises.open(this.lockPath, 'wx', 0o600);
        await this.fd.writeFile(
          JSON.stringify({ pid: process.pid, time: Date.now(), token }),
        );
        this.lockToken = token;
        return;
      } catch (err: unknown) {
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          err.code === 'EEXIST'
        ) {
          await sleep(30);
          continue;
        }
        throw err;
      }
    }
    throw new HarnessError(
      'LOCK_TIMEOUT',
      `Failed to acquire exclusive lock at "${this.lockPath}" within ${timeoutMs}ms`,
    );
  }

  async release(): Promise<void> {
    if (this.fd) {
      try {
        await this.fd.close();
      } catch {
        // ignore close error
      }
      this.fd = null;
    }
    if (this.lockToken) {
      try {
        const raw = await fs.promises.readFile(this.lockPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.token === this.lockToken) {
          await fs.promises.unlink(this.lockPath);
        }
      } catch {
        // ignore unlink error
      }
      this.lockToken = null;
    }
  }
}

export class HarnessSetupService {
  readonly stateDir: string;
  readonly configPath: string;
  readonly receiptPath: string;
  private readonly lockPath: string;

  constructor(stateDir?: string) {
    if (stateDir !== undefined) {
      if (typeof stateDir !== 'string' || stateDir.trim().length === 0) {
        throw new HarnessError(
          'INVALID_STATE_DIR',
          'stateDir must be a non-empty string',
        );
      }
      if (!path.isAbsolute(stateDir)) {
        throw new HarnessError(
          'INVALID_STATE_DIR',
          `stateDir must be an absolute path: "${stateDir}"`,
        );
      }
      this.stateDir = path.resolve(stateDir);
    } else if (process.env.AGS_HARNESS_HOME) {
      const envDir = process.env.AGS_HARNESS_HOME.trim();
      if (!path.isAbsolute(envDir)) {
        throw new HarnessError(
          'INVALID_STATE_DIR',
          `AGS_HARNESS_HOME must be an absolute path: "${envDir}"`,
        );
      }
      this.stateDir = path.resolve(envDir);
    } else {
      this.stateDir = path.resolve(
        os.homedir(),
        '.config',
        'agent-skills-standard',
        'harness',
      );
    }

    const root = path.parse(this.stateDir).root;
    if (this.stateDir === root) {
      throw new HarnessError(
        'INVALID_STATE_DIR',
        'State directory cannot be filesystem root',
      );
    }

    const home = path.resolve(os.homedir());
    if (this.stateDir === home) {
      throw new HarnessError(
        'INVALID_STATE_DIR',
        'State directory cannot be user home directory',
      );
    }

    this.configPath = path.join(this.stateDir, 'config.json');
    this.receiptPath = path.join(this.stateDir, 'receipt.json');
    this.lockPath = path.join(this.stateDir, '.lock');
  }

  private async assertSafeState(): Promise<void> {
    const root = path.parse(this.stateDir).root;
    if (this.stateDir === root) {
      throw new HarnessError(
        'INVALID_STATE_DIR',
        'State directory cannot be filesystem root',
      );
    }
    if (this.stateDir === path.resolve(os.homedir())) {
      throw new HarnessError(
        'INVALID_STATE_DIR',
        'State directory cannot be user home directory',
      );
    }

    // Check directory ancestry: every existing component must be a directory (or allowed Darwin root symlink)
    let current = path.resolve(this.stateDir);
    while (current && current !== root) {
      try {
        const st = await fs.promises.lstat(current);
        if (st.isSymbolicLink()) {
          // Darwin system roots like /var -> private/var or /tmp -> private/tmp are allowed if they are OS root symlinks
          const isDarwinSystemRoot =
            process.platform === 'darwin' &&
            current !== this.stateDir &&
            ['/var', '/tmp', '/etc'].includes(current);

          if (!isDarwinSystemRoot) {
            throw new HarnessError(
              'SYMLINK_FORBIDDEN',
              `Path component "${current}" is a symbolic link`,
            );
          }
        } else if (!st.isDirectory()) {
          throw new HarnessError(
            'STATE_CORRUPT',
            `Path component "${current}" must be a directory`,
          );
        }
      } catch (err: unknown) {
        if (err instanceof HarnessError) {
          throw err;
        }
        if (err && typeof err === 'object' && 'code' in err) {
          if (err.code === 'ENOENT') {
            // File/dir doesn't exist yet, continue checking existing parent
          } else if (err.code === 'ENOTDIR') {
            throw new HarnessError(
              'STATE_CORRUPT',
              `Path component inside "${current}" is not a directory`,
            );
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }

    // Check configPath, receiptPath, lockPath: if existing, must be regular files and not symlinks
    for (const filePath of [this.configPath, this.receiptPath, this.lockPath]) {
      try {
        const st = await fs.promises.lstat(filePath);
        if (st.isSymbolicLink()) {
          throw new HarnessError(
            'SYMLINK_FORBIDDEN',
            `File "${filePath}" cannot be a symbolic link`,
          );
        }
        if (!st.isFile()) {
          throw new HarnessError(
            'STATE_CORRUPT',
            `File "${filePath}" must be a regular file; non-regular file types not permitted`,
          );
        }
      } catch (err: unknown) {
        if (err instanceof HarnessError) {
          throw err;
        }
        if (err && typeof err === 'object' && 'code' in err) {
          if (err.code === 'ENOENT') {
            // Non-existent is expected
          } else if (err.code === 'ENOTDIR') {
            throw new HarnessError(
              'STATE_CORRUPT',
              `Path component for "${filePath}" is not a directory`,
            );
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }
  }
  private validateStateDirStat(st: fs.Stats): void {
    if (st.isSymbolicLink()) {
      throw new HarnessError(
        'SYMLINK_FORBIDDEN',
        `State directory "${this.stateDir}" cannot be a symbolic link`,
      );
    }
    if (!st.isDirectory()) {
      throw new HarnessError(
        'STATE_CORRUPT',
        `State directory "${this.stateDir}" must be a directory`,
      );
    }
    if (process.platform !== 'win32' && (st.mode & 0o077) !== 0) {
      throw new HarnessError(
        'STATE_PERMISSIONS',
        `State directory "${this.stateDir}" has insecure group or other permissions (0${(st.mode & 0o777).toString(8)}); state directory must be private (0700)`,
      );
    }
  }

  private async ensureStateDir(): Promise<void> {
    await fs.promises.mkdir(path.dirname(this.stateDir), { recursive: true });

    let created: boolean;
    try {
      await fs.promises.mkdir(this.stateDir, { mode: 0o700 });
      created = true;
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'EEXIST'
      ) {
        created = false;
      } else {
        throw err;
      }
    }

    if (created) {
      await fs.promises.chmod(this.stateDir, 0o700);
    } else {
      const st = await fs.promises.lstat(this.stateDir);
      this.validateStateDirStat(st);
    }
  }

  async setup(
    config: HarnessConfig,
  ): Promise<{ created: boolean; configPath: string }> {
    validateHarnessConfig(config);
    await this.assertSafeState();

    // Ensure stateDir exists before acquiring lock without mutating existing foreign directories
    await this.ensureStateDir();

    const lock = new ExclusiveLock(this.lockPath);
    await lock.acquire();

    let createdConfig = false;
    let createdReceipt = false;

    try {
      await this.assertSafeState();
      const currentStat = await fs.promises.lstat(this.stateDir);
      this.validateStateDirStat(currentStat);

      const configExists = await fs.pathExists(this.configPath);
      const receiptExists = await fs.pathExists(this.receiptPath);

      if (configExists) {
        if (!receiptExists) {
          throw new HarnessError(
            'STATE_CORRUPT',
            'config.json exists without receipt.json; refusing to overwrite',
          );
        }

        // Verify receipt
        const receiptRaw = await fs.promises.readFile(this.receiptPath, 'utf8');
        let receipt: HarnessReceipt;
        try {
          receipt = JSON.parse(receiptRaw);
        } catch {
          throw new HarnessError(
            'STATE_CORRUPT',
            'receipt.json is corrupted; refusing to overwrite',
          );
        }

        if (
          !receipt ||
          receipt.schemaVersion !== 1 ||
          receipt.owner !== 'agent-skills-standard/harness' ||
          typeof receipt.configSha256 !== 'string'
        ) {
          throw new HarnessError(
            'STATE_CORRUPT',
            'receipt.json has invalid schema or owner; refusing to overwrite',
          );
        }

        // Verify config integrity
        const configRaw = await fs.promises.readFile(this.configPath, 'utf8');
        const computedSha = crypto
          .createHash('sha256')
          .update(configRaw, 'utf8')
          .digest('hex');
        if (computedSha !== receipt.configSha256) {
          throw new HarnessError(
            'CONFIG_TAMPERED',
            'Existing config.json digest does not match receipt; refusing to overwrite',
          );
        }

        let existingConfig: unknown;
        try {
          existingConfig = JSON.parse(configRaw);
        } catch {
          throw new HarnessError(
            'STATE_CORRUPT',
            'Existing config.json is invalid JSON; refusing to overwrite',
          );
        }
        validateHarnessConfig(existingConfig);

        // Compare existing vs requested config
        const isIdentical =
          existingConfig.schemaVersion === config.schemaVersion &&
          existingConfig.paseoCommand === config.paseoCommand &&
          existingConfig.origin === config.origin;

        if (isIdentical) {
          return { created: false, configPath: this.configPath };
        } else {
          throw new HarnessError(
            'CONFIG_CONFLICT',
            'Existing harness configuration differs from requested configuration; refusing to overwrite',
          );
        }
      } else if (receiptExists) {
        throw new HarnessError(
          'STATE_CORRUPT',
          'receipt.json exists without config.json; refusing to overwrite',
        );
      }

      // Fresh setup: write config and receipt exclusively with mode 0600
      const configContent = JSON.stringify(config, null, 2) + '\n';
      const configSha256 = crypto
        .createHash('sha256')
        .update(configContent, 'utf8')
        .digest('hex');

      const receipt: HarnessReceipt = {
        schemaVersion: 1,
        owner: 'agent-skills-standard/harness',
        configSha256,
      };
      const receiptContent = JSON.stringify(receipt, null, 2) + '\n';

      await fs.promises.writeFile(this.configPath, configContent, {
        flag: 'wx',
        mode: 0o600,
      });
      createdConfig = true;
      await fs.promises.chmod(this.configPath, 0o600);

      await fs.promises.writeFile(this.receiptPath, receiptContent, {
        flag: 'wx',
        mode: 0o600,
      });
      createdReceipt = true;
      await fs.promises.chmod(this.receiptPath, 0o600);
      return { created: true, configPath: this.configPath };
    } catch (err) {
      // Rollback only files created during this failed invocation
      if (createdReceipt) {
        try {
          await fs.promises.unlink(this.receiptPath);
        } catch {
          // ignore
        }
      }
      if (createdConfig) {
        try {
          await fs.promises.unlink(this.configPath);
        } catch {
          // ignore
        }
      }
      throw err;
    } finally {
      await lock.release();
    }
  }

  async load(): Promise<HarnessConfig> {
    await this.assertSafeState();

    if (!(await fs.pathExists(this.configPath))) {
      throw new HarnessError(
        'CONFIG_NOT_FOUND',
        `Harness configuration not found at "${this.configPath}"`,
      );
    }

    if (!(await fs.pathExists(this.receiptPath))) {
      throw new HarnessError(
        'STATE_CORRUPT',
        `Missing receipt at "${this.receiptPath}"`,
      );
    }

    const receiptRaw = await fs.promises.readFile(this.receiptPath, 'utf8');
    let receipt: HarnessReceipt;
    try {
      receipt = JSON.parse(receiptRaw);
    } catch {
      throw new HarnessError('STATE_CORRUPT', 'receipt.json is not valid JSON');
    }

    if (
      !receipt ||
      receipt.schemaVersion !== 1 ||
      receipt.owner !== 'agent-skills-standard/harness' ||
      typeof receipt.configSha256 !== 'string'
    ) {
      throw new HarnessError(
        'STATE_CORRUPT',
        'receipt.json has invalid schema or owner',
      );
    }

    const configRaw = await fs.promises.readFile(this.configPath, 'utf8');
    const computedSha = crypto
      .createHash('sha256')
      .update(configRaw, 'utf8')
      .digest('hex');
    if (computedSha !== receipt.configSha256) {
      throw new HarnessError(
        'CONFIG_TAMPERED',
        'config.json digest does not match receipt',
      );
    }

    let config: unknown;
    try {
      config = JSON.parse(configRaw);
    } catch {
      throw new HarnessError('STATE_CORRUPT', 'config.json is not valid JSON');
    }

    validateHarnessConfig(config);
    return config;
  }

  async status(): Promise<{
    configured: boolean;
    configPath: string;
    config?: HarnessConfig;
  }> {
    // Missing config does not create directories
    if (!(await fs.pathExists(this.stateDir))) {
      return { configured: false, configPath: this.configPath };
    }

    await this.assertSafeState();

    const configExists = await fs.pathExists(this.configPath);
    const receiptExists = await fs.pathExists(this.receiptPath);

    if (!configExists) {
      if (receiptExists) {
        throw new HarnessError(
          'STATE_CORRUPT',
          'receipt.json exists without config.json',
        );
      }
      return { configured: false, configPath: this.configPath };
    }

    const config = await this.load();
    return {
      configured: true,
      configPath: this.configPath,
      config,
    };
  }

  async uninstall(): Promise<{ removed: boolean; configPath: string }> {
    if (!(await fs.pathExists(this.stateDir))) {
      return { removed: false, configPath: this.configPath };
    }

    await this.assertSafeState();

    const lock = new ExclusiveLock(this.lockPath);
    await lock.acquire();

    try {
      await this.assertSafeState();

      const configExists = await fs.pathExists(this.configPath);
      const receiptExists = await fs.pathExists(this.receiptPath);

      if (!configExists) {
        if (receiptExists) {
          throw new HarnessError(
            'STATE_CORRUPT',
            'receipt.json exists without config.json; refusing to uninstall',
          );
        }
        return { removed: false, configPath: this.configPath };
      }

      // Must be valid non-symlink config and receipt with matching digest
      await this.load();

      // Remove only owned files; never recursively remove stateDir
      await fs.promises.unlink(this.configPath);
      if (await fs.pathExists(this.receiptPath)) {
        await fs.promises.unlink(this.receiptPath);
      }

      return { removed: true, configPath: this.configPath };
    } finally {
      await lock.release();
    }
  }
}
