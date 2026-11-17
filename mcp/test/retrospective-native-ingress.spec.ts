import { execFileSync } from 'node:child_process';
import { closeSync, readSync } from 'node:fs';
import { mkdtemp, mkdir, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  loadNativeIngress,
  selectNativeTarget,
  supportsLinuxKernelRelease,
  type NativeCursor,
  type NativeDirectory,
  type NativeIngressApi,
} from '../src/retrospective/native-ingress.js';
import { supportsLinuxKernelRelease as supportsBuildKernelRelease } from '../native/secure-ingress/build.mjs';

let api: NativeIngressApi;
let sandbox: string;

beforeAll(async () => {
  const loaded = await loadNativeIngress();
  if (loaded.state !== 'available') {
    throw new Error(`Native ingress test requires a built supported artifact (${loaded.code})`);
  }
  api = loaded.api;
});

beforeEach(async () => {
  sandbox = await realpath(await mkdtemp(join(tmpdir(), 'ags-native-ingress-')));
});

afterEach(async () => {
  await rm(sandbox, { recursive: true, force: true });
});

async function closeDirectory(directory: NativeDirectory): Promise<void> {
  await api.closeDirectory(directory);
}

describe('native ingress runtime and target compatibility', () => {
  it('enforces the Linux 4.18 runtime floor before target selection', () => {
    const releases = [
      ['4.17.99', false],
      ['4.18', true],
      ['4.18.0', true],
      ['4.18.0-553.el8.x86_64', true],
      ['6.8.12+vendor', true],
      ['4.18vendor', false],
      ['unknown', false],
      ['999999999999999999999.1.0', false],
    ] as const;
    for (const [value, expected] of releases) {
      expect(supportsLinuxKernelRelease(value)).toBe(expected);
      expect(supportsBuildKernelRelease(value)).toBe(expected);
    }
    expect(selectNativeTarget('linux', 'x64', '4.17.99', '2.28')).toBeNull();
    expect(selectNativeTarget('linux', 'x64', '4.18.0-553.el8.x86_64', '2.28')).toBe('linux-x64-gnu');
    expect(selectNativeTarget('linux', 'x64', '4.18.0', '2.27')).toBeNull();
    expect(selectNativeTarget('linux', 'x64', 'malformed', '2.40')).toBeNull();
    expect(selectNativeTarget('darwin', 'arm64', 'not-a-linux-release', null)).toBe('darwin-arm64');
  });

  it('loads only the built package-owned native asset', async () => {
    const loaded = await loadNativeIngress();
    expect(loaded.state).toBe('available');
    if (loaded.state === 'available') {
      expect(loaded.api.openRoot).toBeTypeOf('function');
      expect(loaded.api.readDirectoryBatch).toBeTypeOf('function');
    }
  });
});

describe('native capability traversal and ownership', () => {
  it('enumerates bounded independent cursors from synthetic directories', async () => {
    const rootPath = join(sandbox, 'root');
    await mkdir(join(rootPath, 'child'), { recursive: true });
    await writeFile(join(rootPath, 'alpha.txt'), 'alpha');
    await writeFile(join(rootPath, 'beta.txt'), 'beta');

    const root = await api.openRoot(rootPath);
    let first: NativeCursor | undefined;
    let second: NativeCursor | undefined;
    try {
      const firstCursor = await api.openDirectoryStream(root);
      first = firstCursor;
      const secondCursor = await api.openDirectoryStream(root);
      second = secondCursor;
      const firstBatch = await api.readDirectoryBatch(firstCursor, 1);
      const secondBatch = await api.readDirectoryBatch(secondCursor, 1);
      expect(firstBatch.visited).toBe(1);
      expect(firstBatch.entries.length).toBeLessThanOrEqual(firstBatch.visited);
      expect(secondBatch.entries.map(({ name }) => name)).toEqual(firstBatch.entries.map(({ name }) => name));
      const maximumBatch = await api.readDirectoryBatch(secondCursor, 64);
      expect(maximumBatch.entries.length).toBeLessThanOrEqual(maximumBatch.visited);

      const names = new Set(firstBatch.entries.map(({ name }) => name));
      let done = firstBatch.done;
      let visited = firstBatch.visited;
      while (!done) {
        const batch = await api.readDirectoryBatch(firstCursor, 3);
        expect(batch.visited).toBeLessThanOrEqual(3);
        expect(batch.entries.length).toBeLessThanOrEqual(batch.visited);
        visited += batch.visited;
        for (const entry of batch.entries) names.add(entry.name);
        done = batch.done;
      }
      expect(visited).toBeGreaterThan(0);
      expect(names.has('alpha.txt')).toBe(true);
      expect(names.has('beta.txt')).toBe(true);
      expect(names.has('child')).toBe(true);
    } finally {
      if (first !== undefined) await api.closeCursor(first);
      if (second !== undefined) await api.closeCursor(second);
      await closeDirectory(root);
    }
  });

  it('counts but does not expose dot entries in directory batches', async () => {
    const rootPath = join(sandbox, 'empty-root');
    await mkdir(rootPath);
    const root = await api.openRoot(rootPath);
    let cursor: NativeCursor | undefined;
    try {
      const openedCursor = await api.openDirectoryStream(root);
      cursor = openedCursor;
      let visited = 0;
      let done = false;
      const names: string[] = [];
      while (!done) {
        const batch = await api.readDirectoryBatch(openedCursor, 1);
        visited += batch.visited;
        names.push(...batch.entries.map(({ name }) => name));
        if (batch.visited > 0) expect(batch.done).toBe(false);
        done = batch.done;
      }
      expect(visited).toBe(2);
      expect(names).not.toContain('.');
      expect(names).not.toContain('..');
    } finally {
      if (cursor !== undefined) await api.closeCursor(cursor);
      await closeDirectory(root);
    }
  });

  it('keeps directory-child opens pinned after ancestor replacement and rejects links', async () => {
    const base = sandbox;
    const originalRoot = join(base, 'root');
    const movedRoot = join(base, 'moved-root');
    const decoyRoot = join(base, 'decoy-root');
    await mkdir(join(originalRoot, 'child'), { recursive: true });
    await mkdir(join(decoyRoot, 'child'), { recursive: true });
    await writeFile(join(originalRoot, 'child', 'source.txt'), 'pinned-original');
    await writeFile(join(decoyRoot, 'child', 'source.txt'), 'decoy');
    await writeFile(join(originalRoot, 'child', 'directory-target'), 'not-a-directory');
    await symlink(join(originalRoot, 'child', 'source.txt'), join(originalRoot, 'child', 'leaf-link'));
    await symlink(join(originalRoot, 'child'), join(originalRoot, 'child-link'));

    const root = await api.openRoot(originalRoot);
    let child: NativeDirectory | undefined;
    let descriptor: number | undefined;
    try {
      await rename(originalRoot, movedRoot);
      await symlink(decoyRoot, originalRoot);
      child = await api.openChildDirectory(root, 'child');
      await expect(api.openChildDirectory(root, 'child-link')).rejects.toMatchObject({
        code: expect.stringMatching(/^NATIVE_(SYMLINK_REJECTED|NOT_DIRECTORY)$/),
      });
      descriptor = await api.openRegularFile(child, 'source.txt');
      const bytes = Buffer.alloc(64);
      const read = readSync(descriptor, bytes, 0, bytes.length, 0);
      expect(bytes.subarray(0, read).toString('utf8')).toBe('pinned-original');
      await expect(api.openRegularFile(child, 'leaf-link')).rejects.toMatchObject({
        code: expect.stringMatching(/^NATIVE_(SYMLINK_REJECTED|NOT_DIRECTORY)$/),
      });
      await expect(api.openRegularFile(child, 'child')).rejects.toMatchObject({
        code: 'NATIVE_NOT_FOUND',
      });
      await expect(api.openChildDirectory(child, 'directory-target')).rejects.toMatchObject({
        code: 'NATIVE_NOT_DIRECTORY',
      });
      await expect(api.openChildDirectory(root, 'missing-directory')).rejects.toMatchObject({
        code: 'NATIVE_NOT_FOUND',
        message: 'Native ingress entry was not found',
      });
      await expect(api.openRoot(originalRoot)).rejects.toMatchObject({
        code: expect.stringMatching(/^NATIVE_(SYMLINK_REJECTED|NOT_DIRECTORY)$/),
      });
    } finally {
      if (descriptor !== undefined) closeSync(descriptor);
      if (child !== undefined) await closeDirectory(child);
      await closeDirectory(root);
    }
  });

  it('rejects nonregular files without blocking on a FIFO', async () => {
    const rootPath = join(sandbox, 'root');
    await mkdir(rootPath);
    const pipePath = join(rootPath, 'pipe');
    execFileSync('mkfifo', [pipePath], { stdio: 'ignore' });
    const root = await api.openRoot(rootPath);
    try {
      await expect(api.openRegularFile(root, 'pipe')).rejects.toMatchObject({
        code: 'NATIVE_NOT_REGULAR_FILE',
      });
    } finally {
      await closeDirectory(root);
    }
  });

  it('rejects malformed components and batch limits with Promise results', async () => {
    const rootPath = join(sandbox, 'root');
    await mkdir(rootPath);
    const root = await api.openRoot(rootPath);
    let cursor: NativeCursor | undefined;
    try {
      const cursorValue = await api.openDirectoryStream(root);
      cursor = cursorValue;
      const invalidComponent = api.openChildDirectory(root, '..');
      expect(invalidComponent).toBeInstanceOf(Promise);
      await expect(invalidComponent).rejects.toMatchObject({ code: 'NATIVE_INVALID_COMPONENT' });
      const nulComponent = `a${String.fromCharCode(0)}b`;
      await expect(api.openChildDirectory(root, nulComponent)).rejects.toMatchObject({
        code: 'NATIVE_INVALID_COMPONENT',
      });
      for (const limit of [0, 65, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 4294967297]) {
        const pending = api.readDirectoryBatch(cursorValue, limit);
        expect(pending).toBeInstanceOf(Promise);
        await expect(pending).rejects.toMatchObject({ code: 'NATIVE_INVALID_LIMIT' });
      }
    } finally {
      if (cursor !== undefined) await api.closeCursor(cursor);
      await closeDirectory(root);
    }
  });

  it('drains accepted work before closing without occupying worker threads with waiters', async () => {
    const rootPath = join(sandbox, 'root');
    await mkdir(join(rootPath, 'child'), { recursive: true });
    const root = await api.openRoot(rootPath);
    const pendingChildren = Array.from({ length: 64 }, () => api.openChildDirectory(root, 'child'));
    const closeRoot = api.closeDirectory(root);
    const outcomes = await Promise.allSettled(pendingChildren);
    const children: NativeDirectory[] = [];
    for (const outcome of outcomes) {
      if (outcome.status === 'fulfilled') children.push(outcome.value);
    }
    try {
      expect(outcomes.every((outcome) => outcome.status === 'fulfilled')).toBe(true);
      await expect(closeRoot).resolves.toBeUndefined();
      await expect(api.closeDirectory(root)).resolves.toBeUndefined();
      await expect(api.openChildDirectory(root, 'child')).rejects.toMatchObject({
        code: 'NATIVE_CAPABILITY_CLOSED',
      });
    } finally {
      await closeRoot;
      await Promise.all(children.map((child) => closeDirectory(child)));
    }
  });
});
