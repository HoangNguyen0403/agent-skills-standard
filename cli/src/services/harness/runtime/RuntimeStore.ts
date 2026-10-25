import crypto from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import fs from 'fs-extra';
import path from 'path';
import { setTimeout as sleep } from 'timers/promises';
import { HarnessSetupService } from '../HarnessSetupService';
import { canonicalJSON, HarnessError } from './RuntimeTypes';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MiB limit
const MAX_DIRECTORY_FILES = 10000;

interface LockOwner {
  active: boolean;
}

class StoreExclusiveLock {
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
          'utf8',
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
      `Failed to acquire exclusive lock at "${this.lockPath}" within ${timeoutMs}ms. Stale recovery is manual; locks are never auto-stolen.`,
    );
  }

  async release(): Promise<void> {
    if (this.fd) {
      try {
        await this.fd.close();
      } catch {
        // Ignore close errors
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
        // Ignore unlink error
      }
      this.lockToken = null;
    }
  }
}

export class RuntimeStore {
  readonly stateDir: string;
  private readonly setupService: HarnessSetupService;
  private readonly authorityLockPath: string;
  /**
   * Async-owner-scoped lock identity: only calls made from inside an execution
   * that already holds the authority lock may re-enter it. Unrelated async work
   * on the same store instance must contend for the real file lock.
   */
  private readonly lockOwner = new AsyncLocalStorage<LockOwner>();

  constructor(stateDir: string, setupService?: HarnessSetupService) {
    if (
      !stateDir ||
      typeof stateDir !== 'string' ||
      stateDir.trim().length === 0
    ) {
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
    this.setupService = setupService ?? new HarnessSetupService(this.stateDir);
    this.authorityLockPath = path.join(
      this.stateDir,
      '.runtime-authority.lock',
    );
  }

  /**
   * Verifies the base state directory and setup receipt using HarnessSetupService.load().
   */
  private async verifyBase(): Promise<void> {
    await this.setupService.load();
  }

  /**
   * Validates that the record name is a safe basename without traversal or illegal chars.
   */
  resolveRecordPath(name: string): string {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new HarnessError(
        'INVALID_STORE_NAME',
        'Store record name must be a non-empty string',
      );
    }

    if (!/^[A-Za-z0-9._-]+$/.test(name)) {
      throw new HarnessError(
        'INVALID_STORE_NAME',
        `Record name contains forbidden characters: "${name}". Only [A-Za-z0-9._-] allowed.`,
      );
    }

    if (name === '.' || name === '..') {
      throw new HarnessError(
        'INVALID_STORE_NAME',
        `Record name cannot be relative navigation: "${name}"`,
      );
    }

    const filename = name.endsWith('.json') ? name : `${name}.json`;
    const resolved = path.resolve(this.stateDir, filename);

    // Verify path containment
    const relative = path.relative(this.stateDir, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new HarnessError(
        'PATH_TRAVERSAL_DETECTED',
        `Record path "${resolved}" escapes state directory "${this.stateDir}"`,
      );
    }

    return resolved;
  }

  /**
   * Runs a mutation under the single machine-global authority lock.
   * Live nested mutations fail closed; expired inherited async contexts must
   * reacquire the file lock instead of borrowing the former owner's authority.
   */
  private async withAuthorityLock<T>(
    operation: () => Promise<T>,
    timeoutMs = 5000,
  ): Promise<T> {
    const owner = this.lockOwner.getStore();
    if (owner?.active) {
      throw new HarnessError(
        'NESTED_MUTATION_UNSUPPORTED',
        'Nested authority mutations are not supported; read-only store reads remain available',
      );
    }

    const lock = new StoreExclusiveLock(this.authorityLockPath);
    await lock.acquire(timeoutMs);
    const newOwner: LockOwner = { active: true };

    try {
      return await this.lockOwner.run(newOwner, operation);
    } finally {
      newOwner.active = false;
      await lock.release();
    }
  }

  /**
   * Verifies that existing file is a regular file, not a symlink, and has private 0600 permissions.
   */
  private async assertFileSafety(filePath: string): Promise<void> {
    try {
      const st = await fs.promises.lstat(filePath);
      if (st.isSymbolicLink()) {
        throw new HarnessError(
          'SYMLINK_FORBIDDEN',
          `Store file "${filePath}" cannot be a symbolic link`,
        );
      }
      if (!st.isFile()) {
        throw new HarnessError(
          'STATE_CORRUPT',
          `Store path "${filePath}" must be a regular file`,
        );
      }
      if (process.platform !== 'win32' && (st.mode & 0o077) !== 0) {
        throw new HarnessError(
          'STATE_PERMISSIONS',
          `Store file "${filePath}" has insecure permissions (0${(st.mode & 0o777).toString(8)}); must be 0600`,
        );
      }
      if (st.size > MAX_FILE_SIZE) {
        throw new HarnessError(
          'STORAGE_LIMIT_EXCEEDED',
          `Store file "${filePath}" exceeds maximum file size limit (${st.size} > ${MAX_FILE_SIZE})`,
        );
      }
    } catch (err: unknown) {
      if (err instanceof HarnessError) {
        throw err;
      }
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'ENOENT'
      ) {
        return;
      }
      throw err;
    }
  }

  /**
   * Performs an atomic write using a same-directory temporary file with fsync of file and directory.
   */
  private async writeAtomic(filePath: string, content: string): Promise<void> {
    const byteLength = Buffer.byteLength(content, 'utf8');
    if (byteLength > MAX_FILE_SIZE) {
      throw new HarnessError(
        'STORAGE_LIMIT_EXCEEDED',
        `Payload size (${byteLength} bytes) exceeds maximum file limit of ${MAX_FILE_SIZE} bytes`,
      );
    }

    // Check directory file count
    const files = await fs.promises.readdir(this.stateDir);
    if (files.length > MAX_DIRECTORY_FILES) {
      throw new HarnessError(
        'STORAGE_LIMIT_EXCEEDED',
        `Directory file count exceeds limit of ${MAX_DIRECTORY_FILES}`,
      );
    }

    const tempName = `.tmp-${path.basename(filePath)}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const tempPath = path.join(this.stateDir, tempName);

    let tempFd: fs.promises.FileHandle | null = null;
    try {
      tempFd = await fs.promises.open(tempPath, 'wx', 0o600);
      await tempFd.writeFile(content, 'utf8');
      await tempFd.sync();
      await tempFd.close();
      tempFd = null;

      await fs.promises.rename(tempPath, filePath);

      // Fsync containing directory; propagate errors visibly per C10
      try {
        const dirFd = await fs.promises.open(this.stateDir, 'r');
        try {
          await dirFd.sync();
        } finally {
          await dirFd.close();
        }
      } catch (err: unknown) {
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err.code === 'EINVAL' || err.code === 'ENOTSUP')
        ) {
          // Unsupported directory sync on current filesystem
        } else {
          throw new HarnessError(
            'DURABILITY_FAILED',
            `Failed to fsync state directory "${this.stateDir}": ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } catch (err: unknown) {
      if (tempFd) {
        try {
          await tempFd.close();
        } catch {
          // Ignore
        }
      }
      try {
        await fs.promises.unlink(tempPath);
      } catch {
        // Ignore
      }
      throw err;
    }
  }

  /**
   * Reads a record from the store, returning the fallback if it does not exist.
   * Does not acquire the mutation lock so callbacks can read authority records safely.
   */
  async read<T>(name: string, fallback: T): Promise<T> {
    await this.verifyBase();
    const filePath = this.resolveRecordPath(name);

    await this.assertFileSafety(filePath);

    if (!(await fs.pathExists(filePath))) {
      return structuredClone(fallback);
    }

    const raw = await fs.promises.readFile(filePath, 'utf8');
    try {
      return JSON.parse(raw) as T;
    } catch (err: unknown) {
      throw new HarnessError(
        'STATE_CORRUPT',
        `Failed to parse JSON from store record "${name}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Directly writes a record with atomic fsync under the authority lock.
   */
  async write<T>(name: string, value: T): Promise<void> {
    await this.verifyBase();
    const filePath = this.resolveRecordPath(name);

    await this.withAuthorityLock(async () => {
      await this.assertFileSafety(filePath);
      const serialized = canonicalJSON(value);
      await this.writeAtomic(filePath, serialized);
    });
  }

  /**
   * Executes an atomic mutation under the single authority lock.
   * Fallback is isolated via structuredClone to prevent contamination.
   */
  async transaction<T>(
    name: string,
    fallback: T,
    mutate: (state: T) => T | Promise<T>,
  ): Promise<T> {
    await this.verifyBase();
    const filePath = this.resolveRecordPath(name);

    return this.withAuthorityLock(async () => {
      await this.assertFileSafety(filePath);

      let current: T;
      if (await fs.pathExists(filePath)) {
        const raw = await fs.promises.readFile(filePath, 'utf8');
        try {
          current = JSON.parse(raw) as T;
        } catch (err: unknown) {
          throw new HarnessError(
            'STATE_CORRUPT',
            `Failed to parse JSON in store record "${name}": ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      } else {
        current = structuredClone(fallback);
      }

      const next = await mutate(current);
      // Persist a snapshot so later callback-side mutation cannot corrupt the
      // returned value after an acknowledged commit.
      const serialized = canonicalJSON(next);
      await this.writeAtomic(filePath, serialized);
      return structuredClone(next);
    });
  }

  /**
   * Stores an immutable record under the authority lock.
   * If identical bytes exist, succeeds idempotently.
   * If differing bytes exist, refuses with an IMMUTABLE_RECORD_CONFLICT error.
   */
  async createImmutable<T>(name: string, value: T): Promise<void> {
    await this.verifyBase();
    const filePath = this.resolveRecordPath(name);

    await this.withAuthorityLock(async () => {
      await this.assertFileSafety(filePath);
      const serialized = canonicalJSON(value);

      if (await fs.pathExists(filePath)) {
        const existing = await fs.promises.readFile(filePath, 'utf8');
        if (existing === serialized) {
          return; // Idempotent success
        }
        throw new HarnessError(
          'IMMUTABLE_RECORD_CONFLICT',
          `Immutable record "${name}" already exists with differing content`,
        );
      }

      await this.writeAtomic(filePath, serialized);
    });
  }
}
